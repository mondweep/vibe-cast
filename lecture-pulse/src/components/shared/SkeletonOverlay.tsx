import { useRef, useEffect } from "react";
import type { PoseLandmark } from "@/types";

interface SkeletonOverlayProps {
  landmarks: PoseLandmark[];
  videoWidth: number;
  videoHeight: number;
}

/** Connections between key joints for skeleton drawing. */
const CONNECTIONS: [number, number][] = [
  // Ears to shoulders
  [7, 11], // left ear -> left shoulder
  [8, 12], // right ear -> right shoulder
  // Across shoulders
  [11, 12],
  // Shoulders to hips
  [11, 23], // left shoulder -> left hip
  [12, 24], // right shoulder -> right hip
  // Across hips
  [23, 24],
];

/** Landmark indices we draw as dots. */
const KEY_LANDMARKS = [0, 7, 8, 11, 12, 23, 24];

/**
 * Returns a colour based on the vertical position of the landmark,
 * providing a visual zone indicator (head = blue, torso = green, hips = amber).
 */
function zoneColor(y: number): string {
  if (y < 0.35) return "rgba(59, 130, 246, 0.85)"; // accent-blue - head zone
  if (y < 0.65) return "rgba(16, 185, 129, 0.85)"; // accent-green - torso zone
  return "rgba(245, 158, 11, 0.85)"; // accent-amber - hip zone
}

/**
 * Canvas overlay that renders pose landmarks as dots and connects
 * key joints with lines. Semi-transparent, colour-coded by posture zone.
 */
export default function SkeletonOverlay({
  landmarks,
  videoWidth,
  videoHeight,
}: SkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks || landmarks.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    // Draw connections
    ctx.lineWidth = 3;
    for (const [startIdx, endIdx] of CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];
      if (!start || !end) continue;
      if (start.visibility < 0.5 || end.visibility < 0.5) continue;

      const midY = (start.y + end.y) / 2;
      ctx.strokeStyle = zoneColor(midY);
      ctx.beginPath();
      ctx.moveTo(start.x * videoWidth, start.y * videoHeight);
      ctx.lineTo(end.x * videoWidth, end.y * videoHeight);
      ctx.stroke();
    }

    // Draw key landmark dots
    for (const idx of KEY_LANDMARKS) {
      const lm = landmarks[idx];
      if (!lm || lm.visibility < 0.5) continue;

      ctx.fillStyle = zoneColor(lm.y);
      ctx.beginPath();
      ctx.arc(lm.x * videoWidth, lm.y * videoHeight, 6, 0, 2 * Math.PI);
      ctx.fill();

      // White outline for visibility
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [landmarks, videoWidth, videoHeight]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none"
      style={{ objectFit: "cover" }}
    />
  );
}
