// pages/clinic/patient/[id].js  — NEW FILE
// Dietitian/Admin view of one patient's daily log (read-only with note option)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import RoleGuard from '../../../components/RoleGuard';
import { getSupabase } from '../../../lib/supabase';
const supabase = getSupabase();

export default function PatientDetailPage() {
  return (
    <RoleGuard allow={['org_admin','dietitian','super_admin']}>
      <Layout>
        <PatientDetail />
      </Layout>
    </RoleGuard>
  );
}

function PatientDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [patient,  setPatient]  = useState(null);
  const [log,      setLog]      = useState(null);
  const [meals,    setMeals]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [date,     setDate]     = useState(new Date().toISOString().split('T')[0]);
  const [note,     setNote]     = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id, date]);

  async function loadData() {
    setLoading(true);

    const [{ data: profile }, { data: healthLog }, { data: mealLogs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('health_logs').select('*').eq('user_id', id).eq('date', date).single(),
      supabase.from('meal_logs').select('*, food_master(name, calories_per_100g, protein_per_100g)')
        .eq('user_id', id).gte('logged_at', date + 'T00:00:00').lte('logged_at', date + 'T23:59:59')
        .order('logged_at', { ascending: true })
    ]);

    setPatient(profile);
    setLog(healthLog);
    setMeals(mealLogs || []);
    setLoading(false);
  }

  async function sendNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    // Save note to a dietitian_notes table (if built) or just reset for now
    await new Promise(r => setTimeout(r, 600));
    alert('Note saved! (Connect dietitian_notes table to persist)');
    setNote('');
    setSaving(false);
  }

  if (loading || !patient) return <Loading />;

  const kcalPct    = log ? Math.min(100, Math.round((log.total_calories / 2200) * 100)) : 0;
  const proteinPct = log ? Math.min(100, Math.round((log.total_protein / 160) * 100)) : 0;
  const waterPct   = log ? Math.min(100, Math.round((log.total_water_ml / 3000) * 100)) : 0;

  const initials = (patient.full_name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();

  return (
    <div style={s.page}>
      {/* Back */}
      <button style={s.back} onClick={() => router.back()}>← Patients</button>

      {/* Patient header */}
      <div style={s.patientHdr}>
        <div style={s.avatar}>{initials}</div>
        <div style={{ flex:1 }}>
          <h1 style={s.h1}>{patient.full_name || 'Patient'}</h1>
          <div style={s.meta}>{patient.email}</div>
          <div style={s.meta}>Goal: {patient.goal_weight}kg · Current: {patient.current_weight}kg</div>
        </div>
        <button style={s.planBtn} onClick={() => router.push(`/clinic/patient/${id}/plan`)}>
          Edit Plan
        </button>
      </div>

      {/* Date picker */}
      <div style={s.dateRow}>
        <label style={s.dateLbl}>Viewing log for:</label>
        <input
          style={s.dateInp}
          type="date"
          value={date}
          max={new Date().toISOString().split('T')[0]}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      {!log ? (
        <div style={s.noLog}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>📋</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, color:'#111827', marginBottom:4 }}>No log for this date</div>
          <div style={{ fontSize:'0.76rem', color:'#6B7280' }}>Patient hasn't logged anything for {date}.</div>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div style={s.kpiRow}>
            <KpiCard label="Calories"  value={`${log.total_calories || 0} kcal`} pct={kcalPct}    color="#10B981" />
            <KpiCard label="Protein"   value={`${log.total_protein || 0}g`}      pct={proteinPct}  color="#8B5CF6" />
            <KpiCard label="Water"     value={`${((log.total_water_ml||0)/1000).toFixed(1)}L`} pct={waterPct} color="#0EA5E9" />
          </div>

          {/* Meals logged */}
          <div style={s.section}>
            <div style={s.sectionTitle}>🍽️ Meals Logged</div>
            {meals.length === 0 ? (
              <div style={{ fontSize:'0.76rem', color:'#6B7280', padding:'12px 0' }}>No meals logged for this date.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {meals.map((m, i) => (
                  <div key={i} style={s.mealRow}>
                    <div style={s.mealName}>{m.food_master?.name || m.food_name}</div>
                    <div style={s.mealMeta}>{m.quantity_g}g</div>
                    <div style={s.mealKcal}>{Math.round((m.food_master?.calories_per_100g || 0) * m.quantity_g / 100)} kcal</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Walks / water */}
          <div style={s.section}>
            <div style={s.sectionTitle}>💧 Water & Activity</div>
            <div style={s.infoRow}>
              <span style={s.infoLbl}>Water</span>
              <span style={s.infoVal}>{((log.total_water_ml||0)/1000).toFixed(1)} L of 3.0 L</span>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoLbl}>Walks</span>
              <span style={s.infoVal}>{log.walk_count || 0} walks · {log.walk_minutes || 0} min total</span>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoLbl}>Weight</span>
              <span style={s.infoVal}>{log.weight_kg ? `${log.weight_kg} kg` : 'Not logged'}</span>
            </div>
          </div>
        </>
      )}

      {/* Dietitian note */}
      <div style={s.section}>
        <div style={s.sectionTitle}>📝 Send Note to Patient</div>
        <form onSubmit={sendNote}>
          <textarea
            style={s.noteArea}
            rows={3}
            placeholder="e.g. Great protein intake today! Try adding more fibre at dinner…"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <button style={{ ...s.sendBtn, opacity: saving ? 0.7 : 1 }} type="submit" disabled={saving}>
            {saving ? 'Sending…' : 'Send Note'}
          </button>
        </form>
      </div>
    </div>
  );
}

function KpiCard({ label, value, pct, color }) {
  return (
    <div style={s.kpiCard}>
      <div style={{ fontSize:'0.62rem', color:'#6B7280', marginBottom:4 }}>{label}</div>
      <div style={{ fontFamily:'Sora,sans-serif', fontSize:'1.1rem', fontWeight:800, color }}>{value}</div>
      <div style={{ height:4, background:'#F3F4F6', borderRadius:99, marginTop:6 }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:99 }}></div>
      </div>
      <div style={{ fontSize:'0.58rem', color, fontWeight:700, marginTop:3 }}>{pct}%</div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div style={{ width:32, height:32, border:'3px solid #10B981', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const s = {
  page:        { padding:'16px', maxWidth:600, margin:'0 auto' },
  back:        { background:'none', border:'none', color:'#6B7280', cursor:'pointer', fontSize:'0.76rem', padding:'0 0 14px', fontFamily:'Inter,sans-serif' },
  patientHdr:  { display:'flex', alignItems:'center', gap:14, background:'#fff', borderRadius:14, padding:'16px', border:'1px solid #E5E7EB', marginBottom:12 },
  avatar:      { width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', fontWeight:700, flexShrink:0 },
  h1:          { fontFamily:'Sora,sans-serif', fontSize:'1rem', fontWeight:800, color:'#111827', marginBottom:2 },
  meta:        { fontSize:'0.64rem', color:'#6B7280', marginBottom:1 },
  planBtn:     { background:'#EDE9FE', color:'#5B21B6', border:'none', borderRadius:9, padding:'7px 13px', fontSize:'0.66rem', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' },
  dateRow:     { display:'flex', alignItems:'center', gap:10, marginBottom:14 },
  dateLbl:     { fontSize:'0.72rem', fontWeight:600, color:'#374151' },
  dateInp:     { padding:'7px 10px', border:'1.5px solid #E5E7EB', borderRadius:9, fontSize:'0.78rem', fontFamily:'Inter,sans-serif', outline:'none' },
  noLog:       { background:'#fff', borderRadius:14, padding:'40px 20px', border:'1px solid #E5E7EB', textAlign:'center', marginBottom:12 },
  kpiRow:      { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 },
  kpiCard:     { background:'#fff', borderRadius:12, padding:'12px', border:'1px solid #E5E7EB' },
  section:     { background:'#fff', borderRadius:14, padding:'14px', border:'1px solid #E5E7EB', marginBottom:10 },
  sectionTitle:{ fontFamily:'Sora,sans-serif', fontSize:'0.8rem', fontWeight:700, color:'#111827', marginBottom:10 },
  mealRow:     { display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:'1px solid #F3F4F6' },
  mealName:    { flex:1, fontSize:'0.74rem', fontWeight:500, color:'#111827' },
  mealMeta:    { fontSize:'0.62rem', color:'#9CA3AF' },
  mealKcal:    { fontSize:'0.66rem', fontWeight:600, color:'#6B7280' },
  infoRow:     { display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #F3F4F6' },
  infoLbl:     { fontSize:'0.72rem', color:'#6B7280' },
  infoVal:     { fontSize:'0.72rem', fontWeight:600, color:'#111827' },
  noteArea:    { width:'100%', padding:'10px 12px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:'0.78rem', fontFamily:'Inter,sans-serif', resize:'vertical', outline:'none', marginBottom:10, boxSizing:'border-box', color:'#111827' },
  sendBtn:     { padding:'9px 20px', background:'linear-gradient(135deg,#6366F1,#4338CA)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:'0.76rem', cursor:'pointer', fontFamily:'Inter,sans-serif' },
};
