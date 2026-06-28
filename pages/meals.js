// pages/meals.js — MEALS screen
// Purpose: The only place to log food. 6 collapsible meal slots.
// Search food, pick items, add custom foods. Date navigation.

import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";
import Layout from "../components/Layout";

const G="#1D9E75",GL="#e1f5ee",P="#714B67",PL="#f3eef1";
const A="#EF9F27",R="#E24B4A";
const BORDER="#E0E3ED",TXT="#0D1B3E",TXT2="#718096",TXT3="#CBD5E0",BG="#F5F6FA",CARD="#fff";

const CAT_CONFIG=[
  {key:"Grains",   icon:"🌾"},{key:"Protein",   icon:"🥚"},
  {key:"Dairy",    icon:"🥛"},{key:"Fruits",    icon:"🍎"},
  {key:"Drinks",   icon:"🍵"},{key:"Veggies",   icon:"🥦"},
  {key:"Snacks",   icon:"🥜"},{key:"Condiments",icon:"🫙"},
  {key:"Morning",  icon:"☀️"},{key:"Custom",    icon:"✨"},
];

const MEAL_DEFS=[
  {id:"morning",    label:"Morning",       time:"7:00 AM",  icon:"☀️",  color:"#faeeda"},
  {id:"breakfast",  label:"Breakfast",     time:"8:00 AM",  icon:"🍳",  color:PL},
  {id:"midmorning", label:"Mid-morning",   time:"11:00 AM", icon:"☕",  color:"#e0f5f5"},
  {id:"lunch",      label:"Lunch",         time:"1:00 PM",  icon:"🍽️",  color:GL},
  {id:"evening",    label:"Evening snack", time:"4:30 PM",  icon:"🌆",  color:"#FAECE7"},
  {id:"dinner",     label:"Dinner",        time:"7:30 PM",  icon:"🌙",  color:"#eeedfe"},
];

function fmt(d){return d.toISOString().split("T")[0];}
function today(){return fmt(new Date());}
function dayLabel(dk){
  const t=today(),y=fmt(new Date(Date.now()-86400000));
  if(dk===t)return"Today";if(dk===y)return"Yesterday";
  return new Date(dk).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}

// ── Food card chip ─────────────────────────────────────────────────────────
function FoodCard({food,checked,onToggle}){
  return(
    <div onClick={onToggle} style={{
      borderRadius:10,border:`1.5px solid ${checked?G:BORDER}`,
      padding:"9px 10px 8px",cursor:"pointer",minWidth:0,
      background:checked?GL:CARD,transition:"all .15s",position:"relative",
    }}>
      <div style={{
        position:"absolute",top:6,right:6,width:16,height:16,borderRadius:"50%",
        border:`1.5px solid ${checked?G:BORDER}`,background:checked?G:"#fff",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:8,color:"#fff",fontWeight:900,
      }}>{checked?"✓":""}</div>
      <div style={{fontSize:11,fontWeight:600,color:checked?G:TXT,
        lineHeight:1.3,paddingRight:20,marginBottom:4,wordBreak:"break-word"}}>
        {food.name}
        {food.added_by_user&&<span style={{fontSize:8,color:TXT3,marginLeft:3}}>custom</span>}
      </div>
      <div style={{fontSize:13,fontWeight:800,color:"#6366F1"}}>{food.calories||0} <span style={{fontSize:9,fontWeight:400,color:TXT3}}>kcal</span></div>
      <div style={{fontSize:9,color:G,marginTop:1}}>{food.protein||0}g protein</div>
    </div>
  );
}

// ── Expandable meal slot ───────────────────────────────────────────────────
function MealSlot({meal,foods,sel,onToggle,onAddCustom}){
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState("");
  const selKeys=Object.keys(sel);
  const mCal=selKeys.reduce((s,id)=>{const f=foods.find(x=>String(x.id)===id||x.name===id);return f?s+(f.calories||0):s;},0);
  const mPro=selKeys.reduce((s,id)=>{const f=foods.find(x=>String(x.id)===id||x.name===id);return f?s+(f.protein||0):s;},0);

  // Category grouping
  const catKeys=CAT_CONFIG.map(c=>c.key);
  const grouped=catKeys.map(key=>{
    const items=foods.filter(f=>(f.category||"Custom")===key);
    return items.length?{key,icon:CAT_CONFIG.find(c=>c.key===key)?.icon||"🍴",items}:null;
  }).filter(Boolean);

  const q=search.toLowerCase();
  const searchResults=q?foods.filter(f=>f.name.toLowerCase().includes(q)):null;

  return(
    <div style={{background:CARD,borderRadius:14,border:`1.5px solid ${selKeys.length>0?G:BORDER}`,
      marginBottom:8,overflow:"hidden",transition:"border-color .2s"}}>

      {/* Header — always visible */}
      <div onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",
          cursor:"pointer",background:selKeys.length>0&&!open?GL:CARD}}>
        <div style={{width:36,height:36,borderRadius:9,background:meal.color,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
          {meal.icon}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:TXT}}>{meal.label}</div>
          <div style={{fontSize:11,color:TXT2}}>{meal.time}
            {selKeys.length>0?` · ${selKeys.length} item${selKeys.length>1?"s":""}`:""}</div>
        </div>
        {selKeys.length>0&&(
          <div style={{textAlign:"right",marginRight:6}}>
            <div style={{fontSize:13,fontWeight:700,color:G}}>{mCal} kcal</div>
            <div style={{fontSize:10,color:TXT2}}>{mPro}g P</div>
          </div>
        )}
        {!selKeys.length&&<span style={{fontSize:11,color:TXT3,marginRight:6}}>tap to log</span>}
        <span style={{fontSize:12,color:TXT3,display:"inline-block",
          transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
      </div>

      {/* Logged chips (collapsed summary) */}
      {selKeys.length>0&&!open&&(
        <div style={{padding:"0 14px 10px",display:"flex",flexWrap:"wrap",gap:5}}>
          {selKeys.map(id=>{
            const f=foods.find(x=>String(x.id)===id||x.name===id);
            return(
              <span key={id} style={{display:"inline-flex",alignItems:"center",gap:4,
                fontSize:10,padding:"3px 5px 3px 9px",borderRadius:20,
                background:GL,color:G,border:"1px solid #5DCAA5"}}>
                {f?.name||id}
                <button onClick={e=>{e.stopPropagation();onToggle(meal.id,id);}}
                  style={{width:14,height:14,borderRadius:"50%",border:"none",
                    background:"rgba(0,0,0,0.12)",color:"#fff",cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:9,fontWeight:700,flexShrink:0}}>×</button>
              </span>
            );
          })}
        </div>
      )}

      {/* Expanded — food picker */}
      {open&&(
        <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:10,paddingBottom:8}}>

          {/* Search */}
          <div style={{display:"flex",alignItems:"center",gap:7,background:BG,
            borderRadius:9,padding:"7px 11px",margin:"0 12px 10px"}}>
            <span style={{fontSize:13,flexShrink:0}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search food…"
              style={{flex:1,border:"none",background:"transparent",fontSize:12,
                color:TXT,outline:"none",fontFamily:"'Poppins',Arial,sans-serif",minWidth:0}}/>
            {search&&<button onClick={()=>setSearch("")}
              style={{border:"none",background:"transparent",color:TXT3,cursor:"pointer",fontSize:14,padding:0}}>×</button>}
          </div>

          {/* Selected summary */}
          {selKeys.length>0&&(
            <div style={{margin:"0 12px 10px",padding:"8px 10px",background:GL,
              borderRadius:9,border:"1px solid #5DCAA5"}}>
              <div style={{fontSize:9,fontWeight:800,color:G,textTransform:"uppercase",
                letterSpacing:".05em",marginBottom:5}}>
                ✓ Selected · {mCal} kcal · {mPro}g protein
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {selKeys.map(id=>{
                  const f=foods.find(x=>String(x.id)===id||x.name===id);
                  return(
                    <span key={id} style={{display:"inline-flex",alignItems:"center",gap:3,
                      fontSize:10,padding:"3px 5px 3px 8px",borderRadius:20,
                      background:"#fff",color:G,border:"1px solid #5DCAA5"}}>
                      {f?.name||id}
                      <button onClick={e=>{e.stopPropagation();onToggle(meal.id,id);}}
                        style={{width:13,height:13,borderRadius:"50%",border:"none",
                          background:"rgba(0,0,0,0.1)",color:G,cursor:"pointer",
                          fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {foods.length===0&&(
            <div style={{textAlign:"center",color:TXT2,fontSize:12,padding:"12px 0 8px"}}>
              No food items in your plan yet — ask your dietitian or add custom foods below.
            </div>
          )}

          {/* Search results */}
          {searchResults&&(
            <div style={{padding:"0 12px",marginBottom:8}}>
              {searchResults.length===0
                ?<div style={{textAlign:"center",color:TXT3,fontSize:11,padding:"12px 0"}}>No food found for "{search}"</div>
                :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:6}}>
                  {searchResults.map(f=>(
                    <FoodCard key={f.id} food={f} checked={!!sel[String(f.id)]}
                      onToggle={()=>onToggle(meal.id,String(f.id))}/>
                  ))}
                </div>
              }
            </div>
          )}

          {/* Categorised food grid */}
          {!searchResults&&grouped.map(grp=>(
            <div key={grp.key} style={{marginBottom:12}}>
              <div style={{fontSize:9,fontWeight:800,color:TXT2,textTransform:"uppercase",
                letterSpacing:".07em",padding:"0 12px",marginBottom:6,
                display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:13}}>{grp.icon}</span>
                {grp.key}
                <span style={{flex:1,height:1,background:BORDER,marginLeft:4}}/>
              </div>
              <div style={{padding:"0 12px",
                display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:6}}>
                {grp.items.map(f=>(
                  <FoodCard key={f.id} food={f} checked={!!sel[String(f.id)]}
                    onToggle={()=>onToggle(meal.id,String(f.id))}/>
                ))}
              </div>
            </div>
          ))}

          {/* Add custom food */}
          <button onClick={()=>onAddCustom(meal.id)}
            style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,
              margin:"4px 12px",padding:"9px",width:"calc(100% - 24px)",
              border:`1.5px dashed ${P}`,borderRadius:9,background:PL,
              color:P,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Poppins',Arial,sans-serif"}}>
            ＋ Food not in list? Add custom
          </button>
        </div>
      )}
    </div>
  );
}

// ── Add custom food modal ──────────────────────────────────────────────────
function AddFoodModal({profile,mealId,onSave,onClose}){
  const [form,setForm]=useState({name:"",calories:"",protein:"",carbs:"",fat:"",category:"Custom"});
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");

  async function handleSave(){
    if(!form.name.trim()){setErr("Food name is required.");return;}
    if(!form.calories||isNaN(form.calories)){setErr("Valid calories required.");return;}
    setSaving(true);setErr("");
    try{
      const sb=getSupabase();
      const newFood={
        name:form.name.trim(),
        calories:parseFloat(form.calories)||0,
        protein:parseFloat(form.protein)||0,
        carbs:parseFloat(form.carbs)||0,
        fat:parseFloat(form.fat)||0,
        category:form.category||"Custom",
        template_id:profile.active_template_id||null,
        added_by_user:true,
        added_by_user_id:profile.id,
      };
      const{data,error}=await sb.from("template_food_items").insert(newFood).select().single();
      if(error)throw error;
      onSave(data,mealId);
    }catch(e){setErr(e.message||"Failed to save food.");}
    setSaving(false);
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(13,27,62,0.5)",zIndex:999,
      display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:CARD,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,
        padding:"20px 18px 32px",maxHeight:"85vh",overflowY:"auto",
        fontFamily:"'Poppins',Arial,sans-serif"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:TXT}}>Add food item</div>
            <div style={{fontSize:11,color:TXT2}}>Saved to your personal food list</div>
          </div>
          <button onClick={onClose}
            style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${BORDER}`,
              background:"transparent",cursor:"pointer",fontSize:16,color:TXT2,
              display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        {[["Food name *","name","text","e.g. Dal makhani"],["Calories (kcal) *","calories","number","e.g. 180"]].map(([label,key,type,ph])=>(
          <div key={key} style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:600,color:TXT2,marginBottom:4}}>{label}</div>
            <input type={type} placeholder={ph} value={form[key]}
              onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
              style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${BORDER}`,
                fontSize:13,color:TXT,outline:"none",fontFamily:"'Poppins',Arial,sans-serif",boxSizing:"border-box"}}/>
          </div>
        ))}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
          {[["Protein (g)","protein"],["Carbs (g)","carbs"],["Fat (g)","fat"]].map(([label,key])=>(
            <div key={key}>
              <div style={{fontSize:11,fontWeight:600,color:TXT2,marginBottom:4}}>{label}</div>
              <input type="number" placeholder="0" value={form[key]}
                onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",borderRadius:9,border:`1.5px solid ${BORDER}`,
                  fontSize:13,color:TXT,outline:"none",fontFamily:"'Poppins',Arial,sans-serif",boxSizing:"border-box"}}/>
            </div>
          ))}
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:600,color:TXT2,marginBottom:4}}>Category</div>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
            style={{width:"100%",padding:"9px 12px",borderRadius:9,border:`1.5px solid ${BORDER}`,
              fontSize:13,color:TXT,outline:"none",fontFamily:"'Poppins',Arial,sans-serif",background:CARD}}>
            {CAT_CONFIG.map(c=><option key={c.key} value={c.key}>{c.icon} {c.key}</option>)}
          </select>
        </div>
        {err&&<div style={{fontSize:12,color:R,marginBottom:10,padding:"6px 10px",
          background:"#fff5f5",borderRadius:6}}>{err}</div>}
        <button onClick={handleSave} disabled={saving}
          style={{width:"100%",padding:"13px",borderRadius:10,background:G,color:"#fff",
            border:"none",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer",
            opacity:saving?0.7:1,fontFamily:"'Poppins',Arial,sans-serif"}}>
          {saving?"Saving…":"✓ Add to my food list"}
        </button>
      </div>
    </div>
  );
}

// ── Main Meals page ────────────────────────────────────────────────────────
export default function Meals(){
  const router=useRouter();
  const [profile,setProfile]=useState(null);
  const [foods,setFoods]=useState([]);
  const [dateKey,setDateKey]=useState(today());
  const [log,setLog]=useState({foods:{}});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [addFoodModal,setAddFoodModal]=useState({show:false,mealId:null});

  useEffect(()=>{
    async function init(){
      const sb=getSupabase();
      const{data:{session}}=await sb.auth.getSession();
      if(!session){router.push("/");return;}
      const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
      if(!p||!p.setup_complete){router.push("/setup");return;}
      setProfile(p);
      if(p.active_template_id){
        const[{data:template_foods},{data:custom}]=await Promise.all([
          sb.from("template_food_items").select("*")
            .eq("template_id",p.active_template_id)
            .eq("added_by_user",false),
          sb.from("template_food_items").select("*")
            .eq("added_by_user",true).eq("added_by_user_id",p.id),
        ]);
        const all=[...(template_foods||[]),...(custom||[])];
        // Filter by diet_type — never show wrong diet items
        const dietFilter={
          "Vegetarian":   f=>f.diet_tag!=="non-veg"&&f.diet_tag!=="egg",
          "Vegan":        f=>f.diet_tag==="veg"||f.diet_tag==="vegan",
          "Eggetarian":   f=>f.diet_tag!=="non-veg",
          "Jain":         f=>f.diet_tag==="veg"||f.diet_tag==="vegan",
        }[p.diet_type]||(()=>true);
        const filtered=all.filter(dietFilter);
        setFoods(Array.from(new Map(filtered.map(f=>[f.id,f])).values()));
      }
    }
    init();
  },[]);

  const loadLog=useCallback(async(dk)=>{
    if(!profile)return;
    const{data}=await getSupabase().from("health_logs").select("foods")
      .eq("user_id",profile.id).eq("log_date",dk).single();
    setLog({foods:data?.foods||{}});
  },[profile]);

  useEffect(()=>{if(profile)loadLog(dateKey);},[profile,dateKey]);

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),1800);}

  async function persist(patch){
    const next={...log,...patch};setLog(next);setSaving(true);
    await getSupabase().from("health_logs").upsert(
      {user_id:profile.id,log_date:dateKey,...next},
      {onConflict:"user_id,log_date"}
    );
    setSaving(false);showToast("Saved ✓");
  }

  function toggleFood(mealId,foodId){
    const mf={...(log.foods[mealId]||{})};
    mf[foodId]?delete mf[foodId]:(mf[foodId]=true);
    persist({foods:{...log.foods,[mealId]:mf}});
  }

  function handleFoodAdded(newFood,mealId){
    setFoods(prev=>[...prev,newFood]);
    toggleFood(mealId,String(newFood.id));
    setAddFoodModal({show:false,mealId:null});
    showToast("Food added ✓");
  }

  // Total macros across all meals today
  const allIds=Object.values(log.foods).flatMap(m=>Object.keys(m));
  const totals=allIds.reduce((a,id)=>{
    const f=foods.find(x=>String(x.id)===String(id)||x.name===id);
    return f?{cal:a.cal+(f.calories||0),pro:a.pro+(f.protein||0),carb:a.carb+(f.carbs||0),fat:a.fat+(f.fat||0)}:a;
  },{cal:0,pro:0,carb:0,fat:0});

  if(!profile)return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,border:`3px solid ${G}`,borderTopColor:"transparent",
        borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <>
      <Head><title>Meals — VitaLog</title></Head>
      <style>{`body{font-family:'Poppins',Arial,sans-serif;}`}</style>

      {toast&&(
        <div style={{position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",
          background:TXT,color:"#fff",borderRadius:20,padding:"8px 18px",
          fontSize:12,fontWeight:600,zIndex:999,whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}

      {addFoodModal.show&&(
        <AddFoodModal profile={profile} mealId={addFoodModal.mealId}
          onSave={handleFoodAdded}
          onClose={()=>setAddFoodModal({show:false,mealId:null})}/>
      )}

      <Layout>
        <div style={{padding:"16px",maxWidth:600,margin:"0 auto"}}>

          {/* Date navigation */}
          <div style={{display:"flex",alignItems:"center",gap:8,background:CARD,
            borderRadius:14,border:`1px solid ${BORDER}`,padding:"10px 14px",marginBottom:12}}>
            <button onClick={()=>{const d=new Date(dateKey);d.setDate(d.getDate()-1);setDateKey(fmt(d));}}
              style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${BORDER}`,
                background:"transparent",cursor:"pointer",fontSize:16,color:TXT2}}>‹</button>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:700,color:TXT}}>{dayLabel(dateKey)}</div>
              <div style={{fontSize:11,color:TXT2}}>{new Date(dateKey+"T12:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
            </div>
            <button onClick={()=>{const d=new Date(dateKey);d.setDate(d.getDate()+1);if(fmt(d)<=today())setDateKey(fmt(d));}}
              disabled={dateKey>=today()}
              style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${BORDER}`,
                background:"transparent",cursor:"pointer",fontSize:16,color:TXT2,opacity:dateKey>=today()?0.3:1}}>›</button>
          </div>

          {/* Daily macro totals bar */}
          {totals.cal>0&&(
            <div style={{background:CARD,borderRadius:14,border:`1px solid ${BORDER}`,
              padding:"12px 16px",marginBottom:12,
              display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,textAlign:"center"}}>
              {[
                {label:"Calories",value:`${totals.cal}`,unit:"kcal",color:G},
                {label:"Protein", value:`${totals.pro}`,unit:"g",  color:"#2B6CB0"},
                {label:"Carbs",   value:`${totals.carb}`,unit:"g", color:A},
                {label:"Fat",     value:`${totals.fat}`, unit:"g", color:R},
              ].map(m=>(
                <div key={m.label}>
                  <div style={{fontSize:16,fontWeight:800,color:m.color}}>{m.value}
                    <span style={{fontSize:9,fontWeight:400,color:TXT3}}>{m.unit}</span>
                  </div>
                  <div style={{fontSize:9,color:TXT2,marginTop:2}}>{m.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Meal slots */}
          <div style={{marginBottom:6,fontSize:11,fontWeight:600,color:TXT2,
            textTransform:"uppercase",letterSpacing:".06em"}}>
            Tap a meal to log food
          </div>
          {MEAL_DEFS.map(meal=>(
            <MealSlot
              key={meal.id}
              meal={meal}
              foods={foods}
              sel={log.foods[meal.id]||{}}
              onToggle={toggleFood}
              onAddCustom={(mealId)=>setAddFoodModal({show:true,mealId})}
            />
          ))}

          {/* Empty state */}
          {foods.length===0&&(
            <div style={{background:CARD,borderRadius:14,border:`1px dashed ${BORDER}`,
              padding:"32px 20px",textAlign:"center",marginTop:8}}>
              <div style={{fontSize:"2rem",marginBottom:8}}>🥗</div>
              <div style={{fontSize:14,fontWeight:700,color:TXT,marginBottom:4}}>No meal plan assigned yet</div>
              <div style={{fontSize:12,color:TXT2}}>Your dietitian will assign a meal plan, or you can add custom foods using the button in each meal slot above.</div>
            </div>
          )}

        </div>
      </Layout>
    </>
  );
}
