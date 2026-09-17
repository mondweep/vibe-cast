import React from 'react';
import { labelFor, type NightAnalysis, type RedFlag } from '@somnus/domain';

/**
 * The Snore Index, with its framing attached.
 *
 * v1 acceptance criterion 5 requires that every screen showing SI also shows
 * the not-an-AHI framing. Binding the two together in one component is how
 * that is guaranteed: there is no way to render the number without it, so a
 * new screen cannot forget.
 */
export function SnoreIndexCard({ night }: { night: NightAnalysis }): JSX.Element {
  const label = labelFor(night.snoreIndex);

  return (
    <div className="card">
      <div className="metric-label">Snore Index</div>
      {night.snoreIndex === null ? (
        <>
          <div className="metric-value muted">—</div>
          <p className="note">
            This night was monitored for under an hour, so there isn&rsquo;t enough
            to calculate an index. That is not the same as no snoring.
          </p>
        </>
      ) : (
        <>
          <div className="metric-value">{night.snoreIndex.toFixed(1)}</div>
          <div className="metric-sub">
            snore episodes per hour &middot; <strong>{label}</strong>
          </div>
        </>
      )}
      <p className="disclaimer">
        The Snore Index counts snoring sounds only. It is <strong>not</strong> an
        AHI and this app cannot detect pauses in breathing or measure your
        oxygen. It does not diagnose anything.
      </p>
    </div>
  );
}

export function RedFlagBanner({
  flags,
  onAcknowledge,
}: {
  flags: readonly RedFlag[];
  onAcknowledge: () => void;
}): JSX.Element | null {
  if (flags.length === 0) return null;
  return (
    <div className="flag" role="alert">
      <h2>Worth talking to a doctor about</h2>
      {flags.map((f) => (
        <div key={f.code} className="flag-item">
          <h3>{f.title}</h3>
          <p>{f.message}</p>
        </div>
      ))}
      {/* I-S3: the flag persists until explicitly acknowledged. */}
      <button className="secondary" onClick={onAcknowledge}>
        I&rsquo;ve read this
      </button>
    </div>
  );
}

export function BandBar({ night }: { night: NightAnalysis }): JSX.Element {
  const total = Math.max(1, night.episodeCount);
  const bands = [
    { key: 'quiet', label: 'Quiet', n: night.bandDistribution.quiet },
    { key: 'mild', label: 'Mild', n: night.bandDistribution.mild },
    { key: 'moderate', label: 'Moderate', n: night.bandDistribution.moderate },
    { key: 'loud', label: 'Loud', n: night.bandDistribution.loud },
  ];
  return (
    <div className="card">
      <div className="metric-label">How loud</div>
      <div className="bandbar" role="img" aria-label={bands.map((b) => `${b.label}: ${b.n}`).join(', ')}>
        {bands.map((b) => (
          <div
            key={b.key}
            className={`band band-${b.key}`}
            style={{ flexGrow: b.n / total || 0.001 }}
            title={`${b.label}: ${b.n}`}
          />
        ))}
      </div>
      {/* NFR-8: every chart has a text equivalent. */}
      <ul className="legend">
        {bands.map((b) => (
          <li key={b.key}>
            <span className={`swatch band-${b.key}`} /> {b.label}: {b.n}
          </li>
        ))}
      </ul>
      <p className="note">
        Loudness is measured relative to how quiet your room was, not in absolute
        decibels &mdash; a phone microphone cannot be calibrated.
      </p>
    </div>
  );
}

export function EpisodeTimeline({ night }: { night: NightAnalysis }): JSX.Element {
  const buckets = 48;
  const counts = new Array<number>(buckets).fill(0);
  const span = Math.max(1, night.monitoredMs);
  for (const e of night.episodes) {
    const i = Math.min(buckets - 1, Math.floor((e.startMs / span) * buckets));
    counts[i] += 1;
  }
  const peak = Math.max(1, ...counts);
  const hours = (night.monitoredMs / 3_600_000).toFixed(1);

  return (
    <div className="card">
      <div className="metric-label">Through the night</div>
      <div className="timeline" role="img" aria-label={`Episode density across ${hours} hours`}>
        {counts.map((c, i) => (
          <div key={i} className="tick" style={{ height: `${(c / peak) * 100}%` }} />
        ))}
      </div>
      <p className="note">
        {night.episodeCount} episodes across {hours} monitored hours.
        {night.quietPeriods.length > 0 && (
          <>
            {' '}
            {night.quietPeriods.length} quiet stretch
            {night.quietPeriods.length === 1 ? '' : 'es'} of 10 minutes or more.
            Quiet means no snoring sound was detected &mdash; it says nothing about
            your breathing.
          </>
        )}
      </p>
    </div>
  );
}
