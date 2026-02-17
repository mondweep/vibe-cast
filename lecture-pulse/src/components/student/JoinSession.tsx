import { useState, useEffect } from "react";
import { generateNickname } from "@/lib/nicknames";
import Footer from "@/components/shared/Footer";

interface JoinSessionProps {
  onJoin: (roomCode: string, nickname: string) => void;
}

/**
 * Student landing screen. Accepts a 4-character room code (auto-formatted
 * to uppercase) and generates an anonymous nickname. Also parses ?room=
 * from the URL search params to auto-fill the code.
 */
export default function JoinSession({ onJoin }: JoinSessionProps) {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Auto-fill from URL search params (?room=ABCD)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam) {
      setRoomCode(roomParam.toUpperCase().slice(0, 4));
    }
  }, []);

  const handleRoomCodeChange = (value: string) => {
    // Only allow alphanumeric, auto-uppercase, max 4 chars
    const formatted = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 4);
    setRoomCode(formatted);
    if (error) setError("");
  };

  const handleJoin = () => {
    if (roomCode.length !== 4) {
      setError("Room code must be exactly 4 characters");
      return;
    }

    setIsJoining(true);
    const nickname = generateNickname();
    onJoin(roomCode, nickname);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoin();
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-dark-900 px-6">
      {/* Branding */}
      <div className="mb-10 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-accent-blue flex items-center justify-center">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">LecturePulse</h1>
        </div>
        <p className="text-dark-400 text-sm">
          Real-time posture tracking for better focus
        </p>
      </div>

      {/* Join form */}
      <div className="w-full max-w-xs space-y-5">
        <div>
          <label
            htmlFor="room-code"
            className="mb-2 block text-sm font-medium text-dark-300"
          >
            Room Code
          </label>
          <input
            id="room-code"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="ABCD"
            value={roomCode}
            onChange={(e) => handleRoomCodeChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-xl border border-dark-600 bg-dark-800 px-5 py-4 text-center text-2xl font-mono font-bold tracking-[0.3em] text-white placeholder-dark-500 focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-accent-blue/30 transition-colors"
            maxLength={4}
          />
          {error && (
            <p className="mt-2 text-center text-sm text-accent-red">{error}</p>
          )}
        </div>

        <button
          onClick={handleJoin}
          disabled={roomCode.length !== 4 || isJoining}
          className="w-full rounded-xl bg-accent-blue px-5 py-4 text-lg font-semibold text-white transition-all hover:bg-accent-blue/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isJoining ? "Joining..." : "Join Session"}
        </button>

        <p className="text-center text-xs text-dark-500">
          No account needed. Your camera data never leaves your device.
        </p>
      </div>

      <Footer />
    </div>
  );
}
