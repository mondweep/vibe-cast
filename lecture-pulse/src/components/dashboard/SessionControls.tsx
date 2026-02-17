import { useState, useCallback } from "react";

interface SessionControlsProps {
  onCreateSession: () => void;
  onEndSession: () => void;
  onTriggerStretch: () => void;
  sessionActive: boolean;
}

export default function SessionControls({
  onCreateSession,
  onEndSession,
  onTriggerStretch,
  sessionActive,
}: SessionControlsProps) {
  const [confirmEnd, setConfirmEnd] = useState(false);

  const handleEndClick = useCallback(() => {
    if (confirmEnd) {
      onEndSession();
      setConfirmEnd(false);
    } else {
      setConfirmEnd(true);
    }
  }, [confirmEnd, onEndSession]);

  const handleEndBlur = useCallback(() => {
    // Cancel confirmation if focus leaves the button
    setConfirmEnd(false);
  }, []);

  if (!sessionActive) {
    return (
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={onCreateSession}
          className="rounded-2xl bg-sky-500 px-10 py-4 text-2xl font-bold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 active:scale-95"
        >
          Create Session
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Stretch Break */}
      <button
        type="button"
        onClick={onTriggerStretch}
        className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-8 py-4 text-xl font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 active:scale-95"
      >
        {/* Timer / stretch icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        Stretch Break
      </button>

      {/* End Session */}
      <button
        type="button"
        onClick={handleEndClick}
        onBlur={handleEndBlur}
        className={`rounded-2xl px-8 py-4 text-xl font-bold text-white transition active:scale-95 ${
          confirmEnd
            ? "bg-red-600 shadow-lg shadow-red-600/40 ring-2 ring-red-400"
            : "bg-red-700/80 shadow-lg shadow-red-700/20 hover:bg-red-600"
        }`}
      >
        {confirmEnd ? "Confirm End?" : "End Session"}
      </button>
    </div>
  );
}
