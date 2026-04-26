import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { GameManager } from '../game/GameManager.js';
import { ChallengeGenerator } from '../game/ChallengeGenerator.js';

const router = express.Router();
const gameManager = new GameManager();

// Create a new game session
router.post('/session', async (req, res) => {
  try {
    const { playerName, difficulty = 'medium', gameMode = 'competitive' } = req.body;

    if (!playerName) {
      return res.status(400).json({ error: 'Player name required' });
    }

    const config = {
      gameMode,
      challengeCount: 5,
      timePerChallenge: difficulty === 'easy' ? 30 : difficulty === 'hard' ? 120 : 60,
      difficulty,
      minPlayers: 1,
      maxPlayers: 100
    };

    const session = gameManager.createSession(config);
    res.status(201).json({
      sessionId: session.id,
      config: session.config,
      message: 'Game session created. Waiting for players...'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get game session details
router.get('/session/:sessionId', (req, res) => {
  try {
    const session = gameManager.getSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Join a game session
router.post('/session/:sessionId/join', async (req, res) => {
  try {
    const { playerName, latitude, longitude, location } = req.body;

    if (!playerName || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Player name, latitude, and longitude required'
      });
    }

    const session = gameManager.getSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const player = await gameManager.addPlayerToSession(
      req.params.sessionId,
      { playerName, latitude, longitude, address: location }
    );

    res.status(201).json({
      playerId: player.id,
      playerName: player.name,
      weather: player.weather,
      message: 'Successfully joined game'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start game session
router.post('/session/:sessionId/start', (req, res) => {
  try {
    const session = gameManager.startSession(req.params.sessionId);
    res.json({
      message: 'Game started',
      currentChallenge: session.currentChallenge,
      players: session.players.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit answer to current challenge
router.post('/session/:sessionId/answer', async (req, res) => {
  try {
    const { playerId, answer } = req.body;

    if (!playerId || answer === undefined) {
      return res.status(400).json({
        error: 'Player ID and answer required'
      });
    }

    const result = await gameManager.submitAnswer(
      req.params.sessionId,
      playerId,
      answer
    );

    res.json({
      score: result.score,
      accuracy: result.accuracy,
      message: 'Answer submitted'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard
router.get('/session/:sessionId/leaderboard', (req, res) => {
  try {
    const leaderboard = gameManager.getLeaderboard(req.params.sessionId);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get next challenge
router.get('/session/:sessionId/next-challenge', (req, res) => {
  try {
    const challenge = gameManager.getNextChallenge(req.params.sessionId);
    res.json(challenge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// End game session
router.post('/session/:sessionId/end', (req, res) => {
  try {
    const finalScores = gameManager.endSession(req.params.sessionId);
    res.json({
      message: 'Game ended',
      finalScores,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
