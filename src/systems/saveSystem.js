const STORAGE_KEY = 'ignisboost_save'
const PROFILE_KEY = 'ignisboost_profile'

const DEFAULT_PROFILE = {
  name: '',
  avatar: '🏎️',
  createdAt: null
}

const DEFAULT_STATS = {
  money: 0,
  xp: 0,
  level: 1,
  missionsCompleted: 0,
  missionsFailed: 0,
  carsStolen: 0,
  arrests: 0,
  totalPlayTime: 0,
  contractsByTier: { D: 0, C: 0, B: 0, A: 0, S: 0 }
}

const DEFAULT_GAME = {
  version: 1,
  profile: DEFAULT_PROFILE,
  stats: DEFAULT_STATS,
  settings: {
    sfxVolume: 1,
    musicVolume: 0.5
  },
  lastSave: null
}

export const loadGame = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { ...DEFAULT_GAME }
    
    const parsed = JSON.parse(saved)
    return {
      ...DEFAULT_GAME,
      ...parsed,
      stats: { ...DEFAULT_STATS, ...parsed.stats },
      profile: { ...DEFAULT_PROFILE, ...parsed.profile },
      settings: { ...DEFAULT_GAME.settings, ...parsed.settings }
    }
  } catch (e) {
    console.error('Failed to load game:', e)
    return { ...DEFAULT_GAME }
  }
}

export const saveGame = (gameData) => {
  try {
    const dataToSave = {
      ...gameData,
      lastSave: new Date().toISOString()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    return true
  } catch (e) {
    console.error('Failed to save game:', e)
    return false
  }
}

export const saveProfile = (profile) => {
  try {
    const game = loadGame()
    game.profile = {
      ...game.profile,
      ...profile,
      createdAt: profile.createdAt || new Date().toISOString()
    }
    return saveGame(game)
  } catch (e) {
    console.error('Failed to save profile:', e)
    return false
  }
}

export const saveStats = (stats) => {
  try {
    const game = loadGame()
    game.stats = { ...game.stats, ...stats }
    return saveGame(game)
  } catch (e) {
    console.error('Failed to save stats:', e)
    return false
  }
}

export const addMoney = (amount) => {
  const game = loadGame()
  game.stats.money += amount
  return saveGame(game)
}

export const addXP = (amount) => {
  const game = loadGame()
  const newXP = game.stats.xp + amount
  const newLevel = calculateLevel(newXP)
  game.stats.xp = newXP
  game.stats.level = newLevel
  return saveGame(game)
}

export const calculateLevel = (xp) => {
  return Math.floor(xp / 1000) + 1
}

export const getLevelProgress = (xp) => {
  return (xp % 1000) / 10
}

export const unlockTier = (level) => {
  const tiers = []
  if (level >= 1) tiers.push('D', 'C')
  if (level >= 6) tiers.push('B')
  if (level >= 11) tiers.push('A')
  if (level >= 16) tiers.push('S')
  return tiers
}

export const hasProfile = () => {
  const game = loadGame()
  return game.profile?.name?.length > 0
}

export const resetGame = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (e) {
    console.error('Failed to reset game:', e)
    return false
  }
}

export const exportSave = () => {
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) return null
  
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ignisboost_save_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export const importSave = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        resolve(true)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}