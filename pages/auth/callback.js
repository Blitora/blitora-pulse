// pages/auth/callback.js
// Supabase redirects here after email verification
// Detects session, then sends user to /setup (if incomplete) or /clinic/patients or /dashboard

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getSupabase } from '../../lib/supabase';

const G = '#1D9E75', N = '#0D1B3E';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Verifying your email…');

  useEffect(() => {
    async function handleCallback() {
      const supabase = getSupabase();

      // Give Supabase a moment to process the token from the URL hash
      await new Promise(r => setTimeout(r, 800));

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        setStatus('Verification failed. Please try again.');
        setTimeout(() => router.replace('/signup'), 2500);
        return;
      }

      setStatus('Email verified! Setting up your account…');

      // Check org membership to decide where to send them
      const { data: member } = await supabase
        .from('organisation_members')
        .select('role, org_id')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      // Always fetch profile regardless of org membership
      const { data: profile } = await supabase
        .from('profiles')
        .select('setup_complete, role')
        .eq('id', session.user.id)
        .maybeSingle();

      await new Promise(r => setTimeout(r, 600));

      // Clinic staff (org_admin / dietitian) → patient management
      if (member && (member.role === 'org_admin' || member.role === 'dietitian')) {
        router.replace('/clinic/patients');
        return;
      }

      // Everyone else — individual users, invited patients, no org yet
      if (profile?.setup_complete) {
        // Returning user — go straight to dashboard
        router.replace('/dashboard');
      } else if (!profile || !profile.user_type) {
        // Brand new signup via Google — they haven't chosen clinic vs individual yet
        router.replace('/signup');
      } else {
        // Has user_type but hasn't completed setup
        router.replace('/setup');
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div style={{ minHeight:'100vh', background:'#F5F6FA', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"'Poppins', Arial, sans-serif" }}>
      <div style={{ textAlign:'center', maxWidth:320 }}>
        <div style={{ width:56, height:56, border:`4px solid ${G}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 20px' }} />
        <div style={{ fontSize:'1rem', fontWeight:600, color:N, marginBottom:6 }}>
          Blitora Pulse
        </div>
        <p style={{ fontSize:'0.82rem', color:'#6B7280' }}>{status}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );
}
