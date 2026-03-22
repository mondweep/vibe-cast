export function AboutView() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <section>
        <h2 className="text-lg font-bold text-stone-900 mb-2">
          What is Prose Refinery?
        </h2>
        <p className="text-sm text-stone-700 leading-relaxed">
          Prose Refinery is an AI-powered editing tool for non-fiction writing.
          Instead of rewriting your entire draft, it applies focused editing
          passes — one at a time — so you stay in control of every change.
          Paste your text, pick a genre and a pass, and review each suggestion
          individually before accepting it.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-stone-900 mb-3">Genres</h2>
        <p className="text-sm text-stone-600 mb-3">
          Choose the genre that best matches your writing. This tunes the
          editing rules and priorities for each pass.
        </p>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="font-semibold text-stone-800 w-36 shrink-0">Essay / Opinion</dt>
            <dd className="text-stone-600">Strengthens arguments, improves rhetorical flow, and sharpens persuasive writing.</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold text-stone-800 w-36 shrink-0">Technical / Docs</dt>
            <dd className="text-stone-600">Prioritizes precision, scannability, and consistent terminology for documentation.</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold text-stone-800 w-36 shrink-0">Journalism</dt>
            <dd className="text-stone-600">Focuses on objectivity, proper attribution, and AP-style clarity.</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold text-stone-800 w-36 shrink-0">Academic</dt>
            <dd className="text-stone-600">Maintains formal register, appropriate hedging, and scholarly conventions.</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold text-stone-800 w-36 shrink-0">Business / Memo</dt>
            <dd className="text-stone-600">Optimizes for brevity, action-orientation, and executive readability.</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="text-lg font-bold text-stone-900 mb-3">Editing Passes</h2>
        <p className="text-sm text-stone-600 mb-3">
          Each pass targets a different aspect of your writing. Run them in
          any order — or chain them for a full revision.
        </p>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-stone-800">Conciseness <span className="font-normal text-stone-400">(System Rules)</span></dt>
            <dd className="text-stone-600 mt-0.5">
              Cuts filler words, redundant phrases, and unnecessary qualifiers.
              Uses a systematic rules-based approach to tighten your prose
              without losing meaning.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-stone-800">Clarity <span className="font-normal text-stone-400">(Few-Shot)</span></dt>
            <dd className="text-stone-600 mt-0.5">
              Simplifies convoluted sentences and improves readability. Learns
              from curated before/after examples to suggest clearer alternatives.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-stone-800">Tone <span className="font-normal text-stone-400">(Role Prompting)</span></dt>
            <dd className="text-stone-600 mt-0.5">
              Adjusts your writing&apos;s voice to match a target audience and
              tone. Select a target audience (e.g. &quot;C-suite executives&quot;)
              and tone (e.g. &quot;Authoritative&quot;) to guide the adjustment.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-stone-800">Structure <span className="font-normal text-stone-400">(Chain-of-Thought)</span></dt>
            <dd className="text-stone-600 mt-0.5">
              Analyzes the overall organization of your text — paragraph flow,
              logical progression, and section transitions — and suggests
              structural improvements.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-stone-800">Iterate <span className="font-normal text-stone-400">(Multi-Turn)</span></dt>
            <dd className="text-stone-600 mt-0.5">
              Opens a back-and-forth chat where you can discuss and iteratively
              refine your text with the AI. Great for deeper revisions that
              need conversation.
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="text-lg font-bold text-stone-900 mb-3">How to Use</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-stone-700">
          <li><strong>Paste your text</strong> into the left pane on the Refine tab.</li>
          <li><strong>Choose a genre</strong> that matches your writing style.</li>
          <li><strong>Pick a pass</strong> to target a specific editing dimension.</li>
          <li>Click <strong>Refine</strong> to generate suggestions.</li>
          <li>Review each suggestion — toggle the ones you want, then click <strong>Apply Selected</strong> (or <strong>Accept All</strong>).</li>
          <li>Run additional passes on the updated text to keep improving.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-bold text-stone-900 mb-3">Prompt Playground</h2>
        <p className="text-sm text-stone-700 leading-relaxed">
          The Prompt Playground lets you experiment with and compare prompts
          side by side. It shows the default prompt (Prompt A) alongside your
          custom variant (Prompt B) so you can see how different instructions
          change the AI&apos;s output. Use it to fine-tune prompts before
          applying them in your workflow.
        </p>
      </section>
    </div>
  );
}
