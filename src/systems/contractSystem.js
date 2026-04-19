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
    D: [
      { name: 'Toyota Yaris', slug: 'toyota_yaris' },
      { name: 'Hyundai i10', slug: 'hyundai_i10' },
      { name: 'Kia Rio', slug: 'kia_rio' },
      { name: 'Chevrolet Spark', slug: 'chevrolet_spark' }
    ],
    C: [
      { name: 'Volkswagen Golf', slug: 'volkswagen_golf' },
      { name: 'Honda Civic', slug: 'honda_civic' },
      { name: 'Mazda 3', slug: 'mazda_3' },
      { name: 'Ford Focus', slug: 'ford_focus' }
    ],
    B: [
      { name: 'Toyota Camry', slug: 'toyota_camry' },
      { name: 'BMW 3 Series', slug: 'bmw_3_series' },
      { name: 'Audi A4', slug: 'audi_a4' },
      { name: 'Mercedes-Benz C-Class', slug: 'mercedes_c_class' }
    ],
    A: [
      { name: 'BMW M3', slug: 'bmw_m3' },
      { name: 'Mercedes-AMG C63', slug: 'mercedes_amg_c63' },
      { name: 'Audi RS5', slug: 'audi_rs5' },
      { name: 'Porsche 911', slug: 'porsche_911' }
    ]
  }

  const locations = [
    'Downtown', 'Industrial District', 'Suburbs', 'Harbor District',
    'University Area', 'Shopping District', 'Entertainment Zone', 'Airport'
  ]

  const tierIndex = TIER_ORDER.indexOf(tier)
  const difficultyMultiplier = 1 + (tierIndex * 0.3)
  const randomFactor = 0.8 + Math.random() * 0.4
  const models = carModelsByTier[tier] || carModelsByTier.D
  const targetModel = models[Math.floor(Math.random() * models.length)]

  return {
    id: `contract-${id}-${Date.now()}`,
    tier,
    reward: Math.floor(baseReward[tier] * randomFactor),
    heatLevel: baseHeat[tier],
    difficulty: tierIndex + 1,
    carType: targetModel.name,
    targetModel: { tier, slug: targetModel.slug, name: targetModel.name },
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
