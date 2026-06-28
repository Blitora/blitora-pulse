// pages/clinic/patient/[id].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import RoleGuard from '../../../components/RoleGuard';
import { getSupabase } from '../../../lib/supabase';
import { useRole } from '../../../lib/useRole';

export default function PatientDetailPage() {
  return (
    <RoleGuard allow={['org_admin','dietitian','super_admin']}>
      <Layout>
        <PatientDetailView />
      </Layout>
    </RoleGuard>
  );
}

function PatientDetailView() {
  const router = useRouter();
  const { id } = router.query;
  const { orgId } = useRole();
  const [patient, setPatient] = useState(null);
  const [log, setLog]         = useState(null);
  const [dateKey, setDateKey] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadPatient();
  }, [id]);

  useEffect(() => {
    if (id) loadLog();
  }, [id, dateKey]);

  async function loadPatient() {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    setPatient(data);
    setLoading(false);
  }

  async function loadLog() {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('health_logs')
      .select('*')
      .eq('user_id', id)
      .eq('log_date', dateKey)
      .maybeSingle();
    setLog(data || null);
  }

  function dayLabel(dk) {
    const t = new Date().toISOString().split('T')[0];
    const y = new Date(Date.now()-86400000).toISOString().split('T')[0];
    if (dk===t) return 'Today';
    if (dk===y) return 'Yesterday';
    return new Date(dk).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
  }

  function prevDay() {
    const d = new Date(dateKey); d.setDate(d.getDate()-1);
    setDateKey(d.toISOString().split('T')[0]);
  }
  function nextDay() {
    const d = new Date(dateKey); d.setDate(d.getDate()+1);
    const today = new Date().toISOString().split('T')[0];
    if (d.toISOString().split('T')[0] <= today) setDateKey(d.toISOString().split('T')[0]);
  }

  const G='#1D9E75', P='#714B67', BORDER='#E5E7EB', TXT='#111827', TXT2='#6B7280';

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60, color:TXT2 }}>
      Loading patient…
    </div>
  );

  if (!patient) return (
    <div style={{ textAlign:'center', padding:60 }}>
      <div style={{ fontSize:'2rem', marginBottom:10 }}>❌</div>
      <div style={{ color:TXT2 }}>Patient not found.</div>
      <button onClick={() => router.push('/clinic/patients')} style={{ marginTop:12, padding:'8px 16px', background:P, color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>← Back</button>
    </div>
  );

  const initials = (patient.full_name||patient.email||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  // Calculate macros from log
  const macros = { cal:0, pro:0, carb:0, fat:0 };
  // log.foods is a JSONB object of meal -> food selections — we show totals if available
  // For now show water and weight which are numeric columns
  const water = log?.water ? (log.water * 0.5).toFixed(1) : null;
  const weight = log?.weight || null;

  return (
    <div style={{ padding:'16px', maxWidth:600, margin:'0 auto' }}>
      {/* Back */}
      <button onClick={() => router.push('/clinic/patients')}
        style={{ background:'none', border:'none', color:TXT2, cursor:'pointer', fontSize:'0.76rem', fontFamily:'Inter,sans-serif', marginBottom:14, padding:0 }}>
        ← Back to Patients
      </button>

      {/* Patient header */}
      <div style={{ background:'#fff', borderRadius:14, padding:'16px', border:`1px solid ${BORDER}`, marginBottom:12, display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#6366F1,#8B5CF6)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', fontWeight:700, flexShrink:0 }}>
          {initials}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:'1.1rem', fontWeight:800, color:TXT }}>{patient.full_name||'Unnamed'}</div>
          <div style={{ fontSize:'0.72rem', color:TXT2, marginTop:2 }}>{patient.email}</div>
          {patient.conditions && Object.keys(patient.conditions).filter(k=>k!=='none').length > 0 && (
            <div style={{ fontSize:'0.65rem', color:P, marginTop:4 }}>
              {Object.keys(patient.conditions).filter(k=>k!=='none').join(' · ')}
            </div>
          )}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:'0.65rem', color:TXT2 }}>Goal weight</div>
          <div style={{ fontSize:'1rem', fontWeight:700, color:G }}>{patient.weight_target||'—'}kg</div>
        </div>
      </div>

      {/* Date navigation */}
      <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={prevDay} style={{ width:32, height:32, borderRadius:'50%', border:`1px solid ${BORDER}`, background:'#fff', cursor:'pointer', fontSize:16, color:TXT2 }}>‹</button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'0.9rem', fontWeight:600, color:TXT }}>{dayLabel(dateKey)}</div>
          <div style={{ fontSize:'0.68rem', color:TXT2 }}>{new Date(dateKey+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
        </div>
        <button onClick={nextDay} disabled={dateKey >= new Date().toISOString().split('T')[0]}
          style={{ width:32, height:32, borderRadius:'50%', border:`1px solid ${BORDER}`, background:'#fff', cursor:'pointer', fontSize:16, color:TXT2, opacity: dateKey >= new Date().toISOString().split('T')[0] ? 0.3 : 1 }}>›</button>
      </div>

      {/* Daily log */}
      {!log ? (
        <div style={{ background:'#fff', borderRadius:14, border:`1px dashed ${BORDER}`, padding:'40px 20px', textAlign:'center' }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>📋</div>
          <div style={{ fontFamily:'Sora,sans-serif', fontSize:'0.9rem', fontWeight:700, color:TXT, marginBottom:4 }}>No log for {dayLabel(dateKey)}</div>
          <div style={{ fontSize:'0.72rem', color:TXT2 }}>{patient.full_name?.split(' ')[0]||'Patient'} has not logged anything on this date.</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {/* Water + Weight */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, padding:'14px', textAlign:'center' }}>
              <div style={{ fontSize:'1.6rem', fontWeight:800, color:'#0EA5E9' }}>{water||'—'}</div>
              <div style={{ fontSize:'0.65rem', color:TXT2 }}>Litres water</div>
            </div>
            <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, padding:'14px', textAlign:'center' }}>
              <div style={{ fontSize:'1.6rem', fontWeight:800, color:P }}>{weight||'—'}</div>
              <div style={{ fontSize:'0.65rem', color:TXT2 }}>Weight (kg)</div>
            </div>
          </div>

          {/* Habits */}
          {log.habits && Object.keys(log.habits).length > 0 && (
            <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, padding:'14px' }}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, color:TXT2, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Habits</div>
              {Object.entries(log.habits).map(([habit, done]) => (
                <div key={habit} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:`1px solid #f5f5f5` }}>
                  <span style={{ fontSize:'0.8rem' }}>{done?'✅':'⬜'}</span>
                  <span style={{ fontSize:'0.78rem', color: done?G:TXT2, textDecoration: done?'line-through':'none' }}>{habit}</span>
                </div>
              ))}
            </div>
          )}

          {/* Meals summary */}
          {log.foods && Object.keys(log.foods).length > 0 && (
            <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, padding:'14px' }}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, color:TXT2, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:8 }}>Meals logged</div>
              {Object.entries(log.foods).map(([meal, foods]) => {
                const foodCount = Object.keys(foods||{}).length;
                if (!foodCount) return null;
                const mealLabels = {morning:'Morning',breakfast:'Breakfast',midmorning:'Mid-morning',lunch:'Lunch',evening:'Evening',dinner:'Dinner'};
                return (
                  <div key={meal} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid #f5f5f5` }}>
                    <span style={{ fontSize:'0.78rem', color:TXT }}>{mealLabels[meal]||meal}</span>
                    <span style={{ fontSize:'0.75rem', color:G, fontWeight:600 }}>{foodCount} item{foodCount>1?'s':''}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes */}
          {log.notes && (
            <div style={{ background:'#fff', borderRadius:12, border:`1px solid ${BORDER}`, padding:'14px' }}>
              <div style={{ fontSize:'0.7rem', fontWeight:700, color:TXT2, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>Notes</div>
              <div style={{ fontSize:'0.8rem', color:TXT }}>{log.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
