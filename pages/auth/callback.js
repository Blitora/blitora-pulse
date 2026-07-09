// pages/auth/callback.js
// Handles post-email-verification redirect AND Google OAuth callback
// Waits for Supabase to process token, then routes by role/setup state
//
// IMPORTANT: never run supabase queries directly inside the
// onAuthStateChange callback — supabase-js holds an internal auth lock
// during that callback and any query inside it deadlocks forever
// (this was the "Email verified! Loading your dashboard…" stuck screen).
// All routing work is deferred out of the callback via setTimeout.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getSupabase } from '../../lib/supabase';

const G = '#1D9E75', N = '#0D1B3E';

export default function AuthCallback() {
  const router  = useRouter();
  const [status, setStatus] = useState('Verifying your account…');

  useEffect(() => {
    const supabase = getSupabase();
    let redirected  = false;

    async function doRedirect(session) {
      if (redirected) return;
      redirected = true;

      setStatus('Email verified! Setting things up…');

      try {
        // ── Org membership check (clinic users) ────────────────────────
        const { data: member } = await supabase
          .from('organisation_members')
          .select('role, org_id')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .order('joined_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (member?.role === 'org_admin' || member?.role === 'dietitian') {
          router.replace('/clinic/patients');
          return;
        }

        // ── Profile check ───────────────────────────────────────────────
        const { data: profile } = await supabase
          .from('profiles')
          .select('setup_complete, account_type')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.setup_complete) {
          // Setup complete — go to dashboard
          router.replace('/dashboard');
          return;
        }

        // Setup not complete — go to /signup to fill health profile
        router.replace('/signup');
      } catch (err) {
        console.warn('Callback routing error — falling back to /signup:', err);
        router.replace('/signup');
      }
    }

    // ── Strategy 1: listen for auth state change ──────────────────────
    // setTimeout(…, 0) breaks out of the supabase auth lock — do NOT
    // await queries directly inside this callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          setTimeout(() => doRedirect(session), 0);
        } else if (event === 'PASSWORD_RECOVERY') {
          router.replace('/auth/reset-password');
        }
      }
    );

    // ── Strategy 2: poll getSession (fallback) ────────────────────────
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      if (redirected) { clearInterval(poll); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        clearInterval(poll);
        doRedirect(session);
        return;
      }
      if (attempts >= 8) {
        clearInterval(poll);
        if (!redirected) {
          setStatus('Verification link expired or already used. Please sign in.');
          setTimeout(() => router.replace('/login'), 2500);
        }
      }
    }, 1000);

    // ── Strategy 3: hard safety net — never leave the user stuck ──────
    const safety = setTimeout(() => {
      if (!redirected) {
        redirected = true;
        router.replace('/signup');
      }
    }, 12000);

    return () => {
      subscription.unsubscribe();
      clearInterval(poll);
      clearTimeout(safety);
    };
  }, [router]);

  return (
    <div style={{ minHeight:'100vh', background:'#F5F6FA', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"'Poppins',Arial,sans-serif" }}>
      <div style={{ textAlign:'center', maxWidth:340 }}>
        {/* Blitora Pulse logo */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:28 }}>
          <svg width="42" height="42" viewBox="0 0 64 64">
            <defs><mask id="cm"><rect width="64" height="64" fill="#fff"/><path d="M37 3 L21 34 L31 34 L25 61 L45 27 L34 27 Z" fill="#000"/></mask></defs>
            <rect width="64" height="64" rx="14" fill={N}/>
            <text x="33" y="50" textAnchor="middle" fontFamily="Poppins,Arial" fontWeight="800" fontSize="50" fill={G}>B</text>
            <text x="33" y="50" textAnchor="middle" fontFamily="Poppins,Arial" fontWeight="800" fontSize="50" fill="#FFFFFF" mask="url(#cm)">B</text>
          </svg>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontWeight:700, fontSize:16, color:N }}>Blitora <span style={{ color:G }}>Pulse</span></div>
            <div style={{ fontSize:10, color:'#718096', fontStyle:'italic' }}>Health Made Intelligent.</div>
          </div>
        </div>

        {/* Spinner */}
        <div style={{ width:48, height:48, border:`4px solid ${G}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 22px' }}/>
        <p style={{ fontSize:14, fontWeight:600, color:N, marginBottom:6 }}>{status}</p>
        <p style={{ fontSize:12, color:'#9CA3AF', lineHeight:1.5 }}>Please wait — this only takes a second.</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );
}
