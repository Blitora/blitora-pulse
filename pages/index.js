import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getSupabase } from '../lib/supabase';

const c = {
  navy:'#0D1B3E', green:'#1D9E75', white:'#FFFFFF',
  lgrey:'#F5F6FA', mgrey:'#E0E3ED', dgrey:'#4A5568', bgrey:'#718096', dkgreen:'#0D4A35',
};

/* ── Pricing plans ── */
const indPlans = [
  { name:'Starter', sub:'Great to get started', priceINR:99, priceUSD:4.99, highlight:false,
    trial:'30-day free trial', trialSub:'Then ₹99/month · Cancel anytime',
    ctaLabel:'Start 30-day free trial', ctaStyle:'trial',
    tag:'Includes in trial & plan:',
    features:[{l:'AI chat messages',v:'20/month'},{l:'AI meal plans',v:'2/month'},{l:'Food log history',v:'90 days'},{l:'Daily AI insights',v:true},{l:'Data export',v:false}] },
  { name:'Plus', sub:'Most popular choice', priceINR:189, priceUSD:8.99, highlight:true,
    trial:null, trialSub:'No trial · Subscribe for 1 month to evaluate',
    ctaLabel:'Subscribe to Plus', ctaStyle:'primary',
    tag:'Everything in Starter +',
    features:[{l:'AI chat messages',v:'50/month'},{l:'AI meal plans',v:'8/month'},{l:'Food log history',v:'1 year'},{l:'Daily AI insights',v:true},{l:'Data export',v:'PDF'}] },
  { name:'Premium', sub:'For serious goals', priceINR:449, priceUSD:12.99, highlight:false,
    trial:null, trialSub:'No trial · Subscribe for 1 month to evaluate',
    ctaLabel:'Subscribe to Premium', ctaStyle:'outline',
    tag:'Everything in Plus +',
    features:[{l:'AI chat messages',v:'100/month'},{l:'AI meal plans',v:'15/month'},{l:'Food log history',v:'3 years'},{l:'Daily AI insights',v:true},{l:'Data export',v:'PDF + CSV'}] },
];
const clinicPlans = [
  { name:'Starter', sub:'Solo practice', priceINR:499, priceUSD:12.99, highlight:false,
    trial:'14-day free trial', trialSub:'Starter features · Then ₹499/month',
    ctaLabel:'Start 14-day free trial', ctaStyle:'trial',
    tag:'Includes in trial & plan:',
    features:[{l:'Patients',v:'15'},{l:'AI patient plans',v:'15/month'},{l:'Dietitian AI chat',v:'30/month'},{l:'Compliance reports',v:'Basic'},{l:'Data export',v:false}] },
  { name:'Professional', sub:'Growing clinic', priceINR:999, priceUSD:29.99, highlight:true,
    trial:null, trialSub:'No trial · Subscribe for 1 month to evaluate',
    ctaLabel:'Subscribe to Professional', ctaStyle:'primary',
    tag:'Everything in Starter +',
    features:[{l:'Patients',v:'50'},{l:'AI patient plans',v:'40/month'},{l:'Dietitian AI chat',v:'100/month'},{l:'Compliance reports',v:'Advanced'},{l:'Data export',v:'PDF'}] },
  { name:'Premium', sub:'Large practice', priceINR:2499, priceUSD:59.99, highlight:false,
    trial:null, trialSub:'No trial · Subscribe for 1 month to evaluate',
    ctaLabel:'Subscribe to Premium', ctaStyle:'outline',
    tag:'Everything in Professional +',
    features:[{l:'Patients',v:'200'},{l:'AI patient plans',v:'100/month'},{l:'Dietitian AI chat',v:'200/month'},{l:'Compliance reports',v:'Advanced'},{l:'Data export',v:'PDF + CSV'}] },
];

function detectINR() {
  try { const tz=Intl.DateTimeFormat().resolvedOptions().timeZone; return tz&&(tz.includes('Calcutta')||tz.includes('Kolkata')); } catch{return false;}
}

/* ── Lead Capture Modal ── */
function LeadModal({ doc, onClose }) {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr]     = useState('');
  const [done, setDone]   = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setErr('Please enter your name and email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('Please enter a valid email address.'); return; }
    setErr(''); setLoading(true);

    try {
      // Store lead (fire-and-forget — don't block download)
      fetch('/api/lead-capture', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name, email, phone, document: doc.title, source:'brochure_download' }),
      }).catch(()=>{});
    } catch(_) {}

    setLoading(false); setDone(true);

    // Trigger download after short delay
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = doc.file;
      link.download = doc.title + '.pdf';
      link.click();
      setTimeout(onClose, 500);
    }, 800);
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', backgroundColor:'rgba(13,27,62,0.7)', backdropFilter:'blur(4px)' }}
         onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:c.white, borderRadius:20, padding:'36px', maxWidth:440, width:'100%', boxShadow:'0 24px 80px rgba(0,0,0,0.25)' }}>
        {!done ? (
          <>
            <div style={{ fontSize:28, marginBottom:12 }}>{doc.icon}</div>
            <h3 style={{ fontWeight:800, fontSize:20, color:c.navy, marginBottom:6 }}>Download {doc.title}</h3>
            <p style={{ fontSize:14, color:c.dgrey, marginBottom:24, lineHeight:1.5 }}>
              Enter your details and we'll send the download link to your email too.
            </p>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, color:c.navy, display:'block', marginBottom:6 }}>Full name *</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"
                  style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1.5px solid ${err&&!name?'#C0392B':c.mgrey}`, fontSize:14, outline:'none', fontFamily:'inherit' }}/>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:13, fontWeight:600, color:c.navy, display:'block', marginBottom:6 }}>Email address *</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"
                  style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1.5px solid ${err&&!email?'#C0392B':c.mgrey}`, fontSize:14, outline:'none', fontFamily:'inherit' }}/>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:13, fontWeight:600, color:c.navy, display:'block', marginBottom:6 }}>
                  Mobile number <span style={{ color:c.bgrey, fontWeight:400 }}>(optional)</span>
                </label>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210"
                  style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:`1.5px solid ${c.mgrey}`, fontSize:14, outline:'none', fontFamily:'inherit' }}/>
              </div>
              {err && <p style={{ color:'#C0392B', fontSize:13, marginBottom:12 }}>{err}</p>}
              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:'13px', borderRadius:12, backgroundColor:c.green, color:c.white, fontWeight:700, fontSize:15, border:'none', cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {loading ? 'Processing…' : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
              <p style={{ fontSize:12, color:c.bgrey, textAlign:'center', marginTop:12 }}>
                We respect your privacy. No spam, ever.
              </p>
            </form>
            <button onClick={onClose} style={{ position:'absolute', top:20, right:20, background:'none', border:'none', cursor:'pointer', fontSize:22, color:c.bgrey, lineHeight:1 }} aria-label="Close">×</button>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
            <h3 style={{ fontWeight:800, fontSize:20, color:c.navy, marginBottom:8 }}>Download starting…</h3>
            <p style={{ fontSize:14, color:c.dgrey }}>We've also emailed a copy to {email}. Check your inbox!</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── NAV ── */
function Nav() {
  return (
    <header style={{ position:'sticky', top:0, zIndex:50, backgroundColor:'rgba(255,255,255,0.96)', backdropFilter:'blur(8px)', borderBottom:`1px solid ${c.mgrey}` }}>
      <div style={{ maxWidth:1152, margin:'0 auto', padding:'0 24px', height:66, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <a href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <svg width="34" height="34" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="200" rx="36" fill="#0D1B3E"/>
            <path d="M48 38L48 148L112 148C134 148 152 132 152 112C152 100 146 90 136 84C144 78 150 68 150 56C150 44 138 38 112 38ZM68 58L110 58C120 58 126 64 126 72C126 80 120 86 110 86L68 86ZM68 106L112 106C124 106 132 112 132 120C132 128 124 134 112 134L68 134Z" fill="white"/>
            <polygon points="105,46 84,90 100,90 82,136 124,80 106,80 120,46" fill="#1D9E75"/>
            <polyline points="20,162 42,162 50,144 60,180 70,152 80,162 180,162" stroke="#1D9E75" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div style={{ lineHeight:1 }}>
            <div style={{ fontWeight:800, fontSize:15, letterSpacing:'-0.3px', color:c.navy, fontFamily:"'Poppins', Arial, sans-serif" }}>BLITORA <span style={{ color:c.green }}>PULSE</span></div>
            <div style={{ fontWeight:500, fontSize:9.5, letterSpacing:'0.06em', color:'#718096', fontFamily:"'Poppins', Arial, sans-serif" }}>Health Made Intelligent.</div>
          </div>
        </a>
        <nav style={{ display:'flex', alignItems:'center', gap:24, fontSize:14, fontWeight:500 }} className="hide-mobile">
          {[['How AI works','#ai'],['Features','#features'],['For who','#forwho'],['Pricing','#pricing']].map(([l,h])=>(
            <a key={l} href={h} style={{ color:c.dgrey, textDecoration:'none' }}>{l}</a>
          ))}
        </nav>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <a href="/login" style={{ fontSize:14, fontWeight:600, color:c.navy, textDecoration:'none' }} className="hide-mobile">Sign in</a>
          <a href="/signup" style={{ padding:'10px 20px', borderRadius:50, backgroundColor:c.green, color:c.white, fontWeight:700, fontSize:14, textDecoration:'none' }}>
            Start free trial
          </a>
        </div>
      </div>
    </header>
  );
}

/* ── HERO ── */
function Hero() {
  return (
    <section style={{ position:'relative', overflow:'hidden', background:`linear-gradient(135deg, ${c.navy} 0%, #0D2E1E 60%, ${c.dkgreen} 100%)` }}>
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.05 }} viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
        <polyline points="0,300 200,300 280,200 360,400 440,300 520,300 560,150 600,450 640,300 720,300 760,200 800,350 860,300 1200,300" fill="none" stroke="#1D9E75" strokeWidth="2.5"/>
      </svg>
      <div style={{ position:'relative', maxWidth:896, margin:'0 auto', padding:'80px 24px 112px', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:50, marginBottom:28, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', backgroundColor:'rgba(29,158,117,0.15)', color:c.green, border:'1px solid rgba(29,158,117,0.3)' }}>
          ✦ AI-powered health platform
        </div>
        <h1 style={{ fontWeight:800, color:c.white, letterSpacing:'-1px', marginBottom:20, fontSize:'clamp(32px,6vw,64px)', lineHeight:1.05 }}>
          Tell us your goal.<br/><span style={{ color:c.green }}>Our AI handles the rest.</span>
        </h1>
        <p style={{ fontSize:'clamp(16px,2.5vw,20px)', lineHeight:1.6, marginBottom:16, maxWidth:640, margin:'0 auto 16px', color:'#B8D8CC' }}>
          No spreadsheets. No guessing. Just answer a few questions — our AI builds your complete health plan and keeps you on track automatically.
        </p>
        <p style={{ fontSize:13, marginBottom:32, color:'rgba(255,255,255,0.4)' }}>For individuals · dietitians · clinics</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:16, justifyContent:'center', marginBottom:16 }}>
          <a href="/signup" style={{ padding:'16px 32px', borderRadius:50, backgroundColor:c.green, color:c.white, fontWeight:700, fontSize:16, textDecoration:'none', boxShadow:'0 8px 32px rgba(29,158,117,0.4)' }}>
            Start free — 30 days →
          </a>
          <a href="#ai" style={{ padding:'16px 32px', borderRadius:50, color:c.white, fontWeight:600, fontSize:16, textDecoration:'none', border:'1.5px solid rgba(255,255,255,0.3)' }}>
            ▶ See how it works
          </a>
        </div>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', marginBottom:28 }}>
          Already have an account?{' '}
          <a href="/login" style={{ color:c.green, fontWeight:600, textDecoration:'none' }}>Sign in →</a>
        </p>
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:10 }}>
          {['30 days free','Starter features included','No credit card','Cancel anytime'].map(s=>(
            <span key={s} style={{ fontSize:13, padding:'6px 12px', borderRadius:50, fontWeight:500, backgroundColor:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)' }}>✓ {s}</span>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 1440 60" style={{ width:'100%', display:'block', marginBottom:-1 }} preserveAspectRatio="none">
        <path d="M0,60 L0,30 Q360,60 720,30 Q1080,0 1440,30 L1440,60 Z" fill="#fff"/>
      </svg>
    </section>
  );
}

/* ── 4 ANSWERS ── */
function FourAnswers() {
  const steps = [
    {icon:'🎯',you:'Your goal in one sentence',ai:'Complete meal plan + calorie targets'},
    {icon:'🥜',you:'Your food likes & dislikes',ai:'7-day plan with zero foods you hate'},
    {icon:'💪',you:'Any health conditions or allergies',ai:'Nutritionally safe, personalised plan'},
    {icon:'🏃',you:'Your lifestyle (busy / active / etc.)',ai:'Realistic plans that fit your life'},
  ];
  return (
    <section id="ai" style={{ backgroundColor:c.navy, padding:'56px 24px' }}>
      <div style={{ maxWidth:896, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <h2 style={{ fontWeight:800, fontSize:'clamp(22px,4vw,36px)', color:c.white, marginBottom:12, letterSpacing:'-0.5px' }}>4 answers. A complete health plan.</h2>
          <p style={{ fontSize:15, color:'#B8D8CC', maxWidth:480, margin:'0 auto' }}>Our AI does the nutrition science, planning, reminders, and tracking. You just live your life.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:14 }}>
          {steps.map(({icon,you,ai})=>(
            <div key={you} style={{ borderRadius:16, padding:'20px', display:'flex', alignItems:'flex-start', gap:14, backgroundColor:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize:24, flexShrink:0, marginTop:2 }}>{icon}</span>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', padding:'2px 8px', borderRadius:50, marginBottom:6, width:'fit-content', backgroundColor:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.55)' }}>You tell us</div>
                <p style={{ fontSize:14, fontWeight:600, color:c.white, marginBottom:8 }}>{you}</p>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', padding:'2px 8px', borderRadius:50, marginBottom:4, width:'fit-content', backgroundColor:'rgba(29,158,117,0.2)', color:c.green }}>AI delivers</div>
                <p style={{ fontSize:14, color:c.green }}>{ai}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:28 }}>
          <a href="/signup" style={{ display:'inline-block', padding:'14px 32px', borderRadius:50, backgroundColor:c.green, color:c.white, fontWeight:700, fontSize:15, textDecoration:'none' }}>Try it free for 30 days →</a>
        </div>
      </div>
    </section>
  );
}


/* ── AI DEMO SECTION ── */
function AISection() {
  const [tab, setTab] = useState(0);
  const scenarios = [
    { label:"You say", input:"I want to lose weight, I'm vegetarian",
      outputs:[{icon:"📋",lbl:"AI creates",val:"7-day personalised meal plan"},{icon:"🧮",lbl:"AI calculates",val:"Your exact daily calorie target"},{icon:"💊",lbl:"AI flags",val:"Nutrients you're likely missing"},{icon:"⏰",lbl:"AI schedules",val:"Daily reminders tailored to you"},{icon:"📊",lbl:"AI tracks",val:"Your progress automatically"}],
      chat:[{role:"user",msg:"I want to lose weight. I'm vegetarian, don't like broccoli, and have 30 mins to cook each evening."},{role:"ai",msg:"Got it! I've built a 7-day vegetarian plan targeting a 500-cal daily deficit — no broccoli. Daily target: 1,650 kcal. I've also added iron and B12-rich foods since vegetarians often run low. Want a grocery list?"}] },
    { label:"Dietitian says", input:"My patient isn't hitting protein targets",
      outputs:[{icon:"🔍",lbl:"AI analyses",val:"7 days of patient logs instantly"},{icon:"📈",lbl:"AI identifies",val:"Exact meals causing the shortfall"},{icon:"💡",lbl:"AI suggests",val:"3 simple meal swaps to fix it"},{icon:"📩",lbl:"AI drafts",val:"A patient message explaining why"},{icon:"📅",lbl:"AI schedules",val:"A follow-up check in 5 days"}],
      chat:[{role:"user",msg:"My patient Ramesh isn't hitting his 120g protein target. Can you check his logs?"},{role:"ai",msg:"Reviewed Ramesh's last 7 days — he's averaging 74g daily. Gap is at breakfast (17g) and snacks (0g). Quick fix: swap morning toast for eggs or Greek yoghurt (+15g), add roasted chickpeas as snack (+7g). I've drafted a message to send him — want me to update his plan too?"}] },
    { label:"You ask", input:"Why do I feel tired after lunch every day?",
      outputs:[{icon:"🧠",lbl:"AI reviews",val:"Your lunch meals for 2 weeks"},{icon:"📉",lbl:"AI spots",val:"Your blood sugar spike pattern"},{icon:"🍱",lbl:"AI recommends",val:"Lower-GI food swaps"},{icon:"⚡",lbl:"AI predicts",val:"Energy improvement in 3–5 days"},{icon:"📖",lbl:"AI explains",val:"Exactly why this is happening"}],
      chat:[{role:"user",msg:"Why do I feel tired every day after lunch? It's been happening for weeks."},{role:"ai",msg:"Checked your last 14 lunches — 11 out of 14 were high-GI meals (white rice, white bread, or sugary drinks). This causes a blood sugar spike then a crash at 2–3pm — exactly what you're feeling. I've already swapped 4 meals in your plan this week to lower-GI options. Most people notice the difference in 3–5 days. I'll check in on Friday."}] },
  ];
  const active = scenarios[tab];

  return (
    <section style={{ padding:'64px 24px 80px', backgroundColor:c.white }}>
      <div style={{ maxWidth:1152, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:50, marginBottom:16, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', backgroundColor:`rgba(29,158,117,0.1)`, color:c.green }}>✦ The AI advantage</div>
          <h2 style={{ fontWeight:800, fontSize:'clamp(24px,4vw,40px)', letterSpacing:'-0.5px', color:c.navy, marginBottom:12 }}>
            You give it a little.<br/><span style={{ color:c.green }}>It gives back everything.</span>
          </h2>
          <p style={{ fontSize:15, color:c.dgrey, maxWidth:520, margin:'0 auto' }}>Most health apps make you do all the work. Our AI reads between the lines, connects the dots, and acts — so you don't have to think about it.</p>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:8, marginBottom:28 }}>
          {scenarios.map((s,i)=>(
            <button key={i} onClick={()=>setTab(i)} style={{ padding:'10px 18px', borderRadius:50, fontSize:13, fontWeight:600, whiteSpace:'nowrap', flexShrink:0, cursor:'pointer', border:'none', fontFamily:'inherit', backgroundColor:tab===i?c.navy:c.lgrey, color:tab===i?c.white:c.dgrey }}>
              {s.label}: "{s.input}"
            </button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:24, alignItems:'start' }}>
          {/* Left: input + outputs */}
          <div>
            <div style={{ borderRadius:16, padding:'16px', marginBottom:16, backgroundColor:c.lgrey, border:`2px solid ${c.green}40` }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:c.green, marginBottom:8 }}>👤 {active.label}</div>
              <p style={{ fontSize:15, fontWeight:600, color:c.navy, margin:0 }}>"{active.input}"</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ flex:1, height:1, backgroundColor:c.mgrey }}/>
              <div style={{ width:28, height:28, borderRadius:'50%', backgroundColor:c.green, display:'flex', alignItems:'center', justifyContent:'center', color:c.white, fontSize:13, fontWeight:700, flexShrink:0 }}>↓</div>
              <div style={{ flex:1, height:1, backgroundColor:c.mgrey }}/>
            </div>
            <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:c.bgrey, marginBottom:12 }}>AI instantly does all of this</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {active.outputs.map(({icon,lbl,val},i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, backgroundColor:c.white, border:`1px solid ${c.mgrey}` }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:c.bgrey }}>{lbl}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:c.navy }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: AI chat */}
          <div style={{ borderRadius:24, overflow:'hidden', boxShadow:'0 8px 40px rgba(13,27,62,0.12)', border:`1px solid ${c.mgrey}` }}>
            {/* Chat header */}
            <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:12, backgroundColor:c.navy }}>
              <div style={{ width:34, height:34, borderRadius:'50%', backgroundColor:c.green, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
              <div>
                <div style={{ color:c.white, fontWeight:700, fontSize:14 }}>Pulse AI Coach</div>
                <div style={{ color:'rgba(255,255,255,0.45)', fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', backgroundColor:c.green, display:'inline-block' }}/>
                  AI-powered · always on
                </div>
              </div>
            </div>
            {/* Messages */}
            <div style={{ padding:'16px', backgroundColor:'#FAFBFC', minHeight:280, display:'flex', flexDirection:'column', gap:12 }}>
              {active.chat.map((msg,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:msg.role==='user'?'flex-end':'flex-start', alignItems:'flex-start', gap:8 }}>
                  {msg.role==='ai' && (
                    <div style={{ width:24, height:24, borderRadius:'50%', backgroundColor:c.green, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                  )}
                  <div style={{ maxWidth:'85%', borderRadius:16, padding:'10px 14px', fontSize:13, lineHeight:1.5,
                    ...(msg.role==='user'
                      ? { backgroundColor:c.navy, color:c.white, borderBottomRightRadius:4 }
                      : { backgroundColor:c.white, color:c.dgrey, border:`1px solid ${c.mgrey}`, borderBottomLeftRadius:4 }) }}>
                    {msg.msg}
                  </div>
                </div>
              ))}
              {/* Typing indicator */}
              <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:32 }}>
                <div style={{ display:'flex', gap:4, padding:'10px 14px', borderRadius:16, backgroundColor:c.white, border:`1px solid ${c.mgrey}` }}>
                  {[0,1,2].map(i=>(<div key={i} style={{ width:6, height:6, borderRadius:'50%', backgroundColor:c.bgrey, opacity:0.5 }}/>))}
                </div>
                <span style={{ fontSize:11, color:c.bgrey }}>AI is reviewing your data…</span>
              </div>
            </div>
            {/* Input */}
            <div style={{ padding:'10px 14px 14px', backgroundColor:'#FAFBFC', borderTop:`1px solid ${c.mgrey}` }}>
              <div style={{ display:'flex', gap:8 }}>
                <input readOnly type="text" placeholder="Ask your AI health coach anything…"
                  style={{ flex:1, padding:'10px 14px', borderRadius:12, border:`1.5px solid ${c.mgrey}`, fontSize:13, outline:'none', fontFamily:'inherit', backgroundColor:c.white }}/>
                <button style={{ width:38, height:38, borderRadius:10, backgroundColor:c.green, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Try CTA */}
        <div style={{ textAlign:'center', marginTop:40 }}>
          <a href="/signup" style={{ display:'inline-block', padding:'14px 32px', borderRadius:50, backgroundColor:c.green, color:c.white, fontWeight:700, fontSize:15, textDecoration:'none' }}>
            Try it free — this is what you get from day one →
          </a>
        </div>
      </div>
    </section>
  );
}

/* ── FEATURES ── */
function Features() {
  const list = [
    {icon:'🍽️',title:'Log meals in seconds',desc:'Search 2M+ foods, scan barcodes, or tell our AI what you ate. No manual counting.'},
    {icon:'🤖',title:'Your personal AI coach',desc:'Ask anything — "Why am I not losing weight?" or "What should I eat today?" — get a real answer.'},
    {icon:'📊',title:'Spot patterns you\'d never notice',desc:'See how sleep, mood, and lifestyle connect to your nutrition and body weight.'},
    {icon:'🥗',title:'Meal plans made for you',desc:'Not generic — built around your preferences, allergies, schedule, and goals. Refreshes weekly.'},
    {icon:'💊',title:'Track everything in one place',desc:'Macros, water, steps, weight, medications — one app, not ten.'},
    {icon:'👩‍⚕️',title:'Connect with your dietitian',desc:'Share your log with one tap. They see everything, you stay in control.'},
  ];
  return (
    <section id="features" style={{ padding:'64px 24px 80px', backgroundColor:c.lgrey }}>
      <div style={{ maxWidth:1152, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <span style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em', color:c.green }}>Features</span>
          <h2 style={{ fontWeight:800, fontSize:'clamp(24px,4vw,38px)', marginTop:12, letterSpacing:'-0.5px', color:c.navy }}>Everything your health needs.</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:18 }}>
          {list.map(({icon,title,desc})=>(
            <div key={title} style={{ backgroundColor:c.white, borderRadius:20, padding:26, border:`1px solid ${c.mgrey}` }}>
              <div style={{ fontSize:28, marginBottom:12 }}>{icon}</div>
              <h3 style={{ fontWeight:700, fontSize:16, marginBottom:8, color:c.navy }}>{title}</h3>
              <p style={{ fontSize:14, lineHeight:1.6, color:c.dgrey }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FOR WHO ── */
function ForWho() {
  return (
    <section id="forwho" style={{ padding:'64px 24px 80px', backgroundColor:c.white }}>
      <div style={{ maxWidth:1152, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <span style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em', color:c.green }}>Who it&apos;s for</span>
          <h2 style={{ fontWeight:800, fontSize:'clamp(24px,4vw,38px)', marginTop:12, letterSpacing:'-0.5px', color:c.navy }}>
            Whether you&apos;re tracking yourself<br/>or managing hundreds of patients.
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:24 }}>
          {[
            {emoji:'🙋',label:'For Individuals',headline:'The health app that actually thinks for you.',color:c.green,cta:'Start 30-day free trial',href:'/signup',
              points:['Log a photo — AI identifies and logs the meal','Ask why you\'re tired — AI analyses your last 2 weeks','Not losing weight? — AI tells you exactly why','Get a personalised meal plan every week automatically','Track macros, water, steps, weight in one place']},
            {emoji:'👩‍⚕️',label:'For Dietitians & Clinics',headline:'Less admin. More impact. AI does the heavy lifting.',color:c.navy,cta:'Start 14-day clinic trial',href:'/signup?type=clinic',
              points:['Patient misses a meal? — AI flags it before your session','New patient? — AI generates intake summary automatically','Compliance low? — AI drafts a personalised nudge message','Scale to 200 patients without additional overhead','AI handles the admin. You focus on care.']},
          ].map(({emoji,label,headline,color,cta,href,points})=>(
            <div key={label} style={{ borderRadius:28, padding:'36px', backgroundColor:c.lgrey, display:'flex', flexDirection:'column' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>{emoji}</div>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:12, color }}>{label}</span>
              <h3 style={{ fontWeight:800, fontSize:20, marginBottom:20, lineHeight:1.3, color:c.navy }}>{headline}</h3>
              <ul style={{ listStyle:'none', padding:0, margin:'0 0 24px', flex:1 }}>
                {points.map(p=>{const parts=p.split(' — ');return(
                  <li key={p} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12, fontSize:14 }}>
                    <span style={{ color, marginTop:2, flexShrink:0 }}>✓</span>
                    <span style={{ color:c.dgrey }}><strong style={{ color:c.navy }}>{parts[0]}</strong>{parts[1]?` — ${parts[1]}`:''}</span>
                  </li>
                );})}
              </ul>
              <a href={href} style={{ display:'block', textAlign:'center', padding:'14px', borderRadius:16, backgroundColor:color, color:c.white, fontWeight:700, fontSize:15, textDecoration:'none' }}>{cta}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── PRICING ── */
function Pricing() {
  const [audience, setAudience] = useState('individual');
  const [billing,  setBilling]  = useState('monthly');
  const [useINR,   setUseINR]   = useState(false);
  useEffect(()=>{ setUseINR(detectINR()); },[]);

  const plans = audience==='individual' ? indPlans : clinicPlans;
  const disc = 0.18;

  function getPrice(p) {
    const raw = useINR ? p.priceINR : p.priceUSD;
    return billing==='annual' ? (useINR ? Math.round(raw*(1-disc)) : +(raw*(1-disc)).toFixed(2)) : raw;
  }

  function ctaBg(style) {
    if(style==='trial')   return c.green;
    if(style==='primary') return c.navy;
    return 'transparent';
  }
  function ctaColor(style) {
    if(style==='outline') return c.green;
    return c.white;
  }
  function ctaBorder(style) {
    if(style==='outline') return `2px solid ${c.green}`;
    return 'none';
  }

  return (
    <section id="pricing" style={{ padding:'64px 24px 80px', backgroundColor:c.lgrey }}>
      <div style={{ maxWidth:1152, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <span style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em', color:c.green }}>Pricing</span>
          <h2 style={{ fontWeight:800, fontSize:'clamp(24px,4vw,38px)', marginTop:12, letterSpacing:'-0.5px', color:c.navy }}>Simple. Honest. No surprises.</h2>

          {/* Trial clarity banner */}
          <div style={{ display:'inline-flex', alignItems:'flex-start', gap:12, marginTop:18, padding:'14px 20px', borderRadius:14, backgroundColor:`${c.green}12`, border:`1px solid ${c.green}30`, maxWidth:560, textAlign:'left' }}>
            <span style={{ fontSize:20, flexShrink:0 }}>🎁</span>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:c.navy, margin:'0 0 2px' }}>Free trial on Starter plans only</p>
              <p style={{ fontSize:13, color:c.dgrey, margin:0, lineHeight:1.5 }}>
                Individual: 30 days free with Starter features, no card needed.<br/>
                Clinic: 14 days free with Starter features, no card needed.<br/>
                Plus &amp; Premium: subscribe for 1 month to evaluate, cancel anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:24 }}>
          <div style={{ display:'inline-flex', borderRadius:12, overflow:'hidden', border:`1px solid ${c.mgrey}`, backgroundColor:c.white }}>
            {[{k:'individual',l:'Individual'},{k:'clinic',l:'Clinic / Dietitian'}].map(({k,l})=>(
              <button key={k} onClick={()=>setAudience(k)} style={{ padding:'10px 20px', fontSize:14, fontWeight:600, border:'none', cursor:'pointer', backgroundColor:audience===k?c.green:'transparent', color:audience===k?c.white:c.dgrey, fontFamily:'inherit' }}>{l}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'center' }}>
            <div style={{ display:'inline-flex', borderRadius:12, overflow:'hidden', border:`1px solid ${c.mgrey}`, backgroundColor:c.white }}>
              {[{k:'monthly',l:'Monthly'},{k:'annual',l:'Annually'}].map(({k,l})=>(
                <button key={k} onClick={()=>setBilling(k)} style={{ padding:'10px 16px', fontSize:13, fontWeight:600, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, backgroundColor:billing===k?c.navy:'transparent', color:billing===k?c.white:c.dgrey, fontFamily:'inherit' }}>
                  {l}
                  {k==='annual'&&<span style={{ fontSize:10, padding:'2px 6px', borderRadius:50, fontWeight:700, backgroundColor:billing==='annual'?'rgba(255,255,255,0.2)':'rgba(29,158,117,0.12)', color:billing==='annual'?c.white:c.green }}>-18%</span>}
                </button>
              ))}
            </div>
            <div style={{ display:'inline-flex', borderRadius:12, overflow:'hidden', border:`1px solid ${c.mgrey}`, backgroundColor:c.white }}>
              {[{k:true,l:'₹ INR'},{k:false,l:'$ USD'}].map(({k,l})=>(
                <button key={l} onClick={()=>setUseINR(k)} style={{ padding:'10px 14px', fontSize:13, fontWeight:700, border:'none', cursor:'pointer', backgroundColor:useINR===k?c.lgrey:'transparent', color:useINR===k?c.navy:c.bgrey, fontFamily:'inherit' }}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        {billing==='annual'&&(
          <div style={{ textAlign:'center', marginBottom:18, padding:'10px', borderRadius:10, fontSize:13, fontWeight:600, backgroundColor:`${c.green}12`, color:c.green }}>
            🎉 You&apos;re saving 18% with annual billing
          </div>
        )}

        {/* Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
          {plans.map(plan=>(
            <div key={plan.name} style={{ borderRadius:20, overflow:'hidden', backgroundColor:c.white, display:'flex', flexDirection:'column', boxShadow:plan.highlight?`0 0 0 2.5px ${c.green}`:`0 0 0 1px ${c.mgrey}` }}>
              {plan.highlight&&<div style={{ textAlign:'center', padding:'6px', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', backgroundColor:c.green, color:c.white }}>Most Popular</div>}
              <div style={{ padding:'24px 24px 18px', borderBottom:`1px solid ${c.mgrey}` }}>
                <h3 style={{ fontWeight:800, fontSize:20, marginBottom:4, color:c.navy }}>{plan.name}</h3>
                <p style={{ fontSize:13, color:c.bgrey, marginBottom:plan.trial?10:16 }}>{plan.sub}</p>

                {/* Trial badge */}
                {plan.trial && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:8, backgroundColor:`${c.green}12`, marginBottom:12 }}>
                    <span style={{ fontSize:12 }}>🎁</span>
                    <span style={{ fontSize:12, fontWeight:700, color:c.green }}>{plan.trial}</span>
                  </div>
                )}

                <div style={{ display:'flex', alignItems:'flex-start', marginBottom:2 }}>
                  <span style={{ fontSize:16, fontWeight:700, color:c.navy, marginTop:6, marginRight:2 }}>{useINR?'₹':'$'}</span>
                  <span style={{ fontWeight:800, fontSize:38, color:c.navy, lineHeight:1 }}>
                    {useINR ? getPrice(plan).toLocaleString('en-IN') : getPrice(plan)}
                  </span>
                  <span style={{ fontSize:13, color:c.bgrey, marginTop:8, marginLeft:4 }}>/mo</span>
                </div>
                {billing==='annual' ? (
                  <div style={{ marginBottom:14 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:c.green }}>
                      {useINR
                        ? `₹${(getPrice(plan)*12).toLocaleString('en-IN')} billed today`
                        : `$${(getPrice(plan)*12).toFixed(2)} billed today`}
                    </span>
                    <span style={{ fontSize:12, color:c.bgrey, marginLeft:6 }}>
                      · save {useINR
                        ? `₹${(plan.priceINR*12 - getPrice(plan)*12).toLocaleString('en-IN')}`
                        : `$${(plan.priceUSD*12 - getPrice(plan)*12).toFixed(2)}`}
                    </span>
                  </div>
                ) : (
                  <p style={{ fontSize:12, color:c.bgrey, marginBottom:14 }}>billed monthly · cancel anytime</p>
                )}

                <a href={plan.trial ? '/signup' : '/signup?skipTrial=1'} style={{ display:'block', textAlign:'center', padding:'12px', borderRadius:12, fontWeight:700, fontSize:13, textDecoration:'none', textTransform:'uppercase', letterSpacing:'0.04em', backgroundColor:ctaBg(plan.ctaStyle), color:ctaColor(plan.ctaStyle), border:ctaBorder(plan.ctaStyle) }}>
                  {plan.ctaLabel}
                </a>
                {plan.trialSub && (
                  <p style={{ fontSize:11, color:c.bgrey, textAlign:'center', marginTop:8, lineHeight:1.4 }}>{plan.trialSub}</p>
                )}
              </div>
              <div style={{ padding:'18px 24px', flex:1 }}>
                {plan.tag&&<p style={{ fontSize:12, fontWeight:700, marginBottom:12, color:plan.highlight?c.green:c.dgrey }}>{plan.tag}</p>}
                <ul style={{ listStyle:'none', padding:0, margin:0 }}>
                  {plan.features.map(({l,v})=>(
                    <li key={l} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <span style={{ fontSize:13, color:c.dgrey }}>{l}</span>
                      {v===true?(<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>)
                       :v===false?(<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.bgrey} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>)
                       :(<span style={{ fontSize:12, fontWeight:700, color:c.navy }}>{v}</span>)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign:'center', marginTop:18, fontSize:12, color:c.bgrey }}>
          {useINR?'Prices in Indian Rupees (INR). GST may apply.':'Prices in US Dollars (USD). Tax may apply.'}
          {' '}<button onClick={()=>setUseINR(!useINR)} style={{ background:'none', border:'none', cursor:'pointer', color:c.green, textDecoration:'underline', fontSize:12, fontFamily:'inherit' }}>Switch to {useINR?'USD ($)':'INR (₹)'}</button>
        </p>
      </div>
    </section>
  );
}

/* ── BROCHURES with Lead Capture ── */
const brochures = [
  {icon:'📱',title:'Personal Health Guide',desc:'How to use Blitora Pulse to build better habits, track nutrition, and hit your goals.',pages:'8 pages · PDF',tag:'For individuals',color:c.green,file:'/BlitoraPulse-Personal-Guide.pdf'},
  {icon:'🏥',title:'Clinic & Dietitian Pack',desc:'Patient management, onboarding, compliance tools, and clinic pricing plans.',pages:'12 pages · PDF',tag:'For clinics',color:c.navy,file:'/BlitoraPulse-Clinic-Brochure.pdf'},
  {icon:'📋',title:'Plan Comparison Sheet',desc:'Side-by-side of all Personal and Clinic plans — share with your team.',pages:'2 pages · PDF',tag:'All plans',color:'#714B67',file:'/BlitoraPulse-Plans.pdf'},
];

function Brochures() {
  const [activeDoc, setActiveDoc] = useState(null);
  return (
    <section id="resources" style={{ padding:'64px 24px 80px', backgroundColor:c.white }}>
      {activeDoc && <LeadModal doc={activeDoc} onClose={()=>setActiveDoc(null)}/>}
      <div style={{ maxWidth:1152, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <span style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em', color:c.green }}>Resources</span>
          <h2 style={{ fontWeight:800, fontSize:'clamp(22px,4vw,34px)', marginTop:12, letterSpacing:'-0.5px', color:c.navy }}>Download product materials</h2>
          <p style={{ fontSize:15, color:c.dgrey, marginTop:8 }}>Share with your team, clinic committee, or use for your own reference.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:18 }}>
          {brochures.map(doc=>(
            <div key={doc.title} style={{ borderRadius:20, padding:'24px', border:`1px solid ${c.mgrey}` }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                <span style={{ fontSize:26 }}>{doc.icon}</span>
                <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', padding:'4px 10px', borderRadius:50, backgroundColor:`${doc.color}15`, color:doc.color }}>{doc.tag}</span>
              </div>
              <h3 style={{ fontWeight:700, fontSize:15, marginBottom:6, color:c.navy }}>{doc.title}</h3>
              <p style={{ fontSize:13, lineHeight:1.6, marginBottom:8, color:c.dgrey }}>{doc.desc}</p>
              <p style={{ fontSize:12, color:c.bgrey, marginBottom:16 }}>{doc.pages}</p>
              <button onClick={()=>setActiveDoc(doc)}
                style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:50, fontWeight:600, fontSize:13, cursor:'pointer', width:'100%', justifyContent:'center', backgroundColor:c.lgrey, color:c.navy, border:`1px solid ${c.mgrey}`, fontFamily:'inherit' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download PDF
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA ── */
function CTA() {
  return (
    <section style={{ padding:'64px 24px 80px', background:`linear-gradient(135deg, ${c.navy} 0%, ${c.dkgreen} 100%)`, textAlign:'center' }}>
      <div style={{ maxWidth:640, margin:'0 auto' }}>
        <h2 style={{ fontWeight:800, fontSize:'clamp(24px,4vw,42px)', color:c.white, marginBottom:20, letterSpacing:'-0.5px' }}>
          Answer 4 questions.<br/>Get your health plan.
        </h2>
        <p style={{ fontSize:16, color:'#B8D8CC', marginBottom:32 }}>Free for 30 days. Starter features included. No credit card.</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:16, justifyContent:'center' }}>
          <a href="/signup" style={{ padding:'16px 32px', borderRadius:50, backgroundColor:c.green, color:c.white, fontWeight:700, fontSize:16, textDecoration:'none' }}>Start free trial →</a>
          <a href="mailto:hello@blitora.com" style={{ padding:'16px 32px', borderRadius:50, color:c.white, fontWeight:600, fontSize:16, textDecoration:'none', border:'1.5px solid rgba(255,255,255,0.3)' }}>Schedule a demo</a>
        </div>
        <p style={{ marginTop:16, fontSize:13, color:'rgba(255,255,255,0.4)' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color:c.green, fontWeight:600, textDecoration:'none' }}>Sign in →</a>
        </p>
      </div>
    </section>
  );
}

/* ── FOOTER ── */
function Footer() {
  return (
    <footer style={{ backgroundColor:c.navy, padding:'48px 24px 32px' }}>
      <div style={{ maxWidth:1152, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:40, paddingBottom:40, borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ gridColumn:'span 2' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:32, height:32, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ color:c.green, fontWeight:900, fontSize:18 }}>B</span>
              </div>
              <div style={{ lineHeight:1 }}>
                <div style={{ fontWeight:800, fontSize:15, color:c.white }}>BLITORA</div>
                <div style={{ fontWeight:700, fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:c.green }}>PULSE</div>
              </div>
            </div>
            <p style={{ fontSize:13, lineHeight:1.6, color:'#9AA3BD', maxWidth:260, marginBottom:6 }}>AI-powered health tracking for individuals, dietitians, and clinics.</p>
            <a href="https://blitora.com" style={{ fontSize:13, color:c.green, textDecoration:'none' }}>← blitora.com</a>
          </div>
          <div>
            <h4 style={{ color:c.white, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:14 }}>Product</h4>
            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {[['Features','#features'],['Pricing','#pricing'],['For individuals','#forwho'],['For clinics','#forwho'],['Sign in','/login']].map(([l,h])=>(
                <li key={l} style={{ marginBottom:10 }}><a href={h} style={{ fontSize:13, color:'#9AA3BD', textDecoration:'none' }}>{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ color:c.white, fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:14 }}>Resources</h4>
            <ul style={{ listStyle:'none', padding:0, margin:0 }}>
              {[['Personal Guide','#resources'],['Clinic Brochure','#resources'],['Plan Comparison','#resources'],['Contact us','https://blitora.com/contact']].map(([l,h])=>(
                <li key={l} style={{ marginBottom:10 }}><a href={h} style={{ fontSize:13, color:'#9AA3BD', textDecoration:'none' }}>{l}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ paddingTop:24, display:'flex', flexWrap:'wrap', gap:8, alignItems:'center', justifyContent:'space-between', fontSize:12, color:'#6B7494' }}>
          <span>© 2026 Blitora Technologies. All rights reserved.</span>
          <span style={{ color:c.green, fontWeight:600 }}>Health Made Intelligent.</span>
        </div>
      </div>
    </footer>
  );
}

/* ── ROOT ── */
export default function PulseIndex() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(()=>{
    const supabase = getSupabase();
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session) { router.replace('/dashboard'); }
      else { setChecking(false); }
    });
  },[router]);

  if(checking) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', backgroundColor:c.navy }}>
      <div style={{ width:40, height:40, border:`3px solid ${c.green}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <Head>
        <title>Blitora Pulse — Health Made Intelligent</title>
        <meta name="description" content="AI-powered health tracking and patient management. 30-day free trial, no credit card."/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta property="og:title" content="Blitora Pulse — Health Made Intelligent"/>
        <meta property="og:description" content="Tell us your goal. Our AI handles the rest."/>
        <meta property="og:url" content="https://pulse.blitora.com"/>
        <meta name="twitter:card" content="summary_large_image"/>
        <link rel="canonical" href="https://pulse.blitora.com"/>
      </Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Poppins',Arial,sans-serif}
        body{background:#fff;-webkit-font-smoothing:antialiased}
        a{transition:opacity 0.15s} a:hover{opacity:0.8}
        button{transition:all 0.15s}
        @media(max-width:768px){.hide-mobile{display:none!important}}
      `}</style>
      <Nav/>
      <Hero/>
      <FourAnswers/>
      <AISection/>
      <Features/>
      <ForWho/>
      <Pricing/>
      <Brochures/>
      <CTA/>
      <Footer/>
    </>
  );
}
