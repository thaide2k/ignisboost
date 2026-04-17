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
  const rand = mulberry32(seed);

  const tiles = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 1)
  );

  const roadSpacing = 8 + Math.floor(rand() * 4);

  for (let y = 2; y < height - 2; y += roadSpacing) {
    for (let x = 0; x < width; x++) {
      tiles[y][x] = 0;
      tiles[y + 1][x] = 0;
    }
  }

  for (let x = 2; x < width - 2; x += roadSpacing) {
    for (let y = 0; y < height; y++) {
      tiles[y][x] = 0;
      tiles[y][x + 1] = 0;
    }
  }

  const alleyCount = Math.floor((width * height) / 120);

  for (let i = 0; i < alleyCount; i++) {
    let x = Math.floor(rand() * width);
    let y = Math.floor(rand() * height);

    const length = 4 + Math.floor(rand() * 8);
    const horizontal = rand() > 0.5;

    for (let j = 0; j < length; j++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (tiles[y][x] === 1) tiles[y][x] = 2;
      }

      if (horizontal) x++;
      else y++;
    }
  }

  for (let i = 0; i < alleyCount / 2; i++) {
    let x = Math.floor(rand() * width);
    let y = Math.floor(rand() * height);

    for (let j = 0; j < 6; j++) {
      if (tiles[y] && tiles[y][x] !== undefined) {
        if (tiles[y][x] !== 1) tiles[y][x] = 0;
      }

      x += Math.floor(rand() * 3) - 1;
      y += Math.floor(rand() * 3) - 1;
    }
  }

  const spawns = [];
  const minDistance = 8;

  const isValidSpawn = (x, y) => {
    if (!tiles[y] || tiles[y][x] !== 0) return false;
    for (const spawn of spawns) {
      const dist = Math.sqrt(Math.pow(spawn.x - x, 2) + Math.pow(spawn.y - y, 2));
      if (dist < minDistance) return false;
    }
    return true;
  };

  let attempts = 0;
  while (spawns.length < 6 && attempts < 1000) {
    const x = Math.floor(rand() * width);
    const y = Math.floor(rand() * height);
    
    if (isValidSpawn(x, y)) {
      spawns.push({ x, y });
    }
    attempts++;
  }

  if (spawns.length < 6) {
    for (let y = 0; y < height && spawns.length < 6; y++) {
      for (let x = 0; x < width && spawns.length < 6; x++) {
        if (isValidSpawn(x, y)) {
          spawns.push({ x, y });
        }
      }
    }
  }

  return {
    width,
    height,
    tiles,
    collision: "derive_from_tiles",
    spawns
  };
}

export const BUILDING_VARIANTS = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  INDUSTRIAL: 'industrial',
  OFFICE: 'office'
}

const SPRITE_SIZE = 16

export const loadSprites = () => {
  return new Promise((resolve) => {
    resolve({})
  })
}

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      console.log('[Sprite] Loaded:', src, img.width, 'x', img.height)
      resolve(img)
    }
    img.onerror = (e) => {
      console.error('[Sprite] Failed to load:', src, e)
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
      
      if (tileValue === MAP_TILE_VALUES.STREET) {
        row.push(TILE_TYPES.ROAD)
        typeRow.push(null)
      } else if (tileValue === MAP_TILE_VALUES.BUILDING) {
        row.push(TILE_TYPES.BUILDING)
        typeRow.push(getRandomVariant())
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
