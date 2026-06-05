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
  servingSize: string
  servingsPerContainer: number
  pricePerProtein: number
}

export function parseProduct(product: Product): ParsedProduct {
  let protein = 0
  let calories = 0
  let carbs = 0
  let fat = 0
  let servingSize = ''
  let servingsPerContainer = 1

  try {
    // Supabase returns JSONB columns already parsed — handle both cases
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

  } catch (error) {
    console.error("Error parsing product ID:", product.id, error)
  }

  const price = parseFloat(product.price as string) || 0
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
    servingSize,
    servingsPerContainer,
    pricePerProtein,
  }
}