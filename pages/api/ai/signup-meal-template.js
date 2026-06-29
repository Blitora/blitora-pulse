// pages/api/ai/signup-meal-template.js
// Fires once at individual signup — Sonnet generates full 7-day template
// Called from signup.js after account creation

import { callAI, normalisePlan, resolveUserLocation } from '../../../lib/ai'
import { getSignupMealTemplatePrompt, getSignupMacroTargetsPrompt } from '../../../lib/ai-prompts'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, profile, country } = req.body
  if (!userId || !profile) return res.status(400).json({ error: 'Missing fields' })

  try {
    const vercelCountry = req.headers['x-vercel-ip-country'] || null
    const userLocation = resolveUserLocation(country, vercelCountry)
    const plan = 'individual_trial' // signup is always trial

    // Step 1 — Calculate macro targets (Sonnet)
    const macroPrompt = getSignupMacroTargetsPrompt(profile)
    const macroResult = await callAI({
      task: 'signup_macro_targets',
      plan,
      userId,
      prompt: macroPrompt.user,
      systemPrompt: macroPrompt.system,
      userLocation,
    })

    let macros = {
      dailyCalorieTarget: 1600,
      proteinG: 100,
      carbsG: 130,
      fatG: 55,
      fibreG: 25,
      waterMl: 2500,
    }

    if (!macroResult.error) {
      try {
        const clean = macroResult.content.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        macros = { ...macros, ...parsed }
      } catch (e) {
        console.warn('Macro parse failed, using defaults')
      }
    }

    // Step 2 — Generate meal template (Sonnet with extended thinking)
    const fullProfile = {
      ...profile,
      dailyCalorieTarget: macros.dailyCalorieTarget || macros.dailyCalories,
      proteinTarget: macros.proteinG,
      carbTarget: macros.carbsG,
      fatTarget: macros.fatG,
    }

    const templatePrompt = getSignupMealTemplatePrompt(fullProfile, userLocation)
    const templateResult = await callAI({
      task: 'signup_meal_template',
      plan,
      userId,
      prompt: templatePrompt.user,
      systemPrompt: templatePrompt.system,
      userLocation,
    })

    let templateData = null
    if (!templateResult.error) {
      try {
        const clean = templateResult.content.replace(/```json|```/g, '').trim()
        templateData = JSON.parse(clean)
      } catch (e) {
        console.warn('Template parse failed')
      }
    }

    // Step 3 — Save macro targets to profile
    await supabase.from('profiles').update({
      calorie_target: Math.round(macros.dailyCalorieTarget || macros.dailyCalories || 1600),
      protein_target: Math.round(macros.proteinG || 100),
      carb_target: Math.round(macros.carbsG || 130),
      fat_target: Math.round(macros.fatG || 55),
      water_target: ((macros.waterMl || 2500) / 1000).toFixed(1),
    }).eq('id', userId)

    // Step 4 — Save template to meal_templates if generated
    if (templateData) {
      const { data: template } = await supabase
        .from('meal_templates')
        .insert({
          name: templateData.templateName || 'AI Generated Plan',
          description: templateData.description || '',
          conditions: profile.healthConditions || [],
          created_by: userId,
        })
        .select()
        .single()

      if (template) {
        // Link template to user profile
        await supabase.from('profiles').update({
          active_template_id: template.id,
        }).eq('id', userId)

        // Save meal slot food items
        if (templateData.mealSlots?.length > 0) {
          const items = templateData.mealSlots.flatMap(slot =>
            (slot.suggestions || []).map(food => ({
              template_id: template.id,
              name: food.name,
              calories: food.calories || 0,
              protein: food.protein || 0,
              carbs: food.carbs || 0,
              fat: food.fat || 0,
              meal_slot: slot.slot,
              added_by_user: false,
            }))
          )
          if (items.length > 0) {
            await supabase.from('template_food_items').insert(items)
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      macros,
      templateGenerated: !!templateData,
      templateName: templateData?.templateName,
    })

  } catch (err) {
    console.error('Signup meal template error:', err)
    // Non-critical — signup should still succeed
    return res.status(200).json({ success: false, error: err.message })
  }
}
