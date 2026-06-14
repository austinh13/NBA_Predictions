import React, { useState, useEffect, useRef } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

const CHART_CONFIGS = [
  {
    id: 'ppg',
    title: 'Points vs Minutes',
    subtitle: 'PPG / MPG Correlation',
    xKey: 'mp_per_game',
    yKey: 'pts_per_game',
    xLabel: 'MPG',
    yLabel: 'PPG',
    xDomain: [28.5, 35],
    yDomain: [6.5, 38],
    delay: 0,
  },
  {
    id: 'apg',
    title: 'Assists vs Minutes',
    subtitle: 'APG / MPG Correlation',
    xKey: 'mp_per_game',
    yKey: 'ast_per_game',
    xLabel: 'MPG',
    yLabel: 'APG',
    xDomain: [28.5, 35],
    yDomain: [1, 14],
    delay: 0.1,
  },
  {
    id: 'rpg',
    title: 'Rebounds vs Minutes',
    subtitle: 'RPG / MPG Correlation',
    xKey: 'mp_per_game',
    yKey: 'trb_per_game',
    xLabel: 'MPG',
    yLabel: 'RPG',
    xDomain: [28.5, 35],
    yDomain: [2, 15],
    delay: 0.2,
  },
  {
    id: 'fgm',
    title: 'FG Made vs Minutes',
    subtitle: 'FGM / MPG Correlation',
    xKey: 'mp_per_game',
    yKey: 'fg_per_game',
    xLabel: 'MPG',
    yLabel: 'FGM',
    xDomain: [28.5, 35],
    yDomain: [2, 15],
    delay: 0.3,
  },
]

const ALL_NBA_COLOR  = '#F4813F'
const REGULAR_COLOR  = '#3B82F6'
const GRID_COLOR     = 'rgba(255,255,255,0.04)'
const AXIS_COLOR     = 'rgba(255,255,255,0.25)'

// Custom dot renderer
function CustomDot(props) {
  const { cx, cy, payload } = props
  const isAllNBA = payload.type === 1
  const color = isAllNBA ? ALL_NBA_COLOR : REGULAR_COLOR
  const r = isAllNBA ? 4 : 2.5

  return (
    <circle
      cx={cx} cy={cy} r={r}
      fill={color}
      fillOpacity={isAllNBA ? 0.9 : 0.45}
      stroke={isAllNBA ? color : 'none'}
      strokeWidth={isAllNBA ? 1 : 0}
      strokeOpacity={0.3}
    />
  )
}

// Custom tooltip
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null

  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border-2)',
      borderRadius: 'var(--radius)',
      padding: '8px 12px',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-1)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{ color: d.type === 1 ? ALL_NBA_COLOR : REGULAR_COLOR, fontWeight: 600, marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {d.type === 1 ? 'All-NBA' : 'Standard'}
      </div>
      {Object.entries(d).filter(([k]) => k !== 'type').map(([k, v]) => (
        <div key={k} style={{ color: 'var(--text-2)' }}>
          {k}: <span style={{ color: 'var(--text-1)' }}>{typeof v === 'number' ? v.toFixed(1) : v}</span>
        </div>
      ))}
    </div>
  )
}

function ChartCard({ config, data }) {
  return (
    <div
      className="chart-card"
      style={{ animationDelay: `${config.delay}s`, minHeight: 280 }}
    >
      {/* Header */}
      <div className="chart-title">{config.title}</div>
      <div className="chart-subtitle">
        {config.subtitle}
        <span className="chart-legend">
          <span className="chart-legend-dot" style={{ background: ALL_NBA_COLOR }} />
          All-NBA
        </span>
        <span className="chart-legend">
          <span className="chart-legend-dot" style={{ background: REGULAR_COLOR }} />
          Standard
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 8, right: 8, bottom: 32, left: 24 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeDasharray="0" />
          <XAxis
            type="number"
            dataKey={config.xKey}
            name={config.xLabel}
            domain={config.xDomain}
            stroke={AXIS_COLOR}
            tick={{ fill: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em' }}
            tickLine={false}
            axisLine={{ stroke: AXIS_COLOR }}
            label={{ value: config.xLabel, position: 'insideBottom', offset: -16, fill: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em' }}
          />
          <YAxis
            type="number"
            dataKey={config.yKey}
            name={config.yLabel}
            domain={config.yDomain}
            stroke={AXIS_COLOR}
            tick={{ fill: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em' }}
            tickLine={false}
            axisLine={{ stroke: AXIS_COLOR }}
            label={{ value: config.yLabel, angle: -90, position: 'insideLeft', offset: -4, dx: -6, fill: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em' }}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeDasharray: '4 3' }} />
          <Scatter data={data} shape={<CustomDot />} />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Data count badge */}
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.1em',
          color: 'var(--text-3)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 3,
          padding: '3px 7px',
        }}>
          {data.length} pts
        </span>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="charts-grid">
      {[0, 1, 2, 3].map(i => (
        <div className="chart-card" key={i} style={{ minHeight: 280, animationDelay: `${i * 0.08}s` }}>
          <div className="skeleton" style={{ height: 16, width: '45%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 10, width: '65%', marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 200 }} />
        </div>
      ))}
    </div>
  )
}

export default function DataViz() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Summary stats
  const allNBA   = data.filter(d => d.type === 1)
  const standard = data.filter(d => d.type !== 1)
  const avgPPG_allnba   = allNBA.length   ? (allNBA.reduce((s, d) => s + (d.pts_per_game || 0), 0) / allNBA.length).toFixed(1) : '—'
  const avgPPG_standard = standard.length ? (standard.reduce((s, d) => s + (d.pts_per_game || 0), 0) / standard.length).toFixed(1) : '—'

  useEffect(() => {
    fetch('/nba_data.json')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load data.'); setLoading(false) })
  }, [])

  return (
    <div className="charts-page">
      {/* HERO */}
      <div className="hero" style={{ padding: '40px 0 36px', borderBottom: '1px solid var(--border)', marginBottom: 32, animation: 'slide-up 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
        <div>
          <div className="hero-eyebrow">Scatter Analysis</div>
          <h1 className="hero-title" style={{ fontSize: 'clamp(32px, 4vw, 56px)' }}>
            Player <em>Data</em> Viz
          </h1>
          <p className="hero-sub">
            1,000 players plotted across 4 statistical dimensions. Orange = All-NBA selection. Blue = standard.
          </p>
        </div>
        {!loading && data.length > 0 && (
          <div className="hero-stats">
            {[
              { value: data.length, label: 'Players' },
              { value: allNBA.length, label: 'All-NBA' },
              { value: avgPPG_allnba, label: 'Avg PPG (All-NBA)' },
            ].map(s => (
              <div className="hero-stat" key={s.label}>
                <div className="hero-stat-value">{s.value}</div>
                <div className="hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONTENT */}
      {loading && (
        <>
          <div className="loading-container" style={{ minHeight: 120, marginBottom: 24 }}>
            <div style={{ position: 'relative', width: 48, height: 48 }}>
              <div style={{
                position: 'absolute', inset: 0,
                border: '2px solid var(--border-2)',
                borderTopColor: 'var(--orange)',
                borderRadius: '50%',
                animation: 'spin-slow 0.8s linear infinite',
              }} />
            </div>
            <div className="loading-title">Loading player data...</div>
          </div>
          <LoadingSkeleton />
        </>
      )}

      {error && (
        <div style={{ padding: '24px', background: 'rgba(232,64,90,0.08)', border: '1px solid rgba(232,64,90,0.25)', borderRadius: 'var(--radius-lg)', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          ⚠ {error}
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="charts-grid">
          {CHART_CONFIGS.map(cfg => (
            <ChartCard key={cfg.id} config={cfg} data={data} />
          ))}
        </div>
      )}

      {/* LEGEND FOOTER */}
      {!loading && data.length > 0 && (
        <div style={{
          marginTop: 28,
          display: 'flex',
          gap: 32,
          alignItems: 'center',
          padding: '16px 0',
          borderTop: '1px solid var(--border)',
        }}>
          {[
            { color: ALL_NBA_COLOR, label: 'All-NBA Selection', count: allNBA.length },
            { color: REGULAR_COLOR, label: 'Standard Player',   count: standard.length },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-2)', textTransform: 'uppercase' }}>
                {item.label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>({item.count})</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em' }}>
            X-AXIS: MPG · SHARED ACROSS ALL CHARTS
          </div>
        </div>
      )}
    </div>
  )
}
