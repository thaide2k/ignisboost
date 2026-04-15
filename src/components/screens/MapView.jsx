import { useState, useEffect } from 'react';
import { generateMap, TILE_COLORS, TILE_SIZE } from '../../systems/mapSystem';
import './MapView.css';

export default function MapView({ onStartGame, onBack }) {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const map = generateMap();
    setMapData({ ...map, grid: map.tiles });
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="mapview-container">
        <div className="mapview-loading">Carregando mapa...</div>
      </div>
    );
  }

  const tileSize = Math.max(4, Math.floor(500 / mapData.width));

  return (
    <div className="mapview-container">
      <div className="mapview-header">
        <button className="mapview-back-btn" onClick={onBack}>← Voltar</button>
        <h1>🗺️ {mapData.name}</h1>
      </div>

      <div className="mapview-stats">
        <div className="stat">
          <span className="stat-label">Tamanho</span>
          <span className="stat-value">{mapData.width}x{mapData.height}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Ruas</span>
          <span className="stat-value">{mapData.stats.roads}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Prédios</span>
          <span className="stat-value">{mapData.stats.buildings}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Explorado</span>
          <span className="stat-value">0%</span>
        </div>
      </div>

      <div className="mapview-map-container">
        <div 
          className="mapview-map"
          style={{
            width: mapData.width * tileSize,
            height: mapData.height * tileSize,
          }}
        >
          {mapData.grid.map((row, y) => (
            row.map((tileType, x) => {
              const [r, g, b] = TILE_COLORS[tileType];
              const isVisible = true;
              
              return (
                <div
                  key={`${x}-${y}`}
                  className={`mapview-tile ${tileType === 1 ? 'road' : tileType === 2 ? 'building' : ''}`}
                  style={{
                    left: x * tileSize,
                    top: y * tileSize,
                    width: tileSize,
                    height: tileSize,
                    backgroundColor: `rgb(${r},${g},${b})`,
                    opacity: isVisible ? 1 : 0.1,
                  }}
                />
              );
            })
          ))}
          
          {mapData.spawnPoints.slice(0, 3).map((spawn, i) => (
            <div
              key={`spawn-${i}`}
              className="spawn-marker"
              style={{
                left: spawn.x * tileSize + tileSize / 2,
                top: spawn.y * tileSize + tileSize / 2,
              }}
            >
              🚗
            </div>
          ))}
        </div>
      </div>

      <div className="mapview-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'rgb(0,0,0)' }} />
          <span>Rua</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'rgb(128,128,128)' }} />
          <span>Prédio</span>
        </div>
        <div className="legend-item">
          <span className="spawn-icon">🚗</span>
          <span>Spawn</span>
        </div>
      </div>

      <div className="mapview-actions">
        <button className="start-btn" onClick={onStartGame}>
          🚀 Iniciar Jogo
        </button>
      </div>
    </div>
  );
}