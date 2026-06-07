import React from 'react';

const LINKEDIN_URL = 'https://www.linkedin.com/in/mondweepchakravorty/';
const PAYPAL_URL = 'https://www.paypal.com/paypalme/mondweep';
const REPO_URL = 'https://github.com/mondweep/vibe-cast';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-700 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export function PrivacyPolicyPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-8">Last updated: 7 June 2026</p>

      <p className="text-gray-700 text-sm leading-relaxed mb-8">
        <strong>learn-ruflo</strong> is a free, build-in-public learning platform for mastering
        Ruflo, the advanced Agentic AI orchestration layer. This policy explains exactly what we
        collect, what we don't, where it's stored, and your rights. We collect the minimum needed
        to run the platform — nothing for advertising, and we never sell your data.
      </p>

      <Section title="What we collect">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Email address</strong> — required to sign in (via Supabase Auth). Used only to
            authenticate you and to send account-related messages such as password resets. No
            marketing email.
          </li>
          <li>
            <strong>Learning activity</strong> — which learning paths you enrol in, the lessons you
            complete, and your progress. Used to track your journey and let you continue where you
            left off.
          </li>
          <li>
            <strong>AI tutor questions</strong> — the questions you type into the in-app tutor are
            processed transiently to generate an answer (embedded for knowledge-graph retrieval and,
            if you enable it, sent to your chosen language-model provider). We do not store your
            tutor conversations on our servers.
          </li>
          <li>
            <strong>Optional profile details</strong> — a display name, if you choose to add one.
          </li>
          <li>
            <strong>Server logs</strong> — our hosting platform (Google Cloud Run) records standard
            request metadata (IP address, browser user-agent, timestamps) for operations, debugging,
            and security/abuse prevention.
          </li>
        </ul>
      </Section>

      <Section title="What we don't collect">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Payment information</strong> — the platform is free. Voluntary donations are
            handled entirely by PayPal; we never see your card or bank details.
          </li>
          <li>
            <strong>Your AI provider API keys</strong> — if you use the tutor with your own key
            (Anthropic, OpenAI, Requesty, or Google Gemini), that key is stored only in your
            browser's local storage and sent with your question for that single request. It is never
            stored or logged on our servers.
          </li>
          <li><strong>Precise GPS location.</strong></li>
          <li><strong>Behavioural advertising cookies</strong> — none are set.</li>
          <li>Contents of your messages, social accounts, or anything outside this app.</li>
        </ul>
      </Section>

      <Section title="Where it's stored">
        <p>
          Account and learning data is stored in a <strong>Supabase Postgres</strong> database in
          their managed cloud, protected by row-level security so you can only read your own records.
          The application is hosted on <strong>Google Cloud Run</strong> (region: europe-west2). All
          API traffic is encrypted in transit (HTTPS).
        </p>
        <p>
          When you enable conversational tutor answers with your own key, your question and the
          relevant Ruflo knowledge-graph context are sent to <strong>your chosen LLM provider</strong>{' '}
          under your own account, subject to that provider's privacy policy. The provider only ever
          sees the question and that context — never your email, password, or progress.
        </p>
      </Section>

      <Section title="Cookies & local storage">
        <p>
          We use your browser's local storage for essentials only: your Supabase session token (to
          keep you signed in) and your tutor settings (chosen provider and the API key you entered).
          We do not use third-party tracking or advertising cookies.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can request an export or deletion of your data at any time (see Contact below).
          Deletion removes your profile, learning progress, and any account records. Shared catalogue
          content — the learning paths, lessons, and the Ruflo knowledge graph — is part of the public
          corpus and remains available to others.
        </p>
      </Section>

      <Section title="Contact & contributions">
        <p>
          This project is built and curated by <strong>Mondweep Chakravorty</strong>. For
          data-export or deletion requests, suggestions, bug reports, or collaboration, please reach
          out via{' '}
          <a className="text-primary-600 hover:text-primary-700 font-medium" href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">LinkedIn</a>{' '}
          or open an issue / pull request on the{' '}
          <a className="text-primary-600 hover:text-primary-700 font-medium" href={REPO_URL} target="_blank" rel="noopener noreferrer">public repository</a>{' '}
          (branch <code>ruflo-demonstration</code>).
        </p>
        <p>
          If you find this work useful, you can support it via{' '}
          <a className="text-pink-600 hover:text-pink-700 font-medium" href={PAYPAL_URL} target="_blank" rel="noopener noreferrer">PayPal</a>.
          The platform is free and ad-free; contributions cover hosting and the time spent building
          and verifying course content.
        </p>
      </Section>
    </div>
  );
}

export default PrivacyPolicyPage;
