// pages/api/ai/patient-insight.js
// AI insight for individual patient in clinic view — Haiku only
// Activity gated — only fires if patient logged today

import { callAI, normalisePlan } from '../../../lib/ai'
import { getPatientInsightCardPrompt } from '../../../lib/ai-prompts'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, orgId, clinicPlan, patient, todayLog } = req.body
  if (!userId || !patient) return res.status(400).json({ error: 'Missing fields' })

  // Activity gate — no log = no insight
  if (!todayLog || (todayLog.totalCalories === 0 && todayLog.totalProtein === 0)) {
    return res.status(200).json({ insight: null, reason: 'not_logged' })
  }

  try {
    const normalisedPlan = normalisePlan('org_admin', clinicPlan || 'starter')
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `patient_insight_${patient.id}_${today}`

    const { system, user } = getPatientInsightCardPrompt(patient, todayLog)

    const result = await callAI({
      task: 'patient_insight_card',
      plan: normalisedPlan,
      userId,
      orgId,
      prompt: user,
      systemPrompt: system,
      useCache: true,
      cacheKey,
      cacheTtlHours: 24,
    })

    if (result.error) return res.status(200).json({ insight: null })

    return res.status(200).json({
      insight: result.content,
      fromCache: result.fromCache,
      model: result.model,
    })

  } catch (err) {
    console.error('Patient insight error:', err)
    return res.status(200).json({ insight: null })
  }
}
