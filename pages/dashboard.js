// pages/dashboard.js  — HOME screen
// Purpose: Daily summary — KPIs, macro progress, meal summary (read-only), 
//          water, activity, habits, weight. NO food selection UI here.
// Meals page handles all food logging.

import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";
import Layout from "../components/Layout";

const G="#1D9E75",GL="#e1f5ee",P="#714B67",PL="#f3eef1";
const A="#EF9F27",AL="#faeeda",R="#E24B4A",T="#2B6CB0";
const BORDER="#E0E3ED",TXT="#0D1B3E",TXT2="#718096",TXT3="#CBD5E0",BG="#F5F6FA",CARD="#fff";

const HABITS=[
  "4 almonds + 2 walnuts",
  "No sugar / jaggery / honey",
  "No fried food today",
  "Dinner before 8 PM",
  "Sleep by 10:30 PM",
];
const WALKS=[
  {k:"morning_walk",    l:"Morning walk",     icon:"🌅", target:40, max:60},
  {k:"post_lunch_walk", l:"Post-lunch walk",  icon:"🚶", target:15, max:30},
  {k:"post_dinner_walk",l:"Post-dinner walk", icon:"🌙", target:20, max:30},
];
const MEAL_DEFS=[
  {id:"morning",    label:"Morning",       time:"7:00 AM",  icon:"☀️"},
  {id:"breakfast",  label:"Breakfast",     time:"8:00 AM",  icon:"🍳"},
  {id:"midmorning", label:"Mid-morning",   time:"11:00 AM", icon:"☕"},
  {id:"lunch",      label:"Lunch",         time:"1:00 PM",  icon:"🍽️"},
  {id:"evening",    label:"Evening snack", time:"4:30 PM",  icon:"🌆"},
  {id:"dinner",     label:"Dinner",        time:"7:30 PM",  icon:"🌙"},
];

function fmt(d){return d.toISOString().split("T")[0];}
function today(){return fmt(new Date());}
function dayLabel(dk){
  const t=today(),y=fmt(new Date(Date.now()-86400000));
  if(dk===t)return"Today";if(dk===y)return"Yesterday";
  return new Date(dk).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}
function calcBMR(p){
  if(!p)return 1800;
  const w=parseFloat(p.weight_current)||parseFloat(p.weight_start)||70;
  const h=parseFloat(p.height_cm)||165;
  const age=p.dob?Math.floor((Date.now()-new Date(p.dob))/(365.25*864e5)):parseInt(p.age)||30;
  const base=Math.round(10*w+6.25*h-5*age);
  return p.gender==="Female"?base-161:base+5;
}

// ── Ring chart ─────────────────────────────────────────────────────────────
function Ring({pct=0,size=76,color,label,sub}){
  const r=(size-8)/2,c=2*Math.PI*r,d=Math.min(pct/100,1)*c;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={BORDER} strokeWidth={7}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
            strokeDasharray={`${d} ${c}`} strokeLinecap="round"
            style={{transition:"stroke-dasharray .6s ease"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:12,fontWeight:700,color:TXT,lineHeight:1}}>{label}</span>
          {sub&&<span style={{fontSize:9,color:TXT2,marginTop:1}}>{sub}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Macro progress bar ─────────────────────────────────────────────────────
function MacroBar({label,val,max,color,unit}){
  const pct=Math.min(100,Math.round((val/max)*100));
  return(
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
        <span style={{color:TXT2,fontWeight:500}}>{label}</span>
        <span style={{fontWeight:700,color:pct>100?R:TXT}}>{val}{unit}
          <span style={{color:TXT3,fontWeight:400}}> / {max}</span>
        </span>
      </div>
      <div style={{height:6,background:BORDER,borderRadius:3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:pct>100?R:color,
          borderRadius:3,transition:"width .5s ease"}}/>
      </div>
    </div>
  );
}

// ── KPI card ───────────────────────────────────────────────────────────────
function KPI({label,value,sub,color,icon}){
  return(
    <div style={{background:CARD,borderRadius:12,border:`1px solid ${BORDER}`,
      padding:"12px 10px",textAlign:"center"}}>
      {icon&&<div style={{fontSize:"1.2rem",marginBottom:4}}>{icon}</div>}
      <div style={{fontSize:"1.3rem",fontWeight:800,color:color||TXT,lineHeight:1}}>{value}</div>
      <div style={{fontSize:10,color:TXT2,marginTop:3,fontWeight:500}}>{label}</div>
      {sub&&<div style={{fontSize:9,color:TXT3,marginTop:1}}>{sub}</div>}
    </div>
  );
}

export default function Dashboard(){
  const router=useRouter();
  const [profile,setProfile]=useState(null);
  const [foods,setFoods]=useState([]);
  const [dateKey,setDateKey]=useState(today());
  const [log,setLog]=useState({foods:{},activity:{},water:0,habits:{},weight:null});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);

  useEffect(()=>{
    async function init(){
      const sb=getSupabase();
      const{data:{session}}=await sb.auth.getSession();
      if(!session){router.push("/");return;}
      const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
      if(!p){router.push("/");return;}
      if(!p.setup_complete){router.push("/setup");return;}
      setProfile(p);
      // Load food names for meal summary display
      if(p.active_template_id){
        const[{data:linked},{data:custom}]=await Promise.all([
          sb.from("food_template_links").select("template_food_items(id,name,calories,protein)")
            .eq("template_id",p.active_template_id),
          sb.from("template_food_items").select("id,name,calories,protein")
            .eq("added_by_user",true).eq("added_by_user_id",p.id),
        ]);
        const jf=(linked||[]).map(l=>l.template_food_items).filter(Boolean);
        const all=[...jf,...(custom||[])];
        setFoods(Array.from(new Map(all.map(f=>[f.id,f])).values()));
      }
    }
    init();
  },[]);

  const loadLog=useCallback(async(dk)=>{
    if(!profile)return;
    const{data}=await getSupabase().from("health_logs").select("*")
      .eq("user_id",profile.id).eq("log_date",dk).single();
    if(data) setLog({foods:data.foods||{},activity:data.activity||{},water:data.water||0,habits:data.habits||{},weight:data.weight||null});
    else setLog({foods:{},activity:{},water:0,habits:{},weight:null});
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

  // ── Computed values ──────────────────────────────────────────────────────
  const allFoodIds=Object.values(log.foods).flatMap(m=>Object.keys(m));
  const mac=allFoodIds.reduce((a,id)=>{
    const f=foods.find(x=>String(x.id)===String(id)||x.name===id);
    return f?{cal:a.cal+(f.calories||0),pro:a.pro+(f.protein||0)}:a;
  },{cal:0,pro:0});

  const BMR=calcBMR(profile);
  const walkBurn=WALKS.reduce((s,w)=>{
    const mins=log.activity[w.k]||0;
    return s+mins*(w.k==="morning_walk"?5:4);
  },0);
  const totalBurn=BMR+walkBurn;
  const calTarget=profile?.calorie_target||1600;
  const proTarget=profile?.protein_target||100;
  const carbTarget=profile?.carb_target||130;
  const fatTarget=profile?.fat_target||55;
  const waterL=((log.water||0)*0.5).toFixed(1);
  const waterTarget=profile?.water_target||3.5;
  const habDone=Object.values(log.habits).filter(Boolean).length;
  const mealsDone=Object.values(log.foods).filter(m=>Object.keys(m).length>0).length;
  const netCal=totalBurn-mac.cal;
  const walkMinTotal=WALKS.reduce((s,w)=>s+(log.activity[w.k]||0),0);

  if(!profile) return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,border:`3px solid ${G}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <>
      <Head><title>Home — VitaLog</title></Head>
      <style>{`
        body{font-family:'Poppins',Arial,sans-serif;}
        .card{background:${CARD};border-radius:14px;border:1px solid ${BORDER};padding:16px;margin-bottom:12px}
        .sec-title{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px}
        .date-nav{display:flex;align-items:center;gap:8px;background:${CARD};border-radius:14px;border:1px solid ${BORDER};padding:10px 14px;margin-bottom:12px}
        .dnbtn{width:32px;height:32px;border-radius:50%;border:1px solid ${BORDER};background:transparent;cursor:pointer;font-size:16px;color:${TXT2};display:flex;align-items:center;justify-content:center}
        .dnbtn:disabled{opacity:.3;cursor:default}
        .habit-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid ${BORDER};cursor:pointer}
        .habit-row:last-child{border-bottom:none}
        .habit-chk{width:20px;height:20px;border-radius:50%;border:2px solid ${BORDER};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
        .habit-chk.on{background:${G};border-color:${G}}
        .walk-btns{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
        .wbtn{padding:4px 9px;border-radius:6px;border:1.5px solid ${BORDER};font-size:11px;font-weight:600;color:${TXT2};background:transparent;cursor:pointer;font-family:'Poppins',Arial,sans-serif}
        .wbtn.on{border-color:${G};background:${GL};color:${G}}
        .meal-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid ${BORDER};cursor:pointer;text-decoration:none}
        .meal-row:last-child{border-bottom:none}
        @media(max-width:480px){.kpi-grid{grid-template-columns:repeat(2,1fr)!important}}
      `}</style>

      {toast&&(
        <div style={{position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",background:TXT,color:"#fff",borderRadius:20,padding:"8px 18px",fontSize:12,fontWeight:600,zIndex:999,whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}

      <Layout>
        <div style={{padding:"16px",maxWidth:600,margin:"0 auto"}}>

          {/* Date navigation */}
          <div className="date-nav">
            <button className="dnbtn" onClick={()=>{const d=new Date(dateKey);d.setDate(d.getDate()-1);setDateKey(fmt(d));}}>‹</button>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:700,color:TXT}}>{dayLabel(dateKey)}</div>
              <div style={{fontSize:11,color:TXT2}}>{new Date(dateKey+"T12:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
            </div>
            <button className="dnbtn" onClick={()=>{const d=new Date(dateKey);d.setDate(d.getDate()+1);if(fmt(d)<=today())setDateKey(fmt(d));}} disabled={dateKey>=today()}>›</button>
          </div>

          {/* ── KPI Grid ──────────────────────────────────────────────── */}
          <div className="kpi-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
            <KPI icon="🔥" label="Calories in" value={mac.cal} color={G}/>
            <KPI icon="⚡" label="Burned" value={mac.cal>0?totalBurn:"—"} color={mac.cal>0?A:TXT2}/>
            <KPI icon="💪" label="Protein" value={`${mac.pro}g`} color={T}/>
            <KPI icon={netCal>0?"📈":"📉"} label="Net" value={mac.cal>0?`${netCal>0?"+":""}${Math.round(netCal)}`:"—"} color={mac.cal>0?(netCal>0?G:R):TXT2}/>
          </div>

          {/* ── Macro rings ────────────────────────────────────────────── */}
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-around",marginBottom:12}}>
              <Ring pct={Math.round((mac.cal/calTarget)*100)} color={G} label={`${mac.cal}`} sub="kcal"/>
              <Ring pct={mac.cal>0?Math.round((totalBurn/calTarget)*100):0} color={A} label={mac.cal>0?`${totalBurn}`:"—"} sub="burned"/>
              <Ring pct={Math.round((mac.pro/proTarget)*100)} color={T} label={`${mac.pro}g`} sub="protein"/>
              <Ring pct={Math.round((parseFloat(waterL)/waterTarget)*100)} color="#38bdf8" label={`${waterL}L`} sub="water"/>
            </div>
            {mac.cal===0?(
              <div style={{textAlign:"center",fontSize:11,color:TXT2,padding:"2px 0 4px"}}>
                No meals logged yet · Body burns <b>{BMR}</b> kcal at rest today
              </div>
            ):(
              <div style={{textAlign:"center",fontSize:12,color:TXT2}}>
                <b style={{color:netCal>0?G:R}}>{netCal>0?"+":""}{Math.round(netCal)} kcal</b> net · {mealsDone}/6 meals · {habDone}/5 habits
              </div>
            )}
          </div>

          {/* ── Macro bars ─────────────────────────────────────────────── */}
          <div className="card">
            <div className="sec-title">Today's macros</div>
            <MacroBar label="Calories" val={mac.cal} max={calTarget} color={G} unit=" kcal"/>
            <MacroBar label="Protein"  val={mac.pro} max={proTarget} color={T} unit="g"/>
          </div>

          {/* ── Meal summary (read-only, tap → go to Meals page) ─────── */}
          <div className="card">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div className="sec-title" style={{margin:0}}>🍽️ Today's meals</div>
              <button onClick={()=>router.push("/meals")}
                style={{fontSize:11,fontWeight:700,color:G,background:"none",border:`1.5px solid ${G}`,borderRadius:20,padding:"4px 12px",cursor:"pointer",fontFamily:"'Poppins',Arial,sans-serif"}}>
                + Log food
              </button>
            </div>
            {MEAL_DEFS.map(meal=>{
              const sel=log.foods[meal.id]||{};
              const selKeys=Object.keys(sel);
              const mCal=selKeys.reduce((s,id)=>{const f=foods.find(x=>String(x.id)===id||x.name===id);return f?s+(f.calories||0):s;},0);
              return(
                <div key={meal.id} className="meal-row" onClick={()=>router.push("/meals")}>
                  <span style={{fontSize:"1.1rem",width:28,textAlign:"center"}}>{meal.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:TXT}}>{meal.label}</div>
                    <div style={{fontSize:11,color:TXT2}}>{meal.time}</div>
                  </div>
                  {selKeys.length>0?(
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:12,fontWeight:700,color:G}}>{mCal} kcal</div>
                      <div style={{fontSize:10,color:TXT2}}>{selKeys.length} item{selKeys.length>1?"s":""}</div>
                    </div>
                  ):(
                    <span style={{fontSize:10,color:TXT3}}>not logged</span>
                  )}
                  <span style={{color:TXT3,marginLeft:6,fontSize:14}}>›</span>
                </div>
              );
            })}
          </div>

          {/* ── Water ──────────────────────────────────────────────────── */}
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div className="sec-title" style={{margin:0}}>💧 Water</div>
              <span style={{fontSize:13,fontWeight:700,color:parseFloat(waterL)>=waterTarget?G:"#38bdf8"}}>
                {waterL}L / {waterTarget}L {parseFloat(waterL)>=waterTarget?"✓":""}
              </span>
            </div>
            {/* Water drop visual */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              {Array.from({length:Math.round(waterTarget/0.5)}).map((_,i)=>{
                const filled=(log.water||0)>i;
                return(
                  <div key={i} onClick={()=>persist({water:i+1})}
                    style={{fontSize:"1.4rem",cursor:"pointer",opacity:filled?1:0.25,transition:"opacity .2s"}}>
                    💧
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {[1,2,3,4,5,6,7,8,9,10].map(v=>(
                <button key={v} className={`wbtn${(log.water||0)===v?" on":""}`}
                  onClick={()=>persist({water:v})}>
                  {(v*0.5).toFixed(1)}L
                </button>
              ))}
            </div>
          </div>

          {/* ── Activity ───────────────────────────────────────────────── */}
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div className="sec-title" style={{margin:0}}>🏃 Activity</div>
              <span style={{fontSize:12,fontWeight:600,color:G}}>{walkMinTotal} min · +{walkBurn} kcal</span>
            </div>
            {WALKS.map(w=>(
              <div key={w.k} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                  <span style={{color:TXT,fontWeight:500}}>{w.icon} {w.l}</span>
                  <span style={{fontWeight:700,color:(log.activity[w.k]||0)>=w.target?G:TXT2}}>
                    {log.activity[w.k]||0}min {(log.activity[w.k]||0)>=w.target?"✓":`/ ${w.target}`}
                  </span>
                </div>
                <div className="walk-btns">
                  {[0,5,10,15,20,25,30,35,40,45,60].filter(v=>v<=w.max).map(v=>(
                    <button key={v} className={`wbtn${(log.activity[w.k]||0)===v?" on":""}`}
                      onClick={()=>persist({activity:{...log.activity,[w.k]:v}})}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Habits ─────────────────────────────────────────────────── */}
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div className="sec-title" style={{margin:0}}>✅ Daily habits</div>
              <span style={{fontSize:12,fontWeight:700,color:habDone===HABITS.length?G:TXT2}}>
                {habDone}/{HABITS.length}
              </span>
            </div>
            {HABITS.map(h=>(
              <div key={h} className="habit-row"
                onClick={()=>persist({habits:{...log.habits,[h]:!log.habits[h]}})}>
                <div className={`habit-chk${log.habits[h]?" on":""}`}>
                  {log.habits[h]&&<span style={{color:"#fff",fontSize:10,fontWeight:900}}>✓</span>}
                </div>
                <span style={{fontSize:13,color:log.habits[h]?G:TXT,
                  textDecoration:log.habits[h]?"line-through":"none",transition:"all .2s"}}>
                  {h}
                </span>
              </div>
            ))}
          </div>

          {/* ── Weight ─────────────────────────────────────────────────── */}
          <div className="card">
            <div className="sec-title">⚖️ Weight — {dayLabel(dateKey)}</div>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
              <input type="number" step="0.1" value={log.weight||""} placeholder="Enter kg"
                onChange={e=>persist({weight:e.target.value?+e.target.value:null})}
                style={{width:110,padding:"9px 12px",borderRadius:9,border:`1.5px solid ${BORDER}`,
                  fontSize:16,fontWeight:700,color:G,outline:"none",fontFamily:"'Poppins',Arial,sans-serif"}}/>
              <span style={{fontSize:13,color:TXT2}}>kg</span>
              {log.weight&&profile?.weight_start&&(
                <span style={{fontSize:12,color:G,fontWeight:600}}>
                  Lost: {(profile.weight_start-log.weight).toFixed(1)}kg
                </span>
              )}
            </div>
            {log.weight&&profile?.weight_start&&profile?.weight_target&&(
              <>
                <div style={{height:7,background:BORDER,borderRadius:4,overflow:"hidden",marginBottom:4}}>
                  <div style={{height:"100%",background:G,borderRadius:4,
                    width:`${Math.min(100,Math.max(0,Math.round(
                      ((profile.weight_start-log.weight)/(profile.weight_start-profile.weight_target))*100
                    )))}%`,transition:"width .5s"}}/>
                </div>
                <div style={{fontSize:10,color:TXT2}}>
                  {Math.round(((profile.weight_start-log.weight)/(profile.weight_start-profile.weight_target))*100)}% toward goal · Target: {profile.weight_target}kg
                </div>
              </>
            )}
          </div>

        </div>
      </Layout>
    </>
  );
}
