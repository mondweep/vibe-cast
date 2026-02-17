import { useRef, useEffect, useState, useCallback } from "react";
import type { StretchBreak } from "@/types";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export interface UseWebSocketReturn {
  isConnected: boolean;
  sendPostureUpdate: (score: number, headTilt: number, shoulderDelta: number) => void;
  stretchBreak: StretchBreak | null;
  sessionEnded: boolean;
  error: string | null;
}

/**
 * React hook that manages a WebSocket connection to the LecturePulse server.
 *
 * - Connects to ws://<host>/ws
 * - On connect: sends a join_session message
 * - Exposes sendPostureUpdate() to push posture data
 * - Listens for stretch_break messages from the server
 * - Reconnects on disconnect (up to MAX_RETRIES with RETRY_DELAY_MS)
 * - Cleans up on unmount
 */
export function useWebSocket(
  roomCode: string,
  nickname: string,
): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const unmountedRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [stretchBreak, setStretchBreak] = useState<StretchBreak | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When set to true, prevents reconnection attempts (e.g. after session_ended)
  const noReconnectRef = useRef(false);

  const roomCodeRef = useRef(roomCode);
  const nicknameRef = useRef(nickname);
  roomCodeRef.current = roomCode;
  nicknameRef.current = nickname;

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        retriesRef.current = 0;

        ws.send(
          JSON.stringify({
            type: "join_session",
            roomCode: roomCodeRef.current,
            nickname: nicknameRef.current,
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as { type: string; duration?: number };
          if (data.type === "stretch_break") {
            setStretchBreak(data as StretchBreak);
          } else if (data.type === "session_ended") {
            // Presenter ended the session — stop reconnecting and notify UI
            noReconnectRef.current = true;
            setSessionEnded(true);
            setIsConnected(false);
            ws.close();
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

        // Don't reconnect if session ended gracefully or component unmounted
        if (noReconnectRef.current || unmountedRef.current) return;

        if (retriesRef.current < MAX_RETRIES) {
          retriesRef.current += 1;
          setTimeout(() => {
            connect();
          }, RETRY_DELAY_MS);
        } else {
          setError("Unable to connect after multiple attempts");
        }
      };
    } catch {
      setError("Failed to create WebSocket connection");
    }
  }, []);

  const sendPostureUpdate = useCallback(
    (score: number, headTilt: number, shoulderDelta: number) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "posture_update",
            roomCode: roomCodeRef.current,
            nickname: nicknameRef.current,
            score,
            headTilt,
            shoulderDelta,
            timestamp: Date.now(),
          }),
        );
      }
    },
    [],
  );

  useEffect(() => {
    unmountedRef.current = false;
    if (roomCode && nickname) {
      connect();
    }

    return () => {
      unmountedRef.current = true;
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [roomCode, nickname, connect]);

  return { isConnected, sendPostureUpdate, stretchBreak, sessionEnded, error };
}
