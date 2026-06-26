// pages/clinic/patients.js  — NEW FILE
// Who sees this: org_admin, dietitian
// Shows: list of all patients in the org, their today's status, quick actions

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import RoleGuard from '../../components/RoleGuard';
import { supabase } from '../../lib/supabase';
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
  const [filterStatus, setFilter] = useState('all'); // all | logged | not_logged

  useEffect(() => {
    if (orgId) loadPatients();
  }, [orgId]);

  async function loadPatients() {
    setLoading(true);
    // Get all patients in this org
    const { data: members } = await supabase
      .from('organisation_members')
      .select(`
        user_id, role, joined_at,
        profiles!inner(id, full_name, email, avatar_url, goal_weight, current_weight, health_conditions)
      `)
      .eq('org_id', orgId)
      .eq('role', 'patient')
      .eq('is_active', true);

    if (!members) { setLoading(false); return; }

    // Get today's logs for all patients
    const today = new Date().toISOString().split('T')[0];
    const patientIds = members.map(m => m.user_id);

    const { data: logs } = await supabase
      .from('health_logs')
      .select('user_id, date, total_calories, total_protein, total_water_ml')
      .in('user_id', patientIds)
      .eq('date', today);

    const logMap = {};
    (logs || []).forEach(l => { logMap[l.user_id] = l; });

    // Get assignments
    const { data: assignments } = await supabase
      .from('patient_assignments')
      .select('patient_id, dietitian_id, profiles!patient_assignments_dietitian_id_fkey(full_name)')
      .in('patient_id', patientIds)
      .eq('org_id', orgId)
      .eq('is_active', true);

    const assignMap = {};
    (assignments || []).forEach(a => { assignMap[a.patient_id] = a; });

    const enriched = members.map(m => ({
      ...m.profiles,
      joined_at:    m.joined_at,
      todayLog:     logMap[m.user_id] || null,
      dietitian:    assignMap[m.user_id]?.profiles?.full_name || 'Unassigned',
    }));

    setPatients(enriched);
    setLoading(false);
  }

  const filtered = patients
    .filter(p => {
      const nameMatch = !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase());
      const loggedToday = !!p.todayLog;
      const statusMatch = filterStatus === 'all' || (filterStatus === 'logged' ? loggedToday : !loggedToday);
      return nameMatch && statusMatch;
    });

  const loggedCount     = patients.filter(p => p.todayLog).length;
  const notLoggedCount  = patients.length - loggedCount;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>Patients</h1>
          <p style={s.sub}>{patients.length} total · {loggedCount} logged today</p>
        </div>
        <button style={s.inviteBtn} onClick={() => router.push('/org/invite')}>
          + Invite Patient
        </button>
      </div>

      {/* Stats row */}
      <div style={s.statsRow}>
        <StatCard label="Total Patients" value={patients.length}    color="#10B981" />
        <StatCard label="Logged Today"   value={loggedCount}         color="#0EA5E9" />
        <StatCard label="Not Logged"     value={notLoggedCount}      color="#F59E0B" />
        <StatCard label="Trial Days"     value="12 left"             color="#8B5CF6" />
      </div>

      {/* Search + filter */}
      <div style={s.filterRow}>
        <input
          style={s.search}
          placeholder="Search patient name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={s.filterChips}>
          {['all','logged','not_logged'].map(f => (
            <button
              key={f}
              style={{ ...s.chip, ...(filterStatus === f ? s.chipOn : {}) }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'logged' ? '✅ Logged' : '⚠️ Not logged'}
            </button>
          ))}
        </div>
      </div>

      {/* Patient list */}
      {loading ? (
        <LoadingList />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={patients.length === 0 ? '👥' : '🔍'}
          title={patients.length === 0 ? 'No patients yet' : 'No results'}
          desc={patients.length === 0 ? 'Invite your first patient to get started.' : 'Try a different search or filter.'}
          action={patients.length === 0 ? <button style={s.inviteBtn} onClick={() => router.push('/org/invite')}>+ Invite Patient</button> : null}
        />
      ) : (
        <div style={s.list}>
          {filtered.map(p => (
            <PatientCard key={p.id} patient={p} onClick={() => router.push(`/clinic/patient/${p.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PatientCard({ patient, onClick }) {
  const log        = patient.todayLog;
  const loggedToday = !!log;
  const kcalPct    = log ? Math.min(100, Math.round((log.total_calories / 2200) * 100)) : 0;
  const proteinPct = log ? Math.min(100, Math.round((log.total_protein / 160) * 100)) : 0;
  const waterPct   = log ? Math.min(100, Math.round((log.total_water_ml / 3000) * 100)) : 0;

  const initials = (patient.full_name || patient.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={s.card} onClick={onClick}>
      <div style={s.cardLeft}>
        <div style={s.avatar}>{initials}</div>
        <div>
          <div style={s.patientName}>{patient.full_name || 'Unnamed'}</div>
          <div style={s.patientMeta}>{patient.email}</div>
          <div style={s.patientMeta}>👨‍⚕️ {patient.dietitian}</div>
        </div>
      </div>

      <div style={s.cardRight}>
        {loggedToday ? (
          <div style={s.logSummary}>
            <MiniBar label="Kcal" pct={kcalPct} color="#10B981" />
            <MiniBar label="Prot" pct={proteinPct} color="#8B5CF6" />
            <MiniBar label="H₂O"  pct={waterPct}  color="#0EA5E9" />
          </div>
        ) : (
          <div style={s.notLogged}>
            <span style={s.notLoggedIcon}>⚠️</span>
            <span style={s.notLoggedText}>Not logged</span>
          </div>
        )}
        <div style={s.cardArrow}>›</div>
      </div>
    </div>
  );
}

function MiniBar({ label, pct, color }) {
  return (
    <div style={{ marginBottom:4 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
        <span style={{ fontSize:'0.55rem', color:'#6B7280' }}>{label}</span>
        <span style={{ fontSize:'0.55rem', color, fontWeight:700 }}>{pct}%</span>
      </div>
      <div style={{ height:3, background:'#F3F4F6', borderRadius:99 }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:99 }}></div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={s.statCard}>
      <div style={{ ...s.statVal, color }}>{value}</div>
      <div style={s.statLbl}>{label}</div>
    </div>
  );
}

function LoadingList() {
  return (
    <div style={s.list}>
      {[1,2,3].map(i => (
        <div key={i} style={{ ...s.card, background:'#F9FAFB' }}>
          <div style={{ width:'60%', height:14, background:'#E5E7EB', borderRadius:6 }}></div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, desc, action }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <div style={{ fontSize:'2.5rem', marginBottom:12 }}>{icon}</div>
      <div style={{ fontFamily:'Sora,sans-serif', fontSize:'1rem', fontWeight:700, color:'#111827', marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:'0.78rem', color:'#6B7280', marginBottom:20 }}>{desc}</div>
      {action}
    </div>
  );
}

const s = {
  page:         { padding:'20px 16px', maxWidth:800, margin:'0 auto' },
  header:       { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
  h1:           { fontFamily:'Sora,sans-serif', fontSize:'1.3rem', fontWeight:800, color:'#111827', marginBottom:2 },
  sub:          { fontSize:'0.72rem', color:'#6B7280' },
  inviteBtn:    { background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', border:'none', borderRadius:10, padding:'9px 16px', fontSize:'0.75rem', fontWeight:700, cursor:'pointer', fontFamily:'Inter,sans-serif' },
  statsRow:     { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 },
  statCard:     { background:'#fff', borderRadius:12, padding:'12px', border:'1px solid #E5E7EB', textAlign:'center' },
  statVal:      { fontFamily:'Sora,sans-serif', fontSize:'1.2rem', fontWeight:800, lineHeight:1 },
  statLbl:      { fontSize:'0.6rem', color:'#6B7280', marginTop:3 },
  filterRow:    { marginBottom:14 },
  search:       { width:'100%', padding:'9px 13px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.8rem', fontFamily:'Inter,sans-serif', outline:'none', marginBottom:8, boxSizing:'border-box', color:'#111827', background:'#fff' },
  filterChips:  { display:'flex', gap:6 },
  chip:         { padding:'5px 12px', border:'1.5px solid #E5E7EB', borderRadius:20, fontSize:'0.65rem', fontWeight:600, color:'#6B7280', background:'#fff', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  chipOn:       { background:'#111827', color:'#fff', borderColor:'#111827' },
  list:         { display:'flex', flexDirection:'column', gap:8 },
  card:         { background:'#fff', borderRadius:14, padding:'14px', border:'1px solid #E5E7EB', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', transition:'box-shadow 0.12s' },
  cardLeft:     { display:'flex', alignItems:'center', gap:12 },
  avatar:       { width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', fontWeight:700, flexShrink:0 },
  patientName:  { fontFamily:'Sora,sans-serif', fontSize:'0.82rem', fontWeight:700, color:'#111827' },
  patientMeta:  { fontSize:'0.64rem', color:'#6B7280', marginTop:1 },
  cardRight:    { display:'flex', alignItems:'center', gap:10 },
  logSummary:   { width:80 },
  notLogged:    { display:'flex', flexDirection:'column', alignItems:'center', gap:2 },
  notLoggedIcon:{ fontSize:'1.1rem' },
  notLoggedText:{ fontSize:'0.58rem', color:'#F59E0B', fontWeight:600 },
  cardArrow:    { fontSize:'1.1rem', color:'#D1D5DB' },
};
