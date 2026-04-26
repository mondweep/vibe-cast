import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

export const api = {
  // Session management
  createSession: (config) =>
    client.post('/game/session', {
      playerName: 'Admin',
      difficulty: config.difficulty,
      gameMode: config.gameMode
    }).then(res => res.data),

  getSession: (sessionId) =>
    client.get(`/game/session/${sessionId}`).then(res => res.data),

  joinSession: (sessionId, playerData) =>
    client.post(`/game/session/${sessionId}/join`, playerData).then(res => res.data),

  startSession: (sessionId) =>
    client.post(`/game/session/${sessionId}/start`).then(res => res.data),

  endSession: (sessionId) =>
    client.post(`/game/session/${sessionId}/end`).then(res => res.data),

  // Challenge management
  getCurrentChallenge: (sessionId) =>
    client.get(`/game/session/${sessionId}/next-challenge`).then(res => res.data),

  getNextChallenge: (sessionId) =>
    client.get(`/game/session/${sessionId}/next-challenge`).then(res => res.data),

  submitAnswer: (sessionId, playerId, answer) =>
    client.post(`/game/session/${sessionId}/answer`, {
      playerId,
      answer
    }).then(res => res.data),

  // Leaderboard
  getLeaderboard: (sessionId) =>
    client.get(`/game/session/${sessionId}/leaderboard`).then(res => res.data),

  // Weather
  getWeather: (latitude, longitude) =>
    client.get('/weather/current', {
      params: { latitude, longitude }
    }).then(res => res.data),

  getWeatherBatch: (locations) =>
    client.post('/weather/batch', { locations }).then(res => res.data),

  getWeatherStats: (locations) =>
    client.post('/weather/statistics', { locations }).then(res => res.data)
};

export default api;
