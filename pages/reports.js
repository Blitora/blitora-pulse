import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";
import RoleGuard from '../components/RoleGuard';
import { ROLES } from '../lib/useRole';
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

// ─── MINI BAR CHART (SVG, no library) ────────────────────────────────────────
function MiniBarChart({data,color,label,maxVal}){
  if(!data.length) return null;
  const W=280, H=60, pad=4;
  const bw=Math.max(2, Math.floor((W-pad*2)/data.length)-2);
  const max=maxVal||Math.max(...data.map(d=>d.v),1);
  return(
    <div>
      <div style={{fontSize:10,fontWeight:700,color:TXT2,textTransform:"uppercase",marginBottom:4}}>{label}</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        {data.map((d,i)=>{
          const bh=Math.max(2,((d.v||0)/max)*(H-16));
          const x=pad+i*(bw+2);
          return(
            <g key={i}>
              <rect x={x} y={H-16-bh} width={bw} height={bh} rx={2} fill={d.v>0?color:"#eee"}/>
              {data.length<=10&&<text x={x+bw/2} y={H-2} textAnchor="middle" fontSize={7} fill={TXT3}>{d.l}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── RADIAL COMPLIANCE RING (SVG) ─────────────────────────────────────────────
function ComplianceRing({pct,color,label,sub}){
  const r=28,c=2*Math.PI*r,d=(pct/100)*c;
  return(
    <div style={{textAlign:"center"}}>
      <div style={{position:"relative",width:72,height:72,margin:"0 auto 6px"}}>
        <svg width={72} height={72} style={{transform:"rotate(-90deg)"}}>
          <circle cx={36} cy={36} r={r} fill="none" stroke={BORDER} strokeWidth={7}/>
          <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={7}
            strokeDasharray={`${d} ${c}`} strokeLinecap="round"
            style={{transition:"stroke-dasharray .6s"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:14,fontWeight:700,color:TXT,lineHeight:1}}>{pct}%</span>
        </div>
      </div>
      <div style={{fontSize:11,fontWeight:600,color:TXT}}>{label}</div>
      {sub&&<div style={{fontSize:10,color:TXT2,marginTop:1}}>{sub}</div>}
    </div>
  );
}

export default function Reports(){
  const router=useRouter();
  const [profile,setProfile]=useState(null);
  const [logs,setLogs]=useState([]);
  const [foods,setFoods]=useState([]);
  const [preset,setPreset]=useState("7");
  const [customFrom,setCustomFrom]=useState(daysAgo(29));
  const [customTo,setCustomTo]=useState(today());
  const [loading,setLoading]=useState(false);
  const [exportType,setExportType]=useState(null); // 'csv'|'excel'|'pdf'

  useEffect(()=>{
    async function init(){
      const sb=getSupabase();
      const{data:{session}}=await sb.auth.getSession();
      if(!session){router.push("/");return;}
      const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
      if(!p){router.push("/");return;}
      if(!p.setup_complete){router.push("/setup");return;}
      setProfile(p);
      // Load food master for macro calculation
      if(p.active_template_id){
        const{data:tf}=await sb
          .from("template_food_items").select("*")
          .or(`template_id.eq.${p.active_template_id},and(added_by_user.eq.true,added_by_user_id.eq.${p.id})`);
        setFoods(tf||[]);
      }
    }
    init();
  },[]);

  useEffect(()=>{if(profile)load();},[profile,preset,customFrom,customTo]);

  async function load(){
    setLoading(true);
    const pr=PRESETS.find(x=>x.id===preset);
    const from=preset==="custom"?customFrom:pr.from();
    const to=preset==="custom"?customTo:pr.to();
    const{data}=await getSupabase().from("health_logs").select("*")
      .eq("user_id",profile.id).gte("log_date",from).lte("log_date",to)
      .order("log_date",{ascending:true});
    setLogs(data||[]);
    setLoading(false);
  }

  // ─── Enrich rows with macro data ─────────────────────────────────────────
  const rows=logs.map(l=>{
    const allIds=Object.values(l.foods||{}).flatMap(m=>Object.keys(m));
    const mac=allIds.reduce((a,id)=>{
      const f=foods.find(x=>String(x.id)===String(id)||x.name===id);
      return f?{cal:a.cal+(f.calories||0),pro:a.pro+(f.protein||0),carb:a.carb+(f.carbs||0),fat:a.fat+(f.fat||0)}:a;
    },{cal:0,pro:0,carb:0,fat:0});
    // Count custom/deviation foods
    const deviations=allIds.filter(id=>{
      const f=foods.find(x=>String(x.id)===String(id));
      return f?.added_by_user;
    }).length;
    return{
      date:l.log_date,
      water:(l.water||0)*0.5,
      weight:l.weight||null,
      habDone:Object.values(l.habits||{}).filter(Boolean).length,
      mealsDone:Object.values(l.foods||{}).filter(m=>Object.keys(m).length>0).length,
      walkTotal:Object.values(l.activity||{}).reduce((s,v)=>s+v,0),
      morning_walk:l.activity?.morning_walk||0,
      post_lunch_walk:l.activity?.post_lunch_walk||0,
      post_dinner_walk:l.activity?.post_dinner_walk||0,
      calories:mac.cal, protein:mac.pro, carbs:mac.carb, fat:mac.fat,
      deviations,
      foodIds:allIds,
    };
  });

  const n=rows.length;
  const avg=key=>n?+(rows.reduce((s,d)=>s+(d[key]||0),0)/n).toFixed(1):0;
  const waterTarget=profile?.water_target||3.5;
  const calTarget=profile?.calorie_target||1600;
  const daysAtWaterTarget=rows.filter(d=>d.water>=waterTarget).length;
  const daysFullHabits=rows.filter(d=>d.habDone===5).length;
  const daysWeighed=rows.filter(d=>d.weight).length;
  const weights=rows.filter(d=>d.weight);
  const startW=weights.length?weights[0].weight:null;
  const latestW=weights.length?weights[weights.length-1].weight:null;
  const lost=startW&&latestW?+(startW-latestW).toFixed(1):null;

  // Chart data
  const calChart=rows.map(r=>({v:r.calories,l:new Date(r.date).getDate()+""}));
  const waterChart=rows.map(r=>({v:r.water,l:new Date(r.date).getDate()+""}));
  const walkChart=rows.map(r=>({v:r.walkTotal,l:new Date(r.date).getDate()+""}));
  const weightChart=rows.filter(r=>r.weight).map(r=>({v:r.weight,l:new Date(r.date).getDate()+""}));

  // Top foods eaten
  const foodCount={};
  rows.forEach(r=>r.foodIds.forEach(id=>{
    const f=foods.find(x=>String(x.id)===String(id));
    if(f){foodCount[f.name]=(foodCount[f.name]||0)+1;}
  }));
  const topFoods=Object.entries(foodCount).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Compliance %
  const waterComp=n?Math.round((daysAtWaterTarget/n)*100):0;
  const habComp=n?Math.round((daysFullHabits/n)*100):0;
  const mealComp=n?Math.round((rows.filter(d=>d.mealsDone>=4).length/n)*100):0;
  const walkComp=n?Math.round((rows.filter(d=>d.walkTotal>=30).length/n)*100):0;

  // ─── CSV EXPORT ──────────────────────────────────────────────────────────
  function exportCSV(){
    setExportType("csv");
    const headers=["Date","Meals Logged","Calories (kcal)","Protein (g)","Carbs (g)","Fat (g)","Water (L)","Morning Walk (min)","Post-Lunch Walk (min)","Post-Dinner Walk (min)","Total Walk (min)","Habits Met","Weight (kg)","Custom Foods Added"];
    const csvRows=rows.map(r=>[r.date,r.mealsDone,r.calories,r.protein,r.carbs,r.fat,r.water,r.morning_walk,r.post_lunch_walk,r.post_dinner_walk,r.walkTotal,r.habDone,r.weight||"",r.deviations].join(","));
    const csv=[headers.join(","),...csvRows].join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=`myhealth-report-${profile.full_name?.replace(/\s/g,"-")}-${today()}.csv`; a.click();
    URL.revokeObjectURL(url);
    setTimeout(()=>setExportType(null),1500);
  }

  // ─── EXCEL EXPORT (using SheetJS via CDN) ────────────────────────────────
  async function exportExcel(){
    setExportType("excel");
    try{
      // Dynamically load xlsx
      if(!window.XLSX){
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload=res; s.onerror=rej;
          document.head.appendChild(s);
        });
      }
      const XLSX=window.XLSX;

      // Sheet 1: Summary
      const summaryData=[
        ["MyHealth Report","",""],
        ["Name",profile.full_name||"",""],
        ["Period",`${rows[0]?.date||""} to ${rows[rows.length-1]?.date||""}`, ""],
        ["Days Logged",n,""],
        [""],
        ["AVERAGES","Value","Target"],
        ["Calories",avg("calories")+" kcal",calTarget+" kcal"],
        ["Protein",avg("protein")+"g",profile.protein_target+"g"],
        ["Water",avg("water")+"L",waterTarget+"L"],
        ["Habits",avg("habDone")+"/5","5/5"],
        ["Total Walk",avg("walkTotal")+" min","75 min"],
        [""],
        ["COMPLIANCE","Days Met","% of Period"],
        ["Water Target",daysAtWaterTarget,waterComp+"%"],
        ["All 5 Habits",daysFullHabits,habComp+"%"],
        ["4+ Meals Logged",rows.filter(d=>d.mealsDone>=4).length,mealComp+"%"],
        ["30+ min Walk",rows.filter(d=>d.walkTotal>=30).length,walkComp+"%"],
        [""],
        lost!==null?["Weight Change",(lost>0?"-":"+")+" "+Math.abs(lost)+" kg",`${startW}kg → ${latestW}kg`]:["Weight","Not logged",""],
      ];

      // Sheet 2: Daily log
      const dailyData=[
        ["Date","Meals","Calories","Protein (g)","Carbs (g)","Fat (g)","Water (L)","Morning Walk","Post-Lunch Walk","Post-Dinner Walk","Total Walk","Habits","Weight","Custom Foods"],
        ...rows.map(r=>[r.date,r.mealsDone,r.calories,r.protein,r.carbs,r.fat,r.water,r.morning_walk,r.post_lunch_walk,r.post_dinner_walk,r.walkTotal,r.habDone,r.weight||"",r.deviations])
      ];

      // Sheet 3: Top foods
      const foodData=[
        ["Food Item","Times Eaten"],
        ...topFoods.map(([name,count])=>[name,count]),
      ];

      const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dailyData), "Daily Log");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(foodData), "Top Foods");
      XLSX.writeFile(wb, `myhealth-report-${profile.full_name?.replace(/\s/g,"-")}-${today()}.xlsx`);
    }catch(e){alert("Excel export failed: "+e.message);}
    setTimeout(()=>setExportType(null),1500);
  }

  // ─── PDF EXPORT (using jsPDF via CDN + html2canvas) ──────────────────────
  async function exportPDF(){
    setExportType("pdf");
    try{
      // Load jsPDF
      if(!window.jspdf){
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          s.onload=res; s.onerror=rej; document.head.appendChild(s);
        });
      }
      const {jsPDF}=window.jspdf;
      const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
      const W=210, M=14;
      let y=14;

      // Header
      doc.setFillColor(113,75,103);
      doc.rect(0,0,W,28,"F");
      doc.setTextColor(255,255,255);
      doc.setFontSize(18); doc.setFont("helvetica","bold");
      doc.text("MyHealth — Health Report",M,12);
      doc.setFontSize(9); doc.setFont("helvetica","normal");
      doc.text(`${profile.full_name||""} · Generated ${today()}`,M,21);
      doc.setFontSize(9);
      doc.text(`Period: ${rows[0]?.date||""} to ${rows[rows.length-1]?.date||""}`, 130, 21);
      y=36;

      // Summary boxes (4 in a row)
      const boxes=[
        {label:"Days Logged",val:n+"",color:[113,75,103]},
        {label:"Avg Water",val:avg("water")+"L",color:[56,189,248]},
        {label:"Avg Habits",val:avg("habDone")+"/5",color:[29,158,117]},
        {label:"Avg Walk",val:avg("walkTotal")+"m",color:[239,159,39]},
      ];
      const bw=(W-M*2-9)/4;
      boxes.forEach((b,i)=>{
        const x=M+i*(bw+3);
        doc.setFillColor(245,245,250);
        doc.roundedRect(x,y,bw,20,2,2,"F");
        doc.setFillColor(...b.color);
        doc.roundedRect(x,y,bw,4,2,2,"F");
        doc.setTextColor(...b.color);
        doc.setFontSize(14); doc.setFont("helvetica","bold");
        doc.text(b.val,x+bw/2,y+13,{align:"center"});
        doc.setTextColor(120,120,120);
        doc.setFontSize(7); doc.setFont("helvetica","normal");
        doc.text(b.label,x+bw/2,y+18,{align:"center"});
      });
      y+=28;

      // Weight change
      if(lost!==null){
        doc.setFillColor(lost>0?234:254, lost>0?244:240, lost>0?246:237);
        doc.roundedRect(M,y,W-M*2,14,2,2,"F");
        doc.setTextColor(lost>0?29:239, lost>0?158:100, lost>0?117:39);
        doc.setFontSize(11); doc.setFont("helvetica","bold");
        doc.text(`Weight ${lost>0?"Lost":"Gained"}: ${Math.abs(lost)} kg  (${startW}kg → ${latestW}kg · Goal: ${profile.weight_target}kg)`,M+4,y+9);
        y+=20;
      }

      // Compliance section
      doc.setTextColor(113,75,103);
      doc.setFontSize(10); doc.setFont("helvetica","bold");
      doc.text("Goal Compliance",M,y); y+=5;
      const compItems=[
        {l:"Water target met",v:daysAtWaterTarget,pct:waterComp,c:[56,189,248]},
        {l:"All 5 habits",v:daysFullHabits,pct:habComp,c:[29,158,117]},
        {l:"4+ meals logged",v:rows.filter(d=>d.mealsDone>=4).length,pct:mealComp,c:[113,75,103]},
        {l:"30+ min walk",v:rows.filter(d=>d.walkTotal>=30).length,pct:walkComp,c:[239,159,39]},
      ];
      compItems.forEach(c=>{
        doc.setTextColor(80,80,80); doc.setFontSize(8); doc.setFont("helvetica","normal");
        doc.text(c.l,M,y+4);
        doc.text(`${c.v}/${n} days (${c.pct}%)`,150,y+4);
        doc.setFillColor(235,235,235);
        doc.roundedRect(M,y+5,W-M*2-50,4,1,1,"F");
        doc.setFillColor(...c.c);
        doc.roundedRect(M,y+5,(W-M*2-50)*(c.pct/100),4,1,1,"F");
        y+=12;
      });
      y+=4;

      // Macro averages
      doc.setTextColor(113,75,103);
      doc.setFontSize(10); doc.setFont("helvetica","bold");
      doc.text("Daily Averages vs Targets",M,y); y+=6;
      const avgItems=[
        ["Calories",avg("calories")+" kcal",calTarget+" kcal"],
        ["Protein",avg("protein")+"g",(profile.protein_target||100)+"g"],
        ["Water",avg("water")+"L",waterTarget+"L"],
      ];
      doc.setFontSize(8); doc.setFont("helvetica","normal");
      avgItems.forEach(([l,a,t])=>{
        doc.setTextColor(100,100,100); doc.text(l,M,y);
        doc.setTextColor(44,26,58); doc.text(a,80,y);
        doc.setTextColor(150,150,150); doc.text("target: "+t,120,y);
        y+=7;
      });
      y+=4;

      // Top foods
      if(topFoods.length){
        doc.setTextColor(113,75,103);
        doc.setFontSize(10); doc.setFont("helvetica","bold");
        doc.text("Most Eaten Foods This Period",M,y); y+=6;
        topFoods.forEach(([name,count],i)=>{
          doc.setFillColor(i%2===0?248:255,i%2===0?245:255,i%2===0?252:255);
          doc.rect(M,y-4,W-M*2,8,"F");
          doc.setTextColor(44,26,58); doc.setFontSize(8); doc.setFont("helvetica","normal");
          doc.text(`${i+1}. ${name}`,M+2,y);
          doc.setTextColor(29,158,117);
          doc.text(`${count}x`,W-M-10,y);
          y+=8;
        });
        y+=4;
      }

      // Daily log table header
      if(y>240){doc.addPage();y=14;}
      doc.setTextColor(113,75,103);
      doc.setFontSize(10); doc.setFont("helvetica","bold");
      doc.text("Daily Log",M,y); y+=5;

      // Table
      const cols=["Date","Meals","Cal","Protein","Water","Walk","Habits","Weight"];
      const colW=[28,16,18,18,16,16,14,18];
      let x=M;
      doc.setFillColor(113,75,103);
      doc.rect(M,y,W-M*2,7,"F");
      doc.setTextColor(255,255,255); doc.setFontSize(7); doc.setFont("helvetica","bold");
      cols.forEach((c,i)=>{doc.text(c,x+2,y+5);x+=colW[i];});
      y+=7;

      rows.forEach((r,ri)=>{
        if(y>270){doc.addPage();y=14;}
        doc.setFillColor(ri%2===0?248:255, ri%2===0?245:255, ri%2===0?252:255);
        doc.rect(M,y,W-M*2,6,"F");
        doc.setTextColor(44,26,58); doc.setFontSize(6.5); doc.setFont("helvetica","normal");
        x=M;
        const cells=[
          new Date(r.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
          r.mealsDone+"/6", r.calories+"", r.protein+"g",
          r.water+"L", r.walkTotal+"m", r.habDone+"/5",
          r.weight?r.weight+"kg":"—"
        ];
        cells.forEach((c,i)=>{doc.text(c,x+2,y+4.5);x+=colW[i];});
        y+=6;
      });

      // Footer
      doc.setFillColor(113,75,103);
      doc.rect(0,285,W,12,"F");
      doc.setTextColor(255,255,255); doc.setFontSize(7);
      doc.text("MyHealth — Health Tracker Platform · myhealth.grabntrust.in",W/2,292,{align:"center"});

      doc.save(`myhealth-report-${profile.full_name?.replace(/\s/g,"-")}-${today()}.pdf`);
    }catch(e){alert("PDF export failed: "+e.message);}
    setTimeout(()=>setExportType(null),1500);
  }

  const bestDay=rows.length?rows.reduce((b,d)=>d.habDone>b.habDone?d:b,rows[0]):null;
  const worstDay=rows.length?rows.reduce((b,d)=>d.habDone<b.habDone?d:b,rows[0]):null;

  if(!profile)return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="ht-spinner"/>
    </div>
  );

  return(
    <>
      <Head><title>Reports — MyHealth</title></Head>
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
        table{width:100%;border-collapse:collapse;font-size:11px;min-width:560px}
        th{padding:9px 10px;text-align:left;color:${TXT2};font-size:10px;text-transform:uppercase;letter-spacing:.04em;background:#faf9fd;border-bottom:1px solid ${BORDER};white-space:nowrap}
        td{padding:8px 10px;border-bottom:1px solid ${BORDER};white-space:nowrap}
        tr:last-child td{border-bottom:none}
        tr:nth-child(even) td{background:#fafafa}
        .prow{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid ${BORDER};font-size:12px}
        .prow:last-child{border-bottom:none}
        .compliance-bar{height:7px;background:${BORDER};border-radius:4px;overflow:hidden;margin-top:5px}
        .compliance-fill{height:100%;border-radius:4px;transition:width .5s}
        .export-row{display:flex;gap:8px;flex-wrap:wrap}
        .btn-export{display:flex;align-items:center;gap:7px;padding:10px 18px;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s}
        .btn-export:disabled{opacity:.6;cursor:not-allowed}
        .charts-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:12px}
        @media(max-width:520px){.kgrid,.charts-grid{grid-template-columns:1fr}}
      `}</style>

      <Layout title="Reports" profile={profile}>

        {/* HEADER */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,marginBottom:2}}>Reports</div>
            <div style={{fontSize:12,color:TXT2}}>Analyse and export your health data</div>
          </div>
          {/* 3 EXPORT BUTTONS */}
          <div className="export-row">
            <button className="btn-export" disabled={!rows.length||exportType==="csv"}
              style={{background:"#16a34a",color:"#fff"}} onClick={exportCSV}>
              {exportType==="csv"?"Downloading…":"📄 CSV"}
            </button>
            <button className="btn-export" disabled={!rows.length||exportType==="excel"}
              style={{background:"#1d4ed8",color:"#fff"}} onClick={exportExcel}>
              {exportType==="excel"?"Creating…":"📊 Excel"}
            </button>
            <button className="btn-export" disabled={!rows.length||exportType==="pdf"}
              style={{background:P,color:"#fff"}} onClick={exportPDF}>
              {exportType==="pdf"?"Generating…":"📑 PDF Report"}
            </button>
          </div>
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

          {/* SUMMARY KPIs */}
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
              <div className="kval" style={{color:G}}>{avg("calories")} kcal</div>
              <div className="klbl">Avg calories / day</div>
              <div className="ksub">Target: {calTarget} kcal</div>
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

          {/* COMPLIANCE RINGS */}
          <div className="card">
            <div className="ctitle">Compliance overview</div>
            <div style={{display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:12}}>
              <ComplianceRing pct={waterComp} color="#38bdf8" label="Water" sub={`${daysAtWaterTarget}/${n} days`}/>
              <ComplianceRing pct={habComp}  color={P}       label="Habits" sub={`${daysFullHabits}/${n} days`}/>
              <ComplianceRing pct={mealComp} color={G}       label="Meals"  sub={`4+ meals`}/>
              <ComplianceRing pct={walkComp} color={A}       label="Walks"  sub={`30+ min`}/>
            </div>
          </div>

          {/* CHARTS */}
          <div className="charts-grid">
            <div className="card">
              <MiniBarChart data={calChart} color="#7F77DD" label="Calories eaten (kcal)" maxVal={calTarget*1.3}/>
            </div>
            <div className="card">
              <MiniBarChart data={waterChart} color="#38bdf8" label="Water (L)" maxVal={waterTarget*1.3}/>
            </div>
            <div className="card">
              <MiniBarChart data={walkChart} color={G} label="Total walk (min)" maxVal={90}/>
            </div>
            {weightChart.length>1&&(
              <div className="card">
                <MiniBarChart data={weightChart} color={P} label="Weight trend (kg)" maxVal={Math.max(...weightChart.map(d=>d.v))*1.05}/>
              </div>
            )}
          </div>

          {/* TOP FOODS */}
          {topFoods.length>0&&(
            <div className="card">
              <div className="ctitle">Most eaten foods this period</div>
              {topFoods.map(([name,count],i)=>(
                <div key={name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:i<topFoods.length-1?`1px solid ${BORDER}`:"none"}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:PL,color:P,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
                  <span style={{flex:1,fontSize:12,color:TXT}}>{name}</span>
                  <span style={{fontSize:12,fontWeight:700,color:G}}>{count}×</span>
                  <div style={{width:60,height:6,background:BORDER,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",background:G,borderRadius:3,width:`${Math.round((count/topFoods[0][1])*100)}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GOAL COMPLIANCE BARS */}
          <div className="card">
            <div className="ctitle">Goal compliance breakdown</div>
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
              <div><b style={{color:A}}>Needs improvement:</b> {new Date(worstDay.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})} — only {worstDay.habDone}/5 habits</div>
            </div>}
            {avg("calories")>0&&+avg("calories")<calTarget*0.7&&<div className="insight" style={{background:"#fff0f0",border:`1px solid ${R}`}}>
              <span style={{fontSize:20}}>🍽️</span>
              <div><b style={{color:R}}>Low intake alert:</b> Your average calorie intake ({avg("calories")} kcal) is below 70% of your target. Ensure you're logging all meals.</div>
            </div>}
            {daysAtWaterTarget<n*0.5&&<div className="insight" style={{background:"#fff0f0",border:`1px solid ${R}`}}>
              <span style={{fontSize:20}}>💧</span>
              <div><b style={{color:R}}>Water alert:</b> You met your {waterTarget}L target on only {daysAtWaterTarget} of {n} days.</div>
            </div>}
          </div>

          {/* DAILY LOG TABLE */}
          <div className="ctitle" style={{padding:"0 2px",marginBottom:8}}>Daily log</div>
          <div className="twrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Meals</th>
                  <th>Calories</th>
                  <th>Protein</th>
                  <th>Water</th>
                  <th>Walk</th>
                  <th>Habits</th>
                  <th>Weight</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:500}}>{new Date(r.date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}</td>
                    <td><span className="ht-badge" style={{background:r.mealsDone>=5?GL:"#faf9fd",color:r.mealsDone>=5?G:TXT2,padding:"2px 8px",borderRadius:20,fontSize:10}}>{r.mealsDone}/6</span></td>
                    <td style={{color:r.calories>0?TXT:TXT3}}>{r.calories>0?r.calories+" kcal":"—"}</td>
                    <td style={{color:r.protein>0?G:TXT3}}>{r.protein>0?r.protein+"g":"—"}</td>
                    <td style={{color:r.water>=waterTarget?G:r.water>0?A:TXT3,fontWeight:600}}>{r.water}L</td>
                    <td style={{color:r.walkTotal>=30?G:r.walkTotal>0?A:TXT3}}>{r.walkTotal}m</td>
                    <td><span className="ht-badge" style={{background:r.habDone>=4?GL:r.habDone>=3?AL:"#faf9fd",color:r.habDone>=4?G:r.habDone>=3?A:TXT2,padding:"2px 8px",borderRadius:20,fontSize:10}}>{r.habDone}/5</span></td>
                    <td style={{fontWeight:r.weight?500:300,color:r.weight?TXT:TXT3}}>{r.weight?`${r.weight}kg`:"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* EXPORT ROW BOTTOM */}
          <div className="export-row" style={{justifyContent:"center",marginTop:8,marginBottom:16}}>
            <button className="btn-export" disabled={exportType==="csv"} style={{background:"#16a34a",color:"#fff"}} onClick={exportCSV}>
              {exportType==="csv"?"Downloading…":"📄 Download CSV"}
            </button>
            <button className="btn-export" disabled={exportType==="excel"} style={{background:"#1d4ed8",color:"#fff"}} onClick={exportExcel}>
              {exportType==="excel"?"Creating…":"📊 Download Excel"}
            </button>
            <button className="btn-export" disabled={exportType==="pdf"} style={{background:P,color:"#fff"}} onClick={exportPDF}>
              {exportType==="pdf"?"Generating…":"📑 Download PDF Report"}
            </button>
          </div>

        </>}

      </Layout>
    </>
  );
}
