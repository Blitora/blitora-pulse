// pages/org/invite.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import RoleGuard from '../../components/RoleGuard';
import { getSupabase } from '../../lib/supabase';
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
  const [email,   setEmail]   = useState('');
  const [invRole, setInvRole] = useState('patient');
  const [sending, setSending] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied,  setCopied]  = useState(false);
  const [error,   setError]   = useState('');
  const [recent,  setRecent]  = useState([]);

  useEffect(() => {
    if (!orgId) return;
    const supabase = getSupabase();
    supabase.from('invitations')
      .select('email, role, accepted, created_at, token')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setRecent(data || []));
  }, [orgId]);

  async function sendInvite(e) {
    e.preventDefault();
    setError(''); setSending(true); setInviteLink(''); setCopied(false);
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: inv, error: invErr } = await supabase
        .from('invitations')
        .insert({
          org_id: orgId,
          email: email.trim().toLowerCase(),
          role: invRole,
          invited_by: user.id,
        })
        .select()
        .single();
      if (invErr) throw invErr;

      const link = `${window.location.origin}/auth/accept-invite?token=${inv.token}`;
      setInviteLink(link);
      setRecent(prev => [inv, ...prev]);
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getLink(token) {
    return `${window.location.origin}/auth/accept-invite?token=${token}`;
  }

  const P = '#714B67', G = '#1D9E75', BORDER = '#E5E7EB';

  return (
    <div style={{ padding:'16px', maxWidth:560, margin:'0 auto' }}>
      <button style={{ background:'none', border:'none', color:'#6B7280', cursor:'pointer', fontSize:'0.76rem', padding:'0 0 14px', fontFamily:'Inter,sans-serif' }}
        onClick={() => router.back()}>← Back</button>

      <h1 style={{ fontFamily:'Sora,sans-serif', fontSize:'1.3rem', fontWeight:800, color:'#111827', marginBottom:4 }}>Invite People</h1>
      <p style={{ fontSize:'0.78rem', color:'#6B7280', marginBottom:20 }}>
        Generate an invite link to add patients or dietitians to your clinic.
      </p>

      <div style={{ background:'#fff', borderRadius:14, padding:'20px', border:`1px solid ${BORDER}`, marginBottom:16 }}>
        {error && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:14 }}>
            {error}
          </div>
        )}

        <form onSubmit={sendInvite}>
          <label style={{ display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:5 }}>Email address</label>
          <input
            style={{ width:'100%', padding:'10px 13px', border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:'0.82rem', fontFamily:'Inter,sans-serif', outline:'none', marginBottom:14, boxSizing:'border-box', color:'#111827', background:'#fff' }}
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setInviteLink(''); }}
            placeholder="patient@example.com"
            required
          />

          <label style={{ display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:8 }}>Invite as</label>
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {[
              { val:'patient',   label:'Patient',   icon:'👤', desc:'Can log their own health data' },
              ...(role === 'org_admin' ? [{ val:'dietitian', label:'Dietitian', icon:'👨‍⚕️', desc:'Can view and manage patients' }] : []),
            ].map(opt => (
              <div key={opt.val}
                onClick={() => setInvRole(opt.val)}
                style={{ flex:1, display:'flex', alignItems:'center', gap:9, padding:'12px', border:`1.5px solid ${invRole===opt.val?G:BORDER}`, borderRadius:11, cursor:'pointer', background: invRole===opt.val?'#F0FDF4':'#fff' }}>
                <span style={{ fontSize:'1.3rem' }}>{opt.icon}</span>
                <div>
                  <div style={{ fontSize:'0.76rem', fontWeight:700, color:'#111827' }}>{opt.label}</div>
                  <div style={{ fontSize:'0.62rem', color:'#6B7280' }}>{opt.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            style={{ width:'100%', padding:12, background:`linear-gradient(135deg,${P},#9b6e8e)`, color:'#fff', borderRadius:12, fontWeight:700, fontSize:'0.84rem', border:'none', cursor: sending?'not-allowed':'pointer', fontFamily:'Inter,sans-serif', opacity: sending?0.7:1 }}
            type="submit" disabled={sending}>
            {sending ? 'Generating link…' : `Generate Invite Link`}
          </button>
        </form>

        {/* Invite link display */}
        {inviteLink && (
          <div style={{ marginTop:16, background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:12, padding:'14px' }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#065F46', marginBottom:8 }}>
              ✅ Invite link generated! Share this with {invRole === 'patient' ? 'the patient' : 'the dietitian'}:
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ flex:1, background:'#fff', border:'1px solid #A7F3D0', borderRadius:8, padding:'8px 10px', fontSize:'0.65rem', color:'#374151', wordBreak:'break-all', fontFamily:'monospace' }}>
                {inviteLink}
              </div>
              <button
                onClick={copyLink}
                style={{ flexShrink:0, padding:'8px 14px', background: copied?G:P, color:'#fff', border:'none', borderRadius:8, fontSize:'0.72rem', fontWeight:700, cursor:'pointer', fontFamily:'Inter,sans-serif', whiteSpace:'nowrap' }}>
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
            <div style={{ fontSize:'0.65rem', color:'#6B7280', marginTop:8 }}>
              Send via WhatsApp, SMS, or email. Link expires in 7 days. Patient must click it to join your clinic.
            </div>
          </div>
        )}
      </div>

      {/* Recent invites */}
      {recent.length > 0 && (
        <div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:'0.84rem', fontWeight:700, color:'#111827', marginBottom:10 }}>
            Recent Invitations
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {recent.map((inv, i) => (
              <div key={i} style={{ background:'#fff', borderRadius:11, padding:'12px 14px', border:`1px solid ${BORDER}` }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: inv.token && !inv.accepted ? 8 : 0 }}>
                  <div>
                    <div style={{ fontSize:'0.76rem', fontWeight:600, color:'#111827' }}>{inv.email}</div>
                    <div style={{ fontSize:'0.62rem', color:'#6B7280', marginTop:1 }}>
                      {inv.role} · {new Date(inv.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{ fontSize:'0.62rem', fontWeight:700, padding:'3px 9px', borderRadius:20, background: inv.accepted?'#D1FAE5':'#FEF3C7', color: inv.accepted?'#065F46':'#92400E' }}>
                    {inv.accepted ? '✅ Joined' : '⏳ Pending'}
                  </span>
                </div>
                {/* Show copy link for pending invites */}
                {inv.token && !inv.accepted && (
                  <CopyLinkRow link={getLink(inv.token)} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CopyLinkRow({ link }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div style={{ display:'flex', gap:6, alignItems:'center', background:'#F8FAFC', borderRadius:7, padding:'6px 8px' }}>
      <div style={{ flex:1, fontSize:'0.58rem', color:'#6B7280', wordBreak:'break-all', fontFamily:'monospace' }}>
        {link.replace('https://', '')}
      </div>
      <button onClick={copy}
        style={{ flexShrink:0, padding:'4px 10px', background: copied?'#1D9E75':'#714B67', color:'#fff', border:'none', borderRadius:6, fontSize:'0.6rem', fontWeight:700, cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  );
}
