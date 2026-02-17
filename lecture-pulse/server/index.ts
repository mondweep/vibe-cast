import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { sessionManager } from "./session.ts";
import { aggregateStats } from "./aggregator.ts";
import type { DashboardState, TimelineEntry } from "../src/types/index.ts";

// ---------------------------------------------------------------------------
// Express setup
// ---------------------------------------------------------------------------

const app = express();
const server = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static production build from ../dist
const distPath = path.resolve(__dirname, "..", "dist");
app.use(express.static(distPath));

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// SPA fallback — serve index.html for any non-API/non-static route
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// ---------------------------------------------------------------------------
// WebSocket setup
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ server, path: "/ws" });

/**
 * Track each WebSocket connection's role and associated room/nickname.
 * A "dashboard" connection watches a room's aggregate stats.
 * A "student" connection sends posture updates from a room.
 */
interface ConnectionMeta {
  role: "dashboard" | "student" | "unknown";
  roomCode: string | null;
  nickname: string | null;
}

const connectionMeta = new Map<WebSocket, ConnectionMeta>();

/** Send a JSON message to a WebSocket client */
function sendJSON(ws: WebSocket, data: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/** Broadcast a message to all students in a given room */
function broadcastToStudents(roomCode: string, data: unknown): void {
  for (const [ws, meta] of connectionMeta) {
    if (meta.role === "student" && meta.roomCode === roomCode) {
      sendJSON(ws, data);
    }
  }
}

/** Broadcast a message to all dashboard connections for a given room */
function broadcastToDashboards(roomCode: string, data: unknown): void {
  for (const [ws, meta] of connectionMeta) {
    if (meta.role === "dashboard" && meta.roomCode === roomCode) {
      sendJSON(ws, data);
    }
  }
}

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------

interface IncomingMessage {
  type: string;
  roomCode?: string;
  nickname?: string;
  score?: number;
  headTilt?: number;
  shoulderDelta?: number;
  timestamp?: number;
  duration?: number;
}

function handleMessage(ws: WebSocket, raw: string): void {
  let msg: IncomingMessage;
  try {
    msg = JSON.parse(raw) as IncomingMessage;
  } catch {
    sendJSON(ws, { type: "error", message: "Invalid JSON" });
    return;
  }

  switch (msg.type) {
    // ------------------------------------------------------------------
    // Presenter creates a session
    // ------------------------------------------------------------------
    case "create_session": {
      const roomCode = sessionManager.createSession();
      const meta = connectionMeta.get(ws);
      if (meta) {
        meta.role = "dashboard";
        meta.roomCode = roomCode;
      }
      sendJSON(ws, { type: "session_created", roomCode });
      console.log(`[session] Created room ${roomCode}`);
      break;
    }

    // ------------------------------------------------------------------
    // Student joins a session
    // ------------------------------------------------------------------
    case "join_session": {
      const { roomCode, nickname } = msg;
      if (!roomCode || !nickname) {
        sendJSON(ws, { type: "error", message: "roomCode and nickname are required" });
        return;
      }
      const success = sessionManager.joinSession(roomCode, nickname);
      if (success) {
        const meta = connectionMeta.get(ws);
        if (meta) {
          meta.role = "student";
          meta.roomCode = roomCode;
          meta.nickname = nickname;
        }
        sendJSON(ws, { type: "join_confirmed", roomCode, nickname });
        console.log(`[session] ${nickname} joined room ${roomCode}`);
      } else {
        sendJSON(ws, {
          type: "error",
          message: "Could not join: room not found or nickname already taken",
        });
      }
      break;
    }

    // ------------------------------------------------------------------
    // Student sends posture update
    // ------------------------------------------------------------------
    case "posture_update": {
      const { roomCode, nickname, score, headTilt, shoulderDelta } = msg;
      if (
        !roomCode ||
        !nickname ||
        score === undefined ||
        headTilt === undefined ||
        shoulderDelta === undefined
      ) {
        sendJSON(ws, { type: "error", message: "Missing posture_update fields" });
        return;
      }
      sessionManager.updateScore(roomCode, nickname, score, headTilt, shoulderDelta);
      break;
    }

    // ------------------------------------------------------------------
    // Presenter triggers a stretch break
    // ------------------------------------------------------------------
    case "trigger_stretch_break": {
      const { roomCode, duration } = msg;
      if (!roomCode || !duration) {
        sendJSON(ws, { type: "error", message: "roomCode and duration are required" });
        return;
      }
      broadcastToStudents(roomCode, {
        type: "stretch_break",
        duration,
      });
      // Also notify dashboards so they can show break state
      broadcastToDashboards(roomCode, {
        type: "stretch_break",
        duration,
      });
      console.log(`[session] Stretch break triggered in room ${roomCode} for ${duration}s`);
      break;
    }

    // ------------------------------------------------------------------
    // Presenter ends the session
    // ------------------------------------------------------------------
    case "end_session": {
      const { roomCode } = msg;
      if (!roomCode) {
        sendJSON(ws, { type: "error", message: "roomCode is required" });
        return;
      }
      // Notify all students the session has ended
      broadcastToStudents(roomCode, { type: "session_ended", roomCode });
      broadcastToDashboards(roomCode, { type: "session_ended", roomCode });

      // Clean up connection metadata for all clients in this room
      for (const [clientWs, meta] of connectionMeta) {
        if (meta.roomCode === roomCode) {
          meta.roomCode = null;
          meta.nickname = null;
          meta.role = "unknown";
          // Close student connections gracefully
          if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(1000, "Session ended");
          }
        }
      }

      sessionManager.endSession(roomCode);
      console.log(`[session] Room ${roomCode} ended`);
      break;
    }

    // ------------------------------------------------------------------
    // Allow a dashboard to subscribe to an existing room (reconnect, etc.)
    // ------------------------------------------------------------------
    case "subscribe_dashboard": {
      const { roomCode } = msg;
      if (!roomCode) {
        sendJSON(ws, { type: "error", message: "roomCode is required" });
        return;
      }
      const session = sessionManager.getSession(roomCode);
      if (!session) {
        sendJSON(ws, { type: "error", message: "Room not found" });
        return;
      }
      const meta = connectionMeta.get(ws);
      if (meta) {
        meta.role = "dashboard";
        meta.roomCode = roomCode;
      }
      sendJSON(ws, { type: "subscribed_dashboard", roomCode });
      break;
    }

    default:
      sendJSON(ws, { type: "error", message: `Unknown message type: ${msg.type}` });
  }
}

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------

wss.on("connection", (ws: WebSocket) => {
  connectionMeta.set(ws, { role: "unknown", roomCode: null, nickname: null });

  ws.on("message", (data: Buffer | ArrayBuffer | Buffer[]) => {
    const raw = data.toString();
    handleMessage(ws, raw);
  });

  ws.on("close", () => {
    const meta = connectionMeta.get(ws);
    if (meta) {
      // If a student disconnects, remove them from their session
      if (meta.role === "student" && meta.roomCode && meta.nickname) {
        sessionManager.leaveSession(meta.roomCode, meta.nickname);
        console.log(`[session] ${meta.nickname} left room ${meta.roomCode} (disconnected)`);
      }
      connectionMeta.delete(ws);
    }
  });

  ws.on("error", (err: Error) => {
    console.error("[ws] Connection error:", err.message);
  });
});

// ---------------------------------------------------------------------------
// Periodic dashboard broadcast (every 2 seconds)
// ---------------------------------------------------------------------------

const BROADCAST_INTERVAL_MS = 2000;

setInterval(() => {
  const allSessions = sessionManager.getAllSessions();

  for (const [roomCode, session] of allSessions) {
    // Append current average to the timeline
    const students = Array.from(session.students.values());
    if (students.length > 0) {
      const avg =
        Math.round(
          (students.reduce((sum, s) => sum + s.score, 0) / students.length) * 10,
        ) / 10;
      const entry: TimelineEntry = {
        time: new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        score: avg,
      };
      session.timeline.push(entry);

      // Cap timeline at 1800 entries (~1 hour at 2s intervals) to prevent memory bloat
      if (session.timeline.length > 1800) {
        session.timeline.splice(0, session.timeline.length - 1800);
      }
    }

    // Build and broadcast the dashboard state
    const dashboardState: DashboardState = aggregateStats(session);
    broadcastToDashboards(roomCode, dashboardState);
  }
}, BROADCAST_INTERVAL_MS);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`LecturePulse server running on port ${PORT}`);
});

export { app, server };
