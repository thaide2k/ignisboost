import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, generateMap, getTileColor, isWalkable, getBuildingVariantColor, loadSprites, getBuildingSprite } from '../../systems/mapSystem'
import { calculateRewards } from '../../systems/missionSystem'
import { getHeatColor, getPoliceBehavior } from '../../systems/heatSystem'
import CarStealMiniGame from '../game/CarStealMiniGame'
import PathFindGame from '../game/PathFindGame'
import './Mission.css'

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

const hash01 = (x, y, seed = 1) => {
  let t = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0
  t = (t ^ (t >>> 13)) | 0
  t = Math.imul(t, 1274126177)
  return (((t >>> 0) & 0xffffff) / 0x1000000)
}

const roundRect = (ctx, x, y, w, h, r) => {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

const drawCar = (ctx, x, y, angle, color, now, opts = {}) => {
  const w = opts.w ?? 28
  const h = opts.h ?? 16
  const r = opts.r ?? 4
  const siren = opts.siren ?? false
  const highlight = opts.highlight ?? null

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  ctx.globalAlpha = 0.22
  ctx.fillStyle = '#000000'
  roundRect(ctx, -w / 2 + 3, -h / 2 + 4, w, h, r)
  ctx.fill()

  ctx.globalAlpha = 1
  ctx.fillStyle = color
  roundRect(ctx, -w / 2, -h / 2, w, h, r)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.10)'
  roundRect(ctx, -w / 4, -h / 2 + 2, w / 2, h / 2.2, 2)
  ctx.fill()

  ctx.globalAlpha = 0.22
  ctx.fillStyle = '#ffd27d'
  ctx.fillRect(w / 2 - 1, -h / 4, 10, h / 2)
  ctx.globalAlpha = 1

  if (siren) {
    const phase = Math.floor(now / 120) % 2
    ctx.fillStyle = phase === 0 ? '#ff3b3b' : '#3b82f6'
    roundRect(ctx, -w / 6, -h / 2 - 3, w / 3, 5, 2)
    ctx.fill()
  }

  if (highlight) {
    ctx.lineWidth = 2
    ctx.strokeStyle = highlight
    roundRect(ctx, -w / 2 - 2, -h / 2 - 2, w + 4, h + 4, r + 2)
    ctx.stroke()
  }

  ctx.restore()
}

const getDirIndex = (angle, dirCount) => {
  const twoPi = Math.PI * 2
  const a = ((angle + Math.PI / 2) % twoPi + twoPi) % twoPi
  return Math.round((a / twoPi) * dirCount) % dirCount
}

const drawVehicleSprite = (ctx, x, y, angle, sprite, now, opts = {}) => {
  if (!sprite) return false

  let dirs = sprite
  if (Array.isArray(sprite) && Array.isArray(sprite[0])) {
    const frameCount = sprite.length
    const frame = Math.floor(now / 120) % frameCount
    dirs = sprite[frame]
  }

  if (!Array.isArray(dirs) || dirs.length === 0) return false

  const idx = getDirIndex(angle, dirs.length)
  const img = dirs[idx]
  if (!img) return false

  const size = opts.size ?? 68
  const r = size / 2

  ctx.save()
  ctx.imageSmoothingEnabled = false

  if (opts.highlight) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 220)
    ctx.globalAlpha = 0.18 + pulse * 0.2
    ctx.fillStyle = opts.highlight
    ctx.beginPath()
    ctx.arc(x, y, r + 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  ctx.drawImage(img, x - r, y - r, size, size)
  ctx.restore()
  return true
}

const drawPed = (ctx, x, y, angle, now, opts = {}) => {
  const r = opts.r ?? 6
  const color = opts.color ?? '#4ade80'

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  ctx.globalAlpha = 0.2
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.ellipse(2, 6, r * 0.9, r * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = 1
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = 0.9
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(r + 4, 0)
  ctx.stroke()
  ctx.globalAlpha = 1

  const blink = Math.floor(now / 240) % 2 === 0
  if (opts.highlight && blink) {
    ctx.lineWidth = 2
    ctx.strokeStyle = opts.highlight
    ctx.beginPath()
    ctx.arc(0, 0, r + 3, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.restore()
}

const drawGuard = (ctx, guard, now) => {
  if (!guard || guard.hp <= 0) return

  const blink = guard.invulnUntil && now < guard.invulnUntil && Math.floor(now / 80) % 2 === 0
  if (blink) return

  const r = 14
  ctx.save()
  ctx.globalAlpha = 0.22
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.ellipse(guard.x + 2, guard.y + 10, r * 0.9, r * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(guard.x, guard.y, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.beginPath()
  ctx.arc(guard.x, guard.y, r + 1, 0, Math.PI * 2)
  ctx.stroke()

  const maxHp = 3
  const w = 38
  const h = 6
  const x0 = guard.x - w / 2
  const y0 = guard.y - 30
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  roundRect(ctx, x0, y0, w, h, 3)
  ctx.fill()
  ctx.fillStyle = '#22c55e'
  roundRect(ctx, x0 + 1, y0 + 1, (w - 2) * (guard.hp / maxHp), h - 2, 2)
  ctx.fill()
  ctx.restore()
}

const drawBullets = (ctx, bullets) => {
  if (!bullets || bullets.length === 0) return
  ctx.save()
  for (const b of bullets) {
    ctx.globalAlpha = 0.9
    ctx.fillStyle = b.owner === 'guard' ? '#ef4444' : '#fbbf24'
    ctx.fillRect(b.x - 2, b.y - 2, 4, 4)
  }
  ctx.restore()
}

const drawReloadIndicator = (ctx, player, gun, now) => {
  if (!gun || !gun.reloadUntil || now >= gun.reloadUntil) return
  const total = gun.reloadTotal || 550
  const t = 1 - clamp((gun.reloadUntil - now) / total, 0, 1)
  const w = 46
  const h = 6
  const x0 = player.x - w / 2
  const y0 = player.y - 34
  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  roundRect(ctx, x0, y0, w, h, 3)
  ctx.fill()
  ctx.fillStyle = '#fbbf24'
  roundRect(ctx, x0 + 1, y0 + 1, (w - 2) * t, h - 2, 2)
  ctx.fill()
  ctx.restore()
}

const drawRoadStamp = (ctx, sheet, stamp, x, y, seed = 1) => {
  if (!sheet?.complete || sheet.naturalWidth === 0) return false
  if (!stamp) return false

  const destX = x * TILE_SIZE
  const destY = y * TILE_SIZE
  const destW = (stamp.spanX || 2) * TILE_SIZE
  const destH = (stamp.spanY || 2) * TILE_SIZE

  const v = hash01(x, y, seed) * 18 - 9
  const shade = Math.floor(62 + v)

  ctx.save()
  ctx.fillStyle = `rgb(${shade},${shade},${shade})`
  ctx.fillRect(destX, destY, destW, destH)

  ctx.globalAlpha = 0.25
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  for (let i = 0; i < 10; i++) {
    const px = destX + ((i * 19 + (seed % 11)) % destW)
    const py = destY + ((i * 23 + (seed % 17)) % destH)
    ctx.fillRect(px, py, 2, 2)
  }
  ctx.globalAlpha = 1

  ctx.translate(destX + destW / 2, destY + destH / 2)
  ctx.rotate(stamp.rot || 0)

  const open = Array.isArray(stamp.open) ? stamp.open : null
  const has = (k) => (open ? open.includes(k) : false)

  ctx.globalAlpha = 0.65
  ctx.fillStyle = '#d9bf5a'
  const dashLen = 8
  const dashTh = 2
  const edgePad = 10
  const centerGap = 12

  const drawArm = (side) => {
    if (side === 'N') {
      for (let yy = -destH / 2 + edgePad; yy <= -centerGap - dashLen; yy += 14) {
        ctx.fillRect(-dashTh / 2, yy, dashTh, dashLen)
      }
    } else if (side === 'S') {
      for (let yy = centerGap; yy <= destH / 2 - edgePad - dashLen; yy += 14) {
        ctx.fillRect(-dashTh / 2, yy, dashTh, dashLen)
      }
    } else if (side === 'W') {
      for (let xx = -destW / 2 + edgePad; xx <= -centerGap - dashLen; xx += 14) {
        ctx.fillRect(xx, -dashTh / 2, dashLen, dashTh)
      }
    } else if (side === 'E') {
      for (let xx = centerGap; xx <= destW / 2 - edgePad - dashLen; xx += 14) {
        ctx.fillRect(xx, -dashTh / 2, dashLen, dashTh)
      }
    }
  }

  if (open) {
    if (has('N')) drawArm('N')
    if (has('S')) drawArm('S')
    if (has('W')) drawArm('W')
    if (has('E')) drawArm('E')
  }
  ctx.globalAlpha = 1

  if (stamp.kind === 'CROSS') {
    ctx.globalAlpha = 0.55
    ctx.fillStyle = '#e5e7eb'
    const stripeW = 6
    const stripeH = 3
    const pad = 12
    for (let i = 0; i < 5; i++) {
      const ox = -destW / 2 + pad + i * (stripeW + 5)
      ctx.fillRect(ox, -destH / 2 + 8, stripeW, stripeH)
      ctx.fillRect(ox, destH / 2 - 12, stripeW, stripeH)
      const oy = -destH / 2 + pad + i * (stripeW + 5)
      ctx.fillRect(-destW / 2 + 8, oy, stripeH, stripeW)
      ctx.fillRect(destW / 2 - 12, oy, stripeH, stripeW)
    }
    ctx.globalAlpha = 1
  }

  if (Array.isArray(stamp.mask) && stamp.mask.length) {
    const halfW = destW / 2
    const halfH = destH / 2
    const armW = Math.floor(destW * 0.34)
    const armHalf = armW / 2
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`
    for (const side of stamp.mask) {
      if (side === 'N') ctx.fillRect(-armHalf, -halfH, armW, halfH)
      else if (side === 'S') ctx.fillRect(-armHalf, 0, armW, halfH)
      else if (side === 'W') ctx.fillRect(-halfW, -armHalf, halfW, armW)
      else if (side === 'E') ctx.fillRect(0, -armHalf, halfW, armW)
    }
  }
  ctx.restore()

  return true
}

const findNearestRoadTile = (map, start, maxRadius = 6) => {
  const sx = clamp(start.x | 0, 0, map.width - 1)
  const sy = clamp(start.y | 0, 0, map.height - 1)
  if (map.tiles?.[sy]?.[sx] === 0) return { x: sx, y: sy }

  for (let r = 1; r <= maxRadius; r++) {
    const x0 = clamp(sx - r, 0, map.width - 1)
    const x1 = clamp(sx + r, 0, map.width - 1)
    const y0 = clamp(sy - r, 0, map.height - 1)
    const y1 = clamp(sy + r, 0, map.height - 1)

    for (let x = x0; x <= x1; x++) {
      if (map.tiles?.[y0]?.[x] === 0) return { x, y: y0 }
      if (map.tiles?.[y1]?.[x] === 0) return { x, y: y1 }
    }
    for (let y = y0 + 1; y <= y1 - 1; y++) {
      if (map.tiles?.[y]?.[x0] === 0) return { x: x0, y }
      if (map.tiles?.[y]?.[x1] === 0) return { x: x1, y }
    }
  }

  return { x: sx, y: sy }
}

function Mission({ contract, onComplete, onExit }) {
  const canvasRef = useRef(null)
  const minimapRef = useRef(null)
  const MINIMAP_SIZE = 150
  const [gameState, setGameState] = useState('playing')
  const [missionTime, setMissionTime] = useState(contract.timeLimit)
  const [heat, setHeat] = useState(0)
  const [phase, setPhase] = useState('steal')
  const [showMiniGame, setShowMiniGame] = useState(false)
  const showMiniGameRef = useRef(false)
  const [miniGameType, setMiniGameType] = useState('hotwire')
  const [map, setMap] = useState(null)
  const [showMobileControls, setShowMobileControls] = useState(false)

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

    if (newMap?.spawnPoints?.targetCar) {
      const tc = newMap.spawnPoints.targetCar
      const tile = findNearestRoadTile(newMap, { x: tc.x - 1, y: tc.y }, 8)
      guardRef.current = {
        x: tile.x * TILE_SIZE + TILE_SIZE / 2,
        y: tile.y * TILE_SIZE + TILE_SIZE / 2,
        homeX: tile.x * TILE_SIZE + TILE_SIZE / 2,
        homeY: tile.y * TILE_SIZE + TILE_SIZE / 2,
        hp: 3,
        state: 'GUARD',
        lastAttackAt: 0,
        stunUntil: 0,
        invulnUntil: 0,
        knockVx: 0,
        knockVy: 0,
        knockUntil: 0
      }
    }
  }, [])
  const [sprites, setSprites] = useState(null)
  const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  
  const cameraRef = useRef({ x: 0, y: 0 })
  const targetVehicleSprite = useMemo(() => {
    const tier = contract?.targetModel?.tier || contract?.tier
    const slug = contract?.targetModel?.slug
    if (tier && slug && sprites?.vehicles?.targetsByTier?.[tier]?.[slug]) return sprites.vehicles.targetsByTier[tier][slug]
    return sprites?.vehicles?.target
  }, [sprites, contract])
  
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  useEffect(() => {
    loadSprites().then((loaded) => {
      setSprites(loaded)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    showMiniGameRef.current = showMiniGame
  }, [showMiniGame])

  useEffect(() => {
    const hasTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || (navigator && (navigator.maxTouchPoints || 0) > 0))
    setShowMobileControls(!!hasTouch)
  }, [])

  const setJoystick = useCallback((dx, dy) => {
    const st = joystickStateRef.current
    moveVecRef.current.x = dx / st.maxR
    moveVecRef.current.y = dy / st.maxR
    const el = joystickKnobRef.current
    if (el) el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
  }, [])

  const onJoystickDown = useCallback((e) => {
    if (!showMobileControls) return
    e.preventDefault()
    const st = joystickStateRef.current
    st.active = true
    st.id = e.pointerId
    st.startX = e.clientX
    st.startY = e.clientY
    setJoystick(0, 0)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [setJoystick, showMobileControls])

  const onJoystickMove = useCallback((e) => {
    const st = joystickStateRef.current
    if (!st.active || st.id !== e.pointerId) return
    e.preventDefault()
    const rawDx = e.clientX - st.startX
    const rawDy = e.clientY - st.startY
    const len = Math.sqrt(rawDx * rawDx + rawDy * rawDy) || 1
    const maxR = st.maxR
    const s = Math.min(1, maxR / len)
    setJoystick(rawDx * s, rawDy * s)
  }, [setJoystick])

  const onJoystickUp = useCallback((e) => {
    const st = joystickStateRef.current
    if (st.id !== e.pointerId) return
    e.preventDefault()
    st.active = false
    st.id = null
    setJoystick(0, 0)
  }, [setJoystick])

  const onFireDown = useCallback((e) => {
    if (!showMobileControls) return
    e.preventDefault()
    fireHeldRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [showMobileControls])

  const onFireUp = useCallback((e) => {
    e.preventDefault()
    fireHeldRef.current = false
  }, [])

  const onJumpDown = useCallback((e) => {
    if (!showMobileControls) return
    e.preventDefault()
    jumpQueuedRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [showMobileControls])

  const onJumpUp = useCallback((e) => {
    e.preventDefault()
    jumpQueuedRef.current = false
  }, [])
  
  const playerRef = useRef({
    x: map?.spawnPoints?.player?.x ? map.spawnPoints.player.x * TILE_SIZE + TILE_SIZE / 2 : 0,
    y: map?.spawnPoints?.player?.y ? map.spawnPoints.player.y * TILE_SIZE + TILE_SIZE / 2 : 0,
    vx: 0,
    vy: 0,
    angle: 0,
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
  const lastFrameTimeRef = useRef(0)
  const movementSpeedMultRef = useRef(2)
  const guardRef = useRef(null)
  const prevSpaceRef = useRef(false)
  const bulletsRef = useRef([])
  const gunRef = useRef({ shotsInMag: 0, reloadUntil: 0, lastShotAt: 0 })
  const guardGunRef = useRef({ lastShotAt: 0 })
  const moveVecRef = useRef({ x: 0, y: 0 })
  const fireHeldRef = useRef(false)
  const jumpQueuedRef = useRef(false)
  const prevJumpKeyRef = useRef(false)
  const duelRef = useRef({ active: false })
  const joystickKnobRef = useRef(null)
  const joystickStateRef = useRef({ active: false, id: null, startX: 0, startY: 0, maxR: 42 })
  
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
      const prev = lastFrameTimeRef.current || now
      lastFrameTimeRef.current = now
      const dtFactor = Math.max(0.5, Math.min(2.5, (now - prev) / 16.6667))
      const player = playerRef.current
      const targetCar = targetCarRef.current
      const delivery = deliveryRef.current
      const police = policeRef.current
      const guard = guardRef.current
      const bullets = bulletsRef.current
      const gun = gunRef.current
      const duel = duelRef.current

      if (duel.active) {
        const w = canvas.width
        const h = canvas.height
        const groundY = duel.groundY ?? Math.floor(h * 0.74)
        duel.groundY = groundY
        duel.w = w
        duel.h = h

        const mv = moveVecRef.current
        const left = (keysRef.current['a'] || keysRef.current['arrowleft'] || mv.x < -0.2)
        const right = (keysRef.current['d'] || keysRef.current['arrowright'] || mv.x > 0.2)
        const fire = (!!(keysRef.current[' '] || keysRef.current['space']) || fireHeldRef.current)
        const jumpKey = !!(keysRef.current['arrowup'])
        const jumpPressed = (jumpKey && !prevJumpKeyRef.current) || !!jumpQueuedRef.current
        prevJumpKeyRef.current = jumpKey
        if (jumpQueuedRef.current) jumpQueuedRef.current = false

        const pl = duel.player
        const gd = duel.guard
        const duelBullets = duel.bullets

        if (!pl.invulnUntil || now > pl.invulnUntil) pl.invuln = false
        if (!gd.invulnUntil || now > gd.invulnUntil) gd.invuln = false

        const guardRunSpeed = 4.8
        const guardGravity = 0.85
        const guardJumpVel = -12.8
        const guardMinX = Math.min(w - 60, pl.x + 140)
        const guardMaxX = w - 60

        const nowMs = now
        if (gd.aiNextAt == null) gd.aiNextAt = 0
        if (gd.aiDir == null) gd.aiDir = 0
        if (gd.aiNextAt < nowMs) {
          const preferredX = clamp(pl.x + 260, w * 0.55, w - 80)
          const dx = preferredX - gd.x
          if (Math.abs(dx) > 40) gd.aiDir = dx > 0 ? 1 : -1
          else gd.aiDir = Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? -1 : 1)
          gd.aiNextAt = nowMs + 260 + Math.random() * 260
        }

        let wantsJump = false
        if (gd.onGround) {
          for (const b of duelBullets) {
            if (b.owner !== 'player') continue
            const dx = gd.x - b.x
            if (dx < 0 || dx > 170) continue
            if (Math.abs(b.y - (groundY - 22)) < 18) {
              wantsJump = true
              break
            }
          }
        }

        if (gd.onGround && wantsJump && (!gd.jumpUntil || nowMs > gd.jumpUntil)) {
          gd.vy = guardJumpVel
          gd.onGround = false
          gd.jumpUntil = nowMs + 500
        }

        gd.vx = gd.aiDir * guardRunSpeed
        gd.vy += guardGravity * dtFactor
        gd.x += gd.vx * dtFactor
        gd.y += gd.vy * dtFactor
        gd.x = clamp(gd.x, guardMinX, guardMaxX)
        if (gd.y >= groundY) {
          gd.y = groundY
          gd.vy = 0
          gd.onGround = true
        }

        const runSpeed = 5.4
        pl.vx = left ? -runSpeed : right ? runSpeed : 0
        const gravity = 0.85
        if (jumpPressed && pl.onGround) {
          pl.vy = -13.5
          pl.onGround = false
        }
        pl.vy += gravity * dtFactor
        pl.x += pl.vx * dtFactor
        pl.y += pl.vy * dtFactor
        pl.x = clamp(pl.x, 60, w - 60)
        if (pl.y >= groundY) {
          pl.y = groundY
          pl.vy = 0
          pl.onGround = true
        }

        if (fire && now - (pl.lastShotAt || 0) > 180 && now >= (pl.reloadUntil || 0)) {
          pl.lastShotAt = now
          pl.shotsInMag = (pl.shotsInMag || 0) + 1
          const muzzleY = pl.y - 44
          duelBullets.push({ owner: 'player', x: pl.x + 26, y: muzzleY, vx: 12.5, vy: 0, bornAt: now })
          if (pl.shotsInMag >= 5) {
            pl.shotsInMag = 0
            pl.reloadTotal = 520
            pl.reloadUntil = now + pl.reloadTotal
          }
        }

        if (now - (gd.lastShotAt || 0) > 620 && now >= (gd.reloadUntil || 0)) {
          gd.lastShotAt = now
          gd.shotsInMag = (gd.shotsInMag || 0) + 1
          const high = (gd.shotsInMag % 2) === 0
          const by = high ? gd.y - 118 : gd.y - 22
          duelBullets.push({ owner: 'guard', x: gd.x - 26, y: by, vx: -9.8, vy: 0, bornAt: now })
          if (gd.shotsInMag >= 6) {
            gd.shotsInMag = 0
            gd.reloadTotal = 680
            gd.reloadUntil = now + gd.reloadTotal
          }
        }

        const next = []
        for (const b of duelBullets) {
          if (now - b.bornAt > 1200) continue
          const bx = b.x + b.vx * dtFactor
          const by = b.y + b.vy * dtFactor
          if (bx < -40 || bx > w + 40) continue
          let hit = false

          if (b.owner === 'player' && !gd.invuln) {
            const gw = 56
            const gh = 76
            const gx0 = gd.x - gw / 2
            const gy0 = gd.y - gh
            if (bx >= gx0 && bx <= gx0 + gw && by >= gy0 && by <= gy0 + gh) {
              hit = true
              gd.hp -= 1
              gd.invuln = true
              gd.invulnUntil = now + 260
              if (gd.hp <= 0) {
                gd.hp = 0
                duel.active = false
                guardRef.current.hp = 0
              }
            }
          } else if (b.owner === 'guard' && !pl.invuln) {
            const pw = 50
            const ph = 76
            const px0 = pl.x - pw / 2
            const py0 = pl.y - ph
            if (bx >= px0 && bx <= px0 + pw && by >= py0 && by <= py0 + ph) {
              hit = true
              pl.hp -= 1
              pl.invuln = true
              pl.invulnUntil = now + 320
              if (pl.hp <= 0) {
                pl.hp = 0
                duel.active = false
                setHeat((v) => Math.min(5, v + 0.6))
              }
            }
          }

          if (!hit) next.push({ ...b, x: bx, y: by })
        }
        duel.bullets = next

        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, w, h)

        ctx.fillStyle = '#0b1020'
        ctx.fillRect(0, 0, w, h)
        ctx.fillStyle = '#101827'
        ctx.fillRect(0, groundY, w, h - groundY)
        ctx.fillStyle = 'rgba(255,255,255,0.06)'
        for (let i = 0; i < 40; i++) {
          const x = (i * 37) % w
          ctx.fillRect(x, groundY + ((i * 13) % 70), 18, 2)
        }

        const drawDuelChar = (ent, color) => {
          const w0 = 52
          const h0 = 76
          const x0 = ent.x - w0 / 2
          const y0 = ent.y - h0
          if (ent.invuln && Math.floor(now / 70) % 2 === 0) return
          ctx.fillStyle = 'rgba(0,0,0,0.35)'
          ctx.fillRect(x0 + 6, ent.y - 10, w0 - 12, 10)
          ctx.fillStyle = color
          roundRect(ctx, x0, y0, w0, h0, 10)
          ctx.fill()
          ctx.fillStyle = 'rgba(255,255,255,0.08)'
          ctx.fillRect(x0 + 6, y0 + 10, w0 - 12, 10)
        }

        const drawHp = (x, y, hp, maxHp, color) => {
          for (let i = 0; i < maxHp; i++) {
            ctx.globalAlpha = i < hp ? 1 : 0.22
            ctx.fillStyle = color
            roundRect(ctx, x + i * 18, y, 14, 10, 3)
            ctx.fill()
          }
          ctx.globalAlpha = 1
        }

        drawDuelChar(pl, '#22c55e')
        drawDuelChar(gd, '#ef4444')

        ctx.fillStyle = '#fbbf24'
        for (const b of duel.bullets) {
          ctx.fillStyle = b.owner === 'guard' ? '#ef4444' : '#fbbf24'
          ctx.fillRect(b.x - 3, b.y - 2, 6, 4)
        }

        drawHp(20, 18, pl.hp, 3, '#22c55e')
        drawHp(w - 20 - 3 * 18, 18, gd.hp, 3, '#ef4444')

        if (pl.reloadUntil && now < pl.reloadUntil) {
          const total = pl.reloadTotal || 520
          const t = 1 - clamp((pl.reloadUntil - now) / total, 0, 1)
          ctx.fillStyle = 'rgba(0,0,0,0.65)'
          roundRect(ctx, 20, 40, 90, 8, 4)
          ctx.fill()
          ctx.fillStyle = '#fbbf24'
          roundRect(ctx, 21, 41, 88 * t, 6, 3)
          ctx.fill()
        }

        animationRef.current = requestAnimationFrame(gameLoop)
        return
      }
      
      const zoomBase = player.hasCar ? 0.86 : 0.92
      const zoom = zoomBase * 2
      const speedScale = 1 / zoomBase
      const baseSpeed = (player.hasCar ? 1.55 : 0.9) * movementSpeedMultRef.current
      const speed = baseSpeed * speedScale * dtFactor
      
      let dx = 0
      let dy = 0
      
      const isStunned = player.stunUntil && now < player.stunUntil
      if (!isStunned) {
        if (keysRef.current['w'] || keysRef.current['arrowup']) dy = -speed
        if (keysRef.current['s'] || keysRef.current['arrowdown']) dy = speed
        if (keysRef.current['a'] || keysRef.current['arrowleft']) dx = -speed
        if (keysRef.current['d'] || keysRef.current['arrowright']) dx = speed

        const mv = moveVecRef.current
        if (mv.x !== 0 || mv.y !== 0) {
          dx += mv.x * speed
          dy += mv.y * speed
        }
      }

      player.vx = dx
      player.vy = dy
      if (dx !== 0 || dy !== 0) {
        player.angle = Math.atan2(dy, dx)
      }
      
      if (player.knockUntil && now < player.knockUntil) {
        dx += player.knockVx * dtFactor
        dy += player.knockVy * dtFactor
      }

      const newX = player.x + dx
      const newY = player.y + dy
      
      if (isWalkable(newX, player.y, map)) {
        player.x = newX
      }
      if (isWalkable(player.x, newY, map)) {
        player.y = newY
      }

      if (bullets.length) {
        const next = []
        for (const b of bullets) {
          const age = now - b.bornAt
          if (age > 900) continue
          const bx = b.x + b.vx * dtFactor
          const by = b.y + b.vy * dtFactor
          if (!isWalkable(bx, by, map)) continue
          if (b.maxDist != null) {
            const dx0 = bx - (b.startX ?? b.x)
            const dy0 = by - (b.startY ?? b.y)
            if (dx0 * dx0 + dy0 * dy0 > b.maxDist * b.maxDist) continue
          }

          let hit = false
          if (b.owner === 'player' && guard && guard.hp > 0 && (!guard.invulnUntil || now > guard.invulnUntil)) {
            const dxg = guard.x - bx
            const dyg = guard.y - by
            if (Math.sqrt(dxg * dxg + dyg * dyg) < 20) {
              hit = true
              guard.hp -= 1
              guard.invulnUntil = now + 180
              guard.stunUntil = now + 160
              const vlen = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1
              guard.knockVx = (b.vx / vlen) * 3.0
              guard.knockVy = (b.vy / vlen) * 3.0
              guard.knockUntil = now + 120
              if (guard.hp <= 0) {
                guard.hp = 0
                guard.state = 'DOWN'
              }
            }
          }
          if (!hit && b.owner === 'guard' && !player.hasCar && (!player.invulnUntil || now > player.invulnUntil)) {
            const dxp = player.x - bx
            const dyp = player.y - by
            if (Math.sqrt(dxp * dxp + dyp * dyp) < 22) {
              hit = true
              player.invulnUntil = now + 220
              const vlen = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1
              player.knockVx = (b.vx / vlen) * 2.6
              player.knockVy = (b.vy / vlen) * 2.6
              player.knockUntil = now + 140
              player.stunUntil = now + 180
              setHeat((h) => Math.min(5, h + 0.35))
            }
          }

          if (!hit) next.push({ ...b, x: bx, y: by })
        }
        bulletsRef.current = next
      }

      if (guard && guard.hp > 0 && !player.hasCar && !duelRef.current.active) {
        const dxg = guard.x - player.x
        const dyg = guard.y - player.y
        const distToGuard = Math.sqrt(dxg * dxg + dyg * dyg)
        if (distToGuard < 92) {
          const w = canvas.width
          const h = canvas.height
          const groundY = Math.floor(h * 0.74)
          duelRef.current = {
            active: true,
            w,
            h,
            groundY,
            player: {
              x: Math.floor(w * 0.24),
              y: groundY,
              vx: 0,
              vy: 0,
              onGround: true,
              hp: 3,
              invuln: false,
              invulnUntil: 0,
              lastShotAt: 0,
              shotsInMag: 0,
              reloadUntil: 0,
              reloadTotal: 520
            },
            guard: {
              x: Math.floor(w * 0.76),
              y: groundY,
              vx: 0,
              vy: 0,
              onGround: true,
              hp: 3,
              invuln: false,
              invulnUntil: 0,
              lastShotAt: 0,
              shotsInMag: 0,
              reloadUntil: 0,
              reloadTotal: 680,
              aiNextAt: 0,
              aiDir: 0,
              jumpUntil: 0
            },
            bullets: []
          }
          fireHeldRef.current = false
          jumpQueuedRef.current = false
        }
      }
      
      if (!player.hasCar && targetCar.exists) {
        const distToCar = Math.sqrt(
          Math.pow(player.x - targetCar.x, 2) + 
          Math.pow(player.y - targetCar.y, 2)
        )
        
        const guardAlive = guardRef.current && guardRef.current.hp > 0
        if (distToCar < 40 && !guardAlive && !showMiniGameRef.current) {
          setMiniGameType('hotwire')
          showMiniGameRef.current = true
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
              if (tile === 0) {
                found = true
              }
            }
          }
          
          if (found) {
            police.push({
              x: spawnTileX * TILE_SIZE + TILE_SIZE / 2,
              y: spawnTileY * TILE_SIZE + TILE_SIZE / 2,
              speed: (0.4 + heat * 0.06) * movementSpeedMultRef.current
            })
            
            lastPoliceSpawnRef.current = now
          }
        }
      }
      
      police.forEach((cop, index) => {
        const behavior = getPoliceBehavior(cop, player, heat, map)
        cop.x += behavior.vx * dtFactor
        cop.y += behavior.vy * dtFactor
        cop.vx = behavior.vx
        cop.vy = behavior.vy
        if (cop.vx !== 0 || cop.vy !== 0) {
          cop.angle = Math.atan2(cop.vy, cop.vx)
        }
        
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

      const viewW = canvas.width / zoom
      const viewH = canvas.height / zoom

      const vLen = Math.sqrt(player.vx * player.vx + player.vy * player.vy)
      const lookAhead = 0
      const laX = vLen > 0 ? (player.vx / vLen) * lookAhead : 0
      const laY = vLen > 0 ? (player.vy / vLen) * lookAhead : 0

      const targetCamX = player.x + laX - viewW / 2
      const targetCamY = player.y + laY - viewH / 2

      const camLerp = 1 - Math.pow(1 - 0.12, dtFactor)
      cameraRef.current.x += (targetCamX - cameraRef.current.x) * camLerp
      cameraRef.current.y += (targetCamY - cameraRef.current.y) * camLerp

      cameraRef.current.x = clamp(cameraRef.current.x, 0, Math.max(0, mapWidth - viewW))
      cameraRef.current.y = clamp(cameraRef.current.y, 0, Math.max(0, mapHeight - viewH))

      const cam = cameraRef.current

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#0a0b0d'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.setTransform(zoom, 0, 0, zoom, -cam.x * zoom, -cam.y * zoom)
      ctx.imageSmoothingEnabled = false

      const startTileX = Math.floor(cam.x / TILE_SIZE)
      const startTileY = Math.floor(cam.y / TILE_SIZE)
      const endTileX = Math.ceil((cam.x + viewW) / TILE_SIZE)
      const endTileY = Math.ceil((cam.y + viewH) / TILE_SIZE)

      const isDriveable = (t) => t === 0 || t === 2 || t === 3

      const drawnRoadStamps = new Set()

      for (let y = startTileY; y <= endTileY; y++) {
        for (let x = startTileX; x <= endTileX; x++) {
          if (y < 0 || y >= MAP_HEIGHT || x < 0 || x >= MAP_WIDTH) continue
          
          const tileType = map.tiles[y][x]
          let tileColor = getTileColor(tileType)
          let drewSprite = false
          let buildingDeco = null
          
          if (tileType === 1 && map.buildingTypes && map.buildingTypes[y]) {
            const variant = map.buildingTypes[y][x]
            
            const hasSprites = sprites?.buildings?.complete && sprites.buildings.naturalWidth > 0
            
            if (variant && hasSprites) {
              drewSprite = getBuildingSprite(ctx, x, y, sprites, variant, 0, 0)
            } else if (variant) {
              const colors = getBuildingVariantColor(variant)
              tileColor = colors.primary
              
              buildingDeco = {
                windowColor: colors.window || '#ffd700',
                roofColor: colors.roof || colors.accent
              }
            }
          }
          
          if (!drewSprite) {
            if (tileType === 0) {
              const stampInfo = map.roadStampIndex?.[y]?.[x]

              if (stampInfo?.covered) {
                const ax = x & ~1
                const ay = y & ~1
                const k = `${ax},${ay}`

                if (!drawnRoadStamps.has(k)) {
                  const anchorInfo = map.roadStampIndex?.[ay]?.[ax]
                  drewSprite = drawRoadStamp(ctx, sprites?.streets2, anchorInfo?.stamp, ax, ay, map.seed || 1)
                  if (!drewSprite) {
                    const v = hash01(ax, ay, map.seed || 1) * 18 - 10
                    const shade = Math.floor(74 + v)
                    ctx.fillStyle = `rgb(${shade},${shade},${shade})`
                    ctx.fillRect(ax * TILE_SIZE, ay * TILE_SIZE, TILE_SIZE * 2, TILE_SIZE * 2)
                  }
                  drawnRoadStamps.add(k)
                }
                continue
              }

              if (!drewSprite) {
                const v = hash01(x, y, map.seed || 1) * 20 - 10
                const shade = Math.floor(74 + v)
                ctx.fillStyle = `rgb(${shade},${shade},${shade})`
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
              }
            } else if (tileType === 2) {
              const seed = map.seed || 1
              const v = hash01(x, y, seed) * 18 - 12
              const shade = Math.floor(56 + v)
              ctx.fillStyle = `rgb(${shade},${shade},${shade})`
              ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)

              ctx.globalAlpha = 0.25
              ctx.fillStyle = '#0b0b0b'
              for (let i = 0; i < 8; i++) {
                const px = x * TILE_SIZE + ((i * 9) % TILE_SIZE)
                const py = y * TILE_SIZE + ((i * 13) % TILE_SIZE)
                ctx.fillRect(px, py, 2, 2)
              }
              ctx.globalAlpha = 1
            } else if (tileType === 3) {
              const seed = map.seed || 1
              const v = hash01(x, y, seed) * 14 - 8
              const shade = Math.floor(62 + v)
              ctx.fillStyle = `rgb(${shade},${shade},${shade})`
              ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)

              ctx.globalAlpha = 0.35
              ctx.fillStyle = '#e5e7eb'
              const inset = 7
              for (let i = 0; i < 3; i++) {
                ctx.fillRect(x * TILE_SIZE + inset + i * 10, y * TILE_SIZE + 8, 2, TILE_SIZE - 16)
              }
              ctx.globalAlpha = 1
            } else {
              ctx.fillStyle = tileColor
              ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)

              if (tileType === 1) {
                if (buildingDeco) {
                  const offsetX = (x * TILE_SIZE) + 8
                  const offsetY = (y * TILE_SIZE) + 10
                  const windowSize = 6
                  const windowGap = 12
                  ctx.fillStyle = buildingDeco.windowColor
                  for (let wy = 0; wy < 2; wy++) {
                    for (let wx = 0; wx < 2; wx++) {
                      if (hash01(x * 10 + wx, y * 10 + wy, map.seed || 1) > 0.28) {
                        ctx.globalAlpha = 0.7
                        ctx.fillRect(offsetX + wx * windowGap, offsetY + wy * windowGap, windowSize, windowSize)
                        ctx.globalAlpha = 1
                      }
                    }
                  }
                  ctx.fillStyle = buildingDeco.roofColor
                  ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, 4)
                }

                const curbW = 4
                const px = x * TILE_SIZE
                const py = y * TILE_SIZE
                const leftRoad = x > 0 && map.tiles[y][x - 1] === 0
                const rightRoad = x < MAP_WIDTH - 1 && map.tiles[y][x + 1] === 0
                const upRoad = y > 0 && map.tiles[y - 1][x] === 0
                const downRoad = y < MAP_HEIGHT - 1 && map.tiles[y + 1][x] === 0

                ctx.fillStyle = 'rgba(220,220,220,0.38)'
                if (leftRoad) ctx.fillRect(px, py, curbW, TILE_SIZE)
                if (rightRoad) ctx.fillRect(px + TILE_SIZE - curbW, py, curbW, TILE_SIZE)
                if (upRoad) ctx.fillRect(px, py, TILE_SIZE, curbW)
                if (downRoad) ctx.fillRect(px, py + TILE_SIZE - curbW, TILE_SIZE, curbW)

                ctx.fillStyle = 'rgba(0,0,0,0.25)'
                if (leftRoad) ctx.fillRect(px + curbW, py, 1, TILE_SIZE)
                if (rightRoad) ctx.fillRect(px + TILE_SIZE - curbW - 1, py, 1, TILE_SIZE)
                if (upRoad) ctx.fillRect(px, py + curbW, TILE_SIZE, 1)
                if (downRoad) ctx.fillRect(px, py + TILE_SIZE - curbW - 1, TILE_SIZE, 1)
              }
            }
          }
          
        }
      }

      drawBullets(ctx, bulletsRef.current)
      
      if (!player.hasCar && targetCar.exists) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 220)
        if (!drawVehicleSprite(ctx, targetCar.x, targetCar.y, Math.PI / 2, targetVehicleSprite, now, { highlight: `rgba(255,107,53,${0.25 + pulse * 0.35})` })) {
          drawCar(ctx, targetCar.x, targetCar.y, Math.PI / 2, '#ff6b35', now, { highlight: `rgba(255,107,53,${0.25 + pulse * 0.35})` })
        }
      }
      
      if (player.hasCar) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 180)
        ctx.save()
        ctx.globalAlpha = 0.22 + pulse * 0.25
        ctx.fillStyle = '#4ade80'
        ctx.beginPath()
        ctx.arc(delivery.x, delivery.y, 54, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 0.9
        ctx.strokeStyle = '#4ade80'
        ctx.lineWidth = 3
        ctx.setLineDash([10, 8])
        ctx.beginPath()
        ctx.arc(delivery.x, delivery.y, 54, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }

      if (!player.hasCar) {
        drawGuard(ctx, guardRef.current, now)
      }
      
      police.forEach(cop => {
        if (!drawVehicleSprite(ctx, cop.x, cop.y, cop.angle ?? 0, sprites?.vehicles?.police, now, { size: 68 })) {
          drawCar(ctx, cop.x, cop.y, cop.angle ?? 0, '#2b6fff', now, { siren: true, w: 26, h: 15 })
        }
      })
      
      if (player.hasCar) {
        if (!drawVehicleSprite(ctx, player.x, player.y, player.angle, targetVehicleSprite, now, { size: 68 })) {
          drawCar(ctx, player.x, player.y, player.angle, '#ff6b35', now, { w: 30, h: 16 })
        }
      } else {
        const moving = Math.abs(player.vx || 0) + Math.abs(player.vy || 0) > 0.05
        const pedSprite = moving ? sprites?.peds?.playerWalk : sprites?.peds?.playerIdle
        if (!drawVehicleSprite(ctx, player.x, player.y, player.angle, pedSprite, now, { size: 54, highlight: '#ff6b35' })) {
          drawPed(ctx, player.x, player.y, player.angle, now, { color: '#4ade80', highlight: '#ff6b35' })
        }
        drawReloadIndicator(ctx, player, gunRef.current, now)
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      const vg = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        Math.min(canvas.width, canvas.height) * 0.2,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) * 0.7
      )
      vg.addColorStop(0, 'rgba(0,0,0,0)')
      vg.addColorStop(1, 'rgba(0,0,0,0.42)')
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
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
    showMiniGameRef.current = false
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
        {showMobileControls && (
          <div className="mobile-controls">
            <div
              className="mobile-joystick"
              onPointerDown={onJoystickDown}
              onPointerMove={onJoystickMove}
              onPointerUp={onJoystickUp}
              onPointerCancel={onJoystickUp}
            >
              <div className="mobile-joystick-base" />
              <div className="mobile-joystick-knob" ref={joystickKnobRef} />
            </div>
            <button
              type="button"
              className="mobile-jump"
              onPointerDown={onJumpDown}
              onPointerUp={onJumpUp}
              onPointerCancel={onJumpUp}
              onPointerLeave={onJumpUp}
            >
              JUMP
            </button>
            <button
              type="button"
              className="mobile-fire"
              onPointerDown={onFireDown}
              onPointerUp={onFireUp}
              onPointerCancel={onFireUp}
              onPointerLeave={onFireUp}
            >
              FIRE
            </button>
          </div>
        )}
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
