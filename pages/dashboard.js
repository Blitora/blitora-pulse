import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";
import Layout from "../components/Layout";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",T="#00a09d",A="#EF9F27",AL="#faeeda",R="#E24B4A";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7",CARD="#fff";

const HABITS=["4 almonds + 2 walnuts","No sugar / jaggery / honey","No fried food today","Dinner before 8 PM","Sleep by 10:30 PM"];
const WALKS=[{k:"morning_walk",l:"Morning walk",t:40,max:60},{k:"post_lunch_walk",l:"Post-lunch walk",t:15,max:30},{k:"post_dinner_walk",l:"Post-dinner walk",t:20,max:30}];

function fmt(d){return d.toISOString().split("T")[0];}
function today(){return fmt(new Date());}
function dayLabel(dk){
  const t=today(),y=fmt(new Date(Date.now()-86400000));
  if(dk===t)return"Today";if(dk===y)return"Yesterday";
  return new Date(dk).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}

// ─── FIX 1: BMR uses real profile values, not hardcoded fallbacks ─────────────
// Uses profile.age (integer), profile.weight_current (numeric), profile.height_cm (numeric)
// Mifflin-St Jeor formula: 10*weight + 6.25*height - 5*age + gender_offset
function calcBMR(profile){
  if(!profile) return 1800;
  const weight = parseFloat(profile.weight_current) || parseFloat(profile.weight_start) || 70;
  const height = parseFloat(profile.height_cm) || 165;
  const age    = parseInt(profile.age) || 30;
  const base   = Math.round(10 * weight + 6.25 * height - 5 * age);
  return profile.gender === "Female" ? base - 161 : base + 5;
}

// Activity level multiplier on top of walk calories
function activityMultiplier(level){
  const map = { sedentary:1.2, lightly_active:1.375, moderately_active:1.55, very_active:1.725, extra_active:1.9 };
  return map[level] || 1.2;
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
function AddFoodModal({ profile, onSave, onClose }){
  const [form,setForm]=useState({name:"",calories:"",protein:"",carbs:"",fat:"",category:""});
  const [saving,setSaving]=useState(false);
  const [err,setErr]=useState("");

  async function handleSave(){
    if(!form.name.trim()){ setErr("Food name is required"); return; }
    if(!form.calories || isNaN(form.calories)){ setErr("Valid calories required"); return; }
    setSaving(true); setErr("");
    try {
      const sb = getSupabase();
      const newFood = {
        name: form.name.trim(),
        calories: parseFloat(form.calories) || 0,
        protein:  parseFloat(form.protein)  || 0,
        carbs:    parseFloat(form.carbs)    || 0,
        fat:      parseFloat(form.fat)      || 0,
        category: form.category.trim() || "Custom",
        // ─── FIX: flagged as user-added, linked to their template ───────────
        template_id:    profile.active_template_id || null,
        added_by_user:  true,
        added_by_user_id: profile.id,
      };
      const { data, error } = await sb
        .from("template_food_items")
        .insert(newFood)
        .select()
        .single();
      if(error) throw error;
      onSave(data);  // pass new food back to parent to add to local state
    } catch(e){
      setErr(e.message || "Failed to save food");
    }
    setSaving(false);
  }

  const inp = (label,key,type="text",placeholder="") => (
    <div style={{marginBottom:10}}>
      <div style={{fontSize:11,fontWeight:600,color:TXT2,marginBottom:4}}>{label}</div>
      <input
        type={type} placeholder={placeholder}
        value={form[key]}
        onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
        style={{width:"100%",padding:"8px 12px",borderRadius:8,border:`1px solid ${BORDER}`,
          fontSize:13,color:TXT,outline:"none",fontFamily:"inherit"}}
      />
    </div>
  );

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:CARD,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,padding:"20px 18px 32px",maxHeight:"85vh",overflowY:"auto"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:TXT}}>Add Food Item</div>
            <div style={{fontSize:11,color:TXT2}}>Saved to your Food Master & this list</div>
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${BORDER}`,
            background:"transparent",cursor:"pointer",fontSize:16,color:TXT2,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>

        {inp("Food Name *","name","text","e.g. Moong Dal Chilla")}
        {inp("Calories (kcal) *","calories","number","e.g. 180")}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
          {[["Protein (g)","protein"],["Carbs (g)","carbs"],["Fat (g)","fat"]].map(([label,key])=>(
            <div key={key}>
              <div style={{fontSize:11,fontWeight:600,color:TXT2,marginBottom:4}}>{label}</div>
              <input type="number" placeholder="0" value={form[key]}
                onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                style={{width:"100%",padding:"7px 10px",borderRadius:8,border:`1px solid ${BORDER}`,
                  fontSize:13,color:TXT,outline:"none",fontFamily:"inherit"}}/>
            </div>
          ))}
        </div>

        {inp("Category","category","text","e.g. Breakfast, Snack, Dal…")}

        {err && <div style={{fontSize:12,color:R,marginBottom:10,padding:"6px 10px",background:"#fff5f5",borderRadius:6}}>{err}</div>}

        <button onClick={handleSave} disabled={saving}
          style={{width:"100%",padding:"13px",borderRadius:10,background:P,color:"#fff",
            border:"none",fontSize:14,fontWeight:700,cursor:saving?"not-allowed":"pointer",opacity:saving?0.7:1}}>
          {saving ? "Saving…" : "✓ Add Food to My List"}
        </button>
      </div>
    </div>
  );
}

// ─── APK DOWNLOAD BANNER (mobile only) ───────────────────────────────────────
function AppDownloadBanner(){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    // Show only on mobile browsers, not in the web2native app itself
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    setVisible(isMobile && !isStandalone);
  },[]);
  if(!visible) return null;
  return(
    <div style={{background:`linear-gradient(90deg,${P},#9b6e8e)`,borderRadius:12,padding:"11px 14px",
      marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
      <div style={{fontSize:26,flexShrink:0}}>📱</div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>Get the MyHealth App</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.8)"}}>Install directly — no Play Store needed</div>
      </div>
      <a href="/MyHealthTracker.apk" download="MyHealthTracker.apk"
        style={{flexShrink:0,background:"#fff",color:P,fontSize:12,fontWeight:700,
          padding:"8px 14px",borderRadius:8,textDecoration:"none",whiteSpace:"nowrap"}}>
        Download
      </a>
      <button onClick={()=>setVisible(false)}
        style={{flexShrink:0,background:"transparent",border:"none",color:"rgba(255,255,255,0.7)",
          fontSize:18,cursor:"pointer",padding:"0 2px"}}>×</button>
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
  const [search,setSearch]=useState("");
  const [catFilter,setCatFilter]=useState("All");
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [showAddFood,setShowAddFood]=useState(false);   // ← Add Food modal
  const [addFoodMeal,setAddFoodMeal]=useState(null);    // ← which meal triggered it

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
        const{data:tf}=await sb.from("template_food_items").select("*").eq("template_id",p.active_template_id);
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

  // ─── Called when AddFoodModal saves successfully ───────────────────────────
  function handleFoodAdded(newFood){
    setFoods(prev=>[...prev,newFood]);          // add to local food list immediately
    toggleFood(addFoodMeal, newFood.id);        // auto-tick it in the meal that triggered +
    setShowAddFood(false);
    setAddFoodMeal(null);
    showToast("Food added ✓");
  }

  const MEAL_DEFS=[
    {id:"morning",label:"Morning",time:"7:00 AM",icon:"☀️",bg:AL},
    {id:"breakfast",label:"Breakfast",time:"8:00 AM",icon:"🍳",bg:PL},
    {id:"midmorning",label:"Mid-morning",time:"11:00 AM",icon:"☕",bg:"#e0f5f5"},
    {id:"lunch",label:"Lunch",time:"1:00 PM",icon:"🍽️",bg:GL},
    {id:"evening",label:"Evening snack",time:"4:30 PM",icon:"🌆",bg:"#FAECE7"},
    {id:"dinner",label:"Dinner",time:"7:30 PM",icon:"🌙",bg:"#eeedfe"},
  ];

  const allIds=Object.values(log.foods).flatMap(m=>Object.keys(m));
  const mac=allIds.reduce((a,id)=>{
    const f=foods.find(x=>String(x.id)===String(id)||x.name===id);
    return f?{cal:a.cal+(f.calories||0),pro:a.pro+(f.protein||0),carb:a.carb+(f.carbs||0),fat:a.fat+(f.fat||0)}:a;
  },{cal:0,pro:0,carb:0,fat:0});

  // ─── FIX 1: BMR calculated from real profile fields ──────────────────────
  const BMR = calcBMR(profile);
  const burnAct = WALKS.reduce((s,w)=>s+(log.activity[w.k]||0)*(w.k==="morning_walk"?5:4),0);
  const totalBurn = Math.round(BMR * activityMultiplier(profile?.activity_level)) + burnAct;
  // Ring % for burned: show progress vs calorie intake target (meaningful comparison)
  const burnRingPct = profile?.calorie_target ? Math.round((totalBurn/profile.calorie_target)*100) : Math.round((totalBurn/2000)*100);

  const waterL    = (log.water||0)*0.5;
  const waterTarget = profile?.water_target||3.5;
  const calTarget   = profile?.calorie_target||1600;
  const proTarget   = profile?.protein_target||100;
  const cats = ["All",...new Set(foods.map(f=>f.category).filter(Boolean))];
  const filtered = foods.filter(f=>(!search||f.name.toLowerCase().includes(search.toLowerCase()))&&(catFilter==="All"||f.category===catFilter));
  const habDone  = Object.values(log.habits).filter(Boolean).length;
  const mealsDone= Object.values(log.foods).filter(m=>Object.keys(m).length>0).length;

  if(!profile)return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="ht-spinner"/>
      <style>{`.ht-spinner{width:36px;height:36px;border:3px solid #e5e3ee;border-top-color:#714B67;border-radius:50%;animation:s .7s linear infinite}@keyframes s{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <>
      <Head><title>Dashboard — Health Tracker</title></Head>
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
        .mhdr{display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer}
        .mhdr:hover{background:#faf9fd}
        .mbody{border-top:1px solid ${BORDER};padding:11px 13px}
        .sinp{width:100%;padding:8px 12px;border-radius:8px;border:1px solid ${BORDER};font-size:12px;color:${TXT};outline:none;margin-bottom:8px;font-family:inherit}
        .sinp:focus{border-color:${P}}
        .catbtns{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
        .catbtn{padding:3px 10px;border-radius:20px;border:1px solid ${BORDER};font-size:10px;font-weight:600;color:${TXT2};background:transparent;cursor:pointer}
        .catbtn.on{border-color:${P};background:${PL};color:${P}}
        .flist{max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:4px}
        .frow{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;border:1px solid ${BORDER};cursor:pointer;transition:all .15s}
        .frow:hover,.frow.sel{border-color:${G};background:${GL}}
        .fchk{width:17px;height:17px;border-radius:4px;border:1.5px solid ${BORDER};display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .fchk.on{background:${G};border-color:${G}}
        .add-food-btn{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:8px;border:1.5px dashed ${P};background:${PL};color:${P};font-size:12px;font-weight:700;cursor:pointer;width:100%;margin-top:8px;justify-content:center;transition:all .15s}
        .add-food-btn:hover{background:${P};color:#fff}
        @media(max-width:480px){.kgrid{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      {toast&&<div className="ht-toast">{toast}</div>}

      {/* ADD FOOD MODAL */}
      {showAddFood && (
        <AddFoodModal
          profile={profile}
          onSave={handleFoodAdded}
          onClose={()=>{ setShowAddFood(false); setAddFoodMeal(null); }}
        />
      )}

      <Layout title={`Dashboard${saving?" · saving…":""}`} profile={profile}>

        {/* APK DOWNLOAD BANNER — mobile only */}
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
            {/* FIX: burned ring % now uses burnRingPct (vs calorie target), not hardcoded 2400 */}
            <Ring pct={burnRingPct} color={G} label={`${totalBurn}`} sub="burned"/>
            <Ring pct={Math.round((mac.pro/proTarget)*100)} color={T} label={`${mac.pro}g`} sub="protein"/>
            <Ring pct={Math.round((waterL/waterTarget)*100)} color="#38bdf8" label={`${waterL}L`} sub="water"/>
          </div>
          <div style={{textAlign:"center",fontSize:12,color:TXT2}}>
            Net: <span style={{fontWeight:700,color:totalBurn-mac.cal>0?G:R}}>{totalBurn-mac.cal>0?"+":""}{Math.round(totalBurn-mac.cal)} kcal</span>
            <span style={{color:TXT3,marginLeft:8,fontSize:11}}>{mealsDone}/6 meals · {habDone}/5 habits</span>
          </div>
          {/* FIX: show BMR breakdown so user understands the number */}
          <div style={{textAlign:"center",fontSize:10,color:TXT3,marginTop:4}}>
            Base metabolism {BMR} + activity {burnAct} kcal
          </div>
        </div>

        {/* KPI */}
        <div className="kgrid">
          {[
            {l:"Calories in",v:mac.cal,c:"#7F77DD"},
            {l:"Burned",v:Math.round(totalBurn),c:G},
            {l:"Protein",v:`${mac.pro}g`,c:T},
            {l:"Net cal",v:`${totalBurn-mac.cal>0?"+":""}${Math.round(totalBurn-mac.cal)}`,c:totalBurn-mac.cal>0?G:R}
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

        {/* MEALS */}
        <div className="ctitle" style={{padding:"0 2px",marginBottom:8}}>Meals — tap to log food</div>
        {MEAL_DEFS.map(meal=>{
          const sel=log.foods[meal.id]||{};
          const selKeys=Object.keys(sel);
          const mCal=selKeys.reduce((s,id)=>{const f=foods.find(x=>String(x.id)===String(id)||x.name===id);return f?s+(f.calories||0):s;},0);
          const mPro=selKeys.reduce((s,id)=>{const f=foods.find(x=>String(x.id)===String(id)||x.name===id);return f?s+(f.protein||0):s;},0);
          const isOpen=openMeal===meal.id;
          return(
            <div key={meal.id} className={`mcard${selKeys.length>0?" done":""}`}>
              <div className="mhdr" style={{background:selKeys.length>0?GL:CARD}} onClick={()=>{setOpenMeal(isOpen?null:meal.id);setSearch("");setCatFilter("All");}}>
                <div style={{width:34,height:34,borderRadius:8,background:meal.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{meal.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{meal.label}</div>
                  <div style={{fontSize:11,color:TXT2}}>{meal.time}</div>
                </div>
                {selKeys.length>0&&<div style={{textAlign:"right",marginRight:6}}><div style={{fontSize:13,fontWeight:700,color:G}}>{mCal} kcal</div><div style={{fontSize:10,color:TXT2}}>{mPro}g P</div></div>}
                {!selKeys.length&&<span style={{fontSize:11,color:TXT3,marginRight:6}}>tap to log</span>}
                <span style={{fontSize:12,color:TXT3,display:"inline-block",transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
              </div>

              {selKeys.length>0&&!isOpen&&(
                <div style={{padding:"5px 13px 9px",display:"flex",flexWrap:"wrap",gap:4}}>
                  {selKeys.map(id=>{
                    const f=foods.find(x=>String(x.id)===String(id)||x.name===id);
                    return(
                      <span key={id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,padding:"3px 6px 3px 10px",borderRadius:20,background:GL,color:G,border:"1px solid #5DCAA5"}}>
                        {f?.name||id}
                        <button onClick={e=>{e.stopPropagation();toggleFood(meal.id,id);}} style={{width:16,height:16,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.15)",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0,lineHeight:1}}>×</button>
                      </span>
                    );
                  })}
                </div>
              )}

              {isOpen&&(
                <div className="mbody">
                  <input className="sinp" placeholder="Search food…" value={search} onChange={e=>setSearch(e.target.value)}/>
                  <div className="catbtns">{cats.map(c=><button key={c} className={`catbtn${catFilter===c?" on":""}`} onClick={()=>setCatFilter(c)}>{c}</button>)}</div>

                  {foods.length===0&&(
                    <div style={{textAlign:"center",color:TXT2,fontSize:12,padding:"12px 0 4px"}}>
                      No food items assigned yet — ask admin to assign a plan.
                    </div>
                  )}

                  <div className="flist">
                    {filtered.map(f=>{
                      const chk=!!sel[String(f.id)||f.name];
                      return(
                        <div key={f.id||f.name} className={`frow${chk?" sel":""}`} onClick={()=>toggleFood(meal.id,String(f.id)||f.name)}>
                          <div className={`fchk${chk?" on":""}`}>{chk&&<span style={{color:"#fff",fontSize:9,fontWeight:900}}>✓</span>}</div>
                          <span style={{flex:1,fontSize:12,color:chk?G:TXT}}>
                            {f.name}
                            {f.added_by_user&&<span style={{fontSize:9,color:TXT3,marginLeft:4}}>· custom</span>}
                          </span>
                          <span style={{fontSize:11,fontWeight:700,color:"#7F77DD"}}>{f.calories||0}</span>
                          <span style={{fontSize:10,color:TXT3}}> kcal</span>
                          <span style={{fontSize:11,color:G,marginLeft:5}}>{f.protein||0}g P</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* ─── ADD FOOD BUTTON ─────────────────────────────────── */}
                  <button className="add-food-btn" onClick={()=>{ setAddFoodMeal(meal.id); setShowAddFood(true); }}>
                    <span style={{fontSize:16,lineHeight:1}}>+</span>
                    Food not in list? Add it
                  </button>
                </div>
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
            {[0.5,1,1.5,2,2.5,3,3.5,4,4.5,5].map((v)=>{
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
