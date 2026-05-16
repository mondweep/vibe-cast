// Privacy policy / data-handling notice. Linked from the consent banner and
// kept intentionally plain — readable in 60 seconds, no legalese padding.

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-gray-200">
      <header>
        <h1 className="text-3xl font-bold text-amber-400">Privacy</h1>
        <p className="mt-1 text-sm text-gray-500">Last updated: 16 May 2026</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-100">What we collect</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium text-gray-100">Email address</span> —
            required to sign in. Used only to authenticate you and to send
            account-related notifications (no marketing email).
          </li>
          <li>
            <span className="font-medium text-gray-100">Approximate location</span>{' '}
            (country, region, city) derived from your IP address on first sign-in.
            We don't use precise GPS coordinates. Used to understand which
            parts of the world the app is reaching.
          </li>
          <li>
            <span className="font-medium text-gray-100">IP address and browser
            user-agent</span> — captured alongside each consent event for audit.
          </li>
          <li>
            <span className="font-medium text-gray-100">Display name and
            LinkedIn URL</span> (optional) — if you choose to add them in your
            profile.
          </li>
          <li>
            <span className="font-medium text-gray-100">Vocabulary activity</span> —
            which Sanskrit words you've encountered, looked up, or rated in
            flashcards. Used to schedule your spaced-repetition reviews.
          </li>
          <li>
            <span className="font-medium text-gray-100">Consent record</span> —
            timestamp + version of the privacy notice you agreed to, plus a
            browser-generated visitor ID (UUID) stored in your local storage.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-100">What we don't collect</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Payment information — the site is free; there's nothing to bill.</li>
          <li>Precise GPS coordinates.</li>
          <li>Contents of your messages, social-media accounts, or anything
            outside this app.</li>
          <li>Behavioural advertising cookies — none are set.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-100">Where it's stored</h2>
        <p className="text-sm leading-relaxed">
          All data is stored in a Supabase Postgres database hosted in their
          managed cloud (region: configured by the project owner). API traffic
          is encrypted in transit. The Sanskrit translation backend
          (Anthropic and Groq APIs) only ever sees the Sanskrit text you play
          or look up — never your email, location, or vocabulary.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-100">Your rights</h2>
        <p className="text-sm leading-relaxed">
          You can request export or deletion of your data at any time by
          emailing the site owner. Deletion removes your profile, vocabulary
          history, and any consent records associated with your account.
          Library content (verified songs and the canonical word list) is
          shared and stays in the public corpus.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-100">Contact</h2>
        <p className="text-sm leading-relaxed">
          Questions or data requests: send an email to the project owner at the
          address listed in the GitHub repository.
        </p>
      </section>
    </div>
  );
}
