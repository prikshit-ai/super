import { NextResponse } from 'next/server'
import { supabase, parseProduct, type Product } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      "productUrl",
      "productImageUrl",
      "nutritionLabelImageUrl",
      "nutritionData",
      "createdAt",
      "updatedAt",
      price
    `)
    .order('price', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const parsed = (data as Product[]).map(parseProduct)
  return NextResponse.json(parsed)
}