import React, { useEffect, useRef, useState } from 'react';
import {
  Session,
  analyseNight,
  type Candidate,
  type FrameFeatures,
  type NightAnalysis,
  type Sensitivity,
} from '@somnus/domain';
import { WebAudioAdapter } from '../adapters/web-audio';
import { BrowserWakeLock } from '../adapters/wake-lock';
import { local, type SessionHeader } from '../adapters/idb';
import { systemClock, browserIds } from '../adapters/clock';

const BATCH_INTERVAL_MS = 30_000;

type Phase = 'idle' | 'calibrating' | 'monitoring' | 'analysing';

/**
 * The overnight capture screen (FR-C1..C9).
 *
 * Deliberately dim and almost empty: it is looked at by someone in a dark
 * bedroom trying to fall asleep, so it must not be the brightest object in
 * the room.
 */
export function NightScreen({
  onFinished,
  sensitivity,
}: {
  onFinished: (analysis: NightAnalysis) => void;
  sensitivity: Sensitivity;
}): JSX.Element {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [episodes, setEpisodes] = useState(0);
  const [intensity, setIntensity] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [wakeLockOk, setWakeLockOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);

  const audio = useRef(new WebAudioAdapter());
  const wakeLock = useRef(new BrowserWakeLock());
  const session = useRef<Session | null>(null);
  const header = useRef<SessionHeader | null>(null);
  const pending = useRef<Candidate[]>([]);
  const allCandidates = useRef<Candidate[]>([]);
  const lastFrameMs = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const flush = async (): Promise<void> => {
      const batch = pending.current;
      pending.current = [];
      if (header.current !== null) {
        header.current.heartbeatMs = systemClock.now();
        header.current.lastFrameMs = lastFrameMs.current;
        await local.putSession(header.current);
        await local.appendCandidates(header.current.nightId, batch);
      }
    };

    const begin = async (): Promise<void> => {
      try {
        const nightId = browserIds.newId();
        header.current = {
          nightId,
          date: systemClock.nightDate(),
          startedAtMs: systemClock.now(),
          heartbeatMs: systemClock.now(),
          lastFrameMs: 0,
          stoppedCleanly: false,
          sensitivity,
        };
        await local.putSession(header.current);

        session.current = new Session(sensitivity);
        setPhase('calibrating');
        setWakeLockOk(await wakeLock.current.acquire());

        await audio.current.start((frame: FrameFeatures) => {
          if (cancelled || session.current === null) return;
          lastFrameMs.current = frame.tMs;
          setElapsedMs(frame.tMs);

          const found = session.current.pushFrame(frame);
          if (found.length > 0) {
            pending.current.push(...found);
            allCandidates.current.push(...found);
            setEpisodes(allCandidates.current.length);
          }

          if (!session.current.isCalibrated) {
            setProgress(session.current.calibrationProgress);
          } else {
            setPhase((p) => (p === 'calibrating' ? 'monitoring' : p));
            setIntensity(session.current.currentIntensityDb(frame));
          }
        });
      } catch (e) {
        setError(
          e instanceof Error && e.name === 'NotAllowedError'
            ? 'Microphone access was declined. Somnus cannot monitor without it.'
            : 'Could not start the microphone on this device.',
        );
        setPhase('idle');
      }
    };

    void begin();
    const timer = setInterval(() => void flush(), BATCH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      void audio.current.stop();
      void wakeLock.current.release();
    };
  }, [sensitivity]);

  const stop = async (): Promise<void> => {
    setPhase('analysing');
    const tail = session.current?.stop() ?? [];
    allCandidates.current.push(...tail);

    await audio.current.stop();
    await wakeLock.current.release();

    const h = header.current;
    if (h === null) return;

    await local.appendCandidates(h.nightId, [...pending.current, ...tail]);
    h.stoppedCleanly = true;
    h.heartbeatMs = systemClock.now();
    await local.putSession(h);

    const analysis = analyseNight({
      nightId: h.nightId,
      date: h.date,
      candidates: allCandidates.current,
      startMs: 0,
      stopMs: lastFrameMs.current,
    });

    await local.putNight(analysis);
    await local.clearCandidates(h.nightId);
    await local.deleteSession(h.nightId);
    onFinished(analysis);
  };

  const hhmm = (ms: number): string => {
    const total = Math.floor(ms / 1000);
    return `${String(Math.floor(total / 3600)).padStart(2, '0')}:${String(
      Math.floor((total % 3600) / 60),
    ).padStart(2, '0')}`;
  };

  if (error !== null) {
    return (
      <div className="night">
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="night">
      <div className="night-time">{hhmm(elapsedMs)}</div>

      {phase === 'calibrating' && (
        <>
          <p className="night-status">Listening to how quiet your room is&hellip;</p>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="night-hint">This takes a minute. Settle in.</p>
        </>
      )}

      {phase === 'monitoring' && (
        <>
          <p className="night-status">Monitoring</p>
          <div className="level" aria-label={`Current level ${intensity.toFixed(0)} decibels above baseline`}>
            <div className="level-fill" style={{ width: `${Math.min(100, (intensity / 30) * 100)}%` }} />
          </div>
          <p className="night-count">{episodes} episodes so far</p>
        </>
      )}

      {phase === 'analysing' && <p className="night-status">Working out your night&hellip;</p>}

      {wakeLockOk === false && (
        <p className="night-warn">
          This device won&rsquo;t keep the screen awake. Monitoring may stop if the
          screen turns off &mdash; keep Somnus open and set your screen timeout to
          never.
        </p>
      )}

      {/* FR-C7: two-step stop, so a half-asleep tap at 3am cannot end the night. */}
      {phase !== 'analysing' &&
        (confirmStop ? (
          <div className="stop-confirm">
            <button className="danger" onClick={() => void stop()}>
              Yes, end the night
            </button>
            <button className="secondary" onClick={() => setConfirmStop(false)}>
              Keep monitoring
            </button>
          </div>
        ) : (
          <button className="secondary stop" onClick={() => setConfirmStop(true)}>
            Stop
          </button>
        ))}
    </div>
  );
}
