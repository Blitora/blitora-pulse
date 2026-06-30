// pages/api/ai/diag.js
// TEMPORARY diagnostic route — GET request, calls each AI provider directly
// and reports exact success/failure per provider. DELETE after debugging.

export default async function handler(req, res) {
  const results = {};

  // Test 1 — Gemini
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say hello in 3 words' }] }],
        }),
      }
    )
    const text = await r.text()
    results.gemini = {
      status: r.status,
      ok: r.ok,
      keyPresent: !!process.env.GEMINI_API_KEY,
      keyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 8) : 'MISSING',
      body: text.substring(0, 500),
    }
  } catch (err) {
    results.gemini = { error: err.message, keyPresent: !!process.env.GEMINI_API_KEY }
  }

  // Test 2 — Anthropic Haiku
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Say hello in 3 words' }],
      }),
    })
    const text = await r.text()
    results.anthropic = {
      status: r.status,
      ok: r.ok,
      keyPresent: !!process.env.ANTHROPIC_API_KEY,
      keyPrefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 12) : 'MISSING',
      body: text.substring(0, 500),
    }
  } catch (err) {
    results.anthropic = { error: err.message, keyPresent: !!process.env.ANTHROPIC_API_KEY }
  }

  // Test 3 — Env var presence check
  results.envCheck = {
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  return res.status(200).json(results)
}
