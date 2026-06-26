// pages/admin/users.js — NEW FILE
// Super admin only — view all users, suspend, reinstate, soft delete, export data

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import RoleGuard from '../../components/RoleGuard';
import { getSupabase } from '../../lib/supabase';
const supabase = getSupabase();

export default function AdminUsersPage() {
  return (
    <RoleGuard allow={['super_admin']}>
      <Layout>
        <AdminUsersView />
      </Layout>
    </RoleGuard>
  );
}

function AdminUsersView() {
  const router = useRouter();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all'); // all | active | suspended | deleted
  const [roleFilter, setRoleFilter] = useState('all');
  const [action,  setAction]  = useState(null); // { type, user }
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    const orgFilter = router.query.org;
    loadUsers(orgFilter);
  }, [router.query.org]);

  async function loadUsers(orgId) {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select(`
        id, full_name, email, role, status, status_reason, deleted_at, created_at,
        organisation_members(role, org_id, organisations(name))
      `)
      .order('created_at', { ascending: false });

    if (orgId) {
      query = supabase
        .from('organisation_members')
        .select(`
          role, org_id,
          profiles!inner(id, full_name, email, status, status_reason, created_at)
        `)
        .eq('org_id', orgId)
        .eq('is_active', true);
    }

    const { data } = await query;
    setUsers(data || []);
    setLoading(false);
  }

  async function suspendUser(user, reason) {
    await supabase.from('profiles').update({ status: 'suspended', status_reason: reason }).eq('id', user.id);
    await supabase.from('user_status_log').insert({ user_id: user.id, status: 'suspended', reason });
    await supabase.from('audit_log').insert({ action: 'suspend_user', target_type: 'user', target_id: user.id, metadata: { reason } });
    setAction(null);
    loadUsers(router.query.org);
  }

  async function reinstateUser(user) {
    await supabase.from('profiles').update({ status: 'active', status_reason: null }).eq('id', user.id);
    await supabase.from('user_status_log').insert({ user_id: user.id, status: 'active', reason: 'Reinstated by super admin' });
    await supabase.from('audit_log').insert({ action: 'reinstate_user', target_type: 'user', target_id: user.id });
    loadUsers(router.query.org);
  }

  async function softDeleteUser(user) {
    await supabase.from('profiles').update({ status: 'soft_deleted', deleted_at: new Date().toISOString() }).eq('id', user.id);
    await supabase.from('user_status_log').insert({ user_id: user.id, status: 'soft_deleted', reason: 'Deleted by super admin' });
    await supabase.from('audit_log').insert({ action: 'soft_delete_user', target_type: 'user', target_id: user.id });
    // Deactivate all org memberships
    await supabase.from('organisation_members').update({ is_active: false }).eq('user_id', user.id);
    setAction(null);
    loadUsers(router.query.org);
  }

  async function exportUserData(user) {
    // Fetch all data for this user
    const [{ data: profile }, { data: logs }, { data: weights }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('health_logs').select('*').eq('user_id', user.id).order('date'),
      supabase.from('weight_logs').select('*').eq('user_id', user.id).order('date'),
    ]);

    // Build CSV for health logs
    const logHeaders = 'date,calories,protein,carbs,fat,fibre,water_ml,walk_count,walk_minutes,weight_kg';
    const logRows = (logs || []).map(l =>
      `${l.date},${l.total_calories||0},${l.total_protein||0},${l.total_carbs||0},${l.total_fat||0},${l.total_fibre||0},${l.total_water_ml||0},${l.walk_count||0},${l.walk_minutes||0},${l.weight_kg||''}`
    );
    const csvContent = logHeaders + '\n' + logRows.join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `vitalog-export-${user.email}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // Log the export
    await supabase.from('audit_log').insert({ action: 'export_user_data', target_type: 'user', target_id: user.id });
    setAction(null);
  }

  const filtered = users.filter(u => {
    const userData = u.profiles || u;
    const name  = userData.full_name || '';
    const email = userData.email || '';
    const status = userData.status || 'active';
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>
            {router.query.org ? '← ' : ''}Users
            {router.query.org && <button style={s.backBtn} onClick={() => router.push('/admin/orgs')}>Back to Orgs</button>}
          </h1>
          <p style={s.sub}>{users.length} total users</p>
        </div>
      </div>

      {/* Search + filters */}
      <div style={s.filterRow}>
        <input style={s.search} placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={s.chips}>
          {['all','active','suspended','soft_deleted'].map(f => (
            <button key={f} style={{ ...s.chip, ...(filter===f ? s.chipOn : {}) }} onClick={() => setFilter(f)}>
              {f === 'soft_deleted' ? 'Deleted' : f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* User list */}
      {loading ? (
        <div style={{ padding:'40px', textAlign:'center', color:'#6B7280' }}>Loading users…</div>
      ) : (
        <div style={s.table}>
          <div style={s.thead}>
            <div style={{ ...s.th, flex:2 }}>User</div>
            <div style={s.th}>Role</div>
            <div style={s.th}>Organisation</div>
            <div style={s.th}>Joined</div>
            <div style={s.th}>Status</div>
            <div style={s.th}>Actions</div>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding:'40px', textAlign:'center', color:'#6B7280', fontSize:'0.8rem' }}>No users found</div>
          ) : filtered.map((u, i) => {
            const userData = u.profiles || u;
            const memData  = u.organisation_members?.[0] || {};
            const orgName  = memData.organisations?.name || u.organisations?.name || '—';
            const role     = memData.role || u.role || userData.role || '—';
            const status   = userData.status || 'active';
            const initials = (userData.full_name || userData.email || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

            return (
              <div key={i} style={s.trow}>
                <div style={{ ...s.td, flex:2, display:'flex', alignItems:'center', gap:10 }}>
                  <div style={s.avatar}>{initials}</div>
                  <div>
                    <div style={s.userName}>{userData.full_name || 'Unnamed'}</div>
                    <div style={s.userEmail}>{userData.email}</div>
                  </div>
                </div>
                <div style={s.td}><RoleBadge role={role} /></div>
                <div style={s.td}><span style={{ fontSize:'0.72rem', color:'#374151' }}>{orgName}</span></div>
                <div style={s.td}><span style={{ fontSize:'0.68rem', color:'#6B7280' }}>{new Date(userData.created_at).toLocaleDateString()}</span></div>
                <div style={s.td}><StatusBadge status={status} /></div>
                <div style={s.td}>
                  <div style={s.actionBtns}>
                    <button style={s.actBtn} onClick={() => setAction({ type:'export', user: userData })}>Export</button>
                    {status === 'active' && <button style={{ ...s.actBtn, color:'#F59E0B' }} onClick={() => setAction({ type:'suspend', user: userData })}>Suspend</button>}
                    {status === 'suspended' && <button style={{ ...s.actBtn, color:'#10B981' }} onClick={() => reinstateUser(userData)}>Reinstate</button>}
                    {status !== 'soft_deleted' && <button style={{ ...s.actBtn, color:'#EF4444' }} onClick={() => setAction({ type:'delete', user: userData })}>Delete</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Suspend user */}
      {action?.type === 'suspend' && (
        <SuspendModal
          title={`Suspend — ${action.user.full_name || action.user.email}`}
          sub="User will be blocked from logging in. Their data is preserved."
          onClose={() => setAction(null)}
          onConfirm={reason => suspendUser(action.user, reason)}
        />
      )}

      {/* MODAL: Export */}
      {action?.type === 'export' && (
        <Modal title={`Export Data — ${action.user.full_name || action.user.email}`} onClose={() => setAction(null)}>
          <p style={s.modalSub}>This will download a CSV of all health logs for this user. The link is generated instantly.</p>
          <button style={s.primaryBtn} onClick={() => exportUserData(action.user)}>Download CSV Export</button>
        </Modal>
      )}

      {/* MODAL: Delete */}
      {action?.type === 'delete' && (
        <Modal title={`Delete — ${action.user.full_name || action.user.email}`} onClose={() => { setAction(null); setDeleteConfirm(''); }}>
          <p style={s.modalSub}>This will soft-delete the account. Data is retained for 90 days then permanently purged. The user cannot log in.</p>
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 12px', fontSize:'0.72rem', color:'#991B1B', marginBottom:14 }}>
            ⚠️ Type <strong>DELETE</strong> below to confirm
          </div>
          <input
            style={s.confirmInput}
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE to confirm"
          />
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button style={s.cancelBtn} onClick={() => { setAction(null); setDeleteConfirm(''); }}>Cancel</button>
            <button
              style={{ ...s.dangerBtn, opacity: deleteConfirm === 'DELETE' ? 1 : 0.4 }}
              disabled={deleteConfirm !== 'DELETE'}
              onClick={() => softDeleteUser(action.user)}
            >
              Confirm Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RoleBadge({ role }) {
  const map = {
    super_admin: { bg:'#1E1B4B', color:'#fff' },
    org_admin:   { bg:'#D1FAE5', color:'#065F46' },
    dietitian:   { bg:'#DBEAFE', color:'#1E40AF' },
    patient:     { bg:'#F3F4F6', color:'#374151' },
  };
  const c = map[role] || map.patient;
  return <span style={{ background:c.bg, color:c.color, padding:'2px 8px', borderRadius:20, fontSize:'0.6rem', fontWeight:700 }}>{role || '—'}</span>;
}

function StatusBadge({ status }) {
  const map = {
    active:       { bg:'#D1FAE5', color:'#065F46', label:'Active' },
    suspended:    { bg:'#FEE2E2', color:'#991B1B', label:'Suspended' },
    soft_deleted: { bg:'#F3F4F6', color:'#6B7280', label:'Deleted' },
  };
  const c = map[status] || map.active;
  return <span style={{ background:c.bg, color:c.color, padding:'3px 8px', borderRadius:20, fontSize:'0.6rem', fontWeight:700 }}>{c.label}</span>;
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

function SuspendModal({ title, sub, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <Modal title={title} onClose={onClose}>
      <p style={s.modalSub}>{sub}</p>
      <label style={s.lbl}>Reason</label>
      <textarea style={s.textarea} rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for suspension..." />
      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
        <button style={{ ...s.dangerBtn, opacity: reason.trim() ? 1 : 0.4 }} disabled={!reason.trim()} onClick={() => onConfirm(reason)}>
          Confirm Suspend
        </button>
      </div>
    </Modal>
  );
}

const s = {
  page:        { padding:'20px 16px', maxWidth:1100, margin:'0 auto' },
  header:      { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
  h1:          { fontFamily:'Sora,sans-serif', fontSize:'1.4rem', fontWeight:800, color:'#111827', marginBottom:2, display:'flex', alignItems:'center', gap:12 },
  sub:         { fontSize:'0.72rem', color:'#6B7280' },
  backBtn:     { fontSize:'0.72rem', fontWeight:600, color:'#6366F1', background:'none', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  filterRow:   { marginBottom:14 },
  search:      { width:'100%', padding:'9px 13px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.8rem', fontFamily:'Inter,sans-serif', outline:'none', marginBottom:8, boxSizing:'border-box', color:'#111827' },
  chips:       { display:'flex', gap:6, flexWrap:'wrap' },
  chip:        { padding:'5px 14px', border:'1.5px solid #E5E7EB', borderRadius:20, fontSize:'0.65rem', fontWeight:600, color:'#6B7280', background:'#fff', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  chipOn:      { background:'#111827', color:'#fff', borderColor:'#111827' },
  table:       { background:'#fff', borderRadius:14, border:'1px solid #E5E7EB', overflow:'hidden' },
  thead:       { display:'flex', padding:'10px 16px', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' },
  th:          { flex:1, fontSize:'0.65rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em' },
  trow:        { display:'flex', padding:'12px 16px', borderBottom:'1px solid #F3F4F6', alignItems:'center' },
  td:          { flex:1, fontSize:'0.74rem', color:'#374151' },
  avatar:      { width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:700, flexShrink:0 },
  userName:    { fontWeight:600, color:'#111827', fontSize:'0.76rem' },
  userEmail:   { fontSize:'0.62rem', color:'#9CA3AF', marginTop:1 },
  actionBtns:  { display:'flex', gap:5, flexWrap:'wrap' },
  actBtn:      { background:'none', border:'1px solid #E5E7EB', borderRadius:7, padding:'4px 9px', fontSize:'0.63rem', fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  overlay:     { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  modal:       { background:'#fff', borderRadius:16, padding:'24px', width:'100%', maxWidth:420 },
  modalHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  modalTitle:  { fontFamily:'Sora,sans-serif', fontSize:'0.9rem', fontWeight:800, color:'#111827' },
  modalClose:  { background:'none', border:'none', cursor:'pointer', fontSize:'1rem', color:'#6B7280' },
  modalSub:    { fontSize:'0.74rem', color:'#6B7280', marginBottom:14, lineHeight:1.5 },
  lbl:         { display:'block', fontSize:'0.72rem', fontWeight:600, color:'#374151', marginBottom:5 },
  textarea:    { width:'100%', padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.78rem', fontFamily:'Inter,sans-serif', resize:'vertical', outline:'none', boxSizing:'border-box' },
  confirmInput:{ width:'100%', padding:'9px 12px', border:'1.5px solid #FECACA', borderRadius:10, fontSize:'0.78rem', fontFamily:'Inter,sans-serif', outline:'none', boxSizing:'border-box' },
  cancelBtn:   { flex:1, padding:'9px', background:'#F3F4F6', border:'none', borderRadius:10, fontWeight:600, fontSize:'0.78rem', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  dangerBtn:   { flex:1, padding:'9px', background:'#EF4444', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:'0.78rem', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  primaryBtn:  { width:'100%', padding:'11px', background:'linear-gradient(135deg,#6366F1,#4338CA)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:'0.8rem', cursor:'pointer', fontFamily:'Inter,sans-serif' },
};
