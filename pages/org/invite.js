// pages/org/invite.js — Dietitian: Add patient with full health profile + AI meal plan generation
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import RoleGuard from '../../components/RoleGuard';
import { getSupabase } from '../../lib/supabase';
import { useRole } from '../../lib/useRole';

const G='#1D9E75',N='#0D1B3E',PU='#714B67',A='#EF9F27',R='#E24B4A';
const BORDER='#E0E3ED',TXT='#0D1B3E',TXT2='#718096',BG='#F5F6FA',CARD='#fff';

const CONDITIONS=[
  {key:'diabetic',label:'Diabetes T2'},{key:'hypertension',label:'High BP'},
  {key:'thyroid',label:'Thyroid'},{key:'pcod',label:'PCOD/PCOS'},
  {key:'cholesterol',label:'High Cholesterol'},{key:'heart',label:'Heart condition'},
  {key:'none',label:'No conditions'},
];
const DIETS=['Vegetarian','Eggetarian','Non-Veg','Vegan','Jain','Keto','Gluten-Free'];
const GOALS=[
  {g:'Weight loss',icon:'⬇️'},{g:'Weight gain',icon:'⬆️'},{g:'Muscle gain',icon:'💪'},
  {g:'Manage condition',icon:'🏥'},{g:'Maintain weight',icon:'⚖️'},{g:'General wellness',icon:'🌿'},
];
const MEALS=['3','5','6'];
const ALLERGIES=['Gluten','Lactose','Nuts','Soy','Eggs','Shellfish','None'];

const inp={width:'100%',border:`1.5px solid ${BORDER}`,borderRadius:10,padding:'10px 14px',
  fontSize:13,fontFamily:"'Poppins',Arial,sans-serif",color:TXT,outline:'none',
  background:BG,boxSizing:'border-box'};
const Label=({children,req})=>(
  <label style={{fontSize:12,fontWeight:600,color:TXT,display:'block',marginBottom:6}}>
    {children}{req&&<span style={{color:R,marginLeft:2}}>*</span>}
  </label>
);
const Chip=({label,selected,onClick,color=G})=>(
  <button onClick={onClick} style={{padding:'7px 14px',borderRadius:20,border:`1.5px solid ${selected?color:BORDER}`,
    background:selected?color+'18':CARD,color:selected?color:TXT2,fontSize:12,
    fontWeight:selected?700:400,cursor:'pointer',fontFamily:"'Poppins',Arial,sans-serif"}}>
    {label}
  </button>
);

export default function InvitePage() {
  return (
    <RoleGuard allow={['org_admin','dietitian']}>
      <Layout><InviteView/></Layout>
    </RoleGuard>
  );
}

function InviteView() {
  const router = useRouter();
  const { orgId, org } = useRole();
  const [step, setStep] = useState(1); // 1=basic, 2=health, 3=preferences, 4=generating, 5=plan+send
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [aiChat, setAiChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const [form, setForm] = useState({
    // Step 1
    full_name:'', email:'', phone:'', dob:'', gender:'',
    // Step 2
    height_cm:'', weight_start:'', weight_target:'', activity_level:'Moderate',
    conditions:{}, allergies:'',
    // Step 3
    diet_type:'', primary_goal:'', meals_per_day:'5',
    avoid_foods:'', preferred_foods:'', daily_water_glasses:8,
  });

  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const toggleCond=(key)=>setForm(f=>{
    if(key==='none') return {...f,conditions:f.conditions?.none?{}:{none:true}};
    const c={...f.conditions}; delete c.none;
    if(c[key]) delete c[key]; else c[key]=true;
    return {...f,conditions:c};
  });

  const canStep1=form.full_name&&form.email&&form.dob&&form.gender;
  const canStep2=form.height_cm&&form.weight_start&&form.primary_goal&&Object.keys(form.conditions).length>0;
  const canStep3=form.diet_type&&form.meals_per_day;

  async function generatePlan() {
    setStep(4);
    setSaving(true);
    try {
      const res = await fetch('/api/ai/patient-plan', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ profile: form, forDietitian: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Generation failed');
      setGeneratedPlan(data);
      setAiChat([{role:'assistant',content:`I've generated a ${form.meals_per_day}-meal plan for ${form.full_name} based on their health profile${Object.keys(form.conditions).filter(k=>k!=='none').length>0?' and conditions':''}. You can ask me to adjust any meal, swap foods, or explain any recommendation before sending it to the patient.`}]);
      setStep(5);
    } catch(e) {
      setError(e.message);
      setStep(3);
    } finally {
      setSaving(false);
    }
  }

  async function sendChat() {
    if(!chatInput.trim()||chatLoading) return;
    const msg=chatInput.trim();
    setChatInput('');
    setAiChat(c=>[...c,{role:'user',content:msg}]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/ai/dietitian-chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message:msg, plan:generatedPlan, profile:form }),
      });
      const data = await res.json();
      if(data.updatedPlan) setGeneratedPlan(data.updatedPlan);
      setAiChat(c=>[...c,{role:'assistant',content:data.reply}]);
    } catch(e) {
      setAiChat(c=>[...c,{role:'assistant',content:'Something went wrong. Please try again.'}]);
    } finally {
      setChatLoading(false);
    }
  }

  async function saveAndInvite() {
    setSaving(true);
    setError('');
    try {
      const sb = getSupabase();
      const { data:{session} } = await sb.auth.getSession();
      if(!session) throw new Error('Not authenticated');
      // Create invitation row
      const token = crypto.randomUUID();
      const { error: invErr } = await sb.from('invitations').insert({
        org_id: orgId,
        email: form.email.trim().toLowerCase(),
        role: 'patient',
        token,
        invited_by: session.user.id,
        patient_profile: form,
        meal_plan: generatedPlan,
        accepted: false,
      });
      if(invErr) throw invErr;
      // Send invite email via API
      await fetch('/api/ai/send-patient-invite', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email:form.email, name:form.full_name, token, orgName:org?.name||'your clinic', plan:generatedPlan }),
      });
      router.push('/clinic/patients?invited=1');
    } catch(e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const STEPS=['Patient info','Health profile','Meal preferences','Review & send'];

  return (
    <div style={{padding:20,maxWidth:660,margin:'0 auto',fontFamily:"'Poppins',Arial,sans-serif"}}>
      <button onClick={()=>router.push('/clinic/patients')} style={{background:'none',border:'none',color:TXT2,cursor:'pointer',fontSize:13,marginBottom:16,display:'flex',alignItems:'center',gap:4}}>← Back to patients</button>
      <div style={{fontSize:18,fontWeight:700,color:N,marginBottom:4}}>Add new patient</div>
      <div style={{fontSize:12,color:TXT2,marginBottom:20}}>Fill in the patient's details — AI will generate a personalised meal plan before sending the invite.</div>

      {/* Step indicator */}
      {step<=4&&(
        <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:24}}>
          {STEPS.map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',flex:i<STEPS.length-1?1:'auto'}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:i<step-1?G:i===step-1?N:'#E0E3ED',display:'flex',alignItems:'center',justifyContent:'center',color:i<=step-1?'#fff':TXT2,fontSize:11,fontWeight:700,flexShrink:0}}>{i<step-1?'✓':i+1}</div>
                <span style={{fontSize:11,fontWeight:i===step-1?700:400,color:i===step-1?N:i<step-1?G:TXT2,whiteSpace:'nowrap'}}>{s}</span>
              </div>
              {i<STEPS.length-1&&<div style={{flex:1,height:2,background:i<step-1?G:'#E0E3ED',margin:'0 10px'}}/>}
            </div>
          ))}
        </div>
      )}

      {error&&<div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'10px 14px',fontSize:12,color:R,marginBottom:14}}>{error}</div>}

      {/* ── STEP 1: Basic info ── */}
      {step===1&&(
        <div style={{background:CARD,borderRadius:14,padding:20,border:`1px solid ${BORDER}`}}>
          <div style={{fontWeight:700,color:N,marginBottom:16}}>Patient information</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1'}}><Label req>Full name</Label><input style={inp} value={form.full_name} onChange={e=>set('full_name',e.target.value)} placeholder="Patient's full name"/></div>
            <div><Label req>Email</Label><input style={inp} type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="patient@email.com"/></div>
            <div><Label>Phone</Label><input style={inp} type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+91 XXXXX XXXXX"/></div>
            <div>
              <Label req>Date of birth</Label>
              <div style={{display:'flex',gap:6}}>
                <select style={{...inp,flex:1}} value={form.dob.split('-')[2]||''} onChange={e=>{const[y,m]=form.dob.split('-');set('dob',`${y||new Date().getFullYear()}-${m||'01'}-${e.target.value.padStart(2,'0')}`)}}>
                  <option value="">Day</option>{Array.from({length:31},(_,i)=><option key={i+1} value={String(i+1).padStart(2,'0')}>{i+1}</option>)}
                </select>
                <select style={{...inp,flex:1}} value={form.dob.split('-')[1]||''} onChange={e=>{const[y,,d]=form.dob.split('-');set('dob',`${y||new Date().getFullYear()}-${e.target.value}-${d||'01'}`)}}>
                  <option value="">Month</option>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
                </select>
                <select style={{...inp,flex:1}} value={form.dob.split('-')[0]||''} onChange={e=>{const[,m,d]=form.dob.split('-');set('dob',`${e.target.value}-${m||'01'}-${d||'01'}`)}}>
                  <option value="">Year</option>{Array.from({length:80},(_,i)=><option key={i} value={new Date().getFullYear()-i}>{new Date().getFullYear()-i}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label req>Gender</Label>
              <select style={inp} value={form.gender} onChange={e=>set('gender',e.target.value)}>
                <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
          </div>
          <div style={{marginTop:20,display:'flex',justifyContent:'flex-end'}}>
            <button disabled={!canStep1} onClick={()=>setStep(2)} style={{padding:'9px 22px',background:canStep1?G:'#E0E3ED',border:'none',borderRadius:10,color:'#fff',fontSize:13,fontWeight:700,cursor:canStep1?'pointer':'not-allowed',fontFamily:"'Poppins',Arial,sans-serif"}}>Continue →</button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Health profile ── */}
      {step===2&&(
        <div style={{background:CARD,borderRadius:14,padding:20,border:`1px solid ${BORDER}`}}>
          <div style={{fontWeight:700,color:N,marginBottom:16}}>Health & clinical profile</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
            <div><Label req>Height (cm)</Label><input style={inp} type="number" value={form.height_cm} onChange={e=>set('height_cm',e.target.value)} placeholder="e.g. 165"/></div>
            <div><Label req>Current weight (kg)</Label><input style={inp} type="number" value={form.weight_start} onChange={e=>set('weight_start',e.target.value)} placeholder="e.g. 78"/></div>
            <div><Label>Goal weight (kg)</Label><input style={inp} type="number" value={form.weight_target} onChange={e=>set('weight_target',e.target.value)} placeholder="e.g. 68"/></div>
          </div>
          <div style={{marginBottom:16}}>
            <Label req>Activity level</Label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {['Sedentary','Light','Moderate','Active','Very active'].map(a=>(
                <Chip key={a} label={a} selected={form.activity_level===a} onClick={()=>set('activity_level',a)}/>
              ))}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <Label req>Primary goal</Label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {GOALS.map(({g,icon})=>(
                <button key={g} onClick={()=>set('primary_goal',g)} style={{padding:'10px 8px',borderRadius:12,border:`1.5px solid ${form.primary_goal===g?G:BORDER}`,background:form.primary_goal===g?G+'18':CARD,color:form.primary_goal===g?G:TXT2,fontSize:11,fontWeight:form.primary_goal===g?700:400,cursor:'pointer',textAlign:'left',fontFamily:"'Poppins',Arial,sans-serif"}}>
                  <span style={{marginRight:5}}>{icon}</span>{g}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <Label req>Health conditions</Label>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {CONDITIONS.map(c=><Chip key={c.key} label={c.label} selected={!!form.conditions[c.key]} onClick={()=>toggleCond(c.key)}/>)}
            </div>
          </div>
          <div>
            <Label>Food allergies / intolerances</Label>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {ALLERGIES.map(a=><Chip key={a} label={a} selected={form.allergies===a} onClick={()=>set('allergies',form.allergies===a?'':a)} color={R}/>)}
            </div>
          </div>
          <div style={{marginTop:20,display:'flex',justifyContent:'space-between'}}>
            <button onClick={()=>setStep(1)} style={{padding:'9px 18px',background:CARD,border:`1.5px solid ${BORDER}`,borderRadius:10,color:TXT,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Poppins',Arial,sans-serif"}}>← Back</button>
            <button disabled={!canStep2} onClick={()=>setStep(3)} style={{padding:'9px 22px',background:canStep2?G:'#E0E3ED',border:'none',borderRadius:10,color:'#fff',fontSize:13,fontWeight:700,cursor:canStep2?'pointer':'not-allowed',fontFamily:"'Poppins',Arial,sans-serif"}}>Continue →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Meal preferences ── */}
      {step===3&&(
        <div style={{background:CARD,borderRadius:14,padding:20,border:`1px solid ${BORDER}`}}>
          <div style={{fontWeight:700,color:N,marginBottom:16}}>Meal preferences</div>
          <div style={{marginBottom:16}}>
            <Label req>Dietary preference</Label>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {DIETS.map(d=><Chip key={d} label={d} selected={form.diet_type===d} onClick={()=>set('diet_type',d)}/>)}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <Label req>Meals per day</Label>
            <div style={{display:'flex',gap:10}}>
              {[{n:'3',desc:'Breakfast, Lunch, Dinner'},{n:'5',desc:'+ Morning & Evening snack'},{n:'6',desc:'+ Bedtime snack'}].map(m=>(
                <button key={m.n} onClick={()=>set('meals_per_day',m.n)} style={{flex:1,padding:'12px 10px',borderRadius:12,border:`2px solid ${form.meals_per_day===m.n?G:BORDER}`,background:form.meals_per_day===m.n?G+'18':CARD,cursor:'pointer',textAlign:'left',fontFamily:"'Poppins',Arial,sans-serif"}}>
                  <div style={{fontSize:16,fontWeight:700,color:form.meals_per_day===m.n?G:N}}>{m.n} meals</div>
                  <div style={{fontSize:10,color:TXT2,marginTop:2}}>{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:4}}>
            <div><Label>Foods to avoid</Label><input style={inp} value={form.avoid_foods} onChange={e=>set('avoid_foods',e.target.value)} placeholder="e.g. bitter gourd, brinjal"/></div>
            <div><Label>Preferred foods</Label><input style={inp} value={form.preferred_foods} onChange={e=>set('preferred_foods',e.target.value)} placeholder="e.g. loves idli, South Indian"/></div>
          </div>
          {/* Summary pill row */}
          <div style={{background:N,borderRadius:12,padding:'12px 16px',marginTop:16}}>
            <div style={{color:G,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.6px',marginBottom:8}}>✦ AI will use all of this to generate the plan</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {[form.full_name&&`Patient: ${form.full_name}`,form.primary_goal&&`Goal: ${form.primary_goal}`,form.diet_type&&`Diet: ${form.diet_type}`,Object.keys(form.conditions).filter(k=>k!=='none').length>0&&`Conditions: ${Object.keys(form.conditions).filter(k=>k!=='none').join(', ')}`,`${form.meals_per_day} meals/day`].filter(Boolean).map((t,i)=>(
                <span key={i} style={{background:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.8)',fontSize:11,padding:'3px 10px',borderRadius:20}}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{marginTop:20,display:'flex',justifyContent:'space-between'}}>
            <button onClick={()=>setStep(2)} style={{padding:'9px 18px',background:CARD,border:`1.5px solid ${BORDER}`,borderRadius:10,color:TXT,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Poppins',Arial,sans-serif"}}>← Back</button>
            <button disabled={!canStep3} onClick={generatePlan} style={{padding:'9px 22px',background:canStep3?G:'#E0E3ED',border:'none',borderRadius:10,color:'#fff',fontSize:13,fontWeight:700,cursor:canStep3?'pointer':'not-allowed',fontFamily:"'Poppins',Arial,sans-serif"}}>Generate AI meal plan →</button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Generating ── */}
      {step===4&&(
        <div style={{background:CARD,borderRadius:14,padding:40,border:`1px solid ${BORDER}`,textAlign:'center'}}>
          <div style={{width:56,height:56,background:PU,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:24}}>✦</div>
          <div style={{fontSize:16,fontWeight:700,color:N,marginBottom:6}}>Generating personalised meal plan…</div>
          <div style={{fontSize:12,color:TXT2,marginBottom:24}}>Analysing {form.full_name}'s health profile and conditions</div>
          {['Reading health conditions & dietary restrictions','Calculating calorie & macro targets','Building condition-appropriate meal slots','Adding dietitian notes & AI suggestions'].map((t,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',background:BG,borderRadius:10,marginBottom:8,textAlign:'left'}}>
              <div style={{width:18,height:18,borderRadius:'50%',background:G,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10,flexShrink:0}}>⟳</div>
              <div style={{fontSize:12,color:TXT}}>{t}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 5: Plan review + AI chat + send ── */}
      {step===5&&generatedPlan&&(
        <div>
          {/* Plan summary */}
          <div style={{background:N,borderRadius:14,padding:18,marginBottom:14}}>
            <div style={{color:G,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.6px',marginBottom:8}}>✦ AI-generated plan ready</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{color:'#fff',fontSize:18,fontWeight:700}}>{form.full_name}</div>
                <div style={{color:'rgba(255,255,255,0.5)',fontSize:11,marginTop:2}}>{form.meals_per_day}-meal plan · {form.diet_type} · {form.primary_goal}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{color:'#fff',fontSize:26,fontWeight:700}}>{generatedPlan.totalCal}</div>
                <div style={{color:G,fontSize:11}}>kcal / day</div>
              </div>
            </div>
          </div>

          {/* Meal slots */}
          <div style={{background:CARD,borderRadius:14,padding:16,border:`1px solid ${BORDER}`,marginBottom:14}}>
            <div style={{fontWeight:700,color:N,marginBottom:12}}>Meal plan</div>
            {(generatedPlan.slots||[]).map((slot,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'10px 0',borderBottom:i<generatedPlan.slots.length-1?`1px solid ${BORDER}`:'none'}}>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:N}}>{slot.slot}</div>
                  <div style={{fontSize:11,color:TXT2,marginTop:3}}>{(slot.foods||[]).join(' · ')}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
                  <div style={{fontSize:13,fontWeight:700,color:G}}>{slot.kcal} kcal</div>
                  <div style={{fontSize:10,color:TXT2}}>P:{slot.macros?.protein}g C:{slot.macros?.carbs}g F:{slot.macros?.fat}g</div>
                </div>
              </div>
            ))}
          </div>

          {/* AI notes */}
          {generatedPlan.notes?.length>0&&(
            <div style={{background:'#fffbf0',borderRadius:12,padding:14,border:'1px solid #fde68a',marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:'#92400e',marginBottom:8}}>⚕️ Dietitian notes</div>
              {generatedPlan.notes.map((n,i)=><div key={i} style={{fontSize:12,color:'#78350f',marginBottom:4}}>• {n}</div>)}
            </div>
          )}

          {/* AI refinement chat */}
          <div style={{background:CARD,borderRadius:14,border:`1px solid ${BORDER}`,marginBottom:14,overflow:'hidden'}}>
            <div style={{background:N,padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:30,height:30,background:PU,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:13}}>✦</div>
              <div>
                <div style={{color:'#fff',fontSize:13,fontWeight:700}}>Refine plan with AI</div>
                <div style={{color:'rgba(255,255,255,0.45)',fontSize:10}}>Ask to swap foods, adjust calories, or explain any recommendation</div>
              </div>
            </div>
            <div style={{padding:14,maxHeight:260,overflowY:'auto',background:BG,display:'flex',flexDirection:'column',gap:10}}>
              {aiChat.map((m,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-end',gap:8,flexDirection:m.role==='user'?'row-reverse':'row'}}>
                  <div style={{width:26,height:26,borderRadius:'50%',background:m.role==='user'?G:PU,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,flexShrink:0}}>{m.role==='user'?'Dr':'✦'}</div>
                  <div style={{maxWidth:'78%',padding:'9px 13px',borderRadius:14,fontSize:12,lineHeight:1.5,background:m.role==='user'?N:CARD,color:m.role==='user'?'#fff':TXT,border:m.role==='user'?'none':`1px solid ${BORDER}`,borderBottomLeftRadius:m.role==='user'?14:4,borderBottomRightRadius:m.role==='user'?4:14}}>{m.content}</div>
                </div>
              ))}
              {chatLoading&&<div style={{display:'flex',gap:6,padding:'8px 14px',alignItems:'center'}}><div style={{width:26,height:26,borderRadius:'50%',background:PU,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11}}>✦</div><div style={{display:'flex',gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:'#CBD5E0',animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}</div></div>}
            </div>
            {/* Chat quick chips */}
            <div style={{display:'flex',gap:7,padding:'8px 14px',overflowX:'auto',borderTop:`1px solid ${BORDER}`}}>
              {['Increase protein','Replace Dal with Rajma','Reduce calories by 200','Explain diabetic choices','Make it fully vegetarian'].map(c=>(
                <span key={c} onClick={()=>setChatInput(c)} style={{background:CARD,border:`1.5px solid ${BORDER}`,borderRadius:20,padding:'5px 12px',fontSize:11,fontWeight:600,color:N,whiteSpace:'nowrap',cursor:'pointer',fontFamily:"'Poppins',Arial,sans-serif"}}>{c}</span>
              ))}
            </div>
            <div style={{padding:'10px 14px',display:'flex',gap:8,alignItems:'center',background:CARD}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} placeholder="Ask AI to refine this plan…" style={{...inp,flex:1,background:BG}}/>
              <button onClick={sendChat} disabled={!chatInput.trim()||chatLoading} style={{width:36,height:36,background:chatInput.trim()?G:'#E0E3ED',borderRadius:'50%',border:'none',color:'#fff',fontSize:16,cursor:chatInput.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center'}}>→</button>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setStep(3)} style={{padding:'9px 18px',background:CARD,border:`1.5px solid ${BORDER}`,borderRadius:10,color:TXT,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Poppins',Arial,sans-serif"}}>← Edit profile</button>
            <button onClick={saveAndInvite} disabled={saving} style={{padding:'9px 22px',background:saving?'#E0E3ED':G,border:'none',borderRadius:10,color:'#fff',fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:"'Poppins',Arial,sans-serif"}}>
              {saving?'Sending…':'✉️ Save & send invite →'}
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  );
}
