import { useEffect, useRef, useState, useCallback, type RefObject } from "react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { PoseLandmark } from "@/types";
import { DETECTION_INTERVAL_MS } from "@/lib/constants";

/** MediaPipe model hosted on their CDN. */
const MODEL_ASSET_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

export interface UsePoseDetectionReturn {
  landmarks: PoseLandmark[] | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * React hook that initialises MediaPipe PoseLandmarker on mount, runs
 * detection at a fixed interval against the provided `<video>` element,
 * and cleans up on unmount.
 */
export function usePoseDetection(videoRef: RefObject<HTMLVideoElement | null>): UsePoseDetectionReturn {
  const [landmarks, setLandmarks] = useState<PoseLandmark[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialise the landmarker once on mount.
  const init = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_ASSET_PATH,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      landmarkerRef.current = landmarker;
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to initialise PoseLandmarker";
      setError(message);
      setIsLoading(false);
    }
  }, []);

  // Run detection at DETECTION_INTERVAL_MS.
  const startDetection = useCallback(() => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker) return;
      if (video.readyState < 2) return; // not enough data yet

      try {
        const timestamp = performance.now();
        const result = landmarker.detectForVideo(video, timestamp);

        if (result.landmarks && result.landmarks.length > 0) {
          // Convert NormalizedLandmark[] to our PoseLandmark[] (same shape).
          const pose: PoseLandmark[] = result.landmarks[0].map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility,
          }));
          setLandmarks(pose);
        } else {
          setLandmarks(null);
        }
      } catch (_detectionError) {
        // Transient detection failures are non-fatal; skip this frame.
      }
    }, DETECTION_INTERVAL_MS);
  }, [videoRef]);

  // Lifecycle: init on mount, start detection when ready, clean up on unmount.
  useEffect(() => {
    void init();

    return () => {
      // Stop interval.
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Close landmarker.
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, [init]);

  // Once the landmarker is loaded, start the detection loop.
  useEffect(() => {
    if (!isLoading && !error && landmarkerRef.current) {
      startDetection();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLoading, error, startDetection]);

  return { landmarks, isLoading, error };
}
