import { useState } from 'react'
import VisualData from './pages/VisualData'
import AllNBA from './pages/AllNBA'
import "./styles/chartStyle.css"
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

function App() {

  return (

  <div className='content'>
    <AllNBA></AllNBA>
    <VisualData></VisualData>
  </div>

    
    
    
  )
}

export default App
