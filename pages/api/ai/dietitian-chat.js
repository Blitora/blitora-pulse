// pages/api/ai/dietitian-chat.js
// Clinic dietitian AI chat — Haiku (starter) | Sonnet (professional/premium)

import { callAI, normalisePlan, resolveUserLocation } from '../../../lib/ai'
import { getDietitianChatSystemPrompt } from '../../../lib/ai-prompts'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, orgId, orgName, clinicPlan, message, history = [], patientContext, country } = req.body
  if (!userId || !message) return res.status(400).json({ error: 'Missing fields' })

  try {
    const vercelCountry = req.headers['x-vercel-ip-country'] || null
    const userLocation = resolveUserLocation(country, vercelCountry)
    const normalisedPlan = normalisePlan('org_admin', clinicPlan || 'starter')

    const systemPrompt = getDietitianChatSystemPrompt(
      orgName || 'your clinic',
      userLocation,
      patientContext || null
    )

    const historyText = history.slice(-6)
      .map(m => `${m.role === 'user' ? 'Dietitian' : 'Assistant'}: ${m.content}`)
      .join('\n')

    const prompt = `${historyText ? `${historyText}\n\n` : ''}Dietitian: ${message}`

    const result = await callAI({
      task: 'dietitian_chat',
      plan: normalisedPlan,
      userId,
      orgId,
      prompt,
      systemPrompt,
      userLocation,
      topupType: 'clinic_chat',
    })

    if (result.error) {
      if (result.errorType === 'quota_exceeded') {
        return res.status(200).json({ error: 'quota_exceeded' })
      }
      return res.status(200).json({ content: 'Something went wrong. Please try again.', model: 'error' })
    }

    return res.status(200).json({
      content: result.content,
      model: result.model,
    })

  } catch (err) {
    console.error('Dietitian chat error:', err)
    return res.status(200).json({ content: 'Something went wrong. Please try again.', model: 'error' })
  }
}
