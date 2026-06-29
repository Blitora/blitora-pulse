// pages/api/ai/insight.js
// Blitora Pulse — AI Insight Card API Route
// Called from dashboard.js once per day per user
// Checks cache first — only calls AI if no valid cache exists
// Returns: { content, fromCache, model, downgraded }

import { createClient } from '@supabase/supabase-js'
import { callAI, normalisePlan, resolveUserLocation } from '../../../lib/ai'
import { getInsightCardPrompt } from '../../../lib/ai-prompts'

// Server-side Supabase client — uses service role for cache read/write
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, plan, profile, todayLog, country } = req.body

  // Basic validation
  if (!userId || !profile) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Resolve location — profile country first, then Vercel header, then fallback
    const vercelCountry = req.headers['x-vercel-ip-country'] || null
    const userLocation = resolveUserLocation(country, vercelCountry)

    // Build cache key — insight card is cached per user per day
    const today = new Date().toISOString().split('T')[0] // 2026-06-29
    const cacheKey = `insight_card_${today}`

    // Normalise plan to MODEL_MAP key
    const normalisedPlan = normalisePlan(
      plan?.includes('clinic') ? 'org_admin' : 'patient',
      plan?.replace('individual_', '').replace('clinic_', '') || 'trial'
    )

    // Build prompts
    const { system, user } = getInsightCardPrompt(profile, todayLog, userLocation)

    // Call AI router — cache enabled with 24h TTL
    const result = await callAI({
      task: 'insight_card',
      plan: normalisedPlan,
      userId,
      prompt: user,
      systemPrompt: system,
      userLocation,
      useCache: true,
      cacheKey,
      cacheTtlHours: 24,
    })

    if (result.error) {
      // Return a friendly static fallback — never show an error on dashboard
      return res.status(200).json({
        content: `Good ${getTimeOfDay()}! Log your meals today to get a personalised AI insight based on your progress.`,
        fromCache: false,
        model: 'fallback',
        downgraded: false,
      })
    }

    return res.status(200).json({
      content: result.content,
      fromCache: result.fromCache,
      model: result.model,
      downgraded: result.model === 'gemini' && normalisedPlan !== 'individual_basic' && normalisedPlan !== 'individual_trial',
    })

  } catch (err) {
    console.error('Insight API error:', err)
    // Always return something — never break the dashboard
    return res.status(200).json({
      content: `Start logging your meals today and your AI health coach will give you a personalised insight.`,
      fromCache: false,
      model: 'fallback',
      downgraded: false,
    })
  }
}

// Helper — time-aware greeting for fallback messages
function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
