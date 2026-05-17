import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, ShieldCheck, Sparkles } from 'lucide-react';

/**
 * Curation explainer. Linked from /feedback (when "curator_application" is
 * selected) and from the About page. Plain content + a single CTA back to
 * the feedback form pre-set to curator-application kind.
 */
export function CuratePage() {
  return (
    <div className="max-w-3xl mx-auto px-1 py-6 space-y-10 text-gray-200">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-amber-500/80">For prospective curators</p>
        <h1 className="text-3xl font-bold text-amber-400">What curation involves</h1>
        <p className="text-gray-400 leading-relaxed">
          Verified songs are the trust layer of the library — every line a learner reads or
          taps was prepared by hand from a canonical source. The role of a curator is to add
          new songs and review requests so the public library can keep growing without losing
          that trust.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-baseline gap-2">
          <BookOpen size={18} className="text-amber-400/80" />
          <h2 className="text-xl font-semibold text-gray-100">What you need</h2>
        </div>
        <ul className="space-y-2 text-gray-300 text-sm leading-relaxed pl-2">
          <li>
            <span className="text-amber-300">Reading knowledge of Sanskrit</span> — ideally enough
            to recognise canonical verses and check a published source against what's being
            sung. Strong motivation to learn is acceptable in lieu of fluency; the work tends
            to deepen your own reading anyway.
          </li>
          <li>
            <span className="text-amber-300">Familiarity with at least one tradition</span> —
            Vedic, classical Sanskrit literature (kāvya, stotra, gītā), Bhakti, Yoga-Vedānta,
            Upaniṣadic, Bauddha / Pāli, etc. You don't need to know all of them; you need to
            be able to identify when a song belongs to one you do know.
          </li>
          <li>
            <span className="text-amber-300">Comfort with text tools</span> — a JSON file editor,
            a terminal with curl (or willingness to use the in-app line editor instead),
            access to standard published Sanskrit reference collections online.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline gap-2">
          <Clock size={18} className="text-amber-400/80" />
          <h2 className="text-xl font-semibold text-gray-100">What's involved per song</h2>
        </div>
        <p className="text-sm text-gray-400">Typically 1–3 hours, depending on song length and how well-known the source text is.</p>
        <ol className="space-y-2 text-gray-300 text-sm leading-relaxed list-decimal pl-6">
          <li>Pick a song from the curator queue (or one of your own choosing).</li>
          <li>
            Identify the canonical text — from{' '}
            <a
              href="https://sanskritdocuments.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400/80 hover:text-amber-300 underline decoration-amber-500/40"
            >
              Sanskrit Documents Org
            </a>
            ,{' '}
            <a
              href="https://www.wisdomlib.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400/80 hover:text-amber-300 underline decoration-amber-500/40"
            >
              Wisdom Library
            </a>
            , published Adyar / GRD / Gita Press editions, or another trusted source. Cite it.
          </li>
          <li>
            Prepare line-by-line Devanagari + IAST + literal English + poetic English +
            philosophical context per verse + word-by-word breakdown with grammar.
          </li>
          <li>
            Submit as a JSON payload to the verify endpoint (template provided), or use the
            in-app line editor on the Play page. Listen through to align timings with the
            audio.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline gap-2">
          <ShieldCheck size={18} className="text-amber-400/80" />
          <h2 className="text-xl font-semibold text-gray-100">Quality standards</h2>
        </div>
        <ul className="space-y-2 text-gray-300 text-sm leading-relaxed pl-2">
          <li>
            <span className="text-amber-300">No hallucination</span> — if you don't know a
            verse, queue it for further review rather than guessing. Coverage gaps are honest;
            invented lyrics aren't.
          </li>
          <li>
            <span className="text-amber-300">Cite the source</span> — every verified song
            includes the citation in the explanation field, so the next reader (and the next
            curator) can verify it.
          </li>
          <li>
            <span className="text-amber-300">Respect the tradition</span> — verses come from
            living devotional and philosophical traditions. Translations should reflect that:
            accurate, generous, never reductive.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline gap-2">
          <Sparkles size={18} className="text-amber-400/80" />
          <h2 className="text-xl font-semibold text-gray-100">Process for becoming a curator</h2>
        </div>
        <ol className="space-y-2 text-gray-300 text-sm leading-relaxed list-decimal pl-6">
          <li>Submit a curator application (link below).</li>
          <li>
            We'll arrange a short conversation about your background and the kinds of songs
            you'd want to add.
          </li>
          <li>
            Trial run: you take one song from the queue and prepare it end-to-end with
            mentorship.
          </li>
          <li>
            On success, your account is added to the curator allowlist. Your name (optionally)
            appears alongside songs you've added.
          </li>
        </ol>
      </section>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-3">
        <p className="text-gray-200">
          Ready to apply? Tell us a bit about your background and we'll be in touch.
        </p>
        <Link
          to="/feedback?kind=curator_application"
          className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-gray-950 hover:bg-amber-400 transition-colors"
        >
          Apply to become a curator <ArrowRight size={14} />
        </Link>
      </div>

      <p className="text-xs text-gray-600 text-center">
        Have feedback that isn't a curator application?{' '}
        <Link to="/feedback" className="text-amber-400/80 hover:text-amber-300 underline">
          Send a comment or suggestion
        </Link>{' '}
        instead.
      </p>
    </div>
  );
}
