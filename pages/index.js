import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getSupabase } from '../lib/supabase';

/* ── Brand colours ── */
const c = {
  navy: '#0D1B3E', green: '#1D9E75', white: '#FFFFFF',
  lgrey: '#F5F6FA', mgrey: '#E0E3ED', dgrey: '#4A5568', bgrey: '#718096', dkgreen: '#0D4A35',
};

const individualPlans = [
  { name: 'Starter', sub: 'Great to get started', priceINR: 99, priceUSD: 4.99, highlight: false,
    tag: 'All the essentials:',
    features: [{ l: 'AI chat messages', v: '20/month' }, { l: 'AI meal plans', v: '2/month' }, { l: 'Food log history', v: '90 days' }, { l: 'Daily AI insights', v: true }, { l: 'Data export', v: false }] },
  { name: 'Plus', sub: 'Most popular choice', priceINR: 189, priceUSD: 8.99, highlight: true,
    tag: 'Everything in Starter +',
    features: [{ l: 'AI chat messages', v: '50/month' }, { l: 'AI meal plans', v: '8/month' }, { l: 'Food log history', v: '1 year' }, { l: 'Daily AI insights', v: true }, { l: 'Data export', v: 'PDF' }] },
  { name: 'Premium', sub: 'For serious goals', priceINR: 449, priceUSD: 12.99, highlight: false,
    tag: 'Everything in Plus +',
    features: [{ l: 'AI chat messages', v: '100/month' }, { l: 'AI meal plans', v: '15/month' }, { l: 'Food log history', v: '3 years' }, { l: 'Daily AI insights', v: true }, { l: 'Data export', v: 'PDF + CSV' }] },
];

const clinicPlans = [
  { name: 'Starter', sub: 'Solo practice', priceINR: 499, priceUSD: 12.99, highlight: false,
    tag: 'All the essentials:',
    features: [{ l: 'Patients', v: '15' }, { l: 'AI patient plans', v: '15/month' }, { l: 'Dietitian AI chat', v: '30/month' }, { l: 'Compliance reports', v: 'Basic' }, { l: 'Data export', v: false }] },
  { name: 'Professional', sub: 'Growing clinic', priceINR: 999, priceUSD: 29.99, highlight: true,
    tag: 'Everything in Starter +',
    features: [{ l: 'Patients', v: '50' }, { l: 'AI patient plans', v: '40/month' }, { l: 'Dietitian AI chat', v: '100/month' }, { l: 'Compliance reports', v: 'Advanced' }, { l: 'Data export', v: 'PDF' }] },
  { name: 'Premium', sub: 'Large practice', priceINR: 2499, priceUSD: 59.99, highlight: false,
    tag: 'Everything in Professional +',
    features: [{ l: 'Patients', v: '200' }, { l: 'AI patient plans', v: '100/month' }, { l: 'Dietitian AI chat', v: '200/month' }, { l: 'Compliance reports', v: 'Advanced' }, { l: 'Data export', v: 'PDF + CSV' }] },
];

function detectINR() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && (tz.includes('Calcutta') || tz.includes('Kolkata'));
  } catch { return false; }
}

/* ════════════════════════════════════
   SECTION: NAV
════════════════════════════════════ */
function Nav() {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${c.mgrey}` }}>
      <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 24px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, backgroundColor: c.navy, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: c.green, fontWeight: 900, fontSize: 18 }}>B</span>
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.5px', color: c.navy }}>BLITORA</div>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: c.green }}>PULSE</div>
          </div>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 14, fontWeight: 500 }} className="hide-mobile">
          {[['How AI works', '#ai'], ['Features', '#features'], ['For who', '#forwho'], ['Pricing', '#pricing']].map(([l, h]) => (
            <a key={l} href={h} style={{ color: c.dgrey, textDecoration: 'none' }}>{l}</a>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/login" style={{ fontSize: 14, fontWeight: 600, color: c.navy, textDecoration: 'none' }} className="hide-mobile">Sign in</a>
          <a href="/signup" style={{ padding: '10px 20px', borderRadius: 50, backgroundColor: c.green, color: c.white, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Start free trial
          </a>
        </div>
      </div>
    </header>
  );
}

/* ════════════════════════════════════
   SECTION: HERO
════════════════════════════════════ */
function Hero() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: `linear-gradient(135deg, ${c.navy} 0%, #0D2E1E 60%, ${c.dkgreen} 100%)` }}>
      {/* Heartbeat line */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05 }} viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
        <polyline points="0,300 200,300 280,200 360,400 440,300 520,300 560,150 600,450 640,300 720,300 760,200 800,350 860,300 1200,300" fill="none" stroke="#1D9E75" strokeWidth="2.5"/>
      </svg>
      <div style={{ position: 'relative', maxWidth: 896, margin: '0 auto', padding: '80px 24px 112px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 50, marginBottom: 28, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: 'rgba(29,158,117,0.15)', color: c.green, border: '1px solid rgba(29,158,117,0.3)' }}>
          ✦ AI-powered health platform
        </div>
        <h1 style={{ fontWeight: 800, color: c.white, letterSpacing: '-1px', marginBottom: 20, fontSize: 'clamp(32px,6vw,64px)', lineHeight: 1.05 }}>
          Tell us your goal.<br/>
          <span style={{ color: c.green }}>Our AI handles the rest.</span>
        </h1>
        <p style={{ fontSize: 'clamp(16px,2.5vw,20px)', lineHeight: 1.6, marginBottom: 16, maxWidth: 640, margin: '0 auto 16px', color: '#B8D8CC' }}>
          No spreadsheets. No guessing. Just answer a few questions — our AI builds your complete health plan and keeps you on track automatically.
        </p>
        <p style={{ fontSize: 13, marginBottom: 32, color: 'rgba(255,255,255,0.4)' }}>For individuals · dietitians · clinics</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 24 }}>
          <a href="/signup" style={{ padding: '16px 32px', borderRadius: 50, backgroundColor: c.green, color: c.white, fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 8px 32px rgba(29,158,117,0.4)' }}>
            Start for free →
          </a>
          <a href="#ai" style={{ padding: '16px 32px', borderRadius: 50, color: c.white, fontWeight: 600, fontSize: 16, textDecoration: 'none', border: '1.5px solid rgba(255,255,255,0.3)' }}>
            ▶ See how it works
          </a>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: c.green, fontWeight: 600, textDecoration: 'none' }}>Sign in →</a>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 28 }}>
          {['14-day free trial', 'Full access', 'No credit card', 'Cancel anytime'].map(s => (
            <span key={s} style={{ fontSize: 13, padding: '6px 12px', borderRadius: 50, fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>✓ {s}</span>
          ))}
        </div>
      </div>
      <svg viewBox="0 0 1440 60" style={{ width: '100%', display: 'block', marginBottom: -1 }} preserveAspectRatio="none">
        <path d="M0,60 L0,30 Q360,60 720,30 Q1080,0 1440,30 L1440,60 Z" fill="#fff"/>
      </svg>
    </section>
  );
}

/* ════════════════════════════════════
   SECTION: 4 ANSWERS
════════════════════════════════════ */
function FourAnswers() {
  const steps = [
    { icon: '🎯', you: 'Your goal in one sentence', ai: 'Complete meal plan + calorie targets' },
    { icon: '🥜', you: 'Your food likes & dislikes', ai: '7-day plan with zero foods you hate' },
    { icon: '💪', you: 'Any health conditions or allergies', ai: 'Nutritionally safe, personalised plan' },
    { icon: '🏃', you: 'Your lifestyle (busy / active / etc.)', ai: 'Realistic plans that fit your life' },
  ];
  return (
    <section id="ai" style={{ backgroundColor: c.navy, padding: '56px 24px' }}>
      <div style={{ maxWidth: 896, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(22px,4vw,36px)', color: c.white, marginBottom: 12, letterSpacing: '-0.5px' }}>
            4 answers. A complete health plan.
          </h2>
          <p style={{ fontSize: 15, color: '#B8D8CC', maxWidth: 480, margin: '0 auto' }}>
            Our AI does the nutrition science, planning, reminders, and tracking. You just live your life.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {steps.map(({ icon, you, ai }) => (
            <div key={you} style={{ borderRadius: 16, padding: '20px', display: 'flex', alignItems: 'flex-start', gap: 16, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: 24, flexShrink: 0, marginTop: 4 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 50, marginBottom: 6, width: 'fit-content', backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}>You tell us</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: c.white, marginBottom: 8 }}>{you}</p>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 50, marginBottom: 6, width: 'fit-content', backgroundColor: 'rgba(29,158,117,0.2)', color: c.green }}>AI delivers</div>
                <p style={{ fontSize: 14, color: c.green }}>{ai}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href="/signup" style={{ display: 'inline-block', padding: '14px 32px', borderRadius: 50, backgroundColor: c.green, color: c.white, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            Try it free — answer 4 questions →
          </a>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════
   SECTION: FEATURES
════════════════════════════════════ */
function Features() {
  const features = [
    { icon: '🍽️', title: 'Log meals in seconds', desc: 'Search 2M+ foods, scan barcodes, or just tell our AI what you ate. No manual counting.' },
    { icon: '🤖', title: 'Your personal AI coach', desc: 'Ask anything — "What should I eat for energy?" or "Why am I not losing weight?" — get a real answer.' },
    { icon: '📊', title: 'Spot patterns you\'d never notice', desc: 'See how your sleep, mood, and lifestyle connect to your nutrition and body weight.' },
    { icon: '🥗', title: 'Meal plans made for you', desc: 'Not generic — built around your preferences, allergies, schedule, and health goals. Refreshes weekly.' },
    { icon: '💊', title: 'Track everything in one place', desc: 'Macros, water, steps, weight, medications — one app, not ten.' },
    { icon: '👩‍⚕️', title: 'Connect with your dietitian', desc: 'Share your log with your dietitian with one tap. They see everything, you stay in control.' },
  ];
  return (
    <section id="features" style={{ padding: '64px 24px 80px', backgroundColor: c.lgrey }}>
      <div style={{ maxWidth: 1152, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: c.green }}>Features</span>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(24px,4vw,38px)', marginTop: 12, letterSpacing: '-0.5px', color: c.navy }}>Everything your health needs.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {features.map(({ icon, title, desc }) => (
            <div key={title} style={{ backgroundColor: c.white, borderRadius: 20, padding: 28, border: `1px solid ${c.mgrey}` }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: c.navy }}>{title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: c.dgrey }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════
   SECTION: FOR WHO
════════════════════════════════════ */
function ForWho() {
  return (
    <section id="forwho" style={{ padding: '64px 24px 80px', backgroundColor: c.white }}>
      <div style={{ maxWidth: 1152, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: c.green }}>Who it&apos;s for</span>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(24px,4vw,38px)', marginTop: 12, letterSpacing: '-0.5px', color: c.navy }}>
            Whether you&apos;re tracking yourself<br/>or managing hundreds of patients.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {[
            { emoji: '🙋', label: 'For Individuals', headline: 'The health app that actually thinks for you.', color: c.green, cta: 'Start personal tracking free', href: '/signup',
              points: ['Log a photo — AI identifies and logs the meal', 'Ask why you\'re tired — AI analyses your last 2 weeks', 'Not losing weight? — AI tells you exactly why', 'Get a personalised meal plan every week automatically', 'Track macros, water, steps, weight in one place'] },
            { emoji: '👩‍⚕️', label: 'For Dietitians & Clinics', headline: 'Less admin. More impact. AI does the heavy lifting.', color: c.navy, cta: 'Try clinic edition free', href: '/signup?type=clinic',
              points: ['Patient misses a meal? — AI flags it before your session', 'New patient? — AI generates intake summary automatically', 'Compliance low? — AI drafts a personalised nudge message', 'Scale to 200 patients without additional overhead', 'AI handles the admin. You focus on care.'] },
          ].map(({ emoji, label, headline, color, cta, href, points }) => (
            <div key={label} style={{ borderRadius: 28, padding: '36px', backgroundColor: c.lgrey, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{emoji}</div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12, color }}>{label}</span>
              <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 20, lineHeight: 1.3, color: c.navy }}>{headline}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                {points.map(p => {
                  const parts = p.split(' — ');
                  return (
                    <li key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, fontSize: 14 }}>
                      <span style={{ color, marginTop: 2, flexShrink: 0 }}>✓</span>
                      <span style={{ color: c.dgrey }}><strong style={{ color: c.navy }}>{parts[0]}</strong>{parts[1] ? ` — ${parts[1]}` : ''}</span>
                    </li>
                  );
                })}
              </ul>
              <a href={href} style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: 16, backgroundColor: color, color: c.white, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>{cta}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════
   SECTION: PRICING  — Zoho style
════════════════════════════════════ */
function Pricing() {
  const [audience, setAudience] = useState('individual');
  const [billing, setBilling] = useState('monthly');
  const [useINR, setUseINR] = useState(false);

  useEffect(() => { setUseINR(detectINR()); }, []);

  const plans = audience === 'individual' ? individualPlans : clinicPlans;
  const discount = 0.18;

  function getPrice(plan) {
    const raw = useINR ? plan.priceINR : plan.priceUSD;
    return billing === 'annual' ? (useINR ? Math.round(raw * (1 - discount)) : +(raw * (1 - discount)).toFixed(2)) : raw;
  }

  function fmtP(plan) {
    const p = getPrice(plan);
    if (useINR) return `₹${p.toLocaleString('en-IN')}`;
    return `$${p % 1 === 0 ? p : p.toFixed(2)}`;
  }

  return (
    <section id="pricing" style={{ padding: '64px 24px 80px', backgroundColor: c.lgrey }}>
      <div style={{ maxWidth: 1152, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: c.green }}>Pricing</span>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(24px,4vw,38px)', marginTop: 12, letterSpacing: '-0.5px', color: c.navy }}>Simple. Honest. No surprises.</h2>
          {/* Trial banner */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '10px 20px', borderRadius: 12, backgroundColor: `${c.green}15`, border: `1px solid ${c.green}30` }}>
            <span style={{ fontSize: 18 }}>🎁</span>
            <p style={{ fontSize: 14, color: c.navy, margin: 0 }}>
              <strong>Every plan includes a 14-day free trial</strong> — full access, no credit card required. Cancel anytime before day 14 and you&apos;re never charged.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
          {/* Audience */}
          <div style={{ display: 'inline-flex', borderRadius: 12, overflow: 'hidden', border: `1px solid ${c.mgrey}`, backgroundColor: c.white }}>
            {[{ k: 'individual', l: 'Individual' }, { k: 'clinic', l: 'Clinic / Dietitian' }].map(({ k, l }) => (
              <button key={k} onClick={() => setAudience(k)} style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', backgroundColor: audience === k ? c.green : 'transparent', color: audience === k ? c.white : c.dgrey }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Billing */}
            <div style={{ display: 'inline-flex', borderRadius: 12, overflow: 'hidden', border: `1px solid ${c.mgrey}`, backgroundColor: c.white }}>
              {[{ k: 'monthly', l: 'Monthly' }, { k: 'annual', l: 'Annually' }].map(({ k, l }) => (
                <button key={k} onClick={() => setBilling(k)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backgroundColor: billing === k ? c.navy : 'transparent', color: billing === k ? c.white : c.dgrey }}>
                  {l}
                  {k === 'annual' && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 50, fontWeight: 700, backgroundColor: billing === 'annual' ? 'rgba(255,255,255,0.2)' : `${c.green}20`, color: billing === 'annual' ? c.white : c.green }}>-18%</span>}
                </button>
              ))}
            </div>
            {/* Currency */}
            <div style={{ display: 'inline-flex', borderRadius: 12, overflow: 'hidden', border: `1px solid ${c.mgrey}`, backgroundColor: c.white }}>
              {[{ k: true, l: '₹ INR' }, { k: false, l: '$ USD' }].map(({ k, l }) => (
                <button key={l} onClick={() => setUseINR(k)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', backgroundColor: useINR === k ? c.lgrey : 'transparent', color: useINR === k ? c.navy : c.bgrey }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {billing === 'annual' && (
          <div style={{ textAlign: 'center', marginBottom: 20, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, backgroundColor: `${c.green}12`, color: c.green }}>
            🎉 You&apos;re saving 18% with annual billing
          </div>
        )}

        {/* Plan cards — 3 horizontal */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {plans.map(plan => (
            <div key={plan.name} style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: c.white, display: 'flex', flexDirection: 'column', boxShadow: plan.highlight ? `0 0 0 2.5px ${c.green}` : `0 0 0 1px ${c.mgrey}` }}>
              {plan.highlight && (
                <div style={{ textAlign: 'center', padding: '6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: c.green, color: c.white }}>
                  Most Popular
                </div>
              )}
              <div style={{ padding: '24px 24px 20px', borderBottom: `1px solid ${c.mgrey}` }}>
                <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 4, color: c.navy }}>{plan.name}</h3>
                <p style={{ fontSize: 13, color: c.bgrey, marginBottom: 16 }}>{plan.sub}</p>
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: c.navy, marginTop: 6, marginRight: 2 }}>{useINR ? '₹' : '$'}</span>
                  <span style={{ fontWeight: 800, fontSize: 40, color: c.navy, lineHeight: 1 }}>
                    {useINR ? getPrice(plan).toLocaleString('en-IN') : getPrice(plan)}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: c.bgrey, marginBottom: 20 }}>/month{billing === 'annual' ? ' · billed annually' : ''}</p>
                <a href="/signup" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: plan.highlight ? c.green : 'transparent', color: plan.highlight ? c.white : c.green, border: plan.highlight ? 'none' : `2px solid ${c.green}` }}>
                  Start Free Trial
                </a>
              </div>
              <div style={{ padding: '20px 24px', flex: 1 }}>
                {plan.tag && <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: plan.highlight ? c.green : c.dgrey }}>{plan.tag}</p>}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {plan.features.map(({ l, v }) => (
                    <li key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: c.dgrey }}>{l}</span>
                      {v === true ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.green} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : v === false ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.bgrey} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700, color: c.navy }}>{v}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: c.bgrey }}>
          {useINR ? 'Prices in Indian Rupees (INR). GST may apply.' : 'Prices in US Dollars (USD). Tax may apply.'}
          {' '}
          <button onClick={() => setUseINR(!useINR)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.green, textDecoration: 'underline', fontSize: 12 }}>
            Switch to {useINR ? 'USD ($)' : 'INR (₹)'}
          </button>
        </p>
      </div>
    </section>
  );
}

/* ════════════════════════════════════
   SECTION: CTA
════════════════════════════════════ */
function CTA() {
  return (
    <section style={{ padding: '64px 24px 80px', background: `linear-gradient(135deg, ${c.navy} 0%, ${c.dkgreen} 100%)`, textAlign: 'center' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{ fontWeight: 800, fontSize: 'clamp(24px,4vw,42px)', color: c.white, marginBottom: 20, letterSpacing: '-0.5px' }}>
          Answer 4 questions.<br/>Get your health plan.
        </h2>
        <p style={{ fontSize: 16, color: '#B8D8CC', marginBottom: 32 }}>
          Free for 14 days. Full AI access. No credit card. Under a minute to start.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
          <a href="/signup" style={{ padding: '16px 32px', borderRadius: 50, backgroundColor: c.green, color: c.white, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>Start for free →</a>
          <a href="mailto:hello@blitora.com" style={{ padding: '16px 32px', borderRadius: 50, color: c.white, fontWeight: 600, fontSize: 16, textDecoration: 'none', border: '1.5px solid rgba(255,255,255,0.3)' }}>Schedule a demo</a>
        </div>
        <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: c.green, fontWeight: 600, textDecoration: 'none' }}>Sign in →</a>
        </p>
      </div>
    </section>
  );
}

/* ════════════════════════════════════
   SECTION: FOOTER
════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{ backgroundColor: c.navy, padding: '48px 24px 32px' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, paddingBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: c.green, fontWeight: 900, fontSize: 18 }}>B</span>
              </div>
              <div style={{ lineHeight: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: c.white }}>BLITORA</div>
                <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: c.green }}>PULSE</div>
              </div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#9AA3BD', maxWidth: 280, marginBottom: 8 }}>AI-powered health tracking for individuals, dietitians, and clinics.</p>
            <a href="https://blitora.com" style={{ fontSize: 13, color: c.green, textDecoration: 'none' }}>← blitora.com</a>
          </div>
          <div>
            <h4 style={{ color: c.white, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Product</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[['Features', '#features'], ['Pricing', '#pricing'], ['For individuals', '#forwho'], ['For clinics', '#forwho'], ['Sign in', '/login']].map(([l, h]) => (
                <li key={l} style={{ marginBottom: 10 }}><a href={h} style={{ fontSize: 13, color: '#9AA3BD', textDecoration: 'none' }}>{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ color: c.white, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>Company</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[['About Blitora', 'https://blitora.com/about'], ['Blog', 'https://blitora.com/blog'], ['Contact', 'https://blitora.com/contact']].map(([l, h]) => (
                <li key={l} style={{ marginBottom: 10 }}><a href={h} style={{ fontSize: 13, color: '#9AA3BD', textDecoration: 'none' }}>{l}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ paddingTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#6B7494' }}>
          <span>© 2026 Blitora Technologies. All rights reserved.</span>
          <span style={{ color: c.green, fontWeight: 600 }}>Health Made Intelligent.</span>
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════
   ROOT — auth check + marketing page
════════════════════════════════════ */
export default function PulseIndex() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard');
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: c.navy }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${c.green}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Blitora Pulse — Health Made Intelligent</title>
        <meta name="description" content="AI-powered health tracking and patient management for individuals, dietitians, and clinics. 14-day free trial, no credit card."/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta property="og:title" content="Blitora Pulse — Health Made Intelligent"/>
        <meta property="og:description" content="Tell us your goal. Our AI handles the rest."/>
        <meta property="og:image" content="https://pulse.blitora.com/assets/og-image.png"/>
        <meta property="og:url" content="https://pulse.blitora.com"/>
        <meta name="twitter:card" content="summary_large_image"/>
        <link rel="canonical" href="https://pulse.blitora.com"/>
      </Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;font-family:'Poppins',Arial,sans-serif}
        body{background:#fff;-webkit-font-smoothing:antialiased}
        a{transition:opacity 0.15s}
        a:hover{opacity:0.8}
        @media(max-width:768px){.hide-mobile{display:none!important}}
      `}</style>
      <Nav/>
      <Hero/>
      <FourAnswers/>
      <Features/>
      <ForWho/>
      <Pricing/>
      <CTA/>
      <Footer/>
    </>
  );
}
