import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          ShopFlow V2
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl">
          Modern e-commerce platform built with Next.js 14, DDD architecture,
          and comprehensive test coverage.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/products"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Browse Products
          </Link>
          <Link
            href="/cart"
            className="text-sm font-semibold leading-6 text-gray-900"
          >
            View Cart <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="mt-16 w-full max-w-5xl">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          System Architecture
        </h2>
        <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* User Flow */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 border-2 border-blue-500 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">👤</div>
                  <div className="font-semibold text-blue-800">User</div>
                </div>
                <Arrow />
                <div className="bg-purple-100 border-2 border-purple-500 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">🌐</div>
                  <div className="font-semibold text-purple-800">Browser</div>
                  <div className="text-xs text-purple-600">React/Next.js</div>
                </div>
              </div>
            </div>

            {/* Frontend Layer */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-bold text-indigo-800 mb-3 text-center">Frontend (Netlify Edge)</h3>
              <div className="flex justify-center gap-4 flex-wrap">
                <ComponentBox title="Products Page" icon="🛍️" color="indigo" />
                <ComponentBox title="Cart Page" icon="🛒" color="indigo" />
                <ComponentBox title="Checkout" icon="💳" color="indigo" />
                <ComponentBox title="Order Success" icon="✅" color="indigo" />
              </div>
            </div>

            <div className="flex justify-center mb-4">
              <VerticalArrow />
            </div>

            {/* API Layer */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-bold text-green-800 mb-3 text-center">API Routes (Netlify Functions)</h3>
              <div className="flex justify-center gap-4 flex-wrap">
                <ComponentBox title="/api/cart/*" icon="🛒" color="green" subtitle="CRUD" />
                <ComponentBox title="/api/checkout" icon="💰" color="green" subtitle="Session" />
                <ComponentBox title="/api/discount" icon="🏷️" color="green" subtitle="Validate" />
                <ComponentBox title="/api/webhooks" icon="🔔" color="green" subtitle="Stripe" />
              </div>
            </div>

            <div className="flex justify-center mb-4">
              <VerticalArrow />
            </div>

            {/* External Services */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Database */}
              <div className="bg-gradient-to-b from-amber-50 to-orange-50 rounded-lg p-4">
                <h3 className="text-sm font-bold text-amber-800 mb-3 text-center">Database</h3>
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white border-2 border-amber-500 rounded-lg p-3 text-center w-full">
                    <div className="text-xl mb-1">🐘</div>
                    <div className="font-semibold text-amber-800 text-sm">PostgreSQL</div>
                    <div className="text-xs text-amber-600">Railway</div>
                  </div>
                  <div className="bg-white border-2 border-amber-400 rounded-lg p-2 text-center w-full">
                    <div className="font-medium text-amber-700 text-xs">Prisma ORM</div>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-gradient-to-b from-violet-50 to-purple-50 rounded-lg p-4">
                <h3 className="text-sm font-bold text-violet-800 mb-3 text-center">Payments</h3>
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white border-2 border-violet-500 rounded-lg p-3 text-center w-full">
                    <div className="text-xl mb-1">💳</div>
                    <div className="font-semibold text-violet-800 text-sm">Stripe</div>
                    <div className="text-xs text-violet-600">Checkout + Webhooks</div>
                  </div>
                  <div className="text-xs text-violet-600 text-center">
                    Test Mode Enabled
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="bg-gradient-to-b from-rose-50 to-pink-50 rounded-lg p-4">
                <h3 className="text-sm font-bold text-rose-800 mb-3 text-center">Email</h3>
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white border-2 border-rose-500 rounded-lg p-3 text-center w-full">
                    <div className="text-xl mb-1">📧</div>
                    <div className="font-semibold text-rose-800 text-sm">Resend</div>
                    <div className="text-xs text-rose-600">Order Confirmations</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Journey Flow */}
      <div className="mt-12 w-full max-w-5xl">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          User Journey
        </h2>
        <div className="bg-white rounded-xl shadow-lg p-6 overflow-x-auto">
          <div className="flex items-center justify-between gap-2 min-w-[600px]">
            <JourneyStep step="1" title="Browse" description="View products" icon="🛍️" />
            <FlowArrow />
            <JourneyStep step="2" title="Add to Cart" description="Select items" icon="🛒" />
            <FlowArrow />
            <JourneyStep step="3" title="Apply Discount" description="Optional code" icon="🏷️" />
            <FlowArrow />
            <JourneyStep step="4" title="Checkout" description="Stripe payment" icon="💳" />
            <FlowArrow />
            <JourneyStep step="5" title="Confirmation" description="Email receipt" icon="📧" />
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
        <FeatureCard
          title="DDD Architecture"
          description="Clean domain-driven design with bounded contexts for Catalog, Cart, Orders, Inventory, Payments, and Users."
        />
        <FeatureCard
          title="Stripe Payments"
          description="Secure payment processing with PCI-DSS compliance, refunds, and webhook handling."
        />
        <FeatureCard
          title="Real-time Inventory"
          description="Reservation-based inventory with multi-warehouse support and automatic reorder alerts."
        />
        <FeatureCard
          title="Type-Safe APIs"
          description="Full TypeScript with Zod validation, ensuring runtime type safety for all data."
        />
        <FeatureCard
          title="Comprehensive Tests"
          description="TDD with 90% coverage using Vitest for unit/integration and Playwright for E2E."
        />
        <FeatureCard
          title="Built with Swarm"
          description="Generated using Claude Flow V3 with 13 coordinated agents for parallel development."
        />
      </div>

      {/* Test Credentials */}
      <div className="mt-16 w-full max-w-2xl">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-800 mb-4 text-center">🧪 Test Mode Active</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-yellow-800 mb-2">Discount Codes:</h4>
              <ul className="space-y-1 text-yellow-700">
                <li><code className="bg-yellow-100 px-1 rounded">FREEORDER</code> — 100% off</li>
                <li><code className="bg-yellow-100 px-1 rounded">HALF50</code> — 50% off</li>
                <li><code className="bg-yellow-100 px-1 rounded">SAVE20</code> — 20% off</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-yellow-800 mb-2">Test Card:</h4>
              <ul className="space-y-1 text-yellow-700">
                <li>Number: <code className="bg-yellow-100 px-1 rounded">4242 4242 4242 4242</code></li>
                <li>Expiry: Any future date</li>
                <li>CVC: Any 3 digits</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 w-full border-t border-gray-200 pt-10 pb-8">
        <div className="max-w-5xl mx-auto px-4">
          {/* Creator Info */}
          <div className="text-center mb-8">
            <p className="text-sm text-gray-600 mb-2">
              Created by{' '}
              <a
                href="https://linkedin.com/in/mondweepchakravorty/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-indigo-600 hover:text-indigo-500"
              >
                Mondweep Chakravorty
              </a>
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <a
                href="https://linkedin.com/in/mondweepchakravorty/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-indigo-600 flex items-center gap-1"
              >
                <LinkedInIcon />
                LinkedIn
              </a>
              <a
                href="https://github.com/mondweep/vibe-cast/blob/claude/claude-code-v3-skill-KucJF/claude-code-v3-qe-skill/examples/shopflow-v2-swarm/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-indigo-600 flex items-center gap-1"
              >
                <GitHubIcon />
                Documentation
              </a>
            </div>
          </div>

          {/* About Section */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-8">
            <h3 className="text-sm font-bold text-indigo-900 mb-3 text-center">
              About This Project
            </h3>
            <p className="text-sm text-indigo-800 text-center max-w-3xl mx-auto mb-4">
              This e-commerce application was built to demonstrate and test the{' '}
              <a
                href="https://github.com/mondweep/vibe-cast/tree/claude/claude-code-v3-skill-KucJF/claude-code-v3-qe-skill"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-indigo-600 hover:text-indigo-500 underline"
              >
                Build with Quality Skill
              </a>
              {' '}— a combined Claude Flow V3 + Agentic QE skill that enables AI-assisted software development
              with DDD, ADR, and TDD methodologies using coordinated multi-agent swarms.
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-xs">
              <a
                href="https://github.com/mondweep/vibe-cast/tree/claude/claude-code-v3-skill-KucJF/claude-code-v3-qe-skill"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white px-3 py-1.5 rounded-full text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              >
                📚 Skill Documentation
              </a>
              <a
                href="https://github.com/mondweep/vibe-cast/blob/claude/claude-code-v3-skill-KucJF/claude-code-v3-qe-skill/USAGE-EXAMPLES.md"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white px-3 py-1.5 rounded-full text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              >
                💡 Example Project Designs
              </a>
              <a
                href="https://github.com/mondweep/vibe-cast/blob/claude/claude-code-v3-skill-KucJF/claude-code-v3-qe-skill/examples/shopflow-v2-swarm/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white px-3 py-1.5 rounded-full text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              >
                📖 This App&apos;s README
              </a>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <TechBadge>Next.js 14</TechBadge>
            <TechBadge>TypeScript</TechBadge>
            <TechBadge>Tailwind CSS</TechBadge>
            <TechBadge>PostgreSQL</TechBadge>
            <TechBadge>Prisma</TechBadge>
            <TechBadge>Stripe</TechBadge>
            <TechBadge>Resend</TechBadge>
            <TechBadge>Railway</TechBadge>
            <TechBadge>Netlify</TechBadge>
          </div>

          {/* Copyright */}
          <p className="text-center text-xs text-gray-400">
            © {new Date().getFullYear()} Mondweep Chakravorty. Built with Claude Flow V3 Swarm.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Arrow() {
  return (
    <div className="text-gray-400 text-2xl">→</div>
  );
}

function VerticalArrow() {
  return (
    <div className="text-gray-400 text-2xl">↓</div>
  );
}

function FlowArrow() {
  return (
    <div className="text-indigo-300 text-xl flex-shrink-0">→</div>
  );
}

function ComponentBox({ title, icon, color, subtitle }: { title: string; icon: string; color: string; subtitle?: string }) {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-white border-indigo-300 text-indigo-800',
    green: 'bg-white border-green-300 text-green-800',
  };
  return (
    <div className={`${colorClasses[color]} border-2 rounded-lg p-2 text-center min-w-[100px]`}>
      <div className="text-lg">{icon}</div>
      <div className="font-medium text-xs">{title}</div>
      {subtitle && <div className="text-xs opacity-70">{subtitle}</div>}
    </div>
  );
}

function JourneyStep({ step, title, description, icon }: { step: string; title: string; description: string; icon: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold mb-2">
        {step}
      </div>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-semibold text-gray-900 text-sm">{title}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
      <h3 className="text-base font-semibold leading-7 text-gray-900">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
    </div>
  );
}

function TechBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
      {children}
    </span>
  );
}

function LinkedInIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}
