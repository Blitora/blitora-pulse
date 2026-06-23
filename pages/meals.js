import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";
import Layout from "../components/Layout";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",A="#EF9F27",R="#E24B4A";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7",CARD="#fff";

const MEAL_DEFS=[
  {id:"morning",label:"Morning",time:"7:00 AM",icon:"☀️",bg:"#faeeda"},
  {id:"breakfast",label:"Breakfast",time:"8:00 AM",icon:"🍳",bg:PL},
  {id:"midmorning",label:"Mid-morning",time:"11:00 AM",icon:"☕",bg:"#e0f5f5"},
  {id:"lunch",label:"Lunch",time:"1:00 PM",icon:"🍽️",bg:GL},
  {id:"evening",label:"Evening snack",time:"4:30 PM",icon:"🌆",bg:"#FAECE7"},
  {id:"dinner",label:"Dinner",time:"7:30 PM",icon:"🌙",bg:"#eeedfe"},
];

const EMPTY_CUSTOM={show:false,mealId:null,name:"",cal:"",pro:"",carb:"",fat:"",category:"",saving:false,err:""};

function fmt(d){return d.toISOString().split("T")[0];}
function today(){return fmt(new Date());}
function dayLabel(dk){
  const t=today(),y=fmt(new Date(Date.now()-86400000));
  if(dk===t)return"Today";if(dk===y)return"Yesterday";
  return new Date(dk).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}

export default function Meals(){
  const router=useRouter();
  const [profile,setProfile]=useState(null);
  const [foods,setFoods]=useState([]);
  const [dateKey,setDateKey]=useState(today());
  const [log,setLog]=useState({foods:{}});
  const [openMeal,setOpenMeal]=useState(null);
  const [search,setSearch]=useState("");
  const [catFilter,setCatFilter]=useState("All");
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [customFood,setCustomFood]=useState(EMPTY_CUSTOM);

  useEffect(()=>{
    async function init(){
      const sb=getSupabase();
      const{data:{session}}=await sb.auth.getSession();
      if(!session){router.push("/login");return;}
      const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
      if(!p||p.status==="pending"){router.push("/pending");return;}
      if(!p.setup_complete){router.push("/setup");return;}
      setProfile(p);
      if(p.active_template_id){
        // Load template foods + any custom foods this user has added previously
        const{data:tf}=await sb
          .from("template_food_items")
          .select("*")
          .or(`template_id.eq.${p.active_template_id},and(added_by_user.eq.true,added_by_user_id.eq.${p.id})`);
        setFoods(tf||[]);
      }
    }
    init();
  },[]);

  const loadLog=useCallback(async(dk)=>{
    if(!profile)return;
    const{data}=await getSupabase().from("health_logs").select("foods").eq("user_id",profile.id).eq("log_date",dk).single();
    setLog({foods:data?.foods||{}});
  },[profile]);

  useEffect(()=>{if(profile)loadLog(dateKey);},[profile,dateKey]);

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),1800);}

  async function persist(patch){
    const next={...log,...patch};setLog(next);setSaving(true);
    await getSupabase().from("health_logs").upsert({user_id:profile.id,log_date:dateKey,...next},{onConflict:"user_id,log_date"});
    setSaving(false);showToast("Saved ✓");
  }

  function toggleFood(mealId,foodId){
    // Always use string comparison — DB uuid vs local string both work
    const mf={...(log.foods[mealId]||{})};
    const key=String(foodId);
    mf[key]?delete mf[key]:(mf[key]=true);
    persist({foods:{...log.foods,[mealId]:mf}});
  }

  // ─── FIXED: saves to Supabase, uses real UUID returned by DB ─────────────────
  async function addCustom(){
    if(!customFood.name.trim()){
      setCustomFood(f=>({...f,err:"Food name is required"})); return;
    }
    if(!customFood.cal||isNaN(customFood.cal)){
      setCustomFood(f=>({...f,err:"Valid calories required"})); return;
    }
    setCustomFood(f=>({...f,saving:true,err:""}));
    try{
      const sb=getSupabase();
      const newFood={
        name:         customFood.name.trim(),
        calories:     parseFloat(customFood.cal)||0,
        protein:      parseFloat(customFood.pro)||0,
        carbs:        parseFloat(customFood.carb)||0,
        fat:          parseFloat(customFood.fat)||0,          // ← fat field was missing before
        category:     customFood.category.trim()||"Custom",
        template_id:  profile.active_template_id||null,
        added_by_user: true,
        added_by_user_id: profile.id,
      };
      const{data,error}=await sb
        .from("template_food_items")
        .insert(newFood)
        .select()
        .single();
      if(error) throw error;

      // Add to local foods list using the real DB record (has a real UUID)
      setFoods(prev=>[...prev,data]);

      // Auto-tick it in the meal that opened the form, using the real UUID
      const mealId=customFood.mealId;
      const mf={...(log.foods[mealId]||{}),[String(data.id)]:true};
      await persist({foods:{...log.foods,[mealId]:mf}});

      setCustomFood(EMPTY_CUSTOM);
      showToast("Food added & saved ✓");
    }catch(e){
      setCustomFood(f=>({...f,saving:false,err:e.message||"Failed to save"}));
    }
  }

  // ─── Derived values ───────────────────────────────────────────────────────────
  const allIds=Object.values(log.foods).flatMap(m=>Object.keys(m));
  const mac=allIds.reduce((a,id)=>{
    const f=foods.find(x=>String(x.id)===id||x.name===id);
    return f?{cal:a.cal+(f.calories||0),pro:a.pro+(f.protein||0),carb:a.carb+(f.carbs||0),fat:a.fat+(f.fat||0)}:a;
  },{cal:0,pro:0,carb:0,fat:0});

  const cats=["All",...new Set(foods.map(f=>f.category).filter(Boolean))];
  const filtered=foods.filter(f=>
    (!search||f.name.toLowerCase().includes(search.toLowerCase()))&&
    (catFilter==="All"||f.category===catFilter)
  );
  const calTarget=profile?.calorie_target||1600;
  const proTarget=profile?.protein_target||100;

  if(!profile)return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,border:`3px solid ${BORDER}`,borderTopColor:P,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <>
      <Head><title>Meals — Health Tracker</title></Head>
      <style>{`
        .card{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:14px;margin-bottom:10px}
        .ctitle{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px}
        .date-nav{display:flex;align-items:center;gap:8px;background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:10px 14px;margin-bottom:12px}
        .dbtn{width:32px;height:32px;border-radius:50%;border:1px solid ${BORDER};background:transparent;cursor:pointer;font-size:16px;color:${TXT2};display:flex;align-items:center;justify-content:center}
        .dbtn:hover{border-color:${P};color:${P}} .dbtn:disabled{opacity:.3;cursor:default}
        .sgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
        .skpi{background:${CARD};border-radius:11px;border:1px solid ${BORDER};padding:10px 8px;text-align:center}
        .pbar{margin-bottom:8px}
        .pbrow{display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px}
        .pbbg{height:6px;background:${BORDER};border-radius:3px;overflow:hidden;margin-bottom:8px}
        .pbfill{height:100%;border-radius:3px;transition:width .4s}
        .mcard{background:${CARD};border-radius:12px;border:1.5px solid ${BORDER};margin-bottom:8px;overflow:hidden}
        .mcard.done{border-color:${G}}
        .mhdr{display:flex;align-items:center;gap:10px;padding:12px 13px;cursor:pointer}
        .mhdr:hover{background:#faf9fd}
        .mbody{border-top:1px solid ${BORDER};padding:12px 13px}
        .sinp{width:100%;padding:8px 12px;border-radius:8px;border:1px solid ${BORDER};font-size:12px;color:${TXT};outline:none;margin-bottom:8px;font-family:inherit}
        .sinp:focus{border-color:${P}}
        .catbtns{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
        .catbtn{padding:3px 10px;border-radius:20px;border:1px solid ${BORDER};font-size:10px;font-weight:600;color:${TXT2};background:transparent;cursor:pointer}
        .catbtn.on{border-color:${P};background:${PL};color:${P}}
        .flist{max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:4px}
        .frow{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;border:1px solid ${BORDER};cursor:pointer;transition:all .15s}
        .frow:hover,.frow.sel{border-color:${G};background:${GL}}
        .fchk{width:17px;height:17px;border-radius:4px;border:1.5px solid ${BORDER};display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .fchk.on{background:${G};border-color:${G}}
        .cform{background:#faf9fd;border-radius:10px;padding:12px;margin-top:10px;border:1px dashed ${BORDER}}
        .cinp{width:100%;padding:7px 10px;border-radius:7px;border:1px solid ${BORDER};font-size:12px;color:${TXT};outline:none;font-family:inherit}
        .cingrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0}
        .add-food-btn{margin-top:10px;width:100%;padding:8px;border:1.5px dashed ${P};border-radius:8px;background:${PL};color:${P};font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .15s}
        .add-food-btn:hover{background:${P};color:#fff}
        @media(max-width:480px){.sgrid{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      {toast&&<div className="ht-toast">{toast}</div>}

      <Layout title={`Meals${saving?" · saving…":""}`} profile={profile}>

        {/* DATE NAV */}
        <div className="date-nav">
          <button className="dbtn" onClick={()=>{const d=new Date(dateKey);d.setDate(d.getDate()-1);setDateKey(fmt(d));}}>‹</button>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:600}}>{dayLabel(dateKey)}</div>
            <div style={{fontSize:11,color:TXT2}}>{new Date(dateKey).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
          <input type="date" id="mdp" value={dateKey} max={today()} onChange={e=>e.target.value&&setDateKey(e.target.value)} style={{opacity:0,width:0,height:0,position:"absolute"}}/>
          <button className="dbtn" onClick={()=>document.getElementById("mdp").showPicker?.()}>📅</button>
          <button className="dbtn" onClick={()=>{const d=new Date(dateKey);d.setDate(d.getDate()+1);if(fmt(d)<=today())setDateKey(fmt(d));}} disabled={dateKey>=today()}>›</button>
        </div>

        {/* SUMMARY KPIs */}
        <div className="sgrid">
          {[
            {l:"Calories",v:`${mac.cal}/${calTarget}`,c:"#7F77DD"},
            {l:"Protein", v:`${mac.pro}g/${proTarget}g`,c:G},
            {l:"Carbs",   v:`${mac.carb}g`,c:A},
            {l:"Fat",     v:`${mac.fat}g`,c:"#D85A30"},
          ].map((k,i)=>(
            <div key={i} className="skpi">
              <div style={{fontSize:14,fontWeight:700,color:k.c,lineHeight:1,marginBottom:3}}>{k.v}</div>
              <div style={{fontSize:9,color:TXT2,textTransform:"uppercase"}}>{k.l}</div>
            </div>
          ))}
        </div>

        {/* MACRO BARS */}
        <div className="card">
          <div className="ctitle">Macro progress</div>
          {[
            {l:"Calories",v:mac.cal,max:calTarget,            c:"#7F77DD",u:" kcal"},
            {l:"Protein", v:mac.pro,max:proTarget,            c:G,        u:"g"},
            {l:"Carbs",   v:mac.carb,max:profile?.carb_target||130,c:A,   u:"g"},
            {l:"Fat",     v:mac.fat, max:profile?.fat_target||55, c:"#D85A30",u:"g"},
          ].map(b=>{
            const p=Math.min(100,Math.round((b.v/b.max)*100));
            return(
              <div key={b.l} className="pbar">
                <div className="pbrow">
                  <span style={{color:TXT2}}>{b.l}</span>
                  <span style={{fontWeight:600,color:p>100?R:TXT}}>{b.v}{b.u}<span style={{color:TXT3}}> / {b.max}</span></span>
                </div>
                <div className="pbbg"><div className="pbfill" style={{width:`${p}%`,background:p>100?R:b.c}}/></div>
              </div>
            );
          })}
        </div>

        {/* MEAL CARDS */}
        {MEAL_DEFS.map(meal=>{
          const sel=log.foods[meal.id]||{};
          const selKeys=Object.keys(sel);
          const mCal=selKeys.reduce((s,id)=>{const f=foods.find(x=>String(x.id)===id||x.name===id);return f?s+(f.calories||0):s;},0);
          const mPro=selKeys.reduce((s,id)=>{const f=foods.find(x=>String(x.id)===id||x.name===id);return f?s+(f.protein||0):s;},0);
          const isOpen=openMeal===meal.id;
          const isCustomFormOpen=customFood.show&&customFood.mealId===meal.id;

          return(
            <div key={meal.id} className={`mcard${selKeys.length>0?" done":""}`}>

              {/* MEAL HEADER */}
              <div className="mhdr" style={{background:selKeys.length>0?GL:CARD}}
                onClick={()=>{setOpenMeal(isOpen?null:meal.id);setSearch("");setCatFilter("All");setCustomFood(EMPTY_CUSTOM);}}>
                <div style={{width:34,height:34,borderRadius:8,background:meal.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{meal.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{meal.label}</div>
                  <div style={{fontSize:11,color:TXT2}}>{meal.time}{selKeys.length>0?` · ${selKeys.length} item${selKeys.length>1?"s":""}`:""}</div>
                </div>
                {selKeys.length>0&&(
                  <div style={{textAlign:"right",marginRight:6}}>
                    <div style={{fontSize:13,fontWeight:700,color:G}}>{mCal} kcal</div>
                    <div style={{fontSize:10,color:TXT2}}>{mPro}g P</div>
                  </div>
                )}
                {!selKeys.length&&<span style={{fontSize:11,color:TXT3,marginRight:6}}>tap to log</span>}
                <span style={{fontSize:12,color:TXT3,display:"inline-block",transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
              </div>

              {/* LOGGED FOOD PILLS (collapsed view) */}
              {selKeys.length>0&&!isOpen&&(
                <div style={{padding:"5px 13px 9px",display:"flex",flexWrap:"wrap",gap:4}}>
                  {selKeys.map(id=>{
                    const f=foods.find(x=>String(x.id)===id||x.name===id);
                    return(
                      <span key={id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,padding:"3px 6px 3px 10px",borderRadius:20,background:GL,color:G,border:"1px solid #5DCAA5"}}>
                        {f?.name||id}
                        <button onClick={e=>{e.stopPropagation();toggleFood(meal.id,id);}}
                          style={{width:16,height:16,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.15)",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0,lineHeight:1}}>×</button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* OPEN MEAL BODY */}
              {isOpen&&(
                <div className="mbody">
                  <input className="sinp" placeholder="Search food items…" value={search} onChange={e=>setSearch(e.target.value)}/>
                  <div className="catbtns">
                    {cats.map(c=><button key={c} className={`catbtn${catFilter===c?" on":""}`} onClick={()=>setCatFilter(c)}>{c}</button>)}
                  </div>

                  {foods.length===0&&(
                    <div style={{textAlign:"center",padding:"20px 0",color:TXT2,fontSize:13}}>
                      No food items assigned yet.<br/>Ask admin to assign a meal plan.
                    </div>
                  )}

                  {/* FOOD LIST */}
                  <div className="flist">
                    {filtered.map(f=>{
                      const chk=!!sel[String(f.id)||f.name];
                      return(
                        <div key={f.id||f.name} className={`frow${chk?" sel":""}`}
                          onClick={()=>toggleFood(meal.id,String(f.id)||f.name)}>
                          <div className={`fchk${chk?" on":""}`}>{chk&&<span style={{color:"#fff",fontSize:9,fontWeight:900}}>✓</span>}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,color:chk?G:TXT,fontWeight:chk?600:400}}>
                              {f.name}
                              {/* Show "custom" badge on user-added foods */}
                              {f.added_by_user&&(
                                <span style={{fontSize:9,color:TXT3,marginLeft:5,fontWeight:400}}>· custom</span>
                              )}
                            </div>
                            {f.category&&<div style={{fontSize:10,color:TXT3}}>{f.category}</div>}
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <span style={{fontSize:11,fontWeight:700,color:"#7F77DD"}}>{f.calories||0}</span>
                            <span style={{fontSize:10,color:TXT3}}> kcal</span>
                            <span style={{fontSize:11,color:G,marginLeft:5}}>{f.protein||0}g P</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ─── ADD CUSTOM FOOD FORM ──────────────────────────────── */}
                  {isCustomFormOpen?(
                    <div className="cform">
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:P}}>Add food item</div>
                          <div style={{fontSize:10,color:TXT2}}>Saved to your list permanently</div>
                        </div>
                        <button onClick={()=>setCustomFood(EMPTY_CUSTOM)}
                          style={{width:24,height:24,borderRadius:"50%",border:`1px solid ${BORDER}`,background:"transparent",cursor:"pointer",fontSize:14,color:TXT2,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                      </div>

                      {/* Name */}
                      <input className="cinp" style={{marginBottom:6}} placeholder="Food name (required)"
                        value={customFood.name} onChange={e=>setCustomFood(f=>({...f,name:e.target.value}))}/>

                      {/* Calories full width */}
                      <input className="cinp" style={{marginBottom:0}} placeholder="Calories (kcal) — required"
                        type="number" value={customFood.cal} onChange={e=>setCustomFood(f=>({...f,cal:e.target.value}))}/>

                      {/* Macros 2-column grid */}
                      <div className="cingrid">
                        <input className="cinp" placeholder="Protein g" type="number"
                          value={customFood.pro} onChange={e=>setCustomFood(f=>({...f,pro:e.target.value}))}/>
                        <input className="cinp" placeholder="Carbs g" type="number"
                          value={customFood.carb} onChange={e=>setCustomFood(f=>({...f,carb:e.target.value}))}/>
                        <input className="cinp" placeholder="Fat g" type="number"
                          value={customFood.fat} onChange={e=>setCustomFood(f=>({...f,fat:e.target.value}))}/>
                        <input className="cinp" placeholder="Category (optional)"
                          value={customFood.category} onChange={e=>setCustomFood(f=>({...f,category:e.target.value}))}/>
                      </div>

                      {/* Error */}
                      {customFood.err&&(
                        <div style={{fontSize:11,color:R,padding:"5px 8px",background:"#fff5f5",borderRadius:6,marginBottom:6}}>
                          {customFood.err}
                        </div>
                      )}

                      {/* Buttons */}
                      <div style={{display:"flex",gap:8,marginTop:2}}>
                        <button onClick={addCustom} disabled={customFood.saving}
                          style={{flex:1,padding:"8px",background:customFood.saving?"#aaa":P,color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:customFood.saving?"not-allowed":"pointer",fontFamily:"inherit"}}>
                          {customFood.saving?"Saving…":"✓ Add food"}
                        </button>
                        <button onClick={()=>setCustomFood(EMPTY_CUSTOM)}
                          style={{padding:"8px 14px",background:"transparent",color:TXT2,border:`1px solid ${BORDER}`,borderRadius:8,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ):(
                    <button className="add-food-btn"
                      onClick={()=>setCustomFood(f=>({...f,show:true,mealId:meal.id}))}>
                      <span style={{fontSize:16,lineHeight:1}}>+</span>
                      Food not in list? Add it
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

      </Layout>
    </>
  );
}
