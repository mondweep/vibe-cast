import type { TapResult } from '../domain/types.ts';

interface TapZoneProps {
  onTap: () => TapResult | undefined;
  lastJudgement?: TapResult['judgement'] | null;
  isActive: boolean;
}

export function TapZone({ onTap, lastJudgement, isActive }: TapZoneProps) {
  return (
    <button
      className={`tap-zone ${isActive ? 'tap-zone--active' : ''} ${
        lastJudgement ? `tap-zone--${lastJudgement}` : ''
      }`}
      onClick={onTap}
      disabled={!isActive}
      aria-label="Tap zone - tap in rhythm with the beat"
    >
      <div className="tap-zone__feedback">
        {lastJudgement === 'perfect' && 'Perfect!'}
        {lastJudgement === 'good' && 'Good'}
        {lastJudgement === 'miss' && 'Miss'}
        {lastJudgement === 'silence_violation' && 'Silence!'}
        {!lastJudgement && 'TAP'}
      </div>
    </button>
  );
}
