// pages/api/payments/create-subscription.js
// Creates a Razorpay subscription for a user

import { getSupabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { planKey, trialDays = 0 } = req.body;
  if (!planKey) return res.status(400).json({ error: 'planKey required' });

  const planId = process.env[`RAZORPAY_PLAN_${planKey}`];
  if (!planId) return res.status(400).json({ error: `Plan not configured: ${planKey}. Run /api/payments/setup-plans first.` });

  const auth = 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

  try {
    const body = {
      plan_id: planId,
      total_count: planKey.endsWith('_A') ? 1 : 120, // annual = 1 charge; monthly = 10 years max
      quantity: 1,
      customer_notify: 1,
      notes: {
        user_id: user.id,
        user_email: user.email,
        plan_key: planKey,
      },
    };

    // Add trial days for Starter plans only
    if (trialDays > 0) {
      body.start_at = Math.floor((Date.now() + trialDays * 24 * 60 * 60 * 1000) / 1000);
      body.addons = [];
    }

    const r = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const subscription = await r.json();
    if (subscription.error) {
      return res.status(400).json({ error: subscription.error.description });
    }

    // Store subscription in Supabase
    await supabase.from('subscriptions').upsert({
      user_id: user.id,
      razorpay_subscription_id: subscription.id,
      plan_key: planKey,
      status: trialDays > 0 ? 'trialing' : 'created',
      trial_ends_at: trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString() : null,
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    return res.status(200).json({
      subscription_id: subscription.id,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch(e) {
    console.error('Create subscription error:', e);
    return res.status(500).json({ error: 'Failed to create subscription' });
  }
}
