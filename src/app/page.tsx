'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine, Legend
} from 'recharts'
import type { ParsedProduct } from '@/lib/supabase'

const GOLD = '#C9A84C'
const DARK = '#0A0A0B'
const CARD_BG = '#111114'
const BORDER = '#1E1E24'
const TEXT_PRIMARY = '#F0EDE6'
const TEXT_MUTED = '#6B6872'
const GREEN = '#4CAF82'
const RED = '#E05A5A'

// Custom scatter dot
const ScatterDot = (props: { cx?: number; cy?: number; payload?: ParsedProduct; medianPPP?: number }) => {
  const { cx = 0, cy = 0, payload, medianPPP = 0 } = props
  const isGood = payload && payload.pricePerProtein < medianPPP
  return (
    <circle
      cx={cx} cy={cy} r={5}
      fill={isGood ? GREEN : GOLD}
      fillOpacity={0.85}
      stroke={isGood ? GREEN : GOLD}
      strokeWidth={1}
      style={{ cursor: 'pointer' }}
    />
  )
}

const CustomScatterTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ParsedProduct }[] }) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${BORDER}`,
      borderRadius: 8, padding: '12px 16px', fontSize: 13,
      color: TEXT_PRIMARY, boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: GOLD }}>Product #{p.id}</div>
      <div>Price: <b>₹{p.price.toLocaleString()}</b></div>
      <div>Protein/serving: <b>{p.protein}g</b></div>
      <div>Servings: <b>{p.servingsPerContainer}</b></div>
      <div>₹/g protein: <b>{p.pricePerProtein.toFixed(2)}</b></div>
    </div>
  )
}

const CustomBarTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${BORDER}`,
      borderRadius: 8, padding: '10px 14px', fontSize: 13, color: TEXT_PRIMARY
    }}>
      <div style={{ color: TEXT_MUTED, marginBottom: 4 }}>Price Range</div>
      <div style={{ fontWeight: 700 }}>₹{label}</div>
      <div>{payload[0].value} products</div>
    </div>
  )
}

function buildHistogram(products: ParsedProduct[], bucketSize = 500) {
  if (!products.length) return []
  const max = Math.max(...products.map(p => p.price))
  const min = Math.min(...products.map(p => p.price))
  const buckets: { label: string; count: number; start: number }[] = []
  for (let start = Math.floor(min / bucketSize) * bucketSize; start <= max; start += bucketSize) {
    const end = start + bucketSize
    buckets.push({
      label: `${start}–${end}`,
      start,
      count: products.filter(p => p.price >= start && p.price < end).length
    })
  }
  return buckets.filter(b => b.count > 0)
}

function ProductCard({ product, rank }: { product: ParsedProduct; rank: number }) {
  const [showLabel, setShowLabel] = useState(false)

  const getRankBadge = () => {
    if (rank === 1) return { label: '🥇 Best Value', color: GOLD }
    if (rank === 2) return { label: '🥈 2nd Best', color: '#A8A8B3' }
    if (rank === 3) return { label: '🥉 3rd Best', color: '#C97D4E' }
    return null
  }
  const badge = getRankBadge()

  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${BORDER}`,
      borderRadius: 12, overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
      position: 'relative',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px ${GOLD}40`
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
      }}
    >
      {badge && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 2,
          background: badge.color, color: '#000', fontSize: 11,
          fontWeight: 800, padding: '3px 8px', borderRadius: 6,
          letterSpacing: '0.03em'
        }}>{badge.label}</div>
      )}

      <div style={{ position: 'relative', height: 200, background: '#0D0D10', cursor: 'pointer' }}
        onClick={() => setShowLabel(!showLabel)}>
        {showLabel && product.nutritionLabelImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.nutritionLabelImageUrl} alt="Nutrition Label"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.productImageUrl} alt="Product"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        )}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.7)', color: TEXT_MUTED,
          fontSize: 10, padding: '2px 6px', borderRadius: 4,
          backdropFilter: 'blur(4px)'
        }}>
          {showLabel ? 'Click: product' : 'Click: nutrition label'}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: TEXT_PRIMARY, fontFamily: 'Georgia, serif' }}>
            ₹{product.price.toLocaleString()}
          </div>
          <div style={{
            background: '#1A1A20', borderRadius: 8, padding: '4px 10px',
            fontSize: 12, color: GOLD, fontWeight: 700
          }}>
            ₹{product.pricePerProtein.toFixed(2)}/g protein
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Protein', value: `${product.protein}g`, highlight: true },
            { label: 'Calories', value: `${product.calories} kcal`, highlight: false },
            { label: 'Carbs', value: `${product.carbs}g`, highlight: false },
            { label: 'Fat', value: `${product.fat}g`, highlight: false },
          ].map(item => (
            <div key={item.label} style={{
              background: item.highlight ? '#1A2419' : '#13131A',
              borderRadius: 6, padding: '8px 10px',
              border: item.highlight ? `1px solid ${GREEN}30` : `1px solid ${BORDER}`
            }}>
              <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: item.highlight ? GREEN : TEXT_PRIMARY }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 10 }}>
          {product.servingSize} · {product.servingsPerContainer} servings
        </div>

        <a href={product.productUrl} target="_blank" rel="noopener noreferrer"
          style={{
            display: 'block', textAlign: 'center',
            background: 'transparent', border: `1px solid ${GOLD}60`,
            color: GOLD, padding: '8px', borderRadius: 8,
            fontSize: 12, fontWeight: 700, textDecoration: 'none',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = `${GOLD}15`)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          View Product →
        </a>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [products, setProducts] = useState<ParsedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'price' | 'protein' | 'value'>('value')
  const [maxPrice, setMaxPrice] = useState(10000)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setProducts(data)
        const max = Math.max(...data.map((p: ParsedProduct) => p.price))
        setMaxPrice(max)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    if (!products.length) return null
    const prices = products.map(p => p.price)
    const ppp = products.map(p => p.pricePerProtein).filter(v => v > 0)
    return {
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPPP: ppp.reduce((a, b) => a + b, 0) / ppp.length,
      medianPPP: ppp.sort((a, b) => a - b)[Math.floor(ppp.length / 2)],
      total: products.length,
    }
  }, [products])

  const filtered = useMemo(() => {
    let list = [...products]
    if (search) list = list.filter(p => p.id.toString().includes(search))
    return list.sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price
      if (sortBy === 'protein') return b.protein - a.protein
      return a.pricePerProtein - b.pricePerProtein
    })
  }, [products, search, sortBy])

  const histogram = useMemo(() => buildHistogram(products), [products])

  const scatterData = useMemo(() => products.filter(p => p.protein > 0), [products])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: TEXT_MUTED }}>
        <div style={{ fontSize: 40, marginBottom: 16, animation: 'spin 1s linear infinite' }}>⟳</div>
        <div style={{ fontSize: 16 }}>Loading dashboard…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', color: RED }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Connection Error</div>
        <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 8 }}>{error}</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: DARK, color: TEXT_PRIMARY, fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{
        borderBottom: `1px solid ${BORDER}`,
        padding: '24px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: `${CARD_BG}CC`, backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, ${GOLD}, #8B6914)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16
            }}>💪</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}>
              ON Nutrition <span style={{ color: GOLD }}>Price Intelligence</span>
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: TEXT_MUTED }}>
            Scraped {stats?.total ?? 0} Optimum Nutrition products · Find your best ₹/protein ratio
          </p>
        </div>
        <div style={{ fontSize: 12, color: TEXT_MUTED, textAlign: 'right' }}>
          <div style={{ color: GREEN, fontWeight: 700, fontSize: 14 }}>● Live</div>
          <div>Supabase + Next.js</div>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>

        {/* Stats Bar */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
            {[
              { label: 'Products Scraped', value: stats.total.toString(), icon: '📦' },
              { label: 'Price Range', value: `₹${stats.minPrice.toLocaleString()} – ₹${stats.maxPrice.toLocaleString()}`, icon: '💰' },
              { label: 'Avg Price', value: `₹${Math.round(stats.avgPrice).toLocaleString()}`, icon: '📊' },
              { label: 'Best ₹/g Protein', value: `₹${Math.min(...products.filter(p=>p.pricePerProtein>0).map(p=>p.pricePerProtein)).toFixed(2)}`, icon: '🏆' },
              { label: 'Avg ₹/g Protein', value: `₹${stats.avgPPP.toFixed(2)}`, icon: '⚖️' },
            ].map(s => (
              <div key={s.label} style={{
                background: CARD_BG, border: `1px solid ${BORDER}`,
                borderRadius: 10, padding: '16px 20px'
              }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: TEXT_PRIMARY, fontFamily: 'Georgia, serif' }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>

          {/* Scatter Chart */}
          <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '24px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
              Price vs Protein Per Serving
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: TEXT_MUTED }}>
              <span style={{ color: GREEN }}>●</span> Below median value &nbsp;
              <span style={{ color: GOLD }}>●</span> Above median value
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="price" name="Price (₹)" stroke={TEXT_MUTED} tick={{ fontSize: 11 }}
                  label={{ value: 'Price (₹)', position: 'insideBottom', offset: -5, fill: TEXT_MUTED, fontSize: 11 }} />
                <YAxis dataKey="protein" name="Protein (g)" stroke={TEXT_MUTED} tick={{ fontSize: 11 }}
                  label={{ value: 'Protein/serving (g)', angle: -90, position: 'insideLeft', fill: TEXT_MUTED, fontSize: 11 }} />
                <Tooltip content={<CustomScatterTooltip />} />
                <Scatter
                  data={scatterData}
                  shape={(props: Record<string, unknown>) => (
                    <ScatterDot {...props as { cx?: number; cy?: number; payload?: ParsedProduct }} medianPPP={stats?.medianPPP ?? 0} />
                  )}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Histogram */}
          <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '24px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
              Price Distribution
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: TEXT_MUTED }}>
              Number of products by price bracket
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={histogram}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="label" stroke={TEXT_MUTED} tick={{ fontSize: 10 }} />
                <YAxis stroke={TEXT_MUTED} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {histogram.map((entry, idx) => (
                    <Cell key={idx} fill={idx % 2 === 0 ? GOLD : `${GOLD}88`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Price per Protein Bar */}
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '24px', marginBottom: 32 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, fontFamily: 'Georgia, serif' }}>
            ₹ per Gram of Protein — Best to Worst Value
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 12, color: TEXT_MUTED }}>
            Lower = better value. Products with valid protein data only.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={[...products].filter(p => p.pricePerProtein > 0)
                .sort((a, b) => a.pricePerProtein - b.pricePerProtein)
                .slice(0, 30)
                .map((p, i) => ({ name: `#${p.id}`, value: parseFloat(p.pricePerProtein.toFixed(2)), rank: i }))}
              layout="vertical"
              margin={{ left: 40, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis type="number" stroke={TEXT_MUTED} tick={{ fontSize: 10 }}
                label={{ value: '₹/g protein', position: 'insideBottom', offset: -4, fill: TEXT_MUTED, fontSize: 11 }} />
              <YAxis type="category" dataKey="name" stroke={TEXT_MUTED} tick={{ fontSize: 10 }} width={40} />
              <Tooltip
                formatter={(v: number) => [`₹${v}`, '₹/g protein']}
                contentStyle={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT_PRIMARY }}
              />
              {stats && <ReferenceLine x={stats.medianPPP} stroke={RED} strokeDasharray="4 2"
                label={{ value: 'Median', fill: RED, fontSize: 10 }} />}
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {[...Array(30)].map((_, i) => (
                  <Cell key={i} fill={i < 5 ? GREEN : i < 15 ? GOLD : `${GOLD}55`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Product Grid */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, serif', flex: 1 }}>
              All Products
            </h2>
            <input
              placeholder="Search by ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: CARD_BG, border: `1px solid ${BORDER}`,
                borderRadius: 8, padding: '8px 14px', color: TEXT_PRIMARY,
                fontSize: 13, width: 160, outline: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              {(['value', 'price', 'protein'] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: `1px solid ${sortBy === s ? GOLD : BORDER}`,
                    background: sortBy === s ? `${GOLD}20` : 'transparent',
                    color: sortBy === s ? GOLD : TEXT_MUTED,
                    cursor: 'pointer', textTransform: 'capitalize', textTransform: 'capitalize' as 'capitalize'
                  }}>
                  Sort: {s === 'value' ? '₹/protein ↑' : s === 'price' ? 'Price ↑' : 'Protein ↓'}
                </button>
              ))}
            </div>
            <div style={{ color: TEXT_MUTED, fontSize: 13 }}>{filtered.length} products</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {filtered.map((product, idx) => (
              <ProductCard key={product.id} product={product} rank={idx + 1} />
            ))}
          </div>
        </div>

        <footer style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: 12, paddingTop: 32, borderTop: `1px solid ${BORDER}` }}>
          Built with Next.js, Supabase & Recharts · Data scraped from optimumnutrition.co.in
        </footer>
      </main>
    </div>
  )
}
