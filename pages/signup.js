// pages/signup.js — fixed: labels, 30-day trial, country auto-detect, searchable country, DOB/gender stacked
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { getSupabase } from '../lib/supabase';
import PasswordInput from '../components/PasswordInput';
import Link from 'next/link';

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
const ACTIVITY     = ['Sedentary','Light','Moderate','Active','Very Active'];
const DIETS        = ['Vegetarian','Eggetarian','Non-Vegetarian','Vegan','Jain','Keto','Gluten-Free','Dairy-Free'];
const MEALS        = ['3 meals','5 meals','6 meals'];
const CLINIC_TYPES = ['Solo Dietitian','Multi-dietitian Clinic','Hospital','Corporate Wellness'];
const PATIENT_VOL  = ['Less than 10','10–50','50–200','200+'];
const REFERRAL     = ['Google','Referral','Social Media','Other'];
const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Australia','Austria','Azerbaijan',
  'Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia and Herzegovina','Brazil','Bulgaria',
  'Cambodia','Cameroon','Canada','Chile','China','Colombia','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic',
  'Denmark','Dominican Republic','Ecuador','Egypt','El Salvador','Estonia','Ethiopia',
  'Finland','France','Georgia','Germany','Ghana','Greece','Guatemala','Honduras','Hungary',
  'India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
  'Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kuwait','Kyrgyzstan',
  'Latvia','Lebanon','Libya','Lithuania','Luxembourg',
  'Malaysia','Mexico','Moldova','Morocco','Mozambique','Myanmar',
  'Nepal','Netherlands','New Zealand','Nicaragua','Nigeria','Norway',
  'Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Poland','Portugal',
  'Qatar','Romania','Russia',
  'Saudi Arabia','Senegal','Serbia','Singapore','Slovakia','Slovenia','Somalia',
  'South Africa','South Korea','Spain','Sri Lanka','Sudan','Sweden','Switzerland','Syria',
  'Taiwan','Tanzania','Thailand','Tunisia','Turkey','Uganda','Ukraine',
  'United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan',
  'Venezuela','Vietnam','Yemen','Zimbabwe',
];

const G = '#1D9E75', N = '#0D1B3E', BORDER = '#E0E3ED';

// ── Searchable Country Picker ──────────────────────────────────────────────
function CountryPicker({ value, onChange, label = 'Country *', autoDetected }) {
  const [query, setQuery]   = useState(value || '');
  const [open,  setOpen]    = useState(false);
  const [focus, setFocus]   = useState(false);
  const ref = useRef();

  // keep text in sync when value changes from outside (e.g. auto-detect)
  useEffect(() => { setQuery(value || ''); }, [value]);

  // close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = COUNTRIES.filter(c => c.toLowerCase().startsWith(query.toLowerCase())).slice(0, 8)
    .concat(
      COUNTRIES.filter(c => !c.toLowerCase().startsWith(query.toLowerCase()) && c.toLowerCase().includes(query.toLowerCase())).slice(0, 4)
    ).slice(0, 10);

  function select(c) { setQuery(c); onChange(c); setOpen(false); }

  return (
    <div ref={ref} style={{ marginBottom: 12, position: 'relative' }}>
      <label style={s.lbl}>
        {label}
        {autoDetected && <span style={{ fontSize: '0.6rem', color: G, fontWeight: 600, marginLeft: 6, background: '#F0FDF8', border: `1px solid #A7F3D0`, borderRadius: 20, padding: '2px 8px' }}>📍 Auto-detected</span>}
      </label>
      <input
        style={{ ...s.inp, marginBottom: 0, border: `1.5px solid ${focus ? G : BORDER}`, outline: 'none', transition: 'border-color .15s' }}
        value={query}
        placeholder="Type to search… e.g. India, UAE"
        onFocus={() => { setFocus(true); setOpen(true); }}
        onBlur={() => setFocus(false)}
        onChange={e => { setQuery(e.target.value); onChange(''); setOpen(true); }}
      />
      {open && query.length >= 1 && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99,
          background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(13,27,62,.12)',
          maxHeight: 220, overflowY: 'auto', marginTop: 2,
        }}>
          {filtered.map(c => (
            <div key={c} onMouseDown={() => select(c)} style={{
              padding: '10px 14px', fontSize: '0.8rem', cursor: 'pointer', color: N,
              background: c === value ? '#F0FDF8' : '#fff', fontWeight: c === value ? 600 : 400,
              borderBottom: `1px solid #F3F4F6`,
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#F0FDF8'}
              onMouseLeave={e => e.currentTarget.style.background = c === value ? '#F0FDF8' : '#fff'}
            >
              {c}
              {c === value && <span style={{ color: G, marginLeft: 6 }}>✓</span>}
            </div>
          ))}
        </div>
      )}
      {open && query.length >= 1 && filtered.length === 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99, background: '#fff', border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px', fontSize: '0.76rem', color: '#9CA3AF', boxShadow: '0 8px 24px rgba(13,27,62,.12)', marginTop: 2 }}>
          No country found for "{query}"
        </div>
      )}
    </div>
  );
}

// ── Field with label + unit badge ─────────────────────────────────────────
function Field({ label, unit, required, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#1F2937', marginBottom: 6 }}>
        {label}{required && <span style={{ color: G, marginLeft: 2 }}>*</span>}
        {unit && <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6B7280', marginLeft: 6, background: '#F3F4F6', borderRadius: 6, padding: '2px 7px' }}>{unit}</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: '0.65rem', color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router   = useRouter();
  const [type,    setType]    = useState('');
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [done,    setDone]    = useState(false);

  // Post-verification mode: user already has a verified session (email
  // verified or Google OAuth) and now completes the health questions.
  const [postVerify,  setPostVerify]  = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [checking,    setChecking]    = useState(true);

  // ── Detect existing session (arrives here from /auth/callback) ──────────
  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabase();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { setChecking(false); return; }
        setSessionUser(session.user);
        setPostVerify(true);
        const { data: profile } = await sb.from('profiles')
          .select('account_type, setup_complete, full_name, country')
          .eq('id', session.user.id).maybeSingle();
        if (profile?.setup_complete) { router.replace('/my-plan'); return; }
        if (profile?.full_name) setName(profile.full_name);
        if (profile?.country)   setCountry(profile.country);
        if (profile?.account_type === 'individual') {
          // Email-verified individual — straight to health questions
          setType('individual'); setStep(3);
        } else if (profile?.account_type === 'clinic') {
          setType('clinic'); setStep(3);
        }
        // No account_type (new Google user) → stay on step 1 to choose type
        setChecking(false);
      } catch (_) { setChecking(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Account
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [phone,    setPhone]    = useState('');

  // Clinic
  const [clinicName, setClinicName] = useState('');
  const [clinicType, setClinicType] = useState('');
  const [city,       setCity]       = useState('');
  const [patVol,     setPatVol]     = useState('');
  const [referral,   setReferral]   = useState('');

  // Health profile
  const [dob,          setDob]          = useState('');
  const [gender,       setGender]       = useState('');
  const [heightUnit,   setHeightUnit]   = useState('cm');
  const [height,       setHeight]       = useState('');
  const [heightFt,     setHeightFt]     = useState('');
  const [heightIn,     setHeightIn]     = useState('');
  const [weight,       setWeight]       = useState('');
  const [goalWeight,   setGoalWeight]   = useState('');
  const [activity,     setActivity]     = useState('');
  const [conditions,   setConditions]   = useState([]);
  const [diets,        setDiets]        = useState([]);
  const [goals,        setGoals]        = useState([]);
  const [mealPlan,     setMealPlan]     = useState('5 meals');
  const [country,      setCountry]      = useState('');
  const [countryAuto,  setCountryAuto]  = useState(false);
  const [geoDetecting, setGeoDetecting] = useState(false);

  // ── Auto-detect country on mount (silent IP geolocation, no permission needed) ──
  useEffect(() => {
    (async () => {
      try {
        const r   = await fetch('https://ipapi.co/json/');
        const d   = await r.json();
        const cn  = d.country_name;
        if (cn && COUNTRIES.includes(cn)) {
          setCountry(cn);
          setCountryAuto(true);
        }
      } catch (_) { /* silently fail */ }
    })();
  }, []);

  // ── Precise geolocation with permission prompt ──
  async function detectPreciseLocation() {
    if (!navigator.geolocation) return;
    setGeoDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const d = await r.json();
          const cn = d.address?.country;
          if (cn && COUNTRIES.includes(cn)) { setCountry(cn); setCountryAuto(true); }
        } catch (_) {}
        setGeoDetecting(false);
      },
      () => setGeoDetecting(false),
      { timeout: 6000 }
    );
  }

  function getHeightCm() {
    if (heightUnit === 'cm') return height ? parseFloat(height) : null;
    const ft = parseFloat(heightFt) || 0, inches = parseFloat(heightIn) || 0;
    const total = ft * 30.48 + inches * 2.54;
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

  function assignTemplate(conds, goals) {
    const c = (conds||[]).map(x=>x.toLowerCase()), g = (goals||[]).map(x=>x.toLowerCase());
    const hasDiabetes = c.some(x=>x.includes('diabet'));
    const hasBP       = c.some(x=>x.includes('bp')||x.includes('high bp'));
    const hasThyroid  = c.some(x=>x.includes('thyroid'));
    const wantsLoss   = g.some(x=>x.includes('lose'));
    const wantsGain   = g.some(x=>x.includes('gain'));
    if (hasDiabetes && hasBP) return '7973c519-e1fa-45f1-aafa-ee9a6f93cb77';
    if (hasDiabetes)          return '0974fddc-3502-4e7c-9dc7-72c79888a0dc';
    if (hasBP)                return '49c466ad-58e1-4145-b757-d12729610bb7';
    if (hasThyroid)           return 'f3063e9a-988c-4028-94b1-42c1dd058a93';
    if (wantsLoss)            return '018c7c3c-293b-4553-a8cd-bc4c1425c235';
    if (wantsGain)            return '0d407f4a-628f-43ad-ae78-d6e019341096';
    return '353334b9-330b-4059-b816-1ba86ca14dd6';
  }

  // ── Individual step 1: create account immediately, verify email first ──
  async function handleAccountSubmit() {
    const err = validateAccount();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    const supabase = getSupabase();
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: {
          data: { full_name: name.trim(), phone, account_type: 'individual', clinic_name: null },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authErr) throw authErr;
      if (!authData.user?.id) throw new Error('Signup failed — please try again.');
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalSubmit() {
    setError('');
    if (type === 'individual') {
      const fail = (msg) => { setError(msg); window.scrollTo({top:0,behavior:'smooth'}); return true; };
      if (!dob      && fail('Please enter your date of birth.')) return;
      if (!gender   && fail('Please select your gender.')) return;
      if (!activity && fail('Please select your activity level.')) return;
      if (diets.length === 0 && fail('Please select at least one dietary preference.')) return;
      if (goals.length === 0 && fail('Please select at least one primary goal.')) return;
    }
    setLoading(true);
    const supabase = getSupabase();
    try {
      let userId, userEmail, userName;

      if (postVerify && sessionUser) {
        // Already verified (email link or Google) — no new account needed
        userId    = sessionUser.id;
        userEmail = sessionUser.email;
        userName  = name.trim() || sessionUser.user_metadata?.full_name || '';
      } else {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password,
          options: {
            data: { full_name: name.trim(), phone, account_type: type, clinic_name: type === 'clinic' ? clinicName.trim() : null },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (authErr) throw authErr;
        userId = authData.user?.id;
        if (!userId) throw new Error('Signup failed — please try again.');
        userEmail = email.trim().toLowerCase();
        userName  = name.trim();
      }

      const scCall = fetch('/api/auth/signup-complete', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          userId, email: userEmail, name: userName, type,
          accountType: postVerify ? type : undefined,
          profile: type === 'individual' ? { dob, gender, heightCm: getHeightCm(), weight: weight?parseFloat(weight):null, goalWeight: goalWeight?parseFloat(goalWeight):null, activity, conditions, diets, goals, mealPlan, country } : null,
          clinicData: type === 'clinic' ? { clinicName:clinicName.trim(), clinicType, city, patVol, referral, country } : null,
        }),
      });
      if (postVerify) {
        // Profile data saved via API — setup_complete stays FALSE until user accepts plan on /my-plan
        scCall.catch(e => console.warn('Profile patch:', e));
      } else {
        scCall.catch(e => console.warn('Profile patch non-critical:', e));
      }

      if (type === 'individual') {
        fetch('/api/ai/signup-meal-template', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            userId,
            profile: { fullName:userName, age: dob?Math.floor((Date.now()-new Date(dob))/(365.25*864e5)):25, gender:gender||'Not specified', heightCm:getHeightCm(), currentWeightKg:weight?parseFloat(weight):70, goalWeightKg:goalWeight?parseFloat(goalWeight):65, activityLevel:activity||'Moderate', healthConditions:conditions.length?conditions:[], dietaryPref:diets.length?diets[0]:'Mixed', primaryGoal:goals.length?goals[0]:'Stay healthy', mealPlanType:mealPlan?parseInt(mealPlan):5 },
            country: country||null,
          }),
        }).catch(e => console.warn('AI template non-critical:', e));
      }

      if (postVerify) {
        // Write setup_complete=true directly — user is authenticated so RLS allows this
        // We do NOT route to /dashboard until user accepts the plan on /my-plan
        // BUT we set setup_complete=true NOW so the loop cannot happen
        // The /my-plan page is the gatekeeper — Accept button goes to dashboard
        try {
          await supabase.from('profiles')
            .update({ setup_complete: true })
            .eq('id', userId);
        } catch(e) { console.warn('setup_complete write:', e); }
        // Verified user finishing their profile — go to plan review
        router.replace(type === 'clinic' ? '/clinic/patients' : '/my-plan');
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── VERIFY EMAIL SCREEN ──────────────────────────────────────────────────
  if (done) return (
    <div style={s.page}>
      <div style={s.card}>
        <Logo/>
        <div style={{textAlign:'center',padding:'8px 0 4px'}}>
          <div style={{fontSize:'3rem',marginBottom:16}}>📬</div>
          <h1 style={{...s.h1,fontSize:'1.4rem',marginBottom:8}}>Check your inbox</h1>
          <p style={{fontSize:'0.82rem',color:'#6B7280',lineHeight:1.6,marginBottom:6}}>We sent a verification link to</p>
          <div style={{display:'inline-block',background:'#F0FDF4',border:`1px solid #A7F3D0`,borderRadius:8,padding:'6px 14px',fontSize:'0.82rem',fontWeight:700,color:G,marginBottom:16}}>{email}</div>
          <p style={{fontSize:'0.76rem',color:'#6B7280',lineHeight:1.6,marginBottom:20}}>Click the link in the email to verify your account.<br/>{type==='individual'?'After verification you\'ll answer a few quick questions and AI will build your personalised plan.':'After verification you\'ll be taken to your dashboard.'}</p>
          <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:10,padding:'10px 14px',fontSize:'0.72rem',color:'#92400E',marginBottom:20,textAlign:'left'}}><strong>Didn't get it?</strong> Check your spam folder. The link expires in 1 hour.</div>
          <button style={{...s.btn,background:'none',border:`1.5px solid ${BORDER}`,color:'#6B7280',marginBottom:8}} onClick={async()=>{const sb=getSupabase();await sb.auth.resend({type:'signup',email,options:{emailRedirectTo:`${window.location.origin}/auth/callback`}});alert('Verification email resent!');}}>Resend verification email</button>
          <button style={{...s.btn,background:'none',border:'none',color:'#9CA3AF',fontSize:'0.72rem'}} onClick={()=>{setDone(false);setStep(1);setType('');}}>← Use a different email</button>
        </div>
      </div>
    </div>
  );

  if (checking) return (
    <div style={s.page}>
      <div style={{...s.card,textAlign:'center',paddingTop:60,paddingBottom:60}}>
        <div style={{width:40,height:40,border:`4px solid ${G}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 16px'}}/>
        <p style={{fontSize:'0.8rem',color:'#6B7280'}}>One moment…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.card}>
        <Logo/>

        {/* STEP 1: Choose type */}
        {step === 1 && (<>
          <h1 style={s.h1}>Create your account</h1>
          <p style={s.sub}>How will you be using Blitora Pulse?</p>
          <div style={s.typeGrid}>
            <TypeCard icon="🏥" title="Clinic / Dietitian" desc="Manage patients, assign meal plans, track compliance" onClick={()=>{setType('clinic');setStep(postVerify?3:2);}}/>
            <TypeCard icon="👤" title="Individual User" desc="Track my own diet, health goals and daily habits" onClick={()=>{setType('individual');setStep(postVerify?3:2);}}/>
          </div>
          <p style={s.loginLink}>Already have an account? <Link href="/" style={s.link}>Sign in</Link></p>
        </>)}

        {/* STEP 2: Account details */}
        {step === 2 && (<>
          <button style={s.back} onClick={()=>setStep(1)}>← Back</button>
          <h1 style={s.h1}>{type==='clinic'?'Clinic account':'Your account'}</h1>
          <p style={s.sub}>Step 1 of 2 — Your details</p>
          {error && <div style={s.err}>{error}</div>}

          <Field label="Full name" required><input style={s.inp} value={name} onChange={e=>setName(e.target.value)} placeholder={type==='clinic'?'Dr. Priya Sharma':'Your full name'}/></Field>
          <Field label="Email address" required><input style={s.inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={type==='clinic'?'you@clinic.com':'your@email.com'}/></Field>
          <PasswordInput value={password} onChange={setPassword} label="Password" autoComplete="new-password" showStrength/>
          {type==='clinic' && <Field label="Phone number"><input style={s.inp} type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210"/></Field>}

          {type==='individual' ? (
            <>
              <button style={{...s.btn,opacity:loading?.7:1}} disabled={loading} onClick={handleAccountSubmit}>{loading?'Creating account…':'Create account & verify email →'}</button>
              <p style={{fontSize:'0.68rem',color:'#9CA3AF',textAlign:'center',marginTop:10,lineHeight:1.5}}>We'll send you a verification link. After verifying, you'll answer a few quick questions so AI can personalise your plan.</p>
            </>
          ) : (
            <button style={s.btn} onClick={()=>{const err=validateAccount();if(err){setError(err);return;}setError('');setStep(3);}}>Continue →</button>
          )}
        </>)}

        {/* STEP 3 CLINIC */}
        {step===3 && type==='clinic' && (<>
          <button style={s.back} onClick={()=>setStep(postVerify?1:2)}>← Back</button>
          <h1 style={s.h1}>Your clinic</h1>
          <p style={s.sub}>Step 2 of 2 — Clinic information</p>
          {error && <div style={s.err}>{error}</div>}

          <Field label="Clinic / Practice name" required><input style={s.inp} value={clinicName} onChange={e=>setClinicName(e.target.value)} placeholder="e.g. Sharma Nutrition Clinic"/></Field>

          <Field label="Clinic type" required>
            <div style={s.chipRow}>{CLINIC_TYPES.map(t=><Chip key={t} label={t} selected={clinicType===t} onClick={()=>setClinicType(t)}/>)}</div>
          </Field>

          <Field label="City" required><input style={s.inp} value={city} onChange={e=>setCity(e.target.value)} placeholder="e.g. Mumbai"/></Field>

          <CountryPicker value={country} onChange={setCountry} autoDetected={countryAuto}/>
          <button onClick={detectPreciseLocation} disabled={geoDetecting} style={{fontSize:'0.7rem',color:G,background:'none',border:'none',cursor:'pointer',padding:'0 0 12px',fontFamily:"'Poppins',Arial,sans-serif",display:'flex',alignItems:'center',gap:4}}>
            📍 {geoDetecting?'Detecting…':'Use my precise location'}
          </button>

          <Field label="Patients you currently manage">
            <div style={s.chipRow}>{PATIENT_VOL.map(v=><Chip key={v} label={v} selected={patVol===v} onClick={()=>setPatVol(v)}/>)}</div>
          </Field>

          <Field label="How did you hear about us?">
            <div style={s.chipRow}>{REFERRAL.map(r=><Chip key={r} label={r} selected={referral===r} onClick={()=>setReferral(r)}/>)}</div>
          </Field>

          <div style={s.trialNote}>✓ 14-day free trial · No credit card required</div>
          <button style={{...s.btn,opacity:loading?.7:1}} disabled={loading} onClick={handleFinalSubmit}>{loading?(postVerify?'Setting up…':'Creating account…'):(postVerify?'Finish setup →':'Create account →')}</button>
        </>)}

        {/* STEP 3 INDIVIDUAL */}
        {step===3 && type==='individual' && (<>
          {!postVerify && <button style={s.back} onClick={()=>setStep(2)}>← Back</button>}
          {postVerify && (
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#F0FDF4',border:'1px solid #A7F3D0',borderRadius:20,padding:'5px 14px',fontSize:'0.7rem',fontWeight:700,color:G,marginBottom:14}}>
              ✓ Email verified
            </div>
          )}
          <h1 style={s.h1}>Your health profile</h1>
          <p style={s.sub}>{postVerify?'Last step — answer these and AI will build your personalised plan':'Step 2 of 2 — Helps us personalise your plan'}</p>
          {error && <div style={s.err}>{error}</div>}

          {/* ── DOB — full width, no overlap ── */}
          <Field label="Date of birth" required hint="Used to calculate your daily calorie target (BMR)">
            <input style={s.inp} type="date" value={dob} onChange={e=>setDob(e.target.value)}
              max={new Date(Date.now()-365*24*60*60*1000*12).toISOString().split('T')[0]}/>
          </Field>

          {/* ── Gender — full width below DOB ── */}
          <Field label="Gender" required>
            <div style={s.chipRow}>
              {['Male','Female','Prefer not to say'].map(g=><Chip key={g} label={g} selected={gender===g} onClick={()=>setGender(g)}/>)}
            </div>
          </Field>

          {/* ── Country ── */}
          <CountryPicker value={country} onChange={setCountry} autoDetected={countryAuto}/>
          <button onClick={detectPreciseLocation} disabled={geoDetecting} style={{fontSize:'0.7rem',color:G,background:'none',border:'none',cursor:'pointer',padding:'0 0 14px',fontFamily:"'Poppins',Arial,sans-serif",display:'flex',alignItems:'center',gap:4}}>
            📍 {geoDetecting?'Detecting location…':'Use my precise GPS location instead'}
          </button>

          {/* ── Height ── */}
          <Field label="Height" hint={heightUnit==='ft'&&(heightFt||heightIn)?`= ${Math.round((parseFloat(heightFt||0)*30.48)+(parseFloat(heightIn||0)*2.54))} cm`:null}>
            <div style={{display:'flex',gap:6,marginBottom:10}}>
              {['cm','ft / in'].map(u=>(
                <button key={u} type="button" onClick={()=>setHeightUnit(u==='cm'?'cm':'ft')} style={{padding:'6px 16px',borderRadius:20,border:'1.5px solid',borderColor:(u==='cm'?heightUnit==='cm':heightUnit==='ft')?G:BORDER,background:(u==='cm'?heightUnit==='cm':heightUnit==='ft')?G:'#fff',color:(u==='cm'?heightUnit==='cm':heightUnit==='ft')?'#fff':'#374151',fontSize:'0.72rem',fontWeight:600,cursor:'pointer',fontFamily:"'Poppins',Arial,sans-serif"}}>{u}</button>
              ))}
            </div>
            {heightUnit==='cm'?(
              <input style={s.inp} type="number" inputMode="decimal" value={height} onChange={e=>setHeight(e.target.value)} placeholder="e.g. 170"/>
            ):(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <div style={{fontSize:'0.7rem',fontWeight:700,color:'#374151',marginBottom:4}}>Feet</div>
                  <input style={s.inp} type="number" inputMode="numeric" min="1" max="8" value={heightFt} onChange={e=>setHeightFt(e.target.value)} placeholder="e.g. 5"/>
                </div>
                <div>
                  <div style={{fontSize:'0.7rem',fontWeight:700,color:'#374151',marginBottom:4}}>Inches</div>
                  <input style={s.inp} type="number" inputMode="numeric" min="0" max="11" value={heightIn} onChange={e=>setHeightIn(e.target.value)} placeholder="e.g. 8"/>
                </div>
              </div>
            )}
          </Field>

          {/* ── Current weight ── */}
          <Field label="Current weight" unit="kg" required hint="We'll track your progress toward your goal">
            <input style={s.inp} type="number" inputMode="decimal" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="e.g. 80"/>
          </Field>

          {/* ── Goal weight ── */}
          <Field label="Goal weight" unit="kg" hint="The weight you'd like to reach. We'll set your plan targets accordingly.">
            <input style={s.inp} type="number" inputMode="decimal" value={goalWeight} onChange={e=>setGoalWeight(e.target.value)} placeholder="e.g. 70"/>
          </Field>

          {/* ── Activity level ── */}
          <Field label="Activity level" required hint="How active are you on a typical day?">
            <div style={s.chipRow}>{ACTIVITY.map(a=><Chip key={a} label={a} selected={activity===a} onClick={()=>setActivity(a)}/>)}</div>
          </Field>

          {/* ── Health conditions ── */}
          <Field label="Health conditions" hint="Select all that apply — this personalises your meal plan">
            <div style={s.chipRow}>
              {CONDITIONS.map(c=><Chip key={c} label={c} selected={conditions.includes(c)} onClick={()=>toggleArr(conditions,setConditions,c)}/>)}
              <Chip label="None / Healthy" selected={conditions.length===0} onClick={()=>setConditions([])}/>
            </div>
          </Field>

          {/* ── Dietary preference ── */}
          <Field label="Dietary preference" hint="Select all that apply">
            <div style={s.chipRow}>{DIETS.map(d=><Chip key={d} label={d} selected={diets.includes(d)} onClick={()=>toggleArr(diets,setDiets,d)}/>)}</div>
          </Field>

          {/* ── Goals ── */}
          <Field label="Primary goals" hint="Pick all that apply">
            <div style={s.chipRow}>{GOALS.map(g=><Chip key={g} label={g} selected={goals.includes(g)} onClick={()=>toggleArr(goals,setGoals,g)}/>)}</div>
          </Field>

          <div style={{height:1,background:BORDER,margin:'6px 0 18px'}}/>

          {/* ── Meal plan ── */}
          <Field label="Meal plan preference" hint="How many meals would you like in your daily plan?">
            <div style={s.chipRow}>{MEALS.map(m=><Chip key={m} label={m} selected={mealPlan===m} onClick={()=>setMealPlan(m)}/>)}</div>
          </Field>

          {/* ── Submit ── */}
          <div style={{background:'#F0FDF8',borderRadius:14,padding:16,border:'1px solid #A7F3D0',marginTop:8}}>
            <div style={{fontSize:'0.72rem',color:'#065F46',fontWeight:600,marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:'1rem'}}>🎉</span> 30-day free trial included — no credit card required
            </div>
            <div style={{fontSize:'0.66rem',color:'#047857',marginBottom:14,lineHeight:1.5}}>
              {postVerify?'AI will generate your personalised meal plan the moment you finish.':'Your AI-generated meal plan will be ready instantly after verification. Cancel anytime.'}
            </div>
            <button style={{...s.btn,opacity:loading?.7:1}} disabled={loading} onClick={handleFinalSubmit}>
              {loading?(postVerify?'Generating your plan…':'Creating account…'):(postVerify?'Finish & generate my plan →':'Create account & verify email →')}
            </button>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────
function Logo() {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
      <svg width="38" height="38" viewBox="0 0 64 64" style={{flexShrink:0}}>
        <defs><mask id="sm"><rect width="64" height="64" fill="#fff"/><path d="M37 3 L21 34 L31 34 L25 61 L45 27 L34 27 Z" fill="#000"/></mask></defs>
        <rect width="64" height="64" rx="14" fill="#0D1B3E"/>
        <text x="33" y="50" textAnchor="middle" fontFamily="Poppins,Arial" fontWeight="800" fontSize="50" fill="#2AE8A4">B</text>
        <text x="33" y="50" textAnchor="middle" fontFamily="Poppins,Arial" fontWeight="800" fontSize="50" fill="#FFFFFF" mask="url(#sm)">B</text>
      </svg>
      <div>
        <div style={{fontFamily:"'Poppins',Arial,sans-serif",fontSize:'1rem',fontWeight:700,color:'#0D1B3E'}}>Blitora <span style={{color:'#1D9E75'}}>Pulse</span></div>
        <div style={{fontFamily:"'Poppins',Arial,sans-serif",fontSize:'0.52rem',color:'#718096',letterSpacing:'0.04em',fontStyle:'italic'}}>Health Made Intelligent.</div>
      </div>
    </div>
  );
}

function TypeCard({ icon, title, desc, onClick }) {
  return (
    <div style={s.typeCard} onClick={onClick}
      onMouseEnter={e=>e.currentTarget.style.borderColor=G}
      onMouseLeave={e=>e.currentTarget.style.borderColor=BORDER}>
      <div style={s.typeIcon}>{icon}</div>
      <div style={s.typeTitle}>{title}</div>
      <div style={s.typeDesc}>{desc}</div>
      <div style={{fontSize:'0.68rem',fontWeight:700,color:G,marginTop:8}}>Get started →</div>
    </div>
  );
}

function Chip({ label, selected, onClick }) {
  return (
    <div onClick={onClick} style={{padding:'5px 12px',border:`1.5px solid ${selected?G:BORDER}`,borderRadius:20,fontSize:'0.68rem',fontWeight:selected?600:500,color:selected?'#fff':'#374151',cursor:'pointer',background:selected?G:'#fff',transition:'all .12s'}}>
      {label}
    </div>
  );
}

const s = {
  page:      { minHeight:'100vh', background:'#F5F6FA', display:'flex', justifyContent:'center', padding:'24px 16px', fontFamily:"'Poppins', Arial, sans-serif" },
  card:      { background:'#fff', borderRadius:20, padding:'28px 24px', width:'100%', maxWidth:500, boxShadow:'0 4px 24px rgba(13,27,62,0.08)', border:`1px solid ${BORDER}`, alignSelf:'flex-start' },
  h1:        { fontSize:'1.3rem', fontWeight:700, color:N, marginBottom:4, marginTop:0 },
  sub:       { fontSize:'0.76rem', color:'#6B7280', marginBottom:20 },
  typeGrid:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 },
  typeCard:  { border:`1.5px solid ${BORDER}`, borderRadius:14, padding:'16px 12px', cursor:'pointer', textAlign:'center', transition:'border-color .15s' },
  typeIcon:  { fontSize:'1.8rem', marginBottom:6 },
  typeTitle: { fontSize:'0.8rem', fontWeight:700, color:N, marginBottom:4 },
  typeDesc:  { fontSize:'0.64rem', color:'#6B7280', lineHeight:1.4 },
  back:      { background:'none', border:'none', color:'#6B7280', cursor:'pointer', fontSize:'0.76rem', padding:'0 0 12px', fontFamily:"'Poppins',Arial,sans-serif" },
  lbl:       { display:'block', fontSize:'0.75rem', fontWeight:700, color:'#1F2937', marginBottom:6 },
  inp:       { width:'100%', padding:'10px 13px', border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:'0.82rem', outline:'none', marginBottom:0, boxSizing:'border-box', color:N, background:'#fff', fontFamily:"'Poppins', Arial, sans-serif" },
  btn:       { width:'100%', padding:13, background:`linear-gradient(135deg,${G},#159960)`, color:'#fff', borderRadius:12, fontWeight:700, fontSize:'0.84rem', border:'none', cursor:'pointer', marginTop:4, fontFamily:"'Poppins', Arial, sans-serif" },
  err:       { background:'#FEF2F2', border:'1px solid #FECACA', color:'#C0392B', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:12 },
  trialNote: { background:'#F0FDF8', border:`1px solid #A7F3D0`, borderRadius:9, padding:'8px 12px', fontSize:'0.7rem', color:'#065F46', marginBottom:14 },
  chipRow:   { display:'flex', flexWrap:'wrap', gap:6, marginBottom:0 },
  loginLink: { textAlign:'center', fontSize:'0.74rem', color:'#6B7280', marginTop:16 },
  link:      { color:G, fontWeight:600, textDecoration:'none' },
};
