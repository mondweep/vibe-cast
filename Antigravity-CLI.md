# Getting the Antigravity CLI Working in the Terminal

This documents how we installed and ran Google's **Antigravity CLI** (`agy`) from the
terminal — a Claude Code–style agentic CLI — on macOS (Apple Silicon).

## TL;DR

- The CLI command is **`agy`** (not `antigravity`).
- It installs to **`~/.local/bin/agy`**.
- After install, **open a new terminal** (or `source ~/.zshrc`) so `~/.local/bin` is on your `PATH`.
- Start it with `agy`, or skip all permission prompts with `agy --dangerously-skip-permissions`.

```bash
# install
curl -fsSL https://antigravity.google/cli/install.sh | bash

# reload PATH (or just open a new terminal)
source ~/.zshrc

# run
agy                                  # interactive session
agy --dangerously-skip-permissions   # auto-approve all tool calls
```

## Background

The goal was to drive Antigravity from the terminal — the same way you run
`claude --dangerously-skip-permissions` — rather than working inside the Antigravity GUI IDE.

There are two distinct things on disk, which is what initially caused confusion:

| Item | What it is |
|------|------------|
| `/Applications/Antigravity.app` | The Gemini agentic **GUI** app (asar-packed; contains `language_server`, `webm_encoder`). No usable terminal launcher. |
| `/Applications/Antigravity IDE.app` | A VS Code fork. Ships a `bin/antigravity-ide` launcher that only **opens the GUI** (standard VS Code CLI flags). |
| `~/.local/bin/agy` | The **actual Antigravity CLI** — a native agent that runs entirely in the terminal. This is what we wanted. |

## Step-by-step (what we actually did)

### 1. First install attempt silently failed

The initial run of the installer appeared to do nothing useful:

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

Investigation showed **no `agy` binary was ever written** to disk. The only
`agy` / `antigravity` entries present were **dangling symlinks** left behind by the
GUI app:

```
~/.antigravity/antigravity/bin/agy         -> /Applications/Antigravity.app/.../app/bin/antigravity   (MISSING)
~/.antigravity/antigravity/bin/antigravity -> /Applications/Antigravity.app/.../app/bin/antigravity   (MISSING)
```

These point at a path that doesn't exist in the current app bundle (the app is
asar-packed), so any `agy`/`antigravity` command resolved to nothing. The first
`curl | bash` had errored out partway through the pipe without installing the binary.

### 2. Re-running the installer succeeded

Re-running the same command completed cleanly:

```
✓ Platform detected: darwin_arm64
✓ Latest available version: 1.0.2
✓ Download complete and checksum verified.
✓ Configuring shell environment...
Appending PATH export to profile ~/.zshrc / ~/.zprofile / ~/.bash_profile / ~/.profile / fish config:
    export PATH="/Users/<you>/.local/bin:$PATH"
✅ Antigravity CLI installed successfully at ~/.local/bin/agy
Run 'agy' to start the CLI
```

The installer:
- Detects platform (`darwin_arm64`), downloads the matching native binary, and verifies its SHA512 checksum.
- Installs the binary to `~/.local/bin/agy` (~140 MB Mach-O arm64 executable).
- Appends a `PATH` export for `~/.local/bin` to every shell profile it finds (`.zshrc`, `.zprofile`, `.bash_profile`, `.profile`, fish config).
- Self-updates in the background during normal runs.

### 3. Reload the shell and verify

```bash
source ~/.zshrc          # or open a fresh terminal
which agy                # -> /Users/<you>/.local/bin/agy
agy --version            # -> 1.0.2
```

> Note: the profile change does **not** affect terminal tabs that were already open.
> Use a new terminal or `source` the profile, otherwise `agy` shows as "command not found"
> even though it is installed.

## Usage reference

`agy` is modeled on Claude Code and supports the same `--dangerously-skip-permissions` flag.

```
Usage of agy:
  --add-dir                       Add a directory to the workspace (repeatable)
  -c, --continue                  Continue the most recent conversation
  --conversation <id>             Resume a previous conversation by ID
  --dangerously-skip-permissions  Auto-approve all tool permission requests without prompting
  -i, --prompt-interactive <p>    Run an initial prompt interactively and continue the session
  -p, --print / --prompt <p>      Run a single prompt non-interactively and print the response
  --print-timeout <dur>           Timeout for print mode wait (default 5m)
  --log-file <path>               Override CLI log file path
  --sandbox                       Run in a sandbox with terminal restrictions enabled

Subcommands:
  agy update          Update the CLI
  agy plugin ...      Manage plugins (install, uninstall, list, enable, disable)
  agy changelog       Show changelog and release notes
  agy install         Configure environment paths and shell settings
  agy help <cmd>      Show help for a subcommand
```

### Common commands

```bash
agy                                       # start an interactive session
agy --dangerously-skip-permissions        # interactive, no permission prompts
agy --sandbox                             # interactive, sandboxed terminal
agy -c                                    # continue the most recent conversation
agy -p "summarize the changes in this repo"   # one-shot, print and exit
agy --add-dir ../other-project            # include an extra directory in the workspace
agy update                                # update the CLI manually
```

## Troubleshooting

- **`command not found: agy`** — Your current terminal hasn't picked up the new
  `PATH`. Run `source ~/.zshrc` or open a new terminal. As a fallback, call it by full
  path: `~/.local/bin/agy`.
- **Installer "did nothing"** — If no binary appears at `~/.local/bin/agy`, the
  `curl | bash` pipe failed mid-run. Re-run it and watch the output for the final
  `✅ ... installed successfully` line.
- **Stale `~/.antigravity/antigravity/bin` symlinks** — These are leftovers from the
  GUI app and are unrelated to the CLI. The CLI lives at `~/.local/bin/agy`. They can be
  ignored.

## Environment where this was verified

- macOS (Darwin 24.5.0), Apple Silicon (`arm64`)
- Shell: zsh
- Antigravity CLI version: **1.0.2**
- Binary: `~/.local/bin/agy` (Mach-O 64-bit executable arm64, ~140 MB)
