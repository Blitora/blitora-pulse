// pages/signup.js
// Flow: Choose type → Account details → Health profile (individual) or Clinic details → 
//       signUp() → Show "Verify your email" screen → user clicks email → /auth/callback → /setup → /dashboard

import { useState } from 'react';
import { useRouter } from 'next/router';
import { getSupabase } from '../lib/supabase';
import PasswordInput from '../components/PasswordInput';
import Link from 'next/link';

// ── Constants ──────────────────────────────────────────────────────────────
const CONDITIONS = [
  'Diabetes Type 2','Pre-Diabetes','High BP','Thyroid (Hypo/Hyper)',
  'PCOD/PCOS','High Cholesterol','Obesity','Kidney Issues',
  'Heart Condition','Fatty Liver','Arthritis / Joint Pain',
  'IBS / Acidity / Bloating','Anaemia','Uric Acid / Gout',
  'Skin Issues (Acne/Eczema)','Low Immunity','Stress / Anxiety',
  'Hormonal Imbalance',
];
const GOALS = [
  'Lose weight','Gain weight','Maintain weight','Build muscle',
  'Manage health condition','Improve energy & stamina','Eat healthier',
  'Reduce stress & sleep better','Manage post-pregnancy weight',
  'Improve gut health','Control blood sugar','Reduce cholesterol',
];
const ACTIVITY   = ['Sedentary','Light','Moderate','Active','Very Active'];
const DIETS      = ['Vegetarian','Eggetarian','Non-Vegetarian','Vegan','Jain','Keto','Gluten-Free','Dairy-Free'];
const MEALS      = ['3 meals','5 meals','6 meals'];
const CLINIC_TYPES = ['Solo Dietitian','Multi-dietitian Clinic','Hospital','Corporate Wellness'];
const PATIENT_VOL  = ['Less than 10','10–50','50–200','200+'];
const REFERRAL     = ['Google','Referral','Social Media','Other'];

// ── Brand colours (VitaLog theme) ─────────────────────────────────────────
const G = '#1D9E75'; // Health Green
const N = '#0D1B3E'; // Navy
const BORDER = '#E0E3ED';

export default function SignupPage() {
  const router = useRouter();
  const [type,    setType]    = useState('');
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [done,    setDone]    = useState(false); // show verify-email screen

  // Account fields
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [phone,    setPhone]    = useState('');

  // Clinic fields
  const [clinicName, setClinicName] = useState('');
  const [clinicType, setClinicType] = useState('');
  const [city,       setCity]       = useState('');
  const [patVol,     setPatVol]     = useState('');
  const [referral,   setReferral]   = useState('');

  // Health profile fields
  const [dob,        setDob]        = useState('');
  const [gender,     setGender]     = useState('');
  const [heightUnit, setHeightUnit] = useState('cm');
  const [height,     setHeight]     = useState('');
  const [heightFt,   setHeightFt]   = useState('');
  const [heightIn,   setHeightIn]   = useState('');
  const [weight,     setWeight]     = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [activity,   setActivity]   = useState('');
  const [conditions, setConditions] = useState([]);
  const [diets,      setDiets]      = useState([]);
  const [goals,      setGoals]      = useState([]);
  const [mealPlan,   setMealPlan]   = useState('');

  function getHeightCm() {
    if (heightUnit === 'cm') return height ? parseFloat(height) : null;
    const ft = parseFloat(heightFt) || 0;
    const inches = parseFloat(heightIn) || 0;
    const total = (ft * 30.48) + (inches * 2.54);
    return total > 0 ? Math.round(total) : null;
  }

  function toggleArr(arr, setArr, val) {
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
  }

  function validateAccount() {
    if (!name.trim())            return 'Full name is required.';
    if (!email.trim())           return 'Email address is required.';
    if (password.length < 8)    return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(password)) return 'Password needs an uppercase letter.';
    if (!/[a-z]/.test(password)) return 'Password needs a lowercase letter.';
    if (!/[0-9]/.test(password)) return 'Password needs a number.';
    return null;
  }

  async function handleFinalSubmit() {
    setError('');
    setLoading(true);
    const supabase = getSupabase();
    try {
      // 1. Create auth user — Supabase sends confirmation email
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: name.trim(), phone },
          // After email click → /auth/callback → /setup
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authErr) throw authErr;
      const userId = authData.user?.id;
      if (!userId) throw new Error('Signup failed — please try again.');

      // 2. Create organisation (can do before email confirm — user can't log in until confirmed)
      const trialDays = type === 'clinic' ? 7 : 3;
      const orgName   = type === 'clinic' ? clinicName.trim() : `${name.trim()}'s Account`;
      const { data: org, error: orgErr } = await supabase.from('organisations').insert({
        name: orgName,
        plan: 'trial',
        trial_ends_at: new Date(Date.now() + trialDays * 86400000).toISOString(),
        max_patients: type === 'clinic' ? 50 : 1,
      }).select().single();
      if (orgErr) throw orgErr;

      // 3. Org membership
      const memberRole = type === 'clinic' ? 'org_admin' : 'patient';
      await supabase.from('organisation_members').insert({
        org_id: org.id, user_id: userId, role: memberRole,
      });

      // 4. Save health profile immediately (individual) — setup page can update later
      if (type === 'individual') {
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          dob: dob || null,
          gender: gender || null,
          height_cm: getHeightCm(),
          weight_start: weight ? parseFloat(weight) : null,
          weight_current: weight ? parseFloat(weight) : null,
          weight_target: goalWeight ? parseFloat(goalWeight) : null,
          activity_level: activity || null,
          conditions: conditions.length ? conditions : null,
          dietary_pref: diets.length ? diets.join(', ') : null,
          meal_plan_type: mealPlan || null,
          goal: goals.length ? goals.join(', ') : null,
          role: 'patient',
          status: 'active',
          setup_complete: true, // all data collected during signup
        }, { onConflict: 'id' });
      } else {
        await supabase.from('profiles').upsert({
          id: userId,
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          role: 'org_admin',
          status: 'active',
          setup_complete: true,
        }, { onConflict: 'id' });
      }

      // 5. Show verify email screen
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── VERIFY EMAIL SCREEN ───────────────────────────────────────────────────
  if (done) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <Logo />
          <div style={{ textAlign:'center', padding:'8px 0 4px' }}>
            <div style={{ fontSize:'3rem', marginBottom:16 }}>📬</div>
            <h1 style={{ ...s.h1, fontSize:'1.4rem', marginBottom:8 }}>Check your inbox</h1>
            <p style={{ fontSize:'0.82rem', color:'#6B7280', lineHeight:1.6, marginBottom:6 }}>
              We sent a verification link to
            </p>
            <div style={{ display:'inline-block', background:'#F0FDF4', border:`1px solid #A7F3D0`, borderRadius:8, padding:'6px 14px', fontSize:'0.82rem', fontWeight:700, color:G, marginBottom:16 }}>
              {email}
            </div>
            <p style={{ fontSize:'0.76rem', color:'#6B7280', lineHeight:1.6, marginBottom:20 }}>
              Click the link in the email to verify your account.<br/>
              After verification you'll be taken straight to your dashboard.
            </p>
            <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'10px 14px', fontSize:'0.72rem', color:'#92400E', marginBottom:20, textAlign:'left' }}>
              <strong>Didn't get it?</strong> Check your spam folder. The link expires in 1 hour.
            </div>
            <button
              style={{ ...s.btn, background:'none', border:`1.5px solid ${BORDER}`, color:'#6B7280', marginBottom:8 }}
              onClick={async () => {
                const supabase = getSupabase();
                await supabase.auth.resend({ type:'signup', email, options:{ emailRedirectTo:`${window.location.origin}/auth/callback` } });
                alert('Verification email resent!');
              }}
            >
              Resend verification email
            </button>
            <button style={{ ...s.btn, background:'none', border:'none', color:'#9CA3AF', fontSize:'0.72rem' }}
              onClick={() => { setDone(false); setStep(1); setType(''); }}>
              ← Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN SIGNUP STEPS ────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.card}>
        <Logo />

        {/* STEP 1: Choose type */}
        {step === 1 && (
          <>
            <h1 style={s.h1}>Create your account</h1>
            <p style={s.sub}>How will you be using VitaLog?</p>
            <div style={s.typeGrid}>
              <TypeCard icon="🏥" title="Clinic / Dietitian" desc="Manage patients, assign meal plans, track compliance"
                onClick={() => { setType('clinic'); setStep(2); }} />
              <TypeCard icon="👤" title="Individual User" desc="Track my own diet, health goals and daily habits"
                onClick={() => { setType('individual'); setStep(2); }} />
            </div>
            <p style={s.loginLink}>Already have an account? <Link href="/" style={s.link}>Sign in</Link></p>
          </>
        )}

        {/* STEP 2: Account details */}
        {step === 2 && (
          <>
            <button style={s.back} onClick={() => setStep(1)}>← Back</button>
            <h1 style={s.h1}>{type === 'clinic' ? 'Clinic account' : 'Your account'}</h1>
            <p style={s.sub}>Step 1 of {type === 'clinic' ? 2 : 2} — Your details</p>
            {error && <div style={s.err}>{error}</div>}

            <label style={s.lbl}>Full name *</label>
            <input style={s.inp} value={name}
              onChange={e => setName(e.target.value)}
              placeholder={type === 'clinic' ? 'Dr. Priya Sharma' : 'Your full name'} required />

            <label style={s.lbl}>Email address *</label>
            <input style={s.inp} type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={type === 'clinic' ? 'you@clinic.com' : 'your@email.com'} required />

            <PasswordInput value={password} onChange={setPassword}
              label="Password *" autoComplete="new-password" showStrength />

            {type === 'clinic' && (
              <>
                <label style={s.lbl}>Phone number (optional)</label>
                <input style={s.inp} type="tel" value={phone}
                  onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </>
            )}

            <button style={s.btn} onClick={() => {
              const err = validateAccount();
              if (err) { setError(err); return; }
              setError(''); setStep(3);
            }}>Continue →</button>
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
            <input style={s.inp} value={clinicName} onChange={e => setClinicName(e.target.value)}
              placeholder="e.g. Sharma Nutrition Clinic" required />

            <label style={s.lbl}>Type *</label>
            <div style={s.chipRow}>
              {CLINIC_TYPES.map(t => <Chip key={t} label={t} selected={clinicType===t} onClick={() => setClinicType(t)} />)}
            </div>

            <label style={s.lbl}>City *</label>
            <input style={s.inp} value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Mumbai" required />

            <label style={s.lbl}>Patients you manage</label>
            <div style={s.chipRow}>
              {PATIENT_VOL.map(v => <Chip key={v} label={v} selected={patVol===v} onClick={() => setPatVol(v)} />)}
            </div>

            <label style={s.lbl}>How did you hear about us?</label>
            <div style={s.chipRow}>
              {REFERRAL.map(r => <Chip key={r} label={r} selected={referral===r} onClick={() => setReferral(r)} />)}
            </div>

            <div style={s.trialNote}>✓ 7-day free trial · No credit card required</div>
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}
              onClick={handleFinalSubmit}>
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </>
        )}

        {/* STEP 3 INDIVIDUAL: Health profile */}
        {step === 3 && type === 'individual' && (
          <>
            <button style={s.back} onClick={() => setStep(2)}>← Back</button>
            <h1 style={s.h1}>Your health profile</h1>
            <p style={s.sub}>Step 2 of 2 — Helps us personalise your plan</p>
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
              <div style={{gridColumn:'1/-1'}}>
                <label style={s.lbl}>Height</label>
                {/* Unit toggle */}
                <div style={{display:'flex',gap:6,marginBottom:8}}>
                  {['cm','ft / in'].map(u => (
                    <button key={u} type="button"
                      onClick={() => setHeightUnit(u === 'cm' ? 'cm' : 'ft')}
                      style={{
                        padding:'5px 14px', borderRadius:20, border:'1.5px solid',
                        borderColor: (u === 'cm' ? heightUnit === 'cm' : heightUnit === 'ft') ? G : BORDER,
                        background: (u === 'cm' ? heightUnit === 'cm' : heightUnit === 'ft') ? G : '#fff',
                        color: (u === 'cm' ? heightUnit === 'cm' : heightUnit === 'ft') ? '#fff' : '#374151',
                        fontSize:'0.72rem', fontWeight:600, cursor:'pointer',
                        fontFamily:"'Poppins',Arial,sans-serif",
                      }}>
                      {u}
                    </button>
                  ))}
                </div>
                {heightUnit === 'cm' ? (
                  <input style={s.inp} type="number" value={height}
                    onChange={e => setHeight(e.target.value)} placeholder="e.g. 170 cm" />
                ) : (
                  <div style={{display:'flex',gap:8}}>
                    <div style={{flex:1}}>
                      <input style={s.inp} type="number" value={heightFt}
                        onChange={e => setHeightFt(e.target.value)} placeholder="ft  e.g. 5" />
                      <div style={{fontSize:'0.65rem',color:'#9CA3AF',marginTop:-10,marginBottom:12,paddingLeft:2}}>feet</div>
                    </div>
                    <div style={{flex:1}}>
                      <input style={s.inp} type="number" value={heightIn}
                        onChange={e => setHeightIn(e.target.value)} placeholder="in  e.g. 7" />
                      <div style={{fontSize:'0.65rem',color:'#9CA3AF',marginTop:-10,marginBottom:12,paddingLeft:2}}>inches</div>
                    </div>
                    {(heightFt || heightIn) && (
                      <div style={{display:'flex',alignItems:'center',paddingBottom:12}}>
                        <span style={{fontSize:'0.72rem',color:G,fontWeight:600,whiteSpace:'nowrap'}}>
                          = {Math.round((parseFloat(heightFt||0)*30.48)+(parseFloat(heightIn||0)*2.54))} cm
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div><label style={s.lbl}>Current (kg)</label>
                <input style={s.inp} type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="80" /></div>
              <div><label style={s.lbl}>Goal (kg)</label>
                <input style={s.inp} type="number" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} placeholder="72" /></div>
            </div>

            <label style={s.lbl}>Activity level *</label>
            <div style={s.chipRow}>
              {ACTIVITY.map(a => <Chip key={a} label={a} selected={activity===a} onClick={() => setActivity(a)} />)}
            </div>

            <label style={s.lbl}>Health conditions <Hint>select all that apply</Hint></label>
            <div style={s.chipRow}>
              {CONDITIONS.map(c => <Chip key={c} label={c} selected={conditions.includes(c)} onClick={() => toggleArr(conditions, setConditions, c)} />)}
              <Chip label="None / Healthy" selected={conditions.length===0} onClick={() => setConditions([])} />
            </div>

            <label style={s.lbl}>Dietary preference <Hint>select all that apply</Hint></label>
            <div style={s.chipRow}>
              {DIETS.map(d => <Chip key={d} label={d} selected={diets.includes(d)} onClick={() => toggleArr(diets, setDiets, d)} />)}
            </div>

            <label style={s.lbl}>Primary goals <Hint>pick all that apply</Hint></label>
            <div style={s.chipRow}>
              {GOALS.map(g => <Chip key={g} label={g} selected={goals.includes(g)} onClick={() => toggleArr(goals, setGoals, g)} />)}
            </div>

            <label style={s.lbl}>Meal plan preference</label>
            <div style={s.chipRow}>
              {MEALS.map(m => <Chip key={m} label={m} selected={mealPlan===m} onClick={() => setMealPlan(m)} />)}
            </div>

            <div style={s.trialNote}>✓ 3-day free trial · We'll send a verification email next</div>
            <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}
              onClick={handleFinalSubmit}>
              {loading ? 'Creating account…' : 'Create account & verify email →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Small components ───────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
      <div style={{ width:34, height:34, background:`linear-gradient(135deg,${G},#159960)`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🌿</div>
      <div>
        <div style={{ fontFamily:'Sora,sans-serif', fontSize:'1rem', fontWeight:800, color:N }}>VitaLog</div>
        <div style={{ fontSize:'0.5rem', color:'#9CA3AF', letterSpacing:'0.07em', textTransform:'uppercase' }}>Health Platform</div>
      </div>
    </div>
  );
}

function Hint({ children }) {
  return <span style={{ fontSize:'0.6rem', color:'#9CA3AF', fontWeight:400, marginLeft:4 }}>({children})</span>;
}

function TypeCard({ icon, title, desc, onClick }) {
  return (
    <div style={s.typeCard} onClick={onClick}>
      <div style={s.typeIcon}>{icon}</div>
      <div style={s.typeTitle}>{title}</div>
      <div style={s.typeDesc}>{desc}</div>
      <div style={{ fontSize:'0.68rem', fontWeight:700, color:G, marginTop:8 }}>Get started →</div>
    </div>
  );
}

function Chip({ label, selected, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding:'5px 12px', border:`1.5px solid ${selected ? G : BORDER}`,
      borderRadius:20, fontSize:'0.68rem', fontWeight: selected ? 600 : 500,
      color: selected ? '#fff' : '#374151', cursor:'pointer',
      background: selected ? G : '#fff', transition:'all 0.12s',
    }}>{label}</div>
  );
}

const s = {
  page:      { minHeight:'100vh', background:'#F5F6FA', display:'flex', justifyContent:'center', padding:'24px 16px', fontFamily:"'Poppins', Arial, sans-serif" },
  card:      { background:'#fff', borderRadius:20, padding:'28px 24px', width:'100%', maxWidth:500, boxShadow:'0 4px 24px rgba(13,27,62,0.08)', border:`1px solid ${BORDER}`, alignSelf:'flex-start' },
  h1:        { fontSize:'1.3rem', fontWeight:700, color:N, marginBottom:4 },
  sub:       { fontSize:'0.76rem', color:'#6B7280', marginBottom:20 },
  typeGrid:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 },
  typeCard:  { border:`1.5px solid ${BORDER}`, borderRadius:14, padding:'16px 12px', cursor:'pointer', textAlign:'center', transition:'border-color 0.15s' },
  typeIcon:  { fontSize:'1.8rem', marginBottom:6 },
  typeTitle: { fontSize:'0.8rem', fontWeight:700, color:N, marginBottom:4 },
  typeDesc:  { fontSize:'0.64rem', color:'#6B7280', lineHeight:1.4 },
  back:      { background:'none', border:'none', color:'#6B7280', cursor:'pointer', fontSize:'0.76rem', padding:'0 0 12px' },
  lbl:       { display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:5 },
  inp:       { width:'100%', padding:'9px 12px', border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:'0.82rem', outline:'none', marginBottom:12, boxSizing:'border-box', color:N, background:'#fff', fontFamily:"'Poppins', Arial, sans-serif" },
  btn:       { width:'100%', padding:12, background:`linear-gradient(135deg,${G},#159960)`, color:'#fff', borderRadius:12, fontWeight:700, fontSize:'0.84rem', border:'none', cursor:'pointer', marginTop:4, fontFamily:"'Poppins', Arial, sans-serif" },
  err:       { background:'#FEF2F2', border:'1px solid #FECACA', color:'#C0392B', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:12 },
  trialNote: { background:'#F0FDF8', border:`1px solid #A7F3D0`, borderRadius:9, padding:'8px 12px', fontSize:'0.7rem', color:'#065F46', marginBottom:14 },
  chipRow:   { display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 },
  row2:      { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  row3:      { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 },
  loginLink: { textAlign:'center', fontSize:'0.74rem', color:'#6B7280', marginTop:16 },
  link:      { color:G, fontWeight:600, textDecoration:'none' },
};
