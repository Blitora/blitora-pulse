// pages/api/ai/tomorrow-plan.js
// Blitora Pulse — Tomorrow Meal Plan API Route
// Generates tomorrow's personalised meal plan based on today's gap
// Model: Haiku (pro) | Sonnet (premium)

import { callAI, normalisePlan, resolveUserLocation } from '../../../lib/ai'
import { getTomorrowPlanPrompt } from '../../../lib/ai-prompts'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, plan, profile, todayLog, country } = req.body

  if (!userId || !profile) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const vercelCountry = req.headers['x-vercel-ip-country'] || null
    const userLocation = resolveUserLocation(country, vercelCountry)

    const normalisedPlan = normalisePlan(
      plan?.includes('clinic') ? 'org_admin' : 'patient',
      plan?.replace('individual_', '').replace('clinic_', '') || 'trial'
    )

    const { system, user } = getTomorrowPlanPrompt(profile, todayLog, userLocation)

    // Cache key — tomorrow plan cached for rest of today (until midnight)
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `tomorrow_plan_${today}`

    // Calculate hours until midnight for cache TTL
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const hoursUntilMidnight = Math.max(1, Math.ceil((midnight - now) / 3600000))

    const result = await callAI({
      task: 'tomorrow_plan',
      plan: normalisedPlan,
      userId,
      prompt: user,
      systemPrompt: system,
      userLocation,
      useCache: true,
      cacheKey,
      cacheTtlHours: hoursUntilMidnight,
    })

    if (result.error) {
      if (result.errorType === 'not_available') {
        return res.status(200).json({
          error: 'not_available',
          message: 'Tomorrow meal plan is available on Pro and Premium plans.',
        })
      }
      if (result.errorType === 'quota_exceeded') {
        return res.status(200).json({ error: 'quota_exceeded' })
      }
      return res.status(500).json({ error: 'AI service unavailable' })
    }

    // Parse JSON response from AI
    let parsed = null
    try {
      const clean = result.content.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch (e) {
      // Return raw content if JSON parse fails
      parsed = { summary: result.content, meals: [], tip: '' }
    }

    return res.status(200).json({
      plan: parsed,
      fromCache: result.fromCache,
      model: result.model,
    })

  } catch (err) {
    console.error('Tomorrow plan API error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
