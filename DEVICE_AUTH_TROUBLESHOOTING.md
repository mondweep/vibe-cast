# gcloud Device Authentication in a Claude Code Sandbox

**Status: gcloud OAuth device-code login works fine in this sandbox.** An
earlier version of this document concluded otherwise ("PKCE code verifier
timing... fundamentally can't work in sandbox... use a service account key
or a local machine instead"). That conclusion was **wrong**, and is
corrected below — keep reading past "Problem 2" for what actually happened
and why. In a later session, the exact same environment authenticated
successfully with `gcloud auth login --no-launch-browser` **multiple times**
in the same run, including re-authenticating from scratch after a token
expired mid-session, and used that login to run real `gcloud run deploy`
commands. No service-account key, no local machine.

If you're reading this because auth is giving you trouble right now: skip
to **"The recipe that actually works"** below.

---

## Problem 1: the sandbox's dummy token overrides your real login

### Symptom
`gcloud auth list` shows no account, or gcloud behaves as if authenticated
with the wrong identity, even after a login that appeared to succeed.

### Root cause
This sandbox pre-sets `CLOUDSDK_AUTH_ACCESS_TOKEN=proxy-injected` (or
similar) in the environment. gcloud treats that as a valid bearer token and
uses it instead of your real credentials, silently.

### Fix
```bash
unset CLOUDSDK_AUTH_ACCESS_TOKEN
```
Run this **inside every Bash call that invokes `gcloud`**, including the
login command itself. Environment variable changes don't persist between
separate tool calls in this harness — a one-time `unset` earlier in the
session, or an edit to `~/.bashrc`, will not stick for a later non-interactive
call.

This part of the original document was correct and still applies.

---

## Problem 2 (corrected): "PKCE code verifier mismatch" — this was a test artifact, not a sandbox limitation

### What the earlier attempt did, and why it failed
The earlier session tried things like:
```bash
# ❌ each of these starts a brand-new `gcloud auth login` process
echo "4/0AT..." | gcloud auth login --no-launch-browser
gcloud auth login --no-launch-browser <<< "4/0AT..."
```
Every one of those launches a **new** `gcloud auth login` process, which
generates a **new** PKCE `code_verifier` and prints a **new** URL with a new
`code_challenge`. Feeding it a code that was authorized against a *previous*
invocation's URL will always fail with "Invalid code verifier" — but that's
because the code and the process are mismatched, not because the sandbox
can't do OAuth. The same thing would fail identically on a local machine if
you paste a code from one `gcloud auth login` run into a different, later
run of the command.

### What actually works: keep ONE process alive and feed it later
`gcloud auth login --no-launch-browser` blocks on **stdin**, waiting for you
to type the code, and holds the code_verifier in that single process's
memory the whole time — exactly like running it interactively on a local
machine. The trick for a sandbox session is just: start that one process in
the background, keep it alive, and write the code into its stdin once the
user has it — possibly a full conversation turn later. Piping/heredoc-ing a
code into a *new* invocation was never going to work; keeping the *original*
process open and feeding it does.

### The recipe that actually works

1. **Start the login in the background via a read-write named pipe**, so the
   single `gcloud auth login` process can block on stdin without blocking
   the rest of the session:
   ```bash
   SCRATCH=/path/to/scratch   # session scratchpad directory
   rm -f "$SCRATCH/gcloud_pipe" "$SCRATCH/gcloud_login.log"
   mkfifo "$SCRATCH/gcloud_pipe"
   nohup bash -c "exec 3<>$SCRATCH/gcloud_pipe; \
     unset CLOUDSDK_AUTH_ACCESS_TOKEN; \
     gcloud auth login --no-launch-browser --account=you@example.com \
       <&3 > $SCRATCH/gcloud_login.log 2>&1" > /dev/null 2>&1 &
   disown
   ```
   Issue this via the Bash tool with **`run_in_background: true`** — that's
   what keeps the process alive across separate tool calls and conversation
   turns, rather than being reaped when the tool call returns. A bare
   trailing `&` with no `run_in_background` is not reliable for surviving
   past the end of the current tool call.

   Two details that matter:
   - `exec 3<>pipe` opens the fifo **read-write**, in the *same* process that
     then reads from it via `<&3`. A plain `< pipe` (read-only open) blocks
     forever waiting for a writer, because nothing has written to it yet —
     that's a deadlock, not a slow success.
   - Read the printed URL with `cat "$SCRATCH/gcloud_login.log"` after a
     couple of seconds and hand it to the user to open and complete.

2. **Feed the verification code back through the same pipe** once the user
   supplies it — this writes into the *original* process's stdin, the one
   that still holds the matching code_verifier:
   ```bash
   echo "<the code the user pasted>" > "$SCRATCH/gcloud_pipe"
   ```
   Check the log; you should see `You are now logged in as [...]`.

3. **If the process died while waiting, the code is genuinely stale —
   restart from scratch, don't retry it.** This is the one case that really
   does look like the old "PKCE timing" symptom, and it's worth
   understanding precisely: if a long real-world delay passes between
   printing the URL and the user supplying the code (they have to open a
   browser, sign in, copy a code — this can take minutes), the backgrounded
   process can die on its own in some sandbox configurations while it waits.
   Once that process is gone, its code_verifier is gone with it — no code
   generated against that URL can ever complete the exchange, no matter how
   correct it looks. Check before feeding a code:
   ```bash
   ps aux | grep "gcloud auth login" | grep -v grep
   ```
   If nothing is running, don't retry the same code — restart step 1
   completely (new pipe, new process, new URL with a new `state=` and
   `code_challenge=`) and ask the user for a fresh code from the fresh URL.

4. **Expect to redo this later in a long session — that's normal.** gcloud's
   own reauth policy can expire your credentials mid-session:
   ```
   ERROR: ... Reauthentication failed: cannot prompt during non-interactive execution.
   ```
   When you see that, just repeat steps 1–2 for a new token. Nothing else is
   wrong, and it is not evidence that OAuth "doesn't work here" — it worked
   before and it will work again the same way.

### A sharp edge worth knowing about while doing this: self-matching `pkill`

When cleaning up the background login process or its pipe, avoid
`pkill -f "<literal string>"` (or `ps aux | grep "<string>" | xargs kill`)
when `<string>` also appears in the *cleanup command's own command line* —
which it usually will, since you're typically searching for the same text
used to start the process. The shell running your `pkill` shows up in `ps`
with that string in its own argv, matches its own pattern, and kills itself.
You'll see a bare `Exit code 144` (or another 128+signal number) with no
output, which looks alarming but is harmless — nothing you actually wanted
killed was affected. Target a specific PID instead, or just re-run `ps aux`
afterward to confirm the real target is gone.

---

## When would a service-account key or local-machine deploy still make sense?

The corrected finding above is specifically that **device-code OAuth login
works in this sandbox** — it removes the *need* to fall back to a
service-account key or a local machine *purely to work around a sandbox
auth limitation*, because that limitation doesn't exist. There can be other,
independent reasons to prefer a service account (e.g., a CI pipeline that
shouldn't depend on any human's interactive login, or an org policy against
personal OAuth credentials for automation) — those are legitimate calls to
make on their own merits, just not ones this sandbox forces on you.

---

## Quick reference

| Symptom | Root cause | Fix |
|---|---|---|
| gcloud ignores your real login / wrong identity | `CLOUDSDK_AUTH_ACCESS_TOKEN` pre-set in sandbox env | `unset CLOUDSDK_AUTH_ACCESS_TOKEN` before every gcloud call |
| "Invalid code verifier" after piping a code into `gcloud auth login <<< "$CODE"` or via a pipe | Each invocation is a *new* process with a *new* verifier/URL; the code was authorized against a different (earlier) invocation | Don't invoke `gcloud auth login` again to submit the code — keep the *original* backgrounded process alive and write the code into *its* stdin via a named pipe |
| `gcloud auth login` hangs / times out in a normal tool call | It blocks on stdin waiting for a code that arrives in a later conversation turn | Run it backgrounded (`run_in_background: true`) via a named pipe |
| Named-pipe login hangs immediately, before any code is entered | `< pipe` opened read-only blocks with no writer | Open read-write: `exec 3<>pipe`, then `<&3` |
| Background process is gone by the time the user's code arrives | Long real-world delay between URL and code; process died while waiting — **or the whole VM recycled**, see the Addendum below | Run `uptime -s` first: a boot time newer than your files means the VM restarted and no backgrounding trick will help. Otherwise check `ps aux` before feeding the code; if dead, restart the whole flow for a fresh URL/code |
| gcloud commands suddenly need reauth deep into a session | Normal periodic reauth policy, not an error state | Redo the login recipe again |
| Cleanup command exits with code 144 and does nothing visible | `pkill -f`/`grep -f` matched its own invocation's command line | Harmless; target a specific PID, or verify with a fresh `ps aux` |

## Files referenced elsewhere in this repo

- `AUTHENTICATE_AND_DEPLOY.sh`, `QUICK_DEPLOY.sh` — deployment scripts that
  support multiple auth methods, including service-account keys. They
  remain valid options; just know that the "no interactive auth available in
  this sandbox" premise some of their surrounding docs were written under is
  not accurate — device-code login is also an option, and requires no key
  file to create, store, or later delete.

---

## Addendum to Part 1: when the sandbox VM itself recycles

*(Ported from `mondweep/JHU-Cohorts-SharedOutput`, `docs/DEVICE_AUTH_TROUBLESHOOTING.md`
on branch `deepevals`. Everything from here down originated there; the
confirmations marked "Confirmed in this repo" were observed while deploying
this project.)*

Part 1 says device-code login "works fine in this sandbox". True — *provided
the sandbox stays alive*. In one session (JHU-Week9, 2026-09-12) the whole
Firecracker microVM was rebooting between conversation turns, which kills any
background process regardless of `nohup`, `setsid`, `disown`, or `tmux`. Five
consecutive login attempts died mid-flow, once between two back-to-back tool
calls seconds apart.

**Diagnose it in one command** — do this before blaming your FIFO recipe:

```bash
uptime -s   # boot time. If it's seconds/minutes ago and your files are older, the VM restarted.
```

Corroborate with `dmesg | head` (a fresh kernel boot log) and by noting that
disk state survives (git repo, `/opt`) while every process is gone. When the
VM is recycling on that cadence, no in-sandbox technique will hold a login
process across a human round-trip — use a service-account key, or run the
deploy from a laptop. On a laptop `gcloud auth login` just opens a browser and
completes over a localhost redirect: no code relay, none of Part 1's
machinery.

> **Confirmed in this repo (e-vidhayak deploy session, 2026-09-12).** A first
> `gcloud auth login` died between turns and its verification code was
> unusable. The death was *initially misdiagnosed* as the process being reaped with
> its process group, and `setsid` was added as the supposed fix. A later
> `uptime -s` showed the VM had booted **47 seconds ago** while scratch files
> from four hours earlier survived on disk — i.e. the microVM had recycled, and
> the second login had survived only because no reboot fell inside its window.
> `setsid` was not the fix and does not help here. Run `uptime -s` *first*;
> it settles in one command what process-level theorising cannot.
>
> Also confirmed: **credentials persist across the reboot**, because gcloud
> writes them to disk. After a recycle, check
> `gcloud auth print-access-token` before assuming you must re-login — a
> valid token means you can carry straight on deploying.

Also normal, and not a sandbox problem: `Reauthentication failed. cannot
prompt during non-interactive execution.` That is the periodic reauth policy.
Re-run `gcloud auth login`.

---

# Part 2: Cloud Run deployment — the traps that actually cost time

## Trap 1: `/healthz` never reaches your container (the expensive one)

**Symptom.** Your service returns a generic Google-branded HTML 404
(`Error 404 (Not Found)!!1`, robot image) for `/healthz`. Container logs show
*other* paths arriving but never `/healthz`. It looks exactly like the service
was never routed.

**Reality.** Google's frontend, sitting in front of Cloud Run, intercepts
`/healthz`. The request never reaches your container, so nothing you change
about the service can fix it.

**Fix.** Name the endpoint `/health`, `/healthcheck`, `/_health` — anything but
`/healthz`.

**Diagnose in 30 seconds, before anything drastic:** curl a *second* path.

```bash
curl -s https://SERVICE-URL/            # your framework's 404 body? service is FINE
curl -s https://SERVICE-URL/openapi.json  # 200? definitely fine
```

**Read the 404's body — it tells you who answered:**

| Response body | Meaning |
|---|---|
| Google-branded HTML `Error 404 (Not Found)!!1` | Never reached your app |
| Your framework's own body (e.g. `{"detail":"Not Found"}`) | Reached your app; the app 404'd |

**What this cost when we didn't know it:** we deleted and recreated the
service, deployed under a new service name, spun up a brand-new GCP project,
and tried a second region — all chasing a phantom. The very first deploy had
been serving correctly the entire time.

> **Confirmed in this repo.** `backend/src/index.ts` defines `/health`, not
> `/healthz`, so this project is already on the safe side of the trap — keep it
> that way. The trap's diagnostic is still the fastest reachability check we
> have: probing `/nope` on the backend returns
> `{"success":false,"error":"Not found"}`, our own Express error body, which
> proves routing *and* IAM are both fine without touching the console.

## Trap 2: read the status code as a routing signal

| Code | Means |
|---|---|
| **403** | The edge *found* your service; IAM refused. Routing is fine. |
| **404** (Google HTML) | The edge did not route that path to your service. |
| Your app's own error | Routing *and* IAM are both fine. |

**Control experiment** — deploy a known-good stock container beside yours:

```bash
gcloud run deploy hello-test \
  --image us-docker.pkg.dev/cloudrun/container/hello \
  --region us-central1 --project PROJECT --allow-unauthenticated
```

If the control behaves differently from your service, the difference is in
*your* service or the path you're probing — not the platform. This is the test
that finally cracked Trap 1: the control returned 403 where ours returned 404.

## Trap 3: `--allow-unauthenticated` can silently fail

The deploy "succeeds" but prints:

```
Completed with warnings:
  Setting IAM policy failed, try "gcloud beta run services add-iam-policy-binding
  --region=... --member=allUsers --role=roles/run.invoker SERVICE"
```

**Cause.** The org policy `iam.allowedPolicyMemberDomains` (Domain Restricted
Sharing) forbids binding `allUsers`. **Effect.** Service is up; every anonymous
request gets 403.

```bash
# is it enforced here?
gcloud resource-manager org-policies describe iam.allowedPolicyMemberDomains \
  --project PROJECT --effective
# ("restoreDefault: {}" means public sharing IS allowed in this project)

# work around it while testing
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" https://SERVICE-URL/
```

> **Confirmed in this repo.** On `e-vidhayak` the effective policy is
> `listPolicy: allValues: ALLOW`, and `allUsers` is genuinely bound on both
> `navier-stokes-backend` and `navier-stokes-frontend`. Verify the binding
> rather than inferring it from a `200`:
>
> ```bash
> gcloud run services get-iam-policy SERVICE --region us-central1 \
>   --project e-vidhayak --format='value(bindings.members)'
> ```

## Trap 4: a brand-new project needs two IAM grants before `--source` deploys work

On `gcloud run deploy --source`, the default compute service account
(`PROJECT_NUMBER-compute@developer.gserviceaccount.com`) *is* the build service
account — and on a fresh project it starts with no roles. Older projects
usually carry legacy `roles/editor` on it, which is exactly why deploys "just
work" there and fail on a new one.

**Symptom A** — `PERMISSION_DENIED ... could not resolve source ...
storage.objects.get denied`:

```bash
gcloud projects add-iam-policy-binding PROJECT \
  --member="serviceAccount:NNN-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
# bucket-level takes effect faster than project-level propagation:
gsutil iam ch serviceAccount:NNN-compute@developer.gserviceaccount.com:objectViewer \
  gs://run-sources-PROJECT-REGION
```

**Symptom B** — the build fails with **completely empty logs**:

```bash
gcloud projects add-iam-policy-binding PROJECT \
  --member="serviceAccount:NNN-compute@developer.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"
```

Empty build logs are the signature of a build SA that cannot write logs or
push to Artifact Registry — **not** of a broken Dockerfile. Don't go debugging
your build.

> **Confirmed in this repo.** `58061828953-compute@developer.gserviceaccount.com`
> already holds `roles/storage.objectViewer`, `roles/artifactregistry.writer`,
> `roles/logging.logWriter`, `roles/run.admin`, `roles/datastore.user`,
> `roles/iam.serviceAccountUser` and `roles/secretmanager.secretAccessor` —
> which covers both symptoms above without the composite
> `roles/cloudbuild.builds.builder`. Check before deploying into any *new*
> project:
>
> ```bash
> gcloud projects get-iam-policy PROJECT --flatten="bindings[].members" \
>   --filter="bindings.members:NNN-compute@developer.gserviceaccount.com" \
>   --format='value(bindings.role)'
> ```

## Trap 5: build logs are region-scoped

`gcloud builds list --project P` returns nothing for Cloud Run source deploys.
Add the region:

```bash
gcloud builds list --project P --region us-central1 --limit 3
gcloud builds log BUILD_ID --project P --region us-central1
```

## Trap 6: a secret's name is not its contents

Mounting a Secret Manager secret called `openai-api-key` does not mean it holds
an OpenAI key. Ours held an unrelated encrypted token; the only symptom was a
runtime `401 ... invalid_api_key` from inside the app, long after a "successful"
deploy. Verify a secret's provenance before wiring it into a new service, and
prefer a per-service secret over a shared one — adding a version to a shared
secret can break whatever else consumes it.

## The 60-second triage order for "my Cloud Run service is unreachable"

1. `curl` a **second path** (`/`, `/docs`, `/openapi.json`). If your app answers
   anything at all, routing is fine — suspect the path (Trap 1).
2. Look at the 404 **body**: Google HTML vs your framework's own error.
3. Retry with `-H "Authorization: Bearer $(gcloud auth print-identity-token)"`.
   403 → 200 means it was only IAM (Trap 3).
4. `gcloud run services describe SVC --region R --format='value(status.url,status.conditions)'`
   → is `Ready=True`?
5. Check container logs for **any** inbound request, and note **which** paths
   arrive. "Some paths arrive, one never does" is the Trap 1 fingerprint.
6. Deploy the stock hello container as a control (Trap 2).
7. **Only then** consider redeploying. Do not delete/recreate, rename, change
   region, or change project first — none of that fixes a reserved-path, IAM,
   or build-SA problem, and each one costs 5-10 minutes of build time.

---

# Part 3: traps specific to deploying *this* repo

Observed while deploying `claude/navier-stokes-orphan-branch-0gxmj0` to
`e-vidhayak` / `us-central1`. These are ours, not ported.

## Trap 7: `cloudbuild.yaml` wipes the backend's Firebase env var

`--set-env-vars` **replaces the entire env set**; it does not merge. The
backend step in `cloudbuild.yaml` passes only:

```yaml
- '--set-env-vars=NODE_ENV=production'
```

but the running service also carries `FIREBASE_PROJECT_ID=e-vidhayak`.
Deploying the documented way therefore silently drops it, and Firestore breaks
at runtime rather than at deploy time. Either add the var to the config, or
switch to `--update-env-vars`, which merges.

**The general lesson: deploy config is not a description of the running
service.** Diff them before every deploy:

```bash
gcloud run services describe SERVICE --region us-central1 --project e-vidhayak \
  --format='yaml(spec.template.spec.containers[].env)'
```

## Trap 8: the docs and the live services disagree about the image registry

`cloudbuild.yaml` and `DEPLOYMENT.md` build to `gcr.io/$PROJECT_ID/...`, but the
live services actually run images from
`us-central1-docker.pkg.dev/e-vidhayak/cloud-run-source-deploy/...` — i.e. they
were deployed with `gcloud run deploy --source`, not from the committed config.
Following the docs works, but quietly migrates the service to a different
registry. `gcloud run deploy --source .` keeps the existing Artifact Registry
path.

## Trap 9: no Docker daemon in the sandbox

`deploy.sh` and any local `docker build` cannot run here — the Docker CLI is
installed but `/var/run/docker.sock` does not exist. Use Cloud Build instead
(`gcloud run deploy --source .` or `gcloud builds submit`), which needs no local
daemon.

## Worth doing before any deploy from this repo

Both services build clean locally in well under a minute, so validate before
spending 5-10 minutes on a Cloud Build round trip:

```bash
(cd frontend && npm ci --legacy-peer-deps && npm run build)
(cd backend  && npm ci && npm run build)
```

After deploying, confirm the frontend is really serving new code by comparing
the hashed bundle name against your local build, rather than trusting the
revision number:

```bash
curl -s https://navier-stokes-frontend-58061828953.us-central1.run.app/ \
  | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'
ls frontend/dist/assets/*.js
```
