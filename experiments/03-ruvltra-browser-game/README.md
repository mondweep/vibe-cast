# 03 — Word Smuggler: RuvLTRA in the browser

A playable browser game running the RuvLTRA GGUF **entirely client-side** through llama.cpp
compiled to WebAssembly. No server, no API key, nothing leaves your machine.

**The game:** a secret word is shown. Get the model to say it — but you're forbidden from typing
it yourself. From level 2, taboo words block the obvious routes. Five attempts per word.

## Play it

```bash
python3 serve.py            # then open http://localhost:8000
```

First load downloads ~398 MB from HuggingFace and caches it in the browser; afterwards it works
offline. To use a local copy instead of downloading:

```bash
curl -L -o model.gguf \
  https://huggingface.co/ruv/ruvltra/resolve/main/ruvltra-claude-code-0.5b-q4_k_m.gguf
# then open http://localhost:8000/?model=./model.gguf
```

### Threading on static hosts

llama.cpp's WASM build only uses multiple threads when the page is **cross-origin isolated**, which
normally requires COOP/COEP response headers. `serve.py` sends them. GitHub Pages can't send custom
headers at all — so `coi-serviceworker.js` injects them onto same-origin responses from a service
worker instead, and the page reloads once to let it take effect.

Verified with an A/B test in fresh browser contexts against a deliberately header-less server
(`serve.py --no-coi`, which mimics GitHub Pages):

| | `crossOriginIsolated` | threads |
|---|---|---|
| Service worker blocked | `false` | 1 |
| Service worker active | `true` | 4 |

Cross-origin requests (the wllama CDN, the model on HuggingFace) are deliberately **not** proxied by
the worker — they're fetched in CORS mode and both hosts send `access-control-allow-origin`, which
already satisfies COEP. Passing 398 MB through a service worker would add risk and no benefit.

It fails safe: if registration is blocked, the game runs single-threaded rather than breaking.

Fully offline (no CDN, no HuggingFace) — vendors wllama and the model locally:

```bash
./fetch-assets.sh
python3 serve.py
# open http://localhost:8000/?wllama=./vendor/&model=./model.gguf
```

**Query params**

| param | default | what it does |
|---|---|---|
| `model` | HuggingFace URL | GGUF to load (`./model.gguf` for a local copy) |
| `wllama` | jsdelivr CDN | base URL for the WASM runtime (`./vendor/` when vendored) |
| `maxTokens` | `52` | generation cap per turn |
| `word` | random | pin the first round to one word, e.g. `?word=banana` |

## Why this game, for this model

RuvLTRA is Qwen2-0.5B-Instruct (experiment 02) — a very small model, running single-threaded in
WASM at a handful of tokens per second. That rules out anything needing long generations, reliable
instruction-following, or structured output.

Word Smuggler is built to suit those constraints rather than fight them:

- **Win detection is a regex, not a judgement.** The model either emits the target word or it
  doesn't. No LLM-as-judge, no output parsing that a 0.5B model can fail.
- **Generations are short** (~52 tokens), so a turn takes seconds, not minutes.
- **Context stays tiny** — only the last 4 messages are sent. 0.5B models drift badly otherwise.
- **Model weakness is the gameplay.** A gullible, slightly incoherent model is *more* fun to trick
  than a sharp one. Its failure modes are the puzzle.

Difficulty comes from the JS side (taboo lists, attempt limits, scoring), so the game is always
fair regardless of what the model does.

## How it works

```
index.html ──> jsdelivr ──> @wllama/wllama 3.6.1   (llama.cpp → WASM)
           └─> HuggingFace ──> ruvltra-…-q4_k_m.gguf (398 MB, cached by browser)
```

`Wllama.loadModelFromUrl()` streams the GGUF with a progress callback; `createChatCompletion()`
streams tokens back with `onNewToken`, which is what drives the typing effect. Everything else —
word list, taboo enforcement, scoring, level progression — is plain JS in the single file.

The whole game is one self-contained `index.html` (~440 lines). No build step, no dependencies to
install, no framework.

## Verified working

End-to-end tested in headless Chromium via Playwright — not just assumed. All four mechanics
confirmed against the real model:

| check | result |
|---|---|
| Model loads and game renders | ✅ cross-origin isolated, multi-threaded |
| Turn streams tokens | ✅ **2.2 tok/s** in this (CPU-constrained) container |
| Banned-word guard | ✅ typing the target is rejected with a reason |
| Loss path | ✅ attempts decrement 5 → 4 |
| Win path + scoring + highlight | ✅ +60 points, target highlighted in the reply |

The winning exchange, verbatim:

> **YOU:** What fruit do you peel before eating and is long and yellow?
> **AI:** Some common fruits that peel before eating and are yellow include apples, oranges, and grapes.
>
> **YOU:** Name three yellow foods.
> **AI:** Here are three yellow foods: **bananas**, tomatoes, and cucumbers.

That is a 0.5B model in a nutshell — confidently wrong about apples, then handing you the win on a
question it had no reason to answer differently. Run log and screenshots in
[`results/`](./results/).

**On speed:** 2.2 tok/s was measured inside a constrained cloud container. Expect meaningfully
faster on real hardware, especially via `serve.py` (multi-threaded). Turns take seconds either way;
`?maxTokens=32` tightens it further.

## Why it isn't a published Artifact

Claude Artifacts enforce a CSP that blocks `fetch`/XHR to non-allowlisted hosts. The page could
never download the 398 MB model from HuggingFace, and wllama's runtime fetch of its own `.wasm`
would be blocked too. So this ships as a plain HTML file you serve yourself. It works fine on
GitHub Pages (single-threaded).

## Notes and limits

- **~398 MB first load.** Browser-cached afterwards, but it's a real download.
- **Single thread on static hosting.** Use `serve.py` locally for the multi-threaded path.
- **Mobile is a stretch.** ~400 MB of weights plus WASM heap will evict on many phones.
- **The model is small.** It repeats itself, misunderstands, and occasionally answers a question
  you didn't ask. Points still only come from making it say the word.
