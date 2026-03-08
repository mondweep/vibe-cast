import { useState } from 'react';
import type { DetectionConfig, DetectionMode } from '../../audio/detectionConfig';
import { DETECTION_PRESETS, PARAM_RANGES, matchesPreset } from '../../audio/detectionConfig';

interface DetectionSettingsProps {
  config: DetectionConfig;
  onChange: (config: DetectionConfig, mode: DetectionMode) => void;
}

export default function DetectionSettings({ config, onChange }: DetectionSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentMode = matchesPreset(config);

  function applyPreset(preset: 'standard' | 'beginner') {
    onChange({ ...DETECTION_PRESETS[preset] }, preset);
  }

  function updateParam<K extends keyof DetectionConfig>(key: K, value: DetectionConfig[K]) {
    const next = { ...config, [key]: value };
    onChange(next, matchesPreset(next));
  }

  // Invert throttle for display: low ms = fast, so show as "speed" where high = fast
  const speedValue = PARAM_RANGES.throttleMs.max + PARAM_RANGES.throttleMs.min - config.throttleMs;

  return (
    <div className="mt-2">
      {/* Header row: preset buttons + expand toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(['standard', 'beginner'] as const).map(preset => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                currentMode === preset
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
          {currentMode === 'custom' && (
            <span className="px-3 py-1 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-600">
              Custom
            </span>
          )}
        </div>

        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          Tune
        </button>
      </div>

      {/* Expandable sliders */}
      {isOpen && (
        <div className="mt-3 space-y-3 bg-gray-50 dark:bg-gray-750 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
          {/* Detection Speed (inverted throttle) */}
          <SliderRow
            label={PARAM_RANGES.throttleMs.label}
            hint="How often chords are detected"
            min={PARAM_RANGES.throttleMs.min}
            max={PARAM_RANGES.throttleMs.max}
            step={PARAM_RANGES.throttleMs.step}
            value={speedValue}
            displayValue={`${config.throttleMs}ms`}
            lowLabel="Slow"
            highLabel="Fast"
            onChange={v => {
              const throttle = PARAM_RANGES.throttleMs.max + PARAM_RANGES.throttleMs.min - v;
              updateParam('throttleMs', throttle);
            }}
          />

          {/* Stability */}
          <SliderRow
            label={PARAM_RANGES.stabilityHits.label}
            hint="Consecutive detections needed before showing"
            min={PARAM_RANGES.stabilityHits.min}
            max={PARAM_RANGES.stabilityHits.max}
            step={PARAM_RANGES.stabilityHits.step}
            value={config.stabilityHits}
            displayValue={`${config.stabilityHits}`}
            lowLabel="Reactive"
            highLabel="Stable"
            onChange={v => updateParam('stabilityHits', v)}
          />

          {/* Confidence Threshold */}
          <SliderRow
            label={PARAM_RANGES.confidenceThreshold.label}
            hint="Minimum match quality to show a chord"
            min={PARAM_RANGES.confidenceThreshold.min}
            max={PARAM_RANGES.confidenceThreshold.max}
            step={PARAM_RANGES.confidenceThreshold.step}
            value={config.confidenceThreshold}
            displayValue={`${Math.round(config.confidenceThreshold * 100)}%`}
            lowLabel="Lenient"
            highLabel="Strict"
            onChange={v => updateParam('confidenceThreshold', Math.round(v * 100) / 100)}
          />

          {/* Switch Resistance (hysteresis) */}
          <SliderRow
            label={PARAM_RANGES.hysteresisMargin.label}
            hint="How much better a new chord must score to replace current"
            min={PARAM_RANGES.hysteresisMargin.min}
            max={PARAM_RANGES.hysteresisMargin.max}
            step={PARAM_RANGES.hysteresisMargin.step}
            value={config.hysteresisMargin}
            displayValue={config.hysteresisMargin === 0 ? 'Off' : `${Math.round(config.hysteresisMargin * 100)}%`}
            lowLabel="None"
            highLabel="High"
            onChange={v => updateParam('hysteresisMargin', Math.round(v * 100) / 100)}
          />

          {/* Simplified chords toggle */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Simplified Chords</span>
              <p className="text-[10px] text-gray-400">Major, minor, 7th only</p>
            </div>
            <button
              onClick={() => updateParam('simplifyQualities', !config.simplifyQualities)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                config.simplifyQualities ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-500'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                config.simplifyQualities ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SliderRowProps {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue: string;
  lowLabel: string;
  highLabel: string;
  onChange: (value: number) => void;
}

function SliderRow({ label, hint, min, max, step, value, displayValue, lowLabel, highLabel, onChange }: SliderRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-indigo-500"
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-gray-400">{lowLabel}</span>
        <span className="text-[10px] text-gray-400">{highLabel}</span>
      </div>
      <p className="text-[10px] text-gray-400 -mt-0.5">{hint}</p>
    </div>
  );
}
