import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";
import Layout from "../components/Layout";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",A="#EF9F27",R="#E24B4A";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7",CARD="#fff";

function fmt(d){return d.toISOString().split("T")[0];}
function today(){return fmt(new Date());}
function daysAgo(n){const d=new Date();d.setDate(d.getDate()-n);return fmt(d);}

function BarChart({data,color,target,height=80}){
  if(!data.length)return<div style={{height,display:"flex",alignItems:"center",justifyContent:"center",color:TXT3,fontSize:12}}>No data</div>;
  const max=Math.max(...data.map(d=>d.val),target||0,1);
  return(
    <div>
      <div style={{display:"flex",alignItems:"flex-end",gap:3,height}}>
        {data.map((d,i)=>{
          const h=Math.round((d.val/max)*height);
          return(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              {d.val>0&&<div style={{fontSize:8,color:TXT2,textAlign:"center",lineHeight:1}}>{d.val}</div>}
              <div style={{width:"100%",background:target&&d.val>target*1.05?R:color,borderRadius:"3px 3px 0 0",height:`${h}px`,minHeight:d.val>0?3:0,opacity:.85}}/>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:3,marginTop:4}}>
        {data.map((d,i)=><div key={i} style={{flex:1,fontSize:8,color:TXT3,textAlign:"center"}}>{d.label}</div>)}
      </div>
    </div>
  );
}

function LineChart({data,color,height=80}){
  const vals=data.map(d=>d.val).filter(v=>v>0);
  if(vals.length<2)return<div style={{height,display:"flex",alignItems:"center",justifyContent:"center",color:TXT3,fontSize:12}}>Log weight on more days to see trend</div>;
  const min=Math.min(...vals)-0.5,max=Math.max(...vals)+0.5,range=max-min||1;
  const W=300,H=height;
  const pts=data.map((d,i)=>({x:i*(W/Math.max(data.length-1,1)),y:d.val?H-Math.round(((d.val-min)/range)*(H-16))-8:null,label:d.label,val:d.val}));
  const valid=pts.filter(p=>p.y!==null);
  const path=valid.map((p,i)=>(i===0?"M":"L")+`${p.x},${p.y}`).join(" ");
  return(
    <div style={{overflowX:"auto"}}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block"}}>
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
        {valid.map((p,i)=>(
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} fill={color}/>
            <text x={p.x} y={p.y-6} fontSize={7} fill={TXT2} textAnchor="middle">{p.val}</text>
          </g>
        ))}
        {data.map((d,i)=>(
          <text key={i} x={i*(W/Math.max(data.length-1,1))} y={H} fontSize={7} fill={TXT3} textAnchor="middle">{d.label}</text>
        ))}
      </svg>
    </div>
  );
}

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
    const from=range==="7"?daysAgo(6):range==="14"?daysAgo(13):range==="30"?daysAgo(29):customFrom;
    const to=range==="custom"?customTo:today();
    const{data}=await getSupabase().from("health_logs").select("*").eq("user_id",profile.id).gte("log_date",from).lte("log_date",to).order("log_date",{ascending:true});
    setLogs(data||[]);setLoading(false);
  }

  const processed=logs.map(l=>{
    const dayShort=new Date(l.log_date).toLocaleDateString("en-IN",{weekday:"short"});
    const dateShort=new Date(l.log_date).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    return{
      date:l.log_date,
      label:range==="7"?dayShort:dateShort,
      water:(l.water||0)*0.5,
      weight:l.weight||null,
      habDone:Object.values(l.habits||{}).filter(Boolean).length,
      mealsDone:Object.values(l.foods||{}).filter(m=>Object.keys(m).length>0).length,
      walkTotal:Object.values(l.activity||{}).reduce((s,v)=>s+v,0),
    };
  });

  const n=processed.length;
  const avg=(key)=>n?+(processed.reduce((s,d)=>s+(d[key]||0),0)/n).toFixed(1):0;
  const avgWater=avg("water");
  const avgHab=avg("habDone");
  const avgWalk=Math.round(avg("walkTotal"));
  const avgMeals=avg("mealsDone");
  const weights=processed.filter(d=>d.weight);
  const startW=weights.length?weights[0].weight:profile?.weight_start;
  const latestW=weights.length?weights[weights.length-1].weight:null;
  const lost=startW&&latestW?+(startW-latestW).toFixed(1):null;

  if(!profile)return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,border:`3px solid ${BORDER}`,borderTopColor:P,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <>
      <Head><title>Progress — Health Tracker</title></Head>
      <style>{`
        .card{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:14px;margin-bottom:12px}
        .ctitle{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
        .rbtns{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
        .rbtn{padding:6px 14px;border-radius:20px;border:1px solid ${BORDER};font-size:12px;font-weight:600;color:${TXT2};background:transparent;cursor:pointer;font-family:inherit}
        .rbtn.on{border-color:${P};background:${PL};color:${P}}
        .sgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px}
        .scard{background:${CARD};border-radius:12px;border:1px solid ${BORDER};padding:12px 14px}
        .tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
        .tab{padding:6px 14px;border-radius:20px;border:1px solid ${BORDER};font-size:11px;font-weight:600;cursor:pointer;background:transparent;color:${TXT2};font-family:inherit}
        .tab.on{border-color:${P};background:${PL};color:${P}}
        .twrap{overflow-x:auto;border-radius:12px;border:1px solid ${BORDER}}
        table{width:100%;border-collapse:collapse;font-size:11px;min-width:380px}
        th{padding:9px 12px;text-align:left;color:${TXT2};font-size:10px;text-transform:uppercase;background:#faf9fd;border-bottom:1px solid ${BORDER}}
        td{padding:9px 12px;border-bottom:1px solid ${BORDER}}
        tr:last-child td{border-bottom:none}
        tr:nth-child(even) td{background:#fafafa}
        @media(max-width:480px){.sgrid{grid-template-columns:1fr}}
      `}</style>

      <Layout title="Progress" profile={profile}>

        {/* RANGE */}
        <div className="rbtns">
          {[{id:"7",l:"7 days"},{id:"14",l:"14 days"},{id:"30",l:"30 days"},{id:"custom",l:"Custom"}].map(r=>(
            <button key={r.id} className={`rbtn${range===r.id?" on":""}`} onClick={()=>setRange(r.id)}>{r.l}</button>
          ))}
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
        <div className="sgrid">
          <div className="scard"><div style={{fontSize:22,fontWeight:700,color:P}}>{n}</div><div style={{fontSize:11,color:TXT2}}>Days logged</div></div>
          <div className="scard"><div style={{fontSize:22,fontWeight:700,color:"#38bdf8"}}>{avgWater}L</div><div style={{fontSize:11,color:TXT2}}>Avg water / day</div><div style={{fontSize:10,color:TXT3}}>Target: {profile.water_target||3.5}L</div></div>
          <div className="scard"><div style={{fontSize:22,fontWeight:700,color:G}}>{avgHab}/5</div><div style={{fontSize:11,color:TXT2}}>Avg habits / day</div><div style={{fontSize:10,color:TXT3}}>{Math.round((avgHab/5)*100)}% compliance</div></div>
          <div className="scard"><div style={{fontSize:22,fontWeight:700,color:A}}>{avgWalk}m</div><div style={{fontSize:11,color:TXT2}}>Avg walk / day</div></div>
          {lost!==null&&(
            <div className="scard" style={{gridColumn:"1/-1",borderColor:lost>0?G:A}}>
              <div style={{fontSize:22,fontWeight:700,color:lost>0?G:A}}>{lost>0?"-":"+"}{ Math.abs(lost)} kg</div>
              <div style={{fontSize:11,color:TXT2}}>Weight {lost>0?"lost":"gained"} in this period</div>
              <div style={{fontSize:10,color:TXT3,marginBottom:6}}>{startW}kg → {latestW}kg · Target: {profile.weight_target}kg</div>
              {profile.weight_start&&profile.weight_target&&(
                <div style={{height:5,background:BORDER,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",background:G,borderRadius:3,width:`${Math.min(100,Math.max(0,Math.round(((profile.weight_start-(latestW||profile.weight_start))/(profile.weight_start-profile.weight_target))*100)))}%`}}/>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TABS */}
        <div className="tabs">
          {[["overview","Overview"],["weight","Weight"],["water","Water"],["habits","Habits"],["table","Table"]].map(([id,lbl])=>(
            <button key={id} className={`tab${tab===id?" on":""}`} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>

        {loading&&<div style={{textAlign:"center",padding:"32px 0",color:TXT2}}>Loading data…</div>}

        {!loading&&n===0&&(
          <div style={{textAlign:"center",padding:"40px 20px",color:TXT2,background:CARD,borderRadius:13,border:`1px solid ${BORDER}`}}>
            <div style={{fontSize:32,marginBottom:10}}>📊</div>
            <div style={{fontWeight:600,marginBottom:4}}>No data in this period</div>
            <div style={{fontSize:12}}>Start logging from Home or Meals to see your progress here.</div>
          </div>
        )}

        {!loading&&n>0&&<>
          {tab==="overview"&&<>
            <div className="card"><div className="ctitle">Water (litres)</div><BarChart data={processed.map(d=>({val:d.water,label:d.label}))} color="#38bdf8" target={profile.water_target||3.5} height={80}/></div>
            <div className="card"><div className="ctitle">Walk (minutes)</div><BarChart data={processed.map(d=>({val:d.walkTotal,label:d.label}))} color={G} target={75} height={80}/></div>
            <div className="card"><div className="ctitle">Habits (out of 5)</div><BarChart data={processed.map(d=>({val:d.habDone,label:d.label}))} color={P} height={80}/></div>
            <div className="card"><div className="ctitle">Meals logged (out of 6)</div><BarChart data={processed.map(d=>({val:d.mealsDone,label:d.label}))} color={A} height={80}/></div>
          </>}

          {tab==="weight"&&(
            <div className="card">
              <div className="ctitle">Weight trend (kg)</div>
              <LineChart data={processed.map(d=>({val:d.weight,label:d.label}))} color={P} height={100}/>
              {latestW&&<div style={{display:"flex",gap:16,marginTop:12,fontSize:12,flexWrap:"wrap"}}>
                <span style={{color:TXT2}}>Start: <b style={{color:TXT}}>{profile.weight_start}kg</b></span>
                <span style={{color:TXT2}}>Latest: <b style={{color:TXT}}>{latestW}kg</b></span>
                {lost>0&&<span style={{color:TXT2}}>Lost: <b style={{color:G}}>{lost}kg</b></span>}
                <span style={{color:TXT2}}>Goal: <b style={{color:P}}>{profile.weight_target}kg</b></span>
              </div>}
            </div>
          )}

          {tab==="water"&&(
            <div className="card">
              <div className="ctitle">Water — {avgWater}L avg</div>
              <BarChart data={processed.map(d=>({val:d.water,label:d.label}))} color="#38bdf8" target={profile.water_target||3.5} height={100}/>
              <div style={{marginTop:12}}>
                {[{l:"Days at target",v:processed.filter(d=>d.water>=(profile.water_target||3.5)).length,c:G},{l:"Days below target",v:processed.filter(d=>d.water>0&&d.water<(profile.water_target||3.5)).length,c:A},{l:"Days not logged",v:processed.filter(d=>d.water===0).length,c:TXT3}].map((s,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${BORDER}`,fontSize:12}}>
                    <span style={{color:TXT2}}>{s.l}</span><b style={{color:s.c}}>{s.v} days</b>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab==="habits"&&(
            <div className="card">
              <div className="ctitle">Habit compliance</div>
              <BarChart data={processed.map(d=>({val:d.habDone,label:d.label}))} color={P} height={100}/>
              <div style={{marginTop:12}}>
                {[{l:"Perfect (5/5)",v:processed.filter(d=>d.habDone===5).length,c:G},{l:"Good (4/5)",v:processed.filter(d=>d.habDone===4).length,c:G},{l:"Below target (<4)",v:processed.filter(d=>d.habDone<4).length,c:A}].map((s,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${BORDER}`,fontSize:12}}>
                    <span style={{color:TXT2}}>{s.l}</span><b style={{color:s.c}}>{s.v} days</b>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab==="table"&&(
            <div className="twrap">
              <table>
                <thead><tr>
                  <th>Date</th><th>Meals</th><th>Water</th><th>Walk</th><th>Habits</th><th>Weight</th>
                </tr></thead>
                <tbody>
                  {processed.map((d,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:500,whiteSpace:"nowrap"}}>{new Date(d.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</td>
                      <td><span className="ht-badge" style={{background:d.mealsDone>=4?GL:"#faf9fd",color:d.mealsDone>=4?G:TXT2}}>{d.mealsDone}/6</span></td>
                      <td style={{color:d.water>=(profile.water_target||3.5)?G:d.water>0?A:TXT3,fontWeight:600}}>{d.water}L</td>
                      <td style={{color:d.walkTotal>=40?G:TXT2}}>{d.walkTotal}m</td>
                      <td><span className="ht-badge" style={{background:d.habDone>=4?GL:d.habDone>=3?AL:"#faf9fd",color:d.habDone>=4?G:d.habDone>=3?A:TXT2}}>{d.habDone}/5</span></td>
                      <td style={{color:TXT,fontWeight:d.weight?500:300}}>{d.weight?`${d.weight}kg`:"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>}

      </Layout>
    </>
  );
}
