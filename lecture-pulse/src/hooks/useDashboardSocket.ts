import { useRef, useEffect, useState, useCallback } from "react";
import type { DashboardState } from "../types";
import { SERVER_PORT } from "../lib/constants";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

export interface UseDashboardSocketReturn {
  isConnected: boolean;
  dashboardState: DashboardState | null;
  roomCode: string | null;
  sessionActive: boolean;
  error: string | null;
  createSession: () => void;
  endSession: () => void;
  triggerStretch: (duration?: number) => void;
}

const EMPTY: DashboardState = {
  type: "dashboard_state",
  participantCount: 0,
  averageScore: 0,
  distribution: { good: 0, fair: 0, poor: 0 },
  leaderboard: [],
  timeline: [],
};

/**
 * React hook that manages the presenter dashboard WebSocket connection.
 *
 * - Connects to ws://<host>:<SERVER_PORT>
 * - Exposes createSession / endSession / triggerStretch actions
 * - Listens for dashboard_state, session_created, session_ended messages
 * - Reconnects on disconnect (up to MAX_RETRIES)
 * - Cleans up on unmount
 */
export function useDashboardSocket(): UseDashboardSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const unmountedRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [dashboardState, setDashboardState] = useState<DashboardState>(EMPTY);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Send helper ────────────────────────────────────────────
  const send = useCallback((data: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  // ── Connect ────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const url = `${proto}//${host}:${SERVER_PORT}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        retriesRef.current = 0;

        // Identify as dashboard role
        ws.send(JSON.stringify({ type: "subscribe_dashboard" }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as Record<string, unknown>;

          switch (msg.type) {
            case "session_created": {
              setRoomCode(msg.roomCode as string);
              setSessionActive(true);
              break;
            }
            case "dashboard_state": {
              setDashboardState(msg as unknown as DashboardState);
              break;
            }
            case "session_ended": {
              setSessionActive(false);
              setRoomCode(null);
              setDashboardState(EMPTY);
              break;
            }
            default:
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection error");
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        if (!unmountedRef.current && retriesRef.current < MAX_RETRIES) {
          retriesRef.current += 1;
          setTimeout(() => connect(), RETRY_DELAY_MS);
        } else if (!unmountedRef.current && retriesRef.current >= MAX_RETRIES) {
          setError("Unable to connect after multiple attempts");
        }
      };
    } catch {
      setError("Failed to create WebSocket connection");
    }
  }, []);

  // ── Actions ────────────────────────────────────────────────
  const createSession = useCallback(() => {
    send({ type: "create_session" });
  }, [send]);

  const endSession = useCallback(() => {
    send({ type: "end_session", roomCode });
  }, [send, roomCode]);

  const triggerStretch = useCallback(
    (duration = 30) => {
      send({ type: "trigger_stretch", roomCode, duration });
    },
    [send, roomCode],
  );

  // ── Lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    dashboardState,
    roomCode,
    sessionActive,
    error,
    createSession,
    endSession,
    triggerStretch,
  };
}
