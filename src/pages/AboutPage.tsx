// Public About page — explains what SanskritSync does, how it's built,
// and how to contribute. Linked from the bottom nav (/about) so any
// visitor can land here without an account.

import { Link } from 'react-router-dom';
import { Github, Linkedin, Heart, ExternalLink } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 text-gray-200">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-amber-400">About SanskritSync</h1>
        <p className="text-lg text-gray-400">
          A small open project to make Sanskrit devotional music intelligible —
          and to help anyone build lasting vocabulary, one song at a time.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-100">What it does</h2>
        <p className="text-sm leading-relaxed">
          Browse the <Link to="/library" className="text-amber-400 underline decoration-amber-500/50 hover:text-amber-300">verified library</Link>{' '}
          of Sanskrit songs and shlokas, then open one on the{' '}
          <Link to="/play" className="text-amber-400 underline decoration-amber-500/50 hover:text-amber-300">Play page</Link>.
          As the video plays, lyrics scroll in sync with the audio. Each line
          shows Devanagari, IAST transliteration, a poetic English rendering,
          a literal word-for-word translation, and a short scholarly note
          (verse number, source text, philosophical context).
        </p>
        <p className="text-sm leading-relaxed">
          Tap any word for its meaning, root (<em>dhātu</em>), and grammatical
          form. Words you encounter are tracked in a personal flashcard deck
          via SM-2 spaced repetition. The deck pre-populates with the canonical
          vocabulary extracted from every verified song in the library, so
          new signups start with hundreds of curated words rather than an
          empty slate.
        </p>
        <p className="text-sm leading-relaxed">
          Don't see a song you'd like added? Submit it via the{' '}
          <Link to="/feedback" className="text-amber-400 underline decoration-amber-500/50 hover:text-amber-300">Feedback form</Link>{' '}
          (or directly from the Play page when you're not signed in as the
          curator). Want to help expand the library yourself? Read{' '}
          <Link to="/curate" className="text-amber-400 underline decoration-amber-500/50 hover:text-amber-300">what curation involves</Link>{' '}
          and apply.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-100">Architecture at a glance</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950/40 p-4 sm:p-6">
          <ArchitectureDiagram />
        </div>
        <p className="text-xs text-gray-500">
          Three flows: visitors read the library and submit feedback /
          song-requests (green), the curator edits and verifies on{' '}
          <code className="text-gray-300">/play</code> + processes the queue
          on <code className="text-gray-300">/queue</code> (amber), and a
          nightly Claude routine auto-discovers new candidates (blue). Every
          new submission triggers a Telegram alert to the curator.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-100">How a song reaches the library</h2>
        <p className="text-sm leading-relaxed">There are three paths:</p>

        <p className="text-sm font-medium text-amber-300 pt-1">
          A. Visitor-requested → curator-verified
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            A visitor on <code className="text-gray-300">/play</code> (or any
            page via the footer link) opens the Feedback form and submits the
            YouTube URL of a song they'd like added.
          </li>
          <li>
            The server validates the URL, dedups against the library + the
            existing queue, and inserts a row into{' '}
            <code className="text-gray-300">song_requests</code>. A Telegram
            alert fires to the curator (🎵).
          </li>
          <li>
            The curator opens <code className="text-gray-300">/queue</code>,
            sees the request, clicks <span className="mx-1 rounded bg-amber-900/40 px-1.5 py-0.5 text-xs text-amber-300">Take this</span>
            to jump to <code className="text-gray-300">/play?v=…</code>, identifies the canonical text,
            prepares the JSON (or edits inline), and clicks <span className="mx-1 rounded bg-emerald-900/40 px-1.5 py-0.5 text-xs text-emerald-300">Verify &amp; Save</span>.
            The pending request is automatically cleared.
          </li>
        </ol>

        <p className="text-sm font-medium text-amber-300 pt-3">
          B. Nightly auto-curation
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            A nightly Claude scheduled task searches YouTube for new Sanskrit
            devotional content using rotating queries (Gayatri, Bhaja
            Govindam, Shiva Stotram, etc.).
          </li>
          <li>
            For each candidate whose title clearly identifies a known
            canonical stotra, Claude generates the Devanagari + IAST +
            translations from training knowledge — never inventing text, only
            transcribing what it knows verbatim.
          </li>
          <li>
            Songs land in Supabase as drafts (<code className="text-gray-300">verified=false</code>),
            visible only to the curator, and a Telegram alert fires with a
            review link.
          </li>
          <li>
            The curator opens the link, spot-checks the auto-generated lyrics
            against the audio, edits anything that's off, and clicks Verify &amp; Save.
            The song flips to public and its words are extracted into the
            shared vocabulary.
          </li>
          <li>
            Songs Claude can't identify with certainty are queued in{' '}
            <code className="text-gray-300">pending_candidates</code> and
            sent to the curator for manual review.
          </li>
        </ol>

        <p className="text-sm font-medium text-amber-300 pt-3">
          C. Curator-initiated (live transcribe)
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            The curator pastes a YouTube URL directly on{' '}
            <code className="text-gray-300">/play</code> (the URL input is
            curator-only). The backend pipeline pulls audio via yt-dlp, runs
            Groq Whisper for transcription, and scores every segment{' '}
            <code className="text-gray-300">high</code> /{' '}
            <code className="text-gray-300">medium</code> /{' '}
            <code className="text-gray-300">low</code> via a confidence
            pipeline (heuristic + Sanskrit allowlist + Claude validator).
          </li>
          <li>
            High and medium segments are translated by Claude Haiku; low
            segments are dropped server-side (too noisy to surface even with
            a warning).
          </li>
          <li>
            The curator reviews the result inline, edits, and verifies. Same
            outcome as path A — the song goes public, vocabulary is extracted,
            any matching request is auto-cleared.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-100">Tech stack</h2>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <li><span className="text-gray-400">Frontend:</span> React 19, TypeScript, Tailwind CSS, Vite</li>
          <li><span className="text-gray-400">Backend:</span> Express 5 (Node.js), TypeScript</li>
          <li><span className="text-gray-400">Database:</span> Supabase (Postgres + Auth + RLS)</li>
          <li><span className="text-gray-400">Hosting:</span> Railway (Nixpacks)</li>
          <li><span className="text-gray-400">Transcription:</span> Groq Whisper-large-v3-turbo</li>
          <li><span className="text-gray-400">Translation + sandhi split:</span> Anthropic Claude Haiku 4.5</li>
          <li><span className="text-gray-400">Auto-curation:</span> Claude (Cowork scheduled task) via Supabase MCP</li>
          <li><span className="text-gray-400">Alerts:</span> Telegram Bot API</li>
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <h2 className="text-xl font-semibold text-amber-300">Contribute</h2>
        <p className="text-sm leading-relaxed">
          <Link
            to="/feedback"
            className="text-amber-300 underline decoration-amber-500/50 hover:text-amber-200"
          >
            Send a comment or suggestion
          </Link>
          , or read{' '}
          <Link
            to="/curate"
            className="text-amber-300 underline decoration-amber-500/50 hover:text-amber-200"
          >
            what curation involves
          </Link>{' '}
          and apply to help expand the verified library.
        </p>
        <p className="text-sm leading-relaxed">
          This is an open, evolving project. Help is genuinely welcome —
          whether that's verifying songs you know well, suggesting features,
          fixing bugs, improving translations, or porting the verified-library
          pattern to other devotional traditions (Pāli, Tamil, Arabic, Latin
          liturgy). Every contribution makes the library more useful.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="https://github.com/mondweep/vibe-cast/tree/claude/sanskrit-english-songs-8IhOE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-gray-900 px-3 py-1.5 text-sm text-amber-300 transition-colors hover:bg-gray-800"
          >
            <Github size={14} /> GitHub repository
            <ExternalLink size={11} />
          </a>
          <a
            href="https://www.linkedin.com/in/mondweepchakravorty/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-gray-900 px-3 py-1.5 text-sm text-amber-300 transition-colors hover:bg-gray-800"
          >
            <Linkedin size={14} /> Reach out on LinkedIn
            <ExternalLink size={11} />
          </a>
        </div>
        <p className="pt-2 text-xs text-gray-400">
          See <a
            href="https://github.com/mondweep/vibe-cast/tree/claude/sanskrit-english-songs-8IhOE#contributing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 underline decoration-amber-500/50 hover:text-amber-300"
          >the Contributing section of the README</a> for a list of areas
          where help would be especially valuable, and an outline of the
          development setup.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-100">Credits &amp; acknowledgement</h2>
        <p className="text-sm leading-relaxed">
          Built and maintained by{' '}
          <a
            href="https://www.linkedin.com/in/mondweepchakravorty/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 underline decoration-amber-500/50 hover:text-amber-300"
          >
            Mondweep Chakravorty
          </a>{' '}
          — see <Link to="/privacy" className="text-amber-400 underline decoration-amber-500/50 hover:text-amber-300">privacy</Link> for
          contact and data-handling details.
        </p>
        <p className="text-sm leading-relaxed">
          If you build on this work, port it to another tradition, write about
          it, or use the patterns here in your own project — please credit
          the original by linking back to the GitHub repo and to{' '}
          <a
            href="https://www.linkedin.com/in/mondweepchakravorty/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 underline decoration-amber-500/50 hover:text-amber-300"
          >
            Mondweep Chakravorty's LinkedIn profile
          </a>. A small acknowledgement keeps the work findable for other
          contributors and helps it grow.
        </p>
        <p className="pt-1 text-sm leading-relaxed">
          If the library is useful to you, you can also{' '}
          <a
            href="https://paypal.me/mondweep"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-amber-400 underline decoration-amber-500/50 hover:text-amber-300"
          >
            <Heart size={12} /> support this work via PayPal
          </a>
          . Contributions cover server costs, AI API tokens, and the time
          that goes into verifying new songs.
        </p>
      </section>
    </div>
  );
}

/**
 * Architecture diagram. Three colour-coded paths:
 *   - green: public-read flow (anonymous + signed-in visitors)
 *   - amber: curator flow (verify & save on /play)
 *   - blue:  nightly auto-curation flow (Claude scheduled task)
 *
 * Hand-drawn SVG (no external library) so it renders quickly and stays
 * small. Responsive via viewBox.
 */
function ArchitectureDiagram() {
  // Tailwind-equivalent hex colours
  const C = {
    bg: '#0b1220',
    border: '#1f2937',     // gray-800
    text: '#e5e7eb',       // gray-200
    muted: '#9ca3af',      // gray-400
    accent: '#fbbf24',     // amber-400
    read: '#10b981',       // emerald-500
    write: '#f59e0b',      // amber-500
    auto: '#3b82f6',       // blue-500
    boxFill: '#0f172a',    // slate-950
  };

  // Reusable box renderer
  const box = (x: number, y: number, w: number, h: number, fill = C.boxFill, stroke = C.border) =>
    <rect x={x} y={y} width={w} height={h} rx={8} ry={8} fill={fill} stroke={stroke} strokeWidth={1.5} />;

  // Reusable arrow with optional label
  const arrow = (x1: number, y1: number, x2: number, y2: number, color = C.muted, dashed = false) => (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color} strokeWidth={1.6}
      strokeDasharray={dashed ? '4 4' : undefined}
      markerEnd="url(#arrowhead)"
    />
  );

  return (
    <svg
      viewBox="0 0 720 750"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-full"
      aria-label="SanskritSync architecture diagram"
      role="img"
    >
      <defs>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={C.muted} />
        </marker>
      </defs>

      {/* === Layer 1: Users === */}
      <text x={360} y={26} fill={C.muted} fontSize={11} textAnchor="middle">
        VISITORS
      </text>
      {/* Anonymous */}
      {box(40, 40, 160, 56)}
      <text x={120} y={62} fill={C.text} fontSize={13} fontWeight="500" textAnchor="middle">Anonymous</text>
      <text x={120} y={78} fill={C.muted} fontSize={10} textAnchor="middle">browse · request</text>
      <text x={120} y={91} fill={C.muted} fontSize={10} textAnchor="middle">songs · feedback</text>
      {/* Signed-in */}
      {box(280, 40, 160, 56)}
      <text x={360} y={62} fill={C.text} fontSize={13} fontWeight="500" textAnchor="middle">Signed-in learner</text>
      <text x={360} y={78} fill={C.muted} fontSize={10} textAnchor="middle">+ flashcards + SRS</text>
      <text x={360} y={91} fill={C.muted} fontSize={10} textAnchor="middle">+ persistent vocab</text>
      {/* Curator */}
      {box(520, 40, 160, 56)}
      <text x={600} y={62} fill={C.text} fontSize={13} fontWeight="500" textAnchor="middle">Curator</text>
      <text x={600} y={78} fill={C.muted} fontSize={10} textAnchor="middle">edit · verify · /queue</text>
      <text x={600} y={91} fill={C.muted} fontSize={10} textAnchor="middle">grant new curators</text>

      {/* === Layer 2: Frontend (two rows) === */}
      <text x={360} y={138} fill={C.muted} fontSize={11} textAnchor="middle">
        FRONTEND · React + Vite · sanskrit-sync-service-production.up.railway.app
      </text>
      {box(40, 153, 640, 96)}
      {/* Row 1 — main pages */}
      <text x={120} y={180} fill={C.text} fontSize={12} textAnchor="middle">/library</text>
      <text x={120} y={196} fill={C.muted} fontSize={10} textAnchor="middle">grid · public</text>

      <text x={260} y={180} fill={C.text} fontSize={12} textAnchor="middle">/play</text>
      <text x={260} y={196} fill={C.muted} fontSize={10} textAnchor="middle">player · word popups</text>

      <text x={400} y={180} fill={C.text} fontSize={12} textAnchor="middle">/revise</text>
      <text x={400} y={196} fill={C.muted} fontSize={10} textAnchor="middle">flashcards · gated</text>

      <text x={540} y={180} fill={C.text} fontSize={12} textAnchor="middle">/progress</text>
      <text x={540} y={196} fill={C.muted} fontSize={10} textAnchor="middle">stats · gated</text>

      <text x={620} y={180} fill={C.text} fontSize={12} textAnchor="middle">/about</text>

      {/* Row 2 — feedback + curator routes (added 2026-05-17) */}
      <text x={180} y={228} fill={C.text} fontSize={12} textAnchor="middle">/feedback</text>
      <text x={180} y={242} fill={C.muted} fontSize={10} textAnchor="middle">comments · suggestions · applications</text>

      <text x={400} y={228} fill={C.text} fontSize={12} textAnchor="middle">/curate</text>
      <text x={400} y={242} fill={C.muted} fontSize={10} textAnchor="middle">what curation involves</text>

      <text x={580} y={228} fill={C.text} fontSize={12} textAnchor="middle">/queue</text>
      <text x={580} y={242} fill={C.muted} fontSize={10} textAnchor="middle">curator-only · 2 tabs</text>

      {/* Arrows: users → frontend */}
      {arrow(120, 98, 120, 151, C.read)}
      {arrow(360, 98, 360, 151, C.read)}
      {arrow(600, 98, 600, 151, C.write)}

      {/* === Layer 3: Supabase === */}
      <text x={360} y={276} fill={C.muted} fontSize={11} textAnchor="middle">
        STORAGE
      </text>
      {box(40, 292, 640, 92, '#082f49', '#0c4a6e' /* sky-tinted */)}
      <text x={360} y={314} fill={C.accent} fontSize={14} fontWeight="600" textAnchor="middle">Supabase</text>
      <text x={360} y={332} fill={C.muted} fontSize={10} textAnchor="middle">Postgres · Auth · Row Level Security · is_curator() SECURITY DEFINER fn</text>
      <text x={360} y={354} fill={C.text} fontSize={10} textAnchor="middle">
        songs · words · song_words · user_vocabulary · pending_candidates
      </text>
      <text x={360} y={370} fill={C.text} fontSize={10} textAnchor="middle">
        song_requests · feedback · curator_allowlist · consent_log · profiles
      </text>

      {/* Frontend ↔ Supabase */}
      {arrow(360, 249, 360, 290, C.read)}
      <text x={372} y={272} fill={C.read} fontSize={9}>read/write</text>

      {/* === Layer 4: Backend (Railway) === */}
      <text x={180} y={418} fill={C.muted} fontSize={11} textAnchor="middle">
        BACKEND · Express on Railway
      </text>
      {box(40, 434, 280, 132)}
      <text x={180} y={456} fill={C.text} fontSize={12} fontWeight="500" textAnchor="middle">Live transcribe + CRM</text>
      <text x={180} y={474} fill={C.muted} fontSize={10} textAnchor="middle">/api/transcribe · /api/translate</text>
      <text x={180} y={488} fill={C.muted} fontSize={10} textAnchor="middle">/api/songs/verify · /api/sanskrit/split</text>
      <text x={180} y={502} fill={C.muted} fontSize={10} textAnchor="middle">/api/song-requests · /api/feedback</text>
      <text x={180} y={520} fill={C.muted} fontSize={10} textAnchor="middle">yt-dlp · Groq Whisper · Claude Haiku</text>
      <text x={180} y={536} fill={C.muted} fontSize={10} textAnchor="middle">confidence scoring (high/medium/low)</text>
      <text x={180} y={552} fill={C.muted} fontSize={10} textAnchor="middle">+ Sanskrit allowlist · Claude validator</text>

      {arrow(180, 384, 180, 432, C.write)}
      <text x={195} y={413} fill={C.write} fontSize={9}>writes</text>

      {/* === Layer 5: Nightly Claude curator === */}
      <text x={540} y={418} fill={C.muted} fontSize={11} textAnchor="middle">
        NIGHTLY AUTO-CURATION
      </text>
      {box(400, 434, 280, 132)}
      <text x={540} y={456} fill={C.text} fontSize={12} fontWeight="500" textAnchor="middle">Claude scheduled task</text>
      <text x={540} y={474} fill={C.muted} fontSize={10} textAnchor="middle">Cowork · Claude Max</text>
      <text x={540} y={494} fill={C.muted} fontSize={10} textAnchor="middle">discovers · identifies · writes via</text>
      <text x={540} y={510} fill={C.muted} fontSize={10} textAnchor="middle">Supabase MCP (no backend hop)</text>
      <text x={540} y={530} fill={C.muted} fontSize={10} textAnchor="middle">24h pending_curator_review window</text>
      <text x={540} y={548} fill={C.muted} fontSize={10} textAnchor="middle">Telegram alerts to curator</text>

      {arrow(540, 384, 540, 432, C.auto)}
      <text x={555} y={413} fill={C.auto} fontSize={9}>writes</text>

      {/* === Layer 6: External services row === */}
      <text x={360} y={598} fill={C.muted} fontSize={11} textAnchor="middle">
        EXTERNAL · third-party APIs
      </text>
      {box(40, 614, 160, 78)}
      <text x={120} y={636} fill={C.text} fontSize={11} fontWeight="500" textAnchor="middle">YouTube</text>
      <text x={120} y={652} fill={C.muted} fontSize={9} textAnchor="middle">Data API · audio · oEmbed</text>
      <text x={120} y={668} fill={C.muted} fontSize={9} textAnchor="middle">(via yt-dlp + cookies)</text>
      <text x={120} y={684} fill={C.muted} fontSize={9} textAnchor="middle">title enrichment for requests</text>

      {box(220, 614, 160, 78)}
      <text x={300} y={636} fill={C.text} fontSize={11} fontWeight="500" textAnchor="middle">Groq</text>
      <text x={300} y={652} fill={C.muted} fontSize={9} textAnchor="middle">Whisper-large-v3-turbo</text>
      <text x={300} y={668} fill={C.muted} fontSize={9} textAnchor="middle">speech → text</text>
      <text x={300} y={684} fill={C.muted} fontSize={9} textAnchor="middle">verbose_json + avg_logprob</text>

      {box(400, 614, 160, 78)}
      <text x={480} y={636} fill={C.text} fontSize={11} fontWeight="500" textAnchor="middle">Anthropic</text>
      <text x={480} y={652} fill={C.muted} fontSize={9} textAnchor="middle">Claude Haiku 4.5</text>
      <text x={480} y={668} fill={C.muted} fontSize={9} textAnchor="middle">translate · sandhi split</text>
      <text x={480} y={684} fill={C.muted} fontSize={9} textAnchor="middle">+ deterministic validator</text>

      {box(580, 614, 100, 78)}
      <text x={630} y={636} fill={C.text} fontSize={11} fontWeight="500" textAnchor="middle">Telegram</text>
      <text x={630} y={652} fill={C.muted} fontSize={9} textAnchor="middle">Bot API</text>
      <text x={630} y={668} fill={C.muted} fontSize={9} textAnchor="middle">song requests</text>
      <text x={630} y={684} fill={C.muted} fontSize={9} textAnchor="middle">feedback · alerts</text>

      {/* Backend → external */}
      {arrow(120, 566, 120, 612)}
      {arrow(280, 566, 290, 612)}
      {arrow(170, 566, 460, 612, C.muted, true)}
      {arrow(220, 566, 630, 612, C.muted, true)}

      {/* Nightly curator → external */}
      {arrow(480, 566, 480, 612)}
      {arrow(540, 566, 630, 612)}

      {/* === Legend === */}
      <text x={20} y={724} fill={C.muted} fontSize={9}>
        <tspan fill={C.read}>━━</tspan> visitor read/write (library + feedback + song requests)   ·   <tspan fill={C.write}>━━</tspan> curator write (verify + queue)   ·   <tspan fill={C.auto}>━━</tspan> nightly auto-curation
      </text>
    </svg>
  );
}
