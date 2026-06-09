# ADR-018: Freemium Coupon-Based Access Control

- **Status:** Accepted
- **Date:** 2026-06-09
- **Deciders:** Monetisation swarm (architect, migration-engineer, backend-coder, frontend-coder)
- **Supersedes / relates to:** ADR-013 (Learning Domain & Curriculum), ADR-011 (CQRS Read-Model Strategy)

## Context

learn-ruflo currently exposes the full curriculum (Beginner, Intermediate, Advanced
paths) free to every registered learner. The business now wants a **freemium
monetisation gate**:

- The **Beginner path** stays free for all registered users (acquisition funnel).
- The **Intermediate** and **Advanced** paths become **premium** — a learner must
  hold valid, time-bound access to enrol.
- Access is granted by **human-readable coupons** (e.g. `RUFLO-K7M2-P9QW`) that an
  admin issues. Coupons default to a **1-week expiry**, support a **trial** workflow
  (free coupons to selected users), and can be **renewed** (expiry extended).
- The UX must eventually surface a **"Premium" badge + lock** on gated paths when a
  learner has no active access, and present a redemption flow.

We are explicitly **not** integrating a payment processor (Stripe, etc.) at this
stage. The product needs the access-control mechanism first; billing can be layered
on later by having a future payment webhook *issue a coupon* on successful payment.

## Decision

Introduce a **coupon as the unit of access**. A coupon is an opaque, admin-minted,
time-bound token that, when redeemed by a learner, grants that learner access to a
set of path tiers (`INTERMEDIATE`, `ADVANCED`, or `ALL`) until a per-redemption
expiry.

Key decisions:

1. **Coupon, not payment, is the token of access.** The enrolment gate checks for an
   active *redemption*, never for a payment record. This decouples access control
   from billing and lets the same gate serve trials, promos, and (future) paid
   purchases — a payment success handler simply mints a coupon and redeems it.

2. **Two tables (CQRS-aligned, ADR-011 naming).** `ruflo_demo_coupon` (the issuable
   token) and `ruflo_demo_coupon_redemption` (the per-learner grant). Doubled-prefix
   naming (`ruflo_demo_coupon`) is consistent with every other table in the
   `ruflo_demo` schema (001/002/008/013...).

3. **Redemption copies the expiry at redeem-time** (`access_expires_at`). The
   redemption stores the coupon's `expires_at` *as of the moment it was redeemed*, so
   that renewing a coupon does **not** silently re-grant access to learners whose
   access already lapsed. Renewal explicitly walks the redemption rows and extends
   only those that have **not yet expired past the new date** (controlled extension,
   never accidental resurrection).

4. **`max_uses` / `use_count` cap distinct redemptions.** A coupon can be single-use
   (default, `max_uses = 1`) or multi-use (e.g. a cohort trial code). The
   `UNIQUE(coupon_id, user_id)` constraint makes redemption idempotent per learner —
   re-redeeming the same code returns the existing grant rather than burning a use.

5. **Tier modelling matches the existing `level` column.** Paths already carry a
   `level` (`beginner` / `intermediate` / `advanced`, **lowercase**) on
   `ruflo_demo_learning_path_read_model`. Coupons store `tier_access` as **uppercase**
   tokens (`INTERMEDIATE`, `ADVANCED`, `ALL`). The enrolment guard **normalises**
   `path.level.toUpperCase()` before comparison so the two representations line up.
   `ALL` is a wildcard for blanket-access trial/promo coupons.

6. **RLS-enforced separation of duties.**
   - `ruflo_demo_coupon`: `service_role` full access; `authenticated` may **read**
     active + non-expired coupons (so the client can pre-validate a code before
     redeeming); `anon` has no access.
   - `ruflo_demo_coupon_redemption`: `service_role` full access; `authenticated` may
     read and insert **only their own** rows (`user_id = auth.uid()`).
   - All issuance/renew/deactivate writes flow through the backend using the **secret
     (service-role) key** behind an **admin JWT check** (`app_metadata.role ===
     'admin'`), never client-side. RLS is defence-in-depth, the admin JWT check is the
     primary authorisation gate.

7. **Admin identity from the JWT.** Admin endpoints verify
   `app_metadata.role === 'admin'` on the Supabase session token. `issued_by` records
   the admin's user id (nullable for system/payment-issued coupons).

8. **402 Payment Required is the gate signal.** When a learner without active access
   tries to enrol in a premium path, the enrolment endpoint returns
   `402 { error: 'PREMIUM_REQUIRED', tier: 'INTERMEDIATE' }`. The Beginner path
   bypasses the check entirely. This gives the frontend an unambiguous, machine-
   readable signal to render the redemption modal.

## Schema decisions

### `ruflo_demo.ruflo_demo_coupon`

| column      | type          | notes |
|-------------|---------------|-------|
| `id`        | UUID PK       | `gen_random_uuid()` |
| `code`      | VARCHAR(32) UNIQUE NOT NULL | human-readable, e.g. `RUFLO-AB12-CD34` |
| `tier_access` | TEXT[] NOT NULL DEFAULT `{INTERMEDIATE,ADVANCED}` | tiers this unlocks; `ALL` = wildcard |
| `expires_at` | TIMESTAMPTZ NOT NULL | coupon expiry (renew extends this) |
| `max_uses`  | INTEGER NOT NULL DEFAULT 1 | distinct learners that may redeem |
| `use_count` | INTEGER NOT NULL DEFAULT 0 | incremented on each new redemption |
| `issued_by` | UUID (nullable) | admin user id; null for system-issued |
| `notes`     | TEXT | admin notes |
| `is_active` | BOOLEAN NOT NULL DEFAULT true | soft-deactivate flag |
| `created_at`| TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

### `ruflo_demo.ruflo_demo_coupon_redemption`

| column              | type        | notes |
|---------------------|-------------|-------|
| `id`                | UUID PK     | `gen_random_uuid()` |
| `coupon_id`         | UUID NOT NULL FK → `ruflo_demo_coupon(id)` | |
| `user_id`           | UUID NOT NULL | the learner (`auth.uid()`) |
| `redeemed_at`       | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |
| `access_expires_at` | TIMESTAMPTZ NOT NULL | snapshot of coupon.expires_at at redeem time |
| —                   | UNIQUE(coupon_id, user_id) | idempotent per learner |

### Active-access query (single source of truth for the gate)

```sql
SELECT r.*
FROM ruflo_demo.ruflo_demo_coupon_redemption r
JOIN ruflo_demo.ruflo_demo_coupon c ON r.coupon_id = c.id
WHERE r.user_id = $userId
  AND c.is_active = true
  AND r.access_expires_at > NOW()
  AND (c.tier_access @> ARRAY[$tier] OR c.tier_access @> ARRAY['ALL'])
LIMIT 1;
```

## Consequences

**Positive**
- Monetisation gate ships without committing to a payment provider; billing can be
  bolted on later by minting+redeeming a coupon on payment success.
- Trials and promos are first-class (free coupons, multi-use cohort codes, renewals).
- Per-redemption expiry snapshot means renewals are explicit and auditable — no
  accidental access resurrection.
- RLS + admin-JWT defence-in-depth; coupon issuance never touches the client.

**Negative / trade-offs**
- Coupon codes are bearer tokens: anyone with a code can redeem (up to `max_uses`).
  Mitigated by short default expiry, `max_uses` caps, and per-learner uniqueness.
- No automated revocation of *already-granted* redemptions when a coupon is
  deactivated — `is_active = false` blocks **new** redemptions and (because the gate
  query joins on `c.is_active = true`) immediately revokes access for existing
  redemptions too. Renewal/deactivation is admin-only and audited via `issued_by`.
- A second representation of "tier" (uppercase coupon tokens vs lowercase path
  `level`) requires normalisation in the guard; documented and centralised in one
  helper to avoid drift.

**Follow-ups**
- Future ADR for payment-webhook → coupon minting once billing is added.
- Optional: scheduled worker to expire-sweep / notify learners ahead of lapse.
