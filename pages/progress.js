import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",A="#EF9F27",T="#00a09d";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7",CARD="#fff",R="#E24B4A";

function fmt(d){return d.toISOString().split("T")[0];}
function today(){return fmt(new Date());}
function daysAgo(n){const d=new Date();d.setDate(d.getDate()-n);return fmt(d);}

function BarChart({data,color,target,height=80,unit=""}){
  if(!data.length)return<div style={{height,display:"flex",alignItems:"center",justifyContent:"center",color:TXT3,fontSize:12}}>No data</div>;
  const max=Math.max(...data.map(d=>d.val),target||0,1);
  return(
    <div>
      <div style={{display:"flex",alignItems:"flex-end",gap:3,height}}>
        {data.map((d,i)=>{
          const h=Math.round((d.val/max)*height);
          const isOver=target&&d.val>target*1.1;
          return(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              {d.val>0&&<div style={{fontSize:8,color:TXT2,textAlign:"center"}}>{d.val}</div>}
              <div style={{width:"100%",background:isOver?R:color,borderRadius:"3px 3px 0 0",height:`${h}px`,minHeight:d.val>0?3:0,opacity:.85,transition:"height .3s"}}/>
            </div>
          );
        })}
      </div>
      {target&&<div style={{position:"relative",marginTop:2}}>
        <div style={{borderTop:`1.5px dashed ${TXT3}`,position:"absolute",top:-height-2,left:0,right:0,opacity:.5}}/>
      </div>}
      <div style={{display:"flex",gap:3,marginTop:4}}>
        {data.map((d,i)=><div key={i} style={{flex:1,fontSize:8,color:TXT3,textAlign:"center"}}>{d.label}</div>)}
      </div>
    </div>
  );
}

function LineChart({data,color,height=80}){
  if(data.length<2)return<div style={{height,display:"flex",alignItems:"center",justifyContent:"center",color:TXT3,fontSize:12}}>Need more data</div>;
  const vals=data.map(d=>d.val).filter(v=>v>0);
  if(!vals.length)return<div style={{height,display:"flex",alignItems:"center",justifyContent:"center",color:TXT3,fontSize:12}}>No data yet</div>;
  const min=Math.min(...vals)-1,max=Math.max(...vals)+1,range=max-min||1;
  const W=300,H=height;
  const pts=data.map((d,i)=>({x:i*(W/(data.length-1)),y:d.val?H-Math.round(((d.val-min)/range)*(H-10))-5:null}));
  const path=pts.filter(p=>p.y!==null).map((p,i,arr)=>(i===0?"M":"L")+`${p.x},${p.y}`).join(" ");
  return(
    <div style={{overflowX:"auto"}}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
        {pts.filter(p=>p.y!==null).map((p,i)=>(
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={color}/>
        ))}
        {data.map((d,i)=>(
          <text key={i} x={i*(W/(data.length-1))} y={H} fontSize={7} fill={TXT3} textAnchor="middle">{d.label}</text>
        ))}
      </svg>
    </div>
  );
}

const RANGES=[{id:"7",label:"7 days"},{id:"14",label:"14 days"},{id:"30",label:"30 days"},{id:"custom",label:"Custom"}];

export default function Progress(){
  const router=useRouter();
  const [profile,setProfile]=useState(null);
  const [logs,setLogs]=useState([]);
  const [range,setRange]=useState("7");
  const [customFrom,setCustomFrom]=useState(daysAgo(30));
  const [customTo,setCustomTo]=useState(today());
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState("overview");

  useEffect(()=>{
    async function init(){
      const sb=getSupabase();
      const{data:{session}}=await sb.auth.getSession();
      if(!session){router.push("/login");return;}
      const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
      if(!p||p.status==="pending"){router.push("/pending");return;}
      if(!p.setup_complete){router.push("/setup");return;}
      setProfile(p);
    }
    init();
  },[]);

  useEffect(()=>{if(profile)loadLogs();},[profile,range,customFrom,customTo]);

  async function loadLogs(){
    setLoading(true);
    const sb=getSupabase();
    let from=range==="7"?daysAgo(6):range==="14"?daysAgo(13):range==="30"?daysAgo(29):customFrom;
    let to=range==="custom"?customTo:today();
    const{data}=await sb.from("health_logs").select("*").eq("user_id",profile.id).gte("log_date",from).lte("log_date",to).order("log_date",{ascending:true});
    setLogs(data||[]);
    setLoading(false);
  }

  function getMac(log){
    const foods_db=[];
    const ids=Object.values(log.foods||{}).flatMap(m=>Object.keys(m));
    return ids.reduce((a)=>a,{cal:0,pro:0,carb:0,fat:0});
  }

  const processed=logs.map(l=>{
    const ids=Object.values(l.foods||{}).flatMap(m=>Object.keys(m));
    const short=new Date(l.log_date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}).replace(" ","");
    const dayShort=new Date(l.log_date).toLocaleDateString("en-IN",{weekday:"short"});
    return{
      date:l.log_date,
      label:range==="7"?dayShort:short,
      cal:l.foods?Object.values(l.foods).flatMap(m=>Object.keys(m)).length*0:0,
      water:(l.water||0)*0.5,
      weight:l.weight||null,
      habDone:Object.values(l.habits||{}).filter(Boolean).length,
      mealsDone:Object.values(l.foods||{}).filter(m=>Object.keys(m).length>0).length,
      walkTotal:Object.values(l.activity||{}).reduce((s,v)=>s+v,0),
    };
  });

  const daysLogged=processed.length;
  const avgWater=daysLogged?+(processed.reduce((s,d)=>s+d.water,0)/daysLogged).toFixed(1):0;
  const avgHab=daysLogged?+(processed.reduce((s,d)=>s+d.habDone,0)/daysLogged).toFixed(1):0;
  const avgWalk=daysLogged?Math.round(processed.reduce((s,d)=>s+d.walkTotal,0)/daysLogged):0;
  const weights=processed.filter(d=>d.weight);
  const startW=weights.length?weights[0].weight:profile?.weight_start;
  const latestW=weights.length?weights[weights.length-1].weight:null;
  const lost=startW&&latestW?+(startW-latestW).toFixed(1):null;

  if(!profile)return<div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:36,height:36,border:`3px solid ${BORDER}`,borderTopColor:P,borderRadius:"50%",animation:"spin .7s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return(
    <>
      <Head><title>Progress — Health Tracker</title></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${BG};font-family:'Inter',system-ui,sans-serif;color:${TXT}}
        .topbar{background:${CARD};border-bottom:1px solid ${BORDER};padding:0 16px;height:52px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:20}
        .main{max-width:720px;margin:0 auto;padding:14px 14px 90px}
        .card{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:14px;margin-bottom:12px}
        .card-title{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
        .range-btns{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
        .rbtn{padding:6px 14px;border-radius:20px;border:1px solid ${BORDER};font-size:12px;font-weight:600;color:${TXT2};background:transparent;cursor:pointer;font-family:inherit}
        .rbtn.on{border-color:${P};background:${PL};color:${P}}
        .stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px}
        .stat{background:${CARD};border-radius:12px;border:1px solid ${BORDER};padding:12px 14px}
        .stat-val{font-size:20px;font-weight:700;margin-bottom:3px;line-height:1}
        .stat-lbl{font-size:11px;color:${TXT2}}
        .stat-sub{font-size:10px;color:${TXT3};margin-top:2px}
        .tabs{display:flex;gap:6px;margin-bottom:14px;overflow-x:auto}
        .tab{padding:6px 14px;border-radius:20px;border:1px solid ${BORDER};font-size:11px;font-weight:600;cursor:pointer;background:transparent;color:${TXT2};font-family:inherit;white-space:nowrap}
        .tab.on{border-color:${P};background:${PL};color:${P}}
        .table-wrap{overflow-x:auto;border-radius:12px;border:1px solid ${BORDER}}
        table{width:100%;border-collapse:collapse;font-size:11px;min-width:400px}
        th{padding:9px 12px;text-align:left;color:${TXT2};font-size:10px;text-transform:uppercase;letter-spacing:.04em;background:#faf9fd;border-bottom:1px solid ${BORDER};white-space:nowrap}
        td{padding:9px 12px;border-bottom:1px solid ${BORDER}}
        tr:last-child td{border-bottom:none}
        tr:nth-child(even){background:#fafafa}
        .badge{display:inline-flex;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
        .bottomnav{position:fixed;bottom:0;left:0;right:0;background:${CARD};border-top:1px solid ${BORDER};display:flex;z-index:20;max-width:720px;margin:0 auto}
        .navbtn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border:none;background:none;cursor:pointer;font-size:9px;font-weight:500;font-family:inherit}
        @media(min-width:768px){.bottomnav{display:none}.main{padding-left:24px;padding-right:24px}}
        @media(max-width:480px){.stat-grid{grid-template-columns:1fr}}
      `}</style>

      <div className="topbar">
        <div style={{width:32,height:32,background:P,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14}}>H</div>
        <span style={{fontSize:13,fontWeight:700,color:P}}>Health Tracker</span>
        <span style={{color:BORDER,fontSize:18}}>|</span>
        <span style={{fontSize:12,color:TXT2}}>Progress</span>
        <div style={{flex:1}}/>
        <button onClick={()=>router.push("/profile")} style={{width:32,height:32,borderRadius:"50%",background:PL,border:"none",cursor:"pointer",color:P,fontWeight:700,fontSize:13}}>{profile.full_name?.[0]||"A"}</button>
      </div>

      <div className="main">
        {/* RANGE */}
        <div className="range-btns">
          {RANGES.map(r=><button key={r.id} className={`rbtn${range===r.id?" on":""}`} onClick={()=>setRange(r.id)}>{r.label}</button>)}
        </div>
        {range==="custom"&&(
          <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
            <div><label style={{fontSize:11,color:TXT2,display:"block",marginBottom:3}}>From</label>
              <input type="date" value={customFrom} max={customTo} onChange={e=>setCustomFrom(e.target.value)} style={{padding:"7px 10px",borderRadius:8,border:`1px solid ${BORDER}`,fontSize:12,color:TXT,outline:"none"}}/></div>
            <div><label style={{fontSize:11,color:TXT2,display:"block",marginBottom:3}}>To</label>
              <input type="date" value={customTo} max={today()} min={customFrom} onChange={e=>setCustomTo(e.target.value)} style={{padding:"7px 10px",borderRadius:8,border:`1px solid ${BORDER}`,fontSize:12,color:TXT,outline:"none"}}/></div>
          </div>
        )}

        {/* SUMMARY STATS */}
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-val" style={{color:P}}>{daysLogged}</div>
            <div className="stat-lbl">Days logged</div>
            <div className="stat-sub">out of {range==="7"?7:range==="14"?14:range==="30"?30:"custom"} days</div>
          </div>
          <div className="stat">
            <div className="stat-val" style={{color:"#38bdf8"}}>{avgWater}L</div>
            <div className="stat-lbl">Avg water / day</div>
            <div className="stat-sub">Target: {profile.water_target||3.5}L</div>
          </div>
          <div className="stat">
            <div className="stat-val" style={{color:G}}>{avgHab}/5</div>
            <div className="stat-lbl">Avg habits / day</div>
            <div className="stat-sub">{Math.round((avgHab/5)*100)}% compliance</div>
          </div>
          <div className="stat">
            <div className="stat-val" style={{color:A}}>{avgWalk} min</div>
            <div className="stat-lbl">Avg walk / day</div>
            <div className="stat-sub">Target: 75 min</div>
          </div>
          {lost!==null&&(
            <div className="stat" style={{gridColumn:"1/-1",borderColor:G}}>
              <div className="stat-val" style={{color:G}}>{lost>0?"-":""}{Math.abs(lost)} kg</div>
              <div className="stat-lbl">Weight {lost>0?"lost":"gained"} in this period</div>
              <div className="stat-sub">{startW}kg → {latestW}kg · Target: {profile.weight_target}kg</div>
              {profile.weight_start&&profile.weight_target&&(
                <div style={{marginTop:8,height:5,background:BORDER,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",background:G,borderRadius:3,width:`${Math.min(100,Math.max(0,Math.round(((profile.weight_start-(latestW||profile.weight_start))/(profile.weight_start-profile.weight_target))*100)))}%`}}/>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TABS */}
        <div className="tabs">
          {[["overview","Overview"],["weight","Weight"],["water","Water"],["habits","Habits"],["table","Daily table"]].map(([id,lbl])=>(
            <button key={id} className={`tab${tab===id?" on":""}`} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>

        {loading&&<div style={{textAlign:"center",padding:"32px 0",color:TXT2,fontSize:13}}>Loading data…</div>}

        {!loading&&processed.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:TXT2,fontSize:13}}>No data logged in this period yet.<br/>Start logging from the Dashboard or Meals page.</div>}

        {!loading&&processed.length>0&&<>
          {tab==="overview"&&(
            <>
              <div className="card">
                <div className="card-title">Water intake (litres)</div>
                <BarChart data={processed.map(d=>({val:d.water,label:d.label}))} color="#38bdf8" target={profile.water_target||3.5} height={80}/>
                <div style={{fontSize:10,color:TXT2,marginTop:6}}>Dashed line = {profile.water_target||3.5}L target · Red bars = exceeded limit</div>
              </div>
              <div className="card">
                <div className="card-title">Walk minutes / day</div>
                <BarChart data={processed.map(d=>({val:d.walkTotal,label:d.label}))} color={G} target={75} height={80}/>
              </div>
              <div className="card">
                <div className="card-title">Habits completed / day (out of 5)</div>
                <BarChart data={processed.map(d=>({val:d.habDone,label:d.label}))} color={P} height={80}/>
              </div>
              <div className="card">
                <div className="card-title">Meals logged / day (out of 6)</div>
                <BarChart data={processed.map(d=>({val:d.mealsDone,label:d.label}))} color={A} height={80}/>
              </div>
            </>
          )}

          {tab==="weight"&&(
            <div className="card">
              <div className="card-title">Weight trend (kg)</div>
              {weights.length>0?(
                <>
                  <LineChart data={processed.map(d=>({val:d.weight,label:d.label}))} color={P} height={100}/>
                  <div style={{display:"flex",gap:16,marginTop:12,fontSize:12,flexWrap:"wrap"}}>
                    <span style={{color:TXT2}}>Start: <b style={{color:TXT}}>{profile.weight_start}kg</b></span>
                    <span style={{color:TXT2}}>Latest: <b style={{color:TXT}}>{latestW}kg</b></span>
                    {lost>0&&<span style={{color:TXT2}}>Lost: <b style={{color:G}}>{lost}kg</b></span>}
                    <span style={{color:TXT2}}>Target: <b style={{color:P}}>{profile.weight_target}kg</b></span>
                  </div>
                </>
              ):<div style={{padding:"20px 0",textAlign:"center",color:TXT2,fontSize:13}}>No weight entries yet. Log your weight from the Dashboard.</div>}
            </div>
          )}

          {tab==="water"&&(
            <div className="card">
              <div className="card-title">Water intake — {avgWater}L avg</div>
              <BarChart data={processed.map(d=>({val:d.water,label:d.label}))} color="#38bdf8" target={profile.water_target||3.5} height={100}/>
              <div style={{marginTop:12}}>
                {[{l:"Days at target",v:processed.filter(d=>d.water>=(profile.water_target||3.5)).length,c:G},{l:"Days below target",v:processed.filter(d=>d.water>0&&d.water<(profile.water_target||3.5)).length,c:A},{l:"Days not logged",v:processed.filter(d=>d.water===0).length,c:TXT3}].map((s,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${BORDER}`,fontSize:12}}>
                    <span style={{color:TXT2}}>{s.l}</span><b style={{color:s.c}}>{s.v} days</b>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab==="habits"&&(
            <div className="card">
              <div className="card-title">Habit compliance</div>
              <BarChart data={processed.map(d=>({val:d.habDone,label:d.label}))} color={P} height={100}/>
              <div style={{marginTop:12,fontSize:12}}>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${BORDER}`}}>
                  <span style={{color:TXT2}}>Perfect days (5/5)</span><b style={{color:G}}>{processed.filter(d=>d.habDone===5).length}</b>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${BORDER}`}}>
                  <span style={{color:TXT2}}>Good days (4/5)</span><b style={{color:G}}>{processed.filter(d=>d.habDone===4).length}</b>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}>
                  <span style={{color:TXT2}}>Below target (under 4)</span><b style={{color:A}}>{processed.filter(d=>d.habDone<4).length}</b>
                </div>
              </div>
            </div>
          )}

          {tab==="table"&&(
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Meals</th><th>Water</th><th>Walk</th><th>Habits</th><th>Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {processed.map((d,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:500,whiteSpace:"nowrap"}}>{new Date(d.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</td>
                      <td><span className="badge" style={{background:d.mealsDone>=4?GL:"#faf9fd",color:d.mealsDone>=4?G:TXT2}}>{d.mealsDone}/6</span></td>
                      <td style={{color:d.water>=(profile.water_target||3.5)?G:d.water>0?A:TXT3,fontWeight:600}}>{d.water}L</td>
                      <td style={{color:d.walkTotal>=40?G:TXT2}}>{d.walkTotal}m</td>
                      <td><span className="badge" style={{background:d.habDone>=4?GL:d.habDone>=3?"#faeeda":"#faf9fd",color:d.habDone>=4?G:d.habDone>=3?A:TXT2}}>{d.habDone}/5</span></td>
                      <td style={{color:TXT,fontWeight:d.weight?500:300}}>{d.weight?`${d.weight}kg`:"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>}
      </div>

      <div className="bottomnav">
        {[["Dashboard","🏠","/dashboard"],["Meals","🍽️","/meals"],["Progress","📊","/progress"],["Reports","📋","/reports"],["Profile","👤","/profile"]].map(([lbl,ico,href])=>(
          <button key={href} className="navbtn" onClick={()=>router.push(href)} style={{color:href==="/progress"?P:TXT3}}>
            <span style={{fontSize:20}}>{ico}</span>{lbl}
          </button>
        ))}
      </div>
    </>
  );
}
