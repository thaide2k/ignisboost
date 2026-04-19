import { useState, useEffect } from 'react'
import { generateContracts, getTierColor } from '../../systems/contractSystem'
import { getRankedCarPreviewSrc } from '../../systems/carSprites'
import './Menu.css'

const NAV_ITEMS = [
  { id: 'dashboard', icon: '🏠', label: 'Dashboard', active: false },
  { id: 'contracts', icon: '📋', label: 'Contratos', active: true },
  { id: 'garage', icon: '🚗', label: 'Garagem', disabled: true },
  { id: 'shop', icon: '🏪', label: 'Loja', disabled: true },
  { id: 'ranking', icon: '🏆', label: 'Ranking', disabled: true },
  { id: 'settings', icon: '⚙️', label: 'Config', disabled: true },
]

function Menu({ playerStats, profile, onStartMission, onEditProfile }) {
  const [contracts, setContracts] = useState([])
  const [selectedContract, setSelectedContract] = useState(null)
  const [activeNav, setActiveNav] = useState('contracts')
  const [failedSprites, setFailedSprites] = useState({})

  useEffect(() => {
    setContracts(generateContracts())
  }, [])

  const handleStart = () => {
    if (selectedContract) {
      onStartMission(selectedContract)
    }
  }

  const getLevelProgress = () => {
    const xpInLevel = playerStats.xp % 1000
    return (xpInLevel / 1000) * 100
  }

  return (
    <div className="menu-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/logo.png" alt="IgnisBoost" className="sidebar-logo" />
          <span className="sidebar-title">IgnisBoost</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeNav === item.id ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
              onClick={() => !item.disabled && setActiveNav(item.id)}
              disabled={item.disabled}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.disabled && <span className="nav-badge">Em breve</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="profile-card" onClick={onEditProfile}>
            <span className="profile-avatar">{profile?.avatar}</span>
            <div className="profile-info">
              <span className="profile-name">{profile?.name}</span>
              <span className="profile-level">Nível {playerStats.level}</span>
            </div>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <div className="page-title">
            <h1>Contratos Disponíveis</h1>
            <p className="page-subtitle">Escolha sua próxima missão</p>
          </div>
          
          <div className="player-stats-bar">
            <div className="stat-pill">
              <span className="stat-icon">📊</span>
              <span className="stat-label">Nível</span>
              <span className="stat-value">{playerStats.level}</span>
            </div>
            <div className="stat-pill money">
              <span className="stat-icon">💰</span>
              <span className="stat-label">Dinheiro</span>
              <span className="stat-value">${playerStats.money.toLocaleString()}</span>
            </div>
            <div className="stat-pill xp">
              <span className="stat-icon">⭐</span>
              <span className="stat-label">XP</span>
              <span className="stat-value">{playerStats.xp.toLocaleString()}</span>
              <div className="xp-progress">
                <div className="xp-fill" style={{ width: `${getLevelProgress()}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="content-area">
          {activeNav === 'contracts' && (
            <>
              <div className="contracts-grid">
                {contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className={`contract-card ${selectedContract?.id === contract.id ? 'selected' : ''}`}
                    onClick={() => setSelectedContract(contract)}
                  >
                    <div className="contract-header">
                      <span 
                        className="contract-tier"
                        style={{ backgroundColor: getTierColor(contract.tier) }}
                      >
                        {contract.tier}
                      </span>
                      <span className="contract-location">{contract.location}</span>
                    </div>
                    <div className="car-visual">
                      {(() => {
                        const src = getRankedCarPreviewSrc(contract?.targetModel?.tier, contract?.targetModel?.slug)
                        if (failedSprites[contract.id] || !src) {
                          return (
                            <span 
                              className="car-emoji"
                              style={{ color: getTierColor(contract.tier) }}
                            >
                              🚗
                            </span>
                          )
                        }
                        return (
                          <img
                            className="car-sprite"
                            src={src}
                            alt={contract?.targetModel?.name || contract.carType}
                            onError={() => setFailedSprites((prev) => ({ ...prev, [contract.id]: true }))}
                          />
                        )
                      })()}
                    </div>
                    <div className="contract-body">
                      <h3 className="car-type">{contract.carType}</h3>
                      <div className="contract-details">
                        <div className="detail-row">
                          <span className="detail-label">Recompensa</span>
                          <span className="detail-value reward">${contract.reward.toLocaleString()}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Heat</span>
                          <div className="heat-indicator">
                            {[...Array(5)].map((_, i) => (
                              <span 
                                key={i} 
                                className={`heat-dot ${i < contract.heatLevel ? 'active' : ''}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Tempo</span>
                          <span className="detail-value">{contract.timeLimit}s</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                className="start-button"
                onClick={handleStart}
                disabled={!selectedContract}
              >
                {selectedContract ? `Iniciar Contrato ${selectedContract.tier}` : 'Selecione um Contrato'}
              </button>
            </>
          )}

          {activeNav === 'dashboard' && (
            <div className="dashboard-panel">
              <h2>Dashboard</h2>
              <p>Bem-vindo de volta, {profile?.name}!</p>
              <div className="dashboard-stats">
                <div className="stat-card">
                  <span className="stat-card-icon">🎯</span>
                  <span className="stat-card-value">{playerStats.missionsCompleted || 0}</span>
                  <span className="stat-card-label">Missões Completas</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card-icon">🚗</span>
                  <span className="stat-card-value">{playerStats.carsStolen || 0}</span>
                  <span className="stat-card-label">Carros Roubados</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card-icon">💵</span>
                  <span className="stat-card-value">${playerStats.money.toLocaleString()}</span>
                  <span className="stat-card-label">Dinheiro Total</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Menu
