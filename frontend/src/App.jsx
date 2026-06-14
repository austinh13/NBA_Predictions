import React, { useState, useEffect, useRef } from 'react'
import Predictor from './pages/Predictor'
import DataViz from './pages/DataViz'
import './styles/global.css'

const TICKER_ITEMS = [
  { label: 'Model Accuracy', value: '98%' },
  { label: 'Training Records', value: '1,000+' },
  { label: 'Era Coverage', value: '1976–Now' },
  { label: 'Features Used', value: '6' },
  { label: 'All-NBA Teams', value: '3 / Year' },
  { label: 'Data Source', value: 'Basketball-Ref' },
  { label: 'Min Games Filter', value: '5 GP' },
  { label: 'Model Type', value: 'Logistic Reg.' },
]

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS] // duplicate for seamless loop
  return (
    <div className="ticker">
      <div className="ticker-inner">
        {items.map((item, i) => (
          <div className="ticker-item" key={i}>
            <span className="ticker-label">{item.label}</span>
            <span className="ticker-sep">///</span>
            <span className="ticker-value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BasketballIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="13" stroke="#F4813F" strokeWidth="1.5"/>
      <path d="M14 1C14 1 14 27 14 27" stroke="#F4813F" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M1 14H27" stroke="#F4813F" strokeWidth="1.2"/>
      <path d="M3 7.5C7 9.5 9.5 12 9.5 14C9.5 16 7 18.5 3 20.5" stroke="#F4813F" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <path d="M25 7.5C21 9.5 18.5 12 18.5 14C18.5 16 21 18.5 25 20.5" stroke="#F4813F" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    </svg>
  )
}

export default function App() {
  const [page, setPage] = useState('data')
  const [animating, setAnimating] = useState(false)
  const pageRef = useRef(null)

  // Fire a background warm-up ping to wake the Render server early,
  // so by the time the user navigates to Predictor it's likely awake.
  useEffect(() => {
    fetch('https://nba-predictions-uyk0.onrender.com/nba_predictions').catch(() => {})
  }, [])

  const navigate = (target) => {
    if (target === page) return
    setAnimating(true)
    setTimeout(() => {
      setPage(target)
      setAnimating(false)
    }, 180)
  }

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <div className="nav-brand">
          <BasketballIcon />
          <span>All-NBA <span style={{ color: 'var(--orange)' }}>ML</span></span>
          <div className="nav-brand-dot" />
        </div>
        <button
          className={`nav-tab ${page === 'predictor' ? 'active' : ''}`}
          onClick={() => navigate('predictor')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="5" width="3" height="8" rx="1" fill="currentColor" opacity="0.5"/>
            <rect x="5.5" y="2" width="3" height="11" rx="1" fill="currentColor" opacity="0.75"/>
            <rect x="10" y="0" width="3" height="13" rx="1" fill="currentColor"/>
          </svg>
          Predictor
        </button>
        <button
          className={`nav-tab ${page === 'data' ? 'active' : ''}`}
          onClick={() => navigate('data')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="3" cy="11" r="2" fill="currentColor" opacity="0.5"/>
            <circle cx="7" cy="5" r="2" fill="currentColor" opacity="0.75"/>
            <circle cx="11" cy="8" r="2" fill="currentColor"/>
            <path d="M3 11L7 5L11 8" stroke="currentColor" strokeWidth="1" strokeDasharray="2 1" opacity="0.4"/>
          </svg>
          Data Viz
        </button>
      </nav>

      {/* TICKER */}
      <div style={{ paddingTop: '56px' }}>
        <Ticker />
      </div>

      {/* PAGE */}
      <div
        ref={pageRef}
        style={{
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(8px)' : 'translateY(0)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}
      >
        {page === 'predictor' ? <Predictor /> : <DataViz />}
      </div>
    </>
  )
}
