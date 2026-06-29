// pages/api/auth/check-lockout.js
// Login lockout — 5 failed attempts in 15 minutes = locked
// Called from index.js before attempting login

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Check if locked
    const { email } = req.body
    if (!email) return res.status(400).json({ locked: false })

    try {
      const { data } = await supabase.rpc('is_login_locked', { p_email: email.toLowerCase() })
      return res.status(200).json({ locked: !!data })
    } catch (e) {
      return res.status(200).json({ locked: false })
    }
  }

  if (req.method === 'PUT') {
    // Record attempt
    const { email, success, ip } = req.body
    if (!email) return res.status(400).json({ ok: false })

    try {
      await supabase.from('login_attempts').insert({
        email: email.toLowerCase(),
        success: !!success,
        ip_address: ip || req.headers['x-forwarded-for'] || null,
      })
      return res.status(200).json({ ok: true })
    } catch (e) {
      return res.status(200).json({ ok: false })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
