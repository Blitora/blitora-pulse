// pages/my-plan.js
// Post-signup plan review screen for individual users.
// Shows the AI-generated meal plan. User can:
//   1. Accept → goes to dashboard
//   2. Revise via AI chat → re-generates → review again
//   3. Download PDF (print-friendly)
// Also reachable from sidebar anytime (My Plan).

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getSupabase } from '../lib/supabase';

const G = '#1D9E75', N = '#0D1B3E', AMB = '#EF9F27';
const FONT = "'Poppins', Arial, sans-serif";

export default function MyPlan() {
  const router = useRouter();
  const [loading, setLoading]   = useState(true);
  const [profile, setProfile]   = useState(null);
  const [template, setTemplate] = useState(null);
  const [slots, setSlots]       = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg]   = useState('');
  const [chatLog, setChatLog]   = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError]       = useState('');
  const chatRef = useRef();

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatLog]);

  async function load() {
    setLoading(true);
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { router.replace('/login'); return; }

    const { data: prof } = await sb.from('profiles')
      .select('id,full_name,active_template_id,calorie_target,protein_target,carb_target,fat_target,water_target,conditions,health_conditions,dob,gender,weight_target,goal_weight,weight_current,current_weight,account_type,setup_complete')
      .eq('id', session.user.id)
      .single();

    if (!prof) { router.replace('/dashboard'); return; }
    if (prof.account_type === 'clinic') { router.replace('/clinic/patients'); return; }
    setProfile(prof);

    if (prof.active_template_id) {
      const { data: tmpl } = await sb.from('meal_templates')
        .select('id,name,description')
        .eq('id', prof.active_template_id)
        .single();
      setTemplate(tmpl);

      const { data: items } = await sb.from('template_food_items')
        .select('*')
        .eq('template_id', prof.active_template_id)
        .order('meal_slot');
      if (items) {
        const grouped = {};
        items.forEach(item => {
          if (!grouped[item.meal_slot]) grouped[item.meal_slot] = [];
          grouped[item.meal_slot].push(item);
        });
        setSlots(Object.entries(grouped).map(([slot, foods]) => ({ slot, foods })));
      }
    }
    setLoading(false);
  }

  async function handleAccept() {
    setAccepting(true);
    router.replace('/dashboard');
  }

  async function handleRevise() {
    if (!chatMsg.trim()) return;
    setChatLoading(true);
    const userMsg = chatMsg.trim();
    setChatMsg('');
    setChatLog(l => [...l, { role: 'user', text: userMsg }]);

    try {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch('/api/ai/revise-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          revision: userMsg,
          currentTemplateName: template?.name,
          profile: {
            healthConditions: profile.conditions || profile.health_conditions || [],
            calorieTarget: profile.calorie_target,
            proteinTarget: profile.protein_target,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChatLog(l => [...l, { role: 'ai', text: data.message || 'Plan updated! Refreshing…' }]);
        setRegenerating(true);
        await load();
        setRegenerating(false);
      } else {
        setChatLog(l => [...l, { role: 'ai', text: data.error || 'Something went wrong. Please try again.' }]);
      }
    } catch (e) {
      setChatLog(l => [...l, { role: 'ai', text: 'Could not connect. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleDownload() {
    const w = window.open('', '_blank');
    const slotHtml = slots.map(({ slot, foods }) => `
      <div class="slot">
        <h3>${slot.charAt(0).toUpperCase() + slot.slice(1).replace(/_/g,' ')}</h3>
        <table><thead><tr><th>Food</th><th>Cal</th><th>Protein</th><th>Carbs</th><th>Fat</th></tr></thead>
        <tbody>${foods.map(f => `<tr><td>${f.name}</td><td>${f.calories||'-'}</td><td>${f.protein||'-'}g</td><td>${f.carbs||'-'}g</td><td>${f.fat||'-'}g</td></tr>`).join('')}</tbody>
        </table>
      </div>`).join('');

    w.document.write(`<!DOCTYPE html><html><head><title>My Plan — Blitora Pulse</title>
      <style>
        body{font-family:'Segoe UI',Arial,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#1A202C}
        h1{color:#0D1B3E;margin-bottom:4px}
        h2{color:#1D9E75;font-size:14px;margin-bottom:24px;font-weight:normal}
        h3{color:#0D1B3E;font-size:13px;margin:20px 0 8px;text-transform:uppercase;letter-spacing:.5px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}
        th{background:#0D1B3E;color:#fff;padding:6px 10px;text-align:left}
        td{padding:5px 10px;border-bottom:1px solid #E0E3ED}
        tr:nth-child(even)td{background:#F5F6FA}
        .macros{display:flex;gap:16px;background:#F0FDF4;border-radius:8px;padding:14px 20px;margin:16px 0}
        .macro{text-align:center}.macro-val{font-size:20px;font-weight:700;color:#0D1B3E}
        .macro-lbl{font-size:10px;color:#718096;text-transform:uppercase}
        .slot{margin-bottom:8px}
        .footer{margin-top:32px;font-size:11px;color:#9CA3AF;border-top:1px solid #E0E3ED;padding-top:12px}
        @media print{body{margin:20px}}
      </style></head><body>
      <h1>${template?.name || 'My Personalised Meal Plan'}</h1>
      <h2>Generated by Blitora Pulse · ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</h2>
      <div class="macros">
        <div class="macro"><div class="macro-val">${profile?.calorie_target||'-'}</div><div class="macro-lbl">Calories</div></div>
        <div class="macro"><div class="macro-val">${profile?.protein_target||'-'}g</div><div class="macro-lbl">Protein</div></div>
        <div class="macro"><div class="macro-val">${profile?.carb_target||'-'}g</div><div class="macro-lbl">Carbs</div></div>
        <div class="macro"><div class="macro-val">${profile?.fat_target||'-'}g</div><div class="macro-lbl">Fat</div></div>
        <div class="macro"><div class="macro-val">${profile?.water_target||'2.5'}L</div><div class="macro-lbl">Water</div></div>
      </div>
      ${slotHtml}
      <div class="footer">Blitora Pulse · Health Made Intelligent · pulse.blitora.com</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  const s = {
    page: { minHeight:'100vh', background:'#F5F6FA', fontFamily:FONT, padding:'24px 16px' },
    card: { background:'#fff', borderRadius:16, padding:'28px 24px', maxWidth:720, margin:'0 auto', boxShadow:'0 2px 16px rgba(13,27,62,.07)' },
    h1:  { fontSize:22, fontWeight:700, color:N, margin:'0 0 4px' },
    sub: { fontSize:13, color:'#718096', marginBottom:24 },
    macroRow: { display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' },
    macroBox: { flex:'1 1 80px', background:'#F0FDF4', borderRadius:12, padding:'12px 10px', textAlign:'center', minWidth:70 },
    macroVal: { fontSize:20, fontWeight:700, color:N, lineHeight:1.1 },
    macroLbl: { fontSize:10, color:'#718096', textTransform:'uppercase', letterSpacing:.5, marginTop:2 },
    slot: { marginBottom:16, border:'1px solid #E0E3ED', borderRadius:12, overflow:'hidden' },
    slotHdr: { background:N, color:'#fff', padding:'8px 14px', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:.5 },
    foodRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', borderBottom:'1px solid #F0F0F0', fontSize:13 },
    pill: { fontSize:10, background:'#E8F7F1', color:G, borderRadius:20, padding:'2px 8px', fontWeight:600, marginLeft:6 },
    btn: { background:G, color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:FONT },
    btnOutline: { background:'#fff', color:N, border:`2px solid ${N}`, borderRadius:10, padding:'11px 22px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:FONT },
    btnAmber: { background:AMB, color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:FONT },
    chatBubble: { padding:'10px 14px', borderRadius:12, maxWidth:'82%', fontSize:13, lineHeight:1.5 },
  };

  if (loading || regenerating) return (
    <div style={{ ...s.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:44, height:44, border:`4px solid ${G}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 16px' }}/>
        <p style={{ fontFamily:FONT, color:N, fontWeight:600 }}>{regenerating ? 'Updating your plan…' : 'Loading your plan…'}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );

  const noPlan = !template || slots.length === 0;

  return (
    <>
      <Head><title>My Plan · Blitora Pulse</title></Head>
      <div style={s.page}>
        <div style={s.card}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ background:N, borderRadius:12, padding:'8px 14px', display:'inline-flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:18 }}>🥗</span>
              <span style={{ color:'#fff', fontSize:13, fontWeight:700 }}>My Plan</span>
            </div>
            <div style={{ flex:1 }}/>
            <button style={{ ...s.btnOutline, padding:'7px 14px', fontSize:12 }} onClick={handleDownload}>⬇ Download PDF</button>
          </div>

          <h1 style={s.h1}>{template?.name || 'Your Personalised Meal Plan'}</h1>
          <p style={s.sub}>{template?.description || 'AI-generated based on your health profile. Review below and accept or request changes.'}</p>

          {/* Macro targets */}
          {!noPlan && (
            <div style={s.macroRow}>
              {[
                { val: profile?.calorie_target, lbl:'Calories', unit:'kcal' },
                { val: (profile?.protein_target||0)+'g', lbl:'Protein' },
                { val: (profile?.carb_target||0)+'g', lbl:'Carbs' },
                { val: (profile?.fat_target||0)+'g', lbl:'Fat' },
                { val: (profile?.water_target||2.5)+'L', lbl:'Water' },
              ].map(m => (
                <div key={m.lbl} style={s.macroBox}>
                  <div style={s.macroVal}>{m.val}</div>
                  <div style={s.macroLbl}>{m.lbl}</div>
                </div>
              ))}
            </div>
          )}

          {/* No plan generated yet */}
          {noPlan ? (
            <div style={{ background:'#FFF8E6', border:`1px solid ${AMB}`, borderRadius:12, padding:'20px 18px', marginBottom:24, textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>⏳</div>
              <p style={{ fontWeight:700, color:N, margin:'0 0 6px' }}>Your plan is being generated</p>
              <p style={{ fontSize:13, color:'#718096', margin:'0 0 16px' }}>This usually takes 10–20 seconds. Refresh to check.</p>
              <button style={s.btn} onClick={load}>Refresh</button>
            </div>
          ) : (
            <>
              {/* Meal slots */}
              {slots.map(({ slot, foods }) => (
                <div key={slot} style={s.slot}>
                  <div style={s.slotHdr}>{slot.charAt(0).toUpperCase() + slot.slice(1).replace(/_/g,' ')}</div>
                  {foods.map((f, i) => (
                    <div key={i} style={{ ...s.foodRow, background: i % 2 === 0 ? '#fff' : '#FAFBFF' }}>
                      <span style={{ fontWeight:500, color:N }}>{f.name}</span>
                      <div style={{ display:'flex', gap:10, fontSize:11, color:'#718096' }}>
                        {f.calories ? <span><b style={{ color:N }}>{f.calories}</b> kcal</span> : null}
                        {f.protein  ? <span style={s.pill}>P {f.protein}g</span> : null}
                        {f.carbs    ? <span style={s.pill}>C {f.carbs}g</span>   : null}
                        {f.fat      ? <span style={s.pill}>F {f.fat}g</span>     : null}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {error && <div style={{ background:'#FEE2E2', color:'#C0392B', borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:16 }}>{error}</div>}

          {/* Action buttons */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:24 }}>
            <button style={{ ...s.btn, opacity: accepting ? .7 : 1 }} disabled={accepting} onClick={handleAccept}>
              {accepting ? 'Taking you to dashboard…' : '✓ Accept & Start Tracking'}
            </button>
            {!noPlan && (
              <button style={s.btnAmber} onClick={() => setChatOpen(o => !o)}>
                ✦ {chatOpen ? 'Hide AI Chat' : 'Revise with AI'}
              </button>
            )}
          </div>

          <p style={{ fontSize:11, color:'}9CA3AF', marginTop:12 }}>
            You can always view this plan later from <b>My Plan</b> in the sidebar.
          </p>

          {/* AI Revision Chat */}
          {chatOpen && (
            <div style={{ marginTop:24, border:'1px solid #E0E3ED', borderRadius:14, overflow:'hidden' }}>
              <div style={{ background:N, padding:'10px 14px', fontSize:13, fontWeight:700, color:'#fff' }}>
                ✦ Revise your plan with AI
              </div>
              <div ref={chatRef} style={{ height:220, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                {chatLog.length === 0 && (
                  <p style={{ fontSize:12, color:'}9CA3AF', fontStyle:'italic' }}>
                    Tell AI what to change — e.g. "No paneer", "More protein at breakfast", "Replace evening snack with fruits"
                  </p>
                )}
                {chatLog.map((m, i) => (
                  <div key={i} style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ ...s.chatBubble, background: m.role==='user' ? G : '#F0F4FF', color: m.role==='user' ? '#fff' : N }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <div style={{ width:8, height:8, background:G, borderRadius:'50%', animation:'pulse 1s infinite' }}/>
                    <span style={{ fontSize:12, color:'#718096' }}>AI is revising your plan…</span>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:8, padding:'10px 12px', borderTop:'1px solid #E0E3ED' }}>
                <input
                  value={chatMsg}
                  onChange={e => setChatMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !chatLoading && handleRevise()}
                  placeholder="What would you like to change?"
                  style={{ flex:1, border:'1px solid #E0E3ED', borderRadius:8, padding:'8px 12px', fontSize:13, fontFamily:FONT, outline:'none' }}
                />
                <button
                  onClick={handleRevise}
                  disabled={chatLoading || !chatMsg.trim()}
                  style={{ ...s.btn, padding:'8px 18px', fontSize:13, opacity: chatLoading || !chatMsg.trim() ? .6 : 1 }}
                >
                  Send
                </button>
              </div>
              <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
