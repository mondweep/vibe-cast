'use client';

import Link from 'next/link';

export default function OrdersPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        Order History
      </h1>

      <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
        <h2 className="text-lg font-medium text-yellow-800">Demo Notice</h2>
        <p className="mt-2 text-sm text-yellow-700">
          This is a demo e-commerce application. Order history would typically require user authentication.
        </p>
        <p className="mt-2 text-sm text-yellow-700">
          Your order confirmations are sent via email when you complete a purchase.
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No orders to display
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Check your email for order confirmations after making a purchase.
        </p>
        <div className="mt-6">
          <Link
            href="/products"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Browse Products
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="text-sm font-medium text-gray-900">Recent Stripe Transactions</h3>
        <p className="mt-2 text-sm text-gray-600">
          View your payment history in the{' '}
          <a
            href="https://dashboard.stripe.com/test/payments"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Stripe Dashboard &rarr;
          </a>
        </p>
      </div>

      <div className="mt-8">
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          <span aria-hidden="true">&larr;</span> Back to Home
        </Link>
      </div>
    </main>
  );
}
