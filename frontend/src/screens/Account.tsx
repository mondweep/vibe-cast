import React, { useState } from 'react';
import { auth, type AuthSession, type ClientConfig } from '../adapters/firebase-auth';

/**
 * Sign-in and sync status.
 *
 * Signing in is presented as optional throughout, because it is: everything
 * the product measures works without an account (ADR-007). What an account
 * buys is that your history survives clearing this browser's data.
 */
export function Account({
  config,
  session,
  syncState,
  onSignedIn,
  onSignedOut,
  onSyncNow,
}: {
  config: ClientConfig;
  session: AuthSession | null;
  syncState: string | null;
  onSignedIn: (s: AuthSession) => void;
  onSignedOut: () => void;
  onSyncNow: () => void;
}): JSX.Element {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!config.syncAvailable || config.firebase === null) {
    return (
      <div className="card">
        <div className="metric-label">This device only</div>
        <p className="note">
          Your nights are stored in this browser and nowhere else. Nothing is
          uploaded. Clearing this site&rsquo;s data would lose your history, so
          export it from time to time if it matters to you.
        </p>
      </div>
    );
  }

  if (session !== null) {
    return (
      <div className="card">
        <div className="metric-label">Signed in</div>
        <p className="note">{session.email ?? session.uid}</p>
        {syncState !== null && <p className="note">{syncState}</p>}
        <button className="secondary" onClick={onSyncNow}>
          Sync now
        </button>
        <button
          className="secondary"
          onClick={() => {
            void auth.signOut(config.firebase!).then(onSignedOut);
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  const googleSignIn = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await auth.signInWithGoogle(config.firebase!));
    } catch (e) {
      // The most likely cause by far is that the Google provider has not been
      // switched on for the project, so say that rather than showing a raw code.
      const code = e instanceof Error ? e.message : '';
      setError(
        /operation-not-allowed|configuration-not-found/.test(code)
          ? 'Google sign-in is not switched on for this project yet. Use the email link below.'
          : 'Google sign-in did not complete.',
      );
    } finally {
      setBusy(false);
    }
  };

  const emailSignIn = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await auth.sendEmailLink(config.firebase!, email.trim());
      setSent(true);
    } catch {
      setError('Could not send the sign-in link. Check the address and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="metric-label">Keep your history</div>
      <p className="note">
        Optional. Everything works without signing in &mdash; an account just
        means your nights survive clearing this browser&rsquo;s data, and show
        up on your other devices. Your audio still never leaves this phone.
      </p>

      <button className="secondary" disabled={busy} onClick={() => void googleSignIn()}>
        Continue with Google
      </button>

      {sent ? (
        <p className="note">
          Check your email on this device and open the link to finish signing in.
        </p>
      ) : (
        <>
          <input
            className="text-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="secondary"
            disabled={busy || !email.includes('@')}
            onClick={() => void emailSignIn()}
          >
            Email me a sign-in link
          </button>
        </>
      )}

      {error !== null && <p className="note error">{error}</p>}
    </div>
  );
}
