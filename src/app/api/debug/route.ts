import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('URL:', url)
  console.log('KEY:', key?.slice(0, 20))
  
  const supabase = createClient(url!, key!)
  
  const { data, error, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .limit(1)

  return NextResponse.json({ 
    url, 
    keyPrefix: key?.slice(0, 20),
    data, 
    error,
    count
  })
}