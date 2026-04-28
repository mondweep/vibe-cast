import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-xs text-muted-foreground font-mono hover:text-primary mb-6 inline-block">
            ← Back to course
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground font-mono">
            Effective date: 28 April 2026 · Last updated: 28 April 2026
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground leading-7">

          {/* 1 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">1. Who we are</h2>
            <p>
              This platform — <strong className="text-foreground">AWS Advanced Networking Course</strong> — is operated
              by <strong className="text-foreground">Mondweep Chakravorty</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
              It is an open-source educational platform available at{" "}
              <a href="https://aws-advanced-networking.vercel.app" className="text-primary hover:underline">
                aws-advanced-networking.vercel.app
              </a>.
              You can contact us at:{" "}
              <a href="https://www.linkedin.com/in/mondweepchakravorty/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                linkedin.com/in/mondweepchakravorty
              </a>
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">2. What data we collect and why</h2>

            <h3 className="text-base font-semibold text-foreground mt-5 mb-2">2a. AI Tutor interactions</h3>
            <p>When you use the AI Tutor chat feature, we collect and store:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
              <li>The questions you ask (message content)</li>
              <li>The AI-generated responses</li>
              <li>Which module you were studying when you asked</li>
              <li>Which AWS topics and concepts your question related to (derived from our knowledge graph)</li>
              <li>Estimated API cost of your session (calculated from token counts — no payment data)</li>
              <li>Approximate location derived from your IP address (country, region, city)</li>
              <li>Your selected learner persona (Student, Teacher, or Practitioner)</li>
              <li>Session timestamp and duration</li>
            </ul>
            <p className="mt-3">
              <strong className="text-foreground">Why:</strong> This data helps us understand which topics learners find most challenging,
              which modules generate the most questions, and how the AI Tutor is being used.
              We use this to improve course content, create supplementary materials (such as FAQs and worked examples),
              and plan future features. We may also use aggregated, anonymised data to inform the
              commercial development of the platform.
            </p>

            <h3 className="text-base font-semibold text-foreground mt-5 mb-2">2b. Progress data</h3>
            <p>
              Your module completion progress, quiz scores, and learning time are stored locally in your
              browser (localStorage) only. This data never leaves your device and is not sent to our servers.
            </p>

            <h3 className="text-base font-semibold text-foreground mt-5 mb-2">2c. Automatically collected data</h3>
            <p>
              Like most web services, our hosting provider (Vercel) automatically collects standard server
              logs including IP addresses, browser type, pages visited, and timestamps. This is standard
              infrastructure logging and is governed by{" "}
              <a href="https://vercel.com/legal/privacy-policy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                Vercel&apos;s Privacy Policy
              </a>.
              We do not run advertising tracking scripts, analytics platforms (Google Analytics, etc.), or
              third-party cookies.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">3. Legal basis for processing (GDPR)</h2>
            <p>If you are located in the UK or European Economic Area, our legal basis for processing your data is:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
              <li><strong className="text-foreground">Consent</strong> — you explicitly accept this policy before using the AI Tutor</li>
              <li><strong className="text-foreground">Legitimate interests</strong> — improving educational content quality, understanding learner needs</li>
            </ul>
            <p className="mt-3">
              You may withdraw consent at any time by contacting us. Withdrawal of consent does not affect
              the lawfulness of any processing carried out before withdrawal.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">4. Location data</h2>
            <p>
              When you use the AI Tutor, we record your approximate location (country, region, and city)
              derived from your IP address using Vercel&apos;s built-in geolocation headers. This gives us
              city-level accuracy — not your street address or precise coordinates. We use this to
              understand where our learners are based and to plan localised content in the future.
            </p>
            <p className="mt-3">
              IP-derived geolocation is classified as personal data under GDPR. It is stored alongside
              your chat session and subject to the same retention and deletion rights described below.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">5. Third-party services</h2>
            <p>The AI Tutor uses the following third-party APIs to function:</p>
            <ul className="list-disc list-inside space-y-2 mt-2 ml-4">
              <li>
                <strong className="text-foreground">Anthropic (Claude API)</strong> — processes your questions to generate AI responses.
                Your messages are sent to Anthropic&apos;s servers. See{" "}
                <a href="https://www.anthropic.com/legal/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Anthropic&apos;s Privacy Policy
                </a>.
              </li>
              <li>
                <strong className="text-foreground">Voyage AI</strong> — converts your question into a numerical vector for semantic search.
                See{" "}
                <a href="https://www.voyageai.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Voyage AI&apos;s Privacy Policy
                </a>.
              </li>
              <li>
                <strong className="text-foreground">Supabase</strong> — stores chat sessions and messages in a hosted PostgreSQL database
                (EU region). See{" "}
                <a href="https://supabase.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  Supabase&apos;s Privacy Policy
                </a>.
              </li>
            </ul>
            <p className="mt-3">
              We do not sell your data to any third party. These services are used solely to deliver the AI Tutor feature.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">6. Data retention</h2>
            <p>
              Chat session and message data is retained for <strong className="text-foreground">12 months</strong> from
              the date of the session, after which it is deleted. Aggregated, anonymised analytics derived
              from the data (e.g. Transit Gateway was the most asked-about topic in Q1 2026) may be
              retained indefinitely as they cannot identify individuals.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">7. Your rights</h2>
            <p>Under UK GDPR and EU GDPR, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
              <li><strong className="text-foreground">Access</strong> — request a copy of data we hold about you</li>
              <li><strong className="text-foreground">Rectification</strong> — ask us to correct inaccurate data</li>
              <li><strong className="text-foreground">Erasure</strong> — ask us to delete your data (&ldquo;right to be forgotten&rdquo;)</li>
              <li><strong className="text-foreground">Portability</strong> — receive your data in a portable format</li>
              <li><strong className="text-foreground">Objection</strong> — object to processing based on legitimate interests</li>
              <li><strong className="text-foreground">Withdraw consent</strong> — at any time, without affecting prior processing</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us via LinkedIn. We will respond within 30 days.
              If you are in the UK, you may also lodge a complaint with the{" "}
              <a href="https://ico.org.uk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                Information Commissioner&apos;s Office (ICO)
              </a>.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">8. Cookies</h2>
            <p>
              We do not use tracking cookies or advertising cookies. The only browser storage we use is
              <strong className="text-foreground"> localStorage</strong> — for your progress data (which never leaves your device)
              and your privacy consent record.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">9. Children</h2>
            <p>
              This platform is designed for adults (18+) preparing for professional AWS certification.
              We do not knowingly collect data from anyone under the age of 16. If you believe a minor
              has submitted data through the AI Tutor, please contact us and we will delete it promptly.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">10. Changes to this policy</h2>
            <p>
              We may update this policy as the platform evolves. The effective date at the top of this page
              will reflect the latest revision. If we make material changes, we will display a notice on the
              platform and require users to re-accept.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs text-muted-foreground font-mono">
            Questions? Contact{" "}
            <a href="https://www.linkedin.com/in/mondweepchakravorty/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              Mondweep Chakravorty on LinkedIn
            </a>
          </p>
          <Link href="/" className="text-xs text-muted-foreground hover:text-primary font-mono">
            ← Back to course
          </Link>
        </div>

      </div>
    </div>
  );
}
