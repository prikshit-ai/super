import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Product = {
  id: number
  productUrl: string
  productImageUrl: string
  nutritionLabelImageUrl: string
  nutritionData: string | object
  price: string
  createdAt: string
  updatedAt: string
}

export type Category =
  | 'Protein Powder'
  | 'Mass Gainer'
  | 'Creatine'
  | 'BCAA / EAA'
  | 'Pre-Workout'
  | 'Multivitamin'
  | 'Fish Oil'
  | 'ZMA / Minerals'
  | 'Other'

export type ParsedProduct = {
  id: number
  productUrl: string
  productImageUrl: string
  nutritionLabelImageUrl: string
  price: number
  protein: number
  calories: number
  carbs: number
  fat: number
  creatine: number
  servingSize: string
  servingsPerContainer: number
  category: Category
  primaryMetricLabel: string   // e.g. "₹/g protein"
  primaryMetricValue: number   // the actual computed value
  pricePerProtein: number
}

function detectCategory(url: string): Category {
  const u = url.toLowerCase()
  if (u.includes('mass-gainer') || u.includes('weight-gainer') || u.includes('serious-mass') || u.includes('pro-complex-gainer')) return 'Mass Gainer'
  if (u.includes('creatine')) return 'Creatine'
  if (u.includes('bcaa') || u.includes('eaa') || u.includes('amino')) return 'BCAA / EAA'
  if (u.includes('pre-workout') || u.includes('preworkout') || u.includes('pre_workout')) return 'Pre-Workout'
  if (u.includes('multivitamin') || u.includes('multi-vitamin') || u.includes('opti-men') || u.includes('opti-women')) return 'Multivitamin'
  if (u.includes('fish-oil') || u.includes('omega') || u.includes('fishoil')) return 'Fish Oil'
  if (u.includes('zma') || u.includes('zinc') || u.includes('magnesium') || u.includes('mineral')) return 'ZMA / Minerals'
  if (u.includes('whey') || u.includes('casein') || u.includes('protein-powder') || u.includes('gold-standard') || u.includes('platinum')) return 'Protein Powder'
  return 'Other'
}

export function parseProduct(product: Product): ParsedProduct {
  let protein = 0
  let calories = 0
  let carbs = 0
  let fat = 0
  let creatine = 0
  let servingSize = ''
  let servingsPerContainer = 1

  try {
    const data = typeof product.nutritionData === 'string'
      ? JSON.parse(product.nutritionData)
      : product.nutritionData as Record<string, unknown>

    servingSize = (data as Record<string, unknown>).serving_size as string || ''
    servingsPerContainer = parseFloat((data as Record<string, unknown>).servings_per_container as string) || 1

    const nutrients = ((data as Record<string, unknown>).nutrients as { name: string; quantity_per_serving: string }[]) || []

    const find = (searchTerms: string[]) => {
      const n = nutrients.find((n) => {
        if (!n || !n.name) return false
        const targetName = n.name.toLowerCase().trim()
        return searchTerms.some(term => targetName.includes(term.toLowerCase()))
      })
      return n ? parseFloat(n.quantity_per_serving) || 0 : 0
    }

    protein = find(['protein'])
    calories = find(['energy', 'calories'])
    carbs = find(['carbohydrate', 'carbs'])
    fat = find(['fat, total', 'total fat', 'fat'])
    creatine = find(['creatine'])

  } catch (error) {
    console.error("Error parsing product ID:", product.id, error)
  }

  const price = parseFloat(product.price as string) || 0
  const category = detectCategory(product.productUrl)

  // Compute primary metric based on category
  let primaryMetricLabel = ''
  let primaryMetricValue = 0

  if (category === 'Protein Powder') {
    const total = protein * servingsPerContainer
    primaryMetricLabel = '₹/g protein'
    primaryMetricValue = total > 0 ? price / total : 0
  } else if (category === 'Mass Gainer') {
    const totalCals = calories * servingsPerContainer
    primaryMetricLabel = '₹/100 kcal'
    primaryMetricValue = totalCals > 0 ? (price / totalCals) * 100 : 0
  } else if (category === 'Creatine') {
    const totalCreatine = creatine > 0 ? creatine * servingsPerContainer : servingsPerContainer * 3 // fallback 3g/serving
    primaryMetricLabel = '₹/g creatine'
    primaryMetricValue = totalCreatine > 0 ? price / totalCreatine : 0
  } else if (category === 'BCAA / EAA') {
    const totalAmino = protein * servingsPerContainer
    primaryMetricLabel = '₹/g amino'
    primaryMetricValue = totalAmino > 0 ? price / totalAmino : price / servingsPerContainer
  } else {
    primaryMetricLabel = '₹/serving'
    primaryMetricValue = servingsPerContainer > 0 ? price / servingsPerContainer : 0
  }

  // Also compute pricePerProtein for backward compat (used in scatter)
  const totalProtein = protein * servingsPerContainer
  const pricePerProtein = totalProtein > 0 ? price / totalProtein : 0

  return {
    id: product.id,
    productUrl: product.productUrl,
    productImageUrl: product.productImageUrl,
    nutritionLabelImageUrl: product.nutritionLabelImageUrl,
    price,
    protein,
    calories,
    carbs,
    fat,
    creatine,
    servingSize,
    servingsPerContainer,
    category,
    primaryMetricLabel,
    primaryMetricValue,
   
    
    pricePerProtein,
  }
}