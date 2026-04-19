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

export const getRankedCarPreviewSrc = (tier, slug) => {
  if (!tier || !slug) return null
  return `/assets/sprites/unluckystudio/Topdown_vehicle_sprites_pack/ranked_models/rank_${String(tier).toLowerCase()}/${slug}_animation/1.png`
}
