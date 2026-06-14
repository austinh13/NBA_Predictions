import React, { useState, useEffect, useRef } from 'react'

// const dataLink = 'http://127.0.0.1:5000/predict_user_input'
const dataLink = 'https://nba-predictions-uyk0.onrender.com/predict_user_input'

const FIELDS = [
  { key: 'pts_per_game', label: 'Points',   tag: 'PPG',  placeholder: '27.2', min: 0, max: 45 },
  { key: 'trb_per_game', label: 'Rebounds', tag: 'RPG',  placeholder: '10.1', min: 0, max: 25 },
  { key: 'ast_per_game', label: 'Assists',  tag: 'APG',  placeholder: '6.1',  min: 0, max: 15 },
  { key: 'g',            label: 'Games',    tag: 'GP',   placeholder: '76',   min: 5, max: 82 },
  { key: 'mp_per_game',  label: 'Minutes',  tag: 'MPG',  placeholder: '34.1', min: 0, max: 48 },
  { key: 'fg_per_game',  label: 'FG Made',  tag: 'FGM',  placeholder: '10.1', min: 0, max: 20 },
]

// Animated count-up hook
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0)
  const frameRef = useRef()

  useEffect(() => {
    if (target === null) return
    const start = performance.now()
    const from = 0
    const to = target

    const tick = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(from + (to - from) * eased))
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return val
}

// Radial ring component
function RadialRing({ pct, positive }) {
  const r = 62
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference
  const color = positive ? '#F4813F' : '#E8405A'

  return (
    <div className="result-ring-wrap">
      <svg className="result-ring" width="160" height="160" viewBox="0 0 160 160">
        <circle className="result-ring-bg" cx="80" cy="80" r={r} />
        <circle
          className="result-ring-fill"
          cx="80" cy="80" r={r}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="result-ring-center">
        <span className="result-ring-pct" style={{ color }}>{pct}<small style={{ fontSize: 16 }}>%</small></span>
        <span className="result-ring-label">All-NBA<br/>Probability</span>
      </div>
    </div>
  )
}

function ResultPanel({ prediction, form }) {
  const pct = prediction !== null ? Math.round(prediction * 100) : null
  const positive = pct > 50
  const displayPct = useCountUp(pct)

  if (prediction === null) {
    return (
      <div className="result-empty">
        <div className="result-empty-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.25">
            <circle cx="32" cy="32" r="30" stroke="#F4813F" strokeWidth="2"/>
            <path d="M32 4C32 4 32 60 32 60" stroke="#F4813F" strokeWidth="1.5"/>
            <path d="M4 32H60" stroke="#F4813F" strokeWidth="1.5"/>
            <path d="M8 18C14 20 18 26 18 32C18 38 14 44 8 46" stroke="#F4813F" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M56 18C50 20 46 26 46 32C46 38 50 44 56 46" stroke="#F4813F" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="result-empty-text">Enter stats to<br/>run prediction</div>
      </div>
    )
  }

  const bars = [
    { label: 'PPG', value: Math.min((parseFloat(form.pts_per_game) || 0) / 40, 1), color: '#F4813F' },
    { label: 'RPG', value: Math.min((parseFloat(form.trb_per_game) || 0) / 20, 1), color: '#C8A84B' },
    { label: 'APG', value: Math.min((parseFloat(form.ast_per_game) || 0) / 14, 1), color: '#4FDFFF' },
    { label: 'MPG', value: Math.min((parseFloat(form.mp_per_game) || 0) / 48, 1), color: '#8B9EB5' },
  ]

  return (
    <div className="result-card">
      <div className="section-label">Analysis Output</div>

      <div className="result-verdict" style={{ color: positive ? 'var(--orange)' : 'var(--red)' }}>
        {positive ? 'All-NBA' : 'Not All-NBA'}
      </div>

      <RadialRing pct={displayPct} positive={positive} />

      <div className="result-bars">
        {bars.map(bar => (
          <div className="result-bar-row" key={bar.label}>
            <span className="result-bar-label">{bar.label}</span>
            <div className="result-bar-track">
              <div
                className="result-bar-fill"
                style={{
                  width: `${bar.value * 100}%`,
                  background: bar.color,
                  animationDelay: '0.3s',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="result-disclaimer">
        ⚡ Model trained on 1976–present data with ≥5 GP filter. Calibrated probabilities may skew low even for elite profiles. Accuracy: 98%.
      </div>
    </div>
  )
}

export default function Predictor() {
  const [form, setForm] = useState(
    Object.fromEntries(FIELDS.map(f => [f.key, '']))
  )
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }))
    if (submitted) setPrediction(null) // reset on edit
  }

  const handleSubmit = async () => {
    const features = FIELDS.map(f => parseFloat(form[f.key]))
    if (features.some(isNaN)) return

    setLoading(true)
    setError(null)
    setSubmitted(true)

    try {
      const res = await fetch(dataLink, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
      })
      const data = await res.json()
      setPrediction(data.prediction)
    } catch (err) {
      setError('API unreachable. Cold start may take 1–2 min.')
    } finally {
      setLoading(false)
    }
  }

  const allFilled = FIELDS.every(f => form[f.key].trim() !== '')

  return (
    <>
      {/* HERO */}
      <div className="hero" style={{ animation: 'slide-up 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>
        <div>
          <div className="hero-eyebrow">Logistic Regression Model</div>
          <h1 className="hero-title">
            All-NBA<br />
            <em>Predictor</em>
          </h1>
          <p className="hero-sub">
            Enter a player's per-game averages to predict their All-NBA likelihood. Model trained on 1,000+ players from the modern NBA era.
          </p>
        </div>
        <div className="hero-stats" style={{ gap: 24 }}>
          {[
            { value: '98%', label: 'Accuracy' },
            { value: '1K+', label: 'Records' },
            { value: '\'76–Now', label: 'Coverage' },
          ].map(s => (
            <div className="hero-stat" key={s.label}>
              <div className="hero-stat-value" style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800 }}>{s.value}</div>
              <div className="hero-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="predictor-layout">
        {/* FORM */}
        <div className="predictor-form-panel">
          <div className="section-label">Player Stats Input</div>

          <div className="input-grid">
            {FIELDS.map((field, i) => (
              <div className="input-field" key={field.key} style={{ animationDelay: `${i * 0.06}s`, animation: 'slide-up 0.4s ease both' }}>
                <label className="input-label" htmlFor={field.key}>{field.label}</label>
                <div className="input-wrap">
                  <input
                    id={field.key}
                    type="number"
                    step="0.1"
                    min={field.min}
                    max={field.max}
                    value={form[field.key]}
                    placeholder={field.placeholder}
                    onChange={e => handleChange(field.key, e.target.value)}
                  />
                  <span className="input-tag">{field.tag}</span>
                </div>
              </div>
            ))}
          </div>

          <button
            className={`submit-btn ${loading ? 'loading' : ''}`}
            onClick={handleSubmit}
            disabled={loading || !allFilled}
            style={{ opacity: allFilled ? 1 : 0.5 }}
          >
            {loading
              ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span className="loader-ring" />
                  Running Model...
                </span>
              : 'Run Prediction'}
          </button>

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(232,64,90,0.1)', border: '1px solid rgba(232,64,90,0.3)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--red)' }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* RESULT */}
        <div className="predictor-result-panel">
          <ResultPanel prediction={prediction} form={form} />
        </div>
      </div>

      {/* INFO BAR */}
      <div className="info-bar">
        <span className="info-bar-icon">ℹ</span>
        <p className="info-bar-text">
          <strong>How it works:</strong> Enter per-game season averages and submit. The model evaluates six features against historical All-NBA selections (1976–present). ESPN and Basketball-Reference carry full stat breakdowns for any player. <strong>Cold starts may take 1–2 min</strong> on the free-tier API.{' '}
          <a href="https://austinh.vercel.app/" target="_blank" rel="noreferrer">Demo video →</a>
        </p>
      </div>
    </>
  )
}
