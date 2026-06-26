// pages/admin/orgs.js — NEW FILE
// Super admin only — view all organisations, extend trial, suspend, delete

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import RoleGuard from '../../components/RoleGuard';
import { getSupabase } from '../../lib/supabase';
const supabase = getSupabase();

export default function AdminOrgsPage() {
  return (
    <RoleGuard allow={['super_admin']}>
      <Layout>
        <AdminOrgsView />
      </Layout>
    </RoleGuard>
  );
}

function AdminOrgsView() {
  const router = useRouter();
  const [orgs,    setOrgs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all'); // all | trial | active | suspended | expired
  const [action,  setAction]  = useState(null);  // { type, org }

  useEffect(() => { loadOrgs(); }, []);

  async function loadOrgs() {
    setLoading(true);
    const { data } = await supabase
      .from('organisations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!data) { setLoading(false); return; }

    // Get member counts per org
    const { data: members } = await supabase
      .from('organisation_members')
      .select('org_id, role')
      .eq('is_active', true);

    const counts = {};
    (members || []).forEach(m => {
      if (!counts[m.org_id]) counts[m.org_id] = { patients: 0, dietitians: 0, admins: 0 };
      if (m.role === 'patient')   counts[m.org_id].patients++;
      if (m.role === 'dietitian') counts[m.org_id].dietitians++;
      if (m.role === 'org_admin') counts[m.org_id].admins++;
    });

    setOrgs(data.map(o => ({ ...o, counts: counts[o.id] || { patients:0, dietitians:0, admins:0 } })));
    setLoading(false);
  }

  async function extendTrial(org, days) {
    const current = new Date(org.trial_ends_at) > new Date() ? new Date(org.trial_ends_at) : new Date();
    const newDate = new Date(current.getTime() + days * 86400000).toISOString();
    await supabase.from('organisations').update({ trial_ends_at: newDate, plan: 'trial' }).eq('id', org.id);
    await supabase.from('audit_log').insert({ action: 'extend_trial', target_type: 'organisation', target_id: org.id, metadata: { days, new_date: newDate } });
    setAction(null);
    loadOrgs();
  }

  async function suspendOrg(org, reason) {
    await supabase.from('organisations').update({ is_active: false, suspended_at: new Date().toISOString(), suspended_reason: reason }).eq('id', org.id);
    await supabase.from('audit_log').insert({ action: 'suspend_org', target_type: 'organisation', target_id: org.id, metadata: { reason } });
    setAction(null);
    loadOrgs();
  }

  async function reinstateOrg(org) {
    await supabase.from('organisations').update({ is_active: true, suspended_at: null, suspended_reason: null }).eq('id', org.id);
    await supabase.from('audit_log').insert({ action: 'reinstate_org', target_type: 'organisation', target_id: org.id });
    loadOrgs();
  }

  function getStatus(org) {
    if (!org.is_active) return 'suspended';
    if (org.plan === 'trial') {
      const daysLeft = Math.ceil((new Date(org.trial_ends_at) - new Date()) / 86400000);
      if (daysLeft <= 0) return 'expired';
      return 'trial';
    }
    return 'active';
  }

  const filtered = orgs.filter(o => {
    const status = getStatus(o);
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total:     orgs.length,
    trial:     orgs.filter(o => getStatus(o) === 'trial').length,
    active:    orgs.filter(o => getStatus(o) === 'active').length,
    expired:   orgs.filter(o => getStatus(o) === 'expired').length,
    suspended: orgs.filter(o => getStatus(o) === 'suspended').length,
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>Organisations</h1>
          <p style={s.sub}>All VitaLog client organisations</p>
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        {[
          { label:'Total',     value: stats.total,     color:'#111827' },
          { label:'Trial',     value: stats.trial,     color:'#6366F1' },
          { label:'Active',    value: stats.active,    color:'#10B981' },
          { label:'Expired',   value: stats.expired,   color:'#F59E0B' },
          { label:'Suspended', value: stats.suspended, color:'#EF4444' },
        ].map(st => (
          <div key={st.label} style={s.statCard} onClick={() => setFilter(st.label.toLowerCase())}>
            <div style={{ ...s.statVal, color: st.color }}>{st.value}</div>
            <div style={s.statLbl}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={s.filterRow}>
        <input style={s.search} placeholder="Search organisation name..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={s.chips}>
          {['all','trial','active','expired','suspended'].map(f => (
            <button key={f} style={{ ...s.chip, ...(filter===f ? s.chipOn : {}) }} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? <LoadingRows /> : (
        <div style={s.table}>
          <div style={s.thead}>
            <div style={{ ...s.th, flex:2 }}>Organisation</div>
            <div style={s.th}>Plan</div>
            <div style={s.th}>Trial Ends</div>
            <div style={s.th}>Patients</div>
            <div style={s.th}>Staff</div>
            <div style={s.th}>Status</div>
            <div style={s.th}>Actions</div>
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'#6B7280', fontSize:'0.8rem' }}>No organisations found</div>
          ) : filtered.map(org => {
            const status = getStatus(org);
            const daysLeft = Math.ceil((new Date(org.trial_ends_at) - new Date()) / 86400000);
            return (
              <div key={org.id} style={s.trow}>
                <div style={{ ...s.td, flex:2 }}>
                  <div style={s.orgName}>{org.name}</div>
                  <div style={s.orgMeta}>Created {new Date(org.created_at).toLocaleDateString()}</div>
                </div>
                <div style={s.td}><span style={s.planBadge}>{org.plan}</span></div>
                <div style={s.td}>
                  <div style={{ fontSize:'0.72rem', color: daysLeft <= 0 ? '#EF4444' : daysLeft <= 3 ? '#F59E0B' : '#374151' }}>
                    {org.plan === 'trial' ? (daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`) : '—'}
                  </div>
                </div>
                <div style={s.td}><span style={s.countBadge}>{org.counts.patients}</span></div>
                <div style={s.td}><span style={s.countBadge}>{org.counts.dietitians + org.counts.admins}</span></div>
                <div style={s.td}><StatusBadge status={status} /></div>
                <div style={s.td}>
                  <div style={s.actionBtns}>
                    <button style={s.actBtn} onClick={() => setAction({ type:'extend', org })}>+Days</button>
                    {org.is_active
                      ? <button style={{ ...s.actBtn, color:'#EF4444' }} onClick={() => setAction({ type:'suspend', org })}>Suspend</button>
                      : <button style={{ ...s.actBtn, color:'#10B981' }} onClick={() => reinstateOrg(org)}>Reinstate</button>
                    }
                    <button style={{ ...s.actBtn, color:'#6366F1' }} onClick={() => router.push(`/admin/users?org=${org.id}`)}>Users</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Extend Trial */}
      {action?.type === 'extend' && (
        <Modal title={`Extend Trial — ${action.org.name}`} onClose={() => setAction(null)}>
          <p style={s.modalSub}>Current trial ends: {new Date(action.org.trial_ends_at).toLocaleDateString()}</p>
          <div style={s.dayBtns}>
            {[3,7,14,30].map(d => (
              <button key={d} style={s.dayBtn} onClick={() => extendTrial(action.org, d)}>+{d} days</button>
            ))}
          </div>
        </Modal>
      )}

      {/* MODAL: Suspend */}
      {action?.type === 'suspend' && (
        <SuspendModal
          title={`Suspend — ${action.org.name}`}
          onClose={() => setAction(null)}
          onConfirm={(reason) => suspendOrg(action.org, reason)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    trial:     { bg:'#EEF2FF', color:'#4338CA', label:'Trial' },
    active:    { bg:'#D1FAE5', color:'#065F46', label:'Active' },
    expired:   { bg:'#FEF3C7', color:'#92400E', label:'Expired' },
    suspended: { bg:'#FEE2E2', color:'#991B1B', label:'Suspended' },
  };
  const c = map[status] || map.active;
  return <span style={{ background:c.bg, color:c.color, padding:'3px 10px', borderRadius:20, fontSize:'0.62rem', fontWeight:700 }}>{c.label}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <span style={s.modalTitle}>{title}</span>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SuspendModal({ title, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <Modal title={title} onClose={onClose}>
      <p style={s.modalSub}>This will block all logins for this organisation. Data is preserved.</p>
      <label style={s.lbl}>Reason for suspension</label>
      <textarea style={s.textarea} rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Non-payment, violation of terms..." />
      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
        <button style={s.dangerBtn} onClick={() => reason.trim() && onConfirm(reason)}>Confirm Suspend</button>
      </div>
    </Modal>
  );
}

function LoadingRows() {
  return <div style={{ padding:'40px', textAlign:'center', color:'#6B7280', fontSize:'0.8rem' }}>Loading organisations…</div>;
}

const s = {
  page:       { padding:'20px 16px', maxWidth:1100, margin:'0 auto' },
  header:     { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
  h1:         { fontFamily:'Sora,sans-serif', fontSize:'1.4rem', fontWeight:800, color:'#111827', marginBottom:2 },
  sub:        { fontSize:'0.72rem', color:'#6B7280' },
  statsRow:   { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:16 },
  statCard:   { background:'#fff', borderRadius:12, padding:'12px', border:'1px solid #E5E7EB', textAlign:'center', cursor:'pointer' },
  statVal:    { fontFamily:'Sora,sans-serif', fontSize:'1.4rem', fontWeight:800, lineHeight:1 },
  statLbl:    { fontSize:'0.6rem', color:'#6B7280', marginTop:3 },
  filterRow:  { marginBottom:14 },
  search:     { width:'100%', padding:'9px 13px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.8rem', fontFamily:'Inter,sans-serif', outline:'none', marginBottom:8, boxSizing:'border-box', color:'#111827' },
  chips:      { display:'flex', gap:6, flexWrap:'wrap' },
  chip:       { padding:'5px 14px', border:'1.5px solid #E5E7EB', borderRadius:20, fontSize:'0.65rem', fontWeight:600, color:'#6B7280', background:'#fff', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  chipOn:     { background:'#111827', color:'#fff', borderColor:'#111827' },
  table:      { background:'#fff', borderRadius:14, border:'1px solid #E5E7EB', overflow:'hidden' },
  thead:      { display:'flex', padding:'10px 16px', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' },
  th:         { flex:1, fontSize:'0.65rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em' },
  trow:       { display:'flex', padding:'12px 16px', borderBottom:'1px solid #F3F4F6', alignItems:'center' },
  td:         { flex:1, fontSize:'0.74rem', color:'#374151' },
  orgName:    { fontWeight:600, color:'#111827', fontSize:'0.78rem' },
  orgMeta:    { fontSize:'0.62rem', color:'#9CA3AF', marginTop:1 },
  planBadge:  { background:'#F3F4F6', color:'#374151', padding:'2px 8px', borderRadius:20, fontSize:'0.6rem', fontWeight:600, textTransform:'capitalize' },
  countBadge: { background:'#EEF2FF', color:'#4338CA', padding:'2px 8px', borderRadius:20, fontSize:'0.66rem', fontWeight:700 },
  actionBtns: { display:'flex', gap:6, flexWrap:'wrap' },
  actBtn:     { background:'none', border:'1px solid #E5E7EB', borderRadius:7, padding:'4px 10px', fontSize:'0.64rem', fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  overlay:    { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  modal:      { background:'#fff', borderRadius:16, padding:'24px', width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' },
  modalHeader:{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  modalTitle: { fontFamily:'Sora,sans-serif', fontSize:'0.9rem', fontWeight:800, color:'#111827' },
  modalClose: { background:'none', border:'none', cursor:'pointer', fontSize:'1rem', color:'#6B7280' },
  modalSub:   { fontSize:'0.74rem', color:'#6B7280', marginBottom:14 },
  dayBtns:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 },
  dayBtn:     { padding:'10px', background:'linear-gradient(135deg,#6366F1,#4338CA)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:'0.8rem', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  lbl:        { display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:5 },
  textarea:   { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.78rem', fontFamily:'Inter,sans-serif', resize:'vertical', outline:'none', boxSizing:'border-box' },
  cancelBtn:  { flex:1, padding:'9px', background:'#F3F4F6', border:'none', borderRadius:10, fontWeight:600, fontSize:'0.78rem', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  dangerBtn:  { flex:1, padding:'9px', background:'#EF4444', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:'0.78rem', cursor:'pointer', fontFamily:'Inter,sans-serif' },
};
