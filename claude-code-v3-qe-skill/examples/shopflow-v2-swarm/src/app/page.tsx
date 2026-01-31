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
