// pages/clinic/patients.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import RoleGuard from '../../components/RoleGuard';
import { getSupabase } from '../../lib/supabase';
import { useRole } from '../../lib/useRole';

export default function PatientsPage() {
  return (
    <RoleGuard allow={['org_admin', 'dietitian', 'super_admin']}>
      <Layout>
        <PatientsView />
      </Layout>
    </RoleGuard>
  );
}

function PatientsView() {
  const router = useRouter();
  const { orgId, role } = useRole();
  const [patients, setPatients]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilter] = useState('all');

  useEffect(() => {
    if (orgId) loadPatients();
  }, [orgId]);

  async function loadPatients() {
    const supabase = getSupabase();
    setLoading(true);

    const { data: members } = await supabase
      .from('organisation_members')
      .select('user_id, role, joined_at')
      .eq('org_id', orgId)
      .eq('role', 'patient')
      .eq('is_active', true);

    if (!members || members.length === 0) { setLoading(false); return; }

    const patientIds = members.map(m => m.user_id);

    // Get profiles
    const { data: profilesList } = await supabase
      .from('profiles')
      .select('id, full_name, email, status, setup_complete')
      .in('id', patientIds);

    // Get today's logs — use correct column name: log_date
    const today = new Date().toISOString().split('T')[0];
    const { data: logs } = await supabase
      .from('health_logs')
      .select('user_id, log_date, foods, water')
      .in('user_id', patientIds)
      .eq('log_date', today);

    const logMap = {};
    (logs || []).forEach(l => { logMap[l.user_id] = l; });

    const enriched = (profilesList || []).map(p => ({
      ...p,
      joined_at: members.find(m => m.user_id === p.id)?.joined_at,
      todayLog: logMap[p.id] || null,
    }));

    setPatients(enriched);
    setLoading(false);
  }

  const filtered = patients.filter(p => {
    const nameMatch = !search ||
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase());
    const loggedToday = !!p.todayLog;
    const statusMatch = filterStatus === 'all' ||
      (filterStatus === 'logged' ? loggedToday : !loggedToday);
    return nameMatch && statusMatch;
  });

  const loggedCount    = patients.filter(p => p.todayLog).length;
  const notLoggedCount = patients.length - loggedCount;

  const P = '#714B67', G = '#1D9E75', BORDER = '#E5E7EB', TXT = '#111827', TXT2 = '#6B7280';

  return (
    <div style={{ padding:'20px 16px', maxWidth:800, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h1 style={{ fontFamily:'Sora,sans-serif', fontSize:'1.3rem', fontWeight:800, color:TXT, margin:0 }}>Patients</h1>
          <p style={{ fontSize:'0.72rem', color:TXT2, margin:'2px 0 0' }}>
            {patients.length} total · {loggedCount} logged today · {notLoggedCount} not logged
          </p>
        </div>
        <button
          style={{ background:`linear-gradient(135deg,${P},#9b6e8e)`, color:'#fff', border:'none', borderRadius:10, padding:'9px 16px', fontSize:'0.75rem', fontWeight:700, cursor:'pointer', fontFamily:'Inter,sans-serif' }}
          onClick={() => router.push('/org/invite')}
        >
          + Invite Patient
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
        {[
          { label:'Total Patients', value:patients.length, color:'#6366F1' },
          { label:'Logged Today',   value:loggedCount,      color:G },
          { label:'Not Logged',     value:notLoggedCount,   color:'#F59E0B' },
        ].map(s => (
          <div key={s.label} style={{ background:'#fff', borderRadius:12, padding:'12px', border:`1px solid ${BORDER}`, textAlign:'center' }}>
            <div style={{ fontFamily:'Sora,sans-serif', fontSize:'1.4rem', fontWeight:800, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:'0.6rem', color:TXT2, marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <input
        style={{ width:'100%', padding:'9px 13px', border:`1.5px solid ${BORDER}`, borderRadius:10, fontSize:'0.82rem', fontFamily:'Inter,sans-serif', outline:'none', marginBottom:8, boxSizing:'border-box', color:TXT }}
        placeholder="Search patient name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {['all','logged','not_logged'].map(f => (
          <button key={f}
            style={{ padding:'5px 12px', border:`1.5px solid ${filterStatus===f?TXT:BORDER}`, borderRadius:20, fontSize:'0.65rem', fontWeight:600, color:filterStatus===f?'#fff':TXT2, background:filterStatus===f?TXT:'#fff', cursor:'pointer', fontFamily:'Inter,sans-serif' }}
            onClick={() => setFilter(f)}>
            {f==='all'?'All':f==='logged'?'✅ Logged':'⚠️ Not logged'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:TXT2 }}>Loading patients…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', background:'#fff', borderRadius:14, border:`1px dashed ${BORDER}` }}>
          <div style={{ fontSize:'2.5rem', marginBottom:10 }}>{patients.length===0?'👥':'🔍'}</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:'1rem', fontWeight:700, color:TXT, marginBottom:6 }}>
            {patients.length===0?'No patients yet':'No results'}
          </div>
          <div style={{ fontSize:'0.78rem', color:TXT2, marginBottom:16 }}>
            {patients.length===0?'Invite your first patient to get started.':'Try a different search or filter.'}
          </div>
          {patients.length===0 && (
            <button
              style={{ background:`linear-gradient(135deg,${P},#9b6e8e)`, color:'#fff', border:'none', borderRadius:10, padding:'9px 16px', fontSize:'0.75rem', fontWeight:700, cursor:'pointer', fontFamily:'Inter,sans-serif' }}
              onClick={() => router.push('/org/invite')}>
              + Invite Patient
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(p => {
            const loggedToday = !!p.todayLog;
            const initials = (p.full_name||p.email||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
            const badge = loggedToday
              ? { label:'Logged today', color:G, bg:'#F0FDF4', border:'#A7F3D0' }
              : { label:'Not logged',   color:'#F59E0B', bg:'#FFFBF0', border:'#FDE68A' };

            return (
              <div key={p.id}
                style={{ background:'#fff', borderRadius:14, padding:'14px 16px', border:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}
                onClick={() => router.push(`/clinic/patient/${p.id}`)}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', fontWeight:700, flexShrink:0 }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontFamily:'Sora,sans-serif', fontSize:'0.85rem', fontWeight:700, color:TXT }}>{p.full_name||'Unnamed'}</div>
                    <div style={{ fontSize:'0.65rem', color:TXT2, marginTop:1 }}>{p.email}</div>
                    {!p.setup_complete && (
                      <div style={{ fontSize:'0.6rem', color:'#F59E0B', marginTop:2 }}>⏳ Profile setup pending</div>
                    )}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:'0.65rem', fontWeight:700, padding:'4px 10px', borderRadius:20, color:badge.color, background:badge.bg, border:`1px solid ${badge.border}` }}>
                    {badge.label}
                  </span>
                  <span style={{ color:'#D1D5DB', fontSize:'1.1rem' }}>›</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
