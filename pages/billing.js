// pages/billing.js
// User billing management page

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import { getSupabase } from '../lib/supabase';

const c = { navy:'#0D1B3E', green:'#1D9E75', white:'#FFFFFF', lgrey:'#F5F6FA', mgrey:'#E0E3ED', dgrey:'#4A5568', red:'#E53E3E' };

const PLAN_LABELS = {
  IND_STARTER_M: 'Individual Starter (Monthly)',  IND_STARTER_A: 'Individual Starter (Annual)',
  IND_PLUS_M:    'Individual Plus (Monthly)',      IND_PLUS_A:    'Individual Plus (Annual)',
  IND_PREMIUM_M: 'Individual Premium (Monthly)',   IND_PREMIUM_A: 'Individual Premium (Annual)',
  CLI_STARTER_M: 'Clinic Starter (Monthly)',       CLI_STARTER_A: 'Clinic Starter (Annual)',
  CLI_PRO_M:     'Clinic Professional (Monthly)',  CLI_PRO_A:     'Clinic Professional (Annual)',
  CLI_PREMIUM_M: 'Clinic Premium (Monthly)',        CLI_PREMIUM_A: 'Clinic Premium (Annual)',
};

export default function BillingPage() {
  const router = useRouter();
  const [sub, setSub]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return; }
      const [subRes, profRes] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('user_id', session.user.id).single(),
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      ]);
      setSub(subRes.data);
      setProfile(profRes.data);
      setLoading(false);
    });
  }, [router]);

  function handleUpgrade() { router.push('/#pricing'); }

  function statusBadge(status) {
    const colors = { active:'#1D9E75', trialing:'#3182CE', halted:'#DD6B20', cancelled:'#E53E3E', created:'#718096' };
    return (
      <span style={{ fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:50, textTransform:'uppercase', letterSpacing:'0.05em', backgroundColor:`${colors[status]||'#718096'}20`, color:colors[status]||'#718096' }}>
        {status}
      </span>
    );
  }

  return (
    <Layout title="Billing — Blitora Pulse">
      <Head><title>Billing — Blitora Pulse</title></Head>
      <div style={{ maxWidth:640, margin:'0 auto', padding:'40px 20px' }}>
        <h1 style={{ fontWeight:800, fontSize:26, color:c.navy, marginBottom:8 }}>Billing & Subscription</h1>
        <p style={{ fontSize:15, color:c.dgrey, marginBottom:32 }}>Manage your Blitora Pulse subscription.</p>

        {loading ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:c.dgrey }}>Loading…</div>
        ) : (
          <>
            {/* Current plan */}
            <div style={{ borderRadius:16, padding:24, marginBottom:20, backgroundColor:c.lgrey }}>
              <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:c.dgrey, marginBottom:12 }}>Current Plan</div>
              {sub && sub.status !== 'cancelled' ? (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                    <span style={{ fontWeight:700, fontSize:18, color:c.navy }}>{PLAN_LABELS[sub.plan_key] || sub.plan_key || 'Starter'}</span>
                    {statusBadge(sub.status)}
                  </div>
                  {sub.status === 'trialing' && sub.trial_ends_at && (
                    <p style={{ fontSize:14, color:'#3182CE', marginBottom:8 }}>
                      ⏳ Trial ends: {new Date(sub.trial_ends_at).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
                    </p>
                  )}
                  {sub.current_period_end && sub.status === 'active' && (
                    <p style={{ fontSize:14, color:c.dgrey, marginBottom:8 }}>
                      Next billing: {new Date(sub.current_period_end).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
                    </p>
                  )}
                  {sub.razorpay_subscription_id && (
                    <p style={{ fontSize:12, color:c.dgrey }}>Subscription ID: {sub.razorpay_subscription_id}</p>
                  )}
                </>
              ) : (
                <div>
                  <p style={{ fontSize:16, color:c.navy, fontWeight:600, marginBottom:6 }}>Free Trial</p>
                  <p style={{ fontSize:14, color:c.dgrey }}>You're on the free trial. Subscribe to continue after your trial ends.</p>
                </div>
              )}
            </div>

            {/* Upgrade / change plan */}
            <div style={{ borderRadius:16, padding:24, marginBottom:20, border:`1px solid ${c.mgrey}` }}>
              <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:c.dgrey, marginBottom:12 }}>Change Plan</div>
              <p style={{ fontSize:14, color:c.dgrey, marginBottom:16 }}>Need more features? Upgrade anytime and the change takes effect immediately.</p>
              <button onClick={handleUpgrade} style={{ padding:'11px 24px', borderRadius:10, backgroundColor:c.green, color:c.white, fontWeight:700, fontSize:14, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                View all plans →
              </button>
            </div>

            {/* Cancel */}
            {sub && sub.status === 'active' && (
              <div style={{ borderRadius:16, padding:24, border:`1px solid ${c.red}30` }}>
                <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:c.red, marginBottom:8 }}>Cancel Subscription</div>
                <p style={{ fontSize:14, color:c.dgrey, marginBottom:16 }}>You can cancel anytime. Access continues until your current period ends.</p>
                <a href={`https://dashboard.razorpay.com`} target="_blank" rel="noreferrer"
                   style={{ fontSize:14, color:c.red, fontWeight:600, textDecoration:'none' }}>
                  Manage in Razorpay →
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
