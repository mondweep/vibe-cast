import { v4 as uuidv4 } from 'uuid';
import { ChallengeGenerator } from './ChallengeGenerator.js';
import { ScoringEngine } from './ScoringEngine.js';
import { WeatherService } from '../services/WeatherService.js';

export class GameManager {
  constructor() {
    this.sessions = new Map();
    this.challengeGenerator = new ChallengeGenerator();
    this.scoringEngine = new ScoringEngine();
    this.weatherService = new WeatherService();
  }

  createSession(config) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      players: [],
      challenges: [],
      currentChallenge: null,
      currentChallengeIndex: 0,
      startTime: null,
      endTime: null,
      status: 'setup',
      leaderboard: [],
      config,
      createdAt: new Date()
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async addPlayerToSession(sessionId, playerData) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'setup' && session.status !== 'active') {
      throw new Error('Cannot join session in current status');
    }

    const weather = await this.weatherService.getWeather(
      playerData.latitude,
      playerData.longitude
    );

    const player = {
      id: uuidv4(),
      name: playerData.playerName,
      location: {
        latitude: playerData.latitude,
        longitude: playerData.longitude,
        address: playerData.address || '',
        timezone: 'UTC'
      },
      weather,
      score: 0,
      status: 'active',
      challengeResults: [],
      avatar: this.getAvatarForWeather(weather.condition)
    };

    session.players.push(player);
    return player;
  }

  startSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'setup') {
      throw new Error('Session already started');
    }

    session.status = 'active';
    session.startTime = new Date();

    // Generate challenges based on player diversity
    const playerWeathers = session.players.map(p => p.weather);
    session.challenges = this.challengeGenerator.generateChallenges(
      session.config.challengeCount,
      session.config.difficulty,
      playerWeathers
    );

    session.currentChallenge = session.challenges[0];
    session.currentChallengeIndex = 0;

    return session;
  }

  async submitAnswer(sessionId, playerId, answer) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const player = session.players.find(p => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const challenge = session.currentChallenge;
    if (!challenge) throw new Error('No active challenge');

    const result = this.scoringEngine.evaluateAnswer(
      answer,
      challenge,
      player.weather
    );

    player.challengeResults.push({
      challengeId: challenge.id,
      ...result
    });

    player.score += result.score;
    this.updateLeaderboard(session);

    return result;
  }

  getNextChallenge(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    if (session.currentChallengeIndex < session.challenges.length - 1) {
      session.currentChallengeIndex++;
      session.currentChallenge = session.challenges[session.currentChallengeIndex];
      return session.currentChallenge;
    }

    session.status = 'completed';
    return null;
  }

  updateLeaderboard(session) {
    session.leaderboard = [...session.players].sort((a, b) => b.score - a.score);
  }

  getLeaderboard(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    return session.leaderboard.map((player, index) => ({
      rank: index + 1,
      name: player.name,
      score: player.score,
      avatar: player.avatar,
      weather: player.weather.condition,
      location: player.location.address
    }));
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.status = 'completed';
    session.endTime = new Date();

    return session.leaderboard.map((player, index) => ({
      rank: index + 1,
      name: player.name,
      score: player.score
    }));
  }

  getAvatarForWeather(condition) {
    const avatars = {
      'sunny': '☀️',
      'cloudy': '☁️',
      'rainy': '🌧️',
      'snowy': '❄️',
      'stormy': '⛈️',
      'clear': '🌙'
    };
    return avatars[condition] || '🌍';
  }
}
