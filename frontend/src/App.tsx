import React, { useEffect, useState } from 'react';
import {
  evaluateRedFlags,
  rankAssociations,
  coach,
  scoreStopBang,
  labelFor,
  type JournalEntry,
  type NightAnalysis,
  type RedFlag,
  type Sensitivity,
  type StopBangAnswers,
} from '@somnus/domain';
import { NightScreen } from './screens/NightScreen';
import { Screener } from './screens/Screener';
import { JournalScreen } from './screens/JournalScreen';
import { SnoreIndexCard, RedFlagBanner, BandBar, EpisodeTimeline } from './components';
import { local, recoverInterruptedSessions } from './adapters/idb';
import { systemClock } from './adapters/clock';
import { Account } from './screens/Account';
import { auth, loadClientConfig, type AuthSession, type ClientConfig } from './adapters/firebase-auth';
import { syncAll } from './sync';

type View = 'home' | 'consent' | 'screener' | 'night' | 'report' | 'journal' | 'trends';

interface Screen {
  answers: StopBangAnswers;
  sleepinessWhileDriving: boolean;
}

const CONSENT_VERSION = 1;

export function App(): JSX.Element {
  const [view, setView] = useState<View>('home');
  const [nights, setNights] = useState<NightAnalysis[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [screen, setScreen] = useState<Screen | null>(null);
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [consented, setConsented] = useState(false);
  const [lastNight, setLastNight] = useState<NightAnalysis | null>(null);
  const [recovered, setRecovered] = useState(0);
  const [sensitivity] = useState<Sensitivity>('normal');
  const [config, setConfig] = useState<ClientConfig>({ firebase: null, syncAvailable: false });
  const [session, setSession] = useState<AuthSession | null>(null);
  const [syncState, setSyncState] = useState<string | null>(null);

  /**
   * Push anything not yet acknowledged by the server.
   *
   * Safe to call at any time and as often as we like: every push is
   * idempotent on the client-generated night id (ADR-007).
   */
  const sync = async (token: string | null): Promise<void> => {
    if (token === null) return;
    const result = await syncAll(token);
    setSyncState(
      result.failed > 0
        ? `${result.pushed} synced, ${result.failed} still to send`
        : result.pushed > 0
          ? `${result.pushed} night${result.pushed === 1 ? '' : 's'} synced`
          : 'Everything is synced',
    );
  };

  useEffect(() => {
    void (async () => {
      setNights(await local.getNights());
      setJournal(await local.getJournal());
      setScreen(await local.getMeta<Screen>('riskScreen'));
      setAcknowledged((await local.getMeta<string[]>('acknowledgedFlags')) ?? []);
      setConsented((await local.getMeta<number>('consentVersion')) === CONSENT_VERSION);
      setRecovered((await recoverInterruptedSessions()).length);

      // Sync is entirely optional, and its absence is not an error: without
      // it the app is local-only and every feature still works.
      const clientConfig = await loadClientConfig();
      setConfig(clientConfig);
      if (clientConfig.firebase !== null) {
        const fromLink = await auth.completeEmailLinkIfPresent(clientConfig.firebase);
        const existing = fromLink ?? (await auth.current(clientConfig.firebase));
        setSession(existing);
        if (existing !== null) await sync(existing.idToken);
      }
    })();
  }, []);

  const flags: RedFlag[] = evaluateRedFlags({
    answers: screen?.answers ?? {},
    sleepinessWhileDriving: screen?.sleepinessWhileDriving,
    recentNights: nights,
  });
  const unacknowledged = flags.filter((f) => !acknowledged.includes(f.code));

  const acknowledgeAll = (): void => {
    const codes = [...acknowledged, ...flags.map((f) => f.code)];
    setAcknowledged(codes);
    void local.setMeta('acknowledgedFlags', codes);
  };

  const report = rankAssociations(nights, journal);
  const coaching = coach(report, unacknowledged);

  // ── Consent ──────────────────────────────────────────────────────────────
  if (!consented) {
    return (
      <div className="screen">
        <h1>Somnus</h1>
        <p className="lead">
          Somnus listens while you sleep and measures your snoring, so you have
          something better than a guess to work with.
        </p>
        <div className="card">
          <h2>What happens to the sound</h2>
          <ul className="consent-list">
            <li>
              <strong>Your audio never leaves this phone.</strong> It is turned
              into four numbers per fiftieth of a second and thrown away
              immediately. Nothing is recorded, saved or uploaded.
            </li>
            <li>
              What is kept is a list of <em>when</em> a snore happened, how long
              it lasted and how loud it was relative to your quiet room.
            </li>
            <li>That stays on this phone unless you sign in to sync it.</li>
            <li>You can export everything, or delete everything, at any time.</li>
          </ul>
        </div>
        <div className="card warn">
          <h2>What Somnus is not</h2>
          <p>
            This is not a medical device and it does not diagnose anything. Loud
            snoring can be a sign of sleep apnoea, but a phone on a bedside table
            cannot measure your breathing or your oxygen, so it cannot tell you
            whether you have it. It will tell you when it thinks a conversation
            with a doctor is worth having.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setConsented(true);
            void local.setMeta('consentVersion', CONSENT_VERSION);
          }}
        >
          I understand &mdash; continue
        </button>
      </div>
    );
  }

  // FR-S1: screening comes before the first night.
  if (screen === null || view === 'screener') {
    return (
      <Screener
        onComplete={(answers, driving) => {
          const s = { answers, sleepinessWhileDriving: driving };
          setScreen(s);
          void local.setMeta('riskScreen', s);
          setView('home');
        }}
      />
    );
  }

  if (view === 'night') {
    return (
      <NightScreen
        sensitivity={sensitivity}
        onFinished={(analysis) => {
          setLastNight(analysis);
          setNights((n) => [analysis, ...n]);
          setView('report');
          void sync(session?.idToken ?? null);
        }}
      />
    );
  }

  if (view === 'report' && lastNight !== null) {
    return (
      <div className="screen">
        <h1>Last night</h1>
        <RedFlagBanner flags={unacknowledged} onAcknowledge={acknowledgeAll} />
        <SnoreIndexCard night={lastNight} />
        <BandBar night={lastNight} />
        <EpisodeTimeline night={lastNight} />
        <button className="primary" onClick={() => setView('journal')}>
          Add last night&rsquo;s context
        </button>
        <button className="secondary" onClick={() => setView('home')}>
          Done
        </button>
      </div>
    );
  }

  if (view === 'journal') {
    return (
      <JournalScreen
        date={lastNight?.date ?? systemClock.nightDate()}
        onSkip={() => setView('home')}
        onSave={(entry) => {
          void local.putJournal(entry);
          setJournal((j) => [...j.filter((e) => e.date !== entry.date), entry]);
          setView('home');
          void sync(session?.idToken ?? null);
        }}
      />
    );
  }

  if (view === 'trends') {
    const withIndex = nights.filter((n) => n.snoreIndex !== null);
    const peak = Math.max(1, ...withIndex.map((n) => n.snoreIndex as number));
    return (
      <div className="screen">
        <h1>Your trend</h1>
        {withIndex.length === 0 ? (
          <p className="lead">No nights with a full hour of monitoring yet.</p>
        ) : (
          <>
            <div className="card">
              <div className="trend" role="img" aria-label="Snore Index by night">
                {[...withIndex].reverse().map((n) => (
                  <div
                    key={n.nightId}
                    className="trend-bar"
                    style={{ height: `${((n.snoreIndex as number) / peak) * 100}%` }}
                    title={`${n.date}: ${(n.snoreIndex as number).toFixed(1)}`}
                  />
                ))}
              </div>
              <ul className="legend">
                {[...withIndex].slice(0, 7).map((n) => (
                  <li key={n.nightId}>
                    {n.date}: {(n.snoreIndex as number).toFixed(1)} ({labelFor(n.snoreIndex)})
                    {/* ADR-009: version boundaries are marked, not hidden. */}
                    {n.analyserVersion !== withIndex[0].analyserVersion && ' · different analyser version'}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h2>What moves your number</h2>
              {coaching.kind === 'suppressed' && <p>{coaching.message}</p>}
              {coaching.kind === 'insufficient_data' && (
                <p>
                  {coaching.nightsNeeded} more night
                  {coaching.nightsNeeded === 1 ? '' : 's'} with a journal entry and
                  there will be something worth showing here.
                </p>
              )}
              {coaching.kind === 'no_clear_factor' && (
                <p>Nothing you&rsquo;ve logged stands out yet as moving your snoring.</p>
              )}
              {coaching.kind === 'recommendation' && (
                <>
                  <h3>{coaching.recommendation.headline}</h3>
                  <p>{coaching.recommendation.rationale}</p>
                </>
              )}
            </div>
          </>
        )}
        <button className="secondary" onClick={() => setView('home')}>
          Back
        </button>
      </div>
    );
  }

  // ── Home ─────────────────────────────────────────────────────────────────
  const scored = scoreStopBang(screen.answers);
  return (
    <div className="screen">
      <h1>Somnus</h1>
      <RedFlagBanner flags={unacknowledged} onAcknowledge={acknowledgeAll} />

      {recovered > 0 && (
        <p className="note">
          {recovered} previous night ended unexpectedly. The time we weren&rsquo;t
          listening has been excluded from its totals.
        </p>
      )}

      <button className="primary big" onClick={() => setView('night')}>
        Start monitoring
      </button>
      <p className="note">
        Put your phone on the bedside table, screen down, plugged in. Keep Somnus
        open.
      </p>

      {nights.length > 0 && (
        <>
          <SnoreIndexCard night={nights[0]} />
          <button className="secondary" onClick={() => setView('trends')}>
            See your trend ({nights.length} night{nights.length === 1 ? '' : 's'})
          </button>
        </>
      )}

      <Account
        config={config}
        session={session}
        syncState={syncState}
        onSignedIn={(s) => {
          setSession(s);
          void sync(s.idToken);
        }}
        onSignedOut={() => {
          setSession(null);
          setSyncState(null);
        }}
        onSyncNow={() => void sync(session?.idToken ?? null)}
      />

      {scored !== null && (
        <div className="card">
          <div className="metric-label">Your STOP-BANG screening</div>
          <div className="metric-value small">
            {scored.score} / 8 &middot; {scored.band} risk
          </div>
          <p className="note">
            A screening score, not a diagnosis. It is designed to be cautious.
          </p>
          <button className="secondary" onClick={() => setView('screener')}>
            Retake
          </button>
        </div>
      )}
    </div>
  );
}
