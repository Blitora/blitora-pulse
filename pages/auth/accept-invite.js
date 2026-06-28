// pages/auth/accept-invite.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSupabase } from '../../lib/supabase';
import PasswordInput from '../../components/PasswordInput';

export default function AcceptInvitePage() {
  const router  = useRouter();
  const { token } = router.query;
  const [inv,      setInv]      = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [mode,     setMode]     = useState('signup');
  const [joining,  setJoining]  = useState(false);

  useEffect(() => {
    if (!token) return;
    validateToken();
  }, [token]);

  async function validateToken() {
    setLoading(true);
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('invitations')
      .select('*, organisations(name)')
      .eq('token', token)
      .eq('accepted', false)
      .single();

    if (error || !data) {
      setError('This invitation link is invalid or has already been used.');
      setLoading(false);
      return;
    }
    if (new Date(data.expires_at) < new Date()) {
      setError('This invitation link has expired. Ask your clinic to resend it.');
      setLoading(false);
      return;
    }
    setInv(data);
    setEmail(data.email);
    setLoading(false);
  }

  async function handleAccept(e) {
    e.preventDefault();
    setError('');
    setJoining(true);
    const supabase = getSupabase();

    try {
      let userId;

      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your full name.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        if (!/[A-Z]/.test(password)) throw new Error('Password needs an uppercase letter.');
        if (!/[a-z]/.test(password)) throw new Error('Password needs a lowercase letter.');
        if (!/[0-9]/.test(password)) throw new Error('Password needs a number.');

        const { data, error: signupErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (signupErr) throw signupErr;
        userId = data.user?.id;
        if (!userId) throw new Error('Signup failed — please try again.');

        // Directly upsert profile (belt-and-suspenders on top of the trigger)
        await supabase.from('profiles').upsert({
          id: userId,
          email,
          full_name: name.trim(),
          role: inv.role,
          status: 'active',
          setup_complete: false,
        }, { onConflict: 'id' });

      } else {
        const { data, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
        if (loginErr) throw loginErr;
        userId = data.user?.id;
      }

      // Add to org
      const { error: memErr } = await supabase
        .from('organisation_members')
        .upsert({
          org_id: inv.org_id,
          user_id: userId,
          role: inv.role,
          invited_by: inv.invited_by,
          joined_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: 'org_id,user_id' });
      if (memErr && !memErr.message.includes('duplicate')) throw memErr;

      // Mark invite accepted
      await supabase.from('invitations').update({ accepted: true }).eq('token', token);

      // Sign in (needed if email confirmation is off — signUp may not auto-sign-in)
      if (mode === 'signup') {
        await supabase.auth.signInWithPassword({ email, password });
      }

      router.replace(inv.role === 'patient' ? '/setup' : '/clinic/patients');
    } catch (err) {
      setError(err.message);
      setJoining(false);
    }
  }

  if (loading) return <FullPageLoader />;

  if (error && !inv) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.logoRow}><div style={s.logoIcon}>🌿</div><div style={s.logoName}>VitaLog</div></div>
          <div style={{ fontSize:'2rem', marginBottom:12, textAlign:'center' }}>❌</div>
          <h1 style={s.h1}>Invalid Invitation</h1>
          <p style={s.sub}>{error}</p>
          <button style={s.btn} onClick={() => router.replace('/')}>Go to Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <div style={s.logoIcon}>🌿</div>
          <div style={s.logoName}>VitaLog</div>
        </div>

        <div style={s.invBadge}>
          You&apos;ve been invited to join <strong>{inv?.organisations?.name}</strong> as a <strong>{inv?.role}</strong>
        </div>

        <div style={s.modeTabs}>
          <button style={{ ...s.modeTab, ...(mode === 'signup' ? s.modeOn : {}) }} onClick={() => { setMode('signup'); setError(''); }}>
            New user — Sign up
          </button>
          <button style={{ ...s.modeTab, ...(mode === 'login' ? s.modeOn : {}) }} onClick={() => { setMode('login'); setError(''); }}>
            Already have account — Log in
          </button>
        </div>

        {error && <div style={s.err}>{error}</div>}

        <form onSubmit={handleAccept}>
          {mode === 'signup' && (
            <>
              <label style={s.lbl}>Your name *</label>
              <input style={s.inp} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required autoFocus />
            </>
          )}

          <label style={s.lbl}>Email</label>
          <input style={{ ...s.inp, background:'#F9FAFB', color:'#6B7280' }} type="email" value={email} readOnly />

          <PasswordInput
            value={password}
            onChange={e => setPassword(e.target.value)}
            label="Password *"
            placeholder={mode === 'signup' ? 'Min 8 chars, uppercase, number' : 'Your password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            showStrength={mode === 'signup'}
          />

          <button style={{ ...s.btn, opacity: joining ? 0.7 : 1 }} type="submit" disabled={joining}>
            {joining ? 'Joining…' : `Join as ${inv?.role}`}
          </button>
        </form>
      </div>
    </div>
  );
}

function FullPageLoader() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F7F8FA' }}>
      <div style={{ width:32, height:32, border:'3px solid #10B981', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const s = {
  page:     { minHeight:'100vh', background:'#F7F8FA', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Inter,system-ui,sans-serif' },
  card:     { background:'#fff', borderRadius:20, padding:'32px 28px', width:'100%', maxWidth:420, boxShadow:'0 4px 24px rgba(0,0,0,0.08)', border:'1px solid #E5E7EB' },
  logoRow:  { display:'flex', alignItems:'center', gap:8, marginBottom:20 },
  logoIcon: { width:34, height:34, background:'linear-gradient(135deg,#10B981,#059669)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 },
  logoName: { fontFamily:'Sora,sans-serif', fontSize:'1rem', fontWeight:800, color:'#111827' },
  invBadge: { background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', color:'#065F46', marginBottom:20, lineHeight:1.5 },
  h1:       { fontFamily:'Sora,sans-serif', fontSize:'1.3rem', fontWeight:800, color:'#111827', marginBottom:6 },
  sub:      { fontSize:'0.78rem', color:'#6B7280', marginBottom:20 },
  modeTabs: { display:'flex', gap:4, background:'#F3F4F6', padding:3, borderRadius:10, marginBottom:16 },
  modeTab:  { flex:1, padding:'8px 4px', border:'none', background:'none', borderRadius:8, fontSize:'0.68rem', fontWeight:600, color:'#6B7280', cursor:'pointer', fontFamily:'Inter,sans-serif', transition:'all .15s' },
  modeOn:   { background:'#fff', color:'#111827', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' },
  lbl:      { display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:5 },
  inp:      { width:'100%', padding:'10px 13px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.85rem', fontFamily:'Inter,sans-serif', outline:'none', marginBottom:12, boxSizing:'border-box', color:'#111827', background:'#fff' },
  btn:      { width:'100%', padding:13, background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', borderRadius:12, fontWeight:700, fontSize:'0.86rem', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif', marginTop:4 },
  err:      { background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:14 },
};
