# gcloud Device-Code Authentication in a Claude Code Sandbox

This documents how to reliably run `gcloud auth login` from inside a Claude
Code remote/sandbox session (no browser, no local machine) — the exact
recipe used to deploy this project's Cloud Run services — and the specific
failure modes we hit and fixed along the way.

**tl;dr: device-code auth works fine in this sandbox.** A different session's
handoff notes for this project claimed "OAuth PKCE authentication failed due
to code_verifier timing issues... this is a sandbox environment limitation —
deployment works fine from local machine." That diagnosis was **wrong**. In
this session the exact same `gcloud auth login --no-launch-browser` flow
succeeded multiple times, including a second time after the first token
expired. The real causes of the earlier trouble were the three environmental
issues below, not a fundamental PKCE/sandbox incompatibility. You do not need
a local machine or a service-account key just to authenticate.

## The working recipe

1. **Unset the sandbox's injected fake token before every gcloud command.**
   Some sandbox images pre-set `CLOUDSDK_AUTH_ACCESS_TOKEN=proxy-injected` in
   the environment. gcloud treats that as if you were already authenticated
   with a (bogus) token and silently ignores your real credentials — commands
   fail or behave strangely with no obvious reason why. Fix:
   ```bash
   unset CLOUDSDK_AUTH_ACCESS_TOKEN
   ```
   Run this **inside every Bash tool call** that invokes `gcloud`, including
   the login itself — environment variables don't persist between separate
   Bash tool calls in this harness, so a `~/.bashrc` edit or a one-time
   `unset` earlier in the session will not stick.

2. **Run `gcloud auth login --no-launch-browser` in the background, fed via
   a named pipe, using the Bash tool's own `run_in_background: true`.**
   The login command prints a URL, then blocks waiting on stdin for the
   verification code — which won't arrive until a later conversation turn
   after the user visits the URL. A plain foreground Bash call will hit its
   timeout. The fix that actually works:
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
   Call this via the Bash tool with `run_in_background: true` (not a bare
   trailing `&` alone) — that's what keeps the process alive across tool
   calls and turns, instead of being reaped when the tool call returns.

   Notes on that command:
   - `exec 3<>pipe` opens the fifo **read-write** in the same process that
     then reads from it. A plain `< pipe` (read-only) blocks forever waiting
     for a writer that will never show up on the read side. Read-write avoids
     that deadlock.
   - Read the URL back with `cat "$SCRATCH/gcloud_login.log"` after a couple
     of seconds and hand it to the user.

3. **Feed the verification code back through the same pipe once the user
   provides it:**
   ```bash
   echo "<the code the user pasted>" > "$SCRATCH/gcloud_pipe"
   ```
   Then check the log — you should see `You are now logged in as [...]`.

4. **If the login process died while waiting, the code is stale — start
   over, don't reuse it.** This is the failure that most resembles the other
   session's "PKCE timing" misdiagnosis. If enough time passes between
   printing the URL and the user supplying the code (they had to open a
   browser, sign in, copy the code — this can take minutes), the background
   `gcloud auth login` process can die on its own in some sandboxes. Writing
   the old code to the pipe at that point either hangs (`echo ... > pipe`
   times out with no reader) or gcloud rejects it, because PKCE ties the
   authorization code to the *specific process invocation* that generated
   the code_challenge — a dead process's challenge is gone, no matter how
   valid-looking the code is. This is not a sandbox limitation; it's just a
   stale credential. **Fix:** before feeding a code, verify the login process
   is still alive:
   ```bash
   ps aux | grep "gcloud auth login" | grep -v grep
   ```
   If nothing is running, discard the code, restart step 2 from scratch (new
   pipe, new process, new URL — the `state=` and `code_challenge=` query
   params will be different), and ask the user for a **fresh** code from the
   **new** URL.

5. **Expect to redo this later in a long session — that's normal, not a
   bug.** gcloud's own reauth policy can expire your credentials mid-session
   (`ERROR: ... Reauthentication failed: cannot prompt during non-interactive
   execution`). When you see that, just repeat steps 2–3 to get a fresh
   token; nothing else is wrong.

## A sharp edge in this sandbox's shell: self-matching `pkill`/`grep`

When cleaning up background processes, avoid `pkill -f "<literal string>"`
or `ps aux | grep "<string>" | xargs kill` when `<string>` also appears in
the *cleanup command's own command line* (which it usually does, since you
typically search for the same text you used to start the process). The
shell that's running your `pkill`/`grep` invocation shows up in `ps aux`
with that same string in its own argv, matches its own pattern, and kills
itself — you'll see a bare `Exit code 144` (or another 128+signal number)
with no output and be confused about what happened. It's harmless (nothing
important was killed) but wastes a round trip. Prefer targeting an exact PID
you already captured, or accept that some cleanup calls will self-terminate
harmlessly and just re-run `ps aux` afterward to confirm the real target is
gone.

## Summary of root causes (for quick scanning)

| Symptom | Root cause | Fix |
|---|---|---|
| gcloud ignores your real login / weird auth errors | `CLOUDSDK_AUTH_ACCESS_TOKEN=proxy-injected` env var pre-set in sandbox | `unset CLOUDSDK_AUTH_ACCESS_TOKEN` before every gcloud call |
| `gcloud auth login` hangs / times out in a normal tool call | It blocks on stdin waiting for a code that arrives in a later turn | Run it backgrounded (`run_in_background: true`) via a named pipe |
| Named-pipe login hangs immediately, before any code is entered | `< pipe` opened read-only blocks with no writer | Open read-write: `exec 3<>pipe`, then `<&3` |
| Background process is gone by the time the user's code arrives | Long real-world delay between URL and code (user has to actually go authenticate); process died waiting | Check `ps aux` for the login process before feeding the code; if dead, restart the whole flow for a fresh URL/code — don't reuse the old code |
| "OAuth PKCE code_verifier timing... sandbox limitation" (a prior session's conclusion) | Was actually one of the two causes above, misdiagnosed | Not a real limitation — device-code auth works in-sandbox; use this recipe |
| `gcloud` commands suddenly need reauth deep into a session | Normal periodic reauth policy, not an error state | Just redo the login recipe again |
| Cleanup command exits with code 144 and does nothing visible | `pkill -f`/`grep -f` matched its own invocation's command line | Harmless; target a specific PID instead, or ignore and verify with a fresh `ps aux` |
