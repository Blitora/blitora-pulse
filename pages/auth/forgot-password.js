// pages/auth/forgot-password.js
import { useState } from 'react';
import { getSupabase } from '../../lib/supabase';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = getSupabase();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoRow}>
          <div style={s.logoIcon}>🌿</div>
          <div style={s.logoName}>VitaLog</div>
        </div>

        {sent ? (
          <>
            <div style={{ fontSize:'2.5rem', textAlign:'center', marginBottom:12 }}>📧</div>
            <h1 style={s.h1}>Check your email</h1>
            <p style={s.sub}>We sent a reset link to <strong>{email}</strong>. It expires in 1 hour.</p>
            <div style={s.noteBox}>
              Didn't receive it? Check your spam folder or{' '}
              <button style={s.retryBtn} onClick={() => setSent(false)}>try again</button>.
            </div>
            <Link href="/" style={s.backLink}>← Back to login</Link>
          </>
        ) : (
          <>
            <h1 style={s.h1}>Forgot password?</h1>
            <p style={s.sub}>Enter your email and we'll send you a reset link.</p>
            {error && <div style={s.err}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <label style={s.lbl}>Email address</label>
              <input style={s.inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
            <Link href="/" style={s.backLink}>← Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page:     { minHeight:'100vh', background:'#F7F8FA', display:'flex', alignItems:'center', justifyContent:'center', padding:24 },
  card:     { background:'#fff', borderRadius:20, padding:'36px 32px', width:'100%', maxWidth:400, boxShadow:'0 4px 24px rgba(0,0,0,0.08)', border:'1px solid #E5E7EB' },
  logoRow:  { display:'flex', alignItems:'center', gap:8, marginBottom:28 },
  logoIcon: { width:34, height:34, background:'linear-gradient(135deg,#10B981,#059669)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 },
  logoName: { fontFamily:'Sora,sans-serif', fontSize:'1rem', fontWeight:800, color:'#111827' },
  h1:       { fontFamily:'Sora,sans-serif', fontSize:'1.3rem', fontWeight:800, color:'#111827', marginBottom:6 },
  sub:      { fontSize:'0.78rem', color:'#6B7280', marginBottom:20, lineHeight:1.5 },
  err:      { background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:14 },
  lbl:      { display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:5 },
  inp:      { width:'100%', padding:'10px 13px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.85rem', fontFamily:'Inter,sans-serif', outline:'none', marginBottom:14, boxSizing:'border-box', color:'#111827', background:'#fff' },
  btn:      { width:'100%', padding:12, background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', borderRadius:12, fontWeight:700, fontSize:'0.86rem', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  noteBox:  { background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:9, padding:'10px 12px', fontSize:'0.7rem', color:'#374151', marginTop:16 },
  retryBtn: { background:'none', border:'none', color:'#10B981', cursor:'pointer', fontWeight:600, fontSize:'0.7rem', padding:0 },
  backLink: { display:'block', textAlign:'center', marginTop:20, fontSize:'0.74rem', color:'#6B7280', textDecoration:'none' },
};
