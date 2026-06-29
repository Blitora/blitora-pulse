// pages/api/ai/compliance-summary.js
// Weekly compliance summary for dietitian — Haiku (starter/pro) | Sonnet (premium)

import { callAI, normalisePlan, resolveUserLocation } from '../../../lib/ai'
import { getComplianceSummaryPrompt } from '../../../lib/ai-prompts'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, orgId, orgName, clinicPlan, patientsData, weekRange } = req.body
  if (!userId || !orgId || !patientsData) return res.status(400).json({ error: 'Missing fields' })

  try {
    const normalisedPlan = normalisePlan('org_admin', clinicPlan || 'starter')
    const today = new Date().toISOString().split('T')[0]
    const cacheKey = `compliance_summary_${today}`

    const { system, user } = getComplianceSummaryPrompt(
      orgName || 'your clinic',
      patientsData,
      weekRange || `Week of ${today}`
    )

    const result = await callAI({
      task: 'compliance_summary',
      plan: normalisedPlan,
      userId,
      orgId,
      prompt: user,
      systemPrompt: system,
      useCache: true,
      cacheKey,
      cacheTtlHours: 6,
    })

    if (result.error) {
      return res.status(200).json({ summary: 'Unable to generate summary at this time.' })
    }

    return res.status(200).json({
      summary: result.content,
      fromCache: result.fromCache,
      model: result.model,
    })

  } catch (err) {
    console.error('Compliance summary error:', err)
    return res.status(200).json({ summary: 'Unable to generate summary at this time.' })
  }
}
