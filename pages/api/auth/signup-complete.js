// pages/api/auth/signup-complete.js
// Fixed: removed invalid columns current_weight and goal_weight
// Called after auth.signUp() to PATCH in detailed profile fields.
// Uses service role key to bypass RLS.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, email, name, type, profile, clinicData } = req.body
    if (!userId || !email || !type) {
          return res.status(400).json({ error: 'Missing required fields' })
    }

  const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY missing — profile writes may fail.')
  }

  try {
        const profileUpdate = {
                account_type: type,
                user_type: type,
                setup_complete: true,
        }
        if (name) profileUpdate.full_name = name

      if (type === 'individual' && profile) {
              Object.assign(profileUpdate, {
                        country:           profile.country    || null,
                        dob:               profile.dob        || null,
                        gender:            profile.gender     || null,
                        height_cm:         profile.heightCm   || null,
                        weight_start:      profile.weight     ? parseFloat(profile.weight)     : null,
                        weight_current:    profile.weight     ? parseFloat(profile.weight)     : null,
                        weight_target:     profile.goalWeight ? parseFloat(profile.goalWeight) : null,
                        activity_level:    profile.activity   || null,
                        conditions:        profile.conditions?.length ? profile.conditions : null,
                        health_conditions: profile.conditions?.length ? profile.conditions : null,
                        diet_type:         profile.diets?.length      ? profile.diets[0]      : null,
                        meals_per_day:     profile.mealPlan           ? parseInt(profile.mealPlan) : 5,
              })
      }

      if (type === 'clinic' && clinicData) {
              profileUpdate.country = clinicData.country || null
      }

      const { error: profileErr } = await supabaseAdmin
          .from('profiles')
          .update(profileUpdate)
          .eq('id', userId)

      if (profileErr) {
              console.error('Profile update failed:', profileErr.message, 'userId:', userId)
              const { error: fallbackErr } = await supabaseAdmin
                .from('profiles')
                .update({ setup_complete: true, account_type: type, user_type: type })
                .eq('id', userId)
              if (fallbackErr) {
                        console.error('Fallback update also failed:', fallbackErr.message)
                        return res.status(200).json({ success: false, error: profileErr.message })
              }
              console.log('Fallback setup_complete=true written for userId:', userId)
      } else {
              console.log('Full profile update written for userId:', userId, 'type:', type)
      }

      if (type === 'clinic' && clinicData?.clinicName) {
              let { data: membership } = await supabaseAdmin
                .from('organisation_members')
                .select('org_id')
                .eq('user_id', userId)
                .eq('role', 'org_admin')
                .limit(1)
                .maybeSingle()

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
                      .update({ name: clinicData.clinicName, max_patients: 50 })
                      .eq('id', membership.org_id)
          }
      }

      return res.status(200).json({ success: true })

  } catch (err) {
        console.error('signup-complete error:', err.message)
        return res.status(200).json({ success: false, error: err.message })
  }
}
// pages/api/auth/signup-complete.js
// Called after auth.signUp() to PATCH in detailed profile fields.
// Uses service role key to bypass RLS.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, email, name, type, profile, clinicData } = req.body
    if (!userId || !email || !type) {
          return res.status(400).json({ error: 'Missing required fields' })
    }

  const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY missing — profile writes may fail.')
  }

  try {
        const profileUpdate = {
                account_type: type,
                user_type: type,
                setup_complete: true,
        }
        if (name) profileUpdate.full_name = name

      if (type === 'individual' && profile) {
              Object.assign(profileUpdate, {
                        country:           profile.country    || null,
                        dob:               profile.dob        || null,
                        gender:            profile.gender     || null,
                        height_cm:         profile.heightCm   || null,
                        weight_start:      profile.weight     ? parseFloat(profile.weight)     : null,
                        weight_current:    profile.weight     ? parseFloat(profile.weight)     : null,
                        weight_target:     profile.goalWeight ? parseFloat(profile.goalWeight) : null,
                        activity_level:    profile.activity   || null,
                        conditions:        profile.conditions?.length ? profile.conditions : null,
                        health_conditions: profile.conditions?.length ? profile.conditions : null,
                        diet_type:         profile.diets?.length      ? profile.diets[0]      : null,
                        meals_per_day:     profile.mealPlan           ? parseInt(profile.mealPlan) : 5,
              })
      }

      if (type === 'clinic' && clinicData) {
              profileUpdate.country = clinicData.country || null
      }

      const { error: profileErr } = await supabaseAdmin
          .from('profiles')
          .update(profileUpdate)
          .eq('id', userId)

      if (profileErr) {
              console.error('Profile update failed:', profileErr.message, 'userId:', userId)
              const { error: fallbackErr } = await supabaseAdmin
                .from('profiles')
                .update({ setup_complete: true, account_type: type, user_type: type })
                .eq('id', userId)
              if (fallbackErr) {
                        console.error('Fallback update also failed:', fallbackErr.message)
                        return res.status(200).json({ success: false, error: profileErr.message })
              }
              console.log('Fallback setup_complete=true written for userId:', userId)
      } else {
              console.log('Full profile update written for userId:', userId, 'type:', type)
      }

      if (type === 'clinic' && clinicData?.clinicName) {
              let { data: membership } = await supabaseAdmin
                .from('organisation_members')
                .select('org_id')
                .eq('user_id', userId)
                .eq('role', 'org_admin')
                .limit(1)
                .maybeSingle()

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
                      .update({ name: clinicData.clinicName, max_patients: 50 })
                      .eq('id', membership.org_id)
          }
      }

      return res.status(200).json({ success: true })

  } catch (err) {
        console.error('signup-complete error:', err.message)
        return res.status(200).json({ success: false, error: err.message })
  }
}
// pages/api/auth/signup-complete.js
// Called after auth.signUp() to PATCH in detailed profile fields.
// Uses service role key to bypass RLS.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, email, name, type, profile, clinicData } = req.body
    if (!userId || !email || !type) {
          return res.status(400).json({ error: 'Missing required fields' })
    }

  const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY missing — profile writes may fail.')
  }

  try {
        const profileUpdate = {
                account_type: type,
                user_type: type,
                setup_complete: true,
        }
        if (name) profileUpdate.full_name = name

      if (type === 'individual' && profile) {
              Object.assign(profileUpdate, {
                        country:           profile.country    || null,
                        dob:               profile.dob        || null,
                        gender:            profile.gender     || null,
                        height_cm:         profile.heightCm   || null,
                        weight_start:      profile.weight     ? parseFloat(profile.weight)     : null,
                        weight_current:    profile.weight     ? parseFloat(profile.weight)     : null,
                        weight_target:     profile.goalWeight ? parseFloat(profile.goalWeight) : null,
                        activity_level:    profile.activity   || null,
                        conditions:        profile.conditions?.length ? profile.conditions : null,
                        health_conditions: profile.conditions?.length ? profile.conditions : null,
                        diet_type:         profile.diets?.length      ? profile.diets[0]      : null,
                        meals_per_day:     profile.mealPlan           ? parseInt(profile.mealPlan) : 5,
              })
      }

      if (type === 'clinic' && clinicData) {
              profileUpdate.country = clinicData.country || null
      }

      const { error: profileErr } = await supabaseAdmin
          .from('profiles')
          .update(profileUpdate)
          .eq('id', userId)

      if (profileErr) {
              console.error('Profile update failed:', profileErr.message, 'userId:', userId)
              const { error: fallbackErr } = await supabaseAdmin
                .from('profiles')
                .update({ setup_complete: true, account_type: type, user_type: type })
                .eq('id', userId)
              if (fallbackErr) {
                        console.error('Fallback update also failed:', fallbackErr.message)
                        return res.status(200).json({ success: false, error: profileErr.message })
              }
              console.log('Fallback setup_complete=true written for userId:', userId)
      } else {
              console.log('Full profile update written for userId:', userId, 'type:', type)
      }

      if (type === 'clinic' && clinicData?.clinicName) {
              let { data: membership } = await supabaseAdmin
                .from('organisation_members')
                .select('org_id')
                .eq('user_id', userId)
                .eq('role', 'org_admin')
                .limit(1)
                .maybeSingle()

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
                      .update({ name: clinicData.clinicName, max_patients: 50 })
                      .eq('id', membership.org_id)
          }
      }

      return res.status(200).json({ success: true })

  } catch (err) {
        console.error('signup-complete error:', err.message)
        return res.status(200).json({ success: false, error: err.message })
  }
}
