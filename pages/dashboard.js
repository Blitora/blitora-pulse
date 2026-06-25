import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";
import Layout from "../components/Layout";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",T="#00a09d",A="#EF9F27",AL="#faeeda",R="#E24B4A";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7",CARD="#fff";

const HABITS=["4 almonds + 2 walnuts","No sugar / jaggery / honey","No fried food today","Dinner before 8 PM","Sleep by 10:30 PM"];
const WALKS=[{k:"morning_walk",l:"Morning walk",t:40,max:60},{k:"post_lunch_walk",l:"Post-lunch walk",t:15,max:30},{k:"post_dinner_walk",l:"Post-dinner walk",t:20,max:30}];

// Category config — maps food.category string to icon + display order
const CAT_CONFIG = [
  {key:"Grains",   icon:"🌾"}, {key:"Protein",  icon:"🥚"},
  {key:"Dairy",    icon:"🥛"}, {key:"Fruits",   icon:"🍎"},
  {key:"Drinks",   icon:"🍵"}, {key:"Veggies",  icon:"🥦"},
  {key:"Snacks",   icon:"🥜"}, {key:"Custom",   icon:"✨"},
];

function fmt(d){return d.toISOString().split("T")[0];}
function today(){return fmt(new Date());}
function dayLabel(dk){
  const t=today(),y=fmt(new Date(Date.now()-86400000));
  if(dk===t)return"Today";if(dk===y)return"Yesterday";
  return new Date(dk).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}

function calcBMR(profile){
  if(!profile) return 1800;
  const weight=parseFloat(profile.weight_current)||parseFloat(profile.weight_start)||70;
  const height=parseFloat(profile.height_cm)||165;
  const age=parseInt(profile.age)||30;
  const base=Math.round(10*weight+6.25*height-5*age);
  return profile.gender==="Female"?base-161:base+5;
}

function activityMultiplier(level){
  const map={sedentary:1.2,lightly_active:1.375,moderately_active:1.55,very_active:1.725,extra_active:1.9};
  return map[level]||1.2;
}

function Ring({pct=0,size=72,color,label,sub}){
  const r=(size-8)/2,c=2*Math.PI*r,d=Math.min(pct/100,1)*c;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={BORDER} strokeWidth={8}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={`${d} ${c}`} strokeLinecap="round" style={{transition:"stroke-dasharray .5s"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:13,fontWeight:700,color:TXT,lineHeight:1}}>{label}</span>
          {sub&&<span style={{fontSize:9,color:TXT2,marginTop:1}}>{sub}</span>}
        </div>
      </div>
    </div>
  );
}

function MBar({label,val,max,color,unit}){
  const p=Math.min(100,Math.round((val/max)*100));
  return(
    <div style={{marginBottom:9}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
        <span style={{color:TXT2}}>{label}</span>
        <span style={{fontWeight:600,color:p>100?R:TXT}}>{val}{unit}<span style={{color:TXT3,fontWeight:400}}> / {max}</span></span>
      </div>
      <div style={{height:6,background:BORDER,borderRadius:3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${p}%`,background:p>100?R:color,borderRadius:3,transition:"width .4s"}}/>
      </div>
    </div>
  );
}

// ─── ADD FOOD MODAL ───────────────────────────────────────────────────────────
function AddFoodModal({profile,onSave,onClose}){
  const [form,setForm]=useState({name:"",calories:"",protein:"",carbs:"",fat:"",category:""});
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");

  async function handleSave(){
    if(!form.name.trim()){setErr("Food name is required");return;}
    if(!form.calories||isNaN(form.calories)){setErr("Valid calories required");return;}
    setSaving(true);setErr("");
    try{
      const sb=getSupabase();
      const newFood={
        name:form.name.trim(),
        calories:parseFloat(form.calories)||0,
        protein:parseFloat(form.protein)||0,
        carbs:parseFloat(form.carbs)||0,
        fat:parseFloat(form.fat)||0,
        category:form.category.trim()||"Custom",
        template_id:profile.active_template_id||null,
        added_by_user:true,
        added_by_user_id:profile.id,
      };
      const{data,error}=await sb.from("template_food_items").insert(newFood).select().single();
      if(error)throw error;
      onSave(data);
    }catch(e){setErr(e.message||"Failed to save food");}
    setSaving(false);
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:CARD,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,padding:"20px 18px 32px",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:TXT}}>Add Food Item</div>
            <div style={{fontSize:11,color:TXT2}}>Saved to Food Master & your list</div>
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${BORDER}`,background:"transparent",cursor:"pointer",fontSize:16,color:TXT2,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
        {[["Food Name *","name","text","e.g. Moong Dal Chilla"],["Calories (kcal) *","calories","number","e.g. 180"]].map(([label,key,type,ph])=>(
          <div key={key} style={{marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:600,color:TXT2,marginBottom:4}}>{label}</div>
            <input type={type} placeholder={ph} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
              style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${BORDER}`,fontSize:13,color:TXT,outline:"none",fontFamily:"inherit"}}/>
          </div>
        ))}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
          {[["Protein g","protein"],["Carbs g","carbs"],["Fat g","fat"]].map(([label,key])=>(
            <div key={key}>
              <div style={{fontSize:11,fontWeight:600,color:TXT2,marginBottom:4}}>{label}</div>
              <input type="number" placeholder="0" value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1px solid ${BORDER}`,fontSize:13,color:TXT,outline:"none",fontFamily:"inherit"}}/>
            </div>
          ))}
        </div>
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:600,color:TXT2,marginBottom:4}}>Category</div>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
            style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${BORDER}`,fontSize:13,color:TXT,outline:"none",fontFamily:"inherit",background:CARD}}>
            <option value="">Select category…</option>
            {CAT_CONFIG.map(c=><option key={c.key} value={c.key}>{c.icon} {c.key}</option>)}
          </select>
        </div>
        {err&&<div style={{fontSize:12,color:R,marginBottom:10,padding:"6px 10px",background:"#fff5f5",borderRadius:6}}>{err}</div>}
        <button onClick={handleSave} disabled={saving}
          style={{width:"100%",padding:"13px",borderRadius:10,background:P,color:"#fff",border:"none",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1}}>
          {saving?"Saving…":"✓ Add Food to My List"}
        </button>
      </div>
    </div>
  );
}

// ─── APK DOWNLOAD BANNER ──────────────────────────────────────────────────────
function AppDownloadBanner(){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const isMobile=/Android|iPhone|iPad/i.test(navigator.userAgent);
    const isStandalone=window.matchMedia("(display-mode: standalone)").matches;
    setVisible(isMobile&&!isStandalone);
  },[]);
  if(!visible)return null;
  return(
    <div style={{background:`linear-gradient(90deg,${P},#9b6e8e)`,borderRadius:12,padding:"11px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
      <div style={{fontSize:26,flexShrink:0}}>📱</div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>Get the MyHealth App</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.8)"}}>Install directly — no Play Store needed</div>
      </div>
      <a href="/MyHealthTracker.apk" download="MyHealthTracker.apk"
        style={{flexShrink:0,background:"#fff",color:P,fontSize:12,fontWeight:700,padding:"8px 14px",borderRadius:8,textDecoration:"none",whiteSpace:"nowrap"}}>
        Download
      </a>
      <button onClick={()=>setVisible(false)}
        style={{flexShrink:0,background:"transparent",border:"none",color:"rgba(255,255,255,0.7)",fontSize:18,cursor:"pointer",padding:"0 2px"}}>×</button>
    </div>
  );
}

// ─── FOOD CARD (2-column) ────────────────────────────────────────────────────

// ─── FOOD CARD (CSS grid cell — no fixed width) ──────────────────────────────
function FoodCard({food,checked,onToggle}){
  return(
    <div onClick={onToggle} style={{
      borderRadius:10,
      border:`1.5px solid ${checked?G:BORDER}`,
      padding:"9px 9px 8px", cursor:"pointer",
      background:checked?GL:CARD, position:"relative",
      transition:"all .15s", minWidth:0,  // prevents grid blowout
    }}>
      {/* Checkmark */}
      <div style={{
        position:"absolute",top:6,right:6,width:17,height:17,
        borderRadius:"50%",border:`1.5px solid ${checked?G:BORDER}`,
        background:checked?G:"#fff",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:8,color:"#fff",fontWeight:900,transition:"all .15s",
      }}>{checked?"✓":""}</div>
      <div style={{fontSize:11,fontWeight:600,color:checked?G:TXT,lineHeight:1.3,paddingRight:20,marginBottom:5,wordBreak:"break-word"}}>
        {food.name}
        {food.added_by_user&&<span style={{fontSize:8,color:TXT3,marginLeft:3}}>· custom</span>}
      </div>
      <div style={{fontSize:12,fontWeight:800,color:"#7F77DD"}}>{food.calories||0} <span style={{fontSize:9,fontWeight:400,color:TXT3}}>kcal</span></div>
      <div style={{fontSize:9,color:G,marginTop:2}}>{food.protein||0}g protein</div>
    </div>
  );
}

// ─── MEAL FOOD PANEL (new UI) ────────────────────────────────────────────────
function MealFoodPanel({meal,foods,sel,onToggle,onAddFood}){
  const [search,setSearch]=useState("");

  // Group foods by category
  const catKeys=CAT_CONFIG.map(c=>c.key);
  const grouped=[];
  catKeys.forEach(key=>{
    const items=foods.filter(f=>(f.category||"Custom")===key);
    if(items.length) grouped.push({key,icon:CAT_CONFIG.find(c=>c.key===key)?.icon||"🍴",items});
  });
  const knownCats=new Set(catKeys);
  const otherCats=[...new Set(foods.map(f=>f.category||"Custom").filter(c=>!knownCats.has(c)))];
  otherCats.forEach(cat=>{
    const items=foods.filter(f=>(f.category||"Custom")===cat);
    if(items.length) grouped.push({key:cat,icon:"🍴",items});
  });

  const q=search.toLowerCase();
  const searchResults=q?foods.filter(f=>f.name.toLowerCase().includes(q)):null;

  // CSS grid: 2 cols on mobile, 3 on tablet, 4 on desktop
  const foodGrid={
    display:"grid",
    gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))",
    gap:6,
    width:"100%",
  };

  return(
    <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:10,paddingBottom:4}}>

      {/* Search bar */}
      <div style={{display:"flex",alignItems:"center",gap:7,background:BG,borderRadius:9,padding:"7px 11px",margin:"0 12px 10px"}}>
        <span style={{fontSize:13,flexShrink:0}}>🔍</span>
        <input
          placeholder="Search food…"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{flex:1,border:"none",background:"transparent",fontSize:12,color:TXT,outline:"none",fontFamily:"inherit",minWidth:0}}
        />
        {search&&<button onClick={()=>setSearch("")} style={{border:"none",background:"transparent",color:TXT3,cursor:"pointer",fontSize:14,lineHeight:1,padding:0,flexShrink:0}}>×</button>}
      </div>

      {/* No foods message */}
      {foods.length===0&&(
        <div style={{textAlign:"center",color:TXT2,fontSize:12,padding:"12px 0 8px"}}>
          No food items assigned yet — ask admin to assign a plan.
        </div>
      )}

      {/* Search results — responsive grid */}
      {searchResults&&(
        <div style={{padding:"0 12px",marginBottom:8}}>
          {searchResults.length===0
            ?<div style={{textAlign:"center",color:TXT3,fontSize:11,padding:"12px 0"}}>No food found for "{search}"</div>
            :<div style={foodGrid}>
              {searchResults.map(f=>(
                <FoodCard key={f.id} food={f} checked={!!sel[String(f.id)]} onToggle={()=>onToggle(meal.id,String(f.id))}/>
              ))}
            </div>
          }
        </div>
      )}

      {/* Category groups — responsive grid per category */}
      {!searchResults&&grouped.map(grp=>(
        <div key={grp.key} style={{marginBottom:12}}>
          {/* Category label */}
          <div style={{
            fontSize:9,fontWeight:800,color:TXT2,
            textTransform:"uppercase",letterSpacing:".07em",
            padding:"0 12px",marginBottom:6,
            display:"flex",alignItems:"center",gap:5,
          }}>
            <span style={{fontSize:13}}>{grp.icon}</span>
            {grp.key}
            <span style={{flex:1,height:1,background:BORDER,display:"block",marginLeft:4}}/>
          </div>
          {/* Responsive grid — no horizontal scroll */}
          <div style={{padding:"0 12px"}}>
            <div style={foodGrid}>
              {grp.items.map(f=>(
                <FoodCard key={f.id} food={f} checked={!!sel[String(f.id)]} onToggle={()=>onToggle(meal.id,String(f.id))}/>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Selected summary bar */}
      {Object.keys(sel).length>0&&(
        <div style={{margin:"4px 12px 8px",padding:"8px 10px",background:GL,borderRadius:9,border:`1px solid #5DCAA5`}}>
          <div style={{fontSize:9,fontWeight:800,color:G,textTransform:"uppercase",letterSpacing:".05em",marginBottom:5}}>
            ✓ Selected · {Object.keys(sel).reduce((s,id)=>{const f=foods.find(x=>String(x.id)===id);return f?s+(f.calories||0):s;},0)} kcal
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {Object.keys(sel).map(id=>{
              const f=foods.find(x=>String(x.id)===id);
              return(
                <span key={id} style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,padding:"3px 5px 3px 8px",borderRadius:20,background:"#fff",color:G,border:"1px solid #5DCAA5"}}>
                  {f?.name||id}
                  <button onClick={e=>{e.stopPropagation();onToggle(meal.id,id);}}
                    style={{width:13,height:13,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.1)",color:G,cursor:"pointer",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Add food button */}
      <button onClick={onAddFood} style={{
        display:"flex",alignItems:"center",justifyContent:"center",gap:6,
        margin:"4px 12px 4px",padding:"8px",width:"calc(100% - 24px)",
        border:`1.5px dashed ${P}`,borderRadius:9,background:PL,
        color:P,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
      }}>
        <span style={{fontSize:14,lineHeight:1}}>＋</span> Food not in list? Add it
      </button>
    </div>
  );
}
// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard(){
  const router=useRouter();
  const [profile,setProfile]=useState(null);
  const [foods,setFoods]=useState([]);
  const [dateKey,setDateKey]=useState(today());
  const [log,setLog]=useState({foods:{},activity:{},water:0,habits:{},weight:null});
  const [openMeal,setOpenMeal]=useState(null);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [showAddFood,setShowAddFood]=useState(false);
  const [addFoodMeal,setAddFoodMeal]=useState(null);

  useEffect(()=>{
    async function init(){
      const sb=getSupabase();
      const{data:{session}}=await sb.auth.getSession();
      if(!session){router.push("/login");return;}
      const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
      if(!p){router.push("/login");return;}
      if(p.status==="pending"){router.push("/pending");return;}
      if(!p.setup_complete){router.push("/setup");return;}
      setProfile(p);
      if(p.active_template_id){
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
    const sb=getSupabase();
    const{data}=await sb.from("health_logs").select("*").eq("user_id",profile.id).eq("log_date",dk).single();
    if(data)setLog({foods:data.foods||{},activity:data.activity||{},water:data.water||0,habits:data.habits||{},weight:data.weight||null});
    else setLog({foods:{},activity:{},water:0,habits:{},weight:null});
  },[profile]);

  useEffect(()=>{if(profile)loadLog(dateKey);},[profile,dateKey]);

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),1800);}

  async function persist(patch){
    const next={...log,...patch};setLog(next);setSaving(true);
    await getSupabase().from("health_logs").upsert({user_id:profile.id,log_date:dateKey,...next},{onConflict:"user_id,log_date"});
    setSaving(false);showToast("Saved ✓");
  }

  function toggleFood(mealId,foodId){
    const mf={...(log.foods[mealId]||{})};
    mf[foodId]?delete mf[foodId]:(mf[foodId]=true);
    persist({foods:{...log.foods,[mealId]:mf}});
  }

  function handleFoodAdded(newFood){
    setFoods(prev=>[...prev,newFood]);
    toggleFood(addFoodMeal,String(newFood.id));
    setShowAddFood(false);setAddFoodMeal(null);
    showToast("Food added ✓");
  }

  const MEAL_DEFS=[
    {id:"morning",   label:"Morning",      time:"7:00 AM",  icon:"☀️", bg:AL},
    {id:"breakfast", label:"Breakfast",    time:"8:00 AM",  icon:"🍳", bg:PL},
    {id:"midmorning",label:"Mid-morning",  time:"11:00 AM", icon:"☕", bg:"#e0f5f5"},
    {id:"lunch",     label:"Lunch",        time:"1:00 PM",  icon:"🍽️",bg:GL},
    {id:"evening",   label:"Evening snack",time:"4:30 PM",  icon:"🌆", bg:"#FAECE7"},
    {id:"dinner",    label:"Dinner",       time:"7:30 PM",  icon:"🌙", bg:"#eeedfe"},
  ];

  const allIds=Object.values(log.foods).flatMap(m=>Object.keys(m));
  const mac=allIds.reduce((a,id)=>{
    const f=foods.find(x=>String(x.id)===String(id)||x.name===id);
    return f?{cal:a.cal+(f.calories||0),pro:a.pro+(f.protein||0),carb:a.carb+(f.carbs||0),fat:a.fat+(f.fat||0)}:a;
  },{cal:0,pro:0,carb:0,fat:0});

  const BMR=calcBMR(profile);
  const burnAct=WALKS.reduce((s,w)=>s+(log.activity[w.k]||0)*(w.k==="morning_walk"?5:4),0);
  const totalBurn=Math.round(BMR*activityMultiplier(profile?.activity_level))+burnAct;
  const burnRingPct=profile?.calorie_target?Math.round((totalBurn/profile.calorie_target)*100):Math.round((totalBurn/2000)*100);
  const waterL=(log.water||0)*0.5;
  const waterTarget=profile?.water_target||3.5;
  const calTarget=profile?.calorie_target||1600;
  const proTarget=profile?.protein_target||100;
  const habDone=Object.values(log.habits).filter(Boolean).length;
  const mealsDone=Object.values(log.foods).filter(m=>Object.keys(m).length>0).length;

  if(!profile)return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="ht-spinner"/>
    </div>
  );

  return(
    <>
      <Head><title>Dashboard — MyHealth</title></Head>
      <style>{`
        .card{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:14px;margin-bottom:12px}
        .ctitle{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:11px}
        .date-nav{display:flex;align-items:center;gap:8px;background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:10px 14px;margin-bottom:12px}
        .dbtn{width:32px;height:32px;border-radius:50%;border:1px solid ${BORDER};background:transparent;cursor:pointer;font-size:16px;color:${TXT2};display:flex;align-items:center;justify-content:center;transition:all .15s}
        .dbtn:hover{border-color:${P};color:${P}} .dbtn:disabled{opacity:.3;cursor:default}
        .kgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
        .kpi{background:${CARD};border-radius:11px;border:1px solid ${BORDER};padding:10px 8px;text-align:center}
        .wbtns{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
        .wbtn{height:34px;padding:0 10px;border-radius:8px;border:1.5px solid ${BORDER};font-size:11px;font-weight:600;color:${TXT3};background:transparent;cursor:pointer;transition:all .15s;min-width:38px}
        .wbtn.on{border-color:#38bdf8;background:rgba(56,189,248,.1);color:#0284c7}
        .wkbtns{display:flex;gap:3px;flex-wrap:wrap;margin-top:5px}
        .wkbtn{padding:3px 8px;border-radius:6px;border:1px solid ${BORDER};font-size:11px;font-weight:600;color:${TXT3};background:transparent;cursor:pointer}
        .wkbtn.on{border-color:${P};background:${PL};color:${P}}
        .hrow{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid ${BORDER};cursor:pointer}
        .hrow:last-child{border-bottom:none}
        .hchk{width:20px;height:20px;border-radius:50%;border:2px solid ${BORDER};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
        .hchk.on{background:${G};border-color:${G}}
        .mcard{background:${CARD};border-radius:12px;border:1.5px solid ${BORDER};margin-bottom:8px;overflow:hidden;transition:border-color .2s}
        .mcard.done{border-color:${G}}
        .mhdr{display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer;transition:background .15s}
        .mhdr:active{background:#faf9fd}
        @media(max-width:480px){.kgrid{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      {toast&&<div className="ht-toast">{toast}</div>}
      {showAddFood&&<AddFoodModal profile={profile} onSave={handleFoodAdded} onClose={()=>{setShowAddFood(false);setAddFoodMeal(null);}}/>}

      <Layout title={`Dashboard${saving?" · saving…":""}`} profile={profile}>

        <AppDownloadBanner/>

        {/* DATE NAV */}
        <div className="date-nav">
          <button className="dbtn" onClick={()=>{const d=new Date(dateKey);d.setDate(d.getDate()-1);setDateKey(fmt(d));}}>‹</button>
          <div style={{flex:1,textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:600,color:TXT}}>{dayLabel(dateKey)}</div>
            <div style={{fontSize:11,color:TXT2}}>{new Date(dateKey).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
          <input type="date" id="dp" value={dateKey} max={today()} onChange={e=>e.target.value&&setDateKey(e.target.value)} style={{opacity:0,width:0,height:0,position:"absolute"}}/>
          <button className="dbtn" onClick={()=>document.getElementById("dp").showPicker?.()}>📅</button>
          <button className="dbtn" onClick={()=>{const d=new Date(dateKey);d.setDate(d.getDate()+1);if(fmt(d)<=today())setDateKey(fmt(d));}} disabled={dateKey>=today()}>›</button>
        </div>

        {/* RINGS */}
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-around",marginBottom:10}}>
            <Ring pct={Math.round((mac.cal/calTarget)*100)} color="#7F77DD" label={`${mac.cal}`} sub="kcal in"/>
            {/* Burned ring: grey when no food logged yet — avoids confusing large green surplus */}
            <Ring
              pct={mac.cal>0?burnRingPct:0}
              color={mac.cal>0?G:BORDER}
              label={mac.cal>0?`${totalBurn}`:"—"}
              sub="burned"
            />
            <Ring pct={Math.round((mac.pro/proTarget)*100)} color={T} label={`${mac.pro}g`} sub="protein"/>
            <Ring pct={Math.round((waterL/waterTarget)*100)} color="#38bdf8" label={`${waterL}L`} sub="water"/>
          </div>
          {mac.cal===0?(
            <div style={{textAlign:"center",fontSize:11,color:TXT3,padding:"2px 0 4px"}}>
              🕐 No meals logged yet today · Your body burns <span style={{fontWeight:600,color:TXT2}}>{totalBurn} kcal</span> at rest
            </div>
          ):(
            <div style={{textAlign:"center",fontSize:12,color:TXT2}}>
              Net: <span style={{fontWeight:700,color:totalBurn-mac.cal>0?G:R}}>{totalBurn-mac.cal>0?"+":""}{Math.round(totalBurn-mac.cal)} kcal</span>
              <span style={{color:TXT3,marginLeft:8,fontSize:11}}>{mealsDone}/6 meals · {habDone}/5 habits</span>
            </div>
          )}
          <div style={{textAlign:"center",fontSize:10,color:TXT3,marginTop:3}}>
            Base metabolism {BMR} + walks {burnAct} kcal
          </div>
        </div>

        {/* KPI GRID */}
        <div className="kgrid">
          {[
            {l:"Calories in",v:mac.cal,c:"#7F77DD"},
            {l:"Burned",v:mac.cal>0?Math.round(totalBurn):"—",c:mac.cal>0?G:TXT3},
            {l:"Protein",v:`${mac.pro}g`,c:T},
            {l:"Net cal",v:mac.cal>0?`${totalBurn-mac.cal>0?"+":""}${Math.round(totalBurn-mac.cal)}`:"—",c:mac.cal>0?(totalBurn-mac.cal>0?G:R):TXT3}
          ].map((k,i)=>(
            <div key={i} className="kpi">
              <div style={{fontSize:16,fontWeight:700,color:k.c,lineHeight:1,marginBottom:3}}>{k.v}</div>
              <div style={{fontSize:9,color:TXT2,textTransform:"uppercase",letterSpacing:".03em"}}>{k.l}</div>
            </div>
          ))}
        </div>

        {/* MACROS */}
        <div className="card">
          <div className="ctitle">Macros today</div>
          <MBar label="Calories" val={mac.cal} max={calTarget} color="#7F77DD" unit=" kcal"/>
          <MBar label="Protein"  val={mac.pro} max={proTarget} color={G} unit="g"/>
          <MBar label="Carbs"    val={mac.carb} max={profile?.carb_target||130} color={A} unit="g"/>
          <MBar label="Fat"      val={mac.fat}  max={profile?.fat_target||55}  color="#D85A30" unit="g"/>
        </div>

        {/* ── MEALS — NEW UI ── */}
        <div className="ctitle" style={{padding:"0 2px",marginBottom:8}}>Meals — tap to log food</div>
        {MEAL_DEFS.map(meal=>{
          const mSel=log.foods[meal.id]||{};
          const selKeys=Object.keys(mSel);
          const mCal=selKeys.reduce((s,id)=>{const f=foods.find(x=>String(x.id)===id||x.name===id);return f?s+(f.calories||0):s;},0);
          const mPro=selKeys.reduce((s,id)=>{const f=foods.find(x=>String(x.id)===id||x.name===id);return f?s+(f.protein||0):s;},0);
          const isOpen=openMeal===meal.id;
          return(
            <div key={meal.id} className={`mcard${selKeys.length>0?" done":""}`}>
              {/* Meal header */}
              <div className="mhdr" style={{background:selKeys.length>0&&!isOpen?GL:CARD}}
                onClick={()=>setOpenMeal(isOpen?null:meal.id)}>
                <div style={{width:34,height:34,borderRadius:8,background:meal.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{meal.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:TXT}}>{meal.label}</div>
                  <div style={{fontSize:11,color:TXT2}}>{meal.time}{selKeys.length>0?` · ${selKeys.length} item${selKeys.length>1?"s":""}`:""}</div>
                </div>
                {selKeys.length>0&&<div style={{textAlign:"right",marginRight:6}}>
                  <div style={{fontSize:13,fontWeight:700,color:G}}>{mCal} kcal</div>
                  <div style={{fontSize:10,color:TXT2}}>{mPro}g P</div>
                </div>}
                {!selKeys.length&&<span style={{fontSize:11,color:TXT3,marginRight:6}}>tap to log</span>}
                <span style={{fontSize:12,color:TXT3,display:"inline-block",transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
              </div>

              {/* Collapsed selected pills */}
              {selKeys.length>0&&!isOpen&&(
                <div style={{padding:"0 13px 9px",display:"flex",flexWrap:"wrap",gap:4}}>
                  {selKeys.map(id=>{
                    const f=foods.find(x=>String(x.id)===id||x.name===id);
                    return(
                      <span key={id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,padding:"3px 5px 3px 9px",borderRadius:20,background:GL,color:G,border:"1px solid #5DCAA5"}}>
                        {f?.name||id}
                        <button onClick={e=>{e.stopPropagation();toggleFood(meal.id,id);}}
                          style={{width:14,height:14,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.12)",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0}}>×</button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* ── NEW FOOD PANEL ── */}
              {isOpen&&(
                <MealFoodPanel
                  meal={meal}
                  foods={foods}
                  sel={mSel}
                  onToggle={toggleFood}
                  onAddFood={()=>{setAddFoodMeal(meal.id);setShowAddFood(true);}}
                />
              )}
            </div>
          );
        })}

        {/* WATER */}
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div className="ctitle" style={{margin:0}}>💧 Water</div>
            <span style={{fontSize:12,fontWeight:600,color:waterL>=waterTarget?G:"#0284c7"}}>{waterL}L / {waterTarget}L {waterL>=waterTarget?"✓":""}</span>
          </div>
          <div className="wbtns">
            {[0.5,1,1.5,2,2.5,3,3.5,4,4.5,5].map(v=>{
              const steps=Math.round(v/0.5);
              return<button key={v} className={`wbtn${(log.water||0)>=steps?" on":""}`} onClick={()=>persist({water:steps})}>{v}L</button>;
            })}
          </div>
        </div>

        {/* ACTIVITY */}
        <div className="card">
          <div className="ctitle">🏃 Activity</div>
          {WALKS.map(w=>(
            <div key={w.k} style={{marginBottom:11}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                <span style={{color:TXT2}}>{w.l}</span>
                <span style={{fontWeight:600,color:(log.activity[w.k]||0)>=w.t?G:TXT}}>{log.activity[w.k]||0}min {(log.activity[w.k]||0)>=w.t?"✓":`/ ${w.t}`}</span>
              </div>
              <div className="wkbtns">
                {[0,5,10,15,20,25,30,35,40,45,60].filter(v=>v<=w.max).map(v=>(
                  <button key={v} className={`wkbtn${(log.activity[w.k]||0)===v?" on":""}`} onClick={()=>persist({activity:{...log.activity,[w.k]:v}})}>{v}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* HABITS */}
        <div className="card">
          <div className="ctitle">✅ Daily habits — {habDone}/5</div>
          {HABITS.map(h=>(
            <div key={h} className="hrow" onClick={()=>persist({habits:{...log.habits,[h]:!log.habits[h]}})}>
              <div className={`hchk${log.habits[h]?" on":""}`}>{log.habits[h]&&<span style={{color:"#fff",fontSize:10,fontWeight:900}}>✓</span>}</div>
              <span style={{fontSize:12,color:log.habits[h]?G:TXT,textDecoration:log.habits[h]?"line-through":"none"}}>{h}</span>
            </div>
          ))}
        </div>

        {/* WEIGHT */}
        <div className="card">
          <div className="ctitle">⚖️ Weight — {dayLabel(dateKey)}</div>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
            <input type="number" step="0.1" value={log.weight||""} placeholder="Enter kg"
              onChange={e=>persist({weight:e.target.value?+e.target.value:null})}
              style={{width:100,padding:"8px 12px",borderRadius:8,border:`1px solid ${BORDER}`,fontSize:14,fontWeight:600,color:P,outline:"none"}}/>
            <span style={{fontSize:12,color:TXT2}}>kg</span>
            {log.weight&&profile?.weight_start&&<span style={{fontSize:12,color:G,fontWeight:600}}>Lost: {(profile.weight_start-log.weight).toFixed(1)}kg</span>}
          </div>
          {log.weight&&profile?.weight_start&&profile?.weight_target&&(
            <>
              <div style={{height:6,background:BORDER,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",background:G,borderRadius:3,width:`${Math.min(100,Math.max(0,Math.round(((profile.weight_start-log.weight)/(profile.weight_start-profile.weight_target))*100)))}%`}}/>
              </div>
              <div style={{fontSize:10,color:TXT2,marginTop:3}}>
                {Math.round(((profile.weight_start-log.weight)/(profile.weight_start-profile.weight_target))*100)}% toward goal · Target: {profile.weight_target}kg
              </div>
            </>
          )}
        </div>

      </Layout>
    </>
  );
}
