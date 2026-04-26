export function setupWebSocket(wss) {
  const sessionConnections = new Map();

  wss.on('connection', (ws) => {
    console.log('🔌 New WebSocket connection');

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleMessage(ws, message, sessionConnections, wss);
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket disconnected');
      sessionConnections.forEach((clients) => {
        const index = clients.indexOf(ws);
        if (index > -1) clients.splice(index, 1);
      });
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return { sessionConnections };
}

function handleMessage(ws, message, sessionConnections, wss) {
  const { type, sessionId, playerId, payload } = message;

  switch (type) {
    case 'join-session':
      handleJoinSession(ws, sessionId, playerId, sessionConnections);
      break;

    case 'leave-session':
      handleLeaveSession(ws, sessionId, sessionConnections);
      break;

    case 'challenge-started':
      broadcastToSession(sessionId, {
        type: 'challenge-update',
        challenge: payload,
        timestamp: new Date().toISOString()
      }, sessionConnections);
      break;

    case 'answer-submitted':
      broadcastToSession(sessionId, {
        type: 'leaderboard-update',
        leaderboard: payload.leaderboard,
        playerScore: payload.score,
        playerId,
        timestamp: new Date().toISOString()
      }, sessionConnections);
      break;

    case 'game-state-update':
      broadcastToSession(sessionId, {
        type: 'state-update',
        state: payload,
        timestamp: new Date().toISOString()
      }, sessionConnections);
      break;

    case 'chat-message':
      broadcastToSession(sessionId, {
        type: 'chat',
        playerId,
        message: payload.message,
        timestamp: new Date().toISOString()
      }, sessionConnections);
      break;

    default:
      console.warn('Unknown message type:', type);
  }
}

function handleJoinSession(ws, sessionId, playerId, sessionConnections) {
  if (!sessionConnections.has(sessionId)) {
    sessionConnections.set(sessionId, []);
  }

  sessionConnections.get(sessionId).push(ws);

  broadcastToSession(sessionId, {
    type: 'player-joined',
    playerId,
    totalPlayers: sessionConnections.get(sessionId).length,
    timestamp: new Date().toISOString()
  }, sessionConnections);

  ws.send(JSON.stringify({
    type: 'session-joined',
    sessionId,
    playerId
  }));
}

function handleLeaveSession(ws, sessionId, sessionConnections) {
  const clients = sessionConnections.get(sessionId);
  if (clients) {
    const index = clients.indexOf(ws);
    if (index > -1) {
      clients.splice(index, 1);
    }

    broadcastToSession(sessionId, {
      type: 'player-left',
      totalPlayers: clients.length,
      timestamp: new Date().toISOString()
    }, sessionConnections);
  }
}

function broadcastToSession(sessionId, message, sessionConnections) {
  const clients = sessionConnections.get(sessionId);
  if (!clients) return;

  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(data);
    }
  });
}

export { broadcastToSession };
