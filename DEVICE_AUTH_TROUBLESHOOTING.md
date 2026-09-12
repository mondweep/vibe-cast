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
| Background process is gone by the time the user's code arrives | Long real-world delay between URL and code; process died while waiting | Check `ps aux` before feeding the code; if dead, restart the whole flow for a fresh URL/code |
| gcloud commands suddenly need reauth deep into a session | Normal periodic reauth policy, not an error state | Redo the login recipe again |
| Cleanup command exits with code 144 and does nothing visible | `pkill -f`/`grep -f` matched its own invocation's command line | Harmless; target a specific PID, or verify with a fresh `ps aux` |

## Files referenced elsewhere in this repo

- `AUTHENTICATE_AND_DEPLOY.sh`, `QUICK_DEPLOY.sh` — deployment scripts that
  support multiple auth methods, including service-account keys. They
  remain valid options; just know that the "no interactive auth available in
  this sandbox" premise some of their surrounding docs were written under is
  not accurate — device-code login is also an option, and requires no key
  file to create, store, or later delete.
