import { useState, useEffect, useRef, useCallback } from 'react'
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, generateMap, getTileColor, isWalkable, getBuildingVariant, getBuildingVariantColor, BUILDING_VARIANTS, loadSprites, getBuildingSprite, loadTiledMap } from '../../systems/mapSystem'
import { calculateRewards, isMissionExpired } from '../../systems/missionSystem'
import { getHeatColor, getPoliceBehavior } from '../../systems/heatSystem'
import { getCarEmoji } from '../../systems/carSprites'
import CarStealMiniGame from '../game/CarStealMiniGame'
import PathFindGame from '../game/PathFindGame'
import './Mission.css'

function Mission({ contract, onComplete, onExit }) {
  const carEmoji = getCarEmoji(contract.carType)
  const canvasRef = useRef(null)
  const minimapRef = useRef(null)
  const MINIMAP_SIZE = 150
  const [gameState, setGameState] = useState('playing')
  const [missionTime, setMissionTime] = useState(contract.timeLimit)
  const [heat, setHeat] = useState(0)
  const [phase, setPhase] = useState('steal')
  const [showMiniGame, setShowMiniGame] = useState(false)
  const [miniGameType, setMiniGameType] = useState('hotwire')
  const [map, setMap] = useState(null)

  useEffect(() => {
    const randomSeed = Math.floor(Math.random() * 10000)
    const newMap = generateMap(randomSeed)
    setMap(newMap)
    if (newMap.spawnPoints) {
      playerRef.current.x = newMap.spawnPoints.player.x * TILE_SIZE + TILE_SIZE / 2
      playerRef.current.y = newMap.spawnPoints.player.y * TILE_SIZE + TILE_SIZE / 2
      targetCarRef.current.x = newMap.spawnPoints.targetCar.x * TILE_SIZE + TILE_SIZE / 2
      targetCarRef.current.y = newMap.spawnPoints.targetCar.y * TILE_SIZE + TILE_SIZE / 2
      deliveryRef.current.x = newMap.spawnPoints.delivery.x * TILE_SIZE + TILE_SIZE / 2
      deliveryRef.current.y = newMap.spawnPoints.delivery.y * TILE_SIZE + TILE_SIZE / 2
    }
  }, [])
  const [sprites, setSprites] = useState(null)
  const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  
  const cameraRef = useRef({ x: 0, y: 0 })
  
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  useEffect(() => {
    console.log('[Mission] Loading sprites...')
    loadSprites().then((loaded) => {
      console.log('[Mission] Sprites loaded, buildings:', loaded.buildings?.naturalWidth)
      setSprites(loaded)
      
      if (loaded.buildings?.complete && loaded.buildings.naturalWidth > 0) {
        console.log('[Mission] SUCCESS: Sprites are ready!')
      } else {
        console.log('[Mission] ISSUE: Sprites not complete')
      }
    }).catch((e) => console.error('[Mission] Sprite error:', e))
  }, [])
  
  const playerRef = useRef({
    x: map?.spawnPoints?.player?.x ? map.spawnPoints.player.x * TILE_SIZE + TILE_SIZE / 2 : 0,
    y: map?.spawnPoints?.player?.y ? map.spawnPoints.player.y * TILE_SIZE + TILE_SIZE / 2 : 0,
    vx: 0,
    vy: 0,
    hasCar: false,
    speed: 4
  })
  
  const targetCarRef = useRef({
    x: map?.spawnPoints?.targetCar?.x ? map.spawnPoints.targetCar.x * TILE_SIZE + TILE_SIZE / 2 : 0,
    y: map?.spawnPoints?.targetCar?.y ? map.spawnPoints.targetCar.y * TILE_SIZE + TILE_SIZE / 2 : 0,
    exists: true
  })
  
  const deliveryRef = useRef({
    x: map?.spawnPoints?.delivery?.x ? map.spawnPoints.delivery.x * TILE_SIZE + TILE_SIZE / 2 : 0,
    y: map?.spawnPoints?.delivery?.y ? map.spawnPoints.delivery.y * TILE_SIZE + TILE_SIZE / 2 : 0
  })
  
  const policeRef = useRef([])
  const keysRef = useRef({})
  const animationRef = useRef(null)
  const lastPoliceSpawnRef = useRef(0)
  const lastHeartbeatRef = useRef(0)
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current[e.key.toLowerCase()] = true
      keysRef.current[e.key] = true
    }
    
    const handleKeyUp = (e) => {
      keysRef.current[e.key.toLowerCase()] = false
      keysRef.current[e.key] = false
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
  
  useEffect(() => {
    const timer = setInterval(() => {
      setMissionTime(prev => {
        if (prev <= 1) {
          setGameState('failed')
          onComplete({
            success: false,
            money: 0,
            xp: 0,
            reason: 'timeout'
          })
          return 0
        }
        return prev - 1
      })
      
      setHeat(prev => Math.min(prev + 0.1 * contract.difficulty, 5))
    }, 1000)
    
    return () => clearInterval(timer)
  }, [contract, onComplete])
  
  useEffect(() => {
    if (gameState !== 'playing') return
    if (!map) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    const gameLoop = () => {
      const now = Date.now()
      const player = playerRef.current
      const targetCar = targetCarRef.current
      const delivery = deliveryRef.current
      const police = policeRef.current
      
      const speed = player.hasCar ? 1 : 0.8
      
      let dx = 0
      let dy = 0
      
      if (keysRef.current['w'] || keysRef.current['arrowup']) dy = -speed
      if (keysRef.current['s'] || keysRef.current['arrowdown']) dy = speed
      if (keysRef.current['a'] || keysRef.current['arrowleft']) dx = -speed
      if (keysRef.current['d'] || keysRef.current['arrowright']) dx = speed
      
      const newX = player.x + dx
      const newY = player.y + dy
      
      if (isWalkable(newX, player.y, map)) {
        player.x = newX
      }
      if (isWalkable(player.x, newY, map)) {
        player.y = newY
      }
      
      if (!player.hasCar && targetCar.exists) {
        const distToCar = Math.sqrt(
          Math.pow(player.x - targetCar.x, 2) + 
          Math.pow(player.y - targetCar.y, 2)
        )
        
        if (distToCar < 40 && !showMiniGame) {
          console.log('Showing minigame! Type:', miniGameType)
          setMiniGameType('hotwire')
          setShowMiniGame(true)
        }
      }
      
      if (player.hasCar) {
        const distToDelivery = Math.sqrt(
          Math.pow(player.x - delivery.x, 2) + 
          Math.pow(player.y - delivery.y, 2)
        )
        
        if (distToDelivery < 50) {
          const timeRemaining = missionTime
          const rewards = calculateRewards(contract, heat, timeRemaining)
          
          setGameState('success')
          onComplete({
            success: true,
            ...rewards
          })
        }
      }
      
      if (heat > 1) {
        const now = Date.now()
        const spawnRate = Math.max(3000, 10000 - heat * 1500)
        
        if (now - lastPoliceSpawnRef.current > spawnRate && police.length < 1 + Math.floor(heat / 2)) {
          let spawnTileX = 0
          let spawnTileY = 0
          let found = false
          
          for (let attempts = 0; attempts < 100 && !found; attempts++) {
            const side = Math.random() > 0.5 ? 0 : map.width - 1
            spawnTileX = side === 0 ? Math.floor(Math.random() * 3) : map.width - 1 - Math.floor(Math.random() * 3)
            spawnTileY = Math.floor(Math.random() * map.height)
            
            if (spawnTileX >= 0 && spawnTileX < map.width && spawnTileY >= 0 && spawnTileY < map.height) {
              const tile = map.tiles[spawnTileY][spawnTileX]
              if (tile === 0 || tile === 2 || tile === 3) {
                found = true
              }
            }
          }
          
          if (found) {
            police.push({
              x: spawnTileX * 40 + 20,
              y: spawnTileY * 40 + 20,
              speed: 0.4 + heat * 0.06
            })
            
            lastPoliceSpawnRef.current = now
          }
        }
      }
      
      police.forEach((cop, index) => {
        const behavior = getPoliceBehavior(cop, player, heat, map)
        cop.x += behavior.vx
        cop.y += behavior.vy
        
        const distToPlayer = Math.sqrt(
          Math.pow(player.x - cop.x, 2) + 
          Math.pow(player.y - cop.y, 2)
        )
        
        if (distToPlayer < 30) {
          setGameState('busted')
          onComplete({
            success: false,
            money: 0,
            xp: 0,
            reason: 'busted'
          })
        }
      })
      
      if (player.hasCar) {
        const heartbeatInterval = Math.max(600, 2600 - heat * 400)
        if (now - lastHeartbeatRef.current > heartbeatInterval) {
          police.forEach(cop => {
            if (cop.state === 'PATROL') {
              cop.lastKnownX = player.x
              cop.lastKnownY = player.y
              cop.state = 'CHASE'
              cop.lastSawPlayer = now
            }
          })
          lastHeartbeatRef.current = now
        }
      }
      
      const mapWidth = MAP_WIDTH * TILE_SIZE
      const mapHeight = MAP_HEIGHT * TILE_SIZE
      
      const targetCamX = player.x - canvas.width / 2
      const targetCamY = player.y - canvas.height / 2
      
      cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1
      cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.1
      
      cameraRef.current.x = Math.max(0, Math.min(cameraRef.current.x, mapWidth - canvas.width))
      cameraRef.current.y = Math.max(0, Math.min(cameraRef.current.y, mapHeight - canvas.height))
      
      const cam = cameraRef.current
      
      ctx.fillStyle = '#0d0d0d'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      const startTileX = Math.floor(cam.x / TILE_SIZE)
      const startTileY = Math.floor(cam.y / TILE_SIZE)
      const endTileX = Math.ceil((cam.x + canvas.width) / TILE_SIZE)
      const endTileY = Math.ceil((cam.y + canvas.height) / TILE_SIZE)
      
      for (let y = startTileY; y <= endTileY; y++) {
        for (let x = startTileX; x <= endTileX; x++) {
          if (y < 0 || y >= MAP_HEIGHT || x < 0 || x >= MAP_WIDTH) continue
          
          const tileType = map.tiles[y][x]
          let tileColor = getTileColor(tileType)
          let drewSprite = false
          
          // Use building variant colors for buildings (tileType 1)
          if (tileType === 1 && map.buildingTypes && map.buildingTypes[y]) {
            const variant = map.buildingTypes[y][x]
            
            const hasSprites = sprites?.buildings?.complete && sprites.buildings.naturalWidth > 0
            
            if (variant && hasSprites) {
              drewSprite = getBuildingSprite(ctx, x, y, sprites, variant, cam.x, cam.y)
            } else if (variant) {
              const colors = getBuildingVariantColor(variant)
              tileColor = colors.primary
              
              // Draw windows
              const windowColor = colors.window || '#ffd700'
              const windowSize = 6
              const windowGap = 12
              const offsetX = (x * TILE_SIZE - cam.x) + 8
              const offsetY = (y * TILE_SIZE - cam.y) + 10
              
              ctx.fillStyle = windowColor
              for (let wy = 0; wy < 2; wy++) {
                for (let wx = 0; wx < 2; wx++) {
                  if (Math.random() > 0.3) {
                    ctx.globalAlpha = 0.7
                    ctx.fillRect(offsetX + wx * windowGap, offsetY + wy * windowGap, windowSize, windowSize)
                    ctx.globalAlpha = 1
                  }
                }
              }
              
              // Draw roof accent
              ctx.fillStyle = colors.roof || colors.accent
              ctx.fillRect(x * TILE_SIZE - cam.x, y * TILE_SIZE - cam.y, TILE_SIZE, 4)
            }
          }
          
          if (!drewSprite) {
            ctx.fillStyle = tileColor
            ctx.fillRect(x * TILE_SIZE - cam.x, y * TILE_SIZE - cam.y, TILE_SIZE, TILE_SIZE)
          }
          
          if (tileType === 0) {
            ctx.strokeStyle = '#333333'
            ctx.lineWidth = 1
            ctx.strokeRect(x * TILE_SIZE - cam.x, y * TILE_SIZE - cam.y, TILE_SIZE, TILE_SIZE)
          }
        }
      }
      
      if (!player.hasCar && targetCar.exists) {
        ctx.fillStyle = '#ff6b35'
        ctx.beginPath()
        ctx.arc(targetCar.x - cam.x, targetCar.y - cam.y, 15, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.fillStyle = '#0d0d0d'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(carEmoji, targetCar.x - cam.x, targetCar.y - cam.y + 4)
      }
      
      if (player.hasCar) {
        ctx.fillStyle = '#4ade80'
        ctx.beginPath()
        ctx.arc(delivery.x - cam.x, delivery.y - cam.y, 30, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.fillStyle = '#0d0d0d'
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('✓', delivery.x - cam.x, delivery.y - cam.y + 5)
      }
      
      police.forEach(cop => {
        ctx.fillStyle = '#3b82f6'
        ctx.beginPath()
        ctx.moveTo(cop.x - cam.x, cop.y - 12 - cam.y)
        ctx.lineTo(cop.x - cam.x + 10, cop.y - cam.y + 10)
        ctx.lineTo(cop.x - cam.x - 10, cop.y - cam.y + 10)
        ctx.closePath()
        ctx.fill()
        
        if (Math.random() > 0.5) {
          ctx.fillStyle = '#ff3b3b'
          ctx.beginPath()
          ctx.arc(cop.x - cam.x - 5, cop.y - cam.y - 3, 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(cop.x - cam.x + 5, cop.y - cam.y - 3, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      
      ctx.fillStyle = player.hasCar ? '#ff6b35' : '#4ade80'
      ctx.beginPath()
      ctx.arc(player.x - cam.x, player.y - cam.y, player.hasCar ? 18 : 12, 0, Math.PI * 2)
      ctx.fill()
      
      if (player.hasCar) {
        ctx.fillStyle = '#0d0d0d'
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(carEmoji, player.x - cam.x, player.y - cam.y + 5)
      } else {
        ctx.fillStyle = '#0d0d0d'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('👤', player.x - cam.x, player.y - cam.y + 4)
      }
      
      const minimapCanvas = minimapRef.current
      if (minimapCanvas) {
        const miniCtx = minimapCanvas.getContext('2d')
        const scale = MINIMAP_SIZE / (MAP_WIDTH * TILE_SIZE)
        
        miniCtx.fillStyle = '#1a1a1a'
        miniCtx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE)
        
        const startMinimapTileX = Math.floor(cam.x / TILE_SIZE) - 2
        const startMinimapTileY = Math.floor(cam.y / TILE_SIZE) - 2
        const endMinimapTileX = Math.ceil((cam.x + canvas.width) / TILE_SIZE) + 2
        const endMinimapTileY = Math.ceil((cam.y + canvas.height) / TILE_SIZE) + 2
        
        for (let y = 0; y < MAP_HEIGHT; y++) {
          for (let x = 0; x < MAP_WIDTH; x++) {
            if (y < 0 || y >= MAP_HEIGHT || x < 0 || x >= MAP_WIDTH) continue
            
            const tileType = map.tiles[y][x]
            const tileColor = getTileColor(tileType)
            
            miniCtx.fillStyle = tileColor
            miniCtx.fillRect(
              x * TILE_SIZE * scale,
              y * TILE_SIZE * scale,
              TILE_SIZE * scale + 1,
              TILE_SIZE * scale + 1
            )
          }
        }
        
        if (!player.hasCar && targetCar.exists) {
          miniCtx.fillStyle = '#ff6b35'
          miniCtx.beginPath()
          miniCtx.arc(
            targetCar.x * scale,
            targetCar.y * scale,
            4,
            0,
            Math.PI * 2
          )
          miniCtx.fill()
        }
        
        if (player.hasCar) {
          miniCtx.fillStyle = '#4ade80'
          miniCtx.beginPath()
          miniCtx.arc(
            delivery.x * scale,
            delivery.y * scale,
            5,
            0,
            Math.PI * 2
          )
          miniCtx.fill()
        }
        
        police.forEach(cop => {
          const distToPlayer = Math.sqrt(
            Math.pow(player.x - cop.x, 2) + 
            Math.pow(player.y - cop.y, 2)
          )
          
          if (distToPlayer < 400) {
            miniCtx.fillStyle = '#3b82f6'
            miniCtx.beginPath()
            miniCtx.arc(
              cop.x * scale,
              cop.y * scale,
              3,
              0,
              Math.PI * 2
            )
            miniCtx.fill()
          }
        })
        
        miniCtx.fillStyle = player.hasCar ? '#ff6b35' : '#4ade80'
        miniCtx.beginPath()
        miniCtx.arc(
          player.x * scale,
          player.y * scale,
          player.hasCar ? 4 : 3,
          0,
          Math.PI * 2
        )
        miniCtx.fill()
        
        miniCtx.strokeStyle = '#ffffff'
        miniCtx.lineWidth = 1
        miniCtx.strokeRect(
          cam.x * scale,
          cam.y * scale,
          canvas.width * scale,
          canvas.height * scale
        )
      }
      
      animationRef.current = requestAnimationFrame(gameLoop)
    }
    
    gameLoop()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameState, map, heat, missionTime, contract, onComplete])
  
  const handleMiniGameResult = useCallback((success) => {
    setShowMiniGame(false)
    const now = Date.now()
    
    if (success) {
      playerRef.current.hasCar = true
      targetCarRef.current.exists = false
      setPhase('escape')
      
      const police = policeRef.current
      police.forEach(cop => {
        cop.lastKnownX = targetCarRef.current.x
        cop.lastKnownY = targetCarRef.current.y
        cop.state = 'CHASE'
        cop.lastSawPlayer = now
      })
      lastHeartbeatRef.current = now
    } else {
      setHeat(prev => Math.min(prev + 1, 5))
      
      const police = policeRef.current
      const failX = playerRef.current.x
      const failY = playerRef.current.y
      police.forEach(cop => {
        const dist = Math.sqrt(
          Math.pow(cop.x - failX, 2) + Math.pow(cop.y - failY, 2)
        )
        if (dist < 300) {
          cop.lastKnownX = failX
          cop.lastKnownY = failY
          cop.state = 'CHASE'
          cop.lastSawPlayer = now
        }
      })
    }
  }, [])
  
  const getObjectiveText = () => {
    if (phase === 'steal') return 'Find and steal the target car'
    if (phase === 'escape') return 'Escape to the delivery point!'
    return 'Complete the mission'
  }
  
  return (
    <div className="mission-container">
      {!map && (
        <div className="loading-screen">
          <span>Loading map...</span>
        </div>
      )}
      {map && (
      <div className="mission-hud">
        <div className="hud-left">
          <button className="exit-button" onClick={onExit}>
            ✕ Exit
          </button>
        </div>
        
        <div className="hud-center">
          <div className="objective-box">
            <span className="objective-label">OBJECTIVE</span>
            <span className="objective-text">{getObjectiveText()}</span>
          </div>
        </div>
        
        <div className="hud-right">
          <div className="heat-display">
            <span className="heat-label">HEAT</span>
            <div className="heat-bar">
              <div 
                className="heat-fill"
                style={{ 
                  width: `${(heat / 5) * 100}%`,
                  backgroundColor: getHeatColor(Math.ceil(heat))
                }}
              />
            </div>
          </div>
          
          <div className="timer-display">
            <span className="timer-label">TIME</span>
            <span className={`timer-value ${missionTime < 30 ? 'critical' : ''}`}>
              {missionTime}s
            </span>
          </div>
        </div>
      </div>
      )}
      
      <div className="game-area">
        <canvas
          ref={canvasRef}
          width={viewportSize.width}
          height={viewportSize.height}
          className="game-canvas"
        />
        <canvas
          ref={minimapRef}
          width={MINIMAP_SIZE}
          height={MINIMAP_SIZE}
          className="minimap-canvas"
        />
      </div>
      
      <div className="controls-hint">
        <span>WASD or Arrow Keys to move</span>
      </div>
      
      {showMiniGame && (
        miniGameType === 'pathfind' ? (
          <PathFindGame
            difficulty={contract.difficulty}
            onComplete={handleMiniGameResult}
            iterations={3}
          />
        ) : (
          <CarStealMiniGame
            difficulty={contract.difficulty}
            onComplete={handleMiniGameResult}
          />
        )
      )}
    </div>
  )
}

export default Mission