// pages/api/ai/food-suggestion.js
// Blitora Pulse — AI Food Suggestion for Meal Slot
// Returns one AI-highlighted food pick per meal slot
// Model: Gemini (basic/trial) | Haiku (pro/premium)

import { callAI, normalisePlan, resolveUserLocation } from '../../../lib/ai'
import { getFoodSuggestionPrompt } from '../../../lib/ai-prompts'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, plan, profile, mealSlot, todayLog, country } = req.body

  if (!userId || !profile || !mealSlot) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const vercelCountry = req.headers['x-vercel-ip-country'] || null
    const userLocation = resolveUserLocation(country, vercelCountry)

    const normalisedPlan = normalisePlan(
      plan?.includes('clinic') ? 'org_admin' : 'patient',
      plan?.replace('individual_', '').replace('clinic_', '') || 'trial'
    )

    const { system, user } = getFoodSuggestionPrompt(profile, mealSlot, todayLog, userLocation)

    // Cache per user per meal slot per day — refreshes each day
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `food_suggestion_${mealSlot}_${today}`

    const result = await callAI({
      task: 'food_suggestion',
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
      return res.status(200).json({ suggestion: null })
    }

    // Parse JSON response
    let suggestion = null
    try {
      const clean = result.content.replace(/```json|```/g, '').trim()
      suggestion = JSON.parse(clean)
    } catch (e) {
      suggestion = null
    }

    return res.status(200).json({
      suggestion,
      fromCache: result.fromCache,
      model: result.model,
    })

  } catch (err) {
    console.error('Food suggestion API error:', err)
    return res.status(200).json({ suggestion: null })
  }
}
