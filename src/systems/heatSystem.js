export const HEAT_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
  MAX: 5
}

export const POLICE_STATES = {
  PATROL: 'PATROL',
  CHASE: 'CHASE',
  HUNT: 'HUNT',
  SEARCH: 'SEARCH'
}

export const getHeatColor = (level) => {
  if (level <= 1) return '#4ade80'
  if (level === 2) return '#fbbf24'
  if (level === 3) return '#f97316'
  return '#ff3b3b'
}

export const calculateHeatIncrease = (reason, currentHeat, difficulty) => {
  const baseIncrease = {
    miniGameFail: 1,
    timeElapsed: 0.1,
    detection: 2,
    nearMiss: 0.5
  }
  
  const difficultyMultiplier = 1 + (difficulty - 1) * 0.2
  return Math.min(
    currentHeat + baseIncrease[reason] * difficultyMultiplier,
    HEAT_LEVELS.MAX
  )
}

export const getPoliceSpawnRate = (heat) => {
  return {
    spawnInterval: 10000 - (heat * 1500),
    maxPolice: 1 + Math.floor(heat / 2),
    speed: 0.4 + (heat * 0.1)
  }
}

const hasLineOfSight = (police, player, map) => {
  if (!map) return false
  
  const policeTileX = Math.floor(police.x / 40)
  const policeTileY = Math.floor(police.y / 40)
  const playerTileX = Math.floor(player.x / 40)
  const playerTileY = Math.floor(player.y / 40)
  
  const dx = playerTileX - policeTileX
  const dy = playerTileY - policeTileY
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  if (distance > 10) return false
  
  const steps = Math.ceil(distance)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const checkX = Math.round(policeTileX + dx * t)
    const checkY = Math.round(policeTileY + dy * t)
    
    if (checkX >= 0 && checkX < map.width && checkY >= 0 && checkY < map.height) {
      const tile = map.tiles[checkY][checkX]
      if (tile !== 0 && tile !== 2 && tile !== 3) {
        return false
      }
    }
  }
  
  return true
}

const findNextMove = (police, targetX, targetY, map, speed) => {
  if (!map) {
    const dx = targetX - police.x
    const dy = targetY - police.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1) return { vx: 0, vy: 0 }
    return {
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed
    }
  }
  
  const policeTileX = Math.floor(police.x / 40)
  const policeTileY = Math.floor(police.y / 40)
  const targetTileX = Math.floor(targetX / 40)
  const targetTileY = Math.floor(targetY / 40)
  
  let bestDir = { x: 0, y: 0 }
  let bestDist = Infinity
  
  const directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 }
  ]
  
  for (const dir of directions) {
    const newX = policeTileX + dir.x
    const newY = policeTileY + dir.y
    
    if (newX >= 0 && newX < map.width && newY >= 0 && newY < map.height) {
      const tile = map.tiles[newY][newX]
      if (tile === 0 || tile === 2 || tile === 3) {
        const distToTarget = Math.sqrt(
          Math.pow(newX - targetTileX, 2) + Math.pow(newY - targetTileY, 2)
        )
        if (distToTarget < bestDist) {
          bestDist = distToTarget
          bestDir = dir
        }
      }
    }
  }
  
  const worldX = bestDir.x * 40
  const worldY = bestDir.y * 40
  
  return {
    vx: worldX !== 0 || worldY !== 0 ? (worldX / 40) * speed : 0,
    vy: worldY !== 0 || worldX !== 0 ? (worldY / 40) * speed : 0
  }
}

export const getPoliceBehavior = (police, player, heat, map) => {
  const now = Date.now()
  const baseSpeed = 0.4 + (heat * 0.06)
  let move = { vx: 0, vy: 0 }
  
  if (!police.state) {
    police.state = POLICE_STATES.PATROL
    police.lastPatrolDir = { x: 0, y: 0 }
    police.patrolTimer = now
  }
  
  const dx = player.x - police.x
  const dy = player.y - police.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  const canSeePlayer = hasLineOfSight(police, player, map)
  
  switch (police.state) {
    case POLICE_STATES.PATROL:
      if (distance < 300 && canSeePlayer) {
        police.state = POLICE_STATES.CHASE
        police.lastSawPlayer = now
        police.lastKnownX = player.x
        police.lastKnownY = player.y
      } else {
        if (now - police.patrolTimer > 1500) {
          const dirs = [
            { x: 0, y: -1 }, { x: 1, y: 0 },
            { x: 0, y: 1 }, { x: -1, y: 0 }
          ]
          police.lastPatrolDir = dirs[Math.floor(Math.random() * dirs.length)]
          police.patrolTimer = now
        }
        
        move = findNextMove(
          police,
          police.x + police.lastPatrolDir.x * 80,
          police.y + police.lastPatrolDir.y * 80,
          map,
          baseSpeed * 0.5
        )
      }
      break
    
    case POLICE_STATES.CHASE:
      if (canSeePlayer) {
        police.lastKnownX = player.x
        police.lastKnownY = player.y
        police.lastSawPlayer = now
        delete police.lostPlayerTimer
        delete police.huntTimer
        
        if (distance < 300) {
          move = findNextMove(police, player.x, player.y, map, baseSpeed * 1.2)
        }
      } else {
        if (!police.lostPlayerTimer) {
          police.lostPlayerTimer = now
          police.playerDirX = dx / distance
          police.playerDirY = dy / distance
        }
        
        const lostTime = now - police.lostPlayerTimer
        
        if (lostTime < 500) {
          move = findNextMove(
            police,
            police.x + police.playerDirX * 100,
            police.y + police.playerDirY * 100,
            map,
            baseSpeed * 1.2
          )
        } else if (lostTime < 2500) {
          if (!police.huntTimer) {
            police.huntTimer = now
          }
          move = findNextMove(
            police,
            police.lastKnownX,
            police.lastKnownY,
            map,
            baseSpeed * 1.0
          )
        } else {
          police.state = POLICE_STATES.SEARCH
          police.searchTimer = now
          delete police.lostPlayerTimer
          delete police.huntTimer
        }
      }
      break
    
    case POLICE_STATES.SEARCH:
      if (canSeePlayer) {
        police.state = POLICE_STATES.CHASE
        police.lastSawPlayer = now
        police.lastKnownX = player.x
        police.lastKnownY = player.y
      } else {
        if (!police.searchTarget) {
          const centerX = police.lastKnownX || police.x
          const centerY = police.lastKnownY || police.y
          const angle = Math.random() * Math.PI * 2
          const radius = 80 + Math.random() * 120
          police.searchTarget = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
          }
          police.searchCenter = { x: centerX, y: centerY }
        }
        
        move = findNextMove(police, police.searchTarget.x, police.searchTarget.y, map, baseSpeed * 0.8)
        
        const distToSearch = Math.sqrt(
          Math.pow(police.x - police.searchTarget.x, 2) +
          Math.pow(police.y - police.searchTarget.y, 2)
        )
        
        if (distToSearch < 60) {
          const centerX = police.searchCenter?.x || police.x
          const centerY = police.searchCenter?.y || police.y
          const angle = Math.random() * Math.PI * 2
          const radius = 60 + Math.random() * 160
          police.searchTarget = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
          }
        }
        
        if (now - police.searchTimer > 5000) {
          police.state = POLICE_STATES.PATROL
          delete police.searchTimer
          delete police.searchTarget
          delete police.searchCenter
        }
      }
      break
    
    default:
      police.state = POLICE_STATES.PATROL
  }
  
  return move
}