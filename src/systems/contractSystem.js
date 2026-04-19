import { TIER_ORDER } from './gameState'

export const generateContracts = () => {
  const tiers = ['D', 'D', 'C', 'C', 'B']
  return tiers.slice(0, 3).map((tier, index) => createContract(tier, index))
}

export const createContract = (tier, id) => {
  const baseReward = {
    D: 500,
    C: 1000,
    B: 2000,
    A: 4000,
    S: 8000
  }

  const baseHeat = {
    D: 1,
    C: 2,
    B: 3,
    A: 4,
    S: 5
  }

  const carModelsByTier = {
    D: ['Toyota Yaris', 'Hyundai i10', 'Kia Rio', 'Chevrolet Spark'],
    C: ['Volkswagen Golf', 'Honda Civic', 'Mazda 3', 'Ford Focus'],
    B: ['Toyota Camry', 'BMW 3 Series', 'Audi A4', 'Mercedes-Benz C-Class'],
    A: ['BMW M3', 'Mercedes-AMG C63', 'Audi RS5', 'Porsche 911']
  }

  const locations = [
    'Downtown', 'Industrial District', 'Suburbs', 'Harbor District',
    'University Area', 'Shopping District', 'Entertainment Zone', 'Airport'
  ]

  const tierIndex = TIER_ORDER.indexOf(tier)
  const difficultyMultiplier = 1 + (tierIndex * 0.3)
  const randomFactor = 0.8 + Math.random() * 0.4
  const models = carModelsByTier[tier] || carModelsByTier.D

  return {
    id: `contract-${id}-${Date.now()}`,
    tier,
    reward: Math.floor(baseReward[tier] * randomFactor),
    heatLevel: baseHeat[tier],
    difficulty: tierIndex + 1,
    carType: models[Math.floor(Math.random() * models.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
    timeLimit: Math.floor((180 - (tierIndex * 20)) * (0.8 + Math.random() * 0.4)),
    expiresIn: Math.floor(60 + Math.random() * 60)
  }
}

export const getTierColor = (tier) => {
  const colors = {
    D: '#a0a0a0',
    C: '#4ade80',
    B: '#3b82f6',
    A: '#a855f7',
    S: '#ff6b35'
  }
  return colors[tier] || '#a0a0a0'
}
