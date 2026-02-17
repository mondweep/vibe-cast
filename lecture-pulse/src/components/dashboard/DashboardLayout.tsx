import { useState, useEffect, useRef } from "react";
import { useDashboardSocket } from "../../hooks/useDashboardSocket";
import QRDisplay from "./QRDisplay";
import RoomStats from "./RoomStats";
import EngagementChart from "./EngagementChart";
import Leaderboard from "./Leaderboard";
import PosturePie from "./PosturePie";
import SessionControls from "./SessionControls";
import Footer from "../shared/Footer";

/** Format elapsed seconds as MM:SS. */
function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DashboardLayout() {
  // ── WebSocket (dashboard-specific hook) ──────────────────────
  const {
    isConnected,
    dashboardState,
    roomCode,
    sessionActive,
    error,
    createSession,
    endSession,
    triggerStretch,
  } = useDashboardSocket();

  // ── Elapsed time counter ─────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (sessionActive) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionActive]);

  // ── Join URL for QR code ─────────────────────────────────────
  const joinUrl = roomCode
    ? `${window.location.origin}/join/${roomCode}`
    : "";

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen flex-col gap-4 overflow-hidden bg-[#1a1a2e] p-4 text-white">
      {/* ── Row 0: Session controls + connection indicator ──── */}
      <header className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              isConnected ? "bg-emerald-400" : "bg-red-500"
            }`}
            aria-label={isConnected ? "Connected" : "Disconnected"}
          />
          <span className="text-sm text-slate-500">
            {isConnected ? "Live" : "Connecting..."}
          </span>
          {error && (
            <span className="ml-2 text-sm text-red-400">{error}</span>
          )}
        </div>

        <SessionControls
          onCreateSession={createSession}
          onEndSession={endSession}
          onTriggerStretch={() => triggerStretch(30)}
          sessionActive={sessionActive}
        />
      </header>

      {/* ── Waiting state ──────────────────────────────────── */}
      {!sessionActive && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-3xl font-light text-slate-500">
            Create a session to get started
          </p>
        </div>
      )}

      {/* ── Active session grid ──────────────────────────────── */}
      {sessionActive && dashboardState && (
        <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-[auto_1fr_1fr] gap-4">
          {/* Top-left: QR code (3 cols) */}
          <div className="col-span-3 row-span-1">
            <QRDisplay url={joinUrl} roomCode={roomCode ?? ""} />
          </div>

          {/* Top-right: Room stats (9 cols) */}
          <div className="col-span-9 row-span-1">
            <RoomStats
              participantCount={dashboardState.participantCount}
              averageScore={dashboardState.averageScore}
              sessionDuration={formatDuration(elapsed)}
            />
          </div>

          {/* Middle: Engagement chart (full width) */}
          <div className="col-span-12 row-span-1 min-h-0">
            <EngagementChart timeline={dashboardState.timeline} />
          </div>

          {/* Bottom-left: Leaderboard (6 cols) */}
          <div className="col-span-6 row-span-1 min-h-0">
            <Leaderboard leaderboard={dashboardState.leaderboard} />
          </div>

          {/* Bottom-right: Posture pie (6 cols) */}
          <div className="col-span-6 row-span-1 min-h-0">
            <PosturePie distribution={dashboardState.distribution} />
          </div>
        </div>
      )}

      <Footer className="text-slate-600" />
    </div>
  );
}
