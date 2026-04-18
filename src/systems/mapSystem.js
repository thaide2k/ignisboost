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

  const roadWidth = 2
  const margin = 2

  const clampI = (v, min, max) => Math.max(min, Math.min(max, v | 0))
  const toEven = (v) => v & ~1

  const carveRect = (x0, y0, w, h, type) => {
    const x1 = clampI(x0 + w, 0, width)
    const y1 = clampI(y0 + h, 0, height)
    for (let y = clampI(y0, 0, height); y < y1; y++) {
      for (let x = clampI(x0, 0, width); x < x1; x++) {
        tiles[y][x] = type
      }
    }
  }

  const carveRectOnBuilding = (x0, y0, w, h, type) => {
    const x1 = clampI(x0 + w, 0, width)
    const y1 = clampI(y0 + h, 0, height)
    for (let y = clampI(y0, 0, height); y < y1; y++) {
      for (let x = clampI(x0, 0, width); x < x1; x++) {
        if (tiles[y][x] === TILE_TYPES.BUILDING) tiles[y][x] = type
      }
    }
  }

  const carveH2 = (y, x0, x1) => {
    const yy = clampI(toEven(y), margin, height - margin - roadWidth)
    carveRect(x0, yy, x1 - x0 + 1, roadWidth, TILE_TYPES.ROAD)
    return yy
  }

  const carveV2 = (x, y0, y1) => {
    const xx = clampI(toEven(x), margin, width - margin - roadWidth)
    carveRect(xx, y0, roadWidth, y1 - y0 + 1, TILE_TYPES.ROAD)
    return xx
  }

  const roadStartsX = []
  const roadStartsY = []

  roadStartsY.push(carveH2(margin, 0, width - 1))
  roadStartsY.push(carveH2(height - margin - roadWidth, 0, width - 1))
  roadStartsX.push(carveV2(margin, 0, height - 1))
  roadStartsX.push(carveV2(width - margin - roadWidth, 0, height - 1))

  const spacing = toEven(10 + Math.floor(rand() * 5))
  const offsetX = clampI(toEven(margin + 2 + Math.floor(rand() * 4)), margin, width - margin - roadWidth)
  const offsetY = clampI(toEven(margin + 2 + Math.floor(rand() * 4)), margin, height - margin - roadWidth)

  for (let y = offsetY; y < height - margin - roadWidth; y += spacing) {
    roadStartsY.push(carveH2(y, 0, width - 1))
  }
  for (let x = offsetX; x < width - margin - roadWidth; x += spacing) {
    roadStartsX.push(carveV2(x, 0, height - 1))
  }

  roadStartsX.sort((a, b) => a - b)
  roadStartsY.sort((a, b) => a - b)

  const blocksX = []
  const blocksY = []

  for (let i = 0; i < roadStartsX.length - 1; i++) {
    const start = roadStartsX[i] + roadWidth
    const end = roadStartsX[i + 1] - 1
    if (end - start >= 6) blocksX.push({ start, end })
  }
  for (let i = 0; i < roadStartsY.length - 1; i++) {
    const start = roadStartsY[i] + roadWidth
    const end = roadStartsY[i + 1] - 1
    if (end - start >= 6) blocksY.push({ start, end })
  }

  for (const by of blocksY) {
    for (const bx of blocksX) {
      const blockW = bx.end - bx.start + 1
      const blockH = by.end - by.start + 1

      if (blockW >= 10 && rand() < 0.65) {
        const rx = clampI(toEven(bx.start + 2 + Math.floor(rand() * Math.max(1, blockW - 4))), bx.start, bx.end - 1)
        carveV2(rx, by.start, by.end)
      }

      if (blockH >= 10 && rand() < 0.65) {
        const ry = clampI(toEven(by.start + 2 + Math.floor(rand() * Math.max(1, blockH - 4))), by.start, by.end - 1)
        carveH2(ry, bx.start, bx.end)
      }

      if (blockW >= 10 && blockH >= 10 && rand() < 0.18) {
        const parkW = 4 + Math.floor(rand() * 6)
        const parkH = 4 + Math.floor(rand() * 6)
        const px0 = clampI(bx.start + 2 + Math.floor(rand() * Math.max(1, blockW - parkW - 3)), bx.start, bx.end)
        const py0 = clampI(by.start + 2 + Math.floor(rand() * Math.max(1, blockH - parkH - 3)), by.start, by.end)
        carveRectOnBuilding(px0, py0, parkW, parkH, TILE_TYPES.GREEN)
      }

      if (blockW >= 10 && blockH >= 10 && rand() < 0.22) {
        const lotW = 5 + Math.floor(rand() * 5)
        const lotH = 4 + Math.floor(rand() * 5)
        const lx0 = clampI(bx.start + 2 + Math.floor(rand() * Math.max(1, blockW - lotW - 3)), bx.start, bx.end)
        const ly0 = clampI(by.start + 2 + Math.floor(rand() * Math.max(1, blockH - lotH - 3)), by.start, by.end)
        carveRectOnBuilding(lx0, ly0, lotW, lotH, TILE_TYPES.PARKING)
      }

      const alleySegments = 1 + Math.floor(rand() * 3)
      for (let i = 0; i < alleySegments; i++) {
        let ax = clampI(bx.start + 1 + Math.floor(rand() * Math.max(1, blockW - 2)), bx.start, bx.end)
        let ay = clampI(by.start + 1 + Math.floor(rand() * Math.max(1, blockH - 2)), by.start, by.end)
        const length = 5 + Math.floor(rand() * 10)
        const dirs = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 }
        ]
        const d = dirs[Math.floor(rand() * dirs.length)]
        for (let j = 0; j < length; j++) {
          if (ax < bx.start || ax > bx.end || ay < by.start || ay > by.end) break
          if (tiles[ay][ax] === TILE_TYPES.BUILDING) tiles[ay][ax] = TILE_TYPES.ALLEY
          ax += d.x
          ay += d.y
        }
      }
    }
  }

  const spawns = []
  const minDistance = 10
  const isDriveable = (t) => t === TILE_TYPES.ROAD
  const isValidSpawn = (x, y) => {
    if (!tiles[y] || !isDriveable(tiles[y][x])) return false
    for (const spawn of spawns) {
      const dx = spawn.x - x
      const dy = spawn.y - y
      if (Math.sqrt(dx * dx + dy * dy) < minDistance) return false
    }
    return true
  }

  let attempts = 0
  while (spawns.length < 6 && attempts < 4000) {
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

  return { width, height, tiles, collision: 'derive_from_tiles', spawns }
}

const findNearestTile = (tiles, width, height, start, predicate, maxRadius = 30) => {
  const sx = Math.max(0, Math.min(width - 1, start.x | 0))
  const sy = Math.max(0, Math.min(height - 1, start.y | 0))
  if (predicate(tiles[sy][sx])) return { x: sx, y: sy }

  for (let r = 1; r <= maxRadius; r++) {
    const x0 = Math.max(0, sx - r)
    const x1 = Math.min(width - 1, sx + r)
    const y0 = Math.max(0, sy - r)
    const y1 = Math.min(height - 1, sy + r)

    for (let x = x0; x <= x1; x++) {
      if (predicate(tiles[y0][x])) return { x, y: y0 }
      if (predicate(tiles[y1][x])) return { x, y: y1 }
    }
    for (let y = y0 + 1; y <= y1 - 1; y++) {
      if (predicate(tiles[y][x0])) return { x: x0, y }
      if (predicate(tiles[y][x1])) return { x: x1, y }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (predicate(tiles[y][x])) return { x, y }
    }
  }

  return { x: sx, y: sy }
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
  ]).then(([streets1, streets2]) => ({ streets1, streets2 }))
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
      primary: '#1f2430',
      accent: '#2b3344',
      window: '#ffd700',
      roof: '#2a3140'
    },
    [BUILDING_VARIANTS.COMMERCIAL]: {
      primary: '#202a33',
      accent: '#2e3a46',
      window: '#00ff88',
      roof: '#2b3642'
    },
    [BUILDING_VARIANTS.INDUSTRIAL]: {
      primary: '#272a2c',
      accent: '#3a3f44',
      window: '#ff6b35',
      roof: '#2f3337'
    },
    [BUILDING_VARIANTS.OFFICE]: {
      primary: '#1e2733',
      accent: '#2d3a49',
      window: '#00ffff',
      roof: '#2a3442'
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
        
        if (tileValue === MAP_TILE_VALUES.STREET) {
          row.push(TILE_TYPES.ROAD)
          typeRow.push(null)
        } else if (tileValue === MAP_TILE_VALUES.BUILDING) {
          row.push(TILE_TYPES.BUILDING)
          const variants = Object.values(BUILDING_VARIANTS)
          const variantIndex = (x + y) % variants.length
          typeRow.push(variants[variantIndex])
        } else if (tileValue === MAP_TILE_VALUES.ALLEY) {
          row.push(TILE_TYPES.ALLEY)
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

const STREETS2_PAD = 16
const STREETS2_CELL = 80
const STREETS2_STEP = 96

const STREETS2_FRAMES = {
  STRAIGHT: { col: 0, row: 0 },
  TURN: { col: 2, row: 2 },
  CROSS: { col: 2, row: 3 }
}

const createRoadStampIndex = (tiles, width, height, seed = 1) => {
  const metaW = Math.floor(width / 2)
  const metaH = Math.floor(height / 2)

  const index = Array.from({ length: height }, () => Array.from({ length: width }, () => null))

  const isRoad2x2 = (mx, my) => {
    if (mx < 0 || my < 0 || mx >= metaW || my >= metaH) return false
    const x = mx * 2
    const y = my * 2
    if (y + 1 >= height || x + 1 >= width) return false
    return (
      tiles[y][x] === TILE_TYPES.ROAD &&
      tiles[y][x + 1] === TILE_TYPES.ROAD &&
      tiles[y + 1][x] === TILE_TYPES.ROAD &&
      tiles[y + 1][x + 1] === TILE_TYPES.ROAD
    )
  }

  const choose = (kind, frameKey, rot = 0, mask = null, open = null) => {
    const f = STREETS2_FRAMES[frameKey] || STREETS2_FRAMES.STRAIGHT
    return {
      sheet: 'streets2',
      kind,
      sx: STREETS2_PAD + f.col * STREETS2_STEP,
      sy: STREETS2_PAD + f.row * STREETS2_STEP,
      sw: STREETS2_CELL,
      sh: STREETS2_CELL,
      spanX: 2,
      spanY: 2,
      rot,
      mask,
      open
    }
  }

  for (let my = 0; my < metaH; my++) {
    for (let mx = 0; mx < metaW; mx++) {
      if (!isRoad2x2(mx, my)) continue

      const n = isRoad2x2(mx, my - 1)
      const e = isRoad2x2(mx + 1, my)
      const s = isRoad2x2(mx, my + 1)
      const w = isRoad2x2(mx - 1, my)

      const count = (n ? 1 : 0) + (e ? 1 : 0) + (s ? 1 : 0) + (w ? 1 : 0)

      let stamp = null
      if (count === 4) {
        stamp = choose('CROSS', 'CROSS', 0, null, ['N', 'E', 'S', 'W'])
      } else if (count === 3) {
        const missingN = !n
        const missingE = !e
        const missingS = !s
        const missingW = !w

        const rot =
          missingS ? 0 :
          missingW ? Math.PI / 2 :
          missingN ? Math.PI :
          Math.PI * 1.5

        stamp = choose('TJUNC', 'CROSS', rot, ['S'], ['N', 'E', 'W'])
      } else if (count === 2) {
        const straight = (n && s) || (e && w)
        if (straight) {
          const rot = (e && w) ? Math.PI / 2 : 0
          stamp = choose('STRAIGHT', 'STRAIGHT', rot, null, ['N', 'S'])
        } else {
          const rot =
            (n && e) ? 0 :
            (e && s) ? Math.PI / 2 :
            (s && w) ? Math.PI :
            Math.PI * 1.5
          stamp = choose('TURN', 'TURN', rot, null, ['N', 'E'])
        }
      } else if (count === 1) {
        const rot = n ? 0 : e ? Math.PI / 2 : s ? Math.PI : Math.PI * 1.5
        stamp = choose('DEAD', 'CROSS', rot, ['E', 'S', 'W'], ['N'])
      } else {
        stamp = choose('STRAIGHT', 'STRAIGHT', 0, null, ['N', 'S'])
      }

      const x = mx * 2
      const y = my * 2

      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          index[y + dy][x + dx] = {
            covered: true,
            anchor: dx === 0 && dy === 0,
            stamp
          }
        }
      }
    }
  }

  return index
}

export const generateMap = (seed = 1) => {
  const cityData = generateCity(MAP_WIDTH, MAP_HEIGHT, seed)
  const variants = Object.values(BUILDING_VARIANTS)
  const hash01 = (x, y, s = 1) => {
    let t = (x * 374761393 + y * 668265263 + s * 1442695041) | 0
    t = (t ^ (t >>> 13)) | 0
    t = Math.imul(t, 1274126177)
    return (((t >>> 0) & 0xffffff) / 0x1000000)
  }
  const getVariantAt = (x, y) => {
    const gx = x >> 2
    const gy = y >> 2
    const i = Math.floor(hash01(gx, gy, seed ^ 0x9e3779b9) * variants.length)
    return variants[Math.max(0, Math.min(variants.length - 1, i))]
  }
  
  const tiles = []
  const buildingTypes = []
  
  for (let y = 0; y < cityData.height; y++) {
    const row = []
    const typeRow = []
    for (let x = 0; x < cityData.width; x++) {
      const tileValue = cityData.tiles[y][x]

      if (tileValue === TILE_TYPES.ROAD || tileValue === MAP_TILE_VALUES.STREET) {
        row.push(TILE_TYPES.ROAD)
        typeRow.push(null)
      } else if (tileValue === TILE_TYPES.ALLEY || tileValue === MAP_TILE_VALUES.ALLEY) {
        row.push(TILE_TYPES.ALLEY)
        typeRow.push(null)
      } else if (tileValue === TILE_TYPES.PARKING) {
        row.push(TILE_TYPES.PARKING)
        typeRow.push(null)
      } else if (tileValue === TILE_TYPES.GREEN) {
        row.push(TILE_TYPES.GREEN)
        typeRow.push(null)
      } else if (tileValue === TILE_TYPES.BUILDING || tileValue === MAP_TILE_VALUES.BUILDING) {
        row.push(TILE_TYPES.BUILDING)
        typeRow.push(getVariantAt(x, y))
      } else {
        row.push(TILE_TYPES.BUILDING)
        typeRow.push(BUILDING_VARIANTS.RESIDENTIAL)
      }
    }
    tiles.push(row)
    buildingTypes.push(typeRow)
  }
  
  const spawns = cityData.spawns || []
  const isRoad = (t) => t === TILE_TYPES.ROAD
  const playerSpawn = (spawns[0] && isRoad(tiles[spawns[0].y]?.[spawns[0].x])) ? spawns[0] : findNearestTile(tiles, cityData.width, cityData.height, spawns[0] || { x: 2, y: 2 }, isRoad)
  const targetSpawn = (spawns[1] && isRoad(tiles[spawns[1].y]?.[spawns[1].x])) ? spawns[1] : findNearestTile(tiles, cityData.width, cityData.height, spawns[1] || { x: MAP_WIDTH - 3, y: MAP_HEIGHT - 3 }, isRoad)
  const deliverySpawn = (spawns[2] && isRoad(tiles[spawns[2].y]?.[spawns[2].x])) ? spawns[2] : findNearestTile(tiles, cityData.width, cityData.height, spawns[2] || { x: 2, y: MAP_HEIGHT - 3 }, isRoad)
  const roadStampIndex = createRoadStampIndex(tiles, cityData.width, cityData.height, seed)
  
  return {
    seed,
    tiles,
    buildingTypes,
    roadStampIndex,
    spawnPoints: {
      player: playerSpawn,
      targetCar: targetSpawn,
      delivery: deliverySpawn
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
