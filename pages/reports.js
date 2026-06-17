import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";
import Layout from "../components/Layout";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",A="#EF9F27",AL="#faeeda",R="#E24B4A";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7",CARD="#fff";

function fmt(d){return d.toISOString().split("T")[0];}
function today(){return fmt(new Date());}
function daysAgo(n){const d=new Date();d.setDate(d.getDate()-n);return fmt(d);}

const PRESETS=[
  {id:"7",label:"Last 7 days",from:()=>daysAgo(6),to:()=>today()},
  {id:"14",label:"Last 14 days",from:()=>daysAgo(13),to:()=>today()},
  {id:"30",label:"This month",from:()=>daysAgo(29),to:()=>today()},
  {id:"custom",label:"Custom range"},
];

export default function Reports(){
  const router=useRouter();
  const [profile,setProfile]=useState(null);
  const [logs,setLogs]=useState([]);
  const [preset,setPreset]=useState("7");
  const [customFrom,setCustomFrom]=useState(daysAgo(29));
  const [customTo,setCustomTo]=useState(today());
  const [loading,setLoading]=useState(false);
  const [exporting,setExporting]=useState(false);

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

  useEffect(()=>{if(profile)load();},[profile,preset,customFrom,customTo]);

  async function load(){
    setLoading(true);
    const p=PRESETS.find(x=>x.id===preset);
    const from=preset==="custom"?customFrom:p.from();
    const to=preset==="custom"?customTo:p.to();
    const{data}=await getSupabase().from("health_logs").select("*")
      .eq("user_id",profile.id).gte("log_date",from).lte("log_date",to)
      .order("log_date",{ascending:true});
    setLogs(data||[]);
    setLoading(false);
  }

  const rows=logs.map(l=>({
    date:l.log_date,
    water:(l.water||0)*0.5,
    weight:l.weight||null,
    habDone:Object.values(l.habits||{}).filter(Boolean).length,
    mealsDone:Object.values(l.foods||{}).filter(m=>Object.keys(m).length>0).length,
    walkTotal:Object.values(l.activity||{}).reduce((s,v)=>s+v,0),
    morning_walk:l.activity?.morning_walk||0,
    post_lunch_walk:l.activity?.post_lunch_walk||0,
    post_dinner_walk:l.activity?.post_dinner_walk||0,
  }));

  const n=rows.length;
  const avg=key=>n?+(rows.reduce((s,d)=>s+(d[key]||0),0)/n).toFixed(1):0;
  const pct=key=>n?Math.round((rows.filter(d=>d[key]).length/n)*100):0;

  const waterTarget=profile?.water_target||3.5;
  const daysAtWaterTarget=rows.filter(d=>d.water>=waterTarget).length;
  const daysFullHabits=rows.filter(d=>d.habDone===5).length;
  const daysWeighed=rows.filter(d=>d.weight).length;
  const weights=rows.filter(d=>d.weight);
  const startW=weights.length?weights[0].weight:null;
  const latestW=weights.length?weights[weights.length-1].weight:null;
  const lost=startW&&latestW?+(startW-latestW).toFixed(1):null;

  const bestDay=rows.length?rows.reduce((b,d)=>d.habDone>b.habDone?d:b,rows[0]):null;
  const worstDay=rows.length?rows.reduce((b,d)=>d.habDone<b.habDone?d:b,rows[0]):null;
  const bestWater=rows.length?rows.reduce((b,d)=>d.water>b.water?d:b,rows[0]):null;

  function exportCSV(){
    setExporting(true);
    const headers=["Date","Meals Logged","Water (L)","Morning Walk (min)","Post-Lunch Walk (min)","Post-Dinner Walk (min)","Total Walk (min)","Habits Met","Weight (kg)"];
    const csvRows=rows.map(r=>[r.date,r.mealsDone,r.water,r.morning_walk,r.post_lunch_walk,r.post_dinner_walk,r.walkTotal,r.habDone,r.weight||""].join(","));
    const csv=[headers.join(","),...csvRows].join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`health-report-${profile.full_name?.replace(" ","-")}-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(()=>setExporting(false),1000);
  }

  if(!profile)return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,border:`3px solid ${BORDER}`,borderTopColor:P,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <>
      <Head><title>Reports — Health Tracker</title></Head>
      <style>{`
        .card{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:14px;margin-bottom:12px}
        .ctitle{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
        .presets{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
        .pbtn{padding:7px 14px;border-radius:20px;border:1px solid ${BORDER};font-size:12px;font-weight:600;color:${TXT2};background:transparent;cursor:pointer;font-family:inherit;transition:all .15s}
        .pbtn.on{border-color:${P};background:${PL};color:${P}}
        .kgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px}
        .kcard{background:${CARD};border-radius:12px;border:1px solid ${BORDER};padding:13px}
        .kval{font-size:22px;font-weight:700;line-height:1;margin-bottom:3px}
        .klbl{font-size:11px;color:${TXT2}}
        .ksub{font-size:10px;color:${TXT3};margin-top:2px}
        .insight{display:flex;align-items:flex-start;gap:10px;padding:11px 13px;border-radius:10px;margin-bottom:8px;font-size:12px}
        .twrap{overflow-x:auto;border-radius:12px;border:1px solid ${BORDER};margin-bottom:12px}
        table{width:100%;border-collapse:collapse;font-size:11px;min-width:500px}
        th{padding:9px 12px;text-align:left;color:${TXT2};font-size:10px;text-transform:uppercase;letter-spacing:.04em;background:#faf9fd;border-bottom:1px solid ${BORDER};white-space:nowrap}
        td{padding:9px 12px;border-bottom:1px solid ${BORDER};white-space:nowrap}
        tr:last-child td{border-bottom:none}
        tr:nth-child(even) td{background:#fafafa}
        .prow{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid ${BORDER};font-size:12px}
        .prow:last-child{border-bottom:none}
        .compliance-bar{height:8px;background:${BORDER};border-radius:4px;overflow:hidden;margin-top:6px}
        .compliance-fill{height:100%;border-radius:4px;transition:width .5s}
        .btn-export{display:flex;align-items:center;gap:8px;padding:11px 20px;background:${P};color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .2s}
        .btn-export:hover{background:#5a3a53}
        .btn-export:disabled{background:#b8a0b0;cursor:not-allowed}
        @media(max-width:480px){.kgrid{grid-template-columns:1fr}}
      `}</style>

      <Layout title="Reports" profile={profile}>

        {/* HEADER ROW */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,marginBottom:2}}>Reports</div>
            <div style={{fontSize:12,color:TXT2}}>Download and review your health data</div>
          </div>
          <button className="btn-export" onClick={exportCSV} disabled={exporting||!rows.length}>
            {exporting?"Downloading…":"⬇ Export CSV"}
          </button>
        </div>

        {/* PRESETS */}
        <div className="presets">
          {PRESETS.map(p=>(
            <button key={p.id} className={`pbtn${preset===p.id?" on":""}`} onClick={()=>setPreset(p.id)}>{p.label}</button>
          ))}
        </div>

        {preset==="custom"&&(
          <div className="card">
            <div className="ctitle">Custom date range</div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <div>
                <label style={{fontSize:11,color:TXT2,display:"block",marginBottom:4}}>From</label>
                <input type="date" value={customFrom} max={customTo} onChange={e=>setCustomFrom(e.target.value)}
                  style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${BORDER}`,fontSize:13,color:TXT,outline:"none"}}/>
              </div>
              <div>
                <label style={{fontSize:11,color:TXT2,display:"block",marginBottom:4}}>To</label>
                <input type="date" value={customTo} max={today()} min={customFrom} onChange={e=>setCustomTo(e.target.value)}
                  style={{padding:"8px 12px",borderRadius:8,border:`1px solid ${BORDER}`,fontSize:13,color:TXT,outline:"none"}}/>
              </div>
            </div>
          </div>
        )}

        {loading&&<div style={{textAlign:"center",padding:"40px 0",color:TXT2}}>Loading report…</div>}

        {!loading&&rows.length===0&&(
          <div style={{textAlign:"center",padding:"48px 20px",background:CARD,borderRadius:13,border:`1px solid ${BORDER}`}}>
            <div style={{fontSize:36,marginBottom:12}}>📋</div>
            <div style={{fontWeight:600,fontSize:15,marginBottom:6}}>No data in this period</div>
            <div style={{fontSize:12,color:TXT2}}>Start logging from Home or Meals to generate reports.</div>
          </div>
        )}

        {!loading&&rows.length>0&&<>

          {/* SUMMARY KPIS */}
          <div className="kgrid">
            <div className="kcard">
              <div className="kval" style={{color:P}}>{n}</div>
              <div className="klbl">Days logged</div>
              <div className="ksub">out of selected period</div>
            </div>
            <div className="kcard">
              <div className="kval" style={{color:"#38bdf8"}}>{avg("water")}L</div>
              <div className="klbl">Avg water / day</div>
              <div className="ksub">Target: {waterTarget}L</div>
            </div>
            <div className="kcard">
              <div className="kval" style={{color:G}}>{avg("habDone")}/5</div>
              <div className="klbl">Avg habits / day</div>
              <div className="ksub">{Math.round((+avg("habDone")/5)*100)}% compliance</div>
            </div>
            <div className="kcard">
              <div className="kval" style={{color:A}}>{avg("walkTotal")} min</div>
              <div className="klbl">Avg walk / day</div>
              <div className="ksub">Morning + post meals</div>
            </div>
            {lost!==null&&(
              <div className="kcard" style={{gridColumn:"1/-1",borderColor:lost>0?G:A}}>
                <div className="kval" style={{color:lost>0?G:A}}>{lost>0?"-":"+"}{Math.abs(lost)} kg</div>
                <div className="klbl">Weight {lost>0?"lost":"gained"} in this period</div>
                <div className="ksub">{startW}kg → {latestW}kg · Goal: {profile.weight_target}kg</div>
                {profile.weight_start&&profile.weight_target&&(
                  <div className="compliance-bar" style={{marginTop:8}}>
                    <div className="compliance-fill" style={{width:`${Math.min(100,Math.max(0,Math.round(((profile.weight_start-(latestW||profile.weight_start))/(profile.weight_start-profile.weight_target))*100)))}%`,background:G}}/>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GOAL COMPLIANCE */}
          <div className="card">
            <div className="ctitle">Goal compliance</div>
            {[
              {l:"Water target met",v:daysAtWaterTarget,color:"#38bdf8"},
              {l:"All 5 habits completed",v:daysFullHabits,color:P},
              {l:"Weight logged",v:daysWeighed,color:G},
              {l:"All 6 meals logged",v:rows.filter(d=>d.mealsDone===6).length,color:A},
              {l:"Morning walk done",v:rows.filter(d=>d.morning_walk>0).length,color:G},
            ].map((s,i)=>{
              const p=n?Math.round((s.v/n)*100):0;
              return(
                <div key={i} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                    <span style={{color:TXT2}}>{s.l}</span>
                    <span style={{fontWeight:600,color:p>=80?G:p>=50?A:R}}>{s.v}/{n} days ({p}%)</span>
                  </div>
                  <div className="compliance-bar">
                    <div className="compliance-fill" style={{width:`${p}%`,background:p>=80?G:p>=50?A:R}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* INSIGHTS */}
          <div className="card">
            <div className="ctitle">Insights</div>
            {bestDay&&<div className="insight" style={{background:GL,border:`1px solid ${G}`}}>
              <span style={{fontSize:20}}>🏆</span>
              <div><b style={{color:G}}>Best day:</b> {new Date(bestDay.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})} — {bestDay.habDone}/5 habits, {bestDay.water}L water, {bestDay.walkTotal}min walk</div>
            </div>}
            {worstDay&&worstDay.date!==bestDay?.date&&<div className="insight" style={{background:AL,border:`1px solid ${A}`}}>
              <span style={{fontSize:20}}>⚠️</span>
              <div><b style={{color:A}}>Needs improvement:</b> {new Date(worstDay.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})} — {worstDay.habDone}/5 habits only</div>
            </div>}
            {bestWater&&<div className="insight" style={{background:"rgba(56,189,248,0.08)",border:"1px solid #38bdf8"}}>
              <span style={{fontSize:20}}>💧</span>
              <div><b style={{color:"#0284c7"}}>Best hydration:</b> {new Date(bestWater.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})} — {bestWater.water}L</div>
            </div>}
            {daysAtWaterTarget<n*0.5&&<div className="insight" style={{background:"#fff0f0",border:`1px solid ${R}`}}>
              <span style={{fontSize:20}}>🚨</span>
              <div><b style={{color:R}}>Water alert:</b> You met your {waterTarget}L water target on only {daysAtWaterTarget} of {n} days. Try keeping a bottle at your desk.</div>
            </div>}
            {avg("walkTotal")<30&&<div className="insight" style={{background:AL,border:`1px solid ${A}`}}>
              <span style={{fontSize:20}}>🚶</span>
              <div><b style={{color:A}}>Walk reminder:</b> Average walk is {avg("walkTotal")} min/day. Post-meal walks reduce blood sugar significantly — aim for 15 min after lunch.</div>
            </div>}
          </div>

          {/* AVERAGES TABLE */}
          <div className="card">
            <div className="ctitle">Period averages vs targets</div>
            {[
              {l:"Water",avg:`${avg("water")}L`,target:`${waterTarget}L`,met:+avg("water")>=waterTarget},
              {l:"Habits",avg:`${avg("habDone")}/5`,target:"5/5",met:+avg("habDone")>=4},
              {l:"Morning walk",avg:`${avg("morning_walk")} min`,target:"40 min",met:+avg("morning_walk")>=35},
              {l:"Total walk",avg:`${avg("walkTotal")} min`,target:"75 min",met:+avg("walkTotal")>=65},
              {l:"Meals logged",avg:`${avg("mealsDone")}/6`,target:"6/6",met:+avg("mealsDone")>=5},
            ].map((r,i)=>(
              <div key={i} className="prow">
                <span style={{color:TXT2,flex:1}}>{r.l}</span>
                <span style={{fontWeight:600,color:TXT,marginRight:16}}>{r.avg}</span>
                <span style={{color:TXT3,marginRight:12,fontSize:11}}>target: {r.target}</span>
                <span style={{fontSize:14}}>{r.met?"✅":"⚠️"}</span>
              </div>
            ))}
          </div>

          {/* DAILY LOG TABLE */}
          <div className="ctitle" style={{padding:"0 2px",marginBottom:8}}>Daily log</div>
          <div className="twrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Meals</th>
                  <th>Water</th>
                  <th>Morning walk</th>
                  <th>Post-lunch</th>
                  <th>Post-dinner</th>
                  <th>Habits</th>
                  <th>Weight</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:500}}>{new Date(r.date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}</td>
                    <td><span className="ht-badge" style={{background:r.mealsDone>=5?GL:"#faf9fd",color:r.mealsDone>=5?G:TXT2}}>{r.mealsDone}/6</span></td>
                    <td style={{color:r.water>=waterTarget?G:r.water>0?A:TXT3,fontWeight:600}}>{r.water}L</td>
                    <td style={{color:r.morning_walk>=35?G:r.morning_walk>0?A:TXT3}}>{r.morning_walk}m</td>
                    <td style={{color:r.post_lunch_walk>=15?G:r.post_lunch_walk>0?A:TXT3}}>{r.post_lunch_walk}m</td>
                    <td style={{color:r.post_dinner_walk>=20?G:r.post_dinner_walk>0?A:TXT3}}>{r.post_dinner_walk}m</td>
                    <td><span className="ht-badge" style={{background:r.habDone>=4?GL:r.habDone>=3?AL:"#faf9fd",color:r.habDone>=4?G:r.habDone>=3?A:TXT2}}>{r.habDone}/5</span></td>
                    <td style={{color:TXT,fontWeight:r.weight?500:300}}>{r.weight?`${r.weight}kg`:"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* EXPORT BOTTOM */}
          <div style={{display:"flex",justifyContent:"center",marginTop:8}}>
            <button className="btn-export" onClick={exportCSV} disabled={exporting}>
              {exporting?"Downloading…":"⬇ Export full report as CSV"}
            </button>
          </div>

        </>}

      </Layout>
    </>
  );
}
