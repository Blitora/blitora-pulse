import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Head from "next/head";

// ── IMPORTANT: Replace these with your actual values from Supabase → Settings → API
// These will be overridden by Vercel environment variables when deployed

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/* ── FOOD DATABASE ───────────────────────────────────────── */
const FOOD_DB = [
  { id:"grilled_chicken_150", name:"Grilled chicken (150g)", cal:165, pro:31, carb:0, fat:4, tags:["protein","dinner","lunch"] },
  { id:"grilled_chicken_180", name:"Grilled chicken (180g)", cal:198, pro:37, carb:0, fat:5, tags:["protein","lunch"] },
  { id:"grilled_chicken_200", name:"Grilled chicken (200g)", cal:220, pro:41, carb:0, fat:5, tags:["protein","lunch","dinner"] },
  { id:"grilled_chicken_250", name:"Grilled chicken (250g)", cal:275, pro:52, carb:0, fat:6, tags:["protein","lunch","weekend"] },
  { id:"chicken_keema_100", name:"Chicken keema dry (100g)", cal:145, pro:22, carb:2, fat:5, tags:["protein","lunch","dinner"] },
  { id:"chicken_keema_150", name:"Chicken keema dry (150g)", cal:218, pro:33, carb:3, fat:8, tags:["protein","lunch"] },
  { id:"chicken_tikka_150", name:"Chicken tikka (150g)", cal:180, pro:30, carb:3, fat:5, tags:["protein","lunch","dinner"] },
  { id:"chicken_tikka_200", name:"Chicken tikka (200g)", cal:240, pro:40, carb:4, fat:7, tags:["protein","lunch"] },
  { id:"chicken_tikka_250", name:"Chicken tikka (250g)", cal:300, pro:50, carb:5, fat:9, tags:["protein","lunch","weekend"] },
  { id:"chicken_soup_large", name:"Chicken soup (large bowl)", cal:90, pro:12, carb:5, fat:3, tags:["protein","lunch","dinner","snack"] },
  { id:"chicken_soup_small", name:"Chicken soup (small bowl)", cal:55, pro:7, carb:3, fat:2, tags:["protein","snack"] },
  { id:"chicken_paratha", name:"Chicken whole wheat paratha (1)", cal:220, pro:16, carb:22, fat:7, tags:["protein","carb","breakfast","lunch"] },
  { id:"egg_1", name:"Egg boiled / omelette (1)", cal:70, pro:6, carb:0, fat:5, tags:["protein","breakfast","snack"] },
  { id:"egg_2", name:"Eggs boiled / omelette (2)", cal:140, pro:12, carb:0, fat:10, tags:["protein","breakfast","snack"] },
  { id:"egg_3", name:"Eggs boiled / omelette (3)", cal:210, pro:18, carb:0, fat:15, tags:["protein","breakfast"] },
  { id:"egg_bhurji_3", name:"Egg bhurji (3 eggs)", cal:195, pro:16, carb:4, fat:12, tags:["protein","breakfast"] },
  { id:"egg_drop_soup", name:"Egg drop soup (bowl)", cal:80, pro:7, carb:4, fat:4, tags:["protein","dinner"] },
  { id:"cheese_omelette_3", name:"3-egg cheese omelette (Friday treat)", cal:245, pro:19, carb:2, fat:18, tags:["protein","breakfast"] },
  { id:"paneer_75", name:"Paneer cubes roasted (75g)", cal:190, pro:13, carb:2, fat:14, tags:["protein","snack","dinner"] },
  { id:"paneer_100", name:"Paneer (100g)", cal:265, pro:18, carb:3, fat:20, tags:["protein","lunch","dinner"] },
  { id:"paneer_150", name:"Paneer (150g)", cal:398, pro:27, carb:5, fat:30, tags:["protein","lunch"] },
  { id:"paneer_tikka_150", name:"Paneer tikka grilled (150g)", cal:285, pro:20, carb:5, fat:20, tags:["protein","dinner","lunch"] },
  { id:"paneer_bhurji_100", name:"Paneer bhurji (100g)", cal:245, pro:16, carb:4, fat:18, tags:["protein","dinner"] },
  { id:"paneer_paratha", name:"Paneer whole wheat paratha (1)", cal:235, pro:10, carb:22, fat:12, tags:["protein","carb","breakfast","lunch"] },
  { id:"soya_50", name:"Roasted soya chunks (50g)", cal:175, pro:25, carb:8, fat:1, tags:["protein","snack"] },
  { id:"soya_curry_100", name:"Soya chunk curry (100g)", cal:130, pro:17, carb:8, fat:3, tags:["protein","dinner"] },
  { id:"brown_rice", name:"Brown rice (3/4 katori)", cal:120, pro:3, carb:25, fat:1, tags:["carb","lunch"] },
  { id:"jowar_roti", name:"Jowar roti (1)", cal:60, pro:2, carb:12, fat:1, tags:["carb","lunch"] },
  { id:"bajra_roti", name:"Bajra roti (1)", cal:65, pro:2, carb:13, fat:1, tags:["carb","lunch"] },
  { id:"ww_roti", name:"Whole wheat roti (1)", cal:70, pro:3, carb:14, fat:1, tags:["carb","lunch"] },
  { id:"ww_paratha", name:"Whole wheat paratha (1, minimal ghee)", cal:140, pro:4, carb:22, fat:5, tags:["carb","breakfast","lunch"] },
  { id:"aloo_paratha", name:"Aloo paratha whole wheat (1, treat)", cal:200, pro:5, carb:32, fat:6, tags:["carb","breakfast"] },
  { id:"onion_paratha", name:"Onion paratha whole wheat (1)", cal:165, pro:4, carb:28, fat:5, tags:["carb","breakfast"] },
  { id:"daliya", name:"Daliya / savory broken wheat (bowl)", cal:110, pro:4, carb:22, fat:1, tags:["carb","breakfast","lunch"] },
  { id:"rava_upma", name:"Rava upma (1 small bowl)", cal:115, pro:3, carb:20, fat:3, tags:["carb","breakfast"] },
  { id:"poha", name:"Poha (1 small bowl)", cal:120, pro:3, carb:23, fat:2, tags:["carb","breakfast"] },
  { id:"idli_2", name:"Idli plain (2)", cal:80, pro:3, carb:16, fat:0, tags:["carb","breakfast"] },
  { id:"idli_3", name:"Idli plain (3)", cal:120, pro:4, carb:24, fat:0, tags:["carb","breakfast"] },
  { id:"uthappam_2", name:"Uthappam onion-tomato (2)", cal:130, pro:4, carb:22, fat:3, tags:["carb","breakfast"] },
  { id:"rava_dosa_2", name:"Rava dosa no maida (2)", cal:140, pro:4, carb:25, fat:3, tags:["carb","breakfast","lunch"] },
  { id:"rava_appe_5", name:"Rava appe (4-5 pieces)", cal:130, pro:3, carb:22, fat:4, tags:["carb","breakfast"] },
  { id:"savory_oats", name:"Savory oats (1 bowl)", cal:145, pro:5, carb:25, fat:3, tags:["carb","breakfast","dinner"] },
  { id:"ww_toast", name:"Whole wheat toast (1 slice)", cal:70, pro:3, carb:13, fat:1, tags:["carb","breakfast"] },
  { id:"papaya", name:"Papaya (1 bowl)", cal:55, pro:1, carb:13, fat:0, tags:["fruit","breakfast","lunch"] },
  { id:"guava", name:"Guava (1 bowl)", cal:50, pro:2, carb:11, fat:1, tags:["fruit","breakfast","lunch"] },
  { id:"fruit_chaat", name:"Fruit chaat — papaya+guava+pear", cal:90, pro:2, carb:21, fat:0, tags:["fruit","snack","midmorning"] },
  { id:"pear", name:"Pear (1 medium)", cal:55, pro:0, carb:14, fat:0, tags:["fruit","snack"] },
  { id:"curd", name:"Curd / plain yogurt (bowl)", cal:60, pro:4, carb:5, fat:3, tags:["dairy","lunch","dinner","snack"] },
  { id:"greek_yogurt", name:"Greek yogurt (bowl)", cal:80, pro:9, carb:5, fat:2, tags:["dairy","snack","midmorning"] },
  { id:"buttermilk", name:"Buttermilk no salt (glass)", cal:35, pro:3, carb:4, fat:1, tags:["dairy","snack","midmorning"] },
  { id:"makhana", name:"Roasted makhana (handful)", cal:55, pro:2, carb:11, fat:0, tags:["snack","midmorning","evening"] },
  { id:"popcorn", name:"Air-popped popcorn (1 cup, no butter)", cal:30, pro:1, carb:6, fat:0, tags:["snack","evening"] },
  { id:"tomato_soup", name:"Tomato soup homemade (bowl)", cal:45, pro:2, carb:8, fat:1, tags:["snack","evening","lunch"] },
  { id:"black_coffee", name:"Black coffee no sugar (1 cup)", cal:2, pro:0, carb:0, fat:0, tags:["beverage","snack","morning","evening"] },
  { id:"almonds_walnuts", name:"4 almonds + 2 walnuts", cal:60, pro:2, carb:2, fat:5, tags:["morning","snack"] },
  { id:"coconut_chutney", name:"Coconut-coriander chutney (tbsp)", cal:25, pro:1, carb:2, fat:2, tags:["condiment"] },
  { id:"green_chutney", name:"Green chutney (tbsp)", cal:10, pro:0, carb:2, fat:0, tags:["condiment"] },
];

const MEALS = [
  { id:"morning",    label:"Morning start",   icon:"☀️",  time:"7:00 AM",  tags:["morning","beverage"] },
  { id:"breakfast",  label:"Breakfast",        icon:"🍳",  time:"8:00 AM",  tags:["protein","carb","fruit","dairy","condiment"] },
  { id:"midmorning", label:"Mid-morning",      icon:"☕",  time:"11:00 AM", tags:["dairy","snack","fruit","beverage","midmorning"] },
  { id:"lunch",      label:"Lunch",            icon:"🍽",  time:"1:00 PM",  tags:["protein","carb","fruit","dairy","condiment","snack"] },
  { id:"evening",    label:"Evening snack",    icon:"🌆",  time:"4:30 PM",  tags:["protein","snack","beverage","dairy","evening"] },
  { id:"dinner",     label:"Dinner",           icon:"🌙",  time:"7:30 PM",  tags:["protein","dairy","snack"] },
];

const ACTIVITIES = [
  { id:"morning_walk",      label:"Morning walk",      cpm:5, target:40, max:60 },
  { id:"post_lunch_walk",   label:"Post-lunch walk",   cpm:4, target:15, max:30 },
  { id:"post_dinner_walk",  label:"Post-dinner walk",  cpm:4, target:20, max:30 },
];

const HABITS = [
  { k:"almonds_walnuts", l:"4 almonds + 2 walnuts done" },
  { k:"no_sugar",        l:"Zero sugar / jaggery / honey" },
  { k:"no_fried",        l:"No fried food today" },
  { k:"early_dinner",    l:"Dinner before 8 PM" },
  { k:"sleep_1030",      l:"Sleep by 10:30 PM" },
];

function todayKey() { return new Date().toISOString().split("T")[0]; }

/* ── RING SVG ─────────────────────────────────────────────── */
function Ring({ pct=0, size=80, stroke=8, color="#22d3ee", glow, label, sub }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <div style={{ position:"relative", width:size, height:size }}>
        <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition:"stroke-dasharray .6s cubic-bezier(.4,0,.2,1)", filter: glow ? `drop-shadow(0 0 6px ${color})` : "none" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:14, fontWeight:700, color:"#fff", lineHeight:1 }}>{label}</span>
          {sub && <span style={{ fontSize:10, color:"rgba(255,255,255,0.5)", marginTop:2 }}>{sub}</span>}
        </div>
      </div>
    </div>
  );
}

/* ── ANIMATED COUNTER ─────────────────────────────────────── */
function Counter({ value, suffix="" }) {
  const [disp, setDisp] = useState(0);
  useEffect(() => {
    let start = 0; const end = value; const dur = 600;
    const step = Math.ceil(end / (dur / 16));
    const t = setInterval(() => {
      start = Math.min(start + step, end);
      setDisp(start);
      if (start >= end) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [value]);
  return <span>{disp}{suffix}</span>;
}

/* ── MAIN APP ─────────────────────────────────────────────── */
export default function App() {
  const [log, setLog]         = useState({ foods:{}, activity:{}, water:0, habits:{}, weight:null });
  const [view, setView]       = useState("today");
  const [openMeal, setOpenMeal] = useState(null);
  const [search, setSearch]   = useState("");
  const [saving, setSaving]   = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [toast, setToast]     = useState(null);

  const dk = todayKey();

  /* load today */
  useEffect(() => {
    supabase.from("health_logs").select("*").eq("log_date", dk).single()
      .then(({ data }) => {
        if (data) setLog({ foods: data.foods||{}, activity: data.activity||{}, water: data.water||0, habits: data.habits||{}, weight: data.weight });
      });
  }, [dk]);

  /* save to supabase */
  const persist = useCallback(async (patch) => {
    const next = { ...log, ...patch };
    setLog(next);
    setSaving(true);
    await supabase.from("health_logs").upsert({ log_date: dk, ...next }, { onConflict: "log_date" });
    setSaving(false);
    showToast("Saved");
  }, [log, dk]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  function toggleFood(mealId, foodId) {
    const mf = { ...(log.foods?.[mealId]||{}) };
    mf[foodId] ? delete mf[foodId] : (mf[foodId] = true);
    persist({ foods: { ...log.foods, [mealId]: mf } });
  }
  function setActivity(id, val) { persist({ activity: { ...log.activity, [id]: val } }); }
  function setWater(v) { persist({ water: Math.min(5, Math.max(0, +v.toFixed(1))) }); }
  function toggleHabit(k) { persist({ habits: { ...log.habits, [k]: !log.habits?.[k] } }); }
  function setWeight(v) { persist({ weight: v }); }

  /* macros */
  const allIds = Object.values(log.foods||{}).flatMap(m => Object.keys(m));
  const mac = allIds.reduce((a, id) => {
    const f = FOOD_DB.find(x => x.id===id); if(!f) return a;
    return { cal: a.cal+f.cal, pro: a.pro+f.pro, carb: a.carb+f.carb, fat: a.fat+f.fat };
  }, { cal:0, pro:0, carb:0, fat:0 });
  const burnAct = ACTIVITIES.reduce((s,a) => s+(log.activity?.[a.id]||0)*a.cpm, 0);
  const totalBurn = 1800 + burnAct;
  const netDef = totalBurn - mac.cal;
  const waterL = +(log.water||0).toFixed(1);
  const mealsDone = MEALS.filter(m => Object.keys(log.foods?.[m.id]||{}).length > 0).length;
  const habDone = Object.values(log.habits||{}).filter(Boolean).length;

  /* load history */
  useEffect(() => {
    if (view !== "summary") return;
    setLoadingHistory(true);
    supabase.from("health_logs").select("*").order("log_date", { ascending: false }).limit(30)
      .then(({ data }) => { setHistory(data||[]); setLoadingHistory(false); });
  }, [view]);

  const dayName = new Date().toLocaleDateString("en-IN",{ weekday:"long" });

  return (
    <>
      <Head><title>Azeem — Health Tracker</title></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0a0a0f;color:#fff;font-family:'Inter',system-ui,sans-serif;min-height:100vh}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
        input,button{font-family:inherit}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
        .card{background:#13131a;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:20px;animation:fadeIn .3s ease}
        .food-item{display:flex;align-items:center;gap:10;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);cursor:pointer;transition:all .15s;margin-bottom:6px}
        .food-item:hover{border-color:rgba(255,255,255,0.18);background:rgba(255,255,255,0.04)}
        .food-item.sel{border-color:#22d3ee;background:rgba(34,211,238,0.08)}
        .pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;background:rgba(34,211,238,0.12);color:#67e8f9;border:1px solid rgba(34,211,238,0.2)}
        .nav-btn{padding:8px 20px;border-radius:24px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.5);font-size:13px;cursor:pointer;transition:all .2s}
        .nav-btn.active{background:#22d3ee;color:#000;border-color:#22d3ee;font-weight:600}
        .min-btn{padding:4px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.4);font-size:11px;cursor:pointer;transition:all .15s}
        .min-btn:hover{border-color:#22d3ee;color:#22d3ee}
        .min-btn.act{border-color:#22d3ee;background:rgba(34,211,238,0.15);color:#22d3ee}
        .habit-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.07);cursor:pointer;transition:all .2s;margin-bottom:8px}
        .habit-row:hover{border-color:rgba(255,255,255,0.15)}
        .habit-row.done{border-color:#4ade80;background:rgba(74,222,128,0.08)}
        .toast{position:fixed;bottom:24px;right:24px;background:#22d3ee;color:#000;padding:8px 20px;border-radius:24px;font-size:13px;font-weight:600;animation:fadeIn .2s ease;z-index:999}
        .meal-card{border-radius:16px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;margin-bottom:10px;transition:border-color .2s}
        .meal-card.done{border-color:rgba(74,222,128,0.3)}
        .meal-header{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;transition:background .2s}
        .meal-header:hover{background:rgba(255,255,255,0.03)}
        input[type=text],input[type=number]{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:10px;padding:10px 14px;font-size:13px;width:100%;outline:none;transition:border-color .2s}
        input[type=text]:focus,input[type=number]:focus{border-color:#22d3ee}
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      <div style={{ maxWidth:680, margin:"0 auto", padding:"24px 16px" }}>

        {/* header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.5px" }}>
              <span style={{ color:"#22d3ee" }}>A</span>zeem
              <span style={{ color:"rgba(255,255,255,0.3)", fontWeight:400, fontSize:14, marginLeft:8 }}>Health OS</span>
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:2 }}>
              {dayName}, {new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
              {saving && <span style={{ marginLeft:8, color:"#22d3ee", animation:"pulse 1s infinite" }}>saving…</span>}
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {["today","summary"].map(v => (
              <button key={v} className={`nav-btn${view===v?" active":""}`} onClick={()=>setView(v)}>
                {v==="today"?"Today":"History"}
              </button>
            ))}
          </div>
        </div>

        {view==="today" && (
          <>
            {/* macro ring row */}
            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-around", flexWrap:"wrap", gap:12 }}>
                <Ring pct={Math.round((mac.cal/1600)*100)} color="#22d3ee" glow label={`${mac.cal}`} sub="kcal in" />
                <Ring pct={Math.round((totalBurn/2200)*100)} color="#a78bfa" glow label={`${Math.round(totalBurn)}`} sub="burned" />
                <Ring pct={Math.round((mac.pro/100)*100)} color="#4ade80" glow label={`${mac.pro}g`} sub="protein" />
                <Ring pct={Math.round((waterL/3.5)*100)} color="#38bdf8" label={`${waterL}L`} sub="water" />
              </div>
              {netDef !== 0 && (
                <div style={{ marginTop:16, textAlign:"center", fontSize:13, color:"rgba(255,255,255,0.4)" }}>
                  Net deficit: <span style={{ color: netDef>0?"#4ade80":"#f87171", fontWeight:700 }}>
                    {netDef>0?"+":""}{Math.round(netDef)} kcal
                  </span>
                  <span style={{ marginLeft:8, fontSize:11, color:"rgba(255,255,255,0.25)" }}>
                    {netDef>0?"Burning more than intake — on track":"Watch it — intake exceeds burn"}
                  </span>
                </div>
              )}
            </div>

            {/* macro bars */}
            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.4)", marginBottom:14, textTransform:"uppercase", letterSpacing:"0.06em" }}>Macros today</div>
              {[
                { label:"Calories", val:mac.cal, max:1600, color:"#22d3ee", unit:"kcal" },
                { label:"Protein",  val:mac.pro, max:100,  color:"#4ade80", unit:"g" },
                { label:"Carbs",    val:mac.carb,max:130,  color:"#fbbf24", unit:"g" },
                { label:"Fat",      val:mac.fat, max:55,   color:"#f87171", unit:"g" },
              ].map(b => {
                const p = Math.min(100, Math.round((b.val/b.max)*100));
                return (
                  <div key={b.label} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
                      <span style={{ color:"rgba(255,255,255,0.5)" }}>{b.label}</span>
                      <span style={{ fontWeight:600, color: p>100?"#f87171": p>=80?"#4ade80":"#fff" }}>{b.val} {b.unit} <span style={{color:"rgba(255,255,255,0.25)"}}>/ {b.max}</span></span>
                    </div>
                    <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${p}%`, background: p>100?"#f87171":b.color, borderRadius:3,
                        transition:"width .5s cubic-bezier(.4,0,.2,1)", boxShadow:`0 0 8px ${b.color}66` }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* water */}
            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>💧 Water intake</span>
                <span style={{ fontSize:12, color: waterL>=3.5?"#4ade80":"#fbbf24" }}>
                  {waterL>=3.5 ? "✓ Target met!" : `${(3.5-waterL).toFixed(1)}L to go`}
                </span>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {[0,.5,1,1.5,2,2.5,3,3.5,4,4.5,5].map(v => (
                  <button key={v} onClick={()=>setWater(v)} style={{
                    padding:"6px 12px", borderRadius:8, border:"1px solid", fontSize:12, cursor:"pointer", fontWeight:v===waterL?700:400,
                    borderColor: waterL>=v&&v>0?"#38bdf8":"rgba(255,255,255,0.1)",
                    background: waterL>=v&&v>0?"rgba(56,189,248,0.15)":"transparent",
                    color: waterL>=v&&v>0?"#38bdf8":"rgba(255,255,255,0.35)",
                    transition:"all .15s"
                  }}>{v}L</button>
                ))}
              </div>
            </div>

            {/* activity */}
            <div className="card" style={{ marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>🏃 Activity</div>
              {ACTIVITIES.map(a => {
                const val = log.activity?.[a.id]||0;
                const done = val>=a.target;
                return (
                  <div key={a.id} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:6 }}>
                      <span style={{ color: done?"#4ade80":"rgba(255,255,255,0.6)" }}>{a.label}</span>
                      <span style={{ color: done?"#4ade80":"rgba(255,255,255,0.4)", fontWeight:600 }}>
                        {val} min {done?"✓":`/ ${a.target}`} · {Math.round(val*a.cpm)} kcal
                      </span>
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                      {Array.from({length:a.max/5+1},(_,i)=>i*5).map(v=>(
                        <button key={v} className={`min-btn${val===v?" act":val>v&&v>0?" act":""}`}
                          style={{ opacity: val===v?1:v<=val&&v>0?0.7:0.4 }}
                          onClick={()=>setActivity(a.id,v)}>{v}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* meals */}
            <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.4)", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              Meals — {mealsDone}/{MEALS.length} logged
            </div>
            {MEALS.map(meal => {
              const sel = log.foods?.[meal.id]||{};
              const selKeys = Object.keys(sel);
              const mCal = selKeys.reduce((s,id)=>{const f=FOOD_DB.find(x=>x.id===id);return f?s+f.cal:s;},0);
              const mPro = selKeys.reduce((s,id)=>{const f=FOOD_DB.find(x=>x.id===id);return f?s+f.pro:s;},0);
              const isOpen = openMeal===meal.id;
              const pool = FOOD_DB.filter(f => f.tags.some(t => meal.tags.includes(t)));
              const filtered = search ? pool.filter(f=>f.name.toLowerCase().includes(search.toLowerCase())) : pool;

              return (
                <div key={meal.id} className={`meal-card${selKeys.length>0?" done":""}`}>
                  <div className="meal-header" style={{ background: isOpen?"rgba(255,255,255,0.03)":"transparent" }}
                    onClick={()=>{ setOpenMeal(isOpen?null:meal.id); setSearch(""); }}>
                    <span style={{ fontSize:22 }}>{meal.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{meal.label}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>{meal.time}</div>
                    </div>
                    {selKeys.length>0 && (
                      <div style={{ textAlign:"right", marginRight:8 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#22d3ee" }}>{mCal} kcal</div>
                        <div style={{ fontSize:11, color:"#4ade80" }}>{mPro}g protein</div>
                      </div>
                    )}
                    {selKeys.length===0 && <span style={{ fontSize:11, color:"rgba(255,255,255,0.2)", marginRight:8 }}>tap to log</span>}
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.25)", transition:"transform .2s", display:"inline-block", transform:isOpen?"rotate(180deg)":"none" }}>▾</span>
                  </div>

                  {selKeys.length>0 && !isOpen && (
                    <div style={{ padding:"0 16px 12px", display:"flex", flexWrap:"wrap", gap:5 }}>
                      {selKeys.map(id=>{const f=FOOD_DB.find(x=>x.id===id);return f?<span key={id} className="pill">{f.name}</span>:null;})}
                    </div>
                  )}

                  {isOpen && (
                    <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"12px 16px", animation:"slideIn .2s ease" }}>
                      <input type="text" placeholder="Search food items…" value={search} onChange={e=>setSearch(e.target.value)} style={{ marginBottom:10 }}/>
                      <div style={{ maxHeight:280, overflowY:"auto" }}>
                        {filtered.map(f => {
                          const checked = !!sel[f.id];
                          return (
                            <div key={f.id} className={`food-item${checked?" sel":""}`} onClick={()=>toggleFood(meal.id,f.id)}>
                              <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${checked?"#22d3ee":"rgba(255,255,255,0.2)"}`,
                                background:checked?"#22d3ee":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }}>
                                {checked && <span style={{ color:"#000", fontSize:11, fontWeight:900 }}>✓</span>}
                              </div>
                              <span style={{ flex:1, fontSize:12, color: checked?"#fff":"rgba(255,255,255,0.65)" }}>{f.name}</span>
                              <div style={{ textAlign:"right", flexShrink:0 }}>
                                <span style={{ fontSize:12, fontWeight:700, color:"#22d3ee" }}>{f.cal}</span>
                                <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}> kcal · </span>
                                <span style={{ fontSize:11, color:"#4ade80" }}>{f.pro}g P</span>
                              </div>
                            </div>
                          );
                        })}
                        {!filtered.length && <div style={{ textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:12, padding:"20px 0" }}>No items found</div>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* habits */}
            <div className="card" style={{ marginTop:14 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>✅ Daily habits — {habDone}/{HABITS.length}</div>
              {HABITS.map(h => (
                <div key={h.k} className={`habit-row${log.habits?.[h.k]?" done":""}`} onClick={()=>toggleHabit(h.k)}>
                  <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${log.habits?.[h.k]?"#4ade80":"rgba(255,255,255,0.2)"}`,
                    background:log.habits?.[h.k]?"#4ade80":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s", flexShrink:0 }}>
                    {log.habits?.[h.k] && <span style={{ color:"#000", fontSize:12, fontWeight:900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:13, color: log.habits?.[h.k]?"#4ade80":"rgba(255,255,255,0.6)" }}>{h.l}</span>
                </div>
              ))}
            </div>

            {/* weight */}
            <div className="card" style={{ marginTop:14 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>⚖️ Weight (Monday weigh-in)</div>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <input type="number" step="0.1" min="50" max="200" placeholder="e.g. 119.5"
                  value={log.weight||""} onChange={e=>setWeight(e.target.value?+e.target.value:null)}
                  style={{ maxWidth:160 }}/>
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>kg · Starting: 120 kg · Target: 106–110 kg</span>
              </div>
              {log.weight && (
                <div style={{ marginTop:8, fontSize:13, color:"#22d3ee" }}>
                  Lost: <strong>{(120 - log.weight).toFixed(1)} kg</strong>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginLeft:8 }}>
                    {Math.round(((120-log.weight)/14)*100)}% of 14kg goal
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {view==="summary" && (
          <SummaryView history={history} loading={loadingHistory} />
        )}

        <div style={{ height:40 }}/>
      </div>
    </>
  );
}

/* ── SUMMARY VIEW ─────────────────────────────────────────── */
function SummaryView({ history, loading }) {
  if (loading) return <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,0.3)", animation:"pulse 1s infinite" }}>Loading history…</div>;
  if (!history.length) return <div style={{ textAlign:"center", padding:"60px 0", color:"rgba(255,255,255,0.3)" }}>No history yet — start logging today!</div>;

  const rows = history.map(d => {
    const ids = Object.values(d.foods||{}).flatMap(m=>Object.keys(m));
    const cal = ids.reduce((s,id)=>{const f=FOOD_DB.find(x=>x.id===id);return f?s+f.cal:s;},0);
    const pro = ids.reduce((s,id)=>{const f=FOOD_DB.find(x=>x.id===id);return f?s+f.pro:s;},0);
    const burn = ACTIVITIES.reduce((s,a)=>s+(d.activity?.[a.id]||0)*a.cpm,0);
    return { date:d.log_date, cal, pro, burn, water:+(d.water||0).toFixed(1),
      meals:Object.values(d.foods||{}).filter(m=>Object.keys(m).length).length, weight:d.weight };
  });

  const avg = f => Math.round(rows.reduce((s,r)=>s+(r[f]||0),0)/rows.length);

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
        {[
          { l:"Avg calories",  v:`${avg("cal")} kcal`, c:"#22d3ee" },
          { l:"Avg protein",   v:`${avg("pro")}g`,      c:"#4ade80" },
          { l:"Avg walk burn", v:`${avg("burn")} kcal`, c:"#a78bfa" },
          { l:"Avg water",     v:`${(rows.reduce((s,r)=>s+r.water,0)/rows.length).toFixed(1)} L`, c:"#38bdf8" },
        ].map((c,i)=>(
          <div key={i} style={{ background:"#13131a", borderRadius:12, padding:"14px 12px", border:"1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:6 }}>{c.l}</div>
            <div style={{ fontSize:18, fontWeight:700, color:c.c }}>{c.v}</div>
          </div>
        ))}
      </div>

      <div style={{ background:"#13131a", borderRadius:16, border:"1px solid rgba(255,255,255,0.07)", overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"90px 60px 70px 60px 50px 50px 60px", gap:6,
          padding:"10px 16px", background:"rgba(255,255,255,0.03)", fontSize:11, color:"rgba(255,255,255,0.3)", fontWeight:600, letterSpacing:"0.04em" }}>
          <span>DATE</span><span>MEALS</span><span>CALORIES</span><span>PROTEIN</span><span>BURN</span><span>WATER</span><span>WEIGHT</span>
        </div>
        {rows.map((r,i)=>(
          <div key={r.date} style={{ display:"grid", gridTemplateColumns:"90px 60px 70px 60px 50px 50px 60px", gap:6,
            padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.05)", fontSize:12,
            background:i%2===0?"transparent":"rgba(255,255,255,0.01)", animation:"fadeIn .3s ease" }}>
            <span style={{ color:"rgba(255,255,255,0.35)", fontSize:11 }}>{r.date}</span>
            <span style={{ color:r.meals>=4?"#4ade80":"rgba(255,255,255,0.5)" }}>{r.meals}/6</span>
            <span style={{ color:"#22d3ee", fontWeight:700 }}>{r.cal}</span>
            <span style={{ color:"#4ade80", fontWeight:600 }}>{r.pro}g</span>
            <span style={{ color:"#a78bfa" }}>{r.burn}</span>
            <span style={{ color:r.water>=3.5?"#38bdf8":"#fbbf24" }}>{r.water}L</span>
            <span style={{ color:"rgba(255,255,255,0.5)" }}>{r.weight?`${r.weight}kg`:"—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
