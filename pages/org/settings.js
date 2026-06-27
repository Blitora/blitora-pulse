// pages/org/settings.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import RoleGuard from '../../components/RoleGuard';
import { getSupabase } from '../../lib/supabase';
import { useRole } from '../../lib/useRole';

export default function OrgSettingsPage() {
  return (
    <RoleGuard allow={['org_admin', 'dietitian', 'super_admin']}>
      <Layout>
        <OrgSettingsView />
      </Layout>
    </RoleGuard>
  );
}

function OrgSettingsView() {
  const { org, orgId } = useRole();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orgId) loadMembers();
  }, [orgId]);

  async function loadMembers() {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('organisation_members')
      .select('user_id, role, joined_at, is_active, profiles(id, full_name, email, status)')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false });
    setMembers(data || []);
    setLoading(false);
  }

  const P = '#714B67', G = '#1D9E75', BORDER = '#e5e3ee', TXT = '#2c1a3a', TXT2 = '#888', BG = '#f0f0f7', CARD = '#fff';

  return (
    <div style={{ padding: '20px 16px', maxWidth: 800, margin: '0 auto' }}>
      {/* Org info */}
      <div style={{ background: CARD, borderRadius: 13, border: `1px solid ${BORDER}`, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: TXT, marginBottom: 4 }}>
          {org?.name || 'Clinic Settings'}
        </div>
        <div style={{ fontSize: 12, color: TXT2, marginBottom: 16 }}>
          Plan: <b>{org?.plan || '—'}</b>
          {org?.trial_ends_at && (
            <span style={{ marginLeft: 12 }}>
              Trial ends: <b>{new Date(org.trial_ends_at).toLocaleDateString()}</b>
            </span>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { l: 'Total members', v: members.length },
            { l: 'Patients', v: members.filter(m => m.role === 'patient').length },
            { l: 'Dietitians', v: members.filter(m => m.role === 'dietitian' || m.role === 'org_admin').length },
          ].map((s, i) => (
            <div key={i} style={{ background: BG, borderRadius: 10, padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: P }}>{s.v}</div>
              <div style={{ fontSize: 10, color: TXT2, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: TXT }}>Members</div>
        <a href="/org/invite" style={{ padding: '8px 18px', background: P, color: '#fff', borderRadius: 9, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          + Invite
        </a>
      </div>

      {/* Members list */}
      <div style={{ background: CARD, borderRadius: 13, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center', color: TXT2 }}>Loading…</div>
        ) : members.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: TXT2 }}>No members yet. Invite patients to get started.</div>
        ) : members.map((m, i) => {
          const p = m.profiles;
          const initials = (p?.full_name || p?.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#714B67,#9b6e8e)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{p?.full_name || 'Unnamed'}</div>
                <div style={{ fontSize: 11, color: TXT2 }}>{p?.email}</div>
              </div>
              <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: m.role === 'patient' ? '#F3F4F6' : '#D1FAE5', color: m.role === 'patient' ? '#374151' : '#065F46' }}>
                {m.role}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
