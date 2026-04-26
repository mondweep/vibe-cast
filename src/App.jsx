import { useState, useEffect } from 'react'
import './App.css'

export default function App() {
  const [location, setLocation] = useState('')
  const [name, setName] = useState('')
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('weatherGamePlayers')
    if (saved) setPlayers(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('weatherGamePlayers', JSON.stringify(players))
  }, [players])

  const addPlayer = async (e) => {
    e.preventDefault()
    if (!name.trim() || !location.trim()) {
      setError('Please enter name and location')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/.netlify/functions/weather', {
        method: 'POST',
        body: JSON.stringify({ location })
      })

      if (!response.ok) throw new Error('Failed to fetch weather')
      const weather = await response.json()

      const newPlayer = {
        id: Date.now(),
        name,
        location,
        temp: weather.temp,
        condition: weather.condition,
        icon: weather.icon,
        timestamp: new Date().toLocaleTimeString()
      }

      setPlayers([...players, newPlayer])
      setName('')
      setLocation('')
    } catch (err) {
      setError('Could not fetch weather. Try another location.')
    } finally {
      setLoading(false)
    }
  }

  const removePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id))
  }

  const sorted = [...players].sort((a, b) => b.temp - a.temp)
  const hottest = sorted[0]
  const coldest = sorted[sorted.length - 1]

  return (
    <div className="container">
      <header>
        <h1>🌍 Global Weather Battle</h1>
        <p>Where are your colleagues? How's the weather?</p>
      </header>

      <form onSubmit={addPlayer} className="form">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
        <input
          type="text"
          placeholder="City name"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Join the Game'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {players.length > 0 && (
        <>
          <div className="stats">
            {hottest && (
              <div className="stat hottest">
                <span className="label">🔥 Hottest</span>
                <span className="name">{hottest.name}</span>
                <span className="temp">{hottest.temp}°C</span>
              </div>
            )}
            {coldest && (
              <div className="stat coldest">
                <span className="label">❄️ Coldest</span>
                <span className="name">{coldest.name}</span>
                <span className="temp">{coldest.temp}°C</span>
              </div>
            )}
            <div className="stat players-count">
              <span className="label">👥 Players</span>
              <span className="count">{players.length}</span>
            </div>
          </div>

          <div className="leaderboard">
            <h2>Leaderboard</h2>
            {sorted.map((player, idx) => (
              <div key={player.id} className="player-card">
                <div className="rank">#{idx + 1}</div>
                <div className="player-info">
                  <div className="player-name">{player.name}</div>
                  <div className="player-location">{player.location}</div>
                  <div className="player-condition">{player.condition}</div>
                </div>
                <div className="temp-display">{player.temp}°</div>
                <button
                  className="remove-btn"
                  onClick={() => removePlayer(player.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {players.length === 0 && (
        <div className="empty-state">
          <p>No players yet. Be the first to join! 🎮</p>
        </div>
      )}
    </div>
  )
}
