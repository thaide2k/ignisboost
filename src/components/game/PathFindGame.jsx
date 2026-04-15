import { useState, useEffect, useRef, useCallback } from 'react'
import './PathFindGame.css'

function PathFindGame({ difficulty = 1, onComplete, iterations = 3 }) {
  const [gameState, setGameState] = useState('playing')
  const [currentIteration, setCurrentIteration] = useState(0)
  const [nodes, setNodes] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(100)
  const [gameType, setGameType] = useState('hotwire')
  
  const timerRef = useRef(null)
  const finishedRef = useRef(false)
  
  const generateNodes = useCallback(() => {
    const numNodes = Math.min(6, 3 + Math.floor(difficulty / 2))
    const generatedNodes = []
    const margin = 15
    const nodeSize = 30
    
    for (let i = 0; i < numNodes; i++) {
      let x, y, valid
      let attempts = 0
      
      do {
        valid = true
        x = margin + Math.random() * (100 - margin * 2 - nodeSize)
        y = margin + Math.random() * (100 - margin * 2 - nodeSize)
        
        for (const node of generatedNodes) {
          const dist = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2))
          if (dist < 12) {
            valid = false
            break
          }
        }
        attempts++
      } while (!valid && attempts < 50)
      
      generatedNodes.push({ id: i, x, y, selected: i === 0 })
    }
    
    const sorted = sortByNearestNeighbor(generatedNodes)
    sorted.forEach((node, i) => {
      node.correctOrder = i
    })
    
    return sorted
  }, [difficulty])
  
  const sortByNearestNeighbor = (points) => {
    if (points.length === 0) return []
    
    const sorted = [points[0]]
    const remaining = points.slice(1)
    
    while (remaining.length > 0) {
      const lastPoint = sorted[sorted.length - 1]
      let nearestIndex = 0
      let nearestDist = Infinity
      
      for (let i = 0; i < remaining.length; i++) {
        const dist = Math.sqrt(
          Math.pow(lastPoint.x - remaining[i].x, 2) + 
          Math.pow(lastPoint.y - remaining[i].y, 2)
        )
        if (dist < nearestDist) {
          nearestDist = dist
          nearestIndex = i
        }
      }
      
      sorted.push(remaining[nearestIndex])
      remaining.splice(nearestIndex, 1)
    }
    
    return sorted
  }
  
  useEffect(() => {
    const newNodes = generateNodes()
    setNodes(newNodes)
    setActiveIndex(0)
    setCurrentIteration(0)
    setTimeLeft(100)
    finishedRef.current = false
    
    const duration = Math.max(3000, 6000 - difficulty * 500)
    
    timerRef.current = setInterval(() => {
      if (finishedRef.current) return
      
      setTimeLeft(prev => {
        const newVal = prev - (100 / (duration / 50))
        if (newVal <= 0) {
          finishedRef.current = true
          setGameState('failed')
          setTimeout(() => onComplete(false), 600)
          return 0
        }
        return newVal
      })
    }, 50)
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [difficulty, generateNodes, onComplete])
  
  const handleNodeClick = (node) => {
    if (finishedRef.current || gameState !== 'playing') return
    
    if (node.correctOrder === activeIndex + 1) {
      const newActiveIndex = activeIndex + 1
      setActiveIndex(newActiveIndex)
      
      setNodes(prev => prev.map(n => ({
        ...n,
        selected: n.correctOrder === newActiveIndex + 1
      })))
      
      if (newActiveIndex >= nodes.length - 1) {
        finishedRef.current = true
        if (currentIteration + 1 >= iterations) {
          setGameState('success')
          setTimeout(() => onComplete(true), 600)
        } else {
          const nextIteration = currentIteration + 1
          setCurrentIteration(nextIteration)
          setActiveIndex(0)
          setTimeLeft(100)
          
          const newNodes = generateNodes()
          setNodes(newNodes)
          
          finishedRef.current = false
        }
      }
    } else {
      finishedRef.current = true
      setGameState('failed')
      setTimeout(() => onComplete(false), 600)
    }
  }
  
  return (
    <div className="minigame-overlay">
      <div className="minigame-container pathfind-container">
        <h2 className="minigame-title">Follow the Path</h2>
        <p className="minigame-instruction">
          Click nodes in order: start from the green node, find the closest one
        </p>
        
        <div className="pathfind-progress">
          <div 
            className="pathfind-progress-bar" 
            style={{ width: `${timeLeft}%` }}
          />
        </div>
        
        <div className="pathfind-iteration">
          Iteration: {currentIteration + 1}/{iterations}
        </div>
        
        <div className="pathfind-game-area">
          {nodes.map((node) => (
            <button
              key={node.id}
              className={`pathfind-node ${node.correctOrder === 0 ? 'root' : ''} ${node.selected ? 'active' : ''} ${node.correctOrder < activeIndex ? 'completed' : ''}`}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`
              }}
              onClick={() => handleNodeClick(node)}
            />
          ))}
          
          {nodes.length > 0 && (
            <svg className="pathfind-lines">
              {nodes.slice(0, activeIndex + 1).map((node, i) => {
                if (i === 0) return null
                const prev = nodes[i - 1]
                return (
                  <line
                    key={`line-${i}`}
                    x1={`${prev.x}%`}
                    y1={`${prev.y}%`}
                    x2={`${node.x}%`}
                    y2={`${node.y}%`}
                    className="pathfind-line"
                  />
                )
              })}
            </svg>
          )}
        </div>
        
        <div className="minigame-status">
          {gameState === 'success' && <span className="status-success">SUCCESS!</span>}
          {gameState === 'failed' && <span className="status-failed">FAILED!</span>}
        </div>
      </div>
    </div>
  )
}

export default PathFindGame
