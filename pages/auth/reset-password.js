// pages/auth/reset-password.js — NEW FILE
// Supabase sends user here after clicking reset link in email
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import PasswordInput from '../../components/PasswordInput';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');
  const [ready,     setReady]     = useState(false);

  useEffect(() => {
    // Supabase puts the session in the URL hash — we need to exchange it
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
  }, []);

  function validate() {
    if (password.length < 8)              return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(password))         return 'Password must contain an uppercase letter.';
    if (!/[a-z]/.test(password))         return 'Password must contain a lowercase letter.';
    if (!/[0-9]/.test(password))         return 'Password must contain a number.';
    if (password !== confirm)            return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validErr = validate();
    if (validErr) { setError(validErr); return; }
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setLoading(false); return; }
    setDone(true);
    setTimeout(() => router.replace('/'), 2500);
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <div style={s.logoIcon}>🌿</div>
          <div style={s.logoName}>VitaLog</div>
        </div>

        {done ? (
          <>
            <div style={s.successIcon}>✅</div>
            <h1 style={s.h1}>Password updated!</h1>
            <p style={s.sub}>Your password has been changed. Redirecting you to login…</p>
          </>
        ) : !ready ? (
          <>
            <h1 style={s.h1}>Checking reset link…</h1>
            <p style={s.sub}>Please wait while we verify your reset link.</p>
            <Spinner />
          </>
        ) : (
          <>
            <h1 style={s.h1}>Set new password</h1>
            <p style={s.sub}>Choose a strong password for your account.</p>
            {error && <div style={s.err}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <PasswordInput value={password} onChange={setPassword} label="New password" placeholder="Min 8 chars" autoComplete="new-password" showStrength />
              <PasswordInput value={confirm}  onChange={setConfirm}  label="Confirm new password" placeholder="Repeat password" autoComplete="new-password" />
              <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
                {loading ? 'Updating…' : 'Set New Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:20 }}>
      <div style={{ width:28, height:28, border:'3px solid #10B981', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const s = {
  page:       { minHeight:'100vh', background:'#F7F8FA', display:'flex', alignItems:'center', justifyContent:'center', padding:24 },
  card:       { background:'#fff', borderRadius:20, padding:'36px 32px', width:'100%', maxWidth:400, boxShadow:'0 4px 24px rgba(0,0,0,0.08)', border:'1px solid #E5E7EB' },
  logoRow:    { display:'flex', alignItems:'center', gap:8, marginBottom:28 },
  logoIcon:   { width:34, height:34, background:'linear-gradient(135deg,#10B981,#059669)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 },
  logoName:   { fontFamily:'Sora,sans-serif', fontSize:'1rem', fontWeight:800, color:'#111827' },
  successIcon:{ fontSize:'2.5rem', textAlign:'center', marginBottom:12 },
  h1:         { fontFamily:'Sora,sans-serif', fontSize:'1.3rem', fontWeight:800, color:'#111827', marginBottom:6 },
  sub:        { fontSize:'0.78rem', color:'#6B7280', marginBottom:20 },
  err:        { background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:14 },
  btn:        { width:'100%', padding:12, background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', borderRadius:12, fontWeight:700, fontSize:'0.86rem', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif', marginTop:4 },
  lbl:        { display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:5 },
};
