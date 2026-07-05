// pages/clinic/patient/[id].js — Blitora Pulse · Dark Theme
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import RoleGuard from '../../../components/RoleGuard';
import { getSupabase } from '../../../lib/supabase';
import { useRole } from '../../../lib/useRole';

const G="#1D9E75",GL="#2AE8A4",AMB="#EF9F27",RED="#E06A5A",AI_C="#714B67",AI_L="#B07CA5";
const BRD="rgba(255,255,255,.09)",GLS="rgba(255,255,255,.045)",BGY="#8B97AD";

function MacroBar({label,val,max,color,unit="g"}){const p=Math.min(100,Math.round((val/max)*100));return(
  <div style={{marginBottom:14}}>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
      <span style={{color:"#C9D2E3",fontWeight:500}}>{label}</span>
      <span style={{fontWeight:700,color:p>100?RED:"#fff"}}>{val}{unit}<span style={{color:BGY,fontWeight:400}}> / {max}</span></span>
    </div>
    <div style={{height:8,background:"rgba(255,255,255,.08)",borderRadius:6,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${p}%`,background:color,borderRadius:6,transition:"width 1s cubic-bezier(.3,.8,.3,1)",boxShadow:`0 0 8px ${color}66`}}/>
    </div>
  </div>
);}

function bpStatus(s,d){if(!s||!d)return null;if(s<120&&d<80)return{t:"Normal",c:G};if(s<130&&d<80)return{t:"Elevated",c:AMB};return{t:"High",c:RED};}
function sugarStatus(v,fasting){if(!v)return null;const[a,b]=fasting?[100,126]:[140,200];if(v<a)return{t:"Normal",c:G};if(v<b)return{t:"Pre-diabetic",c:AMB};return{t:"High",c:RED};}
const fmt=d=>d.toISOString().split("T")[0];
const today=()=>fmt(new Date());

export default function PatientDetailPage(){
  return(<RoleGuard allow={['org_admin','dietitian','super_admin']}><Layout><PatientDetailView/></Layout></RoleGuard>);
}

function PatientDetailView(){
  const router=useRouter();const{id}=router.query;const{orgId}=useRole();
  const[patient,setPatient]=useState(null);
  const[log,setLog]=useState(null);
  const[dateKey,setDateKey]=useState(today());
  const[loading,setLoading]=useState(true);
  const[note,setNote]=useState('');
  const[noteSent,setNoteSent]=useState(false);
  const[aiDraft,setAiDraft]=useState(false);

  useEffect(()=>{if(id)loadPatient();},[id]);
  useEffect(()=>{if(id)loadLog();},[id,dateKey]);

  async function loadPatient(){const sb=getSupabase();const{data}=await sb.from('profiles').select('*').eq('id',id).single();setPatient(data);setLoading(false);}
  async function loadLog(){const sb=getSupabase();const{data}=await sb.from('health_logs').select('*').eq('user_id',id).eq('log_date',dateKey).maybeSingle();setLog(data||null);}

  function dayLabel(dk){const t=today(),y=fmt(new Date(Date.now()-86400000));if(dk===t)return'Today';if(dk===y)return'Yesterday';return new Date(dk).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});}
  function prev(){const d=new Date(dateKey);d.setDate(d.getDate()-1);setDateKey(fmt(d));}
  function next(){const d=new Date(dateKey);d.setDate(d.getDate()+1);if(fmt(d)<=today())setDateKey(fmt(d));}

  async function sendNote(){if(!note.trim())return;setNoteSent(true);setTimeout(()=>setNoteSent(false),2000);}
  async function draftNote(){
    setAiDraft(true);
    setTimeout(()=>{
      setNote(`Hi ${patient?.full_name?.split(' ')[0]||'there'} — you've been doing great this week! ${log?.weight_kg?`Your weight today is ${log.weight_kg} kg. `:''}${log?.bp_systolic?`BP reading of ${log.bp_systolic}/${log.bp_diastolic} looks ${bpStatus(log?.bp_systolic,log?.bp_diastolic)?.t?.toLowerCase()}. `:''}Keep logging consistently and your AI insights will get more personalised. Let me know if you have any questions! — Dt. ${orgId||''}`);
      setAiDraft(false);
    },1200);
  }

  const mac={cal:0,pro:0,carb:0,fat:0};
  const conds=patient?.conditions?Object.keys(patient.conditions).filter(k=>k!=='none'):[];
  const bp=bpStatus(log?.bp_systolic,log?.bp_diastolic);
  const sf=sugarStatus(log?.sugar_fasting,true);
  const sp=sugarStatus(log?.sugar_post_meal,false);
  const init=(patient?.full_name||'?').split(' ').map(w=>w[0]).slice(0,2).join('');
  const hasLogged=log&&Object.values(log.foods||{}).some(m=>Object.keys(m).length>0);

  if(loading)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:36,height:36,border:`3px solid ${G}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>);

  return(
    <div style={{padding:"24px 28px 60px",maxWidth:1100,margin:"0 auto"}}>
      {/* Back */}
      <button onClick={()=>router.push('/clinic/patients')} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:`1px solid ${BRD}`,color:BGY,borderRadius:11,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer",marginBottom:18}}>← Back to patients</button>

      {/* Patient header */}
      <div style={{background:GLS,border:`1px solid ${BRD}`,borderRadius:20,padding:20,backdropFilter:"blur(16px)",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:4}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(29,158,117,.22)",border:`1px solid rgba(42,232,164,.35)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:GL}}>{init}</div>
          <div style={{flex:1}}>
            <h2 style={{fontSize:20,fontWeight:700,margin:0}}>{patient?.full_name||'—'}</h2>
            <p style={{fontSize:12,color:BGY,margin:"3px 0 0"}}>{conds.length?conds.join(' · '):'No conditions'} · {patient?.meal_plan_type||'Standard plan'} · joined {patient?.created_at?new Date(patient.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):''}</p>
          </div>
          <div style={{display:"flex",gap:9}}>
            <button onClick={()=>alert('Edit meal plan — connect to meal editor')} style={{background:"rgba(255,255,255,.06)",border:`1px solid ${BRD}`,color:"#C9D2E3",borderRadius:11,padding:"9px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Edit plan</button>
            <button onClick={()=>alert('Export patient PDF report')} style={{background:`linear-gradient(120deg,${G},#16855f)`,border:"none",color:"#fff",borderRadius:11,padding:"9px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Export PDF</button>
          </div>
        </div>
        {/* Profile vitals summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:16}}>
          {[{l:"Start weight",v:patient?.weight_start?`${patient.weight_start} kg`:"—"},{l:"Goal weight",v:patient?.weight_target?`${patient.weight_target} kg`:"—"},{l:"Today's weight",v:log?.weight_kg?`${log.weight_kg} kg`:"Not logged"},{l:"Progress",v:(patient?.weight_start&&patient?.weight_target&&log?.weight_kg)?`${(parseFloat(patient.weight_start)-parseFloat(log.weight_kg)).toFixed(1)} kg lost`:"—"}].map(r=>(
            <div key={r.l} style={{background:"rgba(255,255,255,.04)",border:`1px solid ${BRD}`,borderRadius:12,padding:"10px 12px"}}>
              <div style={{fontSize:9.5,color:BGY,fontWeight:600,letterSpacing:".5px",marginBottom:4}}>{r.l.toUpperCase()}</div>
              <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{r.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Date nav */}
      <div style={{display:"flex",alignItems:"center",gap:10,background:GLS,border:`1px solid ${BRD}`,borderRadius:13,padding:"10px 16px",marginBottom:20,backdropFilter:"blur(12px)"}}>
        <button onClick={prev} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${BRD}`,background:"transparent",color:BGY,cursor:"pointer",fontSize:15}}>‹</button>
        <div style={{flex:1,textAlign:"center"}}>
          <div style={{fontSize:15,fontWeight:700}}>{dayLabel(dateKey)}</div>
          <div style={{fontSize:11,color:BGY}}>{new Date(dateKey+"T12:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>
        <button onClick={next} disabled={dateKey>=today()} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${BRD}`,background:"transparent",color:BGY,cursor:"pointer",fontSize:15,opacity:dateKey>=today()?.35:1}}>›</button>
      </div>

      {/* Main grid */}
      <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:20}}>

        {/* LEFT: Macros + log */}
        <div>
          <div style={{background:GLS,border:`1px solid ${BRD}`,borderRadius:20,padding:20,backdropFilter:"blur(16px)",marginBottom:20}}>
            <h3 style={{fontSize:13,fontWeight:600,color:"#DCE3F0",display:"flex",alignItems:"center",gap:8,marginBottom:16}}><span style={{width:7,height:7,borderRadius:"50%",background:GL,boxShadow:`0 0 8px ${GL}`,display:"inline-block"}}/>TODAY'S MACROS</h3>
            <MacroBar label="Calories" val={mac.cal} max={patient?.calorie_target||1600} color={G} unit=" kcal"/>
            <MacroBar label="Protein"  val={mac.pro} max={patient?.protein_target||100} color="#4A9FE8"/>
            <MacroBar label="Carbs"    val={mac.carb} max={patient?.carb_target||130} color={AMB}/>
            <MacroBar label="Fat"      val={mac.fat} max={patient?.fat_target||55} color={RED}/>
            <div style={{marginTop:14,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9}}>
              <div style={{background:"rgba(255,255,255,.04)",border:`1px solid ${BRD}`,borderRadius:11,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:9.5,color:BGY,marginBottom:4}}>WATER</div><div style={{fontSize:15,fontWeight:700,color:BRU||"#4A9FE8"}}>{log?.total_water_glasses||0}<span style={{fontSize:10,color:BGY}}> glasses</span></div></div>
              <div style={{background:"rgba(255,255,255,.04)",border:`1px solid ${BRD}`,borderRadius:11,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:9.5,color:BGY,marginBottom:4}}>WALK</div><div style={{fontSize:15,fontWeight:700,color:G}}>{(log?.walk_morning||0)+(log?.walk_afternoon||0)+(log?.walk_evening||0)}<span style={{fontSize:10,color:BGY}}> min</span></div></div>
              <div style={{background:"rgba(255,255,255,.04)",border:`1px solid ${BRD}`,borderRadius:11,padding:"10px 12px",textAlign:"center"}}><div style={{fontSize:9.5,color:BGY,marginBottom:4}}>STATUS</div><div style={{fontSize:13,fontWeight:700,color:hasLogged?GL:AMB}}>{hasLogged?"Logged ✓":"Not logged"}</div></div>
            </div>
          </div>

          {/* Vitals */}
          <div style={{background:GLS,border:`1px solid ${BRD}`,borderRadius:20,padding:20,backdropFilter:"blur(16px)"}}>
            <h3 style={{fontSize:13,fontWeight:600,color:"#DCE3F0",display:"flex",alignItems:"center",gap:8,marginBottom:16}}><span style={{width:7,height:7,borderRadius:"50%",background:GL,boxShadow:`0 0 8px ${GL}`,display:"inline-block"}}/>VITALS — {dayLabel(dateKey)}</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {/* BP */}
              <div style={{background:bp?bp.c+"15":"rgba(255,255,255,.04)",border:`1px solid ${bp?bp.c+"44":BRD}`,borderRadius:13,padding:"12px"}}>
                <div style={{fontSize:9.5,color:BGY,fontWeight:600,marginBottom:6,letterSpacing:".5px"}}>🩺 BP</div>
                {log?.bp_systolic?<><div style={{fontSize:18,fontWeight:700,color:bp?bp.c:"#fff"}}>{log.bp_systolic}/{log.bp_diastolic}<span style={{fontSize:9,color:BGY}}> mmHg</span></div>{bp&&<div style={{fontSize:9,color:bp.c,fontWeight:700,marginTop:2}}>{bp.t}</div>}</>:<div style={{fontSize:12,color:BGY}}>Not logged</div>}
              </div>
              {/* Sugar F */}
              <div style={{background:sf?sf.c+"15":"rgba(255,255,255,.04)",border:`1px solid ${sf?sf.c+"44":BRD}`,borderRadius:13,padding:"12px"}}>
                <div style={{fontSize:9.5,color:BGY,fontWeight:600,marginBottom:6,letterSpacing:".5px"}}>🩸 Fasting</div>
                {log?.sugar_fasting?<><div style={{fontSize:18,fontWeight:700,color:sf?sf.c:"#fff"}}>{log.sugar_fasting}<span style={{fontSize:9,color:BGY}}> mg/dL</span></div>{sf&&<div style={{fontSize:9,color:sf.c,fontWeight:700,marginTop:2}}>{sf.t}</div>}</>:<div style={{fontSize:12,color:BGY}}>Not logged</div>}
              </div>
              {/* Sugar PP */}
              <div style={{background:sp?sp.c+"15":"rgba(255,255,255,.04)",border:`1px solid ${sp?sp.c+"44":BRD}`,borderRadius:13,padding:"12px"}}>
                <div style={{fontSize:9.5,color:BGY,fontWeight:600,marginBottom:6,letterSpacing:".5px"}}>🩸 Post-meal</div>
                {log?.sugar_post_meal?<><div style={{fontSize:18,fontWeight:700,color:sp?sp.c:"#fff"}}>{log.sugar_post_meal}<span style={{fontSize:9,color:BGY}}> mg/dL</span></div>{sp&&<div style={{fontSize:9,color:sp.c,fontWeight:700,marginTop:2}}>{sp.t}</div>}</>:<div style={{fontSize:12,color:BGY}}>Not logged</div>}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Note + Today's meals */}
        <div>
          {/* Note */}
          <div style={{background:"linear-gradient(150deg,rgba(113,75,103,.22),rgba(113,75,103,.05))",border:"1px solid rgba(176,124,165,.35)",borderRadius:20,padding:20,backdropFilter:"blur(16px)",marginBottom:20}}>
            <h3 style={{fontSize:13,fontWeight:600,color:AI_L,display:"flex",alignItems:"center",gap:8,marginBottom:14}}><span style={{width:7,height:7,borderRadius:"50%",background:AI_L,boxShadow:`0 0 8px ${AI_L}`,display:"inline-block"}}/>SEND NOTE TO {(patient?.full_name||'PATIENT').split(' ')[0].toUpperCase()}</h3>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder={`Write a note for ${patient?.full_name?.split(' ')[0]||'this patient'}…`}
              style={{width:"100%",background:"rgba(255,255,255,.06)",border:`1px solid ${BRD}`,borderRadius:13,padding:"13px 15px",color:"#fff",fontSize:12.5,outline:"none",resize:"none",minHeight:90,lineHeight:1.65}}/>
            <div style={{display:"flex",gap:9,marginTop:12}}>
              <button onClick={sendNote} style={{background:`linear-gradient(120deg,${G},#16855f)`,color:"#fff",border:"none",borderRadius:11,padding:"10px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {noteSent?"✓ Sent!":"✉️ Send note"}
              </button>
              <button onClick={draftNote} disabled={aiDraft} style={{background:"linear-gradient(120deg,rgba(113,75,103,.5),rgba(113,75,103,.25))",border:"1px solid rgba(176,124,165,.4)",color:"#DDA8CF",borderRadius:11,padding:"10px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {aiDraft?"✦ Drafting…":"✦ AI draft"}
              </button>
            </div>
          </div>

          {/* Meal log summary */}
          <div style={{background:GLS,border:`1px solid ${BRD}`,borderRadius:20,padding:20,backdropFilter:"blur(16px)"}}>
            <h3 style={{fontSize:13,fontWeight:600,color:"#DCE3F0",display:"flex",alignItems:"center",gap:8,marginBottom:16}}><span style={{width:7,height:7,borderRadius:"50%",background:GL,boxShadow:`0 0 8px ${GL}`,display:"inline-block"}}/>MEAL LOG</h3>
            {hasLogged?(
              [['Morning','7:00 AM','☀️'],['Breakfast','8:00 AM','🍳'],['Mid-morning','11:00 AM','☕'],['Lunch','1:00 PM','🍽️'],['Evening snack','4:30 PM','🌆'],['Dinner','7:30 PM','🌙']].map(([name,time,icon])=>{
                const id=name.toLowerCase().replace(' ',).replace('-','');
                const sel=log?.foods?.[id]||{};const n=Object.keys(sel).length;
                return(<div key={name} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:n>0?G:"rgba(255,255,255,.15)",border:`1.5px solid ${n>0?GL:"rgba(255,255,255,.2)"}`,flexShrink:0}}/>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{icon} {name}</div><div style={{fontSize:11,color:BGY}}>{time}</div></div>
                  <div style={{fontSize:11,fontWeight:700,color:n>0?GL:BGY}}>{n>0?`${n} item${n>1?"s":""}`:""}</div>
                </div>);
              })
            ):(
              <div style={{textAlign:"center",padding:"24px 0",color:BGY}}>
                <div style={{fontSize:28,marginBottom:8}}>🍽️</div>
                <div style={{fontWeight:600}}>{dayLabel(dateKey)}: No meals logged</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
