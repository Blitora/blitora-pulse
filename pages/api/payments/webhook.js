// pages/api/payments/webhook.js
// Handles Razorpay subscription webhook events

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function planKeyToTier(planKey) {
  if (!planKey) return 'free';
  if (planKey.includes('PREMIUM')) return 'premium';
  if (planKey.includes('PLUS') || planKey.includes('PRO')) return 'plus';
  return 'starter';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSig) {
    console.error('Webhook signature mismatch');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(rawBody);
  const { event: eventType, payload } = event;

  console.log('Razorpay webhook:', eventType);

  try {
    const sub = payload?.subscription?.entity;
    if (!sub) return res.status(200).json({ ok: true });

    const userId = sub.notes?.user_id;
    const planKey = sub.notes?.plan_key;

    switch(eventType) {
      case 'subscription.activated':
        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          razorpay_subscription_id: sub.id,
          plan_key: planKey,
          status: 'active',
          current_period_end: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        // Update user profile with new plan tier
        if (userId) {
          await supabaseAdmin.from('profiles').update({
            plan: planKeyToTier(planKey),
            plan_key: planKey,
            subscription_status: 'active',
          }).eq('id', userId);
        }
        break;

      case 'subscription.charged':
        await supabaseAdmin.from('subscriptions').update({
          status: 'active',
          current_period_end: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }).eq('razorpay_subscription_id', sub.id);
        break;

      case 'subscription.halted':
        await supabaseAdmin.from('subscriptions').update({
          status: 'halted',
          updated_at: new Date().toISOString(),
        }).eq('razorpay_subscription_id', sub.id);

        if (userId) {
          await supabaseAdmin.from('profiles').update({
            plan: 'starter',
            subscription_status: 'halted',
          }).eq('id', userId);
        }
        break;

      case 'subscription.cancelled':
        await supabaseAdmin.from('subscriptions').update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        }).eq('razorpay_subscription_id', sub.id);

        if (userId) {
          await supabaseAdmin.from('profiles').update({
            plan: 'starter',
            plan_key: null,
            subscription_status: 'cancelled',
          }).eq('id', userId);
        }
        break;
    }

    return res.status(200).json({ ok: true });
  } catch(e) {
    console.error('Webhook processing error:', e);
    return res.status(500).json({ error: e.message });
  }
}
