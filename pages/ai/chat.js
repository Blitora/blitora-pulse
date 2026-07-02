// pages/ai/chat.js
// Blitora Pulse — AI Chat Screen
// Full conversational AI for individual users
// Model: Gemini (basic/trial) | Haiku (pro/premium)
// Quota tracked per user per month

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getSupabase } from '../../lib/supabase';
import Layout from '../../components/Layout';

const G = '#1D9E75', P = '#714B67', PL = '#f3eef1';
const BORDER = '#E0E3ED', TXT = '#0D1B3E', TXT2 = '#718096', TXT3 = '#CBD5E0';
const BG = '#F5F6FA', CARD = '#fff';

// Quick chip questions shown at start
const QUICK_CHIPS = [
  'What should I eat for breakfast?',
  'Am I getting enough protein?',
  'High-protein snack ideas',
  'How much water should I drink?',
  'What foods help with weight loss?',
  'Suggest a light dinner for tonight',
];

export default function AIChat() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [todayLog, setTodayLog] = useState(null);
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', content, model? }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState(null); // { used, limit, remaining }
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    async function init() {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push('/'); return; }
      const { data: p } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
      if (!p) { router.push('/'); return; }
      setProfile(p);

      // Load today's log for context
      const today = new Date().toISOString().split('T')[0];
      const { data: log } = await sb.from('health_logs').select('*')
        .eq('user_id', p.id).eq('log_date', today).single();
      setTodayLog(log);

      // Load quota
      fetchQuota(p.id);
    }
    init();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function fetchQuota(userId) {
    try {
      const res = await fetch('/api/ai/chat-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      setQuota(data);
    } catch (e) {
      console.error('Quota fetch error:', e);
    }
  }

  async function sendMessage(text) {
    const userText = (text || input).trim();
    if (!userText || loading || !profile) return;
    if (quota && quota.remaining <= 0) {
      setError('quota_exceeded');
      return;
    }

    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      // Build conversation history for context
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          plan: profile.plan || 'trial',
          message: userText,
          history,
          profile: {
            fullName: profile.full_name,
            age: profile.dob
              ? Math.floor((Date.now() - new Date(profile.dob)) / (365.25 * 864e5))
              : profile.age || 30,
            gender: profile.gender || 'Not specified',
            healthConditions: profile.conditions
              ? Object.keys(profile.conditions).filter(k => k !== 'none')
              : [],
            dietaryPref: profile.diet_type || 'Mixed',
            primaryGoal: 'Stay healthy',
            dailyCalorieTarget: profile.calorie_target || 1600,
            proteinTarget: profile.protein_target || 100,
            carbTarget: profile.carb_target || 130,
            fatTarget: profile.fat_target || 55,
          },
          todayLog: todayLog ? {
            totalCalories: todayLog.total_calories || 0,
            totalProtein: todayLog.total_protein || 0,
            totalWaterMl: (todayLog.water || 0) * 500,
          } : null,
          country: profile.country || null,
        }),
      });

      const data = await res.json();

      if (data.error === 'quota_exceeded') {
        setError('quota_exceeded');
        setMessages(prev => prev.slice(0, -1)); // remove user message
        return;
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content,
        model: data.model,
        downgraded: data.downgraded,
      }]);

      // Refresh quota after each message
      fetchQuota(profile.id);

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        model: 'error',
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isToday = true; // chat always about today

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: `3px solid ${G}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <Head><title>AI Health Coach — Blitora Pulse</title></Head>
      <style>{`
        body { font-family: 'Poppins', Arial, sans-serif; }
        .msg-bubble { max-width: 85%; word-break: break-word; line-height: 1.55; }
        @keyframes fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: 600, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ padding: '12px 16px 8px', background: CARD, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: P,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
              }}>✨</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TXT }}>AI Health Coach</div>
                <div style={{ fontSize: 10, color: TXT2 }}>Ask anything about your nutrition & health</div>
              </div>
              {quota && (
                <div style={{
                  fontSize: 10, color: quota.remaining < 10 ? '#EF9F27' : TXT2,
                  fontWeight: 600, textAlign: 'right',
                }}>
                  {quota.remaining}/{quota.limit}<br />
                  <span style={{ fontWeight: 400 }}>msgs left</span>
                </div>
              )}
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Welcome state */}
            {messages.length === 0 && (
              <div style={{ animation: 'fadein .4s ease' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f3eef1, #ede8f5)',
                  borderRadius: 14, padding: '14px 16px', marginBottom: 16,
                  border: '1px solid #e0d8ec',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: P, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    ✨ AI Health Coach
                  </div>
                  <div style={{ fontSize: 13, color: TXT, lineHeight: 1.6 }}>
                    Hi {profile.full_name?.split(' ')[0] || 'there'}! I'm your AI health coach. I know your health profile and today's food log, so I can give you personalised advice.
                    <br /><br />
                    Ask me anything about nutrition, meal suggestions, or your health goals.
                  </div>
                </div>

                {/* Quick chips */}
                <div style={{ fontSize: 10, fontWeight: 700, color: TXT2, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Quick questions
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {QUICK_CHIPS.map(chip => (
                    <button
                      key={chip}
                      onClick={() => sendMessage(chip)}
                      style={{
                        padding: '7px 12px', borderRadius: 20,
                        border: `1.5px solid ${BORDER}`, background: CARD,
                        fontSize: 11, color: TXT, cursor: 'pointer', fontWeight: 500,
                        fontFamily: "'Poppins', Arial, sans-serif",
                        transition: 'all .15s',
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'fadein .3s ease',
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: P,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 2,
                  }}>✨</div>
                )}
                <div
                  className="msg-bubble"
                  style={{
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role === 'user' ? G : CARD,
                    color: msg.role === 'user' ? '#fff' : TXT,
                    fontSize: 13,
                    border: msg.role === 'assistant' ? `1px solid ${BORDER}` : 'none',
                    boxShadow: msg.role === 'assistant' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {msg.content}
                  {msg.downgraded && (
                    <div style={{ fontSize: 9, color: TXT3, marginTop: 4 }}>· basic mode</div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'fadein .3s ease' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: P,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>✨</div>
                <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: CARD, borderRadius: '18px 18px 18px 4px', border: `1px solid ${BORDER}` }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%', background: P,
                      animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Quota exceeded message */}
            {error === 'quota_exceeded' && (
              <div style={{
                background: '#FFFBEB', border: '1px solid #FDE68A',
                borderRadius: 12, padding: '14px 16px', animation: 'fadein .3s ease',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 6 }}>
                  Monthly AI limit reached
                </div>
                <div style={{ fontSize: 12, color: '#92400E', marginBottom: 12 }}>
                  You've used all your AI messages this month.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button style={{
                    padding: '8px 14px', borderRadius: 8, background: '#EF9F27',
                    color: '#fff', border: 'none', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: "'Poppins', Arial, sans-serif",
                  }}>
                    Buy 20 more messages — ₹49
                  </button>
                  <button
                    onClick={() => router.push('/profile')}
                    style={{
                      padding: '8px 14px', borderRadius: 8, background: G,
                      color: '#fff', border: 'none', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: "'Poppins', Arial, sans-serif",
                    }}
                  >
                    Upgrade plan
                  </button>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '10px 16px 16px',
            background: CARD,
            borderTop: `1px solid ${BORDER}`,
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-end',
              background: BG, borderRadius: 14, padding: '8px 12px',
              border: `1.5px solid ${BORDER}`,
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your AI health coach…"
                rows={1}
                style={{
                  flex: 1, border: 'none', background: 'transparent',
                  fontSize: 13, color: TXT, outline: 'none', resize: 'none',
                  fontFamily: "'Poppins', Arial, sans-serif", lineHeight: 1.5,
                  maxHeight: 80, overflowY: 'auto',
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: input.trim() && !loading ? G : BORDER,
                  border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background .2s', fontSize: 16,
                }}
              >
                {loading
                  ? <div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                  : <span style={{ color: '#fff', fontSize: 14, marginLeft: 2 }}>▶</span>
                }
              </button>
            </div>
            <div style={{ fontSize: 9, color: TXT3, textAlign: 'center', marginTop: 6 }}>
              AI provides nutrition guidance only · Always consult a doctor for medical advice
            </div>
          </div>

        </div>
      </Layout>
    </>
  );
}
