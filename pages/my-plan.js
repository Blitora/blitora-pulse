// pages/my-plan.js
// Blitora Pulse — Personalised Meal Plan Page
// Shows AI-generated meal plan with 3 options (A/B/C) per meal slot
// Includes animated generating screen while AI works

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getSupabase } from '../lib/supabase';

const N = '#0D1B3E', G = '#1D9E75', GL = '#2AE8A4', AMB = '#E8560A';
const FONT = "'Poppins', Arial, sans-serif";

const SLOT_LABELS = {
  breakfast: '\u{1F305} Breakfast',
  mid_morning: '\u2615 Mid-Morning',
  lunch: '\u{1F37D}\uFE0F Lunch',
  evening_snack: '\u{1F306} Evening Snack',
  dinner: '\u{1F319} Dinner',
  post_dinner: '\u{1F4A7} Post-Dinner',
};

const OPTION_COLORS = {
  A: { bg: 'rgba(29,158,117,0.12)', border: '#1D9E75', badge: '#1D9E75' },
  B: { bg: 'rgba(232,86,10,0.12)', border: '#E8560A', badge: '#E8560A' },
  C: { bg: 'rgba(113,75,183,0.12)', border: '#714BB7', badge: '#714BB7' },
};

const GEN_MESSAGES = [
  { icon: '\u{1F9EC}', text: 'Analysing your health profile...' },
  { icon: '\u{1F3AF}', text: 'Matching conditions to nutrition science...' },
  { icon: '\u{1F957}', text: 'Curating 3 meal options for each slot...' },
  { icon: '\u26A1', text: 'Calculating your macro targets...' },
  { icon: '\u{1F30D}', text: 'Selecting locally available foods...' },
  { icon: '\u2705', text: 'Respecting your dietary preferences...' },
  { icon: '\u{1F37D}\uFE0F', text: 'Building your personalised weekly plan...' },
  { icon: '\u2728', text: 'Almost ready — adding final touches...' },
];

function GeneratingScreen() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [dots, setDots] = useState('');
  useEffect(() => {
    const t1 = setInterval(() => setMsgIdx(i => (i + 1) % GEN_MESSAGES.length), 2800);
    const t2 = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);
  const msg = GEN_MESSAGES[msgIdx];
  return (
    <div style={{ minHeight:'100vh', background:N, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:FONT, padding:'24px' }}>
      <div style={{ position:'relative', width:120, height:120, marginBottom:40 }}>
        {[0,15,30].map((inset, i) => (
          <div key={i} style={{ position:'absolute', inset, borderRadius:'50%', border:`2px solid ${G}`, opacity: 1 - i*0.35, animation:`pulse${i} 2s ease-out infinite ${i*0.4}s` }} />
        ))}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40 }}>{msg.icon}</div>
      </div>
      <h1 style={{ color:'#fff', fontSize:24, fontWeight:700, margin:'0 0 8px', textAlign:'center' }}>Crafting Your Plan{dots}</h1>
      <p style={{ color:GL, fontSize:16, fontWeight:600, margin:'0 0 40px', textAlign:'center', minHeight:24 }}>{msg.text}</p>
      <div style={{ width:'100%', maxWidth:360, height:4, background:'rgba(255,255,255,0.1)', borderRadius:4, overflow:'hidden', marginBottom:40 }}>
        <div style={{ height:'100%', background:`linear-gradient(90deg, ${G}, ${GL})`, borderRadius:4, animation:'progress 28s linear forwards' }} />
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:10, justifyContent:'center', maxWidth:440 }}>
        {['3 Options Per Meal','Condition-Aware','Macro Targets','Diet Compliant','Local Foods'].map(c => (
          <span key={c} style={{ background:'rgba(29,158,117,0.15)', border:`1px solid ${G}`, color:GL, borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:600 }}>✓ {c}</span>
        ))}
      </div>
      <style>{`
        @keyframes pulse0{0%{transform:scale(1);opacity:1}100%{transform:scale(1.4);opacity:0}}
        @keyframes pulse1{0%{transform:scale(1);opacity:.65}100%{transform:scale(1.3);opacity:0}}
        @keyframes pulse2{0%{transform:scale(1);opacity:.3}100%{transform:scale(1.2);opacity:0}}
        @keyframes progress{0%{width:3%}30%{width:38%}60%{width:63%}85%{width:82%}100%{width:94%}}
      `}</style>
    </div>
  );
}

export default function MyPlan() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState(null);
  const [template, setTemplate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [accepting, setAccepting] = useState(false);
  const [showRevise, setShowRevise] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef();

  useEffect(() => { load(); }, []);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatLog]);

  async function load() {
    setLoading(true);
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { router.replace('/login'); return; }
    const { data: prof } = await sb.from('profiles')
      .select('id,full_name,active_template_id,calorie_target,protein_target,carb_target,fat_target,water_target,conditions,dob,gender,weight_target,weight_current,account_type,setup_complete')
      .eq('id', session.user.id).single();
    if (!prof) { router.replace('/dashboard'); return; }
    if (prof.account_type === 'clinic') { router.replace('/clinic/patients'); return; }
    setProfile(prof);

    if (prof.active_template_id) {
      const { data: tmpl } = await sb.from('meal_templates')
        .select('id,name,description,avoid_foods,tips,weekly_variation,ai_generated')
        .eq('id', prof.active_template_id).single();
      setTemplate(tmpl);

      const { data: items } = await sb.from('template_food_items')
        .select('*').eq('template_id', prof.active_template_id)
        .eq('added_by_user', false).order('meal_slot').order('option_group');

      if (items && items.length > 0) {
        const grouped = {};
        items.forEach(item => {
          const slot = item.meal_slot || item.meal_slots?.[0];
          if (!slot) return;
          if (!grouped[slot]) grouped[slot] = {};
          const opt = item.option_group || 'A';
          if (!grouped[slot][opt]) grouped[slot][opt] = { optionLabel: opt, optionName: item.option_label || `Option ${opt}`, items: [] };
          grouped[slot][opt].items.push(item);
        });
        const order = ['breakfast','mid_morning','lunch','evening_snack','dinner','post_dinner'];
        const arr = order.filter(s => grouped[s]).map(s => ({ slot: s, options: Object.values(grouped[s]) }));
        setSlots(arr);
        const defs = {}; arr.forEach(s => { defs[s.slot] = 'A'; });
        setSelectedOptions(defs);
      } else {
        const { data: leg } = await sb.from('template_food_items').select('*')
          .eq('template_id', prof.active_template_id).order('meal_slots');
        if (leg?.length > 0) {
          const lg = {};
          leg.forEach(item => {
            const slot = item.meal_slots?.[0] || 'breakfast';
            if (!lg[slot]) lg[slot] = { slot, options:[{ optionLabel:'A', optionName:'Your Plan', items:[] }] };
            lg[slot].options[0].items.push(item);
          });
          setSlots(Object.values(lg));
          const defs = {}; Object.keys(lg).forEach(s => { defs[s] = 'A'; });
          setSelectedOptions(defs);
        }
      }
    } else { setGenerating(true); }
    setLoading(false);
  }

  async function handleAccept() {
    setAccepting(true);
    try {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (session) await sb.from('profiles').update({ setup_complete: true }).eq('id', session.user.id);
    } catch(e) {}
    router.replace('/dashboard');
  }

  async function handleRevise() {
    if (!chatMsg.trim()) return;
    const msg = chatMsg.trim(); setChatMsg('');
    setChatLog(l => [...l, { role:'user', text:msg }]); setChatLoading(true);
    try {
      const sb = getSupabase(); const { data: { session } } = await sb.auth.getSession();
      const res = await fetch('/api/ai/revise-plan', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userId: session.user.id, revision: msg, currentTemplateName: template?.name, profile: { healthConditions: profile.conditions, calorieTarget: profile.calorie_target } }) });
      const data = await res.json();
      setChatLog(l => [...l, { role:'ai', text: data.success ? (data.message||'Plan updated! Refreshing...') : (data.error||'Could not revise.') }]);
      if (data.success) await load();
    } catch(e) { setChatLog(l => [...l, { role:'ai', text:'Something went wrong.' }]); }
    setChatLoading(false);
  }

  const totals = slots.reduce((a, s) => {
    const opt = s.options.find(o => o.optionLabel === (selectedOptions[s.slot]||'A')) || s.options[0];
    opt?.items.forEach(i => { a.cal += i.calories||0; a.pro += parseFloat(i.protein)||0; a.carb += parseFloat(i.carbs)||0; a.fat += parseFloat(i.fat)||0; });
    return a;
  }, { cal:0, pro:0, carb:0, fat:0 });

  if (loading) return <div style={{ minHeight:'100vh', background:N, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:FONT }}><div style={{ textAlign:'center', color:'#fff' }}><div style={{ fontSize:40, marginBottom:16 }}>🥗</div><div style={{ fontSize:16, fontWeight:600 }}>Loading your plan...</div></div></div>;
  if (generating) return <GeneratingScreen />;

  return (
    <>
      <Head><title>My Plan — Blitora Pulse</title></Head>
      <div style={{ minHeight:'100vh', background:'#0B1121', fontFamily:FONT, paddingBottom:40 }}>
        <div style={{ background:N, padding:'20px 24px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', maxWidth:860, margin:'0 auto' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                <span style={{ fontSize:22 }}>🥗</span>
                <h1 style={{ color:'#fff', fontSize:20, fontWeight:700, margin:0 }}>{template?.name || 'Your Meal Plan'}</h1>
                {template?.ai_generated && <span style={{ background:'rgba(42,232,164,0.15)', border:`1px solid ${GL}`, color:GL, borderRadius:12, padding:'2px 10px', fontSize:11, fontWeight:700 }}>✨ AI Generated</span>}
              </div>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, margin:0 }}>{template?.description || 'Your personalised nutrition plan'}</p>
            </div>
            <button onClick={() => window.print()} style={{ background:'none', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', borderRadius:8, padding:'8px 14px', fontSize:13, cursor:'pointer', fontFamily:FONT }}>⬇ PDF</button>
          </div>
        </div>

        <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 16px' }}>
          {profile && (
            <div style={{ background:N, borderRadius:14, padding:'16px 20px', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
              {[
                { label:'Calories', val:Math.round(totals.cal), target:profile.calorie_target, unit:'kcal', color:'#E8560A' },
                { label:'Protein', val:`${Math.round(totals.pro)}g`, target:`${profile.protein_target}g`, color:'#1D9E75' },
                { label:'Carbs', val:`${Math.round(totals.carb)}g`, target:`${profile.carb_target}g`, color:'#714BB7' },
                { label:'Fat', val:`${Math.round(totals.fat)}g`, target:`${profile.fat_target}g`, color:'#F59E0B' },
                { label:'Water', val:`${profile.water_target}L`, color:'#38BDF8' },
              ].map(m => (
                <div key={m.label} style={{ textAlign:'center' }}>
                  <div style={{ color:m.color, fontSize:18, fontWeight:700 }}>{m.val}</div>
                  {m.target && <div style={{ color:'rgba(255,255,255,0.3)', fontSize:10 }}>/ {m.target}</div>}
                  <div style={{ color:'rgba(255,255,255,0.45)', fontSize:11, marginTop:2 }}>{m.label}</div>
                </div>
              ))}
            </div>
          )}

          {slots.length > 0 && slots[0]?.options?.length > 1 && (
            <div style={{ background:N, borderRadius:12, padding:'10px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <span style={{ color:'rgba(255,255,255,0.45)', fontSize:11, fontWeight:600 }}>TAP A/B/C TO SWITCH MEAL OPTIONS:</span>
              {['A','B','C'].map(opt => (
                <div key={opt} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:20, height:20, borderRadius:6, background:OPTION_COLORS[opt].badge, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700 }}>{opt}</div>
                  <span style={{ color:'rgba(255,255,255,0.5)', fontSize:11 }}>Option {opt}</span>
                </div>
              ))}
            </div>
          )}

          {slots.length === 0 ? (
            <div style={{ background:N, borderRadius:16, padding:'40px 24px', textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>⏳</div>
              <div style={{ color:'#fff', fontSize:18, fontWeight:700, marginBottom:8 }}>Plan is being generated</div>
              <div style={{ color:'rgba(255,255,255,0.5)', fontSize:14, marginBottom:20 }}>Usually takes 15-30 seconds. Tap refresh to check.</div>
              <button onClick={() => load()} style={{ background:G, color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>🔄 Refresh</button>
            </div>
          ) : slots.map(slot => {
            const selOpt = selectedOptions[slot.slot] || 'A';
            const hasOpts = slot.options?.length > 1;
            return (
              <div key={slot.slot} style={{ background:N, borderRadius:16, marginBottom:14, overflow:'hidden' }}>
                <div style={{ padding:'13px 18px', background:'rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{SLOT_LABELS[slot.slot] || slot.slot}</span>
                  {hasOpts && (
                    <div style={{ display:'flex', gap:6 }}>
                      {slot.options.map(opt => (
                        <button key={opt.optionLabel} onClick={() => setSelectedOptions(p => ({...p, [slot.slot]: opt.optionLabel}))}
                          style={{ width:30, height:30, borderRadius:7, border:'none', background: selOpt===opt.optionLabel ? OPTION_COLORS[opt.optionLabel]?.badge : 'rgba(255,255,255,0.08)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:FONT, outline: selOpt===opt.optionLabel ? `2px solid ${OPTION_COLORS[opt.optionLabel]?.badge}` : 'none', outlineOffset:2, transition:'all .15s' }}>
                          {opt.optionLabel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {slot.options?.map(opt => {
                  const c = OPTION_COLORS[opt.optionLabel] || OPTION_COLORS.A;
                  const isSel = selOpt === opt.optionLabel;
                  const opTot = opt.items.reduce((a,i) => ({ cal: a.cal+(i.calories||0), pro: a.pro+(parseFloat(i.protein)||0) }), {cal:0,pro:0});
                  return (
                    <div key={opt.optionLabel} onClick={() => setSelectedOptions(p => ({...p, [slot.slot]: opt.optionLabel}))}
                      style={{ borderLeft:`3px solid ${isSel ? c.badge : 'transparent'}`, background: isSel ? c.bg : 'transparent', padding:'12px 18px', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.04)', transition:'all .15s' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <span style={{ width:20, height:20, borderRadius:5, background: isSel ? c.badge : 'rgba(255,255,255,0.1)', color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{opt.optionLabel}</span>
                        <span style={{ color: isSel ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight:700, fontSize:13 }}>{opt.optionName || `Option ${opt.optionLabel}`}</span>
                        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                          <span style={{ color: isSel ? c.badge : 'rgba(255,255,255,0.25)', fontSize:12, fontWeight:600 }}>{Math.round(opTot.cal)} kcal</span>
                          <span style={{ color: isSel ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)', fontSize:12 }}>P {Math.round(opTot.pro)}g</span>
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                        {opt.items.map((item, i) => (
                          <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 9px', borderRadius:7, background: isSel ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)' }}>
                            <div>
                              <span style={{ color: isSel ? '#fff' : 'rgba(255,255,255,0.4)', fontSize:12, fontWeight:500 }}>{item.name}</span>
                              {item.quantity_desc && <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11, marginLeft:5 }}>— {item.quantity_desc}</span>}
                              {item.category && <span style={{ color:G, fontSize:10, marginLeft:5 }}>({item.category})</span>}
                            </div>
                            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                              <span style={{ background: isSel ? 'rgba(255,255,255,0.08)' : 'transparent', color: isSel ? '#fff' : 'rgba(255,255,255,0.25)', fontSize:11, fontWeight:600, borderRadius:5, padding:'2px 6px' }}>{item.calories} kcal</span>
                              {parseFloat(item.protein) > 0 && <span style={{ color: isSel ? G : 'rgba(255,255,255,0.15)', fontSize:11 }}>P{Math.round(item.protein)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {template?.tips?.length > 0 && (
            <div style={{ background:N, borderRadius:14, padding:'14px 18px', marginBottom:16 }}>
              <div style={{ color:GL, fontWeight:700, fontSize:12, marginBottom:8 }}>💡 NUTRITION TIPS</div>
              {template.tips.map((tip, i) => <div key={i} style={{ display:'flex', gap:8, marginBottom:6, color:'rgba(255,255,255,0.6)', fontSize:13, lineHeight:1.5 }}><span style={{ color:G, flexShrink:0 }}>→</span><span>{tip}</span></div>)}
            </div>
          )}

          {template?.avoid_foods?.length > 0 && (
            <div style={{ background:'rgba(232,86,10,0.08)', border:'1px solid rgba(232,86,10,0.25)', borderRadius:14, padding:'12px 16px', marginBottom:16 }}>
              <div style={{ color:AMB, fontWeight:700, fontSize:12, marginBottom:8 }}>⚠️ AVOID THESE</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {template.avoid_foods.map((f,i) => <span key={i} style={{ background:'rgba(232,86,10,0.15)', border:'1px solid rgba(232,86,10,0.3)', color:'#F59E0B', borderRadius:7, padding:'3px 9px', fontSize:11 }}>✗ {f}</span>)}
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            <button onClick={handleAccept} disabled={accepting} style={{ flex:2, background:`linear-gradient(135deg,${G},#159960)`, color:'#fff', border:'none', borderRadius:14, padding:'16px 0', fontSize:16, fontWeight:700, cursor:'pointer', fontFamily:FONT, boxShadow:`0 4px 20px rgba(29,158,117,0.4)` }}>
              {accepting ? 'Taking you in...' : '✓ Accept & Start Tracking'}
            </button>
            <button onClick={() => setShowRevise(!showRevise)} style={{ flex:1, background:'none', border:'1.5px solid rgba(255,255,255,0.2)', color:'#fff', borderRadius:14, padding:'16px 0', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:FONT }}>✏️ Revise with AI</button>
          </div>

          {template?.weekly_variation && <div style={{ background:'rgba(113,75,183,0.1)', border:'1px solid rgba(113,75,183,0.25)', borderRadius:12, padding:'10px 14px', marginBottom:16 }}><span style={{ color:'#A78BFA', fontWeight:600, fontSize:12 }}>🔄 WEEKLY TIP: </span><span style={{ color:'rgba(255,255,255,0.55)', fontSize:12 }}>{template.weekly_variation}</span></div>}

          {showRevise && (
            <div style={{ background:N, borderRadius:16, overflow:'hidden' }}>
              <div style={{ background:'rgba(255,255,255,0.05)', padding:'12px 16px', color:'#fff', fontWeight:700, fontSize:14, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>💬 Revise with AI</div>
              <div ref={chatRef} style={{ height:180, overflowY:'auto', padding:'12px 16px' }}>
                {chatLog.length === 0 && <div style={{ color:'rgba(255,255,255,0.3)', fontSize:12, fontStyle:'italic' }}>e.g. "Make breakfast vegetarian" or "Replace eggs with something else"</div>}
                {chatLog.map((m,i) => <div key={i} style={{ padding:'7px 11px', borderRadius:9, marginBottom:6, fontSize:12, background: m.role==='user' ? G : 'rgba(255,255,255,0.06)', color:'#fff', maxWidth:'80%', marginLeft: m.role==='user' ? 'auto' : '0' }}>{m.text}</div>)}
                {chatLoading && <div style={{ color:G, fontSize:12 }}>AI thinking...</div>}
              </div>
              <div style={{ display:'flex', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key==='Enter'&&!chatLoading&&handleRevise()} placeholder="What would you like to change?" style={{ flex:1, background:'none', border:'none', color:'#fff', padding:'12px 14px', fontSize:13, outline:'none', fontFamily:FONT }} />
                <button onClick={handleRevise} disabled={chatLoading||!chatMsg.trim()} style={{ background:G, color:'#fff', border:'none', padding:'0 18px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT, opacity: chatLoading||!chatMsg.trim() ? 0.4 : 1 }}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
                  }
