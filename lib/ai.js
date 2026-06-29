// lib/ai.js
// Blitora Pulse — Central AI Router
// All AI calls in the app go through callAI() — never call providers directly
// Model selection is automatic based on task + user plan

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

  // Daily insight card shown on dashboard home tab
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

  // AI chat messages — individual users
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

  // AI chat messages — dietitian/clinic users
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

  // Meal template generation at individual signup — one time
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

  // Macro/calorie target calculation at signup — one time
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

  // Tomorrow meal plan based on today gap
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

  // Food suggestion AI pick in meal slot
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

  // Full patient meal plan generation — clinic only
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

  // Patient insight card in clinic view — activity gated
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

  // Weekly compliance summary for dietitian
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

// ─────────────────────────────────────────────
// 2. MONTHLY QUOTA BY PLAN
// Counts per model type per month
// Clinic quotas are org-level not per-dietitian
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
// 3. MODEL SELECTOR
// ─────────────────────────────────────────────
function selectModel(task, plan) {
  const taskMap = MODEL_MAP[task]
  if (!taskMap) return null
  return taskMap[plan] || null
}

// ─────────────────────────────────────────────
// 4. QUOTA CHECK
// Returns { allowed, remaining, model }
// ─────────────────────────────────────────────
async function checkQuota(userId, orgId, plan, model) {
  const month = new Date().toISOString().slice(0, 7) // 2026-06
  const quotaLimit = PLAN_QUOTAS[plan]?.[model] ?? 0

  if (quotaLimit === 0) {
    return { allowed: false, remaining: 0 }
  }

  // For clinic plans check org-level usage
  const lookupId = orgId || userId

  const { data, error } = await supabase
    .from('ai_usage')
    .select('calls_count')
    .eq(orgId ? 'org_id' : 'user_id', lookupId)
    .eq('month', month)
    .eq('model', model)

  if (error) {
    console.error('Quota check error:', error)
    return { allowed: true, remaining: quotaLimit } // fail open
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
// 5. CHECK TOPUP BALANCE
// Returns remaining topup messages for this task type
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
// 6. CACHE READ / WRITE
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
// 7. USAGE LOGGER
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
// 8. PROVIDER CALLERS
// ─────────────────────────────────────────────

// Claude (Haiku or Sonnet)
async function callClaude(prompt, systemPrompt, modelString) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelString,
      max_tokens: 1024,
      system: systemPrompt || '',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error: ${err}`)
  }

  const data = await response.json()
  const content = data.content?.[0]?.text || ''
  const tokensIn = data.usage?.input_tokens || 0
  const tokensOut = data.usage?.output_tokens || 0

  return { content, tokensIn, tokensOut }
}

// Gemini Flash (free tier)
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

  // Gemini free does not return token counts reliably
  return { content, tokensIn: 0, tokensOut: 0 }
}

// ─────────────────────────────────────────────
// 9. MAIN callAI() FUNCTION
// This is the only function the rest of the app uses
// ─────────────────────────────────────────────

/**
 * callAI — central AI router for Blitora Pulse
 *
 * @param {string}  task         — one of the tasks defined in MODEL_MAP
 * @param {string}  plan         — user's current plan e.g. 'individual_pro'
 * @param {string}  userId       — auth.uid() of the calling user
 * @param {string}  prompt       — the user-facing prompt
 * @param {string}  systemPrompt — from lib/ai-prompts.js
 * @param {string}  orgId        — org id for clinic users, null for individuals
 * @param {boolean} useCache     — whether to read/write cache
 * @param {string}  cacheKey     — unique key e.g. 'insight_card_2026-06-29'
 * @param {number}  cacheTtlHours — how long to cache (default 24h)
 * @param {string}  topupType    — topup type if applicable
 * @param {boolean} allowHaikuFallback — if quota hit, fall back to haiku
 *
 * @returns {object} { content, fromCache, model, error, errorType }
 * errorType: 'not_available' | 'quota_exceeded' | 'api_error'
 */
export async function callAI({
  task,
  plan,
  userId,
  prompt,
  systemPrompt = '',
  orgId = null,
  useCache = false,
  cacheKey = null,
  cacheTtlHours = 24,
  topupType = null,
  allowHaikuFallback = false,
}) {

  // ── Step 1: Check cache first
  if (useCache && cacheKey) {
    const cached = await getCache(userId, cacheKey)
    if (cached) {
      return { content: cached, fromCache: true, model: 'cache' }
    }
  }

  // ── Step 2: Select model from matrix
  let model = selectModel(task, plan)

  if (!model) {
    return {
      error: true,
      errorType: 'not_available',
      content: null,
      message: 'This feature is not available on your current plan.',
    }
  }

  // ── Step 3: Check quota
  const quota = await checkQuota(userId, orgId, plan, model)

  if (!quota.allowed) {
    // Check topup balance first
    if (topupType) {
      const topup = await checkTopupBalance(userId, orgId, topupType)
      if (topup) {
        // Decrement topup balance
        await supabase
          .from('ai_topups')
          .update({ messages_remaining: topup.messages_remaining - 1 })
          .eq('id', topup.id)
        // Proceed with original model
      } else {
        // No topup — handle quota exceeded
        if (allowHaikuFallback && model === 'sonnet') {
          // Downgrade to haiku
          model = 'haiku'
          const haikusQuota = await checkQuota(userId, orgId, plan, 'haiku')
          if (!haikusQuota.allowed) {
            // Both sonnet and haiku exhausted — downgrade to gemini
            model = 'gemini'
          }
        } else if (
          task === 'insight_card' ||
          task === 'quick_chat' ||
          task === 'food_suggestion' ||
          task === 'patient_insight_card'
        ) {
          // Soft downgrade to gemini with visible banner
          model = 'gemini'
        } else {
          // Hard stop for plan_gen and other critical tasks
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
      // No topup type — same downgrade logic
      if (
        task === 'insight_card' ||
        task === 'quick_chat' ||
        task === 'food_suggestion' ||
        task === 'patient_insight_card'
      ) {
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

  // ── Step 4: Call the correct provider
  let result
  try {
    if (model === 'gemini') {
      result = await callGemini(prompt, systemPrompt)
    } else if (model === 'haiku') {
      result = await callClaude(prompt, systemPrompt, 'claude-haiku-4-5-20251001')
    } else if (model === 'sonnet') {
      result = await callClaude(prompt, systemPrompt, 'claude-sonnet-4-6')
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

  // ── Step 5: Log usage
  await logUsage(userId, orgId, model, task, result.tokensIn, result.tokensOut)

  // ── Step 6: Write to cache if applicable
  if (useCache && cacheKey && result.content) {
    await setCache(userId, cacheKey, result.content, model, cacheTtlHours)
  }

  return {
    content: result.content,
    fromCache: false,
    model,
    error: false,
  }
}

// ─────────────────────────────────────────────
// 10. USAGE SUMMARY (for Profile/Settings page)
// Returns current month usage for display
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

  // Aggregate by model
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
// 11. PLAN NORMALISER
// Converts DB plan value to MODEL_MAP key
// ─────────────────────────────────────────────
export function normalisePlan(role, planFromDb) {
  // role: 'patient' | 'org_admin' | 'dietitian'
  // planFromDb: 'basic' | 'pro' | 'premium' | 'starter' | 'professional' | 'trial'

  const isClinic = role === 'org_admin' || role === 'dietitian'
  const prefix = isClinic ? 'clinic' : 'individual'
  return `${prefix}_${planFromDb || 'trial'}`
}
