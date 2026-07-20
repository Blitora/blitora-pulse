// pages/api/ai/signup-meal-template.js
import { callAI, resolveUserLocation } from '../../../lib/ai'
import { getSignupMealTemplatePrompt, getSignupMacroTargetsPrompt } from '../../../lib/ai-prompts'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { userId, profile, country } = req.body
  if (!userId || !profile) return res.status(400).json({ error: 'Missing fields' })
  try {
    const userLocation = resolveUserLocation(country, req.headers['x-vercel-ip-country'] || null)
    const plan = 'individual_trial'

    // Macro targets
    const macroPrompt = getSignupMacroTargetsPrompt(profile)
    const macroResult = await callAI({ task:'signup_macro_targets', plan, userId, prompt:macroPrompt.user, systemPrompt:macroPrompt.system, userLocation })
    let macros = { dailyCalorieTarget:1600, proteinG:100, carbsG:130, fatG:55, waterMl:2500 }
    if (!macroResult.error) {
      try { macros = { ...macros, ...JSON.parse(macroResult.content.replace(/```json|```/g,'').trim()) } } catch(e) {}
    }
    await sb.from('profiles').update({
      calorie_target: Math.round(macros.dailyCalorieTarget||1600),
      protein_target: Math.round(macros.proteinG||100),
      carb_target: Math.round(macros.carbsG||130),
      fat_target: Math.round(macros.fatG||55),
      water_target: ((macros.waterMl||2500)/1000).toFixed(1),
    }).eq('id', userId)

    // 3-option meal template
    const tPrompt = getSignupMealTemplatePrompt({ ...profile, dailyCalorieTarget:macros.dailyCalorieTarget, proteinTarget:macros.proteinG, carbTarget:macros.carbsG, fatTarget:macros.fatG }, userLocation)
    const tResult = await callAI({ task:'signup_meal_template', plan, userId, prompt:tPrompt.user, systemPrompt:tPrompt.system, userLocation })

    let tData = null
    if (!tResult.error) {
      try { tData = JSON.parse(tResult.content.replace(/```json|```/g,'').trim()) } catch(e) { console.warn('Template parse failed:', e.message) }
    }

    if (tData) {
      const { data: tmpl } = await sb.from('meal_templates').insert({
        name: tData.templateName||'AI Personalised Plan',
        description: tData.description||'',
        conditions: profile.healthConditions||[],
        created_by: userId, ai_generated: true,
        avoid_foods: tData.avoidFoods||[], tips: tData.tips||[],
        weekly_variation: tData.weeklyVariation||null,
      }).select().single()

      if (tmpl) {
        await sb.from('profiles').update({ active_template_id: tmpl.id }).eq('id', userId)
        if (tData.mealSlots?.length > 0) {
          const items = tData.mealSlots.flatMap(slot =>
            (slot.options||[]).flatMap(opt =>
              (opt.items||[]).map(food => ({
                template_id: tmpl.id, name: food.name,
                calories: food.calories||0, protein: food.protein||0,
                carbs: food.carbs||0, fat: food.fat||0,
                meal_slot: slot.slot, meal_slots: [slot.slot],
                option_group: opt.optionLabel||'A',
                option_label: opt.optionName||null,
                quantity_desc: food.quantity||null,
                category: food.notes||null,
                added_by_user: false, is_master: false,
              }))
            )
          )
          if (items.length > 0) await sb.from('template_food_items').insert(items)
        }
        return res.status(200).json({ success:true, macros, templateGenerated:true, templateId:tmpl.id })
      }
    }
    return res.status(200).json({ success:false, macros, templateGenerated:false })
  } catch(err) {
    return res.status(200).json({ success:false, error:err.message })
  }
}
