import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",A="#EF9F27",AL="#faeeda",R="#E24B4A";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",TXT3="#bbb",BG="#f0f0f7",CARD="#fff";

const CONDITIONS=[
  {key:"diabetic",label:"Diabetes"},{key:"hypertension",label:"Hypertension / High BP"},
  {key:"cholesterol",label:"High Cholesterol"},{key:"thyroid",label:"Thyroid"},
  {key:"pcod",label:"PCOD / PCOS"},{key:"piles",label:"Piles / Haemorrhoids"},
  {key:"kidney",label:"Kidney issues"},{key:"heart",label:"Heart condition"},
  {key:"obesity",label:"Obesity"},{key:"arthritis",label:"Arthritis"},
  {key:"digestive",label:"Digestive issues"},{key:"none",label:"No conditions"},
];
const ACTIVITY_LEVELS=[{val:"sedentary",label:"Sedentary"},{val:"light",label:"Lightly active"},{val:"moderate",label:"Moderately active"},{val:"active",label:"Very active"}];
const DIET_TYPES=["Non-vegetarian","Vegetarian","Vegan","Eggetarian"];
const CUISINES=["Indian (North)","Indian (South)","Continental","Mixed / No preference"];

export default function Profile(){
  const router=useRouter();
  const [profile,setProfile]=useState(null);
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState({});
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [tab,setTab]=useState("profile");

  useEffect(()=>{
    async function load(){
      const sb=getSupabase();
      const{data:{session}}=await sb.auth.getSession();
      if(!session){router.push("/login");return;}
      const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
      if(!p){router.push("/login");return;}
      setProfile(p);
      setForm(p);
    }
    load();
  },[]);

  function showToast(m){setToast(m);setTimeout(()=>setToast(null),2000);}
  function set(k,v){setForm(f=>({...f,[k]:v}));}
  function toggleCond(k){
    const c={...(form.conditions||{})};
    if(k==="none"){setForm(f=>({...f,conditions:c.none?{}:{none:true}}));return;}
    if(c.none)delete c.none;
    c[k]?delete c[k]:(c[k]=true);
    setForm(f=>({...f,conditions:c}));
  }

  async function save(){
    setSaving(true);
    const sb=getSupabase();
    const{error}=await sb.from("profiles").update({
      full_name:form.full_name,
      dob:form.dob,
      gender:form.gender,
      height_cm:form.height_cm?+form.height_cm:null,
      weight_start:form.weight_start?+form.weight_start:null,
      weight_current:form.weight_current?+form.weight_current:null,
      weight_target:form.weight_target?+form.weight_target:null,
      activity_level:form.activity_level,
      conditions:form.conditions||{},
      allergies:form.allergies||null,
      medications:form.medications||null,
      diet_type:form.diet_type,
      preferred_cuisine:form.preferred_cuisine,
      meals_per_day:form.meals_per_day||6,
      water_target:form.water_target||3.5,
      calorie_target:form.calorie_target?+form.calorie_target:1600,
      protein_target:form.protein_target?+form.protein_target:100,
      carb_target:form.carb_target?+form.carb_target:130,
      fat_target:form.fat_target?+form.fat_target:55,
    }).eq("id",profile.id);
    setSaving(false);
    if(!error){setProfile({...profile,...form});setEditing(false);showToast("Profile saved ✓");}
    else showToast("Error: "+error.message);
  }

  async function signOut(){
    await getSupabase().auth.signOut();
    router.push("/login");
  }

  const bmi=profile?.weight_current&&profile?.height_cm?(profile.weight_current/((profile.height_cm/100)**2)).toFixed(1):null;
  const condList=Object.keys(profile?.conditions||{}).filter(k=>k!=="none").map(k=>CONDITIONS.find(c=>c.key===k)?.label).filter(Boolean);

  if(!profile)return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:36,height:36,border:`3px solid ${BORDER}`,borderTopColor:P,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <>
      <Head><title>Profile — Health Tracker</title></Head>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${BG};font-family:'Inter',system-ui,sans-serif;color:${TXT}}
        .topbar{background:${CARD};border-bottom:1px solid ${BORDER};padding:0 16px;height:52px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:20}
        .main{max-width:720px;margin:0 auto;padding:16px 14px 90px}
        .card{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:16px;margin-bottom:12px}
        .card-title{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
        .prow{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid ${BORDER};font-size:13px}
        .prow:last-child{border-bottom:none}
        .prow-label{color:${TXT2};font-size:12px}
        .prow-val{font-weight:600;color:${TXT};text-align:right;max-width:60%}
        .label{display:block;font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
        .input{width:100%;padding:9px 12px;border:1.5px solid ${BORDER};border-radius:9px;font-size:13px;color:${TXT};outline:none;transition:border-color .2s;background:${CARD};font-family:inherit}
        .input:focus{border-color:${P}}
        .input-wrap{margin-bottom:13px}
        .input-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:13px}
        .radio-group{display:flex;gap:6px;flex-wrap:wrap}
        .rbtn{padding:7px 12px;border-radius:20px;border:1.5px solid ${BORDER};font-size:12px;cursor:pointer;transition:all .15s;background:${CARD};color:${TXT2};font-family:inherit}
        .rbtn.sel{border-color:${P};background:${PL};color:${P};font-weight:600}
        .cond-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
        .cond-item{display:flex;align-items:center;gap:8px;padding:9px 11px;border:1.5px solid ${BORDER};border-radius:9px;cursor:pointer;transition:all .15s;font-size:12px}
        .cond-item.sel{border-color:${P};background:${PL};color:${P};font-weight:600}
        .cond-chk{width:16px;height:16px;border-radius:4px;border:1.5px solid ${BORDER};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
        .cond-chk.on{background:${P};border-color:${P}}
        .tabs{display:flex;gap:6px;margin-bottom:16px}
        .tab{padding:7px 16px;border-radius:20px;border:1px solid ${BORDER};font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:${TXT2};font-family:inherit;transition:all .15s}
        .tab.on{border-color:${P};background:${PL};color:${P}}
        .btn-primary{width:100%;padding:12px;background:${P};color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .2s}
        .btn-primary:hover{background:#5a3a53}
        .btn-primary:disabled{background:#b8a0b0;cursor:not-allowed}
        .btn-outline{padding:8px 18px;background:${CARD};color:${P};border:1.5px solid ${P};border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s}
        .btn-outline:hover{background:${PL}}
        .btn-danger{padding:8px 18px;background:${CARD};color:${R};border:1.5px solid #ffd0d0;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
        .badge{display:inline-flex;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
        .spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;display:inline-block;margin-right:6px;vertical-align:middle}
        .toast{position:fixed;bottom:72px;left:50%;transform:translateX(-50%);background:${P};color:#fff;padding:8px 20px;border-radius:24px;font-size:12px;font-weight:600;z-index:100;animation:fadein .2s ease}
        .bottomnav{position:fixed;bottom:0;left:0;right:0;background:${CARD};border-top:1px solid ${BORDER};display:flex;z-index:20;max-width:720px;margin:0 auto}
        .navbtn{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border:none;background:none;cursor:pointer;font-size:9px;font-weight:500;font-family:inherit}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadein{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @media(max-width:480px){.cond-grid{grid-template-columns:1fr}.input-row{grid-template-columns:1fr}}
        @media(min-width:768px){.bottomnav{display:none}.main{padding-left:24px;padding-right:24px}}
      `}</style>

      {toast&&<div className="toast">{toast}</div>}

      <div className="topbar">
        <div style={{width:32,height:32,background:P,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14}}>H</div>
        <span style={{fontSize:13,fontWeight:700,color:P}}>Health Tracker</span>
        <span style={{color:BORDER,fontSize:18}}>|</span>
        <span style={{fontSize:12,color:TXT2}}>Profile</span>
        <div style={{flex:1}}/>
        {!editing&&<button className="btn-outline" style={{padding:"6px 14px",fontSize:12}} onClick={()=>setEditing(true)}>Edit profile</button>}
        {editing&&<><button className="btn-outline" style={{padding:"6px 14px",fontSize:12,marginRight:6}} onClick={()=>{setEditing(false);setForm(profile);}}>Cancel</button></>}
      </div>

      <div className="main">
        {/* AVATAR CARD */}
        <div className="card" style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:56,height:56,borderRadius:14,background:PL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:700,color:P,flexShrink:0}}>
            {profile.full_name?.[0]||"A"}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:17,fontWeight:700}}>{profile.full_name}</div>
            <div style={{fontSize:12,color:TXT2,marginTop:2}}>{profile.email}</div>
            <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
              <span className="badge" style={{background:profile.role==="admin"?PL:GL,color:profile.role==="admin"?P:G}}>{profile.role==="admin"?"Admin":"User"}</span>
              <span className="badge" style={{background:profile.status==="approved"?GL:AL,color:profile.status==="approved"?G:A}}>{profile.status}</span>
              {bmi&&<span className="badge" style={{background:bmi<25?GL:bmi<30?AL:"#fcebeb",color:bmi<25?G:bmi<30?A:R}}>BMI {bmi}</span>}
            </div>
          </div>
          <button className="btn-danger" onClick={signOut}>Sign out</button>
        </div>

        {/* TABS */}
        <div className="tabs">
          {[["profile","Health profile"],["targets","Daily targets"],["conditions","Conditions"],["diet","Diet & lifestyle"]].map(([id,lbl])=>(
            <button key={id} className={`tab${tab===id?" on":""}`} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>

        {/* ── PROFILE TAB ── */}
        {tab==="profile"&&(
          editing?(
            <div className="card">
              <div className="card-title">Edit personal details</div>
              <div className="input-wrap"><label className="label">Full name</label><input className="input" value={form.full_name||""} onChange={e=>set("full_name",e.target.value)}/></div>
              <div className="input-row">
                <div><label className="label">Date of birth</label><input className="input" type="date" value={form.dob||""} onChange={e=>set("dob",e.target.value)}/></div>
                <div><label className="label">Gender</label>
                  <select className="input" value={form.gender||""} onChange={e=>set("gender",e.target.value)}>
                    <option value="">Select</option><option>Male</option><option>Female</option><option>Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div className="input-wrap"><label className="label">Height (cm)</label><input className="input" type="number" value={form.height_cm||""} onChange={e=>set("height_cm",e.target.value)}/></div>
              <div className="input-row">
                <div><label className="label">Current weight (kg)</label><input className="input" type="number" step="0.1" value={form.weight_current||""} onChange={e=>set("weight_current",e.target.value)}/></div>
                <div><label className="label">Starting weight (kg)</label><input className="input" type="number" step="0.1" value={form.weight_start||""} onChange={e=>set("weight_start",e.target.value)}/></div>
              </div>
              <div className="input-wrap"><label className="label">Target weight (kg)</label><input className="input" type="number" step="0.1" value={form.weight_target||""} onChange={e=>set("weight_target",e.target.value)}/></div>
              <div className="input-wrap">
                <label className="label">Activity level</label>
                <div className="radio-group">
                  {ACTIVITY_LEVELS.map(a=><button key={a.val} className={`rbtn${form.activity_level===a.val?" sel":""}`} onClick={()=>set("activity_level",a.val)}>{a.label}</button>)}
                </div>
              </div>
              <button className="btn-primary" disabled={saving} onClick={save}>{saving&&<span className="spinner"/>}{saving?"Saving...":"Save changes"}</button>
            </div>
          ):(
            <div className="card">
              <div className="card-title">Personal details</div>
              {[
                ["Full name",profile.full_name],
                ["Date of birth",profile.dob?new Date(profile.dob).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}):"Not set"],
                ["Gender",profile.gender||"Not set"],
                ["Height",profile.height_cm?`${profile.height_cm} cm (${Math.floor(profile.height_cm/30.48)}ft ${Math.round((profile.height_cm%30.48)/2.54)}in)`:"Not set"],
                ["Starting weight",profile.weight_start?`${profile.weight_start} kg`:"Not set"],
                ["Current weight",profile.weight_current?`${profile.weight_current} kg`:"Not set"],
                ["Target weight",profile.weight_target?`${profile.weight_target} kg`:"Not set"],
                ["To lose/gain",profile.weight_start&&profile.weight_target?`${Math.abs(profile.weight_start-profile.weight_target)} kg ${profile.weight_target<profile.weight_start?"to lose":"to gain"}`:"—"],
                ["Activity level",profile.activity_level||"Not set"],
              ].map(([l,v])=><div key={l} className="prow"><span className="prow-label">{l}</span><span className="prow-val">{v}</span></div>)}
            </div>
          )
        )}

        {/* ── TARGETS TAB ── */}
        {tab==="targets"&&(
          editing?(
            <div className="card">
              <div className="card-title">Edit daily targets</div>
              {[["calorie_target","Calories (kcal)","1600"],["protein_target","Protein (g)","100"],["carb_target","Carbs (g)","130"],["fat_target","Fat (g)","55"]].map(([k,l,ph])=>(
                <div key={k} className="input-wrap"><label className="label">{l}</label><input className="input" type="number" value={form[k]||""} placeholder={ph} onChange={e=>set(k,e.target.value)}/></div>
              ))}
              <div className="input-wrap">
                <label className="label">Water target (litres)</label>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <button onClick={()=>set("water_target",Math.max(1,+(form.water_target-0.5).toFixed(1)))} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${BORDER}`,background:CARD,cursor:"pointer",fontSize:18,color:P}}>−</button>
                  <span style={{fontSize:18,fontWeight:700,color:P,minWidth:50,textAlign:"center"}}>{form.water_target||3.5}L</span>
                  <button onClick={()=>set("water_target",Math.min(6,+(form.water_target+0.5).toFixed(1)))} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${BORDER}`,background:CARD,cursor:"pointer",fontSize:18,color:P}}>+</button>
                </div>
              </div>
              <div className="input-wrap">
                <label className="label">Meals per day</label>
                <div className="radio-group">
                  {[3,4,5,6].map(n=><button key={n} className={`rbtn${form.meals_per_day===n?" sel":""}`} onClick={()=>set("meals_per_day",n)}>{n} meals</button>)}
                </div>
              </div>
              <button className="btn-primary" disabled={saving} onClick={save}>{saving&&<span className="spinner"/>}{saving?"Saving...":"Save changes"}</button>
            </div>
          ):(
            <div className="card">
              <div className="card-title">Daily targets</div>
              {[
                ["Calories",`${profile.calorie_target||1600} kcal`,"#7F77DD"],
                ["Protein",`${profile.protein_target||100}g`,G],
                ["Carbs",`${profile.carb_target||130}g`,A],
                ["Fat",`${profile.fat_target||55}g`,"#D85A30"],
                ["Water",`${profile.water_target||3.5}L`,"#38bdf8"],
                ["Meals per day",`${profile.meals_per_day||6} meals`,TXT2],
              ].map(([l,v,c])=><div key={l} className="prow"><span className="prow-label">{l}</span><span className="prow-val" style={{color:c}}>{v}</span></div>)}
            </div>
          )
        )}

        {/* ── CONDITIONS TAB ── */}
        {tab==="conditions"&&(
          editing?(
            <div className="card">
              <div className="card-title">Health conditions</div>
              <div className="cond-grid" style={{marginBottom:14}}>
                {CONDITIONS.map(c=>{
                  const sel=!!(form.conditions||{})[c.key];
                  return(
                    <div key={c.key} className={`cond-item${sel?" sel":""}`} onClick={()=>toggleCond(c.key)}>
                      <div className={`cond-chk${sel?" on":""}`}>{sel&&<span style={{color:"#fff",fontSize:9,fontWeight:900}}>✓</span>}</div>
                      {c.label}
                    </div>
                  );
                })}
              </div>
              <div className="input-wrap"><label className="label">Food allergies</label><input className="input" value={form.allergies||""} placeholder="e.g. nuts, gluten" onChange={e=>set("allergies",e.target.value)}/></div>
              <div className="input-wrap"><label className="label">Current medications (optional)</label><input className="input" value={form.medications||""} placeholder="e.g. Metformin, Amlodipine" onChange={e=>set("medications",e.target.value)}/></div>
              <div style={{background:PL,border:`1px solid ${P}`,borderRadius:10,padding:"10px 13px",marginBottom:14,fontSize:12,color:P}}>
                ⚠️ Saving updated conditions will trigger automatic meal template re-assignment
              </div>
              <button className="btn-primary" disabled={saving} onClick={save}>{saving&&<span className="spinner"/>}{saving?"Saving...":"Save changes"}</button>
            </div>
          ):(
            <div className="card">
              <div className="card-title">Health conditions</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
                {condList.length>0?condList.map(l=><span key={l} className="badge" style={{background:PL,color:P,border:`1px solid ${P}`}}>{l}</span>):<span style={{fontSize:13,color:TXT2}}>No conditions recorded</span>}
              </div>
              {profile.allergies&&<div className="prow"><span className="prow-label">Allergies</span><span className="prow-val">{profile.allergies}</span></div>}
              {profile.medications&&<div className="prow"><span className="prow-label">Medications</span><span className="prow-val">{profile.medications}</span></div>}
              {profile.active_template_id&&(
                <div style={{background:GL,border:`1px solid ${G}`,borderRadius:10,padding:"10px 13px",marginTop:10,fontSize:12,color:G}}>
                  ✓ Meal template auto-assigned based on your conditions
                </div>
              )}
            </div>
          )
        )}

        {/* ── DIET TAB ── */}
        {tab==="diet"&&(
          editing?(
            <div className="card">
              <div className="card-title">Diet & lifestyle</div>
              <div className="input-wrap">
                <label className="label">Diet type</label>
                <div className="radio-group">
                  {["Non-vegetarian","Vegetarian","Vegan","Eggetarian"].map(d=><button key={d} className={`rbtn${form.diet_type===d?" sel":""}`} onClick={()=>set("diet_type",d)}>{d}</button>)}
                </div>
              </div>
              <div className="input-wrap">
                <label className="label">Preferred cuisine</label>
                <div className="radio-group">
                  {CUISINES.map(c=><button key={c} className={`rbtn${form.preferred_cuisine===c?" sel":""}`} onClick={()=>set("preferred_cuisine",c)}>{c}</button>)}
                </div>
              </div>
              <button className="btn-primary" disabled={saving} onClick={save}>{saving&&<span className="spinner"/>}{saving?"Saving...":"Save changes"}</button>
            </div>
          ):(
            <div className="card">
              <div className="card-title">Diet & lifestyle</div>
              {[
                ["Diet type",profile.diet_type||"Not set"],
                ["Preferred cuisine",profile.preferred_cuisine||"Not set"],
                ["Activity level",profile.activity_level||"Not set"],
              ].map(([l,v])=><div key={l} className="prow"><span className="prow-label">{l}</span><span className="prow-val">{v}</span></div>)}
              <div style={{marginTop:12}}>
                <div className="card-title">Foods to strictly avoid</div>
                {condList.includes("Diabetes")||condList.includes("Piles")?[
                  "Dal / pulses / chole / rajma","Fish (all types)","Fried food — vada, puri, samosa","Sugar, jaggery, honey","Alcohol","Pickles, papad, packaged food",
                ].map((r,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${BORDER}`,fontSize:12}}><span style={{color:R}}>✕</span><span>{r}</span></div>)
                :<div style={{fontSize:13,color:TXT2,padding:"10px 0"}}>Based on your conditions, your dietitian will advise specific avoids.</div>}
              </div>
            </div>
          )
        )}
      </div>

      {/* BOTTOM NAV */}
      <div className="bottomnav">
        {[["Dashboard","🏠","/dashboard"],["Meals","🍽️","/meals"],["Progress","📊","/progress"],["Reports","📋","/reports"],["Profile","👤","/profile"]].map(([lbl,ico,href])=>(
          <button key={href} className="navbtn" onClick={()=>router.push(href)} style={{color:href==="/profile"?P:TXT3}}>
            <span style={{fontSize:20}}>{ico}</span>{lbl}
          </button>
        ))}
      </div>
    </>
  );
}
