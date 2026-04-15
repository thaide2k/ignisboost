import { useState, useCallback, useEffect } from 'react'
import Menu from './components/screens/Menu'
import Mission from './components/screens/Mission'
import Result from './components/screens/Result'
import Profile from './components/screens/Profile'
import { GAME_STATES } from './systems/gameState'
import { loadGame, saveGame, calculateLevel, hasProfile } from './systems/saveSystem'

function App() {
  const [gameState, setGameState] = useState(GAME_STATES.PROFILE)
  const [selectedContract, setSelectedContract] = useState(null)
  const [missionResult, setMissionResult] = useState(null)
  const [playerStats, setPlayerStats] = useState({
    money: 0,
    xp: 0,
    level: 1
  })
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    const saved = loadGame()
    if (hasProfile()) {
      setProfile(saved.profile)
      setPlayerStats(saved.stats)
      setGameState(GAME_STATES.MENU)
    }
  }, [])

  const onProfileComplete = useCallback(() => {
    const saved = loadGame()
    setProfile(saved.profile)
    setGameState(GAME_STATES.MENU)
  }, [])

  const startMission = useCallback((contract) => {
    setSelectedContract(contract)
    setGameState(GAME_STATES.MISSION)
  }, [])

  const completeMission = useCallback((result) => {
    setMissionResult(result)
    
    const currentStats = loadGame().stats
    const newXP = currentStats.xp + result.xp
    const newMoney = currentStats.money + result.money
    const newLevel = calculateLevel(newXP)
    
    const newStats = {
      ...currentStats,
      money: newMoney,
      xp: newXP,
      level: newLevel,
      missionsCompleted: currentStats.missionsCompleted + (result.success ? 1 : 0),
      missionsFailed: currentStats.missionsFailed + (result.success ? 0 : 1),
      carsStolen: currentStats.carsStolen + (result.success ? 1 : 0),
      arrests: currentStats.arrests + (result.reason === 'busted' ? 1 : 0)
    }
    
    saveGame({ ...loadGame(), stats: newStats })
    setPlayerStats(newStats)
    setGameState(GAME_STATES.RESULT)
  }, [])

  const returnToMenu = useCallback(() => {
    setSelectedContract(null)
    setMissionResult(null)
    setGameState(GAME_STATES.MENU)
  }, [])

  switch (gameState) {
    case GAME_STATES.PROFILE:
      return <Profile onComplete={onProfileComplete} />
    
    case GAME_STATES.MENU:
      return (
        <Menu
          playerStats={playerStats}
          profile={profile}
          onStartMission={startMission}
          onEditProfile={() => setGameState(GAME_STATES.PROFILE)}
        />
      )
    
    case GAME_STATES.MISSION:
      return (
        <Mission
          contract={selectedContract}
          onComplete={completeMission}
          onExit={returnToMenu}
        />
      )
    
    case GAME_STATES.RESULT:
      return (
        <Result
          result={missionResult}
          contract={selectedContract}
          onReturnToMenu={returnToMenu}
        />
      )
    
    default:
      return <Profile onComplete={onProfileComplete} />
  }
}

export default App