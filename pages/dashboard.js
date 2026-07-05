// pages/dashboard.js — Blitora Pulse · Dark Theme · Vitality Orb
import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";
import Layout from "../components/Layout";
import RoleGuard, { ROLE_HOME } from "../components/RoleGuard";
import { useRole, ROLES } from "../lib/useRole";
import Link from "next/link";

// ─── Constants ───────────────────────────────────────────────────────────────
const G="#1D9E75", GL="#2AE8A4", N="#0D1B3E", AI_C="#714B67", AI_L="#B07CA5";
const AMB="#EF9F27", RED="#E06A5A", BLU="#4A9FE8";
const GLS="rgba(255,255,255,.045)", BRD="rgba(255,255,255,.09)", BGY="#8B97AD";

const HABITS=["4 almonds + 2 walnuts","No sugar / jaggery / honey","No fried food today","Dinner before 8 PM","Sleep by 10:30 PM"];
const WALKS=[{k:"morning_walk",l:"Morning",icon:"🌅",target:40,max:60},{k:"post_lunch_walk",l:"Post-lunch",icon:"🚶",target:15,max:30},{k:"post_dinner_walk",l:"Post-dinner",icon:"🌙",target:20,max:30}];
const MEAL_DEFS=[{id:"morning",label:"Morning",time:"7:00 AM",icon:"☀️"},{id:"breakfast",label:"Breakfast",time:"8:00 AM",icon:"🍳"},{id:"midmorning",label:"Mid-morning",time:"11:00 AM",icon:"☕"},{id:"lunch",label:"Lunch",time:"1:00 PM",icon:"🍽️"},{id:"evening",label:"Evening snack",time:"4:30 PM",icon:"🌆"},{id:"dinner",label:"Dinner",time:"7:30 PM",icon:"🌙"}];

const fmt=d=>d.toISOString().split("T")[0];
const today=()=>fmt(new Date());
function dayLabel(dk){const t=today(),y=fmt(new Date(Date.now()-86400000));if(dk===t)return"Today";if(dk===y)return"Yesterday";return new Date(dk).toLocaleDateString("en-IN",{day:"numeric",month:"short"});}
function calcBMR(p){if(!p)return 1800;const w=parseFloat(p.weight_current)||parseFloat(p.weight_start)||70,h=parseFloat(p.height_cm)||165,age=p.dob?Math.floor((Date.now()-new Date(p.dob))/(365.25*864e5)):parseInt(p.age)||30,base=Math.round(10*w+6.25*h-5*age);return p.gender==="Female"?base-161:base+5;}
function greet(){const h=new Date().getHours();return h<12?"morning":h<17?"afternoon":"evening";}

// ─── Helpers for vitals ───────────────────────────────────────────────────
function bpStatus(s,d){if(!s||!d)return null;if(s<120&&d<80)return{t:"Normal",c:G,bg:"rgba(29,158,117,.15)"};if(s<130&&d<80)return{t:"Elevated",c:AMB,bg:"rgba(239,159,39,.12)"};return{t:"High",c:RED,bg:"rgba(224,106,90,.12)"};}
function sugarStatus(v,type){if(!v)return null;const thres=type==="fasting"?[100,126]:[140,200];if(v<thres[0])return{t:"Normal",c:G};if(v<thres[1])return{t:"Pre-diabetic",c:AMB};return{t:"High",c:RED};}

// ─── Orb SVG Ring ─────────────────────────────────────────────────────────
function OrbRing({score}){const r=110,circ=2*Math.PI*r,dash=circ-(circ*Math.min(100,score)/100);return(
  <svg viewBox="0 0 256 256" style={{position:"absolute",inset:0,transform:"rotate(-90deg)"}}>
    <defs><linearGradient id="og" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={GL}/><stop offset="100%" stopColor={G}/></linearGradient></defs>
    <circle cx="128" cy="128" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="6"/>
    <circle cx="128" cy="128" r={r} fill="none" stroke="url(#og)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dash} style={{filter:`drop-shadow(0 0 8px ${GL})`,transition:"stroke-dashoffset 1.2s cubic-bezier(.3,.8,.3,1)"}}/>
  </svg>
);}

// ─── Macro Ring ───────────────────────────────────────────────────────────
function MacroRing({value,max,color,label,sub}){const r=34,circ=2*Math.PI*r,v=Math.min(100,max>0?Math.round((value/max)*100):0),dash=circ-(circ*v/100);return(
  <div style={{textAlign:"center",padding:"4px 2px"}}>
    <div style={{position:"relative",width:82,height:82,margin:"0 auto 7px"}}>
      <svg width="82" height="82" viewBox="0 0 82 82" style={{transform:"rotate(-90deg)"}}>
        <circle cx="41" cy="41" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" strokeLinecap="round"/>
        <circle cx="41" cy="41" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dash} style={{filter:`drop-shadow(0 0 5px ${color}99)`,transition:"stroke-dashoffset 1.3s cubic-bezier(.3,.8,.3,1)"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color}}>{v}%</div>
    </div>
    <div style={{fontSize:10.5,color:BGY,fontWeight:500}}>{label}</div>
    <div style={{fontSize:9.5,color:"#6E7A92"}}>{sub}</div>
  </div>
);}

// ─── KPI Card ─────────────────────────────────────────────────────────────
function KPICard({icon,value,unit,label,sub,subColor}){
  const [tilt,setTilt]=useState({x:0,y:0}),ref=useRef();
  return(
    <div ref={ref} onMouseMove={e=>{const r=ref.current.getBoundingClientRect();setTilt({x:(((e.clientX-r.left)/r.width)-.5)*13,y:(.5-((e.clientY-r.top)/r.height))*11});}} onMouseLeave={()=>setTilt({x:0,y:0})}
      style={{background:"linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02))",border:`1px solid ${BRD}`,borderRadius:17,padding:16,transform:`perspective(600px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,transition:"box-shadow .3s",cursor:"default",animation:"tiltIn .5s ease"}}>
      <div style={{fontSize:17,marginBottom:9}}>{icon}</div>
      <div style={{fontSize:22,fontWeight:700,color:"#fff"}}>{value}<span style={{fontSize:11,color:BGY,fontWeight:500}}> {unit}</span></div>
      <div style={{fontSize:11,color:BGY,fontWeight:500,marginTop:2}}>{label}</div>
      {sub&&<div style={{fontSize:10,marginTop:7,padding:"3px 8px",borderRadius:6,display:"inline-block",background:(subColor||G)+"22",color:subColor||G,fontWeight:600}}>{sub}</div>}
    </div>
  );
}

// ─── Vitals Card ─────────────────────────────────────────────────────────
function VitalsCard({vitals,profile,router}){
  const hasAny=vitals.weight_kg||vitals.bp_systolic||vitals.sugar_fasting;
  const bp=bpStatus(vitals.bp_systolic,vitals.bp_diastolic);
  const sf=sugarStatus(vitals.sugar_fasting,"fasting");
  const sp=sugarStatus(vitals.sugar_post_meal,"post");
  const lostKg=profile?.weight_start&&vitals.weight_kg?((parseFloat(profile.weight_start)-parseFloat(vitals.weight_kg)).toFixed(1)):null;
  const toGoKg=profile?.weight_target&&vitals.weight_kg?((parseFloat(vitals.weight_kg)-parseFloat(profile.weight_target)).toFixed(1)):null;
  return(
    <div style={{background:GLS,border:`1px solid ${BRD}`,borderRadius:20,padding:20,backdropFilter:"blur(16px)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{fontSize:13,fontWeight:600,color:"#DCE3F0",display:"flex",alignItems:"center",gap:8}}><span style={{width:7,height:7,borderRadius:"50%",background:GL,boxShadow:`0 0 8px ${GL}`,display:"inline-block"}}/>VITALS TODAY</h3>
        <button onClick={()=>router.push("/log")} style={{fontSize:11,fontWeight:700,color:GL,background:"none",border:`1px solid rgba(42,232,164,.35)`,borderRadius:999,padding:"5px 12px",cursor:"pointer",transition:".2s"}}>
          {hasAny?"Update →":"Log vitals →"}
        </button>
      </div>
      {!hasAny?(
        <div style={{textAlign:"center",padding:"20px 0",color:BGY}}>
          <div style={{fontSize:28,marginBottom:8}}>📊</div>
          <div style={{fontWeight:600,marginBottom:4}}>No vitals logged today</div>
          <div style={{fontSize:11}}>Log your weight, blood pressure & blood sugar from the Log tab</div>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
          {/* Weight */}
          <div style={{padding:13,background:"rgba(255,255,255,.04)",borderRadius:13,border:`1px solid ${BRD}`}}>
            <div style={{fontSize:10,fontWeight:600,color:BGY,marginBottom:6,letterSpacing:".5px"}}>⚖️ WEIGHT</div>
            {vitals.weight_kg?(<>
              <div style={{fontSize:22,fontWeight:700,color:"#fff"}}>{Number(vitals.weight_kg).toFixed(1)}<span style={{fontSize:11,color:BGY,fontWeight:500}}> kg</span></div>
              {lostKg>0&&<div style={{fontSize:10,color:GL,fontWeight:600,marginTop:3}}>▼ {lostKg}kg lost</div>}
              {toGoKg>0&&<div style={{fontSize:10,color:BGY,marginTop:1}}>{toGoKg}kg to goal</div>}
              {toGoKg<=0&&toGoKg!==null&&<div style={{fontSize:10,color:GL,fontWeight:700,marginTop:3}}>🎯 Goal reached!</div>}
            </>):(<div style={{fontSize:13,color:BGY}}>—</div>)}
          </div>
          {/* BP */}
          <div style={{padding:13,background:bp?bp.bg:"rgba(255,255,255,.04)",borderRadius:13,border:`1px solid ${bp?bp.c+"44":BRD}`}}>
            <div style={{fontSize:10,fontWeight:600,color:BGY,marginBottom:6,letterSpacing:".5px"}}>🩺 BLOOD PRESSURE</div>
            {vitals.bp_systolic?(<>
              <div style={{fontSize:22,fontWeight:700,color:bp?bp.c:"#fff"}}>{vitals.bp_systolic}<span style={{fontSize:14,fontWeight:500}}>/{vitals.bp_diastolic}</span><span style={{fontSize:10,color:BGY,fontWeight:500}}> mmHg</span></div>
              {bp&&<div style={{fontSize:10,fontWeight:700,color:bp.c,marginTop:3}}>{bp.t}</div>}
            </>):(<div style={{fontSize:13,color:BGY}}>—</div>)}
          </div>
          {/* Fasting Sugar */}
          <div style={{padding:13,background:sf?"rgba(255,255,255,.04)":"rgba(255,255,255,.04)",borderRadius:13,border:`1px solid ${sf?sf.c+"44":BRD}`}}>
            <div style={{fontSize:10,fontWeight:600,color:BGY,marginBottom:6,letterSpacing:".5px"}}>🩸 SUGAR — FASTING</div>
            {vitals.sugar_fasting?(<>
              <div style={{fontSize:22,fontWeight:700,color:sf?sf.c:"#fff"}}>{vitals.sugar_fasting}<span style={{fontSize:10,color:BGY,fontWeight:500}}> mg/dL</span></div>
              {sf&&<div style={{fontSize:10,fontWeight:700,color:sf.c,marginTop:3}}>{sf.t}</div>}
              <div style={{fontSize:9,color:BGY,marginTop:1}}>Normal: &lt;100</div>
            </>):(<div style={{fontSize:13,color:BGY}}>—</div>)}
          </div>
          {/* Post-meal Sugar */}
          <div style={{padding:13,background:"rgba(255,255,255,.04)",borderRadius:13,border:`1px solid ${sp?sp.c+"44":BRD}`}}>
            <div style={{fontSize:10,fontWeight:600,color:BGY,marginBottom:6,letterSpacing:".5px"}}>🩸 SUGAR — POST-MEAL</div>
            {vitals.sugar_post_meal?(<>
              <div style={{fontSize:22,fontWeight:700,color:sp?sp.c:"#fff"}}>{vitals.sugar_post_meal}<span style={{fontSize:10,color:BGY,fontWeight:500}}> mg/dL</span></div>
              {sp&&<div style={{fontSize:10,fontWeight:700,color:sp.c,marginTop:3}}>{sp.t}</div>}
              <div style={{fontSize:9,color:BGY,marginTop:1}}>Normal: &lt;140</div>
            </>):(<div style={{fontSize:13,color:BGY}}>—</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Insight Card ─────────────────────────────────────────────────────
function InsightCard({content,loading,downgraded}){
  if(loading)return(
    <div style={{background:"linear-gradient(150deg,rgba(113,75,103,.22),rgba(113,75,103,.05))",border:"1px solid rgba(176,124,165,.35)",borderRadius:20,padding:20,backdropFilter:"blur(16px)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,borderRadius:"50%",background:AI_C,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14,animation:"beat 3s ease-in-out infinite",flexShrink:0}}>✦</div>
        <div style={{flex:1}}>{[70,50,80].map((w,i)=><div key={i} style={{height:8,borderRadius:4,background:"rgba(176,124,165,.3)",width:`${w}%`,marginBottom:6,animation:`pulse 1.4s ease-in-out ${i*.15}s infinite`}}/>)}</div>
      </div>
    </div>
  );
  if(!content)return null;
  return(
    <div style={{background:"linear-gradient(150deg,rgba(113,75,103,.22),rgba(113,75,103,.05))",border:"1px solid rgba(176,124,165,.35)",borderRadius:20,padding:20,backdropFilter:"blur(16px)"}}>
      <h3 style={{fontSize:13,fontWeight:600,color:AI_L,display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <span style={{width:7,height:7,borderRadius:"50%",background:AI_L,boxShadow:`0 0 8px ${AI_L}`,display:"inline-block"}}/>AI COACH INSIGHT
        {downgraded&&<span style={{fontSize:9,color:BGY,fontWeight:400,marginLeft:4}}>· basic mode</span>}
      </h3>
      <p style={{fontSize:13,lineHeight:1.7,color:"#E8DFEA"}}>{content}</p>
      <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
        {["High-protein dinner ideas","Explain my blood sugar","Plan tomorrow's meals"].map(q=>(
          <Link key={q} href={`/ai/chat?q=${encodeURIComponent(q)}`} style={{fontSize:11,padding:"7px 12px",borderRadius:999,border:"1px solid rgba(176,124,165,.4)",background:"rgba(113,75,103,.2)",color:"#EAD9E6",textDecoration:"none",fontWeight:500}}>{q}</Link>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Dashboard(){
  const router=useRouter();
  const [profile,setProfile]=useState(null);
  const [foods,setFoods]=useState([]);
  const [dateKey,setDateKey]=useState(today());
  const [log,setLog]=useState({foods:{},activity:{},water:0,habits:{},weight:null});
  const [vitals,setVitals]=useState({weight_kg:null,bp_systolic:null,bp_diastolic:null,sugar_fasting:null,sugar_post_meal:null});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [orbScore,setOrbScore]=useState(0);
  const [orbTarget,setOrbTarget]=useState(0);
  const [insight,setInsight]=useState(null);
  const [insightLoading,setInsightLoading]=useState(false);
  const [insightDowngraded,setInsightDowngraded]=useState(false);
  const [tomorrowPlan,setTomorrowPlan]=useState(null);
  const [tomorrowLoading,setTomorrowLoading]=useState(false);
  const [showTomorrow,setShowTomorrow]=useState(false);

  // Orb animation
  useEffect(()=>{
    let cur=0;const iv=setInterval(()=>{if(cur<orbTarget){cur=Math.min(orbTarget,cur+2);setOrbScore(cur);}else clearInterval(iv);},20);
    return()=>clearInterval(iv);
  },[orbTarget]);

  function computeOrb(p,lg,vit){
    let s=0;const ct=p?.calorie_target||1600,pt=p?.protein_target||100;
    const mc=allFoodsCalFromLog(lg,foods);
    s+=Math.min(25,(mc/ct)*25);
    s+=Math.min(20,((lg.water||0)*0.5/(p?.water_target||3.5))*20);
    const wkMin=WALKS.reduce((a,w)=>a+(lg.activity?.[w.k]||0),0);
    s+=Math.min(20,(wkMin/30)*20);
    s+=Math.min(20,((allFoodsProteinFromLog(lg,foods)/pt))*20);
    if(vit?.weight_kg)s+=8;if(vit?.bp_systolic)s+=4;if(vit?.sugar_fasting)s+=3;
    setOrbTarget(Math.round(Math.min(100,s)));
  }
  function allFoodsCalFromLog(lg,fds){if(!lg||!fds)return 0;return Object.values(lg.foods||{}).flatMap(m=>Object.keys(m)).reduce((a,id)=>{const f=fds.find(x=>String(x.id)===id||x.name===id);return f?a+(f.calories||0):a;},0);}
  function allFoodsProteinFromLog(lg,fds){if(!lg||!fds)return 0;return Object.values(lg.foods||{}).flatMap(m=>Object.keys(m)).reduce((a,id)=>{const f=fds.find(x=>String(x.id)===id||x.name===id);return f?a+(f.protein||0):a;},0);}

  useEffect(()=>{
    async function init(){
      const sb=getSupabase();
      const{data:{session}}=await sb.auth.getSession();
      if(!session){router.push("/");return;}
      const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
      if(!p){router.push("/");return;}
      if(!p.setup_complete){router.push("/setup");return;}
      setProfile(p);
      fetchInsight(p,{cal:0,pro:0,water:0,activity:{}},today());
      if(p.active_template_id){
        const[{data:tf},{data:cu}]=await Promise.all([
          sb.from("template_food_items").select("id,name,calories,protein").eq("template_id",p.active_template_id).eq("added_by_user",false),
          sb.from("template_food_items").select("id,name,calories,protein").eq("added_by_user",true).eq("added_by_user_id",p.id),
        ]);
        setFoods(Array.from(new Map([...(tf||[]),...(cu||[])].map(f=>[f.id,f])).values()));
      }
    }
    init();
  },[]);

  async function fetchInsight(p,currentLog,dk){
    if(!p||dk!==today())return;
    setInsightLoading(true);
    try{
      const res=await fetch('/api/ai/insight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:p.id,plan:p.plan||'trial',profile:{fullName:p.full_name,healthConditions:p.conditions?Object.keys(p.conditions).filter(k=>k!=='none'):[],primaryGoal:p.goals?.[0]||'Stay healthy',dailyCalorieTarget:p.calorie_target||1600,proteinTarget:p.protein_target||100},todayLog:{totalCalories:currentLog?.cal||0,totalProtein:currentLog?.pro||0,totalWaterMl:(currentLog?.water||0)*500,walkMinutes:WALKS.reduce((s,w)=>s+(currentLog?.activity?.[w.k]||0),0)},country:p.country||null})});
      const data=await res.json();
      if(data.content){setInsight(data.content);setInsightDowngraded(data.downgraded||false);}
    }catch(e){console.error(e);}finally{setInsightLoading(false);}
  }

  async function fetchTomorrowPlan(){
    if(!profile)return;setTomorrowLoading(true);setShowTomorrow(true);
    try{
      const macNow=allFoodsCalFromLog(log,foods);
      const res=await fetch('/api/ai/tomorrow-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:profile.id,plan:profile.plan||'trial',profile:{dietaryPref:profile.diet_type||'Mixed',healthConditions:profile.conditions?Object.keys(profile.conditions).filter(k=>k!=='none'):[],mealPlanType:profile.meals_per_day||5,dailyCalorieTarget:profile.calorie_target||1600,proteinTarget:profile.protein_target||100,carbTarget:profile.carb_target||130,fatTarget:profile.fat_target||55},todayLog:{totalCalories:macNow},country:profile.country||null})});
      const data=await res.json();
      setTomorrowPlan(data.error==='not_available'?{notAvailable:true}:(data.plan||null));
    }catch(e){console.error(e);}finally{setTomorrowLoading(false);}
  }

  const loadLog=useCallback(async(dk)=>{
    if(!profile)return;
    const{data}=await getSupabase().from("health_logs").select("*").eq("user_id",profile.id).eq("log_date",dk).single();
    if(data){
      const lg={foods:data.foods||{},activity:data.activity||{},water:data.water||0,habits:data.habits||{},weight:data.weight||null};
      setLog(lg);
      const vit={weight_kg:data.weight_kg||null,bp_systolic:data.bp_systolic||null,bp_diastolic:data.bp_diastolic||null,sugar_fasting:data.sugar_fasting||null,sugar_post_meal:data.sugar_post_meal||null};
      setVitals(vit);
      setTimeout(()=>computeOrb(profile,lg,vit),300);
    }else{
      setLog({foods:{},activity:{},water:0,habits:{},weight:null});
      setVitals({weight_kg:null,bp_systolic:null,bp_diastolic:null,sugar_fasting:null,sugar_post_meal:null});
      setOrbTarget(0);
    }
  },[profile,foods]);

  useEffect(()=>{if(profile)loadLog(dateKey);},[profile,dateKey]);

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),2000);}

  async function persist(patch){
    const next={...log,...patch};setLog(next);setSaving(true);
    await getSupabase().from("health_logs").upsert({user_id:profile.id,log_date:dateKey,...next},{onConflict:"user_id,log_date"});
    setSaving(false);showToast("Saved ✓");
    computeOrb(profile,next,vitals);
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const allFoodIds=Object.values(log.foods).flatMap(m=>Object.keys(m));
  const mac=allFoodIds.reduce((a,id)=>{const f=foods.find(x=>String(x.id)===id||x.name===id);return f?{cal:a.cal+(f.calories||0),pro:a.pro+(f.protein||0),carb:a.carb+(f.carbs||0),fat:a.fat+(f.fat||0)}:a;},{cal:0,pro:0,carb:0,fat:0});
  const BMR=calcBMR(profile);
  const walkBurn=WALKS.reduce((s,w)=>{const m=log.activity[w.k]||0;return s+m*(w.k==="morning_walk"?5:4);},0);
  const walkMinTotal=WALKS.reduce((s,w)=>s+(log.activity[w.k]||0),0);
  const calTarget=profile?.calorie_target||1600;
  const proTarget=profile?.protein_target||100;
  const waterL=((log.water||0)*0.5).toFixed(1);
  const waterTarget=profile?.water_target||3.5;
  const habDone=Object.values(log.habits).filter(Boolean).length;
  const mealsDone=Object.values(log.foods).filter(m=>Object.keys(m).length>0).length;

  const orbLevel=orbScore>=85?"hot":orbScore>=55?"warm":"cool";
  const orbGlow=orbLevel==="hot"?"0 0 120px rgba(42,232,164,.9),0 0 200px rgba(42,232,164,.4),inset -16px -22px 45px rgba(0,0,0,.4),inset 9px 11px 42px rgba(255,255,255,.4)":orbLevel==="warm"?"0 0 80px rgba(29,158,117,.6),inset -16px -22px 45px rgba(0,0,0,.5),inset 9px 11px 36px rgba(255,255,255,.25)":"0 0 55px rgba(29,158,117,.45),inset -16px -22px 45px rgba(0,0,0,.55),inset 9px 11px 36px rgba(255,255,255,.18)";

  if(!profile)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:36,height:36,border:`3px solid ${G}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>);

  return(
    <RoleGuard allow={[ROLES.PATIENT,ROLES.UNASSIGNED]}>
    <>
      <Head><title>Home — Blitora Pulse</title></Head>

      {/* Toast */}
      {toast&&<div style={{position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",background:N,border:`1px solid rgba(42,232,164,.4)`,color:"#DFF7EC",borderRadius:13,padding:"10px 20px",fontSize:13,fontWeight:600,zIndex:999,backdropFilter:"blur(12px)",boxShadow:`0 0 24px rgba(29,158,117,.3)`,whiteSpace:"nowrap"}}>{toast}</div>}

      <Layout>
        <div style={{padding:"24px 28px 60px",maxWidth:1360,margin:"0 auto"}}>

          {/* TOPBAR */}
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:22}}>
            <div>
              <h1 style={{fontSize:23,fontWeight:700,margin:0}}>Good {greet()}, {profile?.full_name?.split(" ")[0]||"there"} 👋</h1>
              <p style={{fontSize:12.5,color:BGY,margin:"3px 0 0"}}>{new Date(dateKey+"T12:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})} · {dayLabel(dateKey)}</p>
            </div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
              {/* Date nav */}
              <button onClick={()=>{const d=new Date(dateKey);d.setDate(d.getDate()-1);setDateKey(fmt(d));}} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${BRD}`,background:"transparent",color:BGY,cursor:"pointer",fontSize:15}}>‹</button>
              <button onClick={()=>{const d=new Date(dateKey);d.setDate(d.getDate()+1);if(fmt(d)<=today())setDateKey(fmt(d));}} disabled={dateKey>=today()} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${BRD}`,background:"transparent",color:BGY,cursor:"pointer",fontSize:15,opacity:dateKey>=today()?.35:1}}>›</button>
              {/* AI + Tomorrow */}
              <button onClick={fetchTomorrowPlan} disabled={tomorrowLoading} style={{background:"none",border:`1px solid ${BRD}`,color:BGY,borderRadius:11,padding:"9px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                🌙 {tomorrowLoading?"Generating…":"Tomorrow"}
              </button>
              <Link href="/ai/chat" style={{background:`linear-gradient(120deg,${AI_C},#4a2f44)`,color:"#DDA8CF",borderRadius:11,padding:"9px 14px",fontSize:12,fontWeight:600,textDecoration:"none",boxShadow:`0 0 16px rgba(113,75,103,.4)`}}>✦ AI Coach</Link>
            </div>
          </div>

          {/* MAIN GRID */}
          <div style={{display:"grid",gridTemplateColumns:"min(340px,38%) 1fr",gap:20,alignItems:"start"}}>

            {/* LEFT: VITALITY ORB */}
            <div style={{background:GLS,border:`1px solid ${BRD}`,borderRadius:20,padding:"26px 20px",backdropFilter:"blur(16px)",textAlign:"center",overflow:"hidden"}}>
              <h3 style={{fontSize:12,fontWeight:600,color:"#DCE3F0",display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginBottom:16}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:GL,boxShadow:`0 0 8px ${GL}`,display:"inline-block"}}/>VITALITY ORB
              </h3>
              <div style={{position:"relative",width:240,height:240,margin:"0 auto 8px"}}>
                {/* Orbit rings */}
                <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"1px dashed rgba(42,232,164,.18)",animation:"spin 24s linear infinite"}}/>
                <div style={{position:"absolute",inset:18,borderRadius:"50%",border:"1px solid rgba(74,159,232,.14)",animation:"spin 36s linear infinite reverse"}}/>
                <OrbRing score={orbScore}/>
                {/* 3D Sphere */}
                <div style={{position:"absolute",inset:50,borderRadius:"50%",background:"radial-gradient(circle at 34% 30%, rgba(180,255,225,.95) 0%, rgba(42,232,164,.85) 22%, rgba(29,158,117,.9) 48%, rgba(13,54,44,.95) 78%, #071a15 100%)",boxShadow:orbGlow,animation:"beat 1s ease-in-out infinite"}}/>
                {/* Score */}
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                  <span style={{fontSize:44,fontWeight:800,textShadow:`0 0 20px rgba(42,232,164,.7)`,lineHeight:1}}>{orbScore}</span>
                  <span style={{fontSize:9,letterSpacing:"2.5px",color:"rgba(230,255,245,.85)",fontWeight:600,marginTop:3}}>VITALITY</span>
                </div>
              </div>
              {/* ECG */}
              <svg viewBox="0 0 300 36" style={{width:"100%",height:34,margin:"4px 0 8px"}}>
                <path d="M0 20 H65 L75 20 L83 7 L91 31 L99 20 H145 L155 20 L163 5 L171 33 L179 20 H300" fill="none" stroke={GL} strokeWidth="2" style={{filter:`drop-shadow(0 0 5px ${GL})`,strokeDasharray:600,strokeDashoffset:600,animation:"ecgDraw 3s linear infinite"}}/>
              </svg>
              <p style={{fontSize:11.5,color:BGY,marginBottom:16}}>Charge to <strong style={{color:GL}}>100</strong> for Perfect Pulse ✨</p>

              {/* Water quick-log */}
              <div style={{background:"rgba(255,255,255,.04)",border:`1px solid ${BRD}`,borderRadius:14,padding:14,textAlign:"left",marginBottom:12}}>
                <div style={{fontSize:10,fontWeight:600,color:BGY,letterSpacing:"1px",marginBottom:10}}>💧 WATER — TAP A DROP</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                  {Array.from({length:Math.round((parseFloat(waterTarget)*2)||8)}).map((_,i)=>(
                    <div key={i} onClick={()=>persist({water:i+1})} style={{fontSize:18,cursor:"pointer",opacity:(log.water||0)>i?1:.22,transition:".15s",transform:(log.water||0)>i?"scale(1.05)":"scale(1)"}}>💧</div>
                  ))}
                </div>
                <div style={{fontSize:11,color:(log.water||0)*0.5>=parseFloat(waterTarget)?GL:BGY,fontWeight:600}}>
                  {waterL}L / {waterTarget}L {(log.water||0)*0.5>=parseFloat(waterTarget)?"✓ Goal met!":""}
                </div>
              </div>

              {/* Walk quick-log */}
              <div style={{background:"rgba(255,255,255,.04)",border:`1px solid ${BRD}`,borderRadius:14,padding:14,textAlign:"left"}}>
                <div style={{fontSize:10,fontWeight:600,color:BGY,letterSpacing:"1px",marginBottom:10}}>👟 WALKS — {walkMinTotal} min total</div>
                {WALKS.map(w=>(
                  <div key={w.k} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:5}}>
                      <span style={{color:"#C9D2E3",fontWeight:500}}>{w.icon} {w.l}</span>
                      <span style={{fontWeight:700,color:(log.activity[w.k]||0)>=w.target?GL:BGY}}>{log.activity[w.k]||0}min</span>
                    </div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {[0,10,15,20,30,40,60].filter(v=>v<=w.max).map(v=>(
                        <button key={v} onClick={()=>persist({activity:{...log.activity,[w.k]:v}})} style={{padding:"3px 8px",borderRadius:6,border:`1.5px solid ${(log.activity[w.k]||0)===v?GL:BRD}`,background:(log.activity[w.k]||0)===v?"rgba(42,232,164,.18)":"transparent",color:(log.activity[w.k]||0)===v?GL:BGY,fontSize:11,fontWeight:(log.activity[w.k]||0)===v?700:500,cursor:"pointer"}}>{v}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{display:"grid",gap:18}}>

              {/* KPI ROW 1: Nutrition */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
                <KPICard icon="🔥" value={mac.cal} unit={`/ ${calTarget}`} label="Calories eaten" sub={mac.cal>=calTarget*.8?"On track":`${calTarget-mac.cal} to go`} subColor={mac.cal>=calTarget*.8?G:AMB}/>
                <KPICard icon="⚡" value={mac.cal>0?BMR+walkBurn:"—"} unit={mac.cal>0?"kcal burned":""} label="Total burn" sub={walkBurn>0?`+${walkBurn} from walks`:null}/>
                <KPICard icon="💪" value={`${mac.pro}g`} unit={`/ ${proTarget}g`} label="Protein" sub={mac.pro>=proTarget?"✓ Goal met":null} subColor={G}/>
                <KPICard icon="🍽️" value={mealsDone} unit="/ 6 meals" label="Meals logged" sub={null}/>
              </div>

              {/* KPI ROW 2: Vitals */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
                <KPICard icon="⚖️" value={vitals.weight_kg?Number(vitals.weight_kg).toFixed(1):"—"} unit={vitals.weight_kg?"kg":""} label="Weight today" sub={vitals.weight_kg&&profile?.weight_target?`Goal: ${profile.weight_target}kg`:null}/>
                <KPICard icon="💓" value={vitals.bp_systolic?`${vitals.bp_systolic}/${vitals.bp_diastolic}`:"—"} unit={vitals.bp_systolic?"mmHg":""} label="Blood pressure" sub={bpStatus(vitals.bp_systolic,vitals.bp_diastolic)?.t} subColor={bpStatus(vitals.bp_systolic,vitals.bp_diastolic)?.c}/>
                <KPICard icon="🩸" value={vitals.sugar_fasting||"—"} unit={vitals.sugar_fasting?"mg/dL":""} label="Sugar (fasting)" sub={sugarStatus(vitals.sugar_fasting,"fasting")?.t} subColor={sugarStatus(vitals.sugar_fasting,"fasting")?.c}/>
                <KPICard icon="🩸" value={vitals.sugar_post_meal||"—"} unit={vitals.sugar_post_meal?"mg/dL":""} label="Sugar (post-meal)" sub={sugarStatus(vitals.sugar_post_meal,"post")?.t} subColor={sugarStatus(vitals.sugar_post_meal,"post")?.c}/>
              </div>

              {/* MACROS */}
              <div style={{background:GLS,border:`1px solid ${BRD}`,borderRadius:20,padding:20,backdropFilter:"blur(16px)"}}>
                <h3 style={{fontSize:13,fontWeight:600,color:"#DCE3F0",display:"flex",alignItems:"center",gap:8,marginBottom:16}}><span style={{width:7,height:7,borderRadius:"50%",background:GL,boxShadow:`0 0 8px ${GL}`,display:"inline-block"}}/>MACROS TODAY</h3>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>
                  <MacroRing value={mac.cal} max={calTarget} color={G} label="Calories" sub={`${mac.cal}/${calTarget}`}/>
                  <MacroRing value={mac.pro} max={proTarget} color={BLU} label="Protein" sub={`${mac.pro}/${proTarget}g`}/>
                  <MacroRing value={mac.carb} max={profile?.carb_target||130} color={AMB} label="Carbs" sub={`${mac.carb}/${profile?.carb_target||130}g`}/>
                  <MacroRing value={mac.fat} max={profile?.fat_target||55} color={RED} label="Fat" sub={`${mac.fat}/${profile?.fat_target||55}g`}/>
                  <MacroRing value={habDone} max={HABITS.length} color={AI_L} label="Habits" sub={`${habDone}/${HABITS.length}`}/>
                </div>
              </div>

              {/* AI INSIGHT */}
              <InsightCard content={insight} loading={insightLoading} downgraded={insightDowngraded}/>

            </div>
          </div>

          {/* VITALS CARD */}
          <div style={{marginTop:20}}>
            <VitalsCard vitals={vitals} profile={profile} router={router}/>
          </div>

          {/* HABITS */}
          <div style={{background:GLS,border:`1px solid ${BRD}`,borderRadius:20,padding:20,backdropFilter:"blur(16px)",marginTop:20}}>
            <h3 style={{fontSize:13,fontWeight:600,color:"#DCE3F0",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:14}}>
              <span style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:7,height:7,borderRadius:"50%",background:GL,boxShadow:`0 0 8px ${GL}`,display:"inline-block"}}/>DAILY HABITS</span>
              <span style={{fontSize:12,fontWeight:700,color:habDone===HABITS.length?GL:BGY}}>{habDone}/{HABITS.length}</span>
            </h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
              {HABITS.map(h=>(
                <div key={h} onClick={()=>persist({habits:{...log.habits,[h]:!log.habits[h]}})} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:13,background:log.habits[h]?"rgba(29,158,117,.12)":"rgba(255,255,255,.03)",border:`1px solid ${log.habits[h]?"rgba(42,232,164,.3)":BRD}`,cursor:"pointer",transition:".2s"}}>
                  <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${log.habits[h]?GL:BRD}`,background:log.habits[h]?GL:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:900,flexShrink:0,transition:".2s"}}>{log.habits[h]?"✓":""}</div>
                  <span style={{fontSize:12.5,color:log.habits[h]?GL:"#C9D2E3",textDecoration:log.habits[h]?"line-through":"none",fontWeight:log.habits[h]?600:400,transition:".2s"}}>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* MEAL TIMELINE */}
          <div style={{background:GLS,border:`1px solid ${BRD}`,borderRadius:20,padding:20,backdropFilter:"blur(16px)",marginTop:20}}>
            <h3 style={{fontSize:13,fontWeight:600,color:"#DCE3F0",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:14}}>
              <span style={{display:"flex",alignItems:"center",gap:8}}><span style={{width:7,height:7,borderRadius:"50%",background:GL,boxShadow:`0 0 8px ${GL}`,display:"inline-block"}}/>TODAY'S MEAL TIMELINE</span>
              <Link href="/meals" style={{fontSize:11,fontWeight:700,color:GL,background:"none",border:`1px solid rgba(42,232,164,.35)`,borderRadius:999,padding:"5px 12px",textDecoration:"none"}}>+ Log food</Link>
            </h3>
            {MEAL_DEFS.map((meal,i)=>{
              const sel=log.foods[meal.id]||{};const selKeys=Object.keys(sel);
              const mCal=selKeys.reduce((s,id)=>{const f=foods.find(x=>String(x.id)===id||x.name===id);return f?s+(f.calories||0):s;},0);
              return(
                <div key={meal.id} onClick={()=>router.push("/meals")} style={{display:"grid",gridTemplateColumns:"48px 16px 1fr auto",gap:12,alignItems:"center",padding:"10px 0",borderBottom:i<MEAL_DEFS.length-1?"1px solid rgba(255,255,255,.05)":"none",cursor:"pointer"}}>
                  <div style={{fontSize:10.5,color:BGY,fontWeight:600,textAlign:"right"}}>{meal.time}</div>
                  <div style={{width:12,height:12,borderRadius:"50%",background:selKeys.length>0?G:"rgba(255,255,255,.1)",border:`2px solid ${selKeys.length>0?GL:"rgba(255,255,255,.2)"}`,boxShadow:selKeys.length>0?`0 0 10px rgba(42,232,164,.6)`:"none",justifySelf:"center"}}/>
                  <div>
                    <div style={{fontSize:13.5,fontWeight:600}}>{meal.icon} {meal.label}</div>
                    <div style={{fontSize:11,color:BGY}}>{selKeys.length>0?`${selKeys.length} item${selKeys.length>1?"s":""} logged`:"Not logged yet"}</div>
                  </div>
                  {selKeys.length>0?(<div style={{fontSize:12,fontWeight:700,color:GL}}>{mCal} kcal</div>):(<div style={{fontSize:11,color:BGY,border:`1px dashed rgba(255,255,255,.2)`,borderRadius:999,padding:"4px 11px"}}>+ Log</div>)}
                </div>
              );
            })}
          </div>

          {/* Tomorrow Plan */}
          {showTomorrow&&tomorrowPlan&&(
            <div style={{background:GLS,border:`1px solid ${BRD}`,borderRadius:20,padding:20,backdropFilter:"blur(16px)",marginTop:20,animation:"fadein .4s ease"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <h3 style={{fontSize:13,fontWeight:600,color:"#DCE3F0",display:"flex",alignItems:"center",gap:8}}><span style={{width:7,height:7,borderRadius:"50%",background:AMB,boxShadow:`0 0 8px ${AMB}`,display:"inline-block"}}/>🌙 TOMORROW'S PLAN</h3>
                <button onClick={()=>{setShowTomorrow(false);setTomorrowPlan(null);}} style={{border:"none",background:"none",cursor:"pointer",color:BGY,fontSize:18}}>×</button>
              </div>
              {tomorrowPlan.notAvailable?(
                <p style={{fontSize:13,color:AMB}}>Tomorrow's Plan is available on Pro & Premium plans. Upgrade to unlock AI meal planning.</p>
              ):(
                <>
                  {tomorrowPlan.summary&&<p style={{fontSize:12,color:BGY,marginBottom:14,fontStyle:"italic"}}>{tomorrowPlan.summary}</p>}
                  {(tomorrowPlan.meals||[]).map((meal,i)=>(
                    <div key={i} style={{padding:"10px 0",borderBottom:i<(tomorrowPlan.meals.length-1)?"1px solid rgba(255,255,255,.06)":"none"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <span style={{fontSize:13,fontWeight:600}}>{meal.slot}</span>
                        <div style={{display:"flex",gap:8}}>
                          {meal.estimatedCalories>0&&<span style={{fontSize:12,fontWeight:700,color:G}}>{meal.estimatedCalories} kcal</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {(meal.items||[]).map((item,j)=>(
                          <span key={j} style={{fontSize:11,padding:"3px 9px",borderRadius:12,background:"rgba(255,255,255,.06)",color:"#C9D2E3",border:`1px solid ${BRD}`}}>{item}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

        </div>
      </Layout>
    </>
    </RoleGuard>
  );
}
