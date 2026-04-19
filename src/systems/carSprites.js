export const CAR_SPRITES = {
  'Sports Sedan': {
    emoji: '🚗',
    colors: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']
  },
  'Muscle Car': {
    emoji: '🏎️',
    colors: ['#e74c3c', '#2c3e50', '#f39c12', '#e67e22', '#c0392b', '#8e44ad']
  },
  'Supercar': {
    emoji: '🏎️',
    colors: ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e67e22']
  },
  'Luxury SUV': {
    emoji: '🚙',
    colors: ['#2c3e50', '#34495e', '#7f8c8d', '#95a5a6', '#1abc9c', '#16a085']
  },
  'Hatchback': {
    emoji: '🚗',
    colors: ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#95a5a6', '#e67e22']
  },
  'Coupe': {
    emoji: '🚘',
    colors: ['#e74c3c', '#2c3e50', '#f39c12', '#3498db', '#9b59b6', '#1abc9c']
  },
  'Exotic': {
    emoji: '🏎️',
    colors: ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db', '#e67e22', '#c0392b']
  },
  'Classic': {
    emoji: '🚗',
    colors: ['#c0392b', '#8e44ad', '#2c3e50', '#d35400', '#27ae60', '#2980b9']
  }
}

export const CAR_EMOJIS = ['🚗', '🚙', '🏎️', '🚕', '🚓', '🚑', '🚌', '🚚']

export const getCarEmoji = (carType) => {
  return CAR_SPRITES[carType]?.emoji || '🚗'
}

export const getCarColor = (carType, index = 0) => {
  const colors = CAR_SPRITES[carType]?.colors || ['#e74c3c']
  return colors[index % colors.length]
}

const ranked = (rank, slug) =>
  `assets/sprites/unluckystudio/Topdown_vehicle_sprites_pack/ranked_models/${rank}/${slug}_animation/1.png`

const RANKED_TARGET_MODELS = {
  D: [
    { tier: 'D', slug: 'toyota_yaris', name: 'Toyota Yaris', preview: ranked('rank_d', 'toyota_yaris') },
    { tier: 'D', slug: 'hyundai_i10', name: 'Hyundai i10', preview: ranked('rank_d', 'hyundai_i10') },
    { tier: 'D', slug: 'kia_rio', name: 'Kia Rio', preview: ranked('rank_d', 'kia_rio') },
    { tier: 'D', slug: 'chevrolet_spark', name: 'Chevrolet Spark', preview: ranked('rank_d', 'chevrolet_spark') }
  ],
  C: [
    { tier: 'C', slug: 'volkswagen_golf', name: 'Volkswagen Golf', preview: ranked('rank_c', 'volkswagen_golf') },
    { tier: 'C', slug: 'honda_civic', name: 'Honda Civic', preview: ranked('rank_c', 'honda_civic') },
    { tier: 'C', slug: 'mazda_3', name: 'Mazda 3', preview: ranked('rank_c', 'mazda_3') },
    { tier: 'C', slug: 'ford_focus', name: 'Ford Focus', preview: ranked('rank_c', 'ford_focus') }
  ],
  B: [
    { tier: 'B', slug: 'toyota_camry', name: 'Toyota Camry', preview: ranked('rank_b', 'toyota_camry') },
    { tier: 'B', slug: 'bmw_3_series', name: 'BMW 3 Series', preview: ranked('rank_b', 'bmw_3_series') },
    { tier: 'B', slug: 'audi_a4', name: 'Audi A4', preview: ranked('rank_b', 'audi_a4') },
    { tier: 'B', slug: 'mercedes_c_class', name: 'Mercedes-Benz C-Class', preview: ranked('rank_b', 'mercedes_c_class') }
  ],
  A: [
    { tier: 'A', slug: 'bmw_m3', name: 'BMW M3', preview: ranked('rank_a', 'bmw_m3') },
    { tier: 'A', slug: 'mercedes_amg_c63', name: 'Mercedes-AMG C63', preview: ranked('rank_a', 'mercedes_amg_c63') },
    { tier: 'A', slug: 'audi_rs5', name: 'Audi RS5', preview: ranked('rank_a', 'audi_rs5') },
    { tier: 'A', slug: 'porsche_911', name: 'Porsche 911', preview: ranked('rank_a', 'porsche_911') }
  ]
}

const strHash = (s) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
  return h >>> 0
}

const hash01 = (x, y, seed = 1) => {
  let t = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0
  t = (t ^ (t >>> 13)) | 0
  t = Math.imul(t, 1274126177)
  return (((t >>> 0) & 0xffffff) / 0x1000000)
}

export const getTargetModelForContract = (contract) => {
  if (contract?.targetModel?.tier && contract?.targetModel?.slug && contract?.targetModel?.name) {
    const tm = contract.targetModel
    return {
      tier: tm.tier,
      slug: tm.slug,
      name: tm.name,
      preview: tm.preview || ranked(`rank_${String(tm.tier).toLowerCase()}`, tm.slug)
    }
  }
  const tier = contract?.tier
  const list = RANKED_TARGET_MODELS[tier]
  if (!list || list.length === 0) return null
  const seed = strHash(String(contract?.id || '')) + strHash(String(contract?.tier || '')) + (contract?.reward || 0)
  const idx = Math.floor(hash01(list.length, contract?.timeLimit || 0, seed) * list.length)
  return list[Math.max(0, Math.min(list.length - 1, idx))]
}

export const pickTargetModelForTier = (tier) => {
  const list = RANKED_TARGET_MODELS[tier]
  if (!list || list.length === 0) return null
  const idx = Math.floor(Math.random() * list.length)
  return list[Math.max(0, Math.min(list.length - 1, idx))]
}
