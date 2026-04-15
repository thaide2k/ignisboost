import { useState } from 'react'
import { saveProfile, loadGame } from '../../systems/saveSystem'
import './Profile.css'

const AVATARS = [
  '🏎️', '🚗', '🚕', '🚙', '🚌', '🏍️', '🚓', '🚑',
  '🦊', '🐺', '🦁', '🐯', '🦅', '🐉', '⚡', '🔥',
  '💎', '⭐', '🌙', '☀️', '🎮', '🎯', '💀', '👑'
]

function Profile({ onComplete }) {
  const existingProfile = loadGame()
  const [name, setName] = useState(existingProfile.profile?.name || '')
  const [avatar, setAvatar] = useState(existingProfile.profile?.avatar || '🏎️')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setError('Nome precisa ter pelo menos 2 caracteres')
      return
    }
    if (trimmedName.length > 20) {
      setError('Nome deve ter no máximo 20 caracteres')
      return
    }
    
    const success = saveProfile({
      name: trimmedName,
      avatar: avatar,
      createdAt: existingProfile.profile?.createdAt || new Date().toISOString()
    })
    
    if (success) {
      onComplete()
    } else {
      setError('Erro ao salvar. Tente novamente.')
    }
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h1 className="profile-title">CRIE SEU PERFIL</h1>
        <p className="profile-subtitle">Escolha seu nome e avatar</p>
        
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="avatar-preview">
            <span className="avatar-large">{avatar}</span>
          </div>
          
          <div className="input-group">
            <label className="input-label">NOME</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome"
              maxLength={20}
              className="name-input"
              autoFocus
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">AVATAR</label>
            <div className="avatar-grid">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`avatar-option ${avatar === a ? 'selected' : ''}`}
                  onClick={() => setAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          
          {error && <p className="error-text">{error}</p>}
          
          <button type="submit" className="start-button">
            COMEÇAR A JOGAR
          </button>
        </form>
      </div>
    </div>
  )
}

export default Profile