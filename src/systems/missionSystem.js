export const startMission = (contract) => {
  return {
    contract,
    startTime: Date.now(),
    timeLimit: contract.timeLimit * 1000,
    phase: 'steal',
    player: null,
    targetCar: null,
    deliveryPoint: null,
    police: [],
    heat: 0,
    money: 0,
    xp: 0,
    failed: false
  }
}

export const updateMissionPhase = (mission, phase) => {
  return {
    ...mission,
    phase
  }
}

export const calculateRewards = (contract, heat, timeRemaining) => {
  const baseReward = contract.reward
  const timeBonus = Math.floor((timeRemaining / contract.timeLimit) * 200)
  const heatPenalty = Math.floor((heat / 5) * 100)
  
  const finalReward = Math.max(100, baseReward + timeBonus - heatPenalty)
  const xpGain = Math.floor(finalReward / 100) * 10
  
  return {
    money: finalReward,
    xp: xpGain
  }
}

export const isMissionExpired = (mission) => {
  return Date.now() - mission.startTime > mission.timeLimit
}