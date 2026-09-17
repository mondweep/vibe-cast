import type { User } from 'firebase/auth';

/**
 * Authentication (ADR-006).
 *
 * Firebase is loaded dynamically and only when the server says sync is
 * configured. Capture, detection and analysis never touch any of this: a
 * Night runs identically signed out, offline, or with the API down (ADR-007),
 * so none of it belongs in the critical path or in the initial bundle.
 */

export interface FirebaseConfig {
  readonly apiKey: string;
  readonly appId: string;
  readonly authDomain: string;
  readonly projectId: string;
}

export interface ClientConfig {
  readonly firebase: FirebaseConfig | null;
  readonly syncAvailable: boolean;
}

export interface AuthSession {
  readonly uid: string;
  readonly email: string | null;
  readonly idToken: string;
}

const EMAIL_KEY = 'somnus.signInEmail';

export async function loadClientConfig(): Promise<ClientConfig> {
  try {
    const res = await fetch('/api/v1/config');
    if (!res.ok) return { firebase: null, syncAvailable: false };
    return (await res.json()) as ClientConfig;
  } catch {
    // Offline, or the API is down. Local-only mode is a perfectly good
    // outcome here, not an error to show the user.
    return { firebase: null, syncAvailable: false };
  }
}

let authPromise: Promise<import('firebase/auth').Auth> | null = null;

async function getAuthInstance(config: FirebaseConfig): Promise<import('firebase/auth').Auth> {
  if (authPromise === null) {
    authPromise = (async () => {
      const { initializeApp, getApps } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      const app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
      return getAuth(app);
    })();
  }
  return authPromise;
}

export const auth = {
  /** Google sign-in. Requires the Google provider to be enabled on the project. */
  async signInWithGoogle(config: FirebaseConfig): Promise<AuthSession> {
    const instance = await getAuthInstance(config);
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const result = await signInWithPopup(instance, new GoogleAuthProvider());
    return toSession(result.user);
  },

  /**
   * Passwordless email link. Needs no OAuth client, which is why it is the
   * path that works without anyone visiting a console.
   */
  async sendEmailLink(config: FirebaseConfig, email: string): Promise<void> {
    const instance = await getAuthInstance(config);
    const { sendSignInLinkToEmail } = await import('firebase/auth');
    await sendSignInLinkToEmail(instance, email, {
      url: window.location.origin,
      handleCodeInApp: true,
    });
    // The link opens a fresh page load, so the address has to survive it.
    try {
      window.localStorage.setItem(EMAIL_KEY, email);
    } catch {
      /* private mode — the user will be asked to retype it */
    }
  },

  /** Completes sign-in if this page load came from an email link. */
  async completeEmailLinkIfPresent(config: FirebaseConfig): Promise<AuthSession | null> {
    const instance = await getAuthInstance(config);
    const { isSignInWithEmailLink, signInWithEmailLink } = await import('firebase/auth');
    if (!isSignInWithEmailLink(instance, window.location.href)) return null;

    let email: string | null = null;
    try {
      email = window.localStorage.getItem(EMAIL_KEY);
    } catch {
      /* fall through to the prompt */
    }
    if (email === null) email = window.prompt('Confirm the email you signed in with') ?? null;
    if (email === null) return null;

    const result = await signInWithEmailLink(instance, email, window.location.href);
    try {
      window.localStorage.removeItem(EMAIL_KEY);
    } catch {
      /* nothing to clean up */
    }
    // Strip the one-time credentials out of the address bar.
    window.history.replaceState({}, '', window.location.pathname);
    return toSession(result.user);
  },

  async current(config: FirebaseConfig): Promise<AuthSession | null> {
    const instance = await getAuthInstance(config);
    const { onAuthStateChanged } = await import('firebase/auth');
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(instance, (user) => {
        unsubscribe();
        if (user === null) resolve(null);
        else void toSession(user).then(resolve);
      });
    });
  },

  async signOut(config: FirebaseConfig): Promise<void> {
    const instance = await getAuthInstance(config);
    const { signOut } = await import('firebase/auth');
    await signOut(instance);
  },
};

async function toSession(user: User): Promise<AuthSession> {
  return { uid: user.uid, email: user.email, idToken: await user.getIdToken() };
}
