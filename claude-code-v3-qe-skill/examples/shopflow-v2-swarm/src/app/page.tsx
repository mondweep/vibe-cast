import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          ShopFlow V2
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
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

      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
    </main>
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
