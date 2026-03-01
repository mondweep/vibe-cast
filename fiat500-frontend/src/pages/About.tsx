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
          Buying a used car in the UK is a fragmented experience. Listings are scattered across
          AutoTrader, Gumtree, CarGurus, Cinch, Heycar, Carwow, and dozens of smaller dealers.
          Prices shift daily. Good deals disappear within hours.
        </p>
        <p>
          I wanted a single pane of glass that would watch every platform, surface the best-value
          cars within my budget and radius, estimate insurance costs for my household, and let me
          contact sellers — all without manually refreshing half a dozen tabs every morning.
        </p>
        <p>
          Fiat 500 Tracker started as a personal tool and evolved into a full-stack platform
          that demonstrates what's possible when you combine web scraping, scoring algorithms,
          and conversational AI into a cohesive workflow.
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
            href="https://github.com/mondweep/vibe-cast"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
          >
            GitHub Repo
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
