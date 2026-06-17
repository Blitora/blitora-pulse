import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";

const P="#714B67",PL="#f3eef1",PS="#5a3a53",G="#1D9E75",GL="#e1f5ee",T="#00a09d",A="#EF9F27",AL="#faeeda",R="#E24B4A";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7",CARD="#fff";

const HABITS=["4 almonds + 2 walnuts","No sugar / jaggery / honey","No fried food today","Dinner before 8 PM","Sleep by 10:30 PM"];
const WALKS=[{k:"morning_walk",l:"Morning walk",t:40,max:60},{k:"post_lunch_walk",l:"Post-lunch walk",t:15,max:30},{k:"post_dinner_walk",l:"Post-dinner walk",t:20,max:30}];

function fmt(d){return d.toISOString().split("T")[0];}
function today(){return fmt(new Date());}
function label(dk){
  const t=today(),y=fmt(new Date(Date.now()-86400000));
  if(dk===t)return"Today";if(dk===y)return"Yesterday";
  return new Date(dk).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}

function Ring({pct=0,size=72,color,label,sub}){
  const r=(size-8)/2,c=2*Math.PI*r,d=Math.min(pct/100,1)*c;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={BORDER} strokeWidth={8}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={`${d} ${c}`} strokeLinecap="round" style={{transition:"stroke-dasharray .5s"}}/>
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
  const [loading,setLoading]=useState(true);

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
    setLoading(true);
    const sb=getSupabase();
    const{data}=await sb.from("health_logs").select("*").eq("user_id",profile.id).eq("log_date",dk).single();
    if(data){setLog({foods:data.foods||{},activity:data.activity||{},water:data.water||0,habits:data.habits||{},weight:data.weight||null});}
    else{setLog({foods:{},activity:{},water:0,habits:{},weight:null});}
    setLoading(false);
  },[profile]);

  useEffect(()=>{if(profile)loadLog(dateKey);},[profile,dateKey]);

  async function persist(patch){
    const next={...log,...patch};
    setLog(next);setSaving(true);
    const sb=getSupabase();
    await sb.from("health_logs").upsert({user_id:profile.id,log_date:dateKey,...next},{onConflict:"user_id,log_date"});
    setSaving(false);
    showToast("Saved ✓");
  }

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),1800);}

  function toggleFood(mealId,foodId){
    const mf={...(log.foods[mealId]||{})};
    mf[foodId]?delete mf[foodId]:(mf[foodId]=true);
    persist({foods:{...log.foods,[mealId]:mf}});
  }

  function prevDay(){const d=new Date(dateKey);d.setDate(d.getDate()-1);setDateKey(fmt(d));}
  function nextDay(){const d=new Date(dateKey);d.setDate(d.getDate()+1);if(fmt(d)<=today())setDateKey(fmt(d));}

  const allIds=Object.values(log.foods).flatMap(m=>Object.keys(m));
  const mac=allIds.reduce((a,id)=>{
    const f=foods.find(x=>x.id===id||x.name===id);
    return f?{cal:a.cal+(f.calories||f.cal||0),pro:a.pro+(f.protein||f.pro||0),carb:a.carb+(f.carbs||f.carb||0),fat:a.fat+(f.fat||0)}:a;
  },{cal:0,pro:0,carb:0,fat:0});

  const burnAct=WALKS.reduce((s,w)=>s+(log.activity[w.k]||0)*(w.k==="morning_walk"?5:4),0);
  const BMR=profile?Math.round(10*(profile.weight_current||80)+6.25*(profile.height_cm||170)-5*30+(profile.gender==="Female"?-161:5)):1800;
  const totalBurn=BMR+burnAct;
  const waterL=(log.water||0)*0.5;
  const waterTarget=profile?.water_target||3.5;
  const calTarget=profile?.calorie_target||1600;
  const proTarget=profile?.protein_target||100;
  const carbTarget=profile?.carb_target||130;
  const fatTarget=profile?.fat_target||55;
  const habDone=Object.values(log.habits).filter(Boolean).length;
  const mealsDone=Object.values(log.foods).filter(m=>Object.keys(m).length>0).length;

  const MEAL_DEFS=[
    {id:"morning",label:"Morning",time:"7:00 AM",icon:"☀️",bg:AL},
    {id:"breakfast",label:"Breakfast",time:"8:00 AM",icon:"🍳",bg:PL},
    {id:"midmorning",label:"Mid-morning",time:"11:00 AM",icon:"☕",bg:"#e0f5f5"},
    {id:"lunch",label:"Lunch",time:"1:00 PM",icon:"🍽️",bg:GL},
    {id:"evening",label:"Evening snack",time:"4:30 PM",icon:"🌆",bg:"#FAECE7"},
    {id:"dinner",label:"Dinner",time:"7:30 PM",icon:"🌙",bg:"#eeedfe"},
  ];

  const cats=["All",...new Set(foods.map(f=>f.category).filter(Boolean))];
  const filtered=foods.filter(f=>(!search||f.name.toLowerCase().includes(search.toLowerCase()))&&(catFilter==="All"||f.category===catFilter));

  if(!profile)return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,border:`3px solid ${BORDER}`,borderTopColor:P,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <>
      <Head><title>Dashboard — Health Tracker</title></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${BG};font-family:'Inter',system-ui,sans-serif;color:${TXT}}
        .topbar{background:${CARD};border-bottom:1px solid ${BORDER};padding:0 16px;height:52px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:20}
        .main{max-width:720px;margin:0 auto;padding:16px 14px 90px}
        .card{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:14px;margin-bottom:12px}
        .card-title{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:11px}
        .date-nav{display:flex;align-items:center;gap:8px;background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:10px 14px;margin-bottom:12px}
        .date-btn{width:32px;height:32px;border-radius:50%;border:1px solid ${BORDER};background:transparent;cursor:pointer;font-size:16px;color:${TXT2};display:flex;align-items:center;justify-content:center;transition:all .15s}
        .date-btn:hover{border-color:${P};color:${P}}
        .date-btn:disabled{opacity:.3;cursor:default}
        .date-label{flex:1;text-align:center;font-size:14px;font-weight:600;color:${TXT}}
        .date-sub{font-size:11px;color:${TXT2};text-align:center}
        .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
        .kpi{background:${CARD};border-radius:11px;border:1px solid ${BORDER};padding:10px 8px;text-align:center}
        .kpi-val{font-size:16px;font-weight:700;line-height:1;margin-bottom:3px}
        .kpi-lbl{font-size:9px;color:${TXT2};text-transform:uppercase;letter-spacing:.03em}
        .water-btns{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
        .wbtn{height:34px;padding:0 10px;border-radius:8px;border:1.5px solid ${BORDER};font-size:11px;font-weight:600;color:${TXT3};background:transparent;cursor:pointer;transition:all .15s;min-width:38px}
        .wbtn.on{border-color:#38bdf8;background:rgba(56,189,248,.1);color:#0284c7}
        .walk-row{margin-bottom:11px}
        .walk-btns{display:flex;gap:3px;flex-wrap:wrap;margin-top:5px}
        .wkbtn{padding:3px 8px;border-radius:6px;border:1px solid ${BORDER};font-size:11px;font-weight:600;color:${TXT3};background:transparent;cursor:pointer;transition:all .15s}
        .wkbtn.on{border-color:${P};background:${PL};color:${P}}
        .hab-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid ${BORDER};cursor:pointer;transition:background .15s}
        .hab-row:last-child{border-bottom:none}
        .hab-chk{width:20px;height:20px;border-radius:50%;border:2px solid ${BORDER};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
        .hab-chk.on{background:${G};border-color:${G}}
        .meal-card{background:${CARD};border-radius:12px;border:1.5px solid ${BORDER};margin-bottom:8px;overflow:hidden;transition:border-color .2s}
        .meal-card.done{border-color:${G}}
        .meal-hdr{display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer;transition:background .15s}
        .meal-hdr:hover{background:#faf9fd}
        .meal-body{border-top:1px solid ${BORDER};padding:11px 13px}
        .search-inp{width:100%;padding:8px 12px;border-radius:8px;border:1px solid ${BORDER};font-size:12px;color:${TXT};outline:none;margin-bottom:8px;font-family:inherit;transition:border-color .2s}
        .search-inp:focus{border-color:${P}}
        .cat-btns{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}
        .cat-btn{padding:3px 10px;border-radius:20px;border:1px solid ${BORDER};font-size:10px;font-weight:600;color:${TXT2};background:transparent;cursor:pointer;transition:all .15s}
        .cat-btn.on{border-color:${P};background:${PL};color:${P}}
        .food-list{max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:4px}
        .food-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;border:1px solid ${BORDER};cursor:pointer;transition:all .15s}
        .food-row:hover{border-color:${G};background:${GL}}
        .food-row.sel{border-color:${G};background:${GL}}
        .fchk{width:17px;height:17px;border-radius:4px;border:1.5px solid ${BORDER};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
        .fchk.on{background:${G};border-color:${G}}
        .pill{font-size:10px;padding:2px 8px;border-radius:20px;background:${GL};color:${G};border:1px solid #5DCAA5;margin:2px;display:inline-flex}
        .bottomnav{position:fixed;bottom:0;left:0;right:0;background:${CARD};border-top:1px solid ${BORDER};display:flex;z-index:20;max-width:720px;margin:0 auto}
        .navbtn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border:none;background:none;cursor:pointer;font-size:9px;font-weight:500;font-family:inherit;transition:color .15s}
        .toast{position:fixed;bottom:72px;left:50%;transform:translateX(-50%);background:${P};color:#fff;padding:8px 20px;border-radius:24px;font-size:12px;font-weight:600;z-index:100;pointer-events:none;animation:fadein .2s ease}
        @keyframes fadein{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:480px){.kpi-grid{grid-template-columns:repeat(2,1fr)}.kpi-val{font-size:14px}}
        @media(min-width:768px){.bottomnav{display:none}.main{padding-left:24px;padding-right:24px}}
      `}</style>

      {toast&&<div className="toast">{toast}</div>}

      <div className="topbar">
        <div style={{width:32,height:32,background:P,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14}}>H</div>
        <span style={{fontSize:13,fontWeight:700,color:P}}>Health Tracker</span>
        <span style={{color:BORDER,fontSize:18}}>|</span>
        <span style={{fontSize:12,color:TXT2}}>Dashboard</span>
        {saving&&<span style={{fontSize:11,color:P,animation:"pulse 1s infinite",marginLeft:4}}>saving…</span>}
        <div style={{flex:1}}/>
        <button onClick={()=>router.push("/profile")} style={{width:32,height:32,borderRadius:"50%",background:PL,border:"none",cursor:"pointer",color:P,fontWeight:700,fontSize:13}}>{profile.full_name?.[0]||"A"}</button>
      </div>

      <div className="main">
        {/* DATE NAV */}
        <div className="date-nav">
          <button className="date-btn" onClick={prevDay}>‹</button>
          <div style={{flex:1,textAlign:"center"}}>
            <div className="date-label">{label(dateKey)}</div>
            <div className="date-sub">{new Date(dateKey).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
          </div>
          <input type="date" value={dateKey} max={today()} onChange={e=>e.target.value&&setDateKey(e.target.value)}
            style={{opacity:0,width:0,height:0,position:"absolute"}} id="dpicker"/>
          <button className="date-btn" onClick={()=>document.getElementById("dpicker").showPicker?.()||document.getElementById("dpicker").click()} title="Pick date">📅</button>
          <button className="date-btn" onClick={nextDay} disabled={dateKey>=today()}>›</button>
        </div>

        {/* KPI RINGS */}
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-around",marginBottom:12}}>
            <Ring pct={Math.round((mac.cal/calTarget)*100)} color="#7F77DD" label={`${mac.cal}`} sub="kcal in"/>
            <Ring pct={Math.round((totalBurn/2400)*100)} color={G} label={`${totalBurn}`} sub="burned"/>
            <Ring pct={Math.round((mac.pro/proTarget)*100)} color={T} label={`${mac.pro}g`} sub="protein"/>
            <Ring pct={Math.round((waterL/waterTarget)*100)} color="#38bdf8" label={`${waterL}L`} sub="water"/>
          </div>
          <div style={{textAlign:"center",fontSize:12,color:TXT2}}>
            Net: <span style={{fontWeight:700,color:totalBurn-mac.cal>0?G:R}}>{totalBurn-mac.cal>0?"+":""}{Math.round(totalBurn-mac.cal)} kcal</span>
            <span style={{color:TXT3,marginLeft:8,fontSize:11}}>{mealsDone}/6 meals · {habDone}/5 habits</span>
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="kpi-grid">
          {[{l:"Calories in",v:mac.cal,c:"#7F77DD"},{l:"Burned",v:Math.round(totalBurn),c:G},{l:"Protein",v:`${mac.pro}g`,c:T},{l:"Net",v:`${totalBurn-mac.cal>0?"+":""}${Math.round(totalBurn-mac.cal)}`,c:totalBurn-mac.cal>0?G:R}].map((k,i)=>(
            <div key={i} className="kpi">
              <div className="kpi-val" style={{color:k.c}}>{k.v}</div>
              <div className="kpi-lbl">{k.l}</div>
            </div>
          ))}
        </div>

        {/* MACROS */}
        <div className="card">
          <div className="card-title">Macros today</div>
          <MBar label="Calories" val={mac.cal} max={calTarget} color="#7F77DD" unit=" kcal"/>
          <MBar label="Protein" val={mac.pro} max={proTarget} color={G} unit="g"/>
          <MBar label="Carbs" val={mac.carb} max={carbTarget} color={A} unit="g"/>
          <MBar label="Fat" val={mac.fat} max={fatTarget} color="#D85A30" unit="g"/>
        </div>

        {/* MEALS */}
        <div className="card-title" style={{padding:"0 2px",marginBottom:8}}>Meals — tap to log food</div>
        {MEAL_DEFS.map(meal=>{
          const sel=log.foods[meal.id]||{};
          const selKeys=Object.keys(sel);
          const mCal=selKeys.reduce((s,id)=>{const f=foods.find(x=>x.id===id||x.name===id);return f?s+(f.calories||f.cal||0):s;},0);
          const mPro=selKeys.reduce((s,id)=>{const f=foods.find(x=>x.id===id||x.name===id);return f?s+(f.protein||f.pro||0):s;},0);
          const isOpen=openMeal===meal.id;
          return(
            <div key={meal.id} className={`meal-card${selKeys.length>0?" done":""}`}>
              <div className="meal-hdr" style={{background:selKeys.length>0?GL:CARD}} onClick={()=>{setOpenMeal(isOpen?null:meal.id);setSearch("");setCatFilter("All");}}>
                <div style={{width:34,height:34,borderRadius:8,background:meal.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{meal.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{meal.label}</div>
                  <div style={{fontSize:11,color:TXT2}}>{meal.time}</div>
                </div>
                {selKeys.length>0&&<div style={{textAlign:"right",marginRight:6}}><div style={{fontSize:13,fontWeight:700,color:G}}>{mCal} kcal</div><div style={{fontSize:10,color:TXT2}}>{mPro}g P</div></div>}
                {!selKeys.length&&<span style={{fontSize:11,color:TXT3,marginRight:6}}>tap to log</span>}
                <span style={{fontSize:12,color:TXT3,transition:"transform .2s",display:"inline-block",transform:isOpen?"rotate(180deg)":"none"}}>▾</span>
              </div>
              {selKeys.length>0&&!isOpen&&<div style={{padding:"5px 13px 9px",display:"flex",flexWrap:"wrap"}}>{selKeys.map(id=>{const f=foods.find(x=>x.id===id||x.name===id);return<span key={id} className="pill">{f?.name||id}</span>;})}</div>}
              {isOpen&&(
                <div className="meal-body">
                  <input className="search-inp" placeholder="Search food…" value={search} onChange={e=>setSearch(e.target.value)}/>
                  <div className="cat-btns">
                    {cats.map(c=><button key={c} className={`cat-btn${catFilter===c?" on":""}`} onClick={()=>setCatFilter(c)}>{c}</button>)}
                  </div>
                  {foods.length===0&&<div style={{textAlign:"center",color:TXT2,fontSize:13,padding:"20px 0"}}>No food items assigned yet. Ask your admin/dietitian to assign a food plan.</div>}
                  <div className="food-list">
                    {filtered.map(f=>{
                      const chk=!!sel[f.id||f.name];
                      return(
                        <div key={f.id||f.name} className={`food-row${chk?" sel":""}`} onClick={()=>toggleFood(meal.id,f.id||f.name)}>
                          <div className={`fchk${chk?" on":""}`}>{chk&&<span style={{color:"#fff",fontSize:9,fontWeight:900}}>✓</span>}</div>
                          <span style={{flex:1,fontSize:12,color:chk?G:TXT}}>{f.name}</span>
                          <span style={{fontSize:11,fontWeight:700,color:"#7F77DD"}}>{f.calories||f.cal||0}</span>
                          <span style={{fontSize:10,color:TXT3}}> kcal</span>
                          <span style={{fontSize:11,color:G,marginLeft:5}}>{f.protein||f.pro||0}g P</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* WATER */}
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div className="card-title" style={{margin:0}}>💧 Water intake</div>
            <span style={{fontSize:12,fontWeight:600,color:waterL>=waterTarget?G:"#0284c7"}}>{waterL}L / {waterTarget}L {waterL>=waterTarget?"✓":""}</span>
          </div>
          <div className="water-btns">
            {[0.5,1,1.5,2,2.5,3,3.5,4,4.5,5].map((v,i)=>{
              const steps=Math.round(v/0.5);
              return<button key={v} className={`wbtn${(log.water||0)>=steps?" on":""}`} onClick={()=>persist({water:steps})}>{v}L</button>;
            })}
          </div>
        </div>

        {/* ACTIVITY */}
        <div className="card">
          <div className="card-title">🏃 Activity</div>
          {WALKS.map(w=>(
            <div key={w.k} className="walk-row">
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                <span style={{color:TXT2}}>{w.l}</span>
                <span style={{fontWeight:600,color:(log.activity[w.k]||0)>=w.t?G:TXT}}>{log.activity[w.k]||0}min {(log.activity[w.k]||0)>=w.t?"✓":`/ ${w.t}`}</span>
              </div>
              <div className="walk-btns">
                {[0,5,10,15,20,25,30,35,40,45,60].filter(v=>v<=w.max).map(v=>(
                  <button key={v} className={`wkbtn${(log.activity[w.k]||0)===v?" on":""}`} onClick={()=>persist({activity:{...log.activity,[w.k]:v}})}>{v}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* HABITS */}
        <div className="card">
          <div className="card-title">✅ Daily habits — {habDone}/{HABITS.length}</div>
          {HABITS.map(h=>(
            <div key={h} className="hab-row" onClick={()=>persist({habits:{...log.habits,[h]:!log.habits[h]}})}>
              <div className={`hab-chk${log.habits[h]?" on":""}`}>{log.habits[h]&&<span style={{color:"#fff",fontSize:10,fontWeight:900}}>✓</span>}</div>
              <span style={{fontSize:12,color:log.habits[h]?G:TXT,textDecoration:log.habits[h]?"line-through":"none"}}>{h}</span>
            </div>
          ))}
        </div>

        {/* WEIGHT */}
        <div className="card">
          <div className="card-title">⚖️ Weight {dateKey===today()?"(today)":label(dateKey)}</div>
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
      </div>

      {/* BOTTOM NAV */}
      <div className="bottomnav">
        {[["Dashboard","🏠","/dashboard"],["Meals","🍽️","/meals"],["Progress","📊","/progress"],["Reports","📋","/reports"],["Profile","👤","/profile"]].map(([lbl,ico,href])=>(
          <button key={href} className="navbtn" onClick={()=>router.push(href)} style={{color:href==="/dashboard"?P:TXT3}}>
            <span style={{fontSize:20}}>{ico}</span>{lbl}
          </button>
        ))}
      </div>
    </>
  );
}
