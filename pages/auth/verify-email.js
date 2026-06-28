// pages/auth/verify-email.js
// Shown when user navigates to this page directly
import { useRouter } from 'next/router';
import { useState } from 'react';
import { getSupabase } from '../../lib/supabase';

const G = '#1D9E75', N = '#0D1B3E', BORDER = '#E0E3ED';

export default function VerifyEmail() {
  const router = useRouter();
  const { email } = router.query;
  const [resent, setResent] = useState(false);

  async function resend() {
    if (!email) return;
    const supabase = getSupabase();
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setResent(true);
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:28 }}>
          <div style={{ width:36, height:36, background:`linear-gradient(135deg,${G},#159960)`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🌿</div>
          <div>
            <div style={{ fontSize:'1rem', fontWeight:700, color:N, fontFamily:"'Poppins', Arial, sans-serif" }}>VitaLog</div>
            <div style={{ fontSize:'0.5rem', color:'#9CA3AF', letterSpacing:'0.07em', textTransform:'uppercase' }}>Health Platform</div>
          </div>
        </div>

        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'3.5rem', marginBottom:16 }}>📬</div>

          <h1 style={{ fontSize:'1.4rem', fontWeight:700, color:N, marginBottom:8, fontFamily:"'Poppins', Arial, sans-serif" }}>
            Verify your email
          </h1>

          <p style={{ fontSize:'0.82rem', color:'#6B7280', lineHeight:1.7, marginBottom:8 }}>
            We've sent a verification link to
          </p>

          {email && (
            <div style={{ display:'inline-block', background:'#F0FDF8', border:`1px solid #A7F3D0`, borderRadius:8, padding:'6px 16px', fontSize:'0.85rem', fontWeight:700, color:G, marginBottom:20 }}>
              {email}
            </div>
          )}

          <p style={{ fontSize:'0.76rem', color:'#6B7280', lineHeight:1.7, marginBottom:20 }}>
            Click the link in your email to verify your account.<br />
            You'll then be taken to complete your profile setup.
          </p>

          {/* Steps */}
          <div style={{ background:'#F5F6FA', borderRadius:12, padding:'16px', marginBottom:20, textAlign:'left' }}>
            {[
              { n:'1', text:'Open the email from VitaLog' },
              { n:'2', text:'Click "Verify my email" button' },
              { n:'3', text:'You\'ll be redirected to complete setup' },
            ].map(item => (
              <div key={item.n} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:G, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.72rem', fontWeight:700, flexShrink:0 }}>
                  {item.n}
                </div>
                <span style={{ fontSize:'0.78rem', color:'#374151' }}>{item.text}</span>
              </div>
            ))}
          </div>

          <div style={{ background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'10px 14px', fontSize:'0.72rem', color:'#92400E', marginBottom:20, textAlign:'left' }}>
            <strong>Didn't receive it?</strong> Check your spam or junk folder. The link expires in 1 hour.
          </div>

          {resent ? (
            <div style={{ background:'#F0FDF8', border:`1px solid #A7F3D0`, borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', color:'#065F46', marginBottom:12 }}>
              ✅ Email resent! Check your inbox.
            </div>
          ) : (
            <button
              style={{ width:'100%', padding:12, background:'none', border:`1.5px solid ${BORDER}`, borderRadius:12, fontWeight:600, fontSize:'0.82rem', color:'#6B7280', cursor:'pointer', marginBottom:10, fontFamily:"'Poppins', Arial, sans-serif" }}
              onClick={resend}
            >
              Resend verification email
            </button>
          )}

          <button
            style={{ width:'100%', padding:'8px', background:'none', border:'none', fontSize:'0.72rem', color:'#9CA3AF', cursor:'pointer' }}
            onClick={() => router.push('/signup')}
          >
            ← Back to sign up
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh', background:'#F5F6FA', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', fontFamily:"'Poppins', Arial, sans-serif" },
  card: { background:'#fff', borderRadius:20, padding:'32px 28px', width:'100%', maxWidth:440, boxShadow:'0 4px 24px rgba(13,27,62,0.08)', border:'1px solid #E0E3ED' },
};
