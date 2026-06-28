// pages/signup.js — NEW FILE
// Multi-step signup: Step 1 choose type, Step 2 account details,
// Step 3 health profile (individual) or clinic details (clinic)
import { useState } from 'react';
import { useRouter } from 'next/router';
import { getSupabase } from '../lib/supabase';
import PasswordInput from '../components/PasswordInput';
import Link from 'next/link';

const CONDITIONS = ['Diabetes Type 2','High BP','Thyroid','PCOD/PCOS','High Cholesterol'];
const GOALS      = ['Lose weight','Gain weight','Maintain weight','Manage health condition','Build muscle'];
const ACTIVITY   = ['Sedentary','Light','Moderate','Active','Very Active'];
const DIETS      = ['Vegetarian','Eggetarian','Non-Vegetarian','Vegan'];
const MEALS      = ['3 meals','5 meals','6 meals'];
const CLINIC_TYPES = ['Solo Dietitian','Multi-dietitian Clinic','Hospital','Corporate Wellness'];
const PATIENT_VOL  = ['Less than 10','10–50','50–200','200+'];
const REFERRAL     = ['Google','Referral','Social Media','Other'];

export default function SignupPage() {
  const router = useRouter();
  const [type,      setType]      = useState('');       // 'clinic' | 'individual'
  const [step,      setStep]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  // Account fields
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [phone,     setPhone]     = useState('');

  // Clinic fields
  const [clinicName, setClinicName] = useState('');
  const [clinicType, setClinicType] = useState('');
  const [city,       setCity]       = useState('');
  const [patVol,     setPatVol]     = useState('');
  const [referral,   setReferral]   = useState('');

  // Health profile fields
  const [dob,        setDob]        = useState('');
  const [gender,     setGender]     = useState('');
  const [height,     setHeight]     = useState('');
  const [weight,     setWeight]     = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [activity,   setActivity]   = useState('');
  const [conditions, setConditions] = useState([]);
  const [diet,       setDiet]       = useState('');
  const [goal,       setGoal]       = useState('');
  const [mealPlan,   setMealPlan]   = useState('');

  function toggleCondition(c) {
    setConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  function validateAccount() {
    if (!name.trim())      return 'Full name is required.';
    if (!email.trim())     return 'Email is required.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter.';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter.';
    if (!/[0-9]/.test(password)) return 'Password must contain a number.';
    return null;
  }

  async function handleFinalSubmit() {
    const supabase = getSupabase();
    setError('');
    setLoading(true);
    try {
      // 1. Sign up with Supabase Auth
      const supabase = getSupabase();
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: name.trim(), phone } }
      });
      if (authErr) throw authErr;
      const userId = authData.user?.id;
      if (!userId) throw new Error('Signup failed — please try again.');

      // 2. Create organisation
      const trialDays = type === 'clinic' ? 7 : 3;
      const orgName   = type === 'clinic' ? clinicName.trim() : `${name.trim()}'s Account`;
      const { data: org, error: orgErr } = await supabase
        .from('organisations')
        .insert({
          name: orgName,
          plan: 'trial',
          trial_ends_at: new Date(Date.now() + trialDays * 86400000).toISOString(),
          max_patients: type === 'clinic' ? 50 : 1,
        })
        .select().single();
      if (orgErr) throw orgErr;

      // 3. Add user as org_admin (clinic) or patient (individual)
      const memberRole = type === 'clinic' ? 'org_admin' : 'patient';
      await supabase.from('organisation_members').insert({
        org_id: org.id, user_id: userId, role: memberRole
      });

      // 4. Update profile with health data (individual)
      if (type === 'individual') {
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          dob,
          gender,
          height_cm: parseFloat(height),
          current_weight: parseFloat(weight),
          goal_weight: parseFloat(goalWeight),
          activity_level: activity,
          health_conditions: conditions,
          dietary_pref: diet,
          meal_plan_type: mealPlan,
          goal,
        });
        // self-assign as patient
        await supabase.from('patient_assignments').insert({
          org_id: org.id, patient_id: userId, dietitian_id: userId
        });
      }

      // 5. Audit log
      await supabase.from('audit_log').insert({
        actor_id: userId, action: 'signup', target_type: 'user',
        target_id: userId, metadata: { type, org_id: org.id }
      });

      router.replace(type === 'clinic' ? '/clinic/patients' : '/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  // ── RENDER ──────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <div style={s.logoIcon}>🌿</div>
          <div style={s.logoName}>VitaLog</div>
        </div>

        {/* STEP 1: Choose type */}
        {step === 1 && (
          <>
            <h1 style={s.h1}>Create your account</h1>
            <p style={s.sub}>How will you be using VitaLog?</p>
            <div style={s.typeGrid}>
              <TypeCard icon="🏥" title="Clinic / Dietitian" desc="Manage patients, assign meal plans, track compliance" onClick={() => { setType('clinic'); setStep(2); }} />
              <TypeCard icon="👤" title="Individual User" desc="Track my own diet, health and daily goals" onClick={() => { setType('individual'); setStep(2); }} />
            </div>
            <p style={s.loginLink}>Already have an account? <Link href="/" style={s.link}>Sign in</Link></p>
          </>
        )}

        {/* STEP 2: Account details (both types) */}
        {step === 2 && (
          <>
            <button style={s.back} onClick={() => setStep(1)}>← Back</button>
            <h1 style={s.h1}>{type === 'clinic' ? 'Clinic account' : 'Your account'}</h1>
            <p style={s.sub}>Step 1 of {type === 'clinic' ? 2 : 2} — Your details</p>
            {error && <div style={s.err}>{error}</div>}

            <label style={s.lbl}>Full name *</label>
            <input style={s.inp} value={name} onChange={e => setName(e.target.value)} placeholder={type === 'clinic' ? 'Dr. Priya Sharma' : 'Your full name'} required />

            <label style={s.lbl}>Email address *</label>
            <input style={s.inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={type === 'clinic' ? 'you@clinic.com' : 'your@email.com'} required />

            <PasswordInput value={password} onChange={setPassword} label="Password *" autoComplete="new-password" showStrength />

            {type === 'clinic' && (
              <>
                <label style={s.lbl}>Phone number (optional)</label>
                <input style={s.inp} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </>
            )}

            <button style={s.btn} onClick={() => {
              const err = validateAccount();
              if (err) { setError(err); return; }
              setError('');
              setStep(3);
            }}>
              Continue →
            </button>
          </>
        )}

        {/* STEP 3 CLINIC: Clinic details */}
        {step === 3 && type === 'clinic' && (
          <>
            <button style={s.back} onClick={() => setStep(2)}>← Back</button>
            <h1 style={s.h1}>Your clinic</h1>
            <p style={s.sub}>Step 2 of 2 — Clinic information</p>
            {error && <div style={s.err}>{error}</div>}

            <label style={s.lbl}>Clinic / Practice name *</label>
            <input style={s.inp} value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="e.g. Sharma Nutrition Clinic" required />

            <label style={s.lbl}>Type *</label>
            <div style={s.chipRow}>
              {CLINIC_TYPES.map(t => <Chip key={t} label={t} selected={clinicType===t} onClick={() => setClinicType(t)} />)}
            </div>

            <label style={s.lbl}>City / Location *</label>
            <input style={s.inp} value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Mumbai" required />

            <label style={s.lbl}>Patients you currently manage</label>
            <div style={s.chipRow}>
              {PATIENT_VOL.map(v => <Chip key={v} label={v} selected={patVol===v} onClick={() => setPatVol(v)} />)}
            </div>

            <label style={s.lbl}>How did you hear about us?</label>
            <div style={s.chipRow}>
              {REFERRAL.map(r => <Chip key={r} label={r} selected={referral===r} onClick={() => setReferral(r)} />)}
            </div>

            <div style={s.trialNote}>✓ 7-day free trial · No credit card required</div>
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading} onClick={handleFinalSubmit}>
              {loading ? 'Creating account…' : 'Start Free Trial →'}
            </button>
          </>
        )}

        {/* STEP 3 INDIVIDUAL: Health profile */}
        {step === 3 && type === 'individual' && (
          <>
            <button style={s.back} onClick={() => setStep(2)}>← Back</button>
            <h1 style={s.h1}>Your health profile</h1>
            <p style={s.sub}>Step 2 of 2 — Used for AI meal plans & tracking</p>
            {error && <div style={s.err}>{error}</div>}

            <div style={s.row2}>
              <div>
                <label style={s.lbl}>Date of birth *</label>
                <input style={s.inp} type="date" value={dob} onChange={e => setDob(e.target.value)} required />
              </div>
              <div>
                <label style={s.lbl}>Gender *</label>
                <select style={s.inp} value={gender} onChange={e => setGender(e.target.value)} required>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Prefer not to say</option>
                </select>
              </div>
            </div>

            <div style={s.row3}>
              <div><label style={s.lbl}>Height (cm)</label><input style={s.inp} type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="170" /></div>
              <div><label style={s.lbl}>Current (kg)</label><input style={s.inp} type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="80" /></div>
              <div><label style={s.lbl}>Goal (kg)</label><input style={s.inp} type="number" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} placeholder="72" /></div>
            </div>

            <label style={s.lbl}>Activity level *</label>
            <div style={s.chipRow}>
              {ACTIVITY.map(a => <Chip key={a} label={a} selected={activity===a} onClick={() => setActivity(a)} />)}
            </div>

            <label style={s.lbl}>Health conditions (select all that apply)</label>
            <div style={s.chipRow}>
              {CONDITIONS.map(c => <Chip key={c} label={c} selected={conditions.includes(c)} onClick={() => toggleCondition(c)} />)}
              <Chip label="None" selected={conditions.length===0} onClick={() => setConditions([])} />
            </div>

            <label style={s.lbl}>Dietary preference *</label>
            <div style={s.chipRow}>
              {DIETS.map(d => <Chip key={d} label={d} selected={diet===d} onClick={() => setDiet(d)} />)}
            </div>

            <label style={s.lbl}>Primary goal *</label>
            <div style={s.chipRow}>
              {GOALS.map(g => <Chip key={g} label={g} selected={goal===g} onClick={() => setGoal(g)} />)}
            </div>

            <label style={s.lbl}>Meal plan preference *</label>
            <div style={s.chipRow}>
              {MEALS.map(m => <Chip key={m} label={m} selected={mealPlan===m} onClick={() => setMealPlan(m)} />)}
            </div>

            <div style={s.trialNote}>✓ 3-day free trial · AI will generate your meal plan automatically</div>
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading} onClick={handleFinalSubmit}>
              {loading ? 'Setting up your account…' : 'Create Account & Generate Meal Plan →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TypeCard({ icon, title, desc, onClick }) {
  return (
    <div style={s.typeCard} onClick={onClick}>
      <div style={s.typeIcon}>{icon}</div>
      <div style={s.typeTitle}>{title}</div>
      <div style={s.typeDesc}>{desc}</div>
      <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#10B981', marginTop:8 }}>Get started →</div>
    </div>
  );
}

function Chip({ label, selected, onClick }) {
  return (
    <div onClick={onClick} style={{ ...s.chip, ...(selected ? s.chipOn : {}) }}>{label}</div>
  );
}

const s = {
  page:      { minHeight:'100vh', background:'#F7F8FA', display:'flex', justifyContent:'center', padding:'24px 16px' },
  card:      { background:'#fff', borderRadius:20, padding:'28px 24px', width:'100%', maxWidth:480, boxShadow:'0 4px 24px rgba(0,0,0,0.08)', border:'1px solid #E5E7EB', alignSelf:'flex-start' },
  logoRow:   { display:'flex', alignItems:'center', gap:8, marginBottom:24 },
  logoIcon:  { width:34, height:34, background:'linear-gradient(135deg,#10B981,#059669)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 },
  logoName:  { fontFamily:'Sora,sans-serif', fontSize:'1rem', fontWeight:800, color:'#111827' },
  h1:        { fontFamily:'Sora,sans-serif', fontSize:'1.3rem', fontWeight:800, color:'#111827', marginBottom:4 },
  sub:       { fontSize:'0.76rem', color:'#6B7280', marginBottom:20 },
  typeGrid:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 },
  typeCard:  { border:'1.5px solid #E5E7EB', borderRadius:14, padding:'16px 12px', cursor:'pointer', textAlign:'center', transition:'border-color 0.15s' },
  typeIcon:  { fontSize:'1.8rem', marginBottom:6 },
  typeTitle: { fontFamily:'Sora,sans-serif', fontSize:'0.8rem', fontWeight:700, color:'#111827', marginBottom:4 },
  typeDesc:  { fontSize:'0.64rem', color:'#6B7280', lineHeight:1.4 },
  back:      { background:'none', border:'none', color:'#6B7280', cursor:'pointer', fontSize:'0.76rem', padding:'0 0 12px', fontFamily:'Inter,sans-serif' },
  lbl:       { display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:5 },
  inp:       { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.82rem', fontFamily:'Inter,sans-serif', outline:'none', marginBottom:12, boxSizing:'border-box', color:'#111827', background:'#fff' },
  btn:       { width:'100%', padding:12, background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', borderRadius:12, fontWeight:700, fontSize:'0.84rem', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif', marginTop:4 },
  err:       { background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:12 },
  trialNote: { background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:9, padding:'8px 12px', fontSize:'0.7rem', color:'#065F46', marginBottom:14 },
  chipRow:   { display:'flex', flexWrap:'wrap', gap:6, marginBottom:14 },
  chip:      { padding:'5px 12px', border:'1.5px solid #E5E7EB', borderRadius:20, fontSize:'0.68rem', fontWeight:500, color:'#374151', cursor:'pointer', transition:'all 0.12s', background:'#fff' },
  chipOn:    { background:'#111827', color:'#fff', borderColor:'#111827' },
  row2:      { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  row3:      { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 },
  loginLink: { textAlign:'center', fontSize:'0.74rem', color:'#6B7280', marginTop:16 },
  link:      { color:'#10B981', fontWeight:600, textDecoration:'none' },
};
