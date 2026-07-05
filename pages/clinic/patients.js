// pages/clinic/patients.js — Blitora Pulse · Dark Theme · Dietitian View
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import RoleGuard from '../../components/RoleGuard';
import { getSupabase } from '../../lib/supabase';
import { useRole } from '../../lib/useRole';
import Link from 'next/link';

const G="#1D9E75",GL="#2AE8A4",AMB="#EF9F27",RED="#E06A5A",BLU="#4A9FE8";
const BRD="rgba(255,255,255,.09)",GLS="rgba(255,255,255,.045)",BGY="#8B97AD";

const MACROS_COLORS=[G,BLU,AMB,RED];

function ComplianceBadge({status}){
  const cfg={logged:{bg:"rgba(29,158,117,.22)",c:GL,brd:"rgba(42,232,164,.4)",t:"Logged ✓"},partial:{bg:"rgba(239,159,39,.18)",c:AMB,brd:"rgba(239,159,39,.4)",t:"Partial"},silent:{bg:"rgba(224,106,90,.18)",c:RED,brd:"rgba(224,106,90,.4)",t:"Not logged"},inactive:{bg:"rgba(139,151,173,.15)",c:BGY,brd:"rgba(139,151,173,.3)",t:"Inactive"}}[status]||{bg:"rgba(139,151,173,.15)",c:BGY,brd:"rgba(139,151,173,.3)",t:"—"};
  return<span style={{fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:999,background:cfg.bg,color:cfg.c,border:`1px solid ${cfg.brd}`,letterSpacing:".4px"}}>{cfg.t}</span>;
}

export default function PatientsPage(){
  return(<RoleGuard allow={['org_admin','dietitian','super_admin']}><Layout><PatientsView/></Layout></RoleGuard>);
}

function PatientsView(){
  const router=useRouter();
  const{orgId,role}=useRole();
  const[patients,setPatients]=useState([]);
  const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState('');
  const[filter,setFilter]=useState('all');
  const[stats,setStats]=useState({total:0,logged:0,compliance:0,silent:0});

  useEffect(()=>{if(orgId)loadPatients();},[orgId]);

  async function loadPatients(){
    const sb=getSupabase();setLoading(true);
    const{data:members}=await sb.from('organisation_members').select('user_id,role,joined_at').eq('org_id',orgId).eq('role','patient').eq('is_active',true);
    if(!members||!members.length){setLoading(false);return;}
    const ids=members.map(m=>m.user_id);
    const today=new Date().toISOString().split('T')[0];
    const[{data:profiles},{data:logs}]=await Promise.all([
      sb.from('profiles').select('id,full_name,email,status,setup_complete,conditions,meal_plan_type,weight_start,weight_target').in('id',ids),
      sb.from('health_logs').select('user_id,log_date,foods,water,weight_kg,bp_systolic,sugar_fasting').in('user_id',ids).eq('log_date',today)
    ]);
    const logMap=Object.fromEntries((logs||[]).map(l=>[l.user_id,l]));
    const list=(profiles||[]).map(p=>{
      const log=logMap[p.id];
      const foods=log?.foods||{};
      const mealCount=Object.values(foods).filter(m=>Object.keys(m).length>0).length;
      const status=!log?'silent':mealCount>=3?'logged':mealCount>0?'partial':'silent';
      const macPct=[Math.min(100,mealCount*15),Math.min(100,(log?.water||0)*12),Math.min(100,log?.weight_kg?100:0),Math.min(100,log?.bp_systolic?100:0)];
      return{...p,status,mealCount,macPct,hasVitals:!!(log?.weight_kg||log?.bp_systolic||log?.sugar_fasting)};
    });
    setPatients(list);
    const logged=list.filter(p=>p.status==='logged').length;
    const silent=list.filter(p=>p.status==='silent').length;
    setStats({total:list.length,logged,compliance:list.length?Math.round((logged/list.length)*100):0,silent});
    setLoading(false);
  }

  const filtered=patients.filter(p=>{
    const q=search.toLowerCase();
    const matchQ=!q||(p.full_name||'').toLowerCase().includes(q)||(p.email||'').toLowerCase().includes(q);
    const matchF=filter==='all'||p.status===filter;
    return matchQ&&matchF;
  });

  return(
    <div style={{padding:"24px 28px 60px",maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:22}}>
        <div>
          <h1 style={{fontSize:23,fontWeight:700,margin:0}}>🩺 My Patients</h1>
          <p style={{fontSize:12.5,color:BGY,margin:"3px 0 0"}}>Today's compliance overview · {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</p>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:10}}>
          <Link href="/org/invite" style={{background:`linear-gradient(120deg,${G},#16855f)`,color:"#fff",borderRadius:11,padding:"10px 18px",fontSize:13,fontWeight:600,textDecoration:"none",boxShadow:`0 4px 16px rgba(29,158,117,.35)`}}>+ Invite patient</Link>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
        {[{icon:"👥",v:stats.total,l:"Active patients",c:G},{icon:"✅",v:stats.logged,l:"Logged today",c:GL},{icon:"📊",v:`${stats.compliance}%`,l:"Compliance",c:BLU},{icon:"⚠️",v:stats.silent,l:"Need attention",c:RED}].map(s=>(
          <div key={s.l} style={{background:"linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02))",border:`1px solid ${BRD}`,borderRadius:17,padding:16}}>
            <div style={{fontSize:17,marginBottom:9}}>{s.icon}</div>
            <div style={{fontSize:24,fontWeight:800,color:"#fff"}}>{s.v}</div>
            <div style={{fontSize:11,color:BGY,fontWeight:500,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{display:"flex",gap:12,marginBottom:18}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search patients by name or email…"
          style={{flex:1,background:"rgba(255,255,255,.06)",border:`1px solid ${BRD}`,borderRadius:13,padding:"12px 16px",color:"#fff",fontSize:13,outline:"none"}}/>
        {['all','logged','partial','silent'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"10px 16px",borderRadius:11,border:`1px solid ${filter===f?"rgba(42,232,164,.4)":BRD}`,background:filter===f?"rgba(29,158,117,.18)":"rgba(255,255,255,.04)",color:filter===f?GL:BGY,fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>
            {f==='all'?'All':f}
          </button>
        ))}
      </div>

      {/* Patient list */}
      {loading?(
        <div style={{display:"flex",justifyContent:"center",padding:60}}><div style={{width:36,height:36,border:`3px solid ${G}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>
      ):(
        <div style={{display:"grid",gap:10}}>
          {filtered.map(p=>{
            const init=(p.full_name||'?').split(' ').map(w=>w[0]).slice(0,2).join('');
            const conds=p.conditions?Object.keys(p.conditions).filter(k=>k!=='none'):[];
            return(
              <div key={p.id} onClick={()=>router.push(`/clinic/patient/${p.id}`)} style={{display:"grid",gridTemplateColumns:"50px 1.4fr 1fr 1fr auto auto",gap:16,alignItems:"center",background:"rgba(255,255,255,.04)",border:`1px solid ${BRD}`,borderRadius:16,padding:"14px 18px",cursor:"pointer",transition:"all .2s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(42,232,164,.35)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor=BRD}>
                {/* Avatar */}
                <div style={{width:46,height:46,borderRadius:"50%",background:`rgba(29,158,117,.22)`,border:`1px solid rgba(42,232,164,.3)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:GL}}>{init}</div>
                {/* Name */}
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:"#fff"}}>{p.full_name||'—'}</div>
                  <div style={{fontSize:11,color:BGY}}>{conds.length?conds.slice(0,2).join(' · '):'No conditions'} · {p.meal_plan_type||'Standard plan'}</div>
                </div>
                {/* Mini bars */}
                <div>
                  <div style={{display:"flex",gap:4,alignItems:"flex-end",height:28,marginBottom:4}}>
                    {p.macPct.map((v,i)=><div key={i} style={{width:8,borderRadius:3,background:MACROS_COLORS[i],height:`${Math.max(6,v*.28)}px`,opacity:.85}}/>)}
                  </div>
                  <div style={{fontSize:10,color:BGY}}>Meals · Water · Weight · BP</div>
                </div>
                {/* Vitals */}
                <div style={{fontSize:11,color:p.hasVitals?GL:BGY,fontWeight:600}}>{p.hasVitals?"Vitals ✓":"No vitals"}</div>
                {/* Badge */}
                <ComplianceBadge status={p.status}/>
                {/* Arrow */}
                <div style={{color:BGY,fontSize:18}}>›</div>
              </div>
            );
          })}
          {filtered.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:BGY}}>
              <div style={{fontSize:32,marginBottom:12}}>👥</div>
              <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>{search?"No patients match your search":"No patients yet"}</div>
              <div style={{fontSize:12}}>Invite patients using the button above</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
