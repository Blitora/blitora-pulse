// pages/api/auth/signup-complete.js
// Called after auth.signUp() to PATCH in detailed profile fields
// (org, membership, and base profile are already created by the
//  handle_new_individual_signup() DB trigger — security definer, runs instantly on auth.users insert)
//
// This route is non-critical / best-effort: it just fills in height, weight,
// conditions, diet, goals etc. If it fails, the user still has a working
// account and can complete these details on /setup.
//
// Uses service role if available (bypasses RLS entirely — most reliable).
// Falls back to anon key — works because of the "Users update own profile"
// and "Users update own org" policies below, which is fine since by the time
// this call resolves the user's session often already exists client-side.

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, email, name, type, profile, clinicData } = req.body
  if (!userId || !email || !type) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Patch detailed profile fields (base row already exists via trigger)
    const profileUpdate = {
      country: profile?.country || clinicData?.country || null,
      account_type: type, // ensures Google users who choose a type post-verify get it persisted
    }
    if (name) profileUpdate.full_name = name

    if (type === 'individual' && profile) {
      Object.assign(profileUpdate, {
        dob: profile.dob || null,
        gender: profile.gender || null,
        height_cm: profile.heightCm || null,
        weight_start: profile.weight || null,
        weight_current: profile.weight || null,
        weight_target: profile.goalWeight || null,
        activity_level: profile.activity || null,
        conditions: profile.conditions?.length ? profile.conditions : null,
        diet_type: profile.diets?.length ? profile.diets[0] : null,
        meals_per_day: profile.mealPlan ? parseInt(profile.mealPlan) : 5,
        setup_complete: true,
      })
    }

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId)

    if (profileErr) {
      console.warn('Profile patch warning:', profileErr.message)
    }

    // Patch clinic name on the trigger-created org
    if (type === 'clinic' && clinicData?.clinicName) {
      let { data: membership } = await supabaseAdmin
        .from('organisation_members')
        .select('org_id')
        .eq('user_id', userId)
        .eq('role', 'org_admin')
        .limit(1)
        .maybeSingle()

      // Google OAuth clinic users have no trigger-created org — create one now
      if (!membership?.org_id) {
        const { data: newOrg, error: orgErr } = await supabaseAdmin
          .from('organisations')
          .insert({
            name: clinicData.clinicName,
            plan: 'trial',
            trial_ends_at: new Date(Date.now() + 14 * 864e5).toISOString(),
            max_patients: 50,
            is_active: true,
          })
          .select('id')
          .single()
        if (!orgErr && newOrg?.id) {
          await supabaseAdmin.from('organisation_members').insert({
            org_id: newOrg.id, user_id: userId, role: 'org_admin', is_active: true,
          })
          membership = { org_id: newOrg.id }
        } else if (orgErr) {
          console.warn('Org create warning:', orgErr.message)
        }
      }

      if (membership?.org_id) {
        await supabaseAdmin
          .from('organisations')
          .update({
            name: clinicData.clinicName,
            max_patients: 50, // clinic trial gets higher limit than default 1
          })
          .eq('id', membership.org_id)

        await supabaseAdmin
          .from('profiles')
          .update({ setup_complete: true })
          .eq('id', userId)
      }
    }

    return res.status(200).json({ success: true })

  } catch (err) {
    console.error('Signup-complete patch error (non-critical):', err)
    // Always 200 — this is best-effort, user can finish on /setup
    return res.status(200).json({ success: false, error: err.message })
  }
}
