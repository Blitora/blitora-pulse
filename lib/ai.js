// lib/ai.js
// Blitora Pulse — Central AI Router
// All AI calls in the app go through callAI() — never call providers directly
// Model selection is automatic based on task + user plan + user location
// Version: 1.1 — June 2026 — International location support + extended thinking

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ─────────────────────────────────────────────
// 1. TASK × EDITION MODEL MATRIX
// null = feature not available on this plan
// ─────────────────────────────────────────────
const MODEL_MAP = {

  insight_card: {
    individual_trial:        'gemini',
    individual_basic:        'gemini',
    individual_pro:          'haiku',
    individual_premium:      'haiku',
    clinic_trial:            'gemini',
    clinic_starter:          'haiku',
    clinic_professional:     'haiku',
    clinic_premium:          'haiku',
  },

  quick_chat: {
    individual_trial:        'gemini',
    individual_basic:        'gemini',
    individual_pro:          'haiku',
    individual_premium:      'haiku',
    clinic_trial:            null,
    clinic_starter:          null,
    clinic_professional:     null,
    clinic_premium:          null,
  },

  dietitian_chat: {
    individual_trial:        null,
    individual_basic:        null,
    individual_pro:          null,
    individual_premium:      null,
    clinic_trial:            'gemini',
    clinic_starter:          'haiku',
    clinic_professional:     'sonnet',
    clinic_premium:          'sonnet',
  },

  // Extended thinking enabled for these two tasks
  signup_meal_template: {
    individual_trial:        'sonnet',
    individual_basic:        'sonnet',
    individual_pro:          'sonnet',
    individual_premium:      'sonnet',
    clinic_trial:            null,
    clinic_starter:          null,
    clinic_professional:     null,
    clinic_premium:          null,
  },

  signup_macro_targets: {
    individual_trial:        'sonnet',
    individual_basic:        'sonnet',
    individual_pro:          'sonnet',
    individual_premium:      'sonnet',
    clinic_trial:            null,
    clinic_starter:          null,
    clinic_professional:     null,
    clinic_premium:          null,
  },

  tomorrow_plan: {
    individual_trial:        null,
    individual_basic:        null,
    individual_pro:          'haiku',
    individual_premium:      'sonnet',
    clinic_trial:            null,
    clinic_starter:          null,
    clinic_professional:     null,
    clinic_premium:          null,
  },

  food_suggestion: {
    individual_trial:        'gemini',
    individual_basic:        'gemini',
    individual_pro:          'haiku',
    individual_premium:      'haiku',
    clinic_trial:            null,
    clinic_starter:          null,
    clinic_professional:     null,
    clinic_premium:          null,
  },

  // Extended thinking enabled for this task
  patient_plan_gen: {
    individual_trial:        null,
    individual_basic:        null,
    individual_pro:          null,
    individual_premium:      null,
    clinic_trial:            'sonnet',
    clinic_starter:          'sonnet',
    clinic_professional:     'sonnet',
    clinic_premium:          'sonnet',
  },

  patient_insight_card: {
    individual_trial:        null,
    individual_basic:        null,
    individual_pro:          null,
    individual_premium:      null,
    clinic_trial:            'gemini',
    clinic_starter:          'haiku',
    clinic_professional:     'haiku',
    clinic_premium:          'haiku',
  },

  compliance_summary: {
    individual_trial:        null,
    individual_basic:        null,
    individual_pro:          null,
    individual_premium:      null,
    clinic_trial:            'gemini',
    clinic_starter:          'haiku',
    clinic_professional:     'haiku',
    clinic_premium:          'sonnet',
  },
}

// Tasks that use extended thinking (Sonnet only)
// These are complex generation tasks where deeper reasoning = better output
const EXTENDED_THINKING_TASKS = [
  'patient_plan_gen',
  'signup_meal_template',
]

// ─────────────────────────────────────────────
// 2. MONTHLY QUOTA BY PLAN
// ─────────────────────────────────────────────
const PLAN_QUOTAS = {
  individual_trial:        { gemini: 30,   haiku: 0,    sonnet: 2   },
  individual_basic:        { gemini: 50,   haiku: 0,    sonnet: 1   },
  individual_pro:          { gemini: 0,    haiku: 90,   sonnet: 0   },
  individual_premium:      { gemini: 0,    haiku: 210,  sonnet: 2   },
  clinic_trial:            { gemini: 20,   haiku: 0,    sonnet: 3   },
  clinic_starter:          { gemini: 0,    haiku: 500,  sonnet: 5   },
  clinic_professional:     { gemini: 0,    haiku: 1500, sonnet: 80  },
  clinic_premium:          { gemini: 0,    haiku: 8000, sonnet: 300 },
}

// Cost per token in USD (for logging only)
const TOKEN_COSTS = {
  gemini:  { input: 0,          output: 0          },
  haiku:   { input: 0.0000008,  output: 0.000004   },
  sonnet:  { input: 0.000003,   output: 0.000015   },
}

// ─────────────────────────────────────────────
// 3. LOCATION RESOLVER
// Gets user country from multiple sources
// Priority: profile country > Vercel header > fallback
// ─────────────────────────────────────────────
export function resolveUserLocation(profileCountry, vercelCountryHeader) {
  // Use profile country if set (most accurate — user chose it)
  if (profileCountry && profileCountry.trim().length > 0) {
    return profileCountry.trim()
  }

  // Use Vercel's automatic country detection (x-vercel-ip-country header)
  // Available on all Vercel deployments automatically — no extra cost
  if (vercelCountryHeader && vercelCountryHeader.trim().length > 0) {
    return countryCodeToName(vercelCountryHeader.trim().toUpperCase())
  }

  // Final fallback
  return 'International'
}

// Converts ISO country code to readable name for prompt context
function countryCodeToName(code) {
  const countries = {
    IN: 'India', AE: 'UAE', SA: 'Saudi Arabia', QA: 'Qatar',
    KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', GB: 'United Kingdom',
    US: 'United States', CA: 'Canada', AU: 'Australia', NZ: 'New Zealand',
    SG: 'Singapore', MY: 'Malaysia', PK: 'Pakistan', BD: 'Bangladesh',
    LK: 'Sri Lanka', NG: 'Nigeria', ZA: 'South Africa', KE: 'Kenya',
    DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain',
    NL: 'Netherlands', SE: 'Sweden', NO: 'Norway', DK: 'Denmark',
    PH: 'Philippines', ID: 'Indonesia', TH: 'Thailand', VN: 'Vietnam',
    JP: 'Japan', KR: 'South Korea', CN: 'China', EG: 'Egypt',
    JO: 'Jordan', LB: 'Lebanon', TR: 'Turkey', IR: 'Iran',
  }
  return countries[code] || 'International'
}

// ─────────────────────────────────────────────
// 4. MODEL SELECTOR
// ─────────────────────────────────────────────
function selectModel(task, plan) {
  const taskMap = MODEL_MAP[task]
  if (!taskMap) return null
  return taskMap[plan] || null
}

// ─────────────────────────────────────────────
// 5. QUOTA CHECK
// ─────────────────────────────────────────────
async function checkQuota(userId, orgId, plan, model) {
  const month = new Date().toISOString().slice(0, 7)
  const quotaLimit = PLAN_QUOTAS[plan]?.[model] ?? 0

  if (quotaLimit === 0) {
    return { allowed: false, remaining: 0 }
  }

  const lookupId = orgId || userId

  const { data, error } = await supabase
    .from('ai_usage')
    .select('calls_count')
    .eq(orgId ? 'org_id' : 'user_id', lookupId)
    .eq('month', month)
    .eq('model', model)

  if (error) {
    console.error('Quota check error:', error)
    return { allowed: true, remaining: quotaLimit }
  }

  const used = data?.reduce((sum, row) => sum + row.calls_count, 0) || 0
  const remaining = quotaLimit - used

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    used,
    limit: quotaLimit,
  }
}

// ─────────────────────────────────────────────
// 6. TOPUP BALANCE CHECK
// ─────────────────────────────────────────────
async function checkTopupBalance(userId, orgId, topupType) {
  const { data } = await supabase
    .from('ai_topups')
    .select('id, messages_remaining')
    .eq(orgId ? 'org_id' : 'user_id', orgId || userId)
    .eq('topup_type', topupType)
    .gt('messages_remaining', 0)
    .gt('expires_at', new Date().toISOString())
    .order('purchased_at', { ascending: true })
    .limit(1)

  return data?.[0] || null
}

// ─────────────────────────────────────────────
// 7. CACHE READ / WRITE
// ─────────────────────────────────────────────
async function getCache(userId, cacheKey) {
  const { data } = await supabase
    .from('ai_cache')
    .select('content')
    .eq('user_id', userId)
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single()

  return data?.content || null
}

async function setCache(userId, cacheKey, content, modelUsed, ttlHours = 24) {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + ttlHours)

  await supabase
    .from('ai_cache')
    .upsert({
      user_id: userId,
      cache_key: cacheKey,
      content,
      model_used: modelUsed,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,cache_key' })
}

// ─────────────────────────────────────────────
// 8. USAGE LOGGER
// ─────────────────────────────────────────────
async function logUsage(userId, orgId, model, task, tokensIn, tokensOut) {
  const month = new Date().toISOString().slice(0, 7)
  const costs = TOKEN_COSTS[model]
  const costUsd = (tokensIn * costs.input) + (tokensOut * costs.output)

  await supabase
    .from('ai_usage')
    .upsert({
      user_id: userId,
      org_id: orgId || null,
      month,
      model,
      task,
      calls_count: 1,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      cost_usd: costUsd,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,month,task,model',
      ignoreDuplicates: false,
    })
}

// ─────────────────────────────────────────────
// 9. PROVIDER CALLERS
// ─────────────────────────────────────────────

// Claude — Haiku or Sonnet
// Extended thinking enabled automatically for complex generation tasks
async function callClaude(prompt, systemPrompt, modelString, useExtendedThinking = false) {
  const body = {
    model: modelString,
    max_tokens: useExtendedThinking ? 16000 : 1024,
    system: systemPrompt || '',
    messages: [{ role: 'user', content: prompt }],
  }

  // Extended thinking — deeper reasoning for complex plan generation
  // Only enabled for patient_plan_gen and signup_meal_template
  if (useExtendedThinking && modelString.includes('sonnet')) {
    body.thinking = {
      type: 'enabled',
      budget_tokens: 10000,
    }
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${err}`)
  }

  const data = await response.json()

  // Extract text content — skip thinking blocks
  const content = data.content
    ?.filter(block => block.type === 'text')
    ?.map(block => block.text)
    ?.join('') || ''

  const tokensIn = data.usage?.input_tokens || 0
  const tokensOut = data.usage?.output_tokens || 0

  return { content, tokensIn, tokensOut }
}

// Gemini Flash — free tier
async function callGemini(prompt, systemPrompt) {
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${prompt}`
    : prompt

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: 512 },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error: ${err}`)
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  return { content, tokensIn: 0, tokensOut: 0 }
}

// ─────────────────────────────────────────────
// 10. MAIN callAI() FUNCTION
// ─────────────────────────────────────────────

/**
 * callAI — central AI router for Blitora Pulse
 *
 * @param {string}  task              — task key from MODEL_MAP
 * @param {string}  plan              — e.g. 'individual_pro', 'clinic_starter'
 * @param {string}  userId            — auth.uid()
 * @param {string}  prompt            — user-facing prompt
 * @param {string}  systemPrompt      — from lib/ai-prompts.js
 * @param {string}  orgId             — org id for clinic users, null for individuals
 * @param {string}  userLocation      — country name e.g. 'India', 'United Kingdom'
 * @param {boolean} useCache          — read/write cache
 * @param {string}  cacheKey          — e.g. 'insight_card_2026-06-29'
 * @param {number}  cacheTtlHours     — cache TTL (default 24h)
 * @param {string}  topupType         — topup type if applicable
 * @param {boolean} allowHaikuFallback — fall back to haiku if sonnet quota hit
 *
 * @returns {object} { content, fromCache, model, error, errorType }
 */
export async function callAI({
  task,
  plan,
  userId,
  prompt,
  systemPrompt = '',
  orgId = null,
  userLocation = 'International',
  useCache = false,
  cacheKey = null,
  cacheTtlHours = 24,
  topupType = null,
  allowHaikuFallback = false,
}) {

  // Step 1 — Check cache
  if (useCache && cacheKey) {
    const cached = await getCache(userId, cacheKey)
    if (cached) {
      return { content: cached, fromCache: true, model: 'cache' }
    }
  }

  // Step 2 — Select model
  let model = selectModel(task, plan)

  if (!model) {
    return {
      error: true,
      errorType: 'not_available',
      content: null,
      message: 'This feature is not available on your current plan.',
    }
  }

  // Step 3 — Check quota
  const quota = await checkQuota(userId, orgId, plan, model)

  if (!quota.allowed) {
    if (topupType) {
      const topup = await checkTopupBalance(userId, orgId, topupType)
      if (topup) {
        await supabase
          .from('ai_topups')
          .update({ messages_remaining: topup.messages_remaining - 1 })
          .eq('id', topup.id)
      } else {
        if (allowHaikuFallback && model === 'sonnet') {
          model = 'haiku'
          const haikusQuota = await checkQuota(userId, orgId, plan, 'haiku')
          if (!haikusQuota.allowed) model = 'gemini'
        } else if (['insight_card', 'quick_chat', 'food_suggestion', 'patient_insight_card'].includes(task)) {
          model = 'gemini'
        } else {
          return {
            error: true,
            errorType: 'quota_exceeded',
            content: null,
            remaining: 0,
            limit: quota.limit,
            message: 'Monthly AI limit reached.',
          }
        }
      }
    } else {
      if (['insight_card', 'quick_chat', 'food_suggestion', 'patient_insight_card'].includes(task)) {
        model = 'gemini'
      } else {
        return {
          error: true,
          errorType: 'quota_exceeded',
          content: null,
          remaining: 0,
          limit: quota.limit,
          message: 'Monthly AI limit reached.',
        }
      }
    }
  }

  // Step 4 — Determine if extended thinking should be used
  const useExtendedThinking = (
    EXTENDED_THINKING_TASKS.includes(task) &&
    model === 'sonnet'
  )

  // Step 5 — Call provider
  let result
  try {
    if (model === 'gemini') {
      result = await callGemini(prompt, systemPrompt)
    } else if (model === 'haiku') {
      result = await callClaude(prompt, systemPrompt, 'claude-haiku-4-5-20251001', false)
    } else if (model === 'sonnet') {
      result = await callClaude(prompt, systemPrompt, 'claude-sonnet-4-6', useExtendedThinking)
    }
  } catch (err) {
    console.error('AI provider error:', err)
    return {
      error: true,
      errorType: 'api_error',
      content: null,
      message: 'AI service temporarily unavailable. Please try again.',
    }
  }

  // Step 6 — Log usage
  await logUsage(userId, orgId, model, task, result.tokensIn, result.tokensOut)

  // Step 7 — Write cache
  if (useCache && cacheKey && result.content) {
    await setCache(userId, cacheKey, result.content, model, cacheTtlHours)
  }

  return {
    content: result.content,
    fromCache: false,
    model,
    usedExtendedThinking: useExtendedThinking,
    error: false,
  }
}

// ─────────────────────────────────────────────
// 11. USAGE SUMMARY — Profile/Settings page
// ─────────────────────────────────────────────
export async function getUsageSummary(userId, orgId, plan) {
  const month = new Date().toISOString().slice(0, 7)
  const lookupId = orgId || userId
  const lookupField = orgId ? 'org_id' : 'user_id'

  const { data } = await supabase
    .from('ai_usage')
    .select('model, task, calls_count, cost_usd')
    .eq(lookupField, lookupId)
    .eq('month', month)

  const quotas = PLAN_QUOTAS[plan] || {}

  const usage = { gemini: 0, haiku: 0, sonnet: 0 }
  data?.forEach(row => {
    usage[row.model] = (usage[row.model] || 0) + row.calls_count
  })

  const totalCostUsd = data?.reduce((sum, row) => sum + Number(row.cost_usd), 0) || 0
  const totalCostInr = totalCostUsd * 84

  return {
    month,
    usage,
    quotas,
    remaining: {
      gemini: Math.max(0, (quotas.gemini || 0) - usage.gemini),
      haiku:  Math.max(0, (quotas.haiku  || 0) - usage.haiku),
      sonnet: Math.max(0, (quotas.sonnet || 0) - usage.sonnet),
    },
    totalCostInr: totalCostInr.toFixed(2),
  }
}

// ─────────────────────────────────────────────
// 12. PLAN NORMALISER
// ─────────────────────────────────────────────
export function normalisePlan(role, planFromDb) {
  const isClinic = role === 'org_admin' || role === 'dietitian'
  const prefix = isClinic ? 'clinic' : 'individual'
  return `${prefix}_${planFromDb || 'trial'}`
}
