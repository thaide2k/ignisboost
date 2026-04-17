export const TILE_SIZE = 40
export const MAP_WIDTH = 60
export const MAP_HEIGHT = 60

export const TILE_TYPES = {
  ROAD: 0,
  BUILDING: 1,
  ALLEY: 2,
  PARKING: 3,
  GREEN: 4
}

export const MAP_TILE_VALUES = {
  STREET: 0,
  BUILDING: 1,
  ALLEY: 2
}

const mulberry32 = (a) => {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const generateCity = (width = 60, height = 60, seed = 1) => {
  const rand = mulberry32(seed)

  const tiles = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TILE_TYPES.BUILDING)
  )

  const margin = 2

  const clampI = (v, min, max) => Math.max(min, Math.min(max, v | 0))
  const carveRect = (x0, y0, w, h, type) => {
    const x1 = clampI(x0 + w, 0, width)
    const y1 = clampI(y0 + h, 0, height)
    for (let y = clampI(y0, 0, height); y < y1; y++) {
      for (let x = clampI(x0, 0, width); x < x1; x++) {
        tiles[y][x] = type
      }
    }
  }
  const carveH = (y, x0, x1, w, type) => {
    carveRect(x0, y - Math.floor(w / 2), x1 - x0 + 1, w, type)
  }
  const carveV = (x, y0, y1, w, type) => {
    carveRect(x - Math.floor(w / 2), y0, w, y1 - y0 + 1, type)
  }

  const majorSpacing = 12 + Math.floor(rand() * 3)
  const majorWidth = 3
  const minorWidth = 2
  const majorOffsetX = margin + Math.floor(rand() * 3)
  const majorOffsetY = margin + Math.floor(rand() * 3)

  const majorRoadXs = []
  const majorRoadYs = []

  for (let y = majorOffsetY; y < height - margin; y += majorSpacing) {
    carveH(y, 0, width - 1, majorWidth, TILE_TYPES.ROAD)
    majorRoadYs.push(y)
  }
  for (let x = majorOffsetX; x < width - margin; x += majorSpacing) {
    carveV(x, 0, height - 1, majorWidth, TILE_TYPES.ROAD)
    majorRoadXs.push(x)
  }

  const boundsWithEdges = (arr, max) => {
    const b = [margin, ...arr, max - 1 - margin]
    b.sort((a, z) => a - z)
    const out = []
    for (const v of b) {
      if (!out.length || out[out.length - 1] !== v) out.push(v)
    }
    return out
  }

  const xBounds = boundsWithEdges(majorRoadXs, width)
  const yBounds = boundsWithEdges(majorRoadYs, height)

  const inBounds = (x, y) => x >= margin && x < width - margin && y >= margin && y < height - margin

  for (let by = 0; by < yBounds.length - 1; by++) {
    for (let bx = 0; bx < xBounds.length - 1; bx++) {
      const x0 = xBounds[bx]
      const x1 = xBounds[bx + 1]
      const y0 = yBounds[by]
      const y1 = yBounds[by + 1]

      const blockW = x1 - x0
      const blockH = y1 - y0

      if (blockW >= 10 && rand() < 0.85) {
        const rx = clampI(x0 + 4 + Math.floor(rand() * (blockW - 8)), margin, width - 1 - margin)
        carveV(rx, y0, y1, minorWidth, TILE_TYPES.ROAD)
      }
      if (blockH >= 10 && rand() < 0.85) {
        const ry = clampI(y0 + 4 + Math.floor(rand() * (blockH - 8)), margin, height - 1 - margin)
        carveH(ry, x0, x1, minorWidth, TILE_TYPES.ROAD)
      }

      if (blockW >= 10 && blockH >= 10 && rand() < 0.18) {
        const parkW = 4 + Math.floor(rand() * 6)
        const parkH = 4 + Math.floor(rand() * 6)
        const px0 = clampI(x0 + 3 + Math.floor(rand() * Math.max(1, blockW - parkW - 6)), margin, width - 1 - margin)
        const py0 = clampI(y0 + 3 + Math.floor(rand() * Math.max(1, blockH - parkH - 6)), margin, height - 1 - margin)
        carveRect(px0, py0, parkW, parkH, TILE_TYPES.GREEN)
      }

      if (blockW >= 12 && blockH >= 10 && rand() < 0.22) {
        const lotW = 5 + Math.floor(rand() * 6)
        const lotH = 4 + Math.floor(rand() * 5)
        const side = Math.floor(rand() * 4)
        let lx0 = x0 + 2
        let ly0 = y0 + 2
        if (side === 0) {
          lx0 = x0 + 2
          ly0 = clampI(y0 + 3 + Math.floor(rand() * Math.max(1, blockH - lotH - 6)), margin, height - 1 - margin)
        } else if (side === 1) {
          lx0 = clampI(x1 - lotW - 2, margin, width - 1 - margin)
          ly0 = clampI(y0 + 3 + Math.floor(rand() * Math.max(1, blockH - lotH - 6)), margin, height - 1 - margin)
        } else if (side === 2) {
          lx0 = clampI(x0 + 3 + Math.floor(rand() * Math.max(1, blockW - lotW - 6)), margin, width - 1 - margin)
          ly0 = y0 + 2
        } else {
          lx0 = clampI(x0 + 3 + Math.floor(rand() * Math.max(1, blockW - lotW - 6)), margin, width - 1 - margin)
          ly0 = clampI(y1 - lotH - 2, margin, height - 1 - margin)
        }
        carveRect(lx0, ly0, lotW, lotH, TILE_TYPES.PARKING)
      }

      const alleySegments = 1 + Math.floor(rand() * 3)
      for (let i = 0; i < alleySegments; i++) {
        const startX = clampI(x0 + 2 + Math.floor(rand() * Math.max(1, blockW - 4)), margin, width - 1 - margin)
        const startY = clampI(y0 + 2 + Math.floor(rand() * Math.max(1, blockH - 4)), margin, height - 1 - margin)
        const length = 4 + Math.floor(rand() * 8)
        const dirs = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 }
        ]
        const d = dirs[Math.floor(rand() * dirs.length)]
        let ax = startX
        let ay = startY
        for (let j = 0; j < length; j++) {
          if (!inBounds(ax, ay)) break
          if (tiles[ay][ax] === TILE_TYPES.BUILDING) tiles[ay][ax] = TILE_TYPES.ALLEY
          ax += d.x
          ay += d.y
        }
      }
    }
  }

  const spawns = []
  const minDistance = 10
  const isWalk = (t) => t === TILE_TYPES.ROAD || t === TILE_TYPES.ALLEY || t === TILE_TYPES.PARKING
  const isValidSpawn = (x, y) => {
    if (!tiles[y] || !isWalk(tiles[y][x])) return false
    for (const spawn of spawns) {
      const dx = spawn.x - x
      const dy = spawn.y - y
      if (Math.sqrt(dx * dx + dy * dy) < minDistance) return false
    }
    return true
  }

  let attempts = 0
  while (spawns.length < 6 && attempts < 2000) {
    const x = margin + Math.floor(rand() * (width - margin * 2))
    const y = margin + Math.floor(rand() * (height - margin * 2))
    if (isValidSpawn(x, y)) spawns.push({ x, y })
    attempts++
  }

  if (spawns.length < 6) {
    for (let y = margin; y < height - margin && spawns.length < 6; y++) {
      for (let x = margin; x < width - margin && spawns.length < 6; x++) {
        if (isValidSpawn(x, y)) spawns.push({ x, y })
      }
    }
  }

  return {
    width,
    height,
    tiles,
    collision: 'derive_from_tiles',
    spawns
  }
}

export const BUILDING_VARIANTS = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  INDUSTRIAL: 'industrial',
  OFFICE: 'office'
}

const SPRITE_SIZE = 16

export const loadSprites = () => {
  return Promise.all([
    loadImage('/assets/sprites/streets_1.png'),
    loadImage('/assets/sprites/streets_2.png')
  ]).then(([streets1, streets2]) => ({
    streets1,
    streets2
  }))
}

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve(img)
    }
    img.onerror = (e) => {
      reject(e)
    }
    img.src = src
  })
}

export const getBuildingSprite = (ctx, x, y, spriteSheets, variant, camX = 0, camY = 0) => {
  if (!spriteSheets?.buildings) return null
  if (!spriteSheets.buildings.complete || spriteSheets.buildings.naturalWidth === 0) return null
  
  const spriteIndex = {
    [BUILDING_VARIANTS.RESIDENTIAL]: 0,
    [BUILDING_VARIANTS.COMMERCIAL]: 1,
    [BUILDING_VARIANTS.OFFICE]: 2,
    [BUILDING_VARIANTS.INDUSTRIAL]: 3
  }[variant] || 0
  
  const cols = 4
  const sx = (spriteIndex % cols) * SPRITE_SIZE
  const sy = Math.floor(spriteIndex / cols) * SPRITE_SIZE
  
  const destX = x * TILE_SIZE - camX
  const destY = y * TILE_SIZE - camY
  
  ctx.drawImage(
    spriteSheets.buildings,
    sx, sy, SPRITE_SIZE, SPRITE_SIZE,
    destX, destY, TILE_SIZE, TILE_SIZE
  )
  
  return true
}

export const getBuildingVariantColor = (variant) => {
  const colors = {
    [BUILDING_VARIANTS.RESIDENTIAL]: {
      primary: '#2a2a4e',
      accent: '#4a4a8e',
      window: '#ffd700',
      roof: '#3a3a6e'
    },
    [BUILDING_VARIANTS.COMMERCIAL]: {
      primary: '#1a3a4e',
      accent: '#2a5a7e',
      window: '#00ff88',
      roof: '#2a4a6e'
    },
    [BUILDING_VARIANTS.INDUSTRIAL]: {
      primary: '#2e2e2e',
      accent: '#4e4e4e',
      window: '#ff6b35',
      roof: '#3e3e3e'
    },
    [BUILDING_VARIANTS.OFFICE]: {
      primary: '#1e3a5e',
      accent: '#3a5a8e',
      window: '#00ffff',
      roof: '#2a4a7e'
    }
  }
  return colors[variant] || colors[BUILDING_VARIANTS.RESIDENTIAL]
}

export const loadMapFromJson = async (jsonUrl) => {
  try {
    const response = await fetch(jsonUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const mapData = await response.json()
    const tileValues = mapData.tiles
    const mapWidth = mapData.width || MAP_WIDTH
    const mapHeight = mapData.height || MAP_HEIGHT
    
    if (!tileValues || !Array.isArray(tileValues)) {
      throw new Error('Invalid map format: missing tiles array')
    }
    
    const tiles = []
    const buildingTypes = []
    
    for (let y = 0; y < mapHeight; y++) {
      const row = []
      const typeRow = []
      for (let x = 0; x < mapWidth; x++) {
        const tileValue = tileValues[y]?.[x] ?? 1

        const normalized =
          tileValue === MAP_TILE_VALUES.STREET ? TILE_TYPES.ROAD :
          tileValue === MAP_TILE_VALUES.BUILDING ? TILE_TYPES.BUILDING :
          tileValue === MAP_TILE_VALUES.ALLEY ? TILE_TYPES.ALLEY :
          tileValue

        if (normalized === TILE_TYPES.BUILDING) {
          row.push(TILE_TYPES.BUILDING)
          const variants = Object.values(BUILDING_VARIANTS)
          const variantIndex = (x + y) % variants.length
          typeRow.push(variants[variantIndex])
        } else if (normalized === TILE_TYPES.ROAD || normalized === TILE_TYPES.ALLEY || normalized === TILE_TYPES.PARKING || normalized === TILE_TYPES.GREEN) {
          row.push(normalized)
          typeRow.push(null)
        } else {
          row.push(TILE_TYPES.BUILDING)
          typeRow.push(BUILDING_VARIANTS.RESIDENTIAL)
        }
      }
      tiles.push(row)
      buildingTypes.push(typeRow)
    }
    
    const spawns = mapData.spawns || []
    const playerSpawn = spawns[0] || { x: 2, y: 2 }
    const targetCarSpawn = spawns[1] || { x: mapWidth - 3, y: mapHeight - 3 }
    const deliverySpawn = spawns[2] || { x: 2, y: mapHeight - 3 }
    
    return {
      tiles,
      buildingTypes,
      spawnPoints: {
        player: playerSpawn,
        targetCar: targetCarSpawn,
        delivery: deliverySpawn
      },
      width: mapWidth,
      height: mapHeight
    }
  } catch (error) {
    console.error('[MapSystem] Failed to load map:', error)
    return null
  }
}

export const generateMap = (seed = 1) => {
  const cityData = generateCity(MAP_WIDTH, MAP_HEIGHT, seed)
  const rand = mulberry32(seed ^ 0x9e3779b9)
  
  const getRandomVariant = () => {
    const variants = Object.values(BUILDING_VARIANTS)
    return variants[Math.floor(rand() * variants.length)]
  }
  
  const tiles = []
  const buildingTypes = []
  
  for (let y = 0; y < cityData.height; y++) {
    const row = []
    const typeRow = []
    for (let x = 0; x < cityData.width; x++) {
      const tileValue = cityData.tiles[y][x]
      
      if (tileValue === TILE_TYPES.BUILDING || tileValue === MAP_TILE_VALUES.BUILDING) {
        row.push(TILE_TYPES.BUILDING)
        typeRow.push(getRandomVariant())
      } else if (
        tileValue === TILE_TYPES.ROAD || tileValue === MAP_TILE_VALUES.STREET ||
        tileValue === TILE_TYPES.ALLEY || tileValue === MAP_TILE_VALUES.ALLEY ||
        tileValue === TILE_TYPES.PARKING ||
        tileValue === TILE_TYPES.GREEN
      ) {
        row.push(tileValue === MAP_TILE_VALUES.STREET ? TILE_TYPES.ROAD : tileValue)
        typeRow.push(null)
      } else {
        row.push(TILE_TYPES.BUILDING)
        typeRow.push(BUILDING_VARIANTS.RESIDENTIAL)
      }
    }
    tiles.push(row)
    buildingTypes.push(typeRow)
  }
  
  const spawns = cityData.spawns || []
  
  return {
    seed,
    tiles,
    buildingTypes,
    spawnPoints: {
      player: spawns[0] || { x: 2, y: 2 },
      targetCar: spawns[1] || { x: MAP_WIDTH - 3, y: MAP_HEIGHT - 3 },
      delivery: spawns[2] || { x: 2, y: MAP_HEIGHT - 3 }
    },
    width: cityData.width,
    height: cityData.height
  }
}

export const getTileColor = (type) => {
  switch (type) {
    case TILE_TYPES.ROAD:
      return '#555555'
    case TILE_TYPES.BUILDING:
      return '#1a1a2e'
    case TILE_TYPES.ALLEY:
      return '#555555'
    case TILE_TYPES.PARKING:
      return '#444444'
    case TILE_TYPES.GREEN:
      return '#1a3a1a'
    default:
      return '#2a2a2a'
  }
}

export const isWalkable = (x, y, map) => {
  const tileX = Math.floor(x / TILE_SIZE)
  const tileY = Math.floor(y / TILE_SIZE)
  
  if (tileX < 0 || tileX >= map.width || tileY < 0 || tileY >= map.height) {
    return false
  }
  
  const tile = map.tiles[tileY][tileX]
  return tile === TILE_TYPES.ROAD || tile === TILE_TYPES.PARKING || tile === TILE_TYPES.ALLEY
}

export const getBuildingVariant = (x, y, map) => {
  const tileX = Math.floor(x / TILE_SIZE)
  const tileY = Math.floor(y / TILE_SIZE)
  
  if (tileX < 0 || tileX >= map.width || tileY < 0 || tileY >= map.height) {
    return null
  }
  
  return map.buildingTypes?.[tileY]?.[tileX] || null
}

export const loadTiledMap = async (jsonUrl) => {
  try {
    const response = await fetch(jsonUrl)
    const tiledData = await response.json()
    
    const mapWidth = tiledData.width
    const mapHeight = tiledData.height
    const tiles = []
    const buildingTypes = []
    
    const layer = tiledData.layers.find(l => l.type === 'tilelayer')
    if (!layer) {
      throw new Error('No tilelayer found in map')
    }
    
    const data = layer.data
    
    for (let y = 0; y < mapHeight; y++) {
      const row = []
      const typeRow = []
      for (let x = 0; x < mapWidth; x++) {
        const tileId = data[y * mapWidth + x]
        
        if (tileId === 0) {
          row.push(TILE_TYPES.ROAD)
          typeRow.push(null)
        } else {
          row.push(TILE_TYPES.BUILDING)
          const variants = Object.values(BUILDING_VARIANTS)
          const variantIndex = (tileId - 1) % variants.length
          typeRow.push(variants[variantIndex])
        }
      }
      tiles.push(row)
      buildingTypes.push(typeRow)
    }
    
    const spawnPoints = { player: { x: 2, y: 2 }, targetCar: { x: mapWidth - 3, y: mapHeight - 3 }, delivery: { x: 2, y: mapHeight - 3 } }
    
    return { tiles, buildingTypes, spawnPoints, width: mapWidth, height: mapHeight }
  } catch (error) {
    console.error('[TiledMap] Failed to load:', error)
    return null
  }
}
