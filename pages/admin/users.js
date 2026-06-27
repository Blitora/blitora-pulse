// pages/admin/users.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import RoleGuard from '../../components/RoleGuard';
import { getSupabase } from '../../lib/supabase';

const CONDITIONS=[
  {key:"diabetic",label:"Diabetes"},{key:"hypertension",label:"Hypertension / High BP"},
  {key:"cholesterol",label:"High Cholesterol"},{key:"thyroid",label:"Thyroid"},
  {key:"pcod",label:"PCOD / PCOS"},{key:"piles",label:"Piles"},{key:"kidney",label:"Kidney issues"},
  {key:"heart",label:"Heart condition"},{key:"obesity",label:"Obesity"},
  {key:"arthritis",label:"Arthritis"},{key:"digestive",label:"Digestive issues"},
  {key:"none",label:"No conditions"},
];
const ACTIVITY_LEVELS=[
  {val:"sedentary",label:"Sedentary"},{val:"light",label:"Lightly active"},
  {val:"moderate",label:"Moderately active"},{val:"active",label:"Very active"},
];
const CUISINES=["Indian (North)","Indian (South)","Continental","Mixed / No preference"];

export default function AdminUsersPage() {
  return (
    <RoleGuard allow={['super_admin']}>
      <Layout><AdminUsersView /></Layout>
    </RoleGuard>
  );
}

function AdminUsersView() {
  const router = useRouter();
  const [users,     setUsers]     = useState([]);
  const [members,   setMembers]   = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('all');
  const [action,    setAction]    = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => { loadAll(); }, [router.query.org]);

  async function loadAll() {
    setLoading(true);
    const sb = getSupabase();
    const orgId = router.query.org;
    const [
      { data: profileData },
      { data: memberData },
      { data: templateData },
    ] = await Promise.all([
      sb.from('profiles').select('*').order('created_at', { ascending: false }),
      sb.from('organisation_members').select('user_id, role, org_id, organisations(id, name)').eq('is_active', true),
      sb.from('meal_templates').select('id, name').order('name'),
    ]);
    let profiles = profileData || [];
    if (orgId) {
      const ids = new Set((memberData || []).filter(m => m.org_id === orgId).map(m => m.user_id));
      profiles = profiles.filter(p => ids.has(p.id));
    }
    setUsers(profiles);
    setMembers(memberData || []);
    setTemplates(templateData || []);
    setLoading(false);
  }

  function getMember(userId) { return members.find(m => m.user_id === userId); }

  async function saveUserEdit(user, form) {
    const sb = getSupabase();
    await sb.from('profiles').update({
      full_name:          form.full_name,
      dob:                form.dob || null,
      gender:             form.gender || null,
      height_cm:          form.height_cm ? +form.height_cm : null,
      weight_start:       form.weight_start ? +form.weight_start : null,
      weight_current:     form.weight_current ? +form.weight_current : null,
      weight_target:      form.weight_target ? +form.weight_target : null,
      activity_level:     form.activity_level || null,
      conditions:         form.conditions || {},
      allergies:          form.allergies || null,
      medications:        form.medications || null,
      diet_type:          form.diet_type || null,
      preferred_cuisine:  form.preferred_cuisine || null,
      meals_per_day:      form.meals_per_day ? +form.meals_per_day : 6,
      water_target:       form.water_target ? +form.water_target : 3.5,
      calorie_target:     form.calorie_target ? +form.calorie_target : 1600,
      protein_target:     form.protein_target ? +form.protein_target : 100,
      carb_target:        form.carb_target ? +form.carb_target : 130,
      fat_target:         form.fat_target ? +form.fat_target : 55,
      active_template_id: form.active_template_id || null,
    }).eq('id', user.id);

    const mem = getMember(user.id);
    if (mem && form.member_role && form.member_role !== mem.role) {
      await sb.from('organisation_members').update({ role: form.member_role })
        .eq('user_id', user.id).eq('org_id', mem.org_id);
    }
    await sb.from('audit_log').insert({ action:'edit_user', target_type:'user', target_id:user.id, metadata:{ changes:form } }).catch(()=>{});
    setAction(null);
    loadAll();
  }

  async function suspendUser(user, reason) {
    const sb = getSupabase();
    await sb.from('profiles').update({ status:'suspended', status_reason:reason }).eq('id', user.id);
    await sb.from('user_status_log').insert({ user_id:user.id, status:'suspended', reason }).catch(()=>{});
    await sb.from('audit_log').insert({ action:'suspend_user', target_type:'user', target_id:user.id, metadata:{ reason } }).catch(()=>{});
    setAction(null); loadAll();
  }

  async function reinstateUser(user) {
    const sb = getSupabase();
    await sb.from('profiles').update({ status:'active', status_reason:null }).eq('id', user.id);
    await sb.from('user_status_log').insert({ user_id:user.id, status:'active', reason:'Reinstated by super admin' }).catch(()=>{});
    loadAll();
  }

  async function softDeleteUser(user) {
    const sb = getSupabase();
    await sb.from('profiles').update({ status:'soft_deleted', deleted_at:new Date().toISOString() }).eq('id', user.id);
    await sb.from('organisation_members').update({ is_active:false }).eq('user_id', user.id);
    await sb.from('audit_log').insert({ action:'soft_delete_user', target_type:'user', target_id:user.id }).catch(()=>{});
    setAction(null); loadAll();
  }

  async function exportUserData(user) {
    const sb = getSupabase();
    const { data: logs } = await sb.from('health_logs').select('*').eq('user_id', user.id).order('log_date');
    const rows = (logs||[]).map(l => `${l.log_date||''},${l.total_calories||0},${l.total_protein||0},${l.total_carbs||0},${l.total_fat||0},${l.water||0},${l.weight||''}`);
    const blob = new Blob(['date,calories,protein,carbs,fat,water,weight\n' + rows.join('\n')], { type:'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vitalog-${user.email}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setAction(null);
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || (u.full_name||'').toLowerCase().includes(search.toLowerCase()) || (u.email||'').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter==='all' || (u.status||'active')===filter;
    return matchSearch && matchFilter;
  });

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.h1}>Users {router.query.org && <button style={s.backBtn} onClick={()=>router.push('/admin/orgs')}>← Back to Orgs</button>}</h1>
          <p style={s.sub}>{users.length} total users</p>
        </div>
      </div>

      <div style={s.filterRow}>
        <input style={s.search} placeholder="Search name or email..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div style={s.chips}>
          {['all','active','suspended','soft_deleted'].map(f=>(
            <button key={f} style={{...s.chip,...(filter===f?s.chipOn:{})}} onClick={()=>setFilter(f)}>
              {f==='soft_deleted'?'Deleted':f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{padding:'40px',textAlign:'center',color:'#6B7280'}}>Loading users…</div>
      ) : (
        <div style={s.table}>
          <div style={s.thead}>
            <div style={{...s.th,flex:2}}>User</div>
            <div style={s.th}>Role</div>
            <div style={s.th}>Organisation</div>
            <div style={s.th}>Template</div>
            <div style={s.th}>Status</div>
            <div style={s.th}>Actions</div>
          </div>
          {filtered.length===0 ? (
            <div style={{padding:'40px',textAlign:'center',color:'#6B7280',fontSize:'0.8rem'}}>No users found</div>
          ) : filtered.map((u,i)=>{
            const mem     = getMember(u.id);
            const orgName = mem?.organisations?.name||'—';
            const role    = mem?.role||u.role||'—';
            const status  = u.status||'active';
            const tmpl    = templates.find(t=>t.id===u.active_template_id);
            const initials= (u.full_name||u.email||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
            return (
              <div key={i} style={s.trow}>
                <div style={{...s.td,flex:2,display:'flex',alignItems:'center',gap:10}}>
                  <div style={s.avatar}>{initials}</div>
                  <div>
                    <div style={s.userName}>{u.full_name||'Unnamed'}</div>
                    <div style={s.userEmail}>{u.email}</div>
                  </div>
                </div>
                <div style={s.td}><RoleBadge role={role}/></div>
                <div style={s.td}><span style={{fontSize:'0.72rem',color:'#374151'}}>{orgName}</span></div>
                <div style={s.td}><span style={{fontSize:'0.68rem',color:tmpl?'#714B67':'#9CA3AF'}}>{tmpl?.name||'Not assigned'}</span></div>
                <div style={s.td}><StatusBadge status={status}/></div>
                <div style={s.td}>
                  <div style={s.actionBtns}>
                    <button style={{...s.actBtn,color:'#6366F1',borderColor:'#C7D2FE'}} onClick={()=>setAction({type:'edit',user:u,mem})}>Edit</button>
                    <button style={s.actBtn} onClick={()=>setAction({type:'export',user:u})}>Export</button>
                    {status==='active'&&<button style={{...s.actBtn,color:'#F59E0B'}} onClick={()=>setAction({type:'suspend',user:u})}>Suspend</button>}
                    {status==='suspended'&&<button style={{...s.actBtn,color:'#10B981'}} onClick={()=>reinstateUser(u)}>Reinstate</button>}
                    {status!=='soft_deleted'&&<button style={{...s.actBtn,color:'#EF4444'}} onClick={()=>setAction({type:'delete',user:u})}>Delete</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {action?.type==='edit'&&(
        <EditUserModal user={action.user} mem={action.mem} templates={templates}
          onClose={()=>setAction(null)} onSave={form=>saveUserEdit(action.user,form)}/>
      )}
      {action?.type==='suspend'&&(
        <SuspendModal title={`Suspend — ${action.user.full_name||action.user.email}`}
          sub="User will be blocked from logging in. Data is preserved."
          onClose={()=>setAction(null)} onConfirm={reason=>suspendUser(action.user,reason)}/>
      )}
      {action?.type==='export'&&(
        <Modal title={`Export — ${action.user.full_name||action.user.email}`} onClose={()=>setAction(null)}>
          <p style={s.modalSub}>Downloads a CSV of all health logs for this user.</p>
          <button style={s.primaryBtn} onClick={()=>exportUserData(action.user)}>Download CSV</button>
        </Modal>
      )}
      {action?.type==='delete'&&(
        <Modal title={`Delete — ${action.user.full_name||action.user.email}`} onClose={()=>{setAction(null);setDeleteConfirm('');}}>
          <p style={s.modalSub}>Soft-delete: data retained 90 days then purged. User cannot log in.</p>
          <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'10px 12px',fontSize:'0.72rem',color:'#991B1B',marginBottom:14}}>⚠️ Type <strong>DELETE</strong> to confirm</div>
          <input style={s.confirmInput} value={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.value)} placeholder="Type DELETE to confirm"/>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button style={s.cancelBtn} onClick={()=>{setAction(null);setDeleteConfirm('');}}>Cancel</button>
            <button style={{...s.dangerBtn,opacity:deleteConfirm==='DELETE'?1:0.4}} disabled={deleteConfirm!=='DELETE'} onClick={()=>softDeleteUser(action.user)}>Confirm Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EditUserModal({ user, mem, templates, onClose, onSave }) {
  const [tab, setTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name:          user.full_name||'',
    dob:                user.dob||'',
    gender:             user.gender||'',
    height_cm:          user.height_cm||'',
    weight_start:       user.weight_start||'',
    weight_current:     user.weight_current||'',
    weight_target:      user.weight_target||'',
    activity_level:     user.activity_level||'',
    conditions:         user.conditions||{},
    allergies:          user.allergies||'',
    medications:        user.medications||'',
    diet_type:          user.diet_type||'',
    preferred_cuisine:  user.preferred_cuisine||'',
    meals_per_day:      user.meals_per_day||6,
    water_target:       user.water_target||3.5,
    calorie_target:     user.calorie_target||1600,
    protein_target:     user.protein_target||100,
    carb_target:        user.carb_target||130,
    fat_target:         user.fat_target||55,
    active_template_id: user.active_template_id||'',
    member_role:        mem?.role||'patient',
  });

  function set(k,v){ setForm(f=>({...f,[k]:v})); }

  function toggleCond(k){
    const c={...form.conditions};
    if(k==='none'){set('conditions',c.none?{}:{none:true});return;}
    if(c.none)delete c.none;
    c[k]?delete c[k]:(c[k]=true);
    set('conditions',c);
  }

  async function handleSave(){ setSaving(true); await onSave(form); setSaving(false); }

  const inp = { width:'100%',padding:'8px 11px',border:'1.5px solid #E5E7EB',borderRadius:9,fontSize:'0.8rem',fontFamily:'Inter,sans-serif',outline:'none',color:'#111827',boxSizing:'border-box',background:'#fff' };
  const lbl = { display:'block',fontSize:'0.68rem',fontWeight:600,color:'#6B7280',marginBottom:4 };
  const rbtn = (active) => ({
    padding:'5px 11px',borderRadius:20,border:`1.5px solid ${active?'#714B67':'#E5E7EB'}`,
    fontSize:'0.7rem',cursor:'pointer',background:active?'#f3eef1':'#fff',
    color:active?'#714B67':'#6B7280',fontFamily:'Inter,sans-serif',fontWeight:active?600:400,
  });

  const TABS = [['personal','Personal'],['targets','Targets'],['conditions','Conditions'],['diet','Diet & Plan']];

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16,overflowY:'auto'}}>
      <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:520,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        {/* Header */}
        <div style={{padding:'18px 20px',borderBottom:'1px solid #E5E7EB',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'Sora,sans-serif',fontSize:'0.95rem',fontWeight:800,color:'#111827'}}>Edit User</div>
            <div style={{fontSize:'0.68rem',color:'#6B7280',marginTop:2}}>{user.email} · {mem?.organisations?.name||'No org'}</div>
          </div>
          <button style={{background:'none',border:'none',cursor:'pointer',fontSize:'1.1rem',color:'#6B7280'}} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,padding:'10px 20px',borderBottom:'1px solid #E5E7EB',flexShrink:0}}>
          {TABS.map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:'5px 12px',borderRadius:20,border:`1.5px solid ${tab===id?'#714B67':'#E5E7EB'}`,fontSize:'0.68rem',fontWeight:tab===id?700:500,cursor:'pointer',background:tab===id?'#f3eef1':'#fff',color:tab===id?'#714B67':'#6B7280',fontFamily:'Inter,sans-serif'}}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{overflowY:'auto',padding:'16px 20px',flex:1}}>

          {/* PERSONAL */}
          {tab==='personal'&&(
            <div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Full name</label>
                <input style={inp} value={form.full_name} onChange={e=>set('full_name',e.target.value)}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                <div><label style={lbl}>Date of birth</label><input style={inp} type="date" value={form.dob} onChange={e=>set('dob',e.target.value)}/></div>
                <div><label style={lbl}>Gender</label>
                  <select style={inp} value={form.gender} onChange={e=>set('gender',e.target.value)}>
                    <option value="">Select</option><option>Male</option><option>Female</option><option>Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Height (cm)</label>
                <input style={inp} type="number" value={form.height_cm} onChange={e=>set('height_cm',e.target.value)}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
                {[['weight_start','Start weight (kg)'],['weight_current','Current (kg)'],['weight_target','Target (kg)']].map(([k,l])=>(
                  <div key={k}><label style={lbl}>{l}</label><input style={inp} type="number" step="0.1" value={form[k]} onChange={e=>set(k,e.target.value)}/></div>
                ))}
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Activity level</label>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {ACTIVITY_LEVELS.map(a=><button key={a.val} style={rbtn(form.activity_level===a.val)} onClick={()=>set('activity_level',a.val)}>{a.label}</button>)}
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Role in organisation</label>
                <select style={inp} value={form.member_role} onChange={e=>set('member_role',e.target.value)}>
                  <option value="patient">Patient</option>
                  <option value="dietitian">Dietitian</option>
                  <option value="org_admin">Org Admin</option>
                </select>
              </div>
            </div>
          )}

          {/* TARGETS */}
          {tab==='targets'&&(
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                {[['calorie_target','Calories (kcal)'],['protein_target','Protein (g)'],['carb_target','Carbs (g)'],['fat_target','Fat (g)']].map(([k,l])=>(
                  <div key={k}><label style={lbl}>{l}</label><input style={inp} type="number" value={form[k]} onChange={e=>set(k,e.target.value)}/></div>
                ))}
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Water target (L)</label>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <button style={{width:32,height:32,borderRadius:'50%',border:'1px solid #E5E7EB',background:'#fff',cursor:'pointer',fontSize:18,color:'#714B67'}} onClick={()=>set('water_target',Math.max(1,+(+form.water_target-0.5).toFixed(1)))}>−</button>
                  <span style={{fontSize:16,fontWeight:700,color:'#714B67',minWidth:40,textAlign:'center'}}>{form.water_target}L</span>
                  <button style={{width:32,height:32,borderRadius:'50%',border:'1px solid #E5E7EB',background:'#fff',cursor:'pointer',fontSize:18,color:'#714B67'}} onClick={()=>set('water_target',Math.min(6,+(+form.water_target+0.5).toFixed(1)))}>+</button>
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Meals per day</label>
                <div style={{display:'flex',gap:5}}>
                  {[3,4,5,6].map(n=><button key={n} style={rbtn(form.meals_per_day===n)} onClick={()=>set('meals_per_day',n)}>{n}</button>)}
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Meal template</label>
                <select style={inp} value={form.active_template_id} onChange={e=>set('active_template_id',e.target.value)}>
                  <option value="">— No template —</option>
                  {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* CONDITIONS */}
          {tab==='conditions'&&(
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12}}>
                {CONDITIONS.map(c=>{
                  const sel=!!(form.conditions||{})[c.key];
                  return(
                    <div key={c.key} onClick={()=>toggleCond(c.key)} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 10px',border:`1.5px solid ${sel?'#714B67':'#E5E7EB'}`,borderRadius:9,cursor:'pointer',background:sel?'#f3eef1':'#fff',fontSize:'0.75rem',color:sel?'#714B67':'#374151',fontWeight:sel?600:400}}>
                      <div style={{width:14,height:14,borderRadius:3,border:`1.5px solid ${sel?'#714B67':'#D1D5DB'}`,background:sel?'#714B67':'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {sel&&<span style={{color:'#fff',fontSize:9,fontWeight:900}}>✓</span>}
                      </div>
                      {c.label}
                    </div>
                  );
                })}
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Allergies</label>
                <input style={inp} value={form.allergies} placeholder="e.g. nuts, gluten" onChange={e=>set('allergies',e.target.value)}/>
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Medications</label>
                <input style={inp} value={form.medications} placeholder="e.g. Metformin" onChange={e=>set('medications',e.target.value)}/>
              </div>
            </div>
          )}

          {/* DIET */}
          {tab==='diet'&&(
            <div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Diet type</label>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {['Non-vegetarian','Vegetarian','Vegan','Eggetarian'].map(d=><button key={d} style={rbtn(form.diet_type===d)} onClick={()=>set('diet_type',d)}>{d}</button>)}
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <label style={lbl}>Preferred cuisine</label>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {CUISINES.map(c=><button key={c} style={rbtn(form.preferred_cuisine===c)} onClick={()=>set('preferred_cuisine',c)}>{c}</button>)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'12px 20px',borderTop:'1px solid #E5E7EB',display:'flex',gap:8,flexShrink:0}}>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={{...s.primaryBtn,opacity:saving?0.6:1}} disabled={saving} onClick={handleSave}>
            {saving?'Saving…':'Save All Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const map = { super_admin:{bg:'#1E1B4B',color:'#fff'}, org_admin:{bg:'#D1FAE5',color:'#065F46'}, dietitian:{bg:'#DBEAFE',color:'#1E40AF'}, patient:{bg:'#F3F4F6',color:'#374151'}, admin:{bg:'#F3E8FF',color:'#6B21A8'}, user:{bg:'#F3F4F6',color:'#374151'} };
  const c = map[role]||map.user;
  return <span style={{background:c.bg,color:c.color,padding:'2px 8px',borderRadius:20,fontSize:'0.6rem',fontWeight:700}}>{role||'—'}</span>;
}

function StatusBadge({ status }) {
  const map = { active:{bg:'#D1FAE5',color:'#065F46',label:'Active'}, suspended:{bg:'#FEE2E2',color:'#991B1B',label:'Suspended'}, soft_deleted:{bg:'#F3F4F6',color:'#6B7280',label:'Deleted'} };
  const c = map[status]||map.active;
  return <span style={{background:c.bg,color:c.color,padding:'3px 8px',borderRadius:20,fontSize:'0.6rem',fontWeight:700}}>{c.label}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}><span style={s.modalTitle}>{title}</span><button style={s.modalClose} onClick={onClose}>✕</button></div>
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
      <textarea style={s.textarea} rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason for suspension..."/>
      <div style={{display:'flex',gap:8,marginTop:8}}>
        <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
        <button style={{...s.dangerBtn,opacity:reason.trim()?1:0.4}} disabled={!reason.trim()} onClick={()=>onConfirm(reason)}>Confirm Suspend</button>
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
