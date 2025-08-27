import { useState } from 'react'
import VisualData from './pages/VisualData'
import AllNBA from './pages/AllNBA'
import "./styles/chartStyle.css"
import { Analytics } from "@vercel/analytics";


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
