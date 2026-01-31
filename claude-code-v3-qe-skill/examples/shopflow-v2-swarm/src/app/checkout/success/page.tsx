'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');
  const sessionId = searchParams.get('session_id');
  const isFreeOrder = searchParams.get('free') === 'true';

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
          Order Confirmed!
        </h1>

        <p className="mt-4 text-lg text-gray-600">
          Thank you for your purchase. Your order has been successfully placed.
        </p>

        {orderNumber && (
          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Order Number</p>
            <p className="mt-1 font-mono text-lg font-semibold text-gray-900">
              {orderNumber}
            </p>
          </div>
        )}

        {isFreeOrder && (
          <div className="mt-4 rounded-lg bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              Your discount code was applied successfully!
            </p>
            <p className="mt-1 text-sm text-green-600">
              This order was completed at no charge.
            </p>
          </div>
        )}

        {sessionId && (
          <div className="mt-4 rounded-lg bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800">
              Payment processed via Stripe
            </p>
            <p className="mt-1 text-xs text-blue-600 font-mono truncate">
              Session: {sessionId}
            </p>
          </div>
        )}

        <div className="mt-8 space-y-4">
          <p className="text-sm text-gray-500">
            A confirmation email will be sent to your email address.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Continue Shopping
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}
