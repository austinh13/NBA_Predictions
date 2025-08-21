import { useState } from 'react'
import VisualData from './pages/VisualData'
import AllNBA from './pages/AllNBA'
import "./styles/chartStyle.css"
function App() {
  const [count, setCount] = useState(0)

  return (
    <div className = "content">
        <VisualData></VisualData>
        <AllNBA></AllNBA>
    </div>
    
  )
}

export default App
