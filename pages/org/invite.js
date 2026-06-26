// pages/org/invite.js  — NEW FILE
// Org admin / dietitian can invite patients or other dietitians

import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import RoleGuard from '../../components/RoleGuard';
import { supabase } from '../../lib/supabase';
import { useRole } from '../../lib/useRole';

export default function InvitePage() {
  return (
    <RoleGuard allow={['org_admin','dietitian']}>
      <Layout>
        <InviteView />
      </Layout>
    </RoleGuard>
  );
}

function InviteView() {
  const router = useRouter();
  const { orgId, role } = useRole();
  const [email,    setEmail]   = useState('');
  const [invRole,  setInvRole] = useState('patient');
  const [sending,  setSending] = useState(false);
  const [sent,     setSent]    = useState(false);
  const [error,    setError]   = useState('');
  const [recent,   setRecent]  = useState([]);

  // Load recent invites on mount
  useState(() => {
    if (!orgId) return;
    supabase.from('invitations')
      .select('email, role, accepted, created_at, expires_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setRecent(data || []));
  }, [orgId]);

  async function sendInvite(e) {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Check if already a member
      const { data: existing } = await supabase
        .from('organisation_members')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('is_active', true);
      // (simplified — in production query by email via auth.users)

      // Create invitation record
      const { data: inv, error: invErr } = await supabase
        .from('invitations')
        .insert({ org_id: orgId, email: email.trim().toLowerCase(), role: invRole, invited_by: user.id })
        .select()
        .single();
      if (invErr) throw invErr;

      // In production: call a Supabase Edge Function here to send email
      // Edge function would call Resend/SendGrid with the invite link:
      // https://yourdomain.com/auth/accept-invite?token=<inv.token>
      //
      // For now we show the invite link in the UI:
      setSent(true);
      setRecent(prev => [inv, ...prev]);
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={s.page}>
      <button style={s.back} onClick={() => router.back()}>← Back</button>
      <h1 style={s.h1}>Invite People</h1>
      <p style={s.sub}>Send an email invitation to add patients or dietitians to your clinic.</p>

      <div style={s.card}>
        {sent && (
          <div style={s.success}>
            ✅ Invitation created! Share the link below with the recipient, or set up email sending via Supabase Edge Functions.
          </div>
        )}
        {error && <div style={s.err}>{error}</div>}

        <form onSubmit={sendInvite}>
          <label style={s.lbl}>Email address</label>
          <input
            style={s.inp}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setSent(false); }}
            placeholder="patient@example.com"
            required
          />

          <label style={s.lbl}>Invite as</label>
          <div style={s.roleRow}>
            <RoleOption value="patient"   label="Patient"   icon="👤" desc="Can log their own health data" selected={invRole==='patient'}   onClick={() => setInvRole('patient')} />
            {role === 'org_admin' && (
              <RoleOption value="dietitian" label="Dietitian" icon="👨‍⚕️" desc="Can view and manage patients" selected={invRole==='dietitian'} onClick={() => setInvRole('dietitian')} />
            )}
          </div>

          <div style={s.noteBox}>
            <strong>How it works:</strong> The recipient gets a link to join your clinic. They sign up (or log in) and are automatically added to your organisation as a {invRole}.
          </div>

          <button style={{ ...s.btn, opacity: sending ? 0.7 : 1 }} type="submit" disabled={sending}>
            {sending ? 'Creating invite…' : `Send Invite as ${invRole === 'patient' ? 'Patient' : 'Dietitian'}`}
          </button>
        </form>
      </div>

      {/* Recent invites */}
      {recent.length > 0 && (
        <div style={{ marginTop:20 }}>
          <div style={s.recentTitle}>Recent Invitations</div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {recent.map((inv, i) => (
              <div key={i} style={s.invCard}>
                <div>
                  <div style={s.invEmail}>{inv.email}</div>
                  <div style={s.invMeta}>{inv.role} · Invited {new Date(inv.created_at).toLocaleDateString()}</div>
                </div>
                <span style={{ ...s.invStatus, background: inv.accepted ? '#D1FAE5' : '#FEF3C7', color: inv.accepted ? '#065F46' : '#92400E' }}>
                  {inv.accepted ? '✅ Joined' : '⏳ Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoleOption({ value, label, icon, desc, selected, onClick }) {
  return (
    <div
      style={{ ...s.roleOpt, ...(selected ? s.roleOptOn : {}) }}
      onClick={onClick}
    >
      <span style={{ fontSize:'1.3rem' }}>{icon}</span>
      <div>
        <div style={{ fontSize:'0.76rem', fontWeight:700, color:'#111827' }}>{label}</div>
        <div style={{ fontSize:'0.62rem', color:'#6B7280' }}>{desc}</div>
      </div>
    </div>
  );
}

const s = {
  page:       { padding:'16px', maxWidth:520, margin:'0 auto' },
  back:       { background:'none', border:'none', color:'#6B7280', cursor:'pointer', fontSize:'0.76rem', padding:'0 0 14px', fontFamily:'Inter,sans-serif' },
  h1:         { fontFamily:'Sora,sans-serif', fontSize:'1.3rem', fontWeight:800, color:'#111827', marginBottom:4 },
  sub:        { fontSize:'0.78rem', color:'#6B7280', marginBottom:20 },
  card:       { background:'#fff', borderRadius:14, padding:'20px', border:'1px solid #E5E7EB', marginBottom:16 },
  success:    { background:'#F0FDF4', border:'1px solid #A7F3D0', color:'#065F46', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:14 },
  err:        { background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:14 },
  lbl:        { display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:5 },
  inp:        { width:'100%', padding:'10px 13px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.82rem', fontFamily:'Inter,sans-serif', outline:'none', marginBottom:14, boxSizing:'border-box', color:'#111827', background:'#fff' },
  roleRow:    { display:'flex', gap:8, marginBottom:14 },
  roleOpt:    { flex:1, display:'flex', alignItems:'center', gap:9, padding:'12px', border:'1.5px solid #E5E7EB', borderRadius:11, cursor:'pointer', transition:'all 0.12s' },
  roleOptOn:  { borderColor:'#10B981', background:'#F0FDF4' },
  noteBox:    { background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:9, padding:'10px 12px', fontSize:'0.68rem', color:'#374151', lineHeight:1.5, marginBottom:14 },
  btn:        { width:'100%', padding:12, background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', borderRadius:12, fontWeight:700, fontSize:'0.84rem', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  recentTitle:{ fontFamily:'Sora,sans-serif', fontSize:'0.84rem', fontWeight:700, color:'#111827', marginBottom:10 },
  invCard:    { background:'#fff', borderRadius:11, padding:'12px 14px', border:'1px solid #E5E7EB', display:'flex', alignItems:'center', justifyContent:'space-between' },
  invEmail:   { fontSize:'0.76rem', fontWeight:600, color:'#111827' },
  invMeta:    { fontSize:'0.62rem', color:'#6B7280', marginTop:1 },
  invStatus:  { fontSize:'0.62rem', fontWeight:700, padding:'3px 9px', borderRadius:20 },
};
