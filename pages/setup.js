import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";

const P = "#714B67", PL = "#f3eef1", G = "#1D9E75", GL = "#e1f5ee", A = "#EF9F27", AL = "#faeeda";
const BORDER = "#e5e3ee", TXT = "#2c1a3a", TXT2 = "#888", BG = "#f0f0f7";

const CONDITIONS = [
  { key: "diabetic", label: "Diabetes", sub: "Type 1 / Type 2 / Pre-diabetic" },
  { key: "hypertension", label: "Hypertension / High BP", sub: "Elevated blood pressure" },
  { key: "cholesterol", label: "High Cholesterol", sub: "Dyslipidaemia" },
  { key: "thyroid", label: "Thyroid", sub: "Hypo or Hyper thyroid" },
  { key: "pcod", label: "PCOD / PCOS", sub: "Polycystic ovary syndrome" },
  { key: "piles", label: "Piles / Haemorrhoids", sub: "Avoid high-fibre irritants" },
  { key: "kidney", label: "Kidney issues", sub: "CKD or kidney stones" },
  { key: "heart", label: "Heart condition", sub: "Cardiac issues" },
  { key: "obesity", label: "Obesity", sub: "BMI > 30" },
  { key: "arthritis", label: "Arthritis", sub: "Joint inflammation" },
  { key: "digestive", label: "Digestive issues", sub: "IBS, acidity, bloating" },
  { key: "none", label: "No medical conditions", sub: "Generally healthy" },
];

const CUISINES = [
  "Indian (North)", "Indian (South)",
  "Mediterranean", "Middle Eastern / Arabic",
  "Italian", "Continental / European",
  "Asian (Chinese / Thai / Japanese)",
  "Mexican / Latin American",
  "American", "Mixed / No preference",
];
const ACTIVITY_LEVELS = [
  { val: "sedentary", label: "Sedentary", sub: "Desk job, little movement" },
  { val: "light", label: "Lightly active", sub: "Light walks, some activity" },
  { val: "moderate", label: "Moderately active", sub: "Regular exercise 3-4x/week" },
  { val: "active", label: "Very active", sub: "Daily intense exercise" },
];
const DIET_TYPES = ["Vegetarian", "Eggetarian", "Non-Vegetarian", "Vegan", "Jain", "Keto", "Gluten-Free", "Dairy-Free"];
const MEALS_OPTIONS = [3, 4, 5, 6];

export default function Setup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    full_name: "", dob: "", gender: "", height_cm: "", height_unit: "cm",
    height_ft: "", height_in: "", weight_start: "", weight_target: "",
    activity_level: "",
    conditions: {}, allergies: "", medications: "",
    diet_type: "", preferred_cuisine: "", meals_per_day: 6,
    water_target: 3.5,
  });

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/"); return; }
      setUserId(session.user.id);
      getSupabase().from("profiles").select("full_name,setup_complete,account_type").eq("id", session.user.id).single()
        .then(({ data }) => {
          if (data?.setup_complete) { router.push("/dashboard"); return; }
          // Individual users: redirect to /signup which handles the post-verify question flow
          if (data?.account_type === "individual" || !data?.account_type) { router.replace("/signup"); return; }
          if (data?.full_name) setForm(f => ({ ...f, full_name: data.full_name }));
        });
    });
  }, []);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function toggleCondition(key) {
    if (key === "none") {
      setForm(f => ({ ...f, conditions: f.conditions?.none ? {} : { none: true } }));
      return;
    }
    setForm(f => {
      const c = { ...f.conditions };
      if (c.none) delete c.none;
      c[key] ? delete c[key] : (c[key] = true);
      return { ...f, conditions: c };
    });
  }

  function getHeightCm() {
    if (form.height_unit === "cm") return parseFloat(form.height_cm) || null;
    const ft = parseFloat(form.height_ft) || 0;
    const inch = parseFloat(form.height_in) || 0;
    return Math.round((ft * 30.48) + (inch * 2.54));
  }

  function getBMI() {
    const h = getHeightCm();
    const w = parseFloat(form.weight_start);
    if (!h || !w) return null;
    return (w / ((h / 100) ** 2)).toFixed(1);
  }

  function step1Valid() {
    return form.full_name && form.dob && form.gender && form.weight_start && form.weight_target && form.activity_level && getHeightCm();
  }

  function step2Valid() {
    return Object.keys(form.conditions).length > 0;
  }

  function step3Valid() {
    return form.diet_type && form.preferred_cuisine;
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const sb = getSupabase();
    const heightCm = getHeightCm();
    const { error: err } = await sb.from("profiles").update({
      full_name: form.full_name,
      dob: form.dob,
      gender: form.gender,
      height_cm: heightCm,
      weight_start: parseFloat(form.weight_start),
      weight_current: parseFloat(form.weight_start),
      weight_target: parseFloat(form.weight_target),
      activity_level: form.activity_level,
      conditions: form.conditions,
      allergies: form.allergies || null,
      medications: form.medications || null,
      diet_type: form.diet_type,
      preferred_cuisine: form.preferred_cuisine,
      meals_per_day: form.meals_per_day,
      water_target: form.water_target,
      setup_complete: true,
    }).eq("id", userId);

    if (err) { setError(err.message); setSaving(false); return; }
    // Verify write succeeded before redirecting (prevents stale-cache loop)
    const { data: verify } = await sb.from('profiles').select('setup_complete').eq('id', userId).single();
    if (!verify?.setup_complete) {
      setError('Profile save failed. Please try again.');
      setSaving(false);
      return;
    }
    router.replace('/dashboard');
  }

  const bmi = getBMI();

  return (
    <>
      <Head><title>Profile setup — Blitora Pulse</title></Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${BG}; font-family: 'Inter', system-ui, sans-serif; color: ${TXT}; min-height: 100vh; }
        .wrap { max-width: 560px; margin: 0 auto; padding: 24px 16px 48px; }
        .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
        .logo-mark { width: 36px; height: 36px; background: #1D9E75; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .logo-text { font-size: 16px; font-weight: 700; color: #0D1B3E; }
        .progress-bar { display: flex; gap: 6px; margin-bottom: 28px; }
        .progress-step { flex: 1; height: 4px; border-radius: 2px; transition: background .3s; }
        .step-label { font-size: 12px; color: ${TXT2}; margin-bottom: 4px; }
        .step-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .step-sub { font-size: 13px; color: ${TXT2}; margin-bottom: 24px; }
        .card { background: #fff; border-radius: 14px; border: 1px solid ${BORDER}; padding: 20px; margin-bottom: 14px; }
        .label { display: block; font-size: 11px; font-weight: 700; color: ${TXT2}; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
        .input { width: 100%; padding: 10px 13px; border: 1.5px solid ${BORDER}; border-radius: 9px; font-size: 14px; color: ${TXT}; outline: none; transition: border-color .2s; background: #fff; font-family: inherit; }
        .input:focus { border-color: ${P}; }
        .input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        .input-wrap { margin-bottom: 14px; }
        select.input { cursor: pointer; }
        .radio-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .radio-btn { padding: 8px 14px; border-radius: 20px; border: 1.5px solid ${BORDER}; font-size: 13px; cursor: pointer; transition: all .15s; background: #fff; color: ${TXT2}; font-family: inherit; }
        .radio-btn.sel { border-color: ${P}; background: ${PL}; color: ${P}; font-weight: 600; }
        .cond-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .cond-item { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border: 1.5px solid ${BORDER}; border-radius: 10px; cursor: pointer; transition: all .15s; }
        .cond-item.sel { border-color: ${P}; background: ${PL}; }
        .cond-check { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid ${BORDER}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; transition: all .15s; }
        .cond-check.on { background: ${P}; border-color: ${P}; }
        .activity-grid { display: flex; flex-direction: column; gap: 8px; }
        .activity-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1.5px solid ${BORDER}; border-radius: 10px; cursor: pointer; transition: all .15s; }
        .activity-item.sel { border-color: ${P}; background: ${PL}; }
        .activity-radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid ${BORDER}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; }
        .activity-radio.on { border-color: ${P}; }
        .activity-radio.on::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: ${P}; display: block; }
        .bmi-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px; }
        .water-row { display: flex; align-items: center; gap: 10px; }
        .water-btn { width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid ${BORDER}; background: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: ${P}; font-weight: 700; }
        .btn-primary { width: 100%; padding: 13px; background: ${P}; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background .2s; font-family: inherit; }
        .btn-primary:hover { background: #5a3a53; }
        .btn-primary:disabled { background: #b8a0b0; cursor: not-allowed; }
        .btn-secondary { width: 100%; padding: 11px; background: #fff; color: ${TXT2}; border: 1.5px solid ${BORDER}; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; margin-bottom: 10px; }
        .btn-secondary:hover { border-color: ${P}; color: ${P}; }
        .error-box { background: #fff0f0; border: 1px solid #ffd0d0; color: #c0392b; border-radius: 9px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; display: inline-block; margin-right: 8px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 480px) {
          .cond-grid { grid-template-columns: 1fr; }
          .input-row { grid-template-columns: 1fr; }
          .radio-btn { font-size: 12px; padding: 7px 11px; }
        }
      `}</style>

      <div className="wrap">
        <div className="logo">
                    <svg width="38" height="38" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
            <rect width="200" height="200" rx="36" fill="#0D1B3E"/>
            <path d="M48 38L48 148L112 148C134 148 152 132 152 112C152 100 146 90 136 84C144 78 150 68 150 56C150 44 138 38 112 38ZM68 58L110 58C120 58 126 64 126 72C126 80 120 86 110 86L68 86ZM68 106L112 106C124 106 132 112 132 120C132 128 124 134 112 134L68 134Z" fill="white"/>
            <polygon points="105,46 84,90 100,90 82,136 124,80 106,80 120,46" fill="#1D9E75"/>
            <polyline points="20,162 42,162 50,144 60,180 70,152 80,162 180,162" stroke="#1D9E75" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div><div className="logo-text">Blitora Pulse</div><div style={{fontSize:9,color:"#9CA3AF",letterSpacing:"0.07em",textTransform:"uppercase",marginTop:1}}>Health Platform</div></div>
        </div>

        <div className="progress-bar">
          {[1,2,3].map(s => (
            <div key={s} className="progress-step" style={{background: s <= step ? P : BORDER}}/>
          ))}
        </div>

        <div className="step-label">Step {step} of 3</div>
        {step === 1 && <><div className="step-title">Personal details</div><div className="step-sub">Tell us about yourself so we can personalise your plan</div></>}
        {step === 2 && <><div className="step-title">Health conditions</div><div className="step-sub">Select all that apply — this sets your meal template</div></>}
        {step === 3 && <><div className="step-title">Diet preferences</div><div className="step-sub">Almost done — your food and lifestyle preferences</div></>}

        {error && <div className="error-box">{error}</div>}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <>
            <div className="card">
              <div className="input-wrap">
                <label className="label">Full name</label>
                <input className="input" type="text" placeholder="Azeem Sayyed" value={form.full_name} onChange={e=>set("full_name",e.target.value)}/>
              </div>
              <div className="input-row">
                <div>
                  <label className="label">Date of birth</label>
                  <div style={{display:'flex',gap:8}}>
                    <select className="input" value={form.dob.split('-')[2]||''} onChange={e=>{const[y,m]=form.dob.split('-');set('dob',`${y||new Date().getFullYear()}-${m||'01'}-${e.target.value.padStart(2,'0')}`);}} style={{flex:1}}>
                      <option value="">Day</option>
                      {Array.from({length:31},(_,i)=><option key={i+1} value={String(i+1).padStart(2,'0')}>{i+1}</option>)}
                    </select>
                    <select className="input" value={form.dob.split('-')[1]||''} onChange={e=>{const[y,,d]=form.dob.split('-');set('dob',`${y||new Date().getFullYear()}-${e.target.value}-${d||'01'}`);}} style={{flex:1}}>
                      <option value="">Month</option>
                      {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
                    </select>
                    <select className="input" value={form.dob.split('-')[0]||''} onChange={e=>{const[,m,d]=form.dob.split('-');set('dob',`${e.target.value}-${m||'01'}-${d||'01'}`);}} style={{flex:1}}>
                      <option value="">Year</option>
                      {Array.from({length:80},(_,i)=><option key={i} value={new Date().getFullYear()-i}>{new Date().getFullYear()-i}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select className="input" value={form.gender} onChange={e=>set("gender",e.target.value)}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card">
              <label className="label">Height</label>
              <div className="radio-group" style={{marginBottom:12}}>
                {["cm","ft/in"].map(u=>(
                  <button key={u} className={`radio-btn ${form.height_unit===u?"sel":""}`} onClick={()=>set("height_unit",u)}>{u}</button>
                ))}
              </div>
              {form.height_unit === "cm" ? (
                <input className="input" type="number" placeholder="e.g. 183" value={form.height_cm} onChange={e=>set("height_cm",e.target.value)}/>
              ) : (
                <div style={{display:"flex",gap:10}}>
                  <input className="input" type="number" placeholder="ft (e.g. 6)" value={form.height_ft} onChange={e=>set("height_ft",e.target.value)}/>
                  <input className="input" type="number" placeholder="in (e.g. 0)" value={form.height_in} onChange={e=>set("height_in",e.target.value)}/>
                </div>
              )}
            </div>

            <div className="card">
              <div className="input-row">
                <div>
                  <label className="label">Current weight (kg)</label>
                  <input className="input" type="number" step="0.1" placeholder="e.g. 120" value={form.weight_start} onChange={e=>set("weight_start",e.target.value)}/>
                </div>
                <div>
                  <label className="label">Target weight (kg)</label>
                  <input className="input" type="number" step="0.1" placeholder="e.g. 90" value={form.weight_target} onChange={e=>set("weight_target",e.target.value)}/>
                </div>
              </div>
              {bmi && (
                <div className={`bmi-pill`} style={{
                  background: bmi<18.5?AL:bmi<25?GL:bmi<30?AL:"#fcebeb",
                  color: bmi<18.5?A:bmi<25?G:bmi<30?A:"#c0392b"
                }}>
                  BMI: {bmi} — {bmi<18.5?"Underweight":bmi<25?"Healthy":bmi<30?"Overweight":"Obese"}
                </div>
              )}
            </div>

            <div className="card">
              <label className="label">Activity level</label>
              <div className="activity-grid">
                {ACTIVITY_LEVELS.map(a=>(
                  <div key={a.val} className={`activity-item ${form.activity_level===a.val?"sel":""}`} onClick={()=>set("activity_level",a.val)}>
                    <div className={`activity-radio ${form.activity_level===a.val?"on":""}`}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:form.activity_level===a.val?P:TXT}}>{a.label}</div>
                      <div style={{fontSize:11,color:TXT2}}>{a.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-primary" disabled={!step1Valid()} onClick={()=>setStep(2)}>Continue →</button>
          </>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <>
            <div className="card">
              <div className="cond-grid">
                {CONDITIONS.map(c=>{
                  const sel = !!form.conditions[c.key];
                  return (
                    <div key={c.key} className={`cond-item ${sel?"sel":""}`} onClick={()=>toggleCondition(c.key)}>
                      <div className={`cond-check ${sel?"on":""}`}>
                        {sel&&<span style={{color:"#fff",fontSize:10,fontWeight:900}}>✓</span>}
                      </div>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:sel?P:TXT}}>{c.label}</div>
                        <div style={{fontSize:10,color:TXT2}}>{c.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="input-wrap">
                <label className="label">Food allergies (optional)</label>
                <input className="input" type="text" placeholder="e.g. nuts, gluten, lactose, shellfish" value={form.allergies} onChange={e=>set("allergies",e.target.value)}/>
              </div>
              <div>
                <label className="label">Current medications (optional)</label>
                <input className="input" type="text" placeholder="e.g. Metformin, Amlodipine — helps dietitian understand context" value={form.medications} onChange={e=>set("medications",e.target.value)}/>
              </div>
            </div>

            {Object.keys(form.conditions).length > 0 && !form.conditions.none && (
              <div style={{background:PL,border:`1px solid ${P}`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:600,color:P,marginBottom:4}}>Template that will be assigned</div>
                <div style={{fontSize:13,color:TXT}}>
                  {form.conditions.diabetic && form.conditions.hypertension ? "Diabetic + High BP plan"
                    : form.conditions.diabetic ? "Diabetic only plan"
                    : form.conditions.hypertension ? "High BP only plan"
                    : form.conditions.thyroid ? "Thyroid support plan"
                    : "Condition-specific plan"}
                </div>
                <div style={{fontSize:11,color:TXT2,marginTop:3}}>Admin / dietitian can modify this after approval</div>
              </div>
            )}

            <button className="btn-secondary" onClick={()=>setStep(1)}>← Back</button>
            <button className="btn-primary" disabled={!step2Valid()} onClick={()=>setStep(3)}>Continue →</button>
          </>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <>
            <div className="card">
              <div className="input-wrap">
                <label className="label">Diet type</label>
                <div className="radio-group">
                  {DIET_TYPES.map(d=>(
                    <button key={d} className={`radio-btn ${form.diet_type===d?"sel":""}`} onClick={()=>set("diet_type",d)}>{d}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="input-wrap">
                <label className="label">Preferred cuisine</label>
                <div className="radio-group">
                  {CUISINES.map(c=>(
                    <button key={c} className={`radio-btn ${form.preferred_cuisine===c?"sel":""}`} onClick={()=>set("preferred_cuisine",c)}>{c}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="input-wrap">
                <label className="label">Meals per day</label>
                <div className="radio-group">
                  {MEALS_OPTIONS.map(n=>(
                    <button key={n} className={`radio-btn ${form.meals_per_day===n?"sel":""}`} onClick={()=>set("meals_per_day",n)}>{n} meals</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Daily water target (litres)</label>
                <div className="water-row">
                  <button className="water-btn" onClick={()=>set("water_target",Math.max(1,+(form.water_target-0.5).toFixed(1)))}>−</button>
                  <span style={{fontSize:18,fontWeight:700,color:P,minWidth:60,textAlign:"center"}}>{form.water_target}L</span>
                  <button className="water-btn" onClick={()=>set("water_target",Math.min(6,+(form.water_target+0.5).toFixed(1)))}>+</button>
                  <span style={{fontSize:12,color:TXT2,marginLeft:8}}>Recommended: 3.5L for your profile</span>
                </div>
              </div>
            </div>

            <div style={{background:GL,border:`1px solid ${G}`,borderRadius:12,padding:"14px",marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:G,marginBottom:8}}>✓ Your profile summary</div>
              <div style={{fontSize:12,color:TXT,lineHeight:1.7}}>
                <b>{form.full_name}</b> · {form.gender} · {bmi ? `BMI ${bmi}` : ""}<br/>
                Weight: {form.weight_start}kg → {form.weight_target}kg<br/>
                Conditions: {Object.keys(form.conditions).filter(k=>k!=="none").map(k=>CONDITIONS.find(c=>c.key===k)?.label).join(", ") || "None"}<br/>
                Diet: {form.diet_type} · {form.preferred_cuisine}<br/>
                {form.meals_per_day} meals/day · {form.water_target}L water target
              </div>
            </div>

            <button className="btn-secondary" onClick={()=>setStep(2)}>← Back</button>
            <button className="btn-primary" disabled={!step3Valid()||saving} onClick={handleSubmit}>
              {saving && <span className="spinner"/>}
              {saving ? "Saving..." : "Complete setup →"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
