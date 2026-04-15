import './Result.css'

function Result({ result, contract, onReturnToMenu }) {
  return (
    <div className="result-container">
      <div className={`result-card ${result.success ? 'success' : 'failed'}`}>
        <div className="result-icon">
          {result.success ? '✓' : '✕'}
        </div>
        
        <h1 className="result-title">
          {result.success ? 'MISSION COMPLETE' : 'MISSION FAILED'}
        </h1>
        
        <p className="result-reason">
          {result.reason === 'timeout' && 'Time ran out!'}
          {result.reason === 'busted' && 'You were caught by the police!'}
          {result.success && `Delivered the ${contract.carType}`}
        </p>
        
        {result.success && (
          <div className="rewards-section">
            <h2 className="rewards-title">Rewards</h2>
            
            <div className="reward-row">
              <span className="reward-label">Money Earned</span>
              <span className="reward-value money">${result.money.toLocaleString()}</span>
            </div>
            
            <div className="reward-row">
              <span className="reward-label">XP Gained</span>
              <span className="reward-value xp">+{result.xp} XP</span>
            </div>
          </div>
        )}
        
        <button className="return-button" onClick={onReturnToMenu}>
          Return to Menu
        </button>
      </div>
    </div>
  )
}

export default Result