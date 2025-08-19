import { useState } from 'react'
import VisualData from './pages/VisualData'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
        <VisualData></VisualData>
    </>
  )
}

export default App
