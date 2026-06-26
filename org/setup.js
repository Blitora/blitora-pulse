// pages/org/setup.js  — NEW FILE
// Shown to: logged-in users with role = 'unassigned' (no org yet)
// Flow: Enter clinic name → creates org → adds user as org_admin → redirect to /clinic/patients

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useRole, ROLES } from '../../lib/useRole';

export default function OrgSetupPage() {
  const router = useRouter();
  const { role, loading } = useRole();
  const [step, setStep]       = useState(1); // 1=choose type, 2=fill details
  const [accountType, setType] = useState(''); // 'clinic' | 'individual'
  const [orgName, setOrgName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!loading && role && role !== ROLES.UNASSIGNED) {
      router.replace(role === ROLES.PATIENT ? '/dashboard' : '/clinic/patients');
    }
  }, [role, loading, router]);

  async function createOrg(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const name = accountType === 'individual'
        ? `${user.user_metadata?.full_name || user.email}'s Account`
        : orgName.trim();

      // 1. Create organisation
      const { data: org, error: orgErr } = await supabase
        .from('organisations')
        .insert({ name, plan: 'trial' })
        .select()
        .single();
      if (orgErr) throw orgErr;

      // 2. Add user as org_admin (or patient for individual)
      const memberRole = accountType === 'individual' ? 'patient' : 'org_admin';
      const { error: memErr } = await supabase
        .from('organisation_members')
        .insert({ org_id: org.id, user_id: user.id, role: memberRole });
      if (memErr) throw memErr;

      // 3. For individual accounts, also create patient_assignment pointing to themselves
      if (accountType === 'individual') {
        await supabase.from('patient_assignments').insert({
          org_id: org.id, patient_id: user.id, dietitian_id: user.id
        });
        router.replace('/dashboard');
      } else {
        router.replace('/clinic/patients');
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <div style={s.logoIcon}>🌿</div>
          <div style={s.logoName}>VitaLog</div>
        </div>

        {step === 1 && (
          <>
            <h1 style={s.h1}>Welcome to VitaLog</h1>
            <p style={s.sub}>How will you be using the platform?</p>
            <div style={s.typeGrid}>
              <TypeCard
                icon="🏥"
                title="Clinic / Dietitian"
                desc="Manage patients, assign meal plans, track compliance"
                onClick={() => { setType('clinic'); setStep(2); }}
              />
              <TypeCard
                icon="👤"
                title="Individual"
                desc="Track my own diet, health goals and daily logs"
                onClick={() => { setType('individual'); setStep(2); }}
              />
            </div>
          </>
        )}

        {step === 2 && accountType === 'clinic' && (
          <>
            <button style={s.back} onClick={() => setStep(1)}>← Back</button>
            <h1 style={s.h1}>Set up your clinic</h1>
            <p style={s.sub}>You'll be the admin. Invite dietitians and patients next.</p>
            {error && <div style={s.err}>{error}</div>}
            <form onSubmit={createOrg}>
              <label style={s.lbl}>Clinic / Practice name</label>
              <input
                style={s.inp}
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="e.g. Dr. Sharma Nutrition Clinic"
                required
              />
              <div style={s.trialNote}>✓ 14-day free trial · No credit card required</div>
              <button style={{ ...s.btn, opacity: submitting ? 0.7 : 1 }} type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Clinic Account →'}
              </button>
            </form>
          </>
        )}

        {step === 2 && accountType === 'individual' && (
          <>
            <button style={s.back} onClick={() => setStep(1)}>← Back</button>
            <h1 style={s.h1}>Set up your account</h1>
            <p style={s.sub}>We'll create your personal health tracking space.</p>
            {error && <div style={s.err}>{error}</div>}
            <form onSubmit={createOrg}>
              <div style={s.trialNote}>✓ Free tier with AI suggestions included</div>
              <button style={{ ...s.btn, opacity: submitting ? 0.7 : 1 }} type="submit" disabled={submitting}>
                {submitting ? 'Setting up…' : 'Start Tracking →'}
              </button>
            </form>
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
      <div style={s.typeArrow}>Get started →</div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F7F8FA' }}>
      <div style={{ width:32, height:32, border:'3px solid #10B981', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const s = {
  page:      { minHeight:'100vh', background:'#F7F8FA', display:'flex', alignItems:'center', justifyContent:'center', padding:24 },
  card:      { background:'#fff', borderRadius:20, padding:'36px 32px', width:'100%', maxWidth:460, boxShadow:'0 4px 24px rgba(0,0,0,0.08)', border:'1px solid #E5E7EB' },
  logoRow:   { display:'flex', alignItems:'center', gap:10, marginBottom:28 },
  logoIcon:  { width:36, height:36, background:'linear-gradient(135deg,#10B981,#059669)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 },
  logoName:  { fontFamily:'Sora,sans-serif', fontSize:'1.05rem', fontWeight:800, color:'#111827' },
  h1:        { fontFamily:'Sora,sans-serif', fontSize:'1.4rem', fontWeight:800, color:'#111827', marginBottom:6 },
  sub:       { fontSize:'0.8rem', color:'#6B7280', marginBottom:24 },
  typeGrid:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  typeCard:  { border:'1.5px solid #E5E7EB', borderRadius:14, padding:'18px 14px', cursor:'pointer', transition:'all 0.15s', textAlign:'center' },
  typeIcon:  { fontSize:'1.8rem', marginBottom:8 },
  typeTitle: { fontFamily:'Sora,sans-serif', fontSize:'0.82rem', fontWeight:700, color:'#111827', marginBottom:5 },
  typeDesc:  { fontSize:'0.68rem', color:'#6B7280', lineHeight:1.5, marginBottom:10 },
  typeArrow: { fontSize:'0.68rem', fontWeight:700, color:'#10B981' },
  back:      { background:'none', border:'none', color:'#6B7280', cursor:'pointer', fontSize:'0.76rem', padding:'0 0 16px', fontFamily:'Inter,sans-serif' },
  lbl:       { display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:5 },
  inp:       { width:'100%', padding:'10px 13px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.85rem', fontFamily:'Inter,sans-serif', outline:'none', marginBottom:12, boxSizing:'border-box', color:'#111827' },
  trialNote: { fontSize:'0.72rem', color:'#065F46', background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:8, padding:'8px 12px', marginBottom:16 },
  btn:       { width:'100%', padding:12, background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', borderRadius:12, fontWeight:700, fontSize:'0.86rem', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  err:       { background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:14 },
};
