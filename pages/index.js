// pages/index.js  — REPLACE ENTIRE FILE
// Login page — after login redirects each role to their home screen

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { useRole, ROLES } from '../lib/useRole';
import { ROLE_HOME } from '../components/RoleGuard';

export default function IndexPage() {
  const router = useRouter();
  const { role, loading } = useRole();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to role home
  useEffect(() => {
    if (!loading && role && role !== ROLES.UNASSIGNED) {
      router.replace(ROLE_HOME[role] || '/dashboard');
    }
    if (!loading && role === ROLES.UNASSIGNED) {
      router.replace('/org/setup');
    }
  }, [role, loading, router]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError(err.message); setSubmitting(false); }
    // role change triggers useEffect above → redirect
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  }

  if (loading || (role && role !== ROLES.UNASSIGNED)) {
    return (
      <div style={styles.center}>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>🌿</div>
          <div>
            <div style={styles.logoName}>VitaLog</div>
            <div style={styles.logoTag}>Health Platform</div>
          </div>
        </div>

        <h1 style={styles.h1}>Welcome back</h1>
        <p style={styles.sub}>Sign in to your account</p>

        {error && <div style={styles.err}>{error}</div>}

        <form onSubmit={handleLogin}>
          <label style={styles.lbl}>Email</label>
          <input
            style={styles.inp}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          <label style={styles.lbl}>Password</label>
          <input
            style={styles.inp}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          <button style={{ ...styles.btn, opacity: submitting ? 0.7 : 1 }} type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={styles.divider}><span>or</span></div>

        <button style={styles.googleBtn} onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{marginRight:8}}>
            <path d="M17.64 9.2a10.34 10.34 0 0 0-.164-1.84H9v3.48h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.252 17.64 11.946 17.64 9.2Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p style={styles.signupLink}>
          New to VitaLog?{' '}
          <a href="/signup" style={{ color:'#10B981', fontWeight:600, textDecoration:'none' }}>Create account</a>
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <>
      <div style={{ width:32, height:32, border:'3px solid #10B981', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

const styles = {
  page:      { minHeight:'100vh', background:'#F7F8FA', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' },
  center:    { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' },
  card:      { background:'#fff', borderRadius:20, padding:'36px 32px', width:'100%', maxWidth:400, boxShadow:'0 4px 24px rgba(0,0,0,0.08)', border:'1px solid #E5E7EB' },
  logoRow:   { display:'flex', alignItems:'center', gap:10, marginBottom:28 },
  logoIcon:  { width:38, height:38, background:'linear-gradient(135deg,#10B981,#059669)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 },
  logoName:  { fontFamily:'Sora,sans-serif', fontSize:'1.1rem', fontWeight:800, color:'#111827', letterSpacing:'-0.02em' },
  logoTag:   { fontSize:'0.58rem', color:'#6B7280', letterSpacing:'0.07em', textTransform:'uppercase', marginTop:1 },
  h1:        { fontFamily:'Sora,sans-serif', fontSize:'1.4rem', fontWeight:800, color:'#111827', marginBottom:4 },
  sub:       { fontSize:'0.8rem', color:'#6B7280', marginBottom:24 },
  err:       { background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:16 },
  lbl:       { display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:5 },
  inp:       { width:'100%', padding:'10px 13px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.85rem', fontFamily:'Inter,sans-serif', outline:'none', marginBottom:14, boxSizing:'border-box', color:'#111827', background:'#fff' },
  btn:       { width:'100%', padding:'12px', background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', borderRadius:12, fontWeight:700, fontSize:'0.88rem', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif', marginTop:4 },
  divider:   { textAlign:'center', margin:'20px 0', color:'#9CA3AF', fontSize:'0.75rem', position:'relative' },
  googleBtn: { width:'100%', padding:'11px', border:'1.5px solid #E5E7EB', borderRadius:12, background:'#fff', fontSize:'0.82rem', fontWeight:600, color:'#374151', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' },
  signupLink:{ textAlign:'center', fontSize:'0.76rem', color:'#6B7280', marginTop:20 },
};
