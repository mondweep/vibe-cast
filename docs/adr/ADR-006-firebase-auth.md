# ADR-006: Firebase Authentication with Google sign-in

**Status:** Accepted · **Date:** 2026-09-16 · **Drives:** FR-D1, FR-D2

## Context

The product holds intimate health-adjacent data about one identified person.
Authentication must be solid, but building it is pure cost — there is no
differentiation in writing a password reset flow.

## Decision

**Firebase Authentication with the Google provider.** The PWA obtains a Firebase
ID token; the API verifies it with the Firebase Admin SDK on every request and
derives `userId` from the verified token's `uid`.

Authorisation rule, deliberately trivial: **a user may only ever access
documents under `users/{uid}` where `uid` equals their verified token subject.**
There is no sharing, no org model, no roles in v1. Enforced in middleware and
again in Firestore security rules — belt and braces, because the cost of getting
this wrong is someone else reading a user's bedroom data.

## Alternatives considered

1. **Roll our own email/password with bcrypt + JWT.** Full control, no vendor.
   Rejected: password storage, reset flows, rate limiting, session revocation
   and MFA are all liabilities we would own and probably get subtly wrong.
2. **Auth0 / Clerk.** Excellent DX. Rejected: another vendor and another bill
   for capability Firebase already gives us inside the platform we've chosen in
   ADR-005, with native Firestore rules integration.
3. **Magic links only.** Lowest friction, no password. Rejected as primary:
   email deliverability becomes a dependency for login, and overnight-app users
   want a one-tap morning open. Reasonable v2 addition.

## Consequences

**Positive**
- No credential material ever touches our code or our database.
- The same verified identity drives both API middleware and Firestore rules.
- Google sign-in is one tap on the Android device this user carries.
- Token verification is local (public key cache), so it costs no round trip.

**Negative**
- Hard dependency on Google as identity provider; a user without a Google
  account cannot sign in in v1.
- Firebase ID tokens expire hourly, so the client must refresh — handled by the
  SDK, but it is a moving part during a long overnight session. Mitigated by
  ADR-007: capture never needs the network, so token expiry cannot interrupt a
  Night.
- Couples us further to the Google ecosystem, raising the cost of any future
  cloud migration.

## Validation

- A request with no token, an expired token, or a token for user A against
  user B's path is rejected with 401/403. Covered by contract tests.
- Firestore rules unit tests confirm cross-user reads fail even if middleware
  were bypassed.
