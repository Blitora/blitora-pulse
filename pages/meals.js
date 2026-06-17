import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",A="#EF9F27",T="#00a09d";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7",CARD="#fff",R="#E24B4A";

const MEAL_DEFS=[
  {id:"morning",label:"Morning",time:"7:00 AM",icon:"☀️",bg:"#faeeda"},
  {id:"breakfast",label:"Breakfast",time:"8:00 AM",icon:"🍳",bg:PL},
  {id:"midmorning",label:"Mid-morning",time:"11:00 AM",icon:"☕",bg:"#e0f5f5"},
  {id:"lunch",label:"Lunch",time:"1:00 PM",icon:"🍽️",bg:GL},
  {id:"evening",label:"Evening snack",time:"4:30 PM",icon:"🌆",bg:"#FAECE7"},
  {id:"dinner",label:"Dinner",time:"7:30 PM",icon:"🌙",bg:"#eeedfe"},
];

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
  const [customFood,setCustomFood]=useState({show:false,mealId:null,name:"",cal:"",pro:"",carb:"",fat:""});

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
        const{data:tf}=await sb.from("template_food_items").select("*").eq("template_id",p.active_template_id);
        setFoods(tf||[]);
      }
    }
    init();
  },[]);

  const loadLog=useCallback(async(dk)=>{
    if(!profile)return;
    const sb=getSupabase();
    const{data}=await sb.from("health_logs").select("foods").eq("user_id",profile.id).eq("log_date",dk).single();
    setLog({foods:data?.foods||{}});
  },[profile]);

  useEffect(()=>{if(profile)loadLog(dateKey);},[profile,dateKey]);

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),1800);}

  async function persist(patch){
    const next={...log,...patch};
    setLog(next);setSaving(true);
    await getSupabase().from("health_logs").upsert({user_id:profile.id,log_date:dateKey,...next},{onConflict:"user_id,log_date"});
    setSaving(false);showToast("Saved ✓");
  }

  function toggleFood(mealId,foodId){
    const mf={...(log.foods[mealId]||{})};
    mf[foodId]?delete mf[foodId]:(mf[foodId]=true);
    persist({foods:{...log.foods,[mealId]:mf}});
  }

  function addCustom(){
    if(!customFood.name||!customFood.cal)return;
    const id="custom_"+Date.now();
    const newFood={id,name:customFood.name,calories:+customFood.cal,protein:+customFood.pro||0,carbs:+customFood.carb||0,fat:+customFood.fat||0,category:"Custom"};
    setFoods(f=>[...f,newFood]);
    const mf={...(log.foods[customFood.mealId]||{}),[id]:true};
    persist({foods:{...log.foods,[customFood.mealId]:mf}});
    setCustomFood({show:false,mealId:null,name:"",cal:"",pro:"",carb:"",fat:""});
    showToast("Custom food added ✓");
  }

  const allIds=Object.values(log.foods).flatMap(m=>Object.keys(m));
  const mac=allIds.reduce((a,id)=>{
    const f=foods.find(x=>x.id===id||x.name===id);
    return f?{cal:a.cal+(f.calories||0),pro:a.pro+(f.protein||0),carb:a.carb+(f.carbs||0),fat:a.fat+(f.fat||0)}:a;
  },{cal:0,pro:0,carb:0,fat:0});

  const cats=["All",...new Set(foods.map(f=>f.category).filter(Boolean))];
  const filtered=foods.filter(f=>(!search||f.name.toLowerCase().includes(search.toLowerCase()))&&(catFilter==="All"||f.category===catFilter));
  const calTarget=profile?.calorie_target||1600;
  const proTarget=profile?.protein_target||100;

  if(!profile)return<div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:36,height:36,border:`3px solid ${BORDER}`,borderTopColor:P,borderRadius:"50%",animation:"spin .7s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return(
    <>
      <Head><title>Meal log — Health Tracker</title></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${BG};font-family:'Inter',system-ui,sans-serif;color:${TXT}}
        .topbar{background:${CARD};border-bottom:1px solid ${BORDER};padding:0 16px;height:52px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:20}
        .main{max-width:720px;margin:0 auto;padding:14px 14px 90px}
        .card{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:14px;margin-bottom:10px}
        .date-nav{display:flex;align-items:center;gap:8px;background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:10px 14px;margin-bottom:12px}
        .date-btn{width:32px;height:32px;border-radius:50%;border:1px solid ${BORDER};background:transparent;cursor:pointer;font-size:16px;color:${TXT2};display:flex;align-items:center;justify-content:center}
        .date-btn:hover{border-color:${P};color:${P}}
        .date-btn:disabled{opacity:.3;cursor:default}
        .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
        .skpi{background:${CARD};border-radius:11px;border:1px solid ${BORDER};padding:10px 8px;text-align:center}
        .skpi-val{font-size:15px;font-weight:700;line-height:1;margin-bottom:3px}
        .skpi-lbl{font-size:9px;color:${TXT2};text-transform:uppercase}
        .meal-card{background:${CARD};border-radius:12px;border:1.5px solid ${BORDER};margin-bottom:8px;overflow:hidden;transition:border-color .2s}
        .meal-card.done{border-color:${G}}
        .meal-hdr{display:flex;align-items:center;gap:10px;padding:12px 13px;cursor:pointer}
        .meal-hdr:hover{background:#faf9fd}
        .meal-body{border-top:1px solid ${BORDER};padding:12px 13px}
        .search-inp{width:100%;padding:8px 12px;border-radius:8px;border:1px solid ${BORDER};font-size:12px;color:${TXT};outline:none;margin-bottom:8px;font-family:inherit}
        .search-inp:focus{border-color:${P}}
        .cat-btns{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
        .cat-btn{padding:3px 10px;border-radius:20px;border:1px solid ${BORDER};font-size:10px;font-weight:600;color:${TXT2};background:transparent;cursor:pointer}
        .cat-btn.on{border-color:${P};background:${PL};color:${P}}
        .food-list{max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:4px}
        .food-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;border:1px solid ${BORDER};cursor:pointer;transition:all .15s}
        .food-row:hover,.food-row.sel{border-color:${G};background:${GL}}
        .fchk{width:17px;height:17px;border-radius:4px;border:1.5px solid ${BORDER};display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .fchk.on{background:${G};border-color:${G}}
        .pill{font-size:10px;padding:2px 8px;border-radius:20px;background:${GL};color:${G};border:1px solid #5DCAA5;margin:2px}
        .custom-form{background:${BG};border-radius:10px;padding:12px;margin-top:10px;border:1px dashed ${BORDER}}
        .cinp{width:100%;padding:7px 10px;border-radius:7px;border:1px solid ${BORDER};font-size:12px;color:${TXT};outline:none;margin-bottom:6px;font-family:inherit}
        .cinp:focus{border-color:${P}}
        .cinp-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px}
        .btn-add{padding:7px 16px;background:${P};color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
        .btn-cancel{padding:7px 12px;background:transparent;color:${TXT2};border:1px solid ${BORDER};border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit}
        .progress-wrap{margin-top:12px}
        .pbar-row{display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px}
        .pbar-bg{height:6px;background:${BORDER};border-radius:3px;overflow:hidden;margin-bottom:8px}
        .pbar-fill{height:100%;border-radius:3px;transition:width .4s}
        .bottomnav{position:fixed;bottom:0;left:0;right:0;background:${CARD};border-top:1px solid ${BORDER};display:flex;z-index:20;max-width:720px;margin:0 auto}
        .navbtn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border:none;background:none;cursor:pointer;font-size:9px;font-weight:500;font-family:inherit}
        .toast{position:fixed;bottom:72px;left:50%;transform:translateX(-50%);background:${P};color:#fff;padding:8px 20px;border-radius:24px;font-size:12px;font-weight:600;z-index:100;animation:fadein .2s ease}
        @keyframes fadein{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @media(max-width:480px){.summary-grid{grid-template-columns:repeat(2,1fr)}}
        @media(min-width:768px){.bottomnav{display:none}.main{padding-left:24px;padding-right:24px}}
      `}</style>

      {toast&&<div className="toast">{toast}</div>}

      <div className="topbar">
        <div style={{width:32,height:32,background:P,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14}}>H</div>
        <span style={{fontSize:13,fontWeight:700,color:P}}>Health Tracker</span>
        <span style={{color:BORDER,fontSize:18}}>|</span>
        <span style={{fontSize:12,color:TXT2}}>Meal log</span>
        {saving&&<span style={{fontSize:11,color:P,marginLeft:4}}>saving…</span>}
        <div style={{flex:1}}/>
        <button onClick={()=>router.push("/profile")} style={{width:32,height:32,borderRadius:"50%",background:PL,border:"none",cursor:"pointer",color:P,fontWeight:700,fontSize:13}}>{profile.full_name?.[0]||"A"}</button>
      </div>

      <div className="main">
        {/* DATE NAV */}
        <div className="date-nav">
          <button className="date-btn" onClick={()=>{const d=new Date(dateKey);d.setDate(d.getDate()-1);setDateKey(fmt(d));}}>‹</button>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:600}}>{dayLabel(dateKey)}</div>
            <div style={{fontSize:11,color:TXT2}}>{new Date(dateKey).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
          <input type="date" id="mdpicker" value={dateKey} max={today()} onChange={e=>e.target.value&&setDateKey(e.target.value)} style={{opacity:0,width:0,height:0,position:"absolute"}}/>
          <button className="date-btn" onClick={()=>document.getElementById("mdpicker").showPicker?.()}>📅</button>
          <button className="date-btn" onClick={()=>{const d=new Date(dateKey);d.setDate(d.getDate()+1);if(fmt(d)<=today())setDateKey(fmt(d));}} disabled={dateKey>=today()}>›</button>
        </div>

        {/* SUMMARY */}
        <div className="summary-grid">
          {[{l:"Calories",v:`${mac.cal}/${calTarget}`,c:"#7F77DD"},{l:"Protein",v:`${mac.pro}g/${proTarget}g`,c:G},{l:"Carbs",v:`${mac.carb}g`,c:A},{l:"Fat",v:`${mac.fat}g`,c:"#D85A30"}].map((k,i)=>(
            <div key={i} className="skpi"><div className="skpi-val" style={{color:k.c}}>{k.v}</div><div className="skpi-lbl">{k.l}</div></div>
          ))}
        </div>

        {/* PROGRESS BARS */}
        <div className="card">
          <div style={{fontSize:11,fontWeight:700,color:TXT2,textTransform:"uppercase",letterSpacing:".05em",marginBottom:10}}>Today's macro progress</div>
          {[{l:"Calories",v:mac.cal,max:calTarget,c:"#7F77DD",u:" kcal"},{l:"Protein",v:mac.pro,max:proTarget,c:G,u:"g"},{l:"Carbs",v:mac.carb,max:profile?.carb_target||130,c:A,u:"g"},{l:"Fat",v:mac.fat,max:profile?.fat_target||55,c:"#D85A30",u:"g"}].map(b=>{
            const p=Math.min(100,Math.round((b.v/b.max)*100));
            return(
              <div key={b.l} className="progress-wrap">
                <div className="pbar-row"><span style={{color:TXT2}}>{b.l}</span><span style={{fontWeight:600,color:p>100?R:TXT}}>{b.v}{b.u}<span style={{color:TXT3}}> / {b.max}</span></span></div>
                <div className="pbar-bg"><div className="pbar-fill" style={{width:`${p}%`,background:p>100?R:b.c}}/></div>
              </div>
            );
          })}
        </div>

        {/* MEAL CARDS */}
        {MEAL_DEFS.map(meal=>{
          const sel=log.foods[meal.id]||{};
          const selKeys=Object.keys(sel);
          const mCal=selKeys.reduce((s,id)=>{const f=foods.find(x=>x.id===id||x.name===id);return f?s+(f.calories||0):s;},0);
          const mPro=selKeys.reduce((s,id)=>{const f=foods.find(x=>x.id===id||x.name===id);return f?s+(f.protein||0):s;},0);
          const isOpen=openMeal===meal.id;

          return(
            <div key={meal.id} className={`meal-card${selKeys.length>0?" done":""}`}>
              <div className="meal-hdr" style={{background:selKeys.length>0?GL:CARD}} onClick={()=>{setOpenMeal(isOpen?null:meal.id);setSearch("");setCatFilter("All");}}>
                <div style={{width:34,height:34,borderRadius:8,background:meal.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{meal.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{meal.label}</div>
                  <div style={{fontSize:11,color:TXT2}}>{meal.time}{selKeys.length>0?` · ${selKeys.length} item${selKeys.length>1?"s":""}`:""}</div>
                </div>
                {selKeys.length>0&&<div style={{textAlign:"right",marginRight:6}}><div style={{fontSize:13,fontWeight:700,color:G}}>{mCal} kcal</div><div style={{fontSize:10,color:TXT2}}>{mPro}g P</div></div>}
                {!selKeys.length&&<span style={{fontSize:11,color:TXT3,marginRight:6}}>tap to log</span>}
                <span style={{fontSize:12,color:TXT3,display:"inline-block",transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
              </div>

              {selKeys.length>0&&!isOpen&&(
                <div style={{padding:"5px 13px 9px",display:"flex",flexWrap:"wrap"}}>
                  {selKeys.map(id=>{const f=foods.find(x=>x.id===id||x.name===id);return<span key={id} className="pill">{f?.name||id}</span>;})}
                </div>
              )}

              {isOpen&&(
                <div className="meal-body">
                  <input className="search-inp" placeholder="Search food items…" value={search} onChange={e=>setSearch(e.target.value)}/>
                  <div className="cat-btns">
                    {cats.map(c=><button key={c} className={`cat-btn${catFilter===c?" on":""}`} onClick={()=>setCatFilter(c)}>{c}</button>)}
                  </div>

                  {foods.length===0&&(
                    <div style={{textAlign:"center",padding:"20px 0",color:TXT2,fontSize:13}}>
                      No food items assigned yet.<br/>Ask your admin/dietitian to assign a meal plan.
                    </div>
                  )}

                  <div className="food-list">
                    {filtered.map(f=>{
                      const chk=!!sel[f.id||f.name];
                      return(
                        <div key={f.id||f.name} className={`food-row${chk?" sel":""}`} onClick={()=>toggleFood(meal.id,f.id||f.name)}>
                          <div className={`fchk${chk?" on":""}`}>{chk&&<span style={{color:"#fff",fontSize:9,fontWeight:900}}>✓</span>}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,color:chk?G:TXT,fontWeight:chk?600:400}}>{f.name}</div>
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

                  {customFood.show&&customFood.mealId===meal.id?(
                    <div className="custom-form">
                      <div style={{fontSize:12,fontWeight:600,marginBottom:8,color:P}}>Add custom food item</div>
                      <input className="cinp" placeholder="Food name (required)" value={customFood.name} onChange={e=>setCustomFood(f=>({...f,name:e.target.value}))}/>
                      <div className="cinp-row">
                        <input className="cinp" placeholder="Calories" type="number" value={customFood.cal} onChange={e=>setCustomFood(f=>({...f,cal:e.target.value}))}/>
                        <input className="cinp" placeholder="Protein g" type="number" value={customFood.pro} onChange={e=>setCustomFood(f=>({...f,pro:e.target.value}))}/>
                        <input className="cinp" placeholder="Carbs g" type="number" value={customFood.carb} onChange={e=>setCustomFood(f=>({...f,carb:e.target.value}))}/>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button className="btn-add" onClick={addCustom}>Add food</button>
                        <button className="btn-cancel" onClick={()=>setCustomFood({show:false,mealId:null,name:"",cal:"",pro:"",carb:"",fat:""})}>Cancel</button>
                      </div>
                    </div>
                  ):(
                    <button onClick={()=>setCustomFood(f=>({...f,show:true,mealId:meal.id}))} style={{marginTop:10,width:"100%",padding:"7px",border:`1px dashed ${BORDER}`,borderRadius:8,background:"transparent",color:TXT2,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                      + Add custom food not in list
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bottomnav">
        {[["Dashboard","🏠","/dashboard"],["Meals","🍽️","/meals"],["Progress","📊","/progress"],["Reports","📋","/reports"],["Profile","👤","/profile"]].map(([lbl,ico,href])=>(
          <button key={href} className="navbtn" onClick={()=>router.push(href)} style={{color:href==="/meals"?P:TXT3}}>
            <span style={{fontSize:20}}>{ico}</span>{lbl}
          </button>
        ))}
      </div>
    </>
  );
}
