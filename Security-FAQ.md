# Supabase Security FAQ

*A reference compiled from the 2026-05-28 anon-key leak incident on `mondweep/vibe-cast`. Read this before deploying anything that touches a Supabase project — it'll save you from the same traps we hit.*

**Quick navigation:**
1. [Keys: what exists and what each does](#1-keys-what-exists-and-what-each-does)
2. [The RLS mental model](#2-the-rls-mental-model)
3. [SECURITY DEFINER — the silent privilege escalator](#3-security-definer--the-silent-privilege-escalator)
4. [Where secrets hide](#4-where-secrets-hide)
5. [Incident response playbook](#5-incident-response-playbook)
6. [Architectural patterns that work](#6-architectural-patterns-that-work)
7. [Prevention — do this once](#7-prevention--do-this-once)
8. [Cognitum / vibe-cast specifics](#8-cognitum--vibe-cast-specifics)
9. [Quick reference](#9-quick-reference)

---

## 1. Keys — what exists and what each does

### Q: What keys does a Supabase project have, and what's the difference?

Supabase has two generations of keys:

**Legacy (JWT-based, all signed by one shared "JWT secret"):**
| Key | Role claim | Bypasses RLS? | Safe to put in browser? |
|---|---|---|---|
| `anon` (legacy) | `anon` | No — respects RLS | Yes, *if* RLS is tight |
| `service_role` (legacy) | `service_role` | **YES — admin access** | **NEVER** |

**New (independent keys, rotatable individually):**
| Key | Equivalent of | Bypasses RLS? | Safe to put in browser? |
|---|---|---|---|
| `sb_publishable_…` | anon | No | Yes, *if* RLS is tight |
| `sb_secret_…` | service_role | **YES** | **NEVER** |

Both generations work simultaneously until you explicitly disable the legacy ones in Dashboard → Project Settings → API Keys.

### Q: Why two generations?

Legacy keys are all JWTs signed by one project-wide "JWT secret". Rotating one means regenerating the secret, which invalidates **both** legacy keys **and every existing user session token** (because user JWTs are signed by the same secret).

New keys are independent — you can rotate `sb_publishable_*` without affecting `sb_secret_*` or any user sessions. Always prefer the new keys for new work.

### Q: Which key do I use where?

- **Browser / public client code (HTML, SPA):** `sb_publishable_*` (or legacy anon).
- **Server-side code, backend APIs:** `sb_secret_*` (or legacy service_role).
- **IoT device that only needs to insert specific data:** `sb_publishable_*` + a narrow INSERT-only RLS policy on the target table. Do NOT give the device service_role unless it truly needs admin access — see §6.

### Q: If I leak the anon (or publishable) key, am I safe because RLS protects me?

**This was THE central lesson of our incident.** The anon key "respects RLS" — yes — but that only means "RLS is evaluated." If RLS is permissive (e.g. `USING (true)`), the anon role has full access to that table. Our leaked anon key had effective read+write+delete on `chat_messages` and `chat_sessions` *because the policies were `USING (true) WITH CHECK (true)` for `ALL`*.

**Rule:** anon-equivalent keys are only as safe as your RLS policies make them. Assume an attacker has your anon key, then design RLS so that's still OK.

### Q: I leaked the anon key. Do I need to rotate the JWT secret?

Usually no. The narrower, less-disruptive fix:

1. **Dashboard → Project Settings → API Keys** → click **Disable** on the "Legacy anon API key" entry.
2. Migrate clients to the publishable key (you can create one in the same panel if it doesn't exist).

This **disables only the leaked key**, leaves `service_role` working, leaves all user sessions intact. JWT-secret rotation is reserved for service_role leaks or full revocation.

### Q: How do I tell what role a JWT is for?

Decode the middle segment:

```bash
python3 -c "
import base64, json
jwt = 'eyJhbG...your.jwt.here'
p = jwt.split('.')[1]; p += '=' * (-len(p) % 4)
print(json.dumps(json.loads(base64.urlsafe_b64decode(p)), indent=2))
"
```

Look at the `role` field: `"anon"`, `"service_role"`, or `"authenticated"` (for user sessions).

---

## 2. The RLS mental model

### Q: What does RLS actually do?

Row-Level Security restricts which rows a connection can SEE or modify based on a per-table policy expression evaluated for every row. Without RLS, the role's table-level grants are the only gate.

In Supabase, the `anon` and `authenticated` roles have broad table-level privileges (so PostgREST works). **RLS is the only thing that actually narrows them.**

### Q: What's the difference between `USING` and `WITH CHECK`?

- **`USING (expression)`** — which rows the user can **SEE** (and target with UPDATE/DELETE).
- **`WITH CHECK (expression)`** — which rows the user can **CREATE or modify TO**.

Per command:
- `SELECT` policy uses `USING` only.
- `INSERT` policy uses `WITH CHECK` only.
- `UPDATE` can use both: `USING` filters which rows to target, `WITH CHECK` validates the new values.
- `DELETE` uses `USING` only.
- `ALL` covers everything; both clauses apply where relevant.

### Q: What's wrong with `USING (true)`?

It's equivalent to "no filtering." Combined with `FOR ALL`, anyone with the anon key can do anything. Our incident had this exact pattern:

```sql
-- The policy that bit us:
CREATE POLICY "Anon chat messages"
  ON public.chat_messages
  FOR ALL
  USING (true) WITH CHECK (true);
```

`FOR ALL` + `USING (true) WITH CHECK (true)` = SELECT, INSERT, UPDATE, DELETE — all wide open to anyone with the anon key.

A `SELECT` policy with `USING (true)` is sometimes intentional (public-read content) and Supabase's linter doesn't flag it. But `INSERT`/`UPDATE`/`DELETE`/`ALL` policies with `true` are almost always a mistake.

### Q: What should I write instead?

Depends on the table's intent:

**Per-user (authenticated app):**
```sql
CREATE POLICY "users read own"  ON tbl FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own" ON tbl FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own" ON tbl FOR UPDATE USING (auth.uid() = user_id)
                                                   WITH CHECK (auth.uid() = user_id);
```

**Public-read content, service-write:**
```sql
CREATE POLICY "public read"   ON tbl FOR SELECT USING (true);
CREATE POLICY "service write" ON tbl FOR ALL    USING (auth.role() = 'service_role');
```

**Telemetry insert-only (the pattern we set up for `swarm_vitals`):**
```sql
CREATE POLICY "Anon insert telemetry"
  ON public.swarm_vitals
  FOR INSERT
  TO anon
  WITH CHECK (true);
-- No UPDATE/DELETE policies for anon → they can't modify past data.
```

**Session-scoped (anonymous chat keyed by session_key, not auth.uid()):**
harder — typically requires a custom RPC that validates a `session_key` claim, or accepting the trade-off that all session data is readable.

### Q: How do I test that RLS works?

With curl using the anon key:
```bash
# Should succeed if anon has SELECT:
curl -H "apikey: <key>" "https://<proj>.supabase.co/rest/v1/swarm_vitals?select=*&limit=1"

# Should 401 or return empty if anon doesn't:
curl -H "apikey: <key>" "https://<proj>.supabase.co/rest/v1/outreach_list"
```

In SQL via role switching:
```sql
SET LOCAL role TO 'anon';
SELECT * FROM public.chat_messages LIMIT 1;
RESET role;
```

Or just run the security advisor — it flags policies likely to be wrong:
```
mcp__supabase__get_advisors(project_id, type: 'security')
```

---

## 3. SECURITY DEFINER — the silent privilege escalator

### Q: What does SECURITY DEFINER do?

For Postgres functions and views, `SECURITY DEFINER` means "execute with the permissions of the **owner** (typically `postgres`), not the caller." Default is `SECURITY INVOKER` — execute as the caller.

For a view, this is critical: a SECURITY DEFINER view (or a default INVOKER view owned by postgres pre-PG15) **bypasses RLS on the underlying tables**.

### Q: Why is that a problem?

Because Supabase auto-exposes every public function via `/rest/v1/rpc/<name>` and every view as `/rest/v1/<view>`. A SECURITY DEFINER view that reads from a table will return data to **anyone with an anon key**, even if the underlying table has perfect RLS.

**Our incident example:**
```sql
CREATE VIEW public.outreach_list AS
  SELECT name, email, linkedin_url, country, persona, consented_at
  FROM learner_profiles WHERE wants_updates = true;
```

This was readable via `/rest/v1/outreach_list` by anyone with the anon key — exposing every opted-in learner's PII (names + emails + LinkedIn URLs).

### Q: When DO I need SECURITY DEFINER?

When you genuinely need controlled escalation — a function that does something only `postgres` can (e.g., updating a system table), exposed only via specific safe operations.

If you must use it:
1. **Set `search_path` explicitly** inside the function: `SET search_path = ''` (or to specific schemas) — prevents search_path injection attacks.
2. **`REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated;`** then `GRANT EXECUTE TO` only the roles that should call it.
3. **Validate inputs aggressively** — the function runs as postgres.

### Q: How do I lock down a SECURITY DEFINER view I don't want exposed?

Quickest (kept us safe on `outreach_list`):
```sql
REVOKE SELECT ON public.outreach_list FROM anon, authenticated;
```

Cleaner (convert to SECURITY INVOKER so it respects caller's RLS):
```sql
ALTER VIEW public.outreach_list SET (security_invoker = true);
```

For functions:
```sql
REVOKE EXECUTE ON FUNCTION public.my_function() FROM anon, authenticated;
```

---

## 4. Where secrets hide

### Q: I removed the key from the file and committed the fix. Am I done?

**No.** The removed-then-committed file still has the key in git history. Anyone can:
```bash
git log -p --all -S '<key-fragment>'
```
and see it. The fix requires rewriting history (`git filter-repo --replace-text`) and force-pushing.

### Q: I force-pushed after rewriting history. Now we're safe, right?

Still not fully. GitHub retains the original commits for ~90 days as **detached objects accessible by SHA**:
```
https://github.com/<owner>/<repo>/commit/<old-sha>
https://raw.githubusercontent.com/<owner>/<repo>/<old-sha>/<path>
```

Plus:
- **Forks** — never touched by force-push, keep full history forever
- **Search engines** — Google/Bing may have cached
- **Wayback Machine** — `web.archive.org` snapshots
- **Secret-scanner bots** — third parties may have already indexed it

**The only true remediation is to rotate or disable the credential.** Cleanup makes the future cleaner; rotation makes the past harmless.

### Q: How do I find out if a leaked key is still being used?

Check the Supabase API logs over the last 24h:
```
mcp__supabase__get_logs(project_id: "...", service: "api")
```
Look for unusual user agents or IPs hitting `/rest/v1/`.

### Q: My anon key is in the browser anyway. Is committing it to git really a leak?

Yes, still a leak. Because:

1. **GitHub is more easily scrapable** than browser-served HTML — secret scanners crawl it constantly.
2. **Dev/test keys leak too**, with potentially weaker RLS.
3. **One slip and you commit the service_role key** thinking "it's all just keys" — that's catastrophic.
4. **GitHub Push Protection** blocks known-format Supabase keys at push time. If you trip it, fix the source — don't bypass.

Discipline of "no keys in repos, ever" makes accidents impossible. Use `.env.example` / `config.example.js` with placeholders.

---

## 5. Incident response playbook

### Q: A key just leaked. What do I do, in order?

**Contain (within minutes):**
1. **If service_role leaked** → rotate the JWT secret immediately (Dashboard → Settings → API → JWT Settings → "Generate new JWT secret"). Yes, this logs out every user; better than admin-level access in the wild.
2. **If only anon leaked** → disable the legacy anon key (or rotate the publishable). Switch apps to the new key. Far less disruptive.

**Investigate:**
3. `mcp__supabase__get_logs(service: api)` — scan for `POST/PATCH/DELETE` from unexpected user agents or IPs.
4. Check the affected tables for tampering (row counts, anomalous timestamps).
5. Identify every consumer of the key (apps, IoT devices, deployed sites) so you can update them.

**Remediate:**
6. Scrub the key from the working tree of any repo, commit the fix.
7. Rewrite history with `git filter-repo --replace-text` to nuke the literal from past commits.
8. Force-push (`git push --force-with-lease`).
9. Note: forks and old SHA URLs persist — rotation/disable is what actually fixes the underlying issue.
10. Update every consumer with the new key.

**Prevent (so it doesn't recur):**
11. Enable GitHub Secret Scanning + Push Protection (Settings → Code security).
12. Install a pre-commit hook (`gitleaks`).
13. Refactor leaking code to load from env vars structurally.
14. Tighten RLS on every table — assume the anon key is public.

### Q: Rotate JWT secret or disable individual key — which?

| Situation | Rotate JWT secret | Disable single key |
|---|---|---|
| Only anon leaked, publishable key available | ❌ | ✅ |
| Only anon leaked, no other anon key set up | Create publishable first, then this | ✅ |
| Service_role leaked | ✅ (or migrate to `sb_secret_*`) | (no individual disable for legacy service_role exists; rotation only) |
| Want to invalidate all current user sessions | ✅ | ❌ |

### Q: Will disabling the legacy anon key break user sessions?

**No.** User session JWTs are signed with the JWT secret, but disabling a specific key doesn't change the secret. Sessions stay valid. Only rotating the secret invalidates sessions.

---

## 6. Architectural patterns that work

### Q: Can I put a Supabase key in my SPA?

**Yes — only the publishable or legacy anon key.** Never service_role / secret. And only if your RLS:
- Restricts SELECT/UPDATE/DELETE on every sensitive table (no `USING (true)` for anything with PII).
- Restricts INSERT to be either service-only or strictly scoped (e.g., `auth.uid() = user_id`).
- Has no SECURITY DEFINER views/functions exposing data.

### Q: How do I deploy a Supabase SPA without committing the key?

Three options, in increasing security:

1. **Hardcode the publishable key in your HTML.** Supabase's "officially supported" pattern. Skip if you want strict "no creds in repo".
2. **Gitignored config.local.js + manual upload (what we set up for Cognitum).** Create `config.local.js` locally, gitignored, drag-deploy alongside the HTML. Works but every redeploy needs you to include the file.
3. **Build-time injection from platform env vars (Recommended).** Set `SUPABASE_URL` and `SUPABASE_KEY` in Netlify/Vercel env-vars panel. Build command writes them into `config.local.js`. Repo stays clean, deploy gets values at build time.

Our `netlify.toml` (in vibe-cast repo):
```toml
[build]
  publish = "."
  command = """
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
      echo 'ERROR: SUPABASE_URL and SUPABASE_KEY env vars must be set in Netlify.' >&2
      exit 1
    fi
    cat > config.local.js <<EOF
window.SUPABASE_URL = "${SUPABASE_URL}";
window.SUPABASE_KEY = "${SUPABASE_KEY}";
EOF
  """
```

### Q: I have an IoT device that needs to write to Supabase. Which key?

Default to **least privilege**:

- Use the **publishable key** (anon role) on the device.
- Write a **narrow INSERT-only RLS policy** for the table(s) it writes:
  ```sql
  CREATE POLICY "Device telemetry insert"
    ON public.swarm_vitals FOR INSERT TO anon
    WITH CHECK (true);
  ```
- Do NOT give anon UPDATE/DELETE policies on telemetry — the device never needs them.
- Keep service_role / secret keys off the device entirely.

If the device is physically stolen or SSH-compromised, worst case is telemetry spam — not data read or table wipe. We did exactly this on the Cognitum Seed (it was previously using service_role; migrated to publishable + INSERT-only RLS on 2026-05-28).

### Q: I have a backend script that needs admin access. Which key?

`sb_secret_*` (or legacy service_role), loaded from an env var, never committed. Run on a machine you control. Never proxy it through the browser.

---

## 7. Prevention — do this once

### Q: How do I prevent committing a secret?

Three independent layers, all worth setting up:

**Layer 1 — Push protection (server-side, free, already on for vibe-cast):**
Settings → Code security → enable **Secret Scanning** AND **Push Protection**. GitHub blocks `git push` if it sees a known-format secret (Supabase, AWS, Stripe, etc.).

**Layer 2 — Pre-commit hook (developer machine):**
```bash
brew install pre-commit gitleaks
```
Add `.pre-commit-config.yaml` (already set up in this repo):
```yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.30.1
    hooks:
      - id: gitleaks
```
Run `pre-commit install` once. Every `git commit` now scans the diff for secrets and refuses if it finds anything.

**Layer 3 — CI workflow (catches anything that slips through):**
`.github/workflows/gitleaks.yml` runs on every push and PR. Already set up in this repo.

### Q: What about for the Supabase project itself?

Run the security advisor regularly (it's free):
```
mcp__supabase__get_advisors(project_id, type='security')
```
It flags permissive policies, SECURITY DEFINER views/functions, missing RLS, mutable function `search_path` — exactly the issues we found in our incident.

### Q: Do I need all three layers?

Each catches different things:
- Push protection catches **known-format secrets** at the GitHub server boundary. Won't catch low-entropy custom tokens.
- Pre-commit catches **anything matching gitleaks rules** before it leaves your machine. Won't catch what you don't run pre-commit on (e.g., via web UI commits).
- CI scans the full repo on every push, including history scans. Slowest, but most comprehensive.

The three together: belt + suspenders + safety net.

---

## 8. Cognitum / vibe-cast specifics

### Architecture (post-2026-05-28 incident)

```
ESP32-S3 sensors (×2)
       │ UDP/5006 (10 Hz CSI features)
       ↓
Cognitum Seed (RPi Zero 2 W, cognitum-2c3c.local:8443)
   ├─ csi-bridge.service          (raw CSI → 8-dim physical features)
   └─ csi-supabase-pusher.service (every 30s, reads journalctl, pushes)
        │   uses publishable key (NOT service_role — migrated 2026-05-28)
        ↓ HTTPS POST + INSERT-only RLS policy
Supabase project ertsvhwtaeityanbmyzw (eu-west-1)
   ├─ public.swarm_vitals      (telemetry, ~300K rows growing; anon INSERT scoped to node_id IN (1,2))
   ├─ public.chat_messages     (locked down to service_role after Risk A migration)
   ├─ public.learner_profiles  (anon INSERT-only with consent flag; outreach_list view anon SELECT revoked)
   └─ realtime channel (postgres_changes on swarm_vitals)
        │
        ↓ WebSocket + REST
Netlify dashboard (enchanting-mochi-6090de.netlify.app)
   uses publishable key from config.local.js (gitignored)
   manual drag-deploy of netlify-deploy/ folder
```

### Which keys live where (post-incident)

| Location | Key | Notes |
|---|---|---|
| `/home/genesis/seed_push_to_supabase.py` line 11 | publishable | Was legacy service_role until 2026-05-28; migrated to least-privilege |
| Netlify `config.local.js` (drag-deploy) | publishable | Same key |
| `vibe-cast` GitHub repo (any branch) | **NONE** | All scripts load from env; HTML loads from `config.local.js` (gitignored) |
| Local dev `.env` (gitignored) | as needed | |

### RLS state (post-Risk-A hardening, 2026-05-28 end-of-day)

| Table / view | Anon access | Status |
|---|---|---|
| `public.swarm_vitals` | SELECT public; INSERT scoped to `node_id IN (1, 2)` | ✅ Seed-only writes |
| `public.outreach_list` (view) | SELECT REVOKED | ✅ PII protected |
| `public.chat_messages` | None — only `service_role` policy remains | ✅ Locked down |
| `public.chat_sessions` | None — only `service_role` policy remains | ✅ Locked down |
| `public.learner_profiles` | INSERT only with `wants_updates IS NOT NULL` (opt-in) | ✅ Signups OK, no read/update/delete |
| `agentic_ai_news.digests`, `news_items` | SELECT public; INSERT only via service_role | ✅ Public-read content, service-write |
| `public.session_summary`, `topic_frequency`, `cost_by_country` | SELECT REVOKED for anon, authenticated | ✅ Analytics protected |
| `public.rls_auto_enable()` function | EXECUTE revoked from anon, authenticated, PUBLIC | ✅ Locked down |

### Disabled credentials

- Legacy **anon** JWT — disabled 2026-05-28 (the one that leaked).
- Legacy **service_role** JWT — also disabled 2026-05-28.
- Active anon-role credential: `sb_publishable_kRKd9lfuKlMR9d94mt0keQ_CQZEoImN`.

---

## 9. Quick reference

### Key cheatsheet

| Format | Role | Use where |
|---|---|---|
| `eyJhbG…` with `"role":"anon"` | anon | Browser (if RLS tight) — legacy, prefer publishable |
| `eyJhbG…` with `"role":"service_role"` | service_role | Server only, ADMIN — legacy, prefer secret |
| `sb_publishable_…` | anon | Browser (if RLS tight) — recommended |
| `sb_secret_…` | service_role | Server only — recommended |

### Detect any hardcoded JWT in a repo

```bash
git grep -E 'eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}'
```

### Decode a JWT payload

```bash
python3 -c "
import base64, json, sys
jwt = sys.argv[1]
p = jwt.split('.')[1]; p += '=' * (-len(p) % 4)
print(json.dumps(json.loads(base64.urlsafe_b64decode(p)), indent=2))
" eyJhbG...your.jwt.here
```

### Force-push history scrub

```bash
brew install git-filter-repo
echo 'literal:<secret-value>' > expressions.txt
git clone https://github.com/<owner>/<repo>.git
cd <repo>
git filter-repo --replace-text expressions.txt
git remote add origin https://github.com/<owner>/<repo>.git
git push --force --all
```

### Useful Supabase MCP commands

```
mcp__supabase__list_projects
mcp__supabase__get_advisors(project_id, type='security')   # run weekly
mcp__supabase__list_tables(project_id, schemas, verbose)
mcp__supabase__execute_sql(project_id, query)              # for read
mcp__supabase__apply_migration(project_id, name, query)    # for DDL
mcp__supabase__get_logs(project_id, service='api')
mcp__supabase__get_publishable_keys(project_id)
```

### RLS pattern snippets

```sql
-- Public-read content, service-write
CREATE POLICY "public read"   ON tbl FOR SELECT USING (true);
CREATE POLICY "service write" ON tbl FOR ALL    USING (auth.role() = 'service_role');

-- Per-user
CREATE POLICY "users read own"   ON tbl FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own" ON tbl FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Anon insert-only (telemetry / opt-in forms)
CREATE POLICY "anon insert" ON tbl FOR INSERT TO anon WITH CHECK (true);
-- Don't add UPDATE/DELETE/SELECT policies for anon unless you mean to.

-- Lock down a SECURITY DEFINER view
REVOKE SELECT ON public.sensitive_view FROM anon, authenticated;
-- or
ALTER VIEW public.sensitive_view SET (security_invoker = true);
```

---

*This document was generated as part of the 2026-05-28 incident remediation. If you find a gap or have a new question worth adding, append below — keep the FAQ growing as the project evolves.*
