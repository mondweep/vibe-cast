/**
 * useSocket Hook
 *
 * Manages Socket.io connection with automatic reconnection,
 * authentication, and event handling.
 */

'use client';

import { useEffect, useRef, useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  url?: string;
  autoConnect?: boolean;
  auth?: Record<string, unknown>;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  emit: <T = unknown>(event: string, data?: T) => void;
  on: <T = unknown>(event: string, callback: (data: T) => void) => () => void;
  off: (event: string, callback?: (...args: unknown[]) => void) => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const {
    url = process.env['NEXT_PUBLIC_SOCKET_URL'] ?? '',
    autoConnect = true,
    auth = {},
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Initialize socket connection
  useEffect(() => {
    if (!url) {
      console.warn('Socket URL not provided');
      return;
    }

    const socket = io(url, {
      autoConnect: false,
      auth,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts,
      reconnectionDelay,
      timeout: 10000,
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setError(null);
      reconnectAttemptsRef.current = 0;
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('Socket disconnected:', reason);

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt to reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      setError(new Error(`Connection error: ${err.message}`));
      setIsConnected(false);
      console.error('Socket connection error:', err);
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      setIsReconnecting(true);
      reconnectAttemptsRef.current = attempt;
      console.log('Reconnection attempt:', attempt);
    });

    socket.io.on('reconnect', (attempt) => {
      setIsReconnecting(false);
      setIsConnected(true);
      setError(null);
      console.log('Reconnected after', attempt, 'attempts');
    });

    socket.io.on('reconnect_failed', () => {
      setIsReconnecting(false);
      setError(new Error('Failed to reconnect after maximum attempts'));
      console.error('Reconnection failed');
    });

    // Auto connect if enabled
    if (autoConnect) {
      socket.connect();
    }

    // Cleanup on unmount
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [url, autoConnect, reconnectionAttempts, reconnectionDelay]);

  // Manual connect
  const connect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  // Manual disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.disconnect();
    }
  }, []);

  // Emit event
  const emit = useCallback(<T = unknown>(event: string, data?: T) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Cannot emit event: socket not connected');
    }
  }, []);

  // Subscribe to event
  const on = useCallback(<T = unknown>(
    event: string,
    callback: (data: T) => void
  ): (() => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback as (...args: unknown[]) => void);
    }

    // Return unsubscribe function
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, callback as (...args: unknown[]) => void);
      }
    };
  }, []);

  // Unsubscribe from event
  const off = useCallback((
    event: string,
    callback?: (...args: unknown[]) => void
  ) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    isReconnecting,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
}

// Socket context for sharing connection across components
interface SocketContextValue extends UseSocketReturn {}

const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
  options?: UseSocketOptions;
}

export function SocketProvider({ children, options }: SocketProviderProps) {
  const socket = useSocket(options);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
