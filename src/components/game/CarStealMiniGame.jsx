import { useState, useEffect, useRef } from 'react'
import './CarStealMiniGame.css'

function CarStealMiniGame({ difficulty = 1, onComplete }) {
  const [gameState, setGameState] = useState('playing')
  const [barPosition, setBarPosition] = useState(50)
  const [targetZone] = useState(() => {
    const zoneWidth = Math.max(15, 30 - difficulty * 4)
    const zoneStart = 20 + Math.random() * (60 - zoneWidth)
    return { start: zoneStart, end: zoneStart + zoneWidth }
  })
  
  const positionRef = useRef(50)
  const directionRef = useRef(1)
  const intervalRef = useRef(null)
  const finishedRef = useRef(false)
  
  useEffect(() => {
    if (finishedRef.current) return
    
    const speed = 2 + difficulty * 0.5
    
    intervalRef.current = setInterval(() => {
      if (finishedRef.current) {
        clearInterval(intervalRef.current)
        return
      }
      
      let newPos = positionRef.current + speed * directionRef.current
      
      if (newPos >= 100) {
        directionRef.current = -1
        newPos = 100
      } else if (newPos <= 0) {
        directionRef.current = 1
        newPos = 0
      }
      
      positionRef.current = newPos
      setBarPosition(newPos)
    }, 16)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [difficulty])
  
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (finishedRef.current) return
      
      const key = e.key || e.code || ''
      
      if (key === ' ' || key === 'Space' || key === 'Enter' || e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        
        finishedRef.current = true
        const currentPos = positionRef.current
        const inZone = currentPos >= targetZone.start && currentPos <= targetZone.end
        
        console.log('Hotwire attempt:', currentPos, targetZone, inZone)
        
        if (inZone) {
          setGameState('success')
        } else {
          setGameState('failed')
        }
        
        setTimeout(() => onComplete(inZone), 600)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [targetZone, onComplete])
  
  return (
    <div className="minigame-overlay">
      <div className="minigame-container">
        <h2 className="minigame-title">Hotwire the Car</h2>
        <p className="minigame-instruction">
          Press SPACE when bar is in green zone
        </p>
        
        <div className="minigame-bar-container">
          <div className="minigame-target-zone" style={{
            left: `${targetZone.start}%`,
            width: `${targetZone.end - targetZone.start}%`
          }} />
          
          <div 
            className="minigame-indicator" 
            style={{ left: `${barPosition}%` }}
          />
        </div>
        
        <div className="minigame-status">
          {gameState === 'success' && <span className="status-success">SUCCESS!</span>}
          {gameState === 'failed' && <span className="status-failed">FAILED!</span>}
        </div>
      </div>
    </div>
  )
}

export default CarStealMiniGame