'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine,
} from 'recharts'
import type { ParsedProduct, Category } from '@/lib/supabase'

// ─── Design tokens (light, professional) ────────────────────────────────────
const C = {
  bg:          '#F7F8FA',
  surface:     '#FFFFFF',
  surfaceAlt:  '#F0F2F5',
  border:      '#E2E5EA',
  borderStrong:'#C8CDD6',
  text:        '#0D1117',
  textMuted:   '#6B7280',
  textLight:   '#9CA3AF',
  accent:      '#2563EB',
  accentLight: '#EFF6FF',
  accentMid:   '#BFDBFE',
  green:       '#059669',
  greenLight:  '#ECFDF5',
  red:         '#DC2626',
  amber:       '#D97706',
  amberLight:  '#FFFBEB',
}

const CATEGORIES: Category[] = [
  'Protein Powder', 'Mass Gainer', 'Creatine',
  'BCAA / EAA', 'Pre-Workout', 'Multivitamin',
  'Fish Oil', 'ZMA / Minerals', 'Other'
]

const CATEGORY_COLOR: Record<Category, string> = {
  'Protein Powder': C.accent,
  'Mass Gainer':    '#7C3AED',
  'Creatine':       C.green,
  'BCAA / EAA':     '#DB2777',
  'Pre-Workout':    C.red,
  'Multivitamin':   C.amber,
  'Fish Oil':       '#0891B2',
  'ZMA / Minerals': '#65A30D',
  'Other':          C.textMuted,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildHistogram(products: ParsedProduct[], bucketSize = 500) {
  if (!products.length) return []
  const max = Math.max(...products.map(p => p.price))
  const min = Math.min(...products.map(p => p.price))
  const buckets: { label: string; count: number }[] = []
  for (let start = Math.floor(min / bucketSize) * bucketSize; start <= max; start += bucketSize) {
    const count = products.filter(p => p.price >= start && p.price < start + bucketSize).length
    if (count > 0) buckets.push({ label: `₹${start / 1000}k`, count })
  }
  return buckets
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '20px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
    }}>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.textLight, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ─── Tooltip components ──────────────────────────────────────────────────────
const TooltipBox = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 10, padding: '12px 16px', fontSize: 13,
    color: C.text, boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
  }}>{children}</div>
)

const ScatterTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ParsedProduct }[] }) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <TooltipBox>
      <div style={{ fontWeight: 700, marginBottom: 6, color: C.accent }}>#{p.id} · {p.category}</div>
      <div style={{ color: C.textMuted }}>Price: <b style={{ color: C.text }}>₹{p.price.toLocaleString()}</b></div>
      <div style={{ color: C.textMuted }}>{p.primaryMetricLabel}: <b style={{ color: C.text }}>₹{p.primaryMetricValue.toFixed(2)}</b></div>
      <div style={{ color: C.textMuted }}>Servings: <b style={{ color: C.text }}>{p.servingsPerContainer}</b></div>
    </TooltipBox>
  )
}

const BarTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <TooltipBox>
      <div style={{ color: C.textMuted, marginBottom: 2 }}>Price bracket</div>
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div style={{ color: C.textMuted }}>{payload[0].value} products</div>
    </TooltipBox>
  )
}

// ─── Category-aware card fields ───────────────────────────────────────────────
function getCategoryFields(p: ParsedProduct) {
  switch (p.category) {
    case 'Protein Powder':
      return [
        { label: 'Protein/serving', value: `${p.protein}g`, highlight: true },
        { label: 'Calories', value: `${p.calories} kcal` },
        { label: 'Carbs', value: `${p.carbs}g` },
        { label: 'Fat', value: `${p.fat}g` },
      ]
    case 'Mass Gainer':
      return [
        { label: 'Calories/serving', value: `${p.calories} kcal`, highlight: true },
        { label: 'Carbs', value: `${p.carbs}g`, highlight: true },
        { label: 'Protein', value: `${p.protein}g` },
        { label: 'Fat', value: `${p.fat}g` },
      ]
    case 'Creatine':
      return [
        { label: 'Creatine/serving', value: p.creatine > 0 ? `${p.creatine}g` : '~3g (est.)', highlight: true },
        { label: 'Servings', value: `${p.servingsPerContainer}` },
        { label: 'Calories', value: `${p.calories} kcal` },
        { label: 'Carbs', value: `${p.carbs}g` },
      ]
    case 'BCAA / EAA':
      return [
        { label: 'Amino/serving', value: `${p.protein}g`, highlight: true },
        { label: 'Calories', value: `${p.calories} kcal` },
        { label: 'Carbs', value: `${p.carbs}g` },
        { label: 'Servings', value: `${p.servingsPerContainer}` },
      ]
    case 'Pre-Workout':
      return [
        { label: 'Servings', value: `${p.servingsPerContainer}`, highlight: true },
        { label: 'Calories', value: `${p.calories} kcal` },
        { label: 'Carbs', value: `${p.carbs}g` },
        { label: 'Protein', value: `${p.protein}g` },
      ]
    default:
      return [
        { label: 'Servings', value: `${p.servingsPerContainer}`, highlight: true },
        { label: 'Calories', value: `${p.calories} kcal` },
        { label: 'Carbs', value: `${p.carbs}g` },
        { label: 'Fat', value: `${p.fat}g` },
      ]
  }
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, rank }: { product: ParsedProduct; rank: number }) {
  const [showLabel, setShowLabel] = useState(false)
  const catColor = CATEGORY_COLOR[product.category]
  const fields = getCategoryFields(product)

  const badge = rank === 1 ? '🥇 Best Value' : rank === 2 ? '🥈 2nd' : rank === 3 ? '🥉 3rd' : null

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: 'hidden',
      transition: 'transform 0.15s, box-shadow 0.15s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
      }}
    >
      {/* Category strip */}
      <div style={{ height: 4, background: catColor }} />

      <div style={{ position: 'relative', height: 190, background: C.surfaceAlt, cursor: 'pointer' }}
        onClick={() => setShowLabel(!showLabel)}>
        {badge && (
          <div style={{
            position: 'absolute', top: 10, left: 10, zIndex: 2,
            background: C.text, color: '#fff', fontSize: 10,
            fontWeight: 700, padding: '3px 8px', borderRadius: 20,
          }}>{badge}</div>
        )}
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 2,
          background: catColor + '20', color: catColor,
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
          border: `1px solid ${catColor}40`
        }}>{product.category}</div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={showLabel && product.nutritionLabelImageUrl ? product.nutritionLabelImageUrl : product.productImageUrl}
          alt="Product"
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
        />
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.5)', color: '#fff',
          fontSize: 9, padding: '2px 6px', borderRadius: 4,
        }}>
          {showLabel ? 'Show product' : 'Show label'}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Price + metric */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
            ₹{product.price.toLocaleString()}
          </div>
          <div style={{
            background: C.accentLight, borderRadius: 8, padding: '4px 10px',
            fontSize: 12, color: C.accent, fontWeight: 700,
            border: `1px solid ${C.accentMid}`
          }}>
            ₹{product.primaryMetricValue.toFixed(2)} {product.primaryMetricLabel.replace('₹/', '')}
          </div>
        </div>

        {/* Fields grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
          {fields.map(f => (
            <div key={f.label} style={{
              background: f.highlight ? C.accentLight : C.surfaceAlt,
              borderRadius: 8, padding: '8px 10px',
              border: `1px solid ${f.highlight ? C.accentMid : C.border}`
            }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{f.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: f.highlight ? C.accent : C.text }}>{f.value}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: C.textLight, marginBottom: 12 }}>
          {product.servingSize} · {product.servingsPerContainer} servings
        </div>

        <a href={product.productUrl} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'block', textAlign: 'center',
            background: C.text, color: '#fff',
            padding: '9px', borderRadius: 8,
            fontSize: 12, fontWeight: 700, textDecoration: 'none',
            letterSpacing: '0.04em',
            transition: 'opacity 0.15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          View Product →
        </a>
      </div>
    </div>
  )
}

// ─── Value comparison chart (category-aware) ──────────────────────────────────
function ValueChart({ products, category }: { products: ParsedProduct[]; category: Category | 'All' }) {
  const data = useMemo(() => {
    const list = (category === 'All' ? products : products.filter(p => p.category === category))
      .filter(p => p.primaryMetricValue > 0)
      .sort((a, b) => a.primaryMetricValue - b.primaryMetricValue)
      .slice(0, 20)
      .map((p, i) => ({ name: `#${p.id}`, value: parseFloat(p.primaryMetricValue.toFixed(2)), rank: i, cat: p.category }))
    return list
  }, [products, category])

  const label = data[0] ? products.find(p => `#${p.id}` === data[0]?.name)?.primaryMetricLabel ?? '₹/serving' : '₹/serving'
  const catColor = category !== 'All' ? CATEGORY_COLOR[category] : C.accent

  if (!data.length) return null

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 26)}>
      <BarChart data={data} layout="vertical" margin={{ left: 40, right: 30, top: 4, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
        <XAxis type="number" stroke={C.textMuted} tick={{ fontSize: 10 }}
          label={{ value: label, position: 'insideBottom', offset: -12, fill: C.textMuted, fontSize: 11 }} />
        <YAxis type="category" dataKey="name" stroke={C.textMuted} tick={{ fontSize: 10 }} width={38} />
        <Tooltip
          formatter={(v: number) => [`₹${v}`, label]}
          contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13 }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? C.green : i < 5 ? catColor : catColor + '88'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [products, setProducts] = useState<ParsedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState<Category | 'All'>('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'price' | 'value'>('value')

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setProducts(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const categoryProducts = useMemo(() =>
    category === 'All' ? products : products.filter(p => p.category === category),
    [products, category]
  )

  const stats = useMemo(() => {
    if (!categoryProducts.length) return null
    const prices = categoryProducts.map(p => p.price)
    const metrics = categoryProducts.map(p => p.primaryMetricValue).filter(v => v > 0)
    const sorted = [...metrics].sort((a, b) => a - b)
    return {
      total: categoryProducts.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      bestMetric: sorted[0] ?? 0,
      avgMetric: metrics.reduce((a, b) => a + b, 0) / (metrics.length || 1),
      metricLabel: categoryProducts[0]?.primaryMetricLabel ?? '₹/serving',
    }
  }, [categoryProducts])

  const filtered = useMemo(() => {
    let list = [...categoryProducts]
    if (search) list = list.filter(p =>
      p.id.toString().includes(search) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    )
    return list
      .filter(p => p.primaryMetricValue > 0)
      .sort((a, b) =>
        sortBy === 'price' ? a.price - b.price : a.primaryMetricValue - b.primaryMetricValue
      )
  }, [categoryProducts, search, sortBy])

  const histogram = useMemo(() => buildHistogram(categoryProducts), [categoryProducts])

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<Category | 'All', number>> = { All: products.length }
    CATEGORIES.forEach(c => {
      counts[c] = products.filter(p => p.category === c).length
    })
    return counts
  }, [products])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: C.textMuted }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
        <div style={{ fontSize: 15, fontWeight: 500 }}>Loading…</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚠</div>
        <div style={{ fontWeight: 700 }}>Error: {error}</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Header */}
      <header style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: C.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#fff'
          }}>💪</div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
            ON Nutrition <span style={{ color: C.accent }}>Intelligence</span>
          </span>
          <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 4 }}>
            · {products.length} products scraped
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green }} />
          <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>Live · Supabase</span>
        </div>
      </header>

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '28px 24px' }}>

        {/* Category filter */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 10 }}>
            Filter by Category
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['All', ...CATEGORIES] as (Category | 'All')[]).map(cat => {
              const active = category === cat
              const color = cat === 'All' ? C.accent : CATEGORY_COLOR[cat as Category]
              const count = categoryCounts[cat] ?? 0
              if (count === 0 && cat !== 'All') return null
              return (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${active ? color : C.border}`,
                    background: active ? color : C.surface,
                    color: active ? '#fff' : C.textMuted,
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: active ? `0 2px 8px ${color}40` : 'none'
                  }}>
                  {cat} <span style={{ opacity: 0.7, fontSize: 11 }}>({count})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard label="Products" value={stats.total.toString()} />
            <StatCard label="Price Range" value={`₹${stats.minPrice.toLocaleString()}`} sub={`up to ₹${stats.maxPrice.toLocaleString()}`} />
            <StatCard label="Avg Price" value={`₹${Math.round(stats.avgPrice).toLocaleString()}`} />
            <StatCard label={`Best ${stats.metricLabel}`} value={`₹${stats.bestMetric.toFixed(2)}`} />
            <StatCard label={`Avg ${stats.metricLabel}`} value={`₹${stats.avgMetric.toFixed(2)}`} />
          </div>
        )}

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

          {/* Value chart */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '22px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
              {category === 'All' ? 'Best Value Across All Categories' : `Best Value — ${category}`}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
              Top 20 by {stats?.metricLabel ?? '₹/serving'} · Lower is better
            </div>
            <ValueChart products={products} category={category} />
          </div>

          {/* Price distribution */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '22px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Price Distribution</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>Products per price bracket</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={histogram}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="label" stroke={C.textMuted} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.textMuted} tick={{ fontSize: 11 }} />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill={C.accent}>
                  {histogram.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? C.accent : C.accentMid} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scatter — only for categories that have protein data */}
        {(category === 'All' || category === 'Protein Powder' || category === 'Mass Gainer' || category === 'BCAA / EAA') && (
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '22px 24px', marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Price vs Protein Per Serving</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
              Scatter of price against protein content
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="price" name="Price (₹)" stroke={C.textMuted} tick={{ fontSize: 11 }}
                  label={{ value: 'Price (₹)', position: 'insideBottom', offset: -5, fill: C.textMuted, fontSize: 11 }} />
                <YAxis dataKey="protein" name="Protein (g)" stroke={C.textMuted} tick={{ fontSize: 11 }}
                  label={{ value: 'Protein/serving (g)', angle: -90, position: 'insideLeft', fill: C.textMuted, fontSize: 11 }} />
                <Tooltip content={<ScatterTooltip />} />
                <Scatter
                  data={categoryProducts.filter(p => p.protein > 0)}
                  shape={(props: Record<string, unknown>) => {
                    const { cx = 0, cy = 0, payload } = props as { cx?: number; cy?: number; payload?: ParsedProduct }
                    const color = payload ? CATEGORY_COLOR[payload.category] : C.accent
                    return <circle cx={cx} cy={cy} r={5} fill={color} fillOpacity={0.8} stroke={color} strokeWidth={1} style={{ cursor: 'pointer' }} />
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Product grid */}
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, flex: 1, letterSpacing: '-0.01em' }}>
              {category === 'All' ? 'All Products' : category}
              <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 400, marginLeft: 8 }}>{filtered.length} products</span>
            </div>
            <input
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '8px 14px', color: C.text,
                fontSize: 13, width: 160, outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
            />
            {(['value', 'price'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${sortBy === s ? C.accent : C.border}`,
                  background: sortBy === s ? C.accentLight : C.surface,
                  color: sortBy === s ? C.accent : C.textMuted,
                  cursor: 'pointer',
                }}>
                {s === 'value' ? `Sort: Best Value` : 'Sort: Price ↑'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {filtered.map((product, idx) => (
              <ProductCard key={product.id} product={product} rank={idx + 1} />
            ))}
          </div>
        </div>

        <footer style={{
          textAlign: 'center', color: C.textLight, fontSize: 12,
          paddingTop: 32, marginTop: 32, borderTop: `1px solid ${C.border}`
        }}>
          Built with Next.js, Supabase & Recharts · Data scraped from optimumnutrition.co.in
        </footer>
      </main>
    </div>
  )
}