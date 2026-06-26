// pages/admin/backup.js — NEW FILE
// Super admin only — export full data, view notification log, manage super admins

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import RoleGuard from '../../components/RoleGuard';
import { getSupabase } from '../../lib/supabase';
const supabase = getSupabase();

export default function AdminBackupPage() {
  return (
    <RoleGuard allow={['super_admin']}>
      <Layout>
        <BackupView />
      </Layout>
    </RoleGuard>
  );
}

function BackupView() {
  const [tab,          setTab]          = useState('backup');   // backup | notifications | admins
  const [exporting,    setExporting]    = useState(false);
  const [exportDone,   setExportDone]   = useState(false);
  const [notifLogs,    setNotifLogs]    = useState([]);
  const [auditLogs,    setAuditLogs]    = useState([]);
  const [superAdmins,  setSuperAdmins]  = useState([]);
  const [newAdminEmail,setNewAdminEmail]= useState('');
  const [addingAdmin,  setAddingAdmin]  = useState(false);
  const [adminMsg,     setAdminMsg]     = useState('');
  const [loadingTab,   setLoadingTab]   = useState(false);

  useEffect(() => { loadTab(tab); }, [tab]);

  async function loadTab(t) {
    setLoadingTab(true);
    if (t === 'notifications') {
      const { data: nlogs } = await supabase.from('notification_log').select('*').order('created_at', { ascending: false }).limit(100);
      const { data: alogs } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50);
      setNotifLogs(nlogs || []);
      setAuditLogs(alogs || []);
    }
    if (t === 'admins') {
      const { data } = await supabase.from('super_admins').select('*, profiles!super_admins_user_id_fkey(full_name, email)').order('added_at');
      setSuperAdmins(data || []);
    }
    setLoadingTab(false);
  }

  async function exportFullData() {
    setExporting(true);
    setExportDone(false);

    const tables = ['profiles', 'health_logs', 'organisations', 'organisation_members', 'meal_templates'];
    const allData = {};

    for (const table of tables) {
      const { data } = await supabase.from(table).select('*');
      allData[table] = data || [];
    }

    // Convert each table to CSV and zip into one download
    for (const [table, rows] of Object.entries(allData)) {
      if (rows.length === 0) continue;
      const headers = Object.keys(rows[0]).join(',');
      const csvRows = rows.map(r =>
        Object.values(r).map(v =>
          v === null ? '' : typeof v === 'object' ? JSON.stringify(v).replace(/,/g, ';') : String(v).replace(/,/g, ';')
        ).join(',')
      );
      const csv  = headers + '\n' + csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `vitalog-backup-${table}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      await new Promise(r => setTimeout(r, 300)); // small delay between downloads
    }

    await supabase.from('audit_log').insert({ action: 'full_backup_export', target_type: 'system', metadata: { tables } });
    setExporting(false);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 5000);
  }

  async function addSuperAdmin() {
    setAdminMsg('');
    setAddingAdmin(true);
    // Look up user by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', newAdminEmail.trim().toLowerCase())
      .single();

    if (!profile) { setAdminMsg('No user found with that email. They must have an account first.'); setAddingAdmin(false); return; }

    const { error } = await supabase.from('super_admins').insert({ user_id: profile.id });
    if (error) { setAdminMsg(error.message.includes('duplicate') ? 'This user is already a super admin.' : error.message); setAddingAdmin(false); return; }

    await supabase.from('audit_log').insert({ action: 'add_super_admin', target_type: 'user', target_id: profile.id });
    setAdminMsg(`✅ ${profile.full_name} is now a super admin.`);
    setNewAdminEmail('');
    setAddingAdmin(false);
    loadTab('admins');
  }

  async function removeSuperAdmin(userId) {
    await supabase.from('super_admins').delete().eq('user_id', userId);
    await supabase.from('audit_log').insert({ action: 'remove_super_admin', target_type: 'user', target_id: userId });
    loadTab('admins');
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Backup & Settings</h1>
      <p style={s.sub}>Data exports, notification history, and super admin management</p>

      {/* Tabs */}
      <div style={s.tabs}>
        {[['backup','💾 Backup'], ['notifications','📧 Notifications'], ['admins','👑 Super Admins']].map(([id, label]) => (
          <button key={id} style={{ ...s.tab, ...(tab===id ? s.tabOn : {}) }} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {/* ── BACKUP TAB ── */}
      {tab === 'backup' && (
        <div>
          <div style={s.card}>
            <h2 style={s.h2}>Full Database Export</h2>
            <p style={s.cardSub}>Downloads CSV files for: profiles, health_logs, organisations, organisation_members, meal_templates. Each table downloads as a separate file.</p>
            {exportDone && <div style={s.success}>✅ Export complete — check your downloads folder.</div>}
            <button style={{ ...s.primaryBtn, opacity: exporting ? 0.7 : 1 }} onClick={exportFullData} disabled={exporting}>
              {exporting ? '⏳ Exporting tables…' : '💾 Export All Data (CSV)'}
            </button>
          </div>

          <div style={s.card}>
            <h2 style={s.h2}>Supabase Backups</h2>
            <p style={s.cardSub}>Supabase Pro plan includes automatic daily backups with 7-day point-in-time restore. To access:</p>
            <ol style={{ fontSize:'0.76rem', color:'#374151', lineHeight:2, paddingLeft:20 }}>
              <li>Go to Supabase Dashboard</li>
              <li>Settings → Database → Backups</li>
              <li>Select date → Restore or Download</li>
            </ol>
            <div style={s.noteBox}>⚠️ Upgrade Supabase to Pro plan before launch to enable daily backups.</div>
          </div>

          <div style={s.card}>
            <h2 style={s.h2}>GDPR Data Retention Policy</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                ['Active users', 'Data retained indefinitely while account is active'],
                ['Soft-deleted users', 'Data retained for 90 days after deletion request, then auto-purged'],
                ['Hard delete (GDPR)', 'All data purged immediately on request — irreversible'],
                ['Export on request', 'Any user can request their data from Profile → Settings'],
              ].map(([title, desc]) => (
                <div key={title} style={s.policyRow}>
                  <div style={s.policyTitle}>{title}</div>
                  <div style={s.policyDesc}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {tab === 'notifications' && (
        <div>
          <div style={s.card}>
            <h2 style={s.h2}>Email Log</h2>
            {loadingTab ? <p style={s.cardSub}>Loading…</p> : notifLogs.length === 0 ? (
              <p style={s.cardSub}>No emails sent yet. Resend API integration will populate this.</p>
            ) : (
              <div style={s.logTable}>
                <div style={s.logHead}>
                  <div style={s.logTh}>To</div>
                  <div style={s.logTh}>Template</div>
                  <div style={s.logTh}>Status</div>
                  <div style={s.logTh}>Sent</div>
                </div>
                {notifLogs.map((n, i) => (
                  <div key={i} style={s.logRow}>
                    <div style={s.logTd}>{n.to_email}</div>
                    <div style={s.logTd}>{n.template}</div>
                    <div style={s.logTd}><span style={{ color: n.status==='sent' ? '#10B981' : n.status==='failed' ? '#EF4444' : '#6B7280', fontWeight:700, fontSize:'0.65rem' }}>{n.status}</span></div>
                    <div style={s.logTd}>{n.sent_at ? new Date(n.sent_at).toLocaleString() : '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={s.card}>
            <h2 style={s.h2}>Audit Log</h2>
            {loadingTab ? <p style={s.cardSub}>Loading…</p> : auditLogs.length === 0 ? (
              <p style={s.cardSub}>No audit entries yet.</p>
            ) : (
              <div style={s.logTable}>
                <div style={s.logHead}>
                  <div style={s.logTh}>Action</div>
                  <div style={s.logTh}>Target</div>
                  <div style={s.logTh}>When</div>
                </div>
                {auditLogs.map((a, i) => (
                  <div key={i} style={s.logRow}>
                    <div style={s.logTd}><span style={{ fontWeight:600, color:'#374151' }}>{a.action}</span></div>
                    <div style={s.logTd}>{a.target_type} {a.target_id?.slice(0,8)}…</div>
                    <div style={s.logTd}>{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUPER ADMINS TAB ── */}
      {tab === 'admins' && (
        <div>
          <div style={s.card}>
            <h2 style={s.h2}>Super Admins</h2>
            <p style={s.cardSub}>All super admins receive signup alerts, trial expiry emails, and payment notifications. They can manage all organisations and users.</p>

            {loadingTab ? <p style={s.cardSub}>Loading…</p> : (
              <div style={{ marginBottom:20 }}>
                {superAdmins.map((sa, i) => (
                  <div key={i} style={s.adminRow}>
                    <div style={s.adminAvatar}>{(sa.profiles?.full_name||sa.profiles?.email||'?').charAt(0).toUpperCase()}</div>
                    <div style={{ flex:1 }}>
                      <div style={s.adminName}>{sa.profiles?.full_name || '—'}</div>
                      <div style={s.adminEmail}>{sa.profiles?.email || '—'}</div>
                    </div>
                    <div style={s.adminDate}>Since {new Date(sa.added_at).toLocaleDateString()}</div>
                    {superAdmins.length > 1 && (
                      <button style={s.removeBtn} onClick={() => removeSuperAdmin(sa.user_id)}>Remove</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={s.addAdminBox}>
              <h3 style={s.h3}>Add Super Admin</h3>
              <p style={s.cardSub}>The person must already have a VitaLog account.</p>
              {adminMsg && <div style={{ ...s.noteBox, background: adminMsg.startsWith('✅') ? '#F0FDF4' : '#FEF2F2', borderColor: adminMsg.startsWith('✅') ? '#A7F3D0' : '#FECACA', color: adminMsg.startsWith('✅') ? '#065F46' : '#DC2626' }}>{adminMsg}</div>}
              <div style={{ display:'flex', gap:8 }}>
                <input
                  style={{ ...s.inp, flex:1, margin:0 }}
                  type="email"
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                  placeholder="Email address of new super admin"
                />
                <button
                  style={{ ...s.primaryBtn, width:'auto', padding:'9px 18px', opacity: addingAdmin ? 0.7 : 1 }}
                  onClick={addSuperAdmin}
                  disabled={addingAdmin || !newAdminEmail.trim()}
                >
                  {addingAdmin ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:        { padding:'20px 16px', maxWidth:900, margin:'0 auto' },
  h1:          { fontFamily:'Sora,sans-serif', fontSize:'1.4rem', fontWeight:800, color:'#111827', marginBottom:4 },
  h2:          { fontFamily:'Sora,sans-serif', fontSize:'0.95rem', fontWeight:700, color:'#111827', marginBottom:6 },
  h3:          { fontFamily:'Sora,sans-serif', fontSize:'0.82rem', fontWeight:700, color:'#374151', marginBottom:4 },
  sub:         { fontSize:'0.72rem', color:'#6B7280', marginBottom:20 },
  tabs:        { display:'flex', gap:4, background:'#F3F4F6', padding:4, borderRadius:12, marginBottom:20 },
  tab:         { flex:1, padding:'8px 4px', border:'none', background:'none', borderRadius:9, fontSize:'0.72rem', fontWeight:600, color:'#6B7280', cursor:'pointer', fontFamily:'Inter,sans-serif', textAlign:'center' },
  tabOn:       { background:'#fff', color:'#111827', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' },
  card:        { background:'#fff', borderRadius:14, padding:'20px', border:'1px solid #E5E7EB', marginBottom:12 },
  cardSub:     { fontSize:'0.74rem', color:'#6B7280', marginBottom:14, lineHeight:1.6 },
  success:     { background:'#F0FDF4', border:'1px solid #A7F3D0', color:'#065F46', borderRadius:10, padding:'10px 14px', fontSize:'0.76rem', marginBottom:14 },
  primaryBtn:  { width:'100%', padding:'11px', background:'linear-gradient(135deg,#6366F1,#4338CA)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:'0.82rem', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  noteBox:     { background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:9, padding:'10px 12px', fontSize:'0.72rem', color:'#92400E', marginTop:12 },
  policyRow:   { padding:'10px 12px', background:'#F9FAFB', borderRadius:9, border:'1px solid #E5E7EB' },
  policyTitle: { fontSize:'0.74rem', fontWeight:700, color:'#111827', marginBottom:2 },
  policyDesc:  { fontSize:'0.68rem', color:'#6B7280' },
  logTable:    { border:'1px solid #E5E7EB', borderRadius:10, overflow:'hidden' },
  logHead:     { display:'grid', gridTemplateColumns:'2fr 1.5fr 0.8fr 1.5fr', padding:'8px 12px', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' },
  logTh:       { fontSize:'0.62rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase' },
  logRow:      { display:'grid', gridTemplateColumns:'2fr 1.5fr 0.8fr 1.5fr', padding:'9px 12px', borderBottom:'1px solid #F3F4F6' },
  logTd:       { fontSize:'0.7rem', color:'#374151' },
  adminRow:    { display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #F3F4F6' },
  adminAvatar: { width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#1E1B4B,#4338CA)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', fontWeight:700, flexShrink:0 },
  adminName:   { fontSize:'0.78rem', fontWeight:600, color:'#111827' },
  adminEmail:  { fontSize:'0.64rem', color:'#6B7280' },
  adminDate:   { fontSize:'0.62rem', color:'#9CA3AF' },
  removeBtn:   { fontSize:'0.65rem', fontWeight:600, color:'#EF4444', background:'none', border:'1px solid #FECACA', borderRadius:7, padding:'4px 10px', cursor:'pointer', fontFamily:'Inter,sans-serif' },
  addAdminBox: { background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:11, padding:'14px', marginTop:4 },
  inp:         { padding:'9px 12px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.8rem', fontFamily:'Inter,sans-serif', outline:'none', color:'#111827', background:'#fff' },
};
