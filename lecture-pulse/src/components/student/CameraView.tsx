import { useEffect, useRef, type RefObject } from "react";
import type { PoseLandmark } from "@/types";
import SkeletonOverlay from "@/components/shared/SkeletonOverlay";

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  landmarks: PoseLandmark[] | null;
  isTracking: boolean;
}

/**
 * Renders the front-camera video feed with an optional skeleton overlay.
 * Compact design to fit above the score display on a mobile phone.
 *
 * Starts the camera via getUserMedia on mount and cleans up on unmount.
 */
export default function CameraView({
  videoRef,
  landmarks,
  isTracking,
}: CameraViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera on mount
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        // Camera permission denied or unavailable; fail silently.
        // The pose detection hook will report the lack of video data.
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [videoRef]);

  const videoEl = videoRef.current;
  const videoWidth = videoEl?.videoWidth ?? 640;
  const videoHeight = videoEl?.videoHeight ?? 480;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-xs overflow-hidden rounded-2xl bg-dark-950 aspect-[3/4]"
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef as RefObject<HTMLVideoElement>}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover -scale-x-100"
      />

      {/* Skeleton overlay */}
      {isTracking && landmarks && landmarks.length > 0 && (
        <div className="absolute inset-0 -scale-x-100">
          <SkeletonOverlay
            landmarks={landmarks}
            videoWidth={videoWidth}
            videoHeight={videoHeight}
          />
        </div>
      )}

      {/* Tracking status indicator */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-dark-900/80 px-2.5 py-1 backdrop-blur-sm">
        <div
          className={`h-2 w-2 rounded-full ${
            isTracking ? "bg-accent-green animate-pulse" : "bg-dark-500"
          }`}
        />
        <span className="text-xs font-medium text-dark-200">
          {isTracking ? "Tracking" : "Waiting..."}
        </span>
      </div>
    </div>
  );
}
