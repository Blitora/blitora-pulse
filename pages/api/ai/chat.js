// pages/api/ai/chat.js
// Blitora Pulse — AI Chat API Route
// Handles individual user chat with quota checking
// Model: Gemini (basic/trial) | Haiku (pro/premium)

import { callAI, normalisePlan, resolveUserLocation } from '../../../lib/ai'
import { getChatSystemPrompt } from '../../../lib/ai-prompts'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, plan, message, history = [], profile, todayLog, country } = req.body

  if (!userId || !message || !profile) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const vercelCountry = req.headers['x-vercel-ip-country'] || null
    const userLocation = resolveUserLocation(country, vercelCountry)

    const normalisedPlan = normalisePlan(
      plan?.includes('clinic') ? 'org_admin' : 'patient',
      plan?.replace('individual_', '').replace('clinic_', '') || 'trial'
    )

    // Build system prompt with full profile context
    const systemPrompt = getChatSystemPrompt(profile, userLocation)

    // Build prompt with today's log context + conversation history
    const historyText = history.length > 0
      ? history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
      : ''

    const todayContext = todayLog
      ? `\nToday's log so far: ${todayLog.totalCalories || 0} kcal consumed, ${todayLog.totalProtein || 0}g protein, ${todayLog.totalWaterMl || 0}ml water.`
      : ''

    const prompt = `${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}${todayContext}\n\nUser: ${message}`

    const result = await callAI({
      task: 'quick_chat',
      plan: normalisedPlan,
      userId,
      prompt,
      systemPrompt,
      userLocation,
      topupType: 'individual_chat',
    })

    if (result.error) {
      if (result.errorType === 'quota_exceeded') {
        return res.status(200).json({ error: 'quota_exceeded' })
      }
      return res.status(200).json({
        content: 'I had trouble responding. Please try again.',
        model: 'error',
      })
    }

    return res.status(200).json({
      content: result.content,
      model: result.model,
      fromCache: result.fromCache,
      downgraded: result.model === 'gemini' &&
        normalisedPlan !== 'individual_basic' &&
        normalisedPlan !== 'individual_trial',
    })

  } catch (err) {
    console.error('Chat API error:', err)
    return res.status(200).json({
      content: 'Something went wrong. Please try again.',
      model: 'error',
    })
  }
}
