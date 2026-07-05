// pages/log.js — Blitora Pulse · Dark Theme · Water + Activity + Vitals
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";
import Layout from "../components/Layout";
import RoleGuard from "../components/RoleGuard";
import { useRole, ROLES } from "../lib/useRole";

const G="#1D9E75",GL="#2AE8A4",AMB="#EF9F27",RED="#E06A5A",BLU="#4A9FE8";
const BRD="rgba(255,255,255,.09)",GLS="rgba(255,255,255,.045)",BGY="#8B97AD";
const fmt=d=>d.toISOString().split("T")[0], today=()=>fmt(new Date());

function Card({title,dot=GL,children,style={}}){return(<div style={{background:GLS,border:`1px solid ${BRD}`,borderRadius:20,padding:20,backdropFilter:"blur(16px)",marginBottom:18,...style}}><h3 style={{fontSize:13,fontWeight:600,color:"#DCE3F0",display:"flex",alignItems:"center",gap:8,marginBottom:16}}><span style={{width:7,height:7,borderRadius:"50%",background:dot,boxShadow:`0 0 8px ${dot}`,display:"inline-block"}}/>{title}</h3>{children}</div>);}

function SaveBtn({onClick,saved,label="Save"}){return(<button onClick={onClick} style={{background:`linear-gradient(120deg,${G},#16855f)`,color:"#fff",border:"none",borderRadius:11,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px rgba(29,158,117,.35)`,transition:".2s"}}>{saved?"✓ Saved":label}</button>);}

function Input({label,value,onChange,placeholder,unit,hint,type="number"}){return(
  <div style={{marginBottom:16}}>
    <label style={{fontSize:10.5,color:BGY,fontWeight:600,letterSpacing:".5px",display:"block",marginBottom:6}}>{label}</label>
    <div style={{display:"flex",gap:8,alignItems:"center"}}>
      <input type={type} inputMode={type==="number"?"decimal":"text"} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{flex:1,background:"rgba(255,255,255,.06)",border:`1px solid ${value?"rgba(42,232,164,.4)":BRD}`,borderRadius:12,padding:"12px 14px",color:"#fff",fontSize:14,fontWeight:600,outline:"none",transition:"border .2s"}}/>
      {unit&&<span style={{fontSize:12,color:BGY,minWidth:44}}>{unit}</span>}
    </div>
    {hint&&<p style={{fontSize:10.5,color:"#6E7A92",margin:"5px 0 0"}}>{hint}</p>}
  </div>
);}

const ACTS=[{icon:"🚶",label:"Walk",met:3.5},{icon:"🏃",label:"Run",met:8},{icon:"🚴",label:"Cycle",met:6},{icon:"🧘",label:"Yoga",met:2.5},{icon:"🏊",label:"Swim",met:7},{icon:"🏋️",label:"Weights",met:5},{icon:"⛹️",label:"Sports",met:7.5},{icon:"🤸",label:"Aerobics",met:6.5}];

function bpStatus(s,d){if(!s||!d)return null;if(s<120&&d<80)return{t:"Normal ✓",c:G};if(s<130&&d<80)return{t:"Elevated",c:AMB};return{t:"High — see doctor",c:RED};}
function sugarStatus(v,fasting){if(!v)return null;const[a,b]=fasting?[100,126]:[140,200];if(v<a)return{t:"Normal ✓",c:G};if(v<b)return{t:"Pre-diabetic",c:AMB};return{t:"High",c:RED};}

export default function LogPage(){
  const router=useRouter();
  const{role}=useRole();
  const[profile,setProfile]=useState(null);
  const[dateKey]=useState(today());
  const[saved,setSaved]=useState({});
  const[toast,setToast]=useState(null);
  // Water
  const[glasses,setGlasses]=useState(0);
  const[waterGoal,setWaterGoal]=useState(8);
  // Activity
  const[actIdx,setActIdx]=useState(0);
  const[actMins,setActMins]=useState(20);
  const[walks,setWalks]=useState({morning:0,afternoon:0,evening:0});
  // Vitals
  const[weight,setWeight]=useState("");
  const[bp,setBp]=useState({systolic:"",diastolic:""});
  const[sugar,setSugar]=useState({fasting:"",postMeal:""});

  useEffect(()=>{
    async function load(){
      const sb=getSupabase();
      const{data:{session}}=await sb.auth.getSession();
      if(!session){router.replace("/login");return;}
      const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
      if(p){setProfile(p);setWaterGoal(p.daily_water_glasses||8);}
      const{data:log}=await sb.from("health_logs").select("*").eq("user_id",session.user.id).eq("log_date",dateKey).maybeSingle();
      if(log){
        setGlasses(log.total_water_glasses||0);
        setWalks({morning:log.walk_morning||0,afternoon:log.walk_afternoon||0,evening:log.walk_evening||0});
        if(log.weight_kg)setWeight(String(log.weight_kg));
        if(log.bp_systolic)setBp({systolic:String(log.bp_systolic),diastolic:String(log.bp_diastolic||"")});
        if(log.sugar_fasting)setSugar({fasting:String(log.sugar_fasting),postMeal:String(log.sugar_post_meal||"")});
      }
    }
    load();
  },[]);

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),2200);}
  function markSaved(k){setSaved(s=>({...s,[k]:true}));setTimeout(()=>setSaved(s=>({...s,[k]:false})),1800);}

  async function saveField(field,value){
    const sb=getSupabase();const{data:{session}}=await sb.auth.getSession();if(!session)return;
    await sb.from("health_logs").upsert({user_id:session.user.id,log_date:dateKey,[field]:value},{onConflict:"user_id,log_date"});
  }
  async function saveWater(g){setGlasses(g);await saveField("total_water_glasses",g);showToast(`💧 ${g} of ${waterGoal} glasses logged${g>=waterGoal?" · Goal reached! ⚡":""}`);}
  async function saveWalk(slot,mins){const nw={...walks,[slot]:mins};setWalks(nw);await saveField(`walk_${slot}`,mins);showToast(`👟 ${slot} walk: ${mins} min`);}
  async function saveActivity(){const kcal=Math.round(ACTS[actIdx].met*(parseFloat(profile?.current_weight)||70)*(actMins/60));await saveField("calories_burned",kcal);markSaved("act");showToast(`✓ ${ACTS[actIdx].label} ${actMins} min — ${kcal} kcal burned`);}
  async function saveWeight(){if(!weight)return;await saveField("weight_kg",parseFloat(weight));const sb=getSupabase();const{data:{session}}=await sb.auth.getSession();if(session)await sb.from("weight_logs").upsert({user_id:session.user.id,date:dateKey,weight_kg:parseFloat(weight)},{onConflict:"user_id,date"});markSaved("w");showToast(`⚖️ Weight saved: ${weight} kg`);}
  async function saveBP(){if(!bp.systolic)return;await saveField("bp_systolic",parseInt(bp.systolic));if(bp.diastolic)await saveField("bp_diastolic",parseInt(bp.diastolic));markSaved("bp");const s=bpStatus(parseInt(bp.systolic),parseInt(bp.diastolic));showToast(`💓 BP saved: ${bp.systolic}/${bp.diastolic} — ${s?.t||""}`);}
  async function saveSugar(){if(!sugar.fasting&&!sugar.postMeal)return;if(sugar.fasting)await saveField("sugar_fasting",parseFloat(sugar.fasting));if(sugar.postMeal)await saveField("sugar_post_meal",parseFloat(sugar.postMeal));markSaved("sg");showToast(`🩸 Blood sugar saved`);}

  const estKcal=Math.round(ACTS[actIdx].met*(parseFloat(profile?.current_weight)||70)*(actMins/60));
  const bps=bpStatus(parseInt(bp.systolic),parseInt(bp.diastolic));
  const sfs=sugarStatus(parseFloat(sugar.fasting),true);
  const sps=sugarStatus(parseFloat(sugar.postMeal),false);
  const walkSlots=[{key:"morning",icon:"🌅",label:"Morning walk",max:60},{key:"afternoon",icon:"🌤️",label:"Post-lunch walk",max:30},{key:"evening",icon:"🌙",label:"Post-dinner walk",max:30}];

  return(
    <>
      <Head><title>Log — Blitora Pulse</title></Head>
      <RoleGuard allow={[ROLES.PATIENT,ROLES.UNASSIGNED]}>
        {toast&&<div style={{position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",background:"rgba(13,27,62,.92)",border:"1px solid rgba(42,232,164,.4)",color:"#DFF7EC",borderRadius:13,padding:"10px 20px",fontSize:13,fontWeight:600,zIndex:999,backdropFilter:"blur(12px)",whiteSpace:"nowrap",boxShadow:"0 0 24px rgba(29,158,117,.3)"}}>{toast}</div>}
        <Layout>
          <div style={{padding:"24px 28px 60px",maxWidth:1000,margin:"0 auto"}}>
            <div style={{marginBottom:22}}>
              <h1 style={{fontSize:23,fontWeight:700,margin:0}}>Log Today 📋</h1>
              <p style={{fontSize:12.5,color:BGY,margin:"3px 0 0"}}>{new Date(dateKey+"T12:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})} · All in one place</p>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>

              {/* LEFT */}
              <div>
                {/* WATER */}
                <Card title="HYDRATION · TAP DROPS" dot={BLU}>
                  <div style={{background:"rgba(74,159,232,.1)",border:"1px solid rgba(74,159,232,.25)",borderRadius:13,padding:"11px 15px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><div style={{fontSize:12,fontWeight:700,color:BLU}}>1 glass = 250 ml</div><div style={{fontSize:10,color:BGY}}>Standard drinking glass</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:800,color:BLU}}>{glasses*250} ml</div><div style={{fontSize:10,color:BGY}}>today</div></div>
                  </div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:12}}>
                    {Array.from({length:waterGoal},(_,i)=>(
                      <div key={i} onClick={()=>saveWater(i<glasses?i:i+1)} style={{width:44,height:52,borderRadius:11,border:`2px solid ${i<glasses?BLU:BRD}`,background:i<glasses?"rgba(74,159,232,.18)":"rgba(255,255,255,.04)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:3,transition:"all .2s",transform:i<glasses?"scale(1.05)":"scale(1)"}}>
                        <span style={{fontSize:i<glasses?20:17,opacity:i<glasses?1:.3}}>💧</span>
                        <span style={{fontSize:8,fontWeight:700,color:i<glasses?BLU:BGY}}>{(i+1)*250}ml</span>
                      </div>
                    ))}
                  </div>
                  <div style={{height:7,background:"rgba(255,255,255,.08)",borderRadius:6,overflow:"hidden",marginBottom:8}}>
                    <div style={{height:"100%",width:`${Math.min(100,(glasses/waterGoal)*100)}%`,background:`linear-gradient(90deg,${BLU},#7FC3FF)`,borderRadius:6,transition:"width .4s"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:BGY}}>
                    <span>{glasses} of {waterGoal} glasses</span>
                    <span style={{color:glasses>=waterGoal?GL:BGY,fontWeight:glasses>=waterGoal?700:400}}>{glasses>=waterGoal?"✓ Goal reached!":` ${waterGoal-glasses} to go`}</span>
                  </div>
                </Card>

                {/* WALKS */}
                <Card title="WALK LOG">
                  {walkSlots.map(sl=>(
                    <div key={sl.key} style={{marginBottom:16}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                        <span style={{fontSize:12,fontWeight:600,color:"#C9D2E3"}}>{sl.icon} {sl.label}</span>
                        <span style={{fontSize:12,color:BGY}}>{walks[sl.key]}min</span>
                      </div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {[0,5,10,15,20,25,30,35,40,45,60].filter(t=>t<=sl.max).map(t=>(
                          <button key={t} onClick={()=>saveWalk(sl.key,t)} style={{padding:"5px 10px",borderRadius:999,border:`1.5px solid ${walks[sl.key]===t?GL:BRD}`,background:walks[sl.key]===t?"rgba(42,232,164,.18)":"transparent",color:walks[sl.key]===t?GL:BGY,fontSize:12,fontWeight:walks[sl.key]===t?700:400,cursor:"pointer"}}>{t}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </Card>

                {/* ACTIVITY */}
                <Card title="OTHER ACTIVITY · 2 TAPS">
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:16}}>
                    {ACTS.map((a,i)=>(
                      <div key={i} onClick={()=>setActIdx(i)} style={{background:actIdx===i?"rgba(29,158,117,.18)":"rgba(255,255,255,.04)",border:`1px solid ${actIdx===i?"rgba(42,232,164,.5)":BRD}`,borderRadius:14,padding:"11px 4px",textAlign:"center",cursor:"pointer",transition:".2s",boxShadow:actIdx===i?`0 0 14px rgba(29,158,117,.3)`:"none"}}>
                        <div style={{fontSize:19,marginBottom:5}}>{a.icon}</div>
                        <div style={{fontSize:10.5,fontWeight:600,color:actIdx===i?"#fff":BGY}}>{a.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:16,justifyContent:"center",marginBottom:10}}>
                    <button onClick={()=>setActMins(m=>Math.max(5,m-5))} style={{width:40,height:40,borderRadius:12,border:`1px solid ${BRD}`,background:"rgba(255,255,255,.06)",color:"#fff",fontSize:20,cursor:"pointer"}}>−</button>
                    <div style={{fontSize:28,fontWeight:700,minWidth:90,textAlign:"center"}}>{actMins}<span style={{fontSize:12,color:BGY,fontWeight:500}}> min</span></div>
                    <button onClick={()=>setActMins(m=>Math.min(120,m+5))} style={{width:40,height:40,borderRadius:12,border:`1px solid ${BRD}`,background:"rgba(255,255,255,.06)",color:"#fff",fontSize:20,cursor:"pointer"}}>+</button>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <p style={{fontSize:12,color:BGY}}>Est. <strong style={{color:AMB}}>{estKcal} kcal</strong> burned</p>
                    <SaveBtn onClick={saveActivity} saved={saved.act} label="⚡ Log activity"/>
                  </div>
                </Card>
              </div>

              {/* RIGHT: VITALS */}
              <div>
                <Card title="VITALS — WEIGHT · BP · BLOOD SUGAR">
                  <div style={{background:"rgba(29,158,117,.1)",border:"1px solid rgba(42,232,164,.2)",borderRadius:13,padding:"12px 15px",marginBottom:18,fontSize:12,color:"#BFE9D8",lineHeight:1.65}}>
                    📋 Log vitals in the morning before meals for most accurate readings. Your AI coach uses these to personalise your insights.
                  </div>

                  {/* Weight */}
                  <Input label="WEIGHT" unit="kg" value={weight} onChange={setWeight} placeholder="e.g. 78.4"
                    hint={profile?.weight_target?`Goal: ${profile.weight_target} kg${weight?` · ${(parseFloat(weight)-parseFloat(profile.weight_target)).toFixed(1)} kg to go`:""}`:null}/>
                  <div style={{marginBottom:18}}><SaveBtn onClick={saveWeight} saved={saved.w} label="Save weight"/></div>

                  {/* BP */}
                  <div style={{marginBottom:18}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10.5,color:BGY,fontWeight:600,letterSpacing:".5px",marginBottom:8}}>
                      <span>BLOOD PRESSURE (mmHg)</span>
                      {bps&&<span style={{color:bps.c,background:bps.c+"22",padding:"2px 8px",borderRadius:6,fontSize:10}}>{bps.t}</span>}
                    </div>
                    <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
                      <input type="number" inputMode="numeric" value={bp.systolic} onChange={e=>setBp(b=>({...b,systolic:e.target.value}))} placeholder="120" style={{flex:1,background:"rgba(255,255,255,.06)",border:`1px solid ${bp.systolic?"rgba(42,232,164,.4)":BRD}`,borderRadius:12,padding:"12px 14px",color:"#fff",fontSize:14,fontWeight:600,outline:"none"}}/>
                      <span style={{color:BGY,fontWeight:700,fontSize:16}}>/</span>
                      <input type="number" inputMode="numeric" value={bp.diastolic} onChange={e=>setBp(b=>({...b,diastolic:e.target.value}))} placeholder="80" style={{flex:1,background:"rgba(255,255,255,.06)",border:`1px solid ${bp.diastolic?"rgba(42,232,164,.4)":BRD}`,borderRadius:12,padding:"12px 14px",color:"#fff",fontSize:14,fontWeight:600,outline:"none"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <p style={{fontSize:10,color:BGY}}>Normal: &lt;120/80 · Elevated: 120–129 · High: ≥130/80</p>
                      <SaveBtn onClick={saveBP} saved={saved.bp} label="Save BP"/>
                    </div>
                  </div>

                  {/* Blood Sugar Fasting */}
                  <div style={{marginBottom:18}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10.5,color:BGY,fontWeight:600,letterSpacing:".5px",marginBottom:8}}>
                      <span>BLOOD SUGAR — FASTING</span>
                      {sfs&&<span style={{color:sfs.c,background:sfs.c+"22",padding:"2px 8px",borderRadius:6,fontSize:10}}>{sfs.t}</span>}
                    </div>
                    <Input label="" unit="mg/dL" value={sugar.fasting} onChange={v=>setSugar(s=>({...s,fasting:v}))} placeholder="e.g. 95" hint="Normal: &lt;100 · Pre-diabetic: 100–125 · High: ≥126"/>
                  </div>

                  {/* Blood Sugar Post-Meal */}
                  <div style={{marginBottom:18}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10.5,color:BGY,fontWeight:600,letterSpacing:".5px",marginBottom:8}}>
                      <span>BLOOD SUGAR — POST-MEAL (2h)</span>
                      {sps&&<span style={{color:sps.c,background:sps.c+"22",padding:"2px 8px",borderRadius:6,fontSize:10}}>{sps.t}</span>}
                    </div>
                    <Input label="" unit="mg/dL" value={sugar.postMeal} onChange={v=>setSugar(s=>({...s,postMeal:v}))} placeholder="e.g. 138" hint="Normal: &lt;140 · Pre-diabetic: 140–199 · High: ≥200"/>
                  </div>

                  <SaveBtn onClick={saveSugar} saved={saved.sg} label="Save blood sugar"/>

                  {/* Reference */}
                  <div style={{marginTop:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {[{label:"BP Normal",val:"< 120/80",c:G},{label:"BP High",val:"≥ 130/80",c:RED},{label:"Fasting OK",val:"< 100 mg/dL",c:G},{label:"Fasting High",val:"≥ 126 mg/dL",c:RED}].map(r=>(
                      <div key={r.label} style={{background:r.c+"12",border:`1px solid ${r.c}30`,borderRadius:10,padding:"8px 12px"}}>
                        <div style={{fontSize:9.5,color:BGY,fontWeight:600,letterSpacing:".4px",marginBottom:3}}>{r.label}</div>
                        <div style={{fontSize:13,fontWeight:700,color:r.c}}>{r.val}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </Layout>
      </RoleGuard>
    </>
  );
}
