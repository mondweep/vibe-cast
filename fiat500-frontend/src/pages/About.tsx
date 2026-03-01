import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      {/* Hero */}
      <section className="text-center py-8">
        <h1 className="text-3xl font-bold mb-4">
          Fiat 500 <span className="text-fiat-accent">Tracker</span>
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          An automated car-hunting platform that continuously scans the UK used-car market,
          ranks listings by value, and delivers daily intelligence — so you never miss the right Fiat 500.
        </p>
      </section>

      {/* Motivation */}
      <Section title="Why I Built This">
        <p>
          My daughter is preparing for her practical driving test in July 2025. She needs a manual
          car to learn on and eventually take the test in. I wanted to find a used Fiat 500 with a
          manual gearbox, within a reasonable budget, somewhere in the South East of England.
        </p>
        <p>
          The problem? Listings are scattered across AutoTrader, Gumtree, CarGurus, Cinch, Heycar,
          Carwow, and dozens of smaller dealers. Prices shift daily. Good deals disappear within
          hours. And working out the true cost of ownership — including insurance for two adults and
          a learner driver — means juggling spreadsheets and comparison sites.
        </p>
        <p>
          I wanted a single system that would monitor every platform automatically, rank the best-value
          cars by price, mileage, and age, estimate insurance costs for our household (two adults plus
          my daughter on a learner's licence), and let me engage directly with sellers — all from
          WhatsApp via my personal{' '}
          <span className="text-fiat-blue font-medium">OpenClaw</span> AI assistant running on EC2.
        </p>
        <p>
          What started as a personal need evolved into a full-stack platform that demonstrates what's
          possible when you combine web scraping, scoring algorithms, and conversational AI into a
          cohesive workflow. We wrote a detailed Product Requirements Document to define the scope
          before building:{' '}
          <a
            href="https://github.com/mondweep/vibe-cast/blob/claude/fiat-500-car-tracker-ZbfKA/docs/PRD-fiat-500-car-tracker.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-fiat-blue hover:text-blue-400 font-medium"
          >
            read the PRD on GitHub
          </a>.
        </p>
      </Section>

      {/* Features */}
      <Section title="Features &amp; Capabilities">
        <div className="grid sm:grid-cols-2 gap-4">
          <FeatureCard
            title="Multi-Platform Scraping"
            description="Automated scrapers for CarGurus, Cinch, Heycar, Carwow, and Big Motoring World. Runs on a schedule or on demand, deduplicating listings across platforms."
          />
          <FeatureCard
            title="Intelligent Ranking"
            description="Composite scoring engine that weighs price, mileage, age, engine size, distance, and insurance cost to surface the best-value cars automatically."
          />
          <FeatureCard
            title="Insurance Estimation"
            description="Built-in insurance cost model that factors in driver ages, no-claims bonus, and vehicle details — giving a realistic total cost of ownership."
          />
          <FeatureCard
            title="Price Drop Tracking"
            description="Continuous monitoring of listing prices with historical tracking. Get alerted when a car you're watching drops in price."
          />
          <FeatureCard
            title="Seller Communication"
            description="Draft and send enquiry emails to sellers directly from the platform, with AI-assisted message generation and reply tracking via SendGrid."
          />
          <FeatureCard
            title="Daily Digest"
            description="Scheduled daily reports summarising new listings, price changes, and top picks — delivered so you start each day with the latest market intelligence."
          />
        </div>
      </Section>

      {/* Architecture */}
      <Section title="Architecture">
        <p>
          The system is designed as a decoupled, event-driven architecture suitable for
          cloud-native deployment:
        </p>
        <div className="bg-fiat-navy rounded-xl border border-slate-700 p-6 mt-4 space-y-4 text-sm">
          <ArchRow label="Frontend" value="React 19 + TypeScript + Tailwind CSS 4, deployed on Netlify. Fully public read-only — no API keys in the browser." />
          <ArchRow label="Backend API" value="Node.js + Express on Google Cloud Run. RESTful endpoints with Bearer token auth for write operations and public GET access for read-only data." />
          <ArchRow label="Database" value="Supabase (PostgreSQL) for listings, price history, user config, scrape runs, and conversation state." />
          <ArchRow label="Scrapers" value="Fetch-based HTTP scrapers (no browser automation needed) running server-side. Orchestrated with parallel execution and per-platform error isolation." />
          <ArchRow label="Email" value="SendGrid for outbound seller enquiries and inbound webhook processing for replies." />
          <ArchRow label="Scheduling" value="Built-in cron-style scheduler for daily scrapes and digest generation, running within the Cloud Run container." />
        </div>
      </Section>

      {/* OpenClaw Integration */}
      <Section title="OpenClaw Integration">
        <p>
          The backend integrates with{' '}
          <span className="text-fiat-blue font-medium">OpenClaw</span>, a personal AI assistant
          platform I built that runs on an isolated VM behind Tailscale. This allows me to
          trigger and monitor the tracker directly from WhatsApp:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-3 text-slate-300">
          <li>
            <strong className="text-white">WhatsApp → OpenClaw → Tracker:</strong> I message
            OpenClaw on WhatsApp to trigger scrapes, check the latest shortlist, or ask
            natural-language questions about listings. OpenClaw calls the Tracker API on my behalf.
          </li>
          <li>
            <strong className="text-white">Webhook-driven updates:</strong> The Tracker pushes
            daily digests and price-drop alerts to OpenClaw via a webhook endpoint, which then
            forwards them to me on WhatsApp.
          </li>
          <li>
            <strong className="text-white">Conversational car search:</strong> Instead of browsing
            the UI, I can ask "What's the cheapest Fiat 500 under 30k miles near me?" and get
            an instant, formatted answer.
          </li>
        </ul>
      </Section>

      {/* Security Hardening */}
      <Section title="Security Hardening">
        <p>
          Building this integration required carefully opening up my previously isolated OpenClaw
          VM to external traffic. This was an opportunity to apply defence-in-depth principles:
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <SecurityCard
            title="Network Isolation"
            description="OpenClaw runs on a private Tailscale mesh network. Only explicitly allowed services can reach it — the Tracker's Cloud Run instance connects via a Tailscale-authenticated endpoint."
          />
          <SecurityCard
            title="Webhook Authentication"
            description="All webhook payloads between the Tracker and OpenClaw are signed with HMAC-SHA256 using a shared secret. Requests without a valid signature are rejected."
          />
          <SecurityCard
            title="API Key Auth + Rate Limiting"
            description="Write operations require a 256-bit Bearer token validated with constant-time comparison to prevent timing attacks. Global and per-endpoint rate limits protect against abuse."
          />
          <SecurityCard
            title="Input Validation &amp; SSRF Protection"
            description="All user inputs validated with Zod schemas. Manual listing URLs are checked against a domain allowlist and restricted to HTTPS to prevent server-side request forgery."
          />
          <SecurityCard
            title="Security Headers"
            description="Helmet.js enforces strict Content-Security-Policy, X-Frame-Options, and other headers. CORS is configured to allow browser access while preventing credential leakage."
          />
          <SecurityCard
            title="Minimal Attack Surface"
            description="Read-only frontend with no secrets. Non-root container runtime. Production dependencies only. No unnecessary ports or services exposed."
          />
        </div>
      </Section>

      {/* CTA */}
      <section className="text-center py-8 border-t border-slate-700">
        <p className="text-slate-400 mb-4">
          Explore the live data or dive into the source code.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/"
            className="px-6 py-3 bg-fiat-accent hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
          >
            View Dashboard
          </Link>
          <a
            href="https://github.com/mondweep/vibe-cast/tree/claude/fiat-500-car-tracker-ZbfKA"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            GitHub
          </a>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="space-y-3 text-slate-300 leading-relaxed">{children}</div>
    </section>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-fiat-navy rounded-xl p-5 border border-slate-700">
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}

function SecurityCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-fiat-navy rounded-xl p-5 border border-slate-700">
      <h3 className="font-semibold text-fiat-blue mb-2">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}

function ArchRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-fiat-accent font-semibold whitespace-nowrap w-28 shrink-0">{label}</span>
      <span className="text-slate-300">{value}</span>
    </div>
  );
}
