import { useState, useEffect } from "react";
import type { PoseLandmark, PostureClassification } from "@/types";
import { calculatePostureScore, classifyPosture } from "@/lib/posture";

export interface UsePostureScoreReturn {
  score: number;
  classification: PostureClassification;
  headTilt: number;
  shoulderDelta: number;
  isTracking: boolean;
}

/**
 * React hook that takes a landmarks array from usePoseDetection,
 * feeds it through the posture scoring algorithm, and returns the
 * current score, classification, and component metrics.
 */
export function usePostureScore(landmarks: PoseLandmark[] | null): UsePostureScoreReturn {
  const [score, setScore] = useState(0);
  const [classification, setClassification] = useState<PostureClassification>("poor");
  const [headTilt, setHeadTilt] = useState(0);
  const [shoulderDelta, setShoulderDelta] = useState(0);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (!landmarks || landmarks.length === 0) {
      setIsTracking(false);
      return;
    }

    const result = calculatePostureScore(landmarks);

    setScore(result.score);
    setClassification(classifyPosture(result.score));
    setHeadTilt(result.headTilt);
    setShoulderDelta(result.shoulderDelta);
    setIsTracking(true);
  }, [landmarks]);

  return { score, classification, headTilt, shoulderDelta, isTracking };
}
