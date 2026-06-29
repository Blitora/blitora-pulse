// pages/api/auth/signup-complete.js
// Called after auth.signUp() to create org, membership, and profile
// Uses service role to bypass RLS since user is not yet authenticated
// This is the correct pattern for post-signup DB writes

import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS
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
    // 1. Create organisation
    const trialDays = type === 'clinic' ? 7 : 3
    const orgName = type === 'clinic'
      ? (clinicData?.clinicName || `${name}'s Clinic`)
      : `${name}'s Account`

    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organisations')
      .insert({
        name: orgName,
        plan: 'trial',
        trial_ends_at: new Date(Date.now() + trialDays * 86400000).toISOString(),
        max_patients: type === 'clinic' ? 50 : 1,
      })
      .select()
      .single()

    if (orgErr) throw new Error('Organisation creation failed: ' + orgErr.message)

    // 2. Create org membership
    const memberRole = type === 'clinic' ? 'org_admin' : 'patient'
    const { error: memErr } = await supabaseAdmin
      .from('organisation_members')
      .insert({
        org_id: org.id,
        user_id: userId,
        role: memberRole,
        is_active: true,
        joined_at: new Date().toISOString(),
      })

    if (memErr) throw new Error('Membership creation failed: ' + memErr.message)

    // 3. Save profile
    const profileData = {
      id: userId,
      full_name: name,
      email: email.toLowerCase(),
      role: memberRole,
      status: 'active',
      setup_complete: type === 'individual',
      country: profile?.country || null,
    }

    if (type === 'individual' && profile) {
      Object.assign(profileData, {
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
        calorie_target: 1600, // will be updated by AI template generation
        protein_target: 100,
        carb_target: 130,
        fat_target: 55,
      })
    }

    if (type === 'clinic' && clinicData) {
      Object.assign(profileData, {
        setup_complete: true,
      })
    }

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })

    if (profileErr) throw new Error('Profile save failed: ' + profileErr.message)

    // 4. Save clinic info to org if clinic signup
    if (type === 'clinic' && clinicData) {
      await supabaseAdmin
        .from('organisations')
        .update({
          name: clinicData.clinicName || orgName,
        })
        .eq('id', org.id)
    }

    return res.status(200).json({
      success: true,
      orgId: org.id,
      role: memberRole,
    })

  } catch (err) {
    console.error('Signup complete error:', err)
    return res.status(500).json({ error: err.message })
  }
}
