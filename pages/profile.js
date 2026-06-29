import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getSupabase } from "../lib/supabase";
import Layout from "../components/Layout";

const P="#714B67",PL="#f3eef1",G="#1D9E75",GL="#e1f5ee",A="#EF9F27",AL="#faeeda",R="#E24B4A";
const BORDER="#e5e3ee",TXT="#2c1a3a",TXT2="#888",BG="#f0f0f7",CARD="#fff";

const CONDITIONS=[
  {key:"diabetic",label:"Diabetes"},{key:"hypertension",label:"Hypertension / High BP"},
  {key:"cholesterol",label:"High Cholesterol"},{key:"thyroid",label:"Thyroid"},
  {key:"pcod",label:"PCOD / PCOS"},{key:"piles",label:"Piles / Haemorrhoids"},
  {key:"kidney",label:"Kidney issues"},{key:"heart",label:"Heart condition"},
  {key:"obesity",label:"Obesity"},{key:"arthritis",label:"Arthritis"},
  {key:"digestive",label:"Digestive issues"},{key:"none",label:"No conditions"},
];
const ACTIVITY_LEVELS=[{val:"sedentary",label:"Sedentary"},{val:"light",label:"Lightly active"},{val:"moderate",label:"Moderately active"},{val:"active",label:"Very active"}];
const CUISINES=["Indian (North)","Indian (South)","Continental","Mixed / No preference"];
const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia',
  'Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia',
  'Brazil','Bulgaria','Cambodia','Cameroon','Canada','Chile','China',
  'Colombia','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic',
  'Denmark','Dominican Republic','Ecuador','Egypt','Ethiopia','Finland',
  'France','Georgia','Germany','Ghana','Greece','Guatemala','Honduras',
  'Hungary','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
  'Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Latvia',
  'Lebanon','Libya','Lithuania','Luxembourg','Malaysia','Mexico','Moldova',
  'Morocco','Mozambique','Myanmar','Nepal','Netherlands','New Zealand',
  'Nicaragua','Nigeria','Norway','Oman','Pakistan','Panama','Paraguay',
  'Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia',
  'Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia',
  'Somalia','South Africa','South Korea','Spain','Sri Lanka','Sudan',
  'Sweden','Switzerland','Syria','Taiwan','Tanzania','Thailand','Tunisia',
  'Turkey','Uganda','Ukraine','United Arab Emirates','United Kingdom',
  'United States','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zimbabwe',
];


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
      if(!session){router.push("/");return;}
      const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).single();
      if(!p){router.push("/");return;}
      setProfile(p);setForm(p);
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
    const{error}=await getSupabase().from("profiles").update({
      full_name:form.full_name,dob:form.dob,gender:form.gender,
      height_cm:form.height_cm?+form.height_cm:null,
      weight_start:form.weight_start?+form.weight_start:null,
      weight_current:form.weight_current?+form.weight_current:null,
      weight_target:form.weight_target?+form.weight_target:null,
      activity_level:form.activity_level,conditions:form.conditions||{},
      allergies:form.allergies||null,medications:form.medications||null,
      diet_type:form.diet_type,preferred_cuisine:form.preferred_cuisine,country:form.country||null,
      meals_per_day:form.meals_per_day||6,water_target:form.water_target||3.5,
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
    router.push("/");
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
        .card{background:${CARD};border-radius:13px;border:1px solid ${BORDER};padding:16px;margin-bottom:12px}
        .ctitle{font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
        .prow{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid ${BORDER};font-size:12px}
        .prow:last-child{border-bottom:none}
        .label{display:block;font-size:11px;font-weight:700;color:${TXT2};text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px}
        .inp{width:100%;padding:9px 12px;border:1.5px solid ${BORDER};border-radius:9px;font-size:13px;color:${TXT};outline:none;transition:border-color .2s;background:${CARD};font-family:inherit}
        .inp:focus{border-color:${P}}
        .irow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:13px}
        .iwrap{margin-bottom:13px}
        .rbtn{padding:7px 12px;border-radius:20px;border:1.5px solid ${BORDER};font-size:12px;cursor:pointer;transition:all .15s;background:${CARD};color:${TXT2};font-family:inherit}
        .rbtn.sel{border-color:${P};background:${PL};color:${P};font-weight:600}
        .cgrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
        .citem{display:flex;align-items:center;gap:8px;padding:9px 11px;border:1.5px solid ${BORDER};border-radius:9px;cursor:pointer;transition:all .15s;font-size:12px}
        .citem.sel{border-color:${P};background:${PL};color:${P};font-weight:600}
        .cchk{width:16px;height:16px;border-radius:4px;border:1.5px solid ${BORDER};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
        .cchk.on{background:${P};border-color:${P}}
        .tabs{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}
        .tab{padding:7px 16px;border-radius:20px;border:1px solid ${BORDER};font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:${TXT2};font-family:inherit;transition:all .15s}
        .tab.on{border-color:${P};background:${PL};color:${P}}
        .bprimary{width:100%;padding:12px;background:${P};color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
        .bprimary:hover{background:#5a3a53} .bprimary:disabled{background:#b8a0b0;cursor:not-allowed}
        .boutline{padding:8px 18px;background:${CARD};color:${P};border:1.5px solid ${P};border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
        .boutline:hover{background:${PL}}
        .bdanger{padding:8px 18px;background:${CARD};color:${R};border:1.5px solid #ffd0d0;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
        .spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;display:inline-block;margin-right:6px;vertical-align:middle}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:480px){.cgrid{grid-template-columns:1fr}.irow{grid-template-columns:1fr}}
      `}</style>

      {toast&&<div className="ht-toast">{toast}</div>}

      <Layout title="Profile" profile={profile}>

        {/* AVATAR */}
        <div className="card" style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{width:56,height:56,borderRadius:14,background:PL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:700,color:P,flexShrink:0}}>
            {profile.full_name?.[0]||"A"}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:17,fontWeight:700}}>{profile.full_name}</div>
            <div style={{fontSize:12,color:TXT2,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile.email}</div>
            <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
              <span className="ht-badge" style={{background:profile.role==="admin"?PL:GL,color:profile.role==="admin"?P:G}}>{profile.role==="admin"?"Admin":"User"}</span>
              <span className="ht-badge" style={{background:profile.status==="approved"?GL:AL,color:profile.status==="approved"?G:A}}>{profile.status}</span>
              {bmi&&<span className="ht-badge" style={{background:bmi<25?GL:bmi<30?AL:"#fcebeb",color:bmi<25?G:bmi<30?A:R}}>BMI {bmi}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            {!editing&&<button className="boutline" onClick={()=>setEditing(true)}>Edit</button>}
            {editing&&<button className="boutline" onClick={()=>{setEditing(false);setForm(profile);}}>Cancel</button>}
            <button className="bdanger" onClick={signOut}>Sign out</button>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs">
          {[["profile","Personal"],["targets","Targets"],["conditions","Conditions"],["diet","Diet"]].map(([id,lbl])=>(
            <button key={id} className={`tab${tab===id?" on":""}`} onClick={()=>setTab(id)}>{lbl}</button>
          ))}
        </div>

        {/* ── PERSONAL TAB ── */}
        {tab==="profile"&&(editing?(
          <div className="card">
            <div className="ctitle">Edit personal details</div>
            <div className="iwrap"><label className="label">Full name</label><input className="inp" value={form.full_name||""} onChange={e=>set("full_name",e.target.value)}/></div>
            <div className="irow">
              <div><label className="label">Date of birth</label><input className="inp" type="date" value={form.dob||""} onChange={e=>set("dob",e.target.value)}/></div>
              <div><label className="label">Gender</label>
                <select className="inp" value={form.gender||""} onChange={e=>set("gender",e.target.value)}>
                  <option value="">Select</option><option>Male</option><option>Female</option><option>Prefer not to say</option>
                </select>
              </div>
            </div>
            <div className="iwrap"><label className="label">Height (cm)</label><input className="inp" type="number" value={form.height_cm||""} onChange={e=>set("height_cm",e.target.value)}/></div>
            <div className="irow">
              <div><label className="label">Current weight (kg)</label><input className="inp" type="number" step="0.1" value={form.weight_current||""} onChange={e=>set("weight_current",e.target.value)}/></div>
              <div><label className="label">Starting weight (kg)</label><input className="inp" type="number" step="0.1" value={form.weight_start||""} onChange={e=>set("weight_start",e.target.value)}/></div>
            </div>
            <div className="iwrap"><label className="label">Target weight (kg)</label><input className="inp" type="number" step="0.1" value={form.weight_target||""} onChange={e=>set("weight_target",e.target.value)}/></div>
            <div className="iwrap">
              <label className="label">Activity level</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {ACTIVITY_LEVELS.map(a=><button key={a.val} className={`rbtn${form.activity_level===a.val?" sel":""}`} onClick={()=>set("activity_level",a.val)}>{a.label}</button>)}
              </div>
            </div>
            <button className="bprimary" disabled={saving} onClick={save}>{saving&&<span className="spinner"/>}{saving?"Saving...":"Save changes"}</button>
          </div>
        ):(
          <div className="card">
            <div className="ctitle">Personal details</div>
            {[
              ["Full name",profile.full_name||"—"],
              ["Date of birth",profile.dob?new Date(profile.dob).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}):"Not set"],
              ["Gender",profile.gender||"Not set"],
              ["Height",profile.height_cm?`${profile.height_cm} cm`:"Not set"],
              ["Starting weight",profile.weight_start?`${profile.weight_start} kg`:"Not set"],
              ["Current weight",profile.weight_current?`${profile.weight_current} kg`:"Not set"],
              ["Target weight",profile.weight_target?`${profile.weight_target} kg`:"Not set"],
              ["To lose/gain",profile.weight_start&&profile.weight_target?`${Math.abs(profile.weight_start-profile.weight_target)} kg ${profile.weight_target<profile.weight_start?"to lose":"to gain"}`:"—"],
              ["Activity level",profile.activity_level||"Not set"],
            ].map(([l,v])=><div key={l} className="prow"><span style={{color:TXT2}}>{l}</span><b style={{color:TXT,textAlign:"right",maxWidth:"55%"}}>{v}</b></div>)}
          </div>
        ))}

        {/* ── TARGETS TAB ── */}
        {tab==="targets"&&(editing?(
          <div className="card">
            <div className="ctitle">Edit daily targets</div>
            {[["calorie_target","Calories (kcal)","1600"],["protein_target","Protein (g)","100"],["carb_target","Carbs (g)","130"],["fat_target","Fat (g)","55"]].map(([k,l,ph])=>(
              <div key={k} className="iwrap"><label className="label">{l}</label><input className="inp" type="number" value={form[k]||""} placeholder={ph} onChange={e=>set(k,e.target.value)}/></div>
            ))}
            <div className="iwrap">
              <label className="label">Water target</label>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <button onClick={()=>set("water_target",Math.max(1,+(form.water_target-0.5).toFixed(1)))} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${BORDER}`,background:CARD,cursor:"pointer",fontSize:18,color:P}}>−</button>
                <span style={{fontSize:18,fontWeight:700,color:P,minWidth:50,textAlign:"center"}}>{form.water_target||3.5}L</span>
                <button onClick={()=>set("water_target",Math.min(6,+(form.water_target+0.5).toFixed(1)))} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${BORDER}`,background:CARD,cursor:"pointer",fontSize:18,color:P}}>+</button>
              </div>
            </div>
            <div className="iwrap">
              <label className="label">Meals per day</label>
              <div style={{display:"flex",gap:6}}>
                {[3,4,5,6].map(n=><button key={n} className={`rbtn${form.meals_per_day===n?" sel":""}`} onClick={()=>set("meals_per_day",n)}>{n}</button>)}
              </div>
            </div>
            <button className="bprimary" disabled={saving} onClick={save}>{saving&&<span className="spinner"/>}{saving?"Saving...":"Save changes"}</button>
          </div>
        ):(
          <div className="card">
            <div className="ctitle">Daily targets</div>
            {[["Calories",`${profile.calorie_target||1600} kcal`,"#7F77DD"],["Protein",`${profile.protein_target||100}g`,G],["Carbs",`${profile.carb_target||130}g`,A],["Fat",`${profile.fat_target||55}g`,"#D85A30"],["Water",`${profile.water_target||3.5}L`,"#38bdf8"],["Meals per day",`${profile.meals_per_day||6}`,TXT2]].map(([l,v,c])=>(
              <div key={l} className="prow"><span style={{color:TXT2}}>{l}</span><b style={{color:c}}>{v}</b></div>
            ))}
          </div>
        ))}

        {/* ── CONDITIONS TAB ── */}
        {tab==="conditions"&&(editing?(
          <div className="card">
            <div className="ctitle">Health conditions</div>
            <div className="cgrid" style={{marginBottom:14}}>
              {CONDITIONS.map(c=>{
                const sel=!!(form.conditions||{})[c.key];
                return(
                  <div key={c.key} className={`citem${sel?" sel":""}`} onClick={()=>toggleCond(c.key)}>
                    <div className={`cchk${sel?" on":""}`}>{sel&&<span style={{color:"#fff",fontSize:9,fontWeight:900}}>✓</span>}</div>
                    {c.label}
                  </div>
                );
              })}
            </div>
            <div className="iwrap"><label className="label">Food allergies</label><input className="inp" value={form.allergies||""} placeholder="e.g. nuts, gluten" onChange={e=>set("allergies",e.target.value)}/></div>
            <div className="iwrap"><label className="label">Medications (optional)</label><input className="inp" value={form.medications||""} placeholder="e.g. Metformin" onChange={e=>set("medications",e.target.value)}/></div>
            <div style={{background:PL,border:`1px solid ${P}`,borderRadius:10,padding:"10px 13px",marginBottom:14,fontSize:12,color:P}}>
              ⚠️ Saving will trigger automatic meal template re-assignment
            </div>
            <button className="bprimary" disabled={saving} onClick={save}>{saving&&<span className="spinner"/>}{saving?"Saving...":"Save changes"}</button>
          </div>
        ):(
          <div className="card">
            <div className="ctitle">Health conditions</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
              {condList.length>0?condList.map(l=><span key={l} className="ht-badge" style={{background:PL,color:P,border:`1px solid ${P}`}}>{l}</span>):<span style={{fontSize:13,color:TXT2}}>No conditions recorded</span>}
            </div>
            {profile.allergies&&<div className="prow"><span style={{color:TXT2}}>Allergies</span><b>{profile.allergies}</b></div>}
            {profile.medications&&<div className="prow"><span style={{color:TXT2}}>Medications</span><b>{profile.medications}</b></div>}
            {profile.active_template_id&&<div style={{background:GL,border:`1px solid ${G}`,borderRadius:10,padding:"10px 13px",marginTop:10,fontSize:12,color:G}}>✓ Meal template auto-assigned based on your conditions</div>}
          </div>
        ))}

        {/* ── DIET TAB ── */}
        {tab==="diet"&&(editing?(
          <div className="card">
            <div className="ctitle">Diet & lifestyle</div>
            <div className="iwrap">
              <label className="label">Diet type</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["Non-vegetarian","Vegetarian","Vegan","Eggetarian"].map(d=><button key={d} className={`rbtn${form.diet_type===d?" sel":""}`} onClick={()=>set("diet_type",d)}>{d}</button>)}
              </div>
            </div>
            <div className="iwrap">
              <label className="label">Country</label>
              <select className="inp" style={{marginBottom:13}} value={form.country||""} onChange={e=>set("country",e.target.value)}>
                <option value="">Select country</option>
                {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>

              <label className="label">Preferred cuisine</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {CUISINES.map(c=><button key={c} className={`rbtn${form.preferred_cuisine===c?" sel":""}`} onClick={()=>set("preferred_cuisine",c)}>{c}</button>)}
              </div>
            </div>
            <button className="bprimary" disabled={saving} onClick={save}>{saving&&<span className="spinner"/>}{saving?"Saving...":"Save changes"}</button>
          </div>
        ):(
          <div className="card">
            <div className="ctitle">Diet & lifestyle</div>
            {[["Diet type",profile.diet_type||"Not set"],["Preferred cuisine",profile.preferred_cuisine||"Not set"],["Country",profile.country||"Not set"],["Activity level",profile.activity_level||"Not set"]].map(([l,v])=>(
              <div key={l} className="prow"><span style={{color:TXT2}}>{l}</span><b>{v}</b></div>
            ))}
          </div>
        ))}

      </Layout>
    </>
  );
}

