import { useRef, useEffect } from 'react';

interface SpectrumVisualizerProps {
  frequencyData: Uint8Array | null;
  isActive: boolean;
  peakFrequencies?: { frequency: number; magnitude: number }[];
}

const BAR_WIDTH = 2;
const BAR_GAP = 1;
const HEIGHT = 100;

export default function SpectrumVisualizer({
  frequencyData,
  isActive,
  peakFrequencies = [],
}: SpectrumVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function draw() {
      if (!canvas || !ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Clear
      ctx.clearRect(0, 0, width, height);

      if (!frequencyData || frequencyData.length === 0 || !isActive) {
        // Draw idle state
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(0, height - 1, width, 1);
        return;
      }

      // Draw frequency bars — only show musically relevant range
      // Use first ~512 bins (~0-5kHz at 44100/4096)
      const usableBins = Math.min(frequencyData.length, 512);
      const totalBarWidth = BAR_WIDTH + BAR_GAP;
      const numBars = Math.min(Math.floor(width / totalBarWidth), usableBins);
      const binStep = usableBins / numBars;

      for (let i = 0; i < numBars; i++) {
        const binIdx = Math.floor(i * binStep);
        const value = frequencyData[binIdx] / 255;
        const barHeight = value * height * 0.9;

        // Color gradient: warm (bass) → cool (treble)
        const hue = 240 - (i / numBars) * 200; // blue → red
        const saturation = 70 + value * 30;
        const lightness = 40 + value * 20;
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

        const x = i * totalBarWidth;
        ctx.fillRect(x, height - barHeight, BAR_WIDTH, barHeight);
      }

      // Highlight peak frequencies
      if (peakFrequencies.length > 0) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        for (const peak of peakFrequencies.slice(0, 6)) {
          // Map frequency to x position (approximate)
          const binIdx = Math.round(peak.frequency / (44100 / 4096));
          const barIdx = Math.round(binIdx / binStep);
          if (barIdx >= 0 && barIdx < numBars) {
            const x = barIdx * totalBarWidth + BAR_WIDTH / 2;
            ctx.beginPath();
            ctx.arc(x, 8, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#f59e0b';
            ctx.fill();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [frequencyData, isActive, peakFrequencies]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={HEIGHT}
      className="w-full rounded-lg bg-gray-900"
      style={{ height: `${HEIGHT}px` }}
    />
  );
}
