// pages/ai/chat.js — Blitora Pulse AI Chat v2
// Updated to match new prototype UI: navy topbar, green Pulse AI branding, chip navigation

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getSupabase } from '../../lib/supabase';

const G='#1D9E75', N='#0D1B3E', PU='#1D9E75', MG='#E0E3ED', LG='#F5F6FA';
const DG='#4A5568', BG='#718096', WH='#fff';

const QUICK_CHIPS = [
  'What should I eat for breakfast?',
  'Am I getting enough protein?',
  'High-protein snack ideas',
  'How much water should I drink?',
  'What foods help with weight loss?',
  'Suggest a light dinner for tonight',
  'Plan tomorrow\'s meals',
  'Goal timeline — when will I reach my target?',
];

export default function AIChat() {
  const router = useRouter();
  const [profile, setProfile]   = useState(null);
  const [todayLog, setTodayLog] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [quota, setQuota]       = useState(null);
  const [error, setError]       = useState('');
  const [initDone, setInitDone] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    async function init() {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: p } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
      if (!p) { router.push('/'); return; }
      setProfile(p);
      const today = new Date().toISOString().split('T')[0];
      const { data: log } = await sb.from('health_logs').select('*').eq('user_id', p.id).eq('log_date', today).single();
      setTodayLog(log);
      fetchQuota(p.id);
      setInitDone(true);
    }
    init();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, loading]);

  async function fetchQuota(userId) {
    try {
      const res = await fetch('/api/ai/chat-quota', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ userId }) });
      setQuota(await res.json());
    } catch(e) { console.error(e); }
  }

  async function sendMessage(text) {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    if (quota && quota.remaining <= 0) { setError(`Daily limit reached (${quota.limit} messages). Resets tomorrow.`); return; }
    setInput('');
    setError('');
    setMessages(m => [...m, { role:'user', content:userText }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message: userText, profile, todayLog }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setMessages(m => [...m, { role:'assistant', content:data.reply, model:data.model }]);
      if (profile) fetchQuota(profile.id);
    } catch(e) {
      setError(e.message);
      setMessages(m => [...m, { role:'assistant', content:'Sorry, something went wrong. Please try again.', error:true }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <>
      <Head>
        <title>Pulse AI · Blitora Pulse</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
      </Head>

      <div style={{display:'flex',flexDirection:'column',height:'100vh',background:LG,fontFamily:"'Poppins',Arial,sans-serif"}}>

        {/* ── Topbar ── */}
        <div style={{background:N,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,flexShrink:0,position:'sticky',top:0,zIndex:20}}>
          <Link href="/dashboard" style={{textDecoration:'none'}}>
            <div style={{width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.6)',fontSize:22,cursor:'pointer'}}>←</div>
          </Link>
          <div style={{height:34,background:G,borderRadius:'50%',width:34,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:15,flexShrink:0}}>✦</div>
          <div>
            <div style={{color:'#fff',fontSize:14,fontWeight:700}}>Pulse AI</div>
            <div style={{color:G,fontSize:10,fontWeight:600}}>Health companion · Active</div>
          </div>
          {quota && (
            <div style={{marginLeft:'auto',background:'rgba(255,255,255,0.1)',borderRadius:20,padding:'3px 10px',color:'rgba(255,255,255,0.5)',fontSize:10}}>
              {quota.remaining}/{quota.limit} left
            </div>
          )}
        </div>

        {/* ── Messages ── */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 14px',display:'flex',flexDirection:'column',gap:12}}>

          {/* Welcome message */}
          {initDone && messages.length === 0 && (
            <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:PU,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,flexShrink:0}}>✦</div>
              <div style={{maxWidth:'82%',padding:'11px 14px',borderRadius:16,borderBottomLeftRadius:4,background:WH,border:`1px solid ${MG}`,fontSize:13,lineHeight:1.6,color:DG}}>
                Hi {firstName} 👋 I'm Pulse AI, your health companion.
                {todayLog && todayLog.total_calories > 0 && (
                  <> You've logged <strong style={{color:G}}>{todayLog.total_calories} kcal</strong> today. </>
                )}
                {' '}Ask me anything about your nutrition, meal ideas, or health goals.
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{display:'flex',alignItems:'flex-end',gap:8,flexDirection:m.role==='user'?'row-reverse':'row'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:m.role==='user'?G:PU,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:700,flexShrink:0}}>
                {m.role==='user'?firstName[0].toUpperCase():'✦'}
              </div>
              <div style={{maxWidth:'80%',padding:'10px 14px',borderRadius:16,fontSize:13,lineHeight:1.6,
                background:m.role==='user'?N:WH,
                color:m.role==='user'?'#fff':m.error?'#E24B4A':DG,
                border:m.role==='user'?'none':`1px solid ${MG}`,
                borderBottomLeftRadius:m.role==='user'?16:4,
                borderBottomRightRadius:m.role==='user'?4:16,
              }}>
                {m.content}
                {m.model && <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',marginTop:4}}>via {m.model}</div>}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:PU,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12}}>✦</div>
              <div style={{background:WH,border:`1px solid ${MG}`,borderRadius:16,borderBottomLeftRadius:4,padding:'10px 16px',display:'flex',gap:5,alignItems:'center'}}>
                {[0,1,2].map(i => (
                  <div key={i} style={{width:7,height:7,borderRadius:'50%',background:MG,animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite`}}/>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:12,padding:'10px 14px',fontSize:12,color:'#DC2626'}}>
              {error}
            </div>
          )}

          <div ref={bottomRef}/>
        </div>

        {/* ── Quick chips ── */}
        {messages.length < 2 && (
          <div style={{display:'flex',gap:8,padding:'0 14px 10px',overflowX:'auto',flexShrink:0,scrollbarWidth:'none'}}>
            {QUICK_CHIPS.map(c => (
              <button key={c} onClick={() => sendMessage(c)} style={{background:WH,border:`1.5px solid ${MG}`,borderRadius:20,padding:'6px 13px',fontSize:11,fontWeight:600,color:N,whiteSpace:'nowrap',cursor:'pointer',fontFamily:"'Poppins',Arial,sans-serif",flexShrink:0}}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* ── Input row ── */}
        <div style={{background:WH,borderTop:`1px solid ${MG}`,padding:'10px 14px',display:'flex',gap:9,alignItems:'center',flexShrink:0}}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask Pulse AI anything…"
            disabled={loading}
            style={{flex:1,border:`1.5px solid ${MG}`,borderRadius:24,padding:'9px 16px',fontSize:13,fontFamily:"'Poppins',Arial,sans-serif",color:N,outline:'none',background:LG}}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{width:38,height:38,background:input.trim()?G:MG,borderRadius:'50%',border:'none',color:'#fff',fontSize:18,cursor:input.trim()?'pointer':'default',transition:'background .15s',display:'flex',alignItems:'center',justifyContent:'center'}}
          >
            →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
        ::-webkit-scrollbar { display:none }
      `}</style>
    </>
  );
}
