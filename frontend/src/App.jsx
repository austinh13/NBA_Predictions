import { useState } from 'react'
import VisualData from './pages/VisualData'
import AllNBA from './pages/AllNBA'
import "./styles/chartStyle.css"
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Analytics } from "@vercel/analytics/next"

function App() {

  return (

  <div className='content'>
    <AllNBA></AllNBA>
    <VisualData></VisualData>
    <Analytics></Analytics>
  </div>

    
    
    
  )
}

export default App
