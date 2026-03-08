export default function AboutPanel() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Motivation */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">Why ChordLab?</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
          Learning guitar is rewarding, but the gap between hearing a chord and knowing how to play it
          can be frustrating. Most chord reference tools are static — you look up a chord name and get
          a single diagram. ChordLab bridges that gap by listening to what you play and showing you
          every way to voice it on the fretboard, in real time.
        </p>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          Whether you're a beginner trying to identify what you just stumbled on, or an experienced
          player exploring jazz voicings in alternate tunings, ChordLab gives you the tools to
          understand and expand your chord vocabulary.
        </p>
      </section>

      {/* Current features */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">What's Built</h2>
        <div className="grid gap-3">
          <FeatureItem
            title="Real-Time Audio Detection"
            description="Use your microphone to detect chords as you play. The app analyzes pitch frequencies and matches them against chord patterns."
          />
          <FeatureItem
            title="Tunable Detection Settings"
            description="Fine-tune detection speed, stability, confidence threshold, and switch resistance via sliders. Choose Standard or Beginner presets, or dial in custom settings."
          />
          <FeatureItem
            title="Comprehensive Chord Library"
            description="23+ chord qualities from basic major/minor to jazz extensions (9ths, 11ths, 13ths), with curated and algorithmically generated voicings."
          />
          <FeatureItem
            title="Multiple Voicings Per Chord"
            description="Open, barre, partial, and jazz voicing categories with finger positions, barre indicators, and fret range display."
          />
          <FeatureItem
            title="Alternate Tunings"
            description="Switch between Standard, Drop D, Open G, DADGAD, Open D, and Half-Step Down tunings. Voicings recalculate automatically."
          />
          <FeatureItem
            title="Progression Tracking"
            description="Chord changes are captured in a live progression timeline with timestamps. Useful for song transcription and practice analysis."
          />
          <FeatureItem
            title="Favorites & Export"
            description="Save favorite voicings, export diagrams as SVG/PNG, and share chord URLs."
          />
          <FeatureItem
            title="Session History"
            description="Authenticated users get cloud-backed practice session storage via Supabase, with session replay and chord timelines."
          />
          <FeatureItem
            title="Dark Mode"
            description="Full dark mode support across all components, persisted in localStorage."
          />
        </div>
      </section>

      {/* Planned features */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">What's Planned</h2>
        <div className="grid gap-3">
          <PlannedItem title="Practice Analytics Dashboard" description="Stats cards, chord frequency charts, and a GitHub-style practice activity grid." />
          <PlannedItem title="Chord Progression Sharing" description="Publish progressions with genre tags and difficulty ratings. Browse and like community progressions." />
          <PlannedItem title="Song Matching" description="Detect when your progression matches well-known songs and surface suggestions." />
          <PlannedItem title="Practice Reels" description="Auto-generate short-form video reels from practice sessions for social sharing." />
        </div>
      </section>

      {/* Collaboration invite */}
      <section className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6">
        <h2 className="text-xl font-bold text-indigo-800 dark:text-indigo-200 mb-3">Collaborate</h2>
        <p className="text-indigo-700 dark:text-indigo-300 leading-relaxed mb-4">
          ChordLab is open source and actively looking for contributors. Whether you're interested
          in audio signal processing, music theory, React/TypeScript frontend, or UX design — there's
          plenty of room to make an impact.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://github.com/mondweep/vibe-cast"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            View on GitHub
          </a>
          <a
            href="https://github.com/mondweep/vibe-cast/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
          >
            Open an Issue
          </a>
          <a
            href="https://www.linkedin.com/in/mondweepchakravorty"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
          >
            Connect on LinkedIn
          </a>
        </div>
      </section>
    </div>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
      <span className="mt-0.5 text-green-500 flex-shrink-0">
        <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </span>
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function PlannedItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
      <span className="mt-0.5 text-indigo-400 flex-shrink-0">
        <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      </span>
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}
