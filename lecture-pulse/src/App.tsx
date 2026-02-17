import { useRef, useEffect, useCallback, useState } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import JoinSession from "@/components/student/JoinSession";
import CameraView from "@/components/student/CameraView";
import PostureScore from "@/components/student/PostureScore";
import PostureNudge from "@/components/student/PostureNudge";
import StretchMode from "@/components/student/StretchMode";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWebSocket } from "@/hooks/useWebSocket";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import { usePostureScore } from "@/hooks/usePostureScore";
import Footer from "@/components/shared/Footer";

// ─── Join Page (route: /) ────────────────────────────────────────

function JoinPage() {
  const navigate = useNavigate();

  const handleJoin = useCallback(
    (roomCode: string, nickname: string) => {
      navigate("/session", { state: { roomCode, nickname } });
    },
    [navigate],
  );

  return <JoinSession onJoin={handleJoin} />;
}

// ─── Session Page (route: /session) ──────────────────────────────

interface SessionLocationState {
  roomCode: string;
  nickname: string;
}

function SessionPage() {
  const location = useLocation();
  const state = location.state as SessionLocationState | null;

  // Redirect to join page if no state
  if (!state?.roomCode || !state?.nickname) {
    return <Navigate to="/" replace />;
  }

  return <SessionView roomCode={state.roomCode} nickname={state.nickname} />;
}

function SessionView({ roomCode, nickname }: { roomCode: string; nickname: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const navigate = useNavigate();

  // 1. WebSocket connection
  const { isConnected, sendPostureUpdate, stretchBreak, sessionEnded, error: wsError } =
    useWebSocket(roomCode, nickname);

  // Redirect to join page after session ends (short delay so user sees the message)
  useEffect(() => {
    if (!sessionEnded) return;
    const timer = setTimeout(() => navigate("/", { replace: true }), 3000);
    return () => clearTimeout(timer);
  }, [sessionEnded, navigate]);

  // 2. Pose detection on camera feed
  const { landmarks, isLoading: poseLoading, error: poseError } = usePoseDetection(videoRef);

  // 3. Posture scoring from landmarks
  const { score, classification, headTilt, shoulderDelta, isTracking } =
    usePostureScore(landmarks);

  // 4. Send posture updates to server whenever score changes
  const prevScoreRef = useRef<number | null>(null);

  useEffect(() => {
    if (isTracking && prevScoreRef.current !== score) {
      prevScoreRef.current = score;
      sendPostureUpdate(score, headTilt, shoulderDelta);
    }
  }, [score, headTilt, shoulderDelta, isTracking, sendPostureUpdate]);

  // 5. Stretch break state management
  const [stretchDismissed, setStretchDismissed] = useState(false);

  const handleStretchComplete = useCallback(() => {
    setStretchDismissed(true);
  }, []);

  // Reset dismissed flag when a new stretch break arrives
  const lastStretchRef = useRef(stretchBreak);
  useEffect(() => {
    if (stretchBreak && stretchBreak !== lastStretchRef.current) {
      lastStretchRef.current = stretchBreak;
      setStretchDismissed(false);
    }
  }, [stretchBreak]);

  const showStretch = stretchBreak !== null && !stretchDismissed;

  return (
    <div className="flex min-h-dvh flex-col bg-dark-900 text-white">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected ? "bg-accent-green animate-pulse" : "bg-accent-red"
            }`}
          />
          <span className="text-sm text-dark-400">
            {isConnected ? "Connected" : "Connecting..."}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-dark-800 px-3 py-1 text-xs font-mono font-bold tracking-wider text-dark-300">
            {roomCode}
          </span>
          <span className="text-sm font-medium text-dark-200">{nickname}</span>
        </div>
      </header>

      {/* Error banner */}
      {(wsError || poseError) && (
        <div className="mx-4 mb-2 rounded-xl bg-accent-red/10 border border-accent-red/30 px-4 py-2 text-sm text-accent-red">
          {wsError || poseError}
        </div>
      )}

      {/* Loading indicator for pose model */}
      {poseLoading && (
        <div className="mx-4 mb-2 rounded-xl bg-accent-blue/10 border border-accent-blue/30 px-4 py-2 text-sm text-accent-blue">
          Loading pose detection model...
        </div>
      )}

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center gap-6 px-4 pb-6">
        {/* Camera feed with skeleton */}
        <CameraView videoRef={videoRef} landmarks={landmarks} isTracking={isTracking} />

        {/* Posture score arc */}
        <PostureScore score={score} classification={classification} />
      </main>

      {/* Posture nudge (fixed bottom overlay) */}
      <PostureNudge score={score} />

      {/* Stretch break overlay */}
      {showStretch && stretchBreak && (
        <StretchMode duration={stretchBreak.duration} onComplete={handleStretchComplete} />
      )}

      {/* Session ended overlay */}
      {sessionEnded && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark-950/95 backdrop-blur-md">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-blue/20">
            <svg
              className="h-8 w-8 text-accent-blue"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">Session Ended</h2>
          <p className="text-dark-400">The presenter has ended this session.</p>
          <p className="mt-4 text-sm text-dark-500">Returning to home screen...</p>
        </div>
      )}

      <Footer />
    </div>
  );
}

// ─── Root App ────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<JoinPage />} />
      <Route path="/session" element={<SessionPage />} />
      <Route path="/dashboard" element={<DashboardLayout />} />
    </Routes>
  );
}
