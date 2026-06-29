// pages/api/ai/patient-plan.js
// Dietitian generates full 7-day plan for a patient — Sonnet always
// Tracks plan gen quota per clinic org per month

import { callAI, normalisePlan, resolveUserLocation } from '../../../lib/ai'
import { getPatientPlanGenPrompt } from '../../../lib/ai-prompts'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, orgId, clinicPlan, patient, dietitianNotes, country } = req.body
  if (!userId || !orgId || !patient) return res.status(400).json({ error: 'Missing fields' })

  try {
    const vercelCountry = req.headers['x-vercel-ip-country'] || null
    const userLocation = resolveUserLocation(country, vercelCountry)

    const normalisedPlan = normalisePlan('org_admin', clinicPlan || 'starter')

    const { system, user } = getPatientPlanGenPrompt(patient, userLocation, dietitianNotes || '')

    const result = await callAI({
      task: 'patient_plan_gen',
      plan: normalisedPlan,
      userId,
      orgId,
      prompt: user,
      systemPrompt: system,
      userLocation,
      topupType: 'clinic_plan_gen',
      allowHaikuFallback: true,
    })

    if (result.error) {
      if (result.errorType === 'quota_exceeded') {
        return res.status(200).json({ error: 'quota_exceeded', limit: result.limit })
      }
      if (result.errorType === 'not_available') {
        return res.status(200).json({ error: 'not_available' })
      }
      return res.status(500).json({ error: 'AI unavailable' })
    }

    let plan = null
    try {
      const clean = result.content.replace(/```json|```/g, '').trim()
      plan = JSON.parse(clean)
    } catch (e) {
      plan = { rawContent: result.content }
    }

    return res.status(200).json({
      plan,
      model: result.model,
      usedExtendedThinking: result.usedExtendedThinking,
    })

  } catch (err) {
    console.error('Patient plan error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
