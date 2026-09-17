import type { TokenVerifier, VerifiedUser } from './auth';

/**
 * Firebase ID token verification (ADR-006).
 *
 * The Admin SDK is loaded lazily so that a cold start which only serves
 * /healthz or a static asset never pays for it (ADR-005).
 */
export function firebaseTokenVerifier(projectId: string): TokenVerifier {
  let verifyIdToken: ((token: string) => Promise<{ uid: string; email?: string }>) | null = null;

  return async (idToken: string): Promise<VerifiedUser> => {
    if (verifyIdToken === null) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const admin = await import('firebase-admin');
      const app = admin.apps.length > 0 ? admin.apps[0]! : admin.initializeApp({ projectId });
      const auth = admin.auth(app as never);
      verifyIdToken = (token: string) => auth.verifyIdToken(token);
    }
    const decoded = await verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email };
  };
}
