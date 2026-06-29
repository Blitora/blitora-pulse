// pages/api/ai/chat-quota.js
// Returns current month chat quota usage for a user

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PLAN_CHAT_LIMITS = {
  individual_trial:    20,
  individual_basic:    20,
  individual_pro:      60,
  individual_premium:  200,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  try {
    const month = new Date().toISOString().slice(0, 7)

    // Get profile to determine plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, role')
      .eq('id', userId)
      .single()

    const role = profile?.role || 'patient'
    const planKey = role === 'patient'
      ? `individual_${profile?.plan || 'trial'}`
      : `clinic_${profile?.plan || 'trial'}`

    const limit = PLAN_CHAT_LIMITS[planKey] || 20

    // Get usage
    const { data: usage } = await supabase
      .from('ai_usage')
      .select('calls_count')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('task', 'quick_chat')

    const used = usage?.reduce((s, r) => s + r.calls_count, 0) || 0

    // Check topups
    const { data: topups } = await supabase
      .from('ai_topups')
      .select('messages_remaining')
      .eq('user_id', userId)
      .eq('topup_type', 'individual_chat')
      .gt('messages_remaining', 0)
      .gt('expires_at', new Date().toISOString())

    const topupBalance = topups?.reduce((s, t) => s + t.messages_remaining, 0) || 0

    return res.status(200).json({
      used,
      limit,
      topupBalance,
      remaining: Math.max(0, limit - used) + topupBalance,
      plan: planKey,
    })

  } catch (err) {
    console.error('Quota API error:', err)
    return res.status(200).json({ used: 0, limit: 20, remaining: 20 })
  }
}
