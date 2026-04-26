import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import gameRoutes from './routes/game.js';
import weatherRoutes from './routes/weather.js';
import { setupWebSocket } from './websocket/handler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/game', gameRoutes);
app.use('/api/weather', weatherRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket setup
setupWebSocket(wss);

server.listen(port, () => {
  console.log(`🎮 Weather Game Server running on http://localhost:${port}`);
  console.log(`🔌 WebSocket server ready on ws://localhost:${port}`);
  console.log(`📊 Game specification: weather-game-spec.aisp`);
});

export default app;
