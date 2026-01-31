'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image: string | null;
  };
}

interface CartData {
  cart: { id: string } | null;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

interface Discount {
  code: string;
  percentage: number;
  description: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

export default function CartPage() {
  const router = useRouter();
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  useEffect(() => {
    fetchCart();
  }, []);

  async function fetchCart() {
    try {
      const response = await fetch('/api/cart/get');
      const data = await response.json();
      setCartData(data);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateQuantity(itemId: string, newQuantity: number) {
    setUpdatingItem(itemId);
    try {
      const response = await fetch('/api/cart/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity: newQuantity }),
      });

      if (response.ok) {
        await fetchCart();
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    } finally {
      setUpdatingItem(null);
    }
  }

  async function removeItem(itemId: string) {
    setUpdatingItem(itemId);
    try {
      const response = await fetch('/api/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });

      if (response.ok) {
        await fetchCart();
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setUpdatingItem(null);
    }
  }

  async function applyDiscount() {
    if (!discountCode.trim()) return;

    setIsApplyingDiscount(true);
    setDiscountError(null);

    try {
      const response = await fetch('/api/discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setDiscount({
          code: data.code,
          percentage: data.percentage,
          description: data.description,
        });
        setDiscountError(null);
      } else {
        setDiscountError(data.error || 'Invalid discount code');
        setDiscount(null);
      }
    } catch (error) {
      setDiscountError('Failed to apply discount code');
      setDiscount(null);
    } finally {
      setIsApplyingDiscount(false);
    }
  }

  function removeDiscount() {
    setDiscount(null);
    setDiscountCode('');
    setDiscountError(null);
  }

  async function handleCheckout() {
    // For free orders, require email first
    const isFreeOrder = discount?.percentage === 100;
    if (isFreeOrder && !email) {
      setShowEmailInput(true);
      setCheckoutError('Please enter your email for order confirmation');
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      const response = await fetch('/api/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountCode: discount?.code || null,
          email: email || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCheckoutError(data.error || 'Checkout failed');
        return;
      }

      if (data.freeOrder) {
        // Free order - redirect to success page
        router.push(`/checkout/success?order=${data.orderNumber}&free=true`);
      } else if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      }
    } catch (error) {
      setCheckoutError('Failed to start checkout');
    } finally {
      setIsCheckingOut(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Shopping Cart
        </h1>
        <div className="mt-12 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      </main>
    );
  }

  const isEmpty = !cartData || cartData.items.length === 0;
  const subtotal = cartData?.subtotal || 0;
  const discountAmount = discount ? (subtotal * discount.percentage) / 100 : 0;
  const total = Math.max(0, subtotal - discountAmount);

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Shopping Cart
        </h1>
        {!isEmpty && (
          <span className="text-sm text-gray-500">
            {cartData.itemCount} {cartData.itemCount === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="mt-12">
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Your cart is empty
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Start shopping to add items to your cart.
            </p>
            <div className="mt-6">
              <Link
                href="/products"
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Browse Products
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-12 lg:grid lg:grid-cols-12 lg:gap-x-12">
          {/* Cart Items */}
          <div className="lg:col-span-7">
            <div className="rounded-lg border border-gray-200 bg-white">
              <ul role="list" className="divide-y divide-gray-200">
                {cartData.items.map((item) => (
                  <li key={item.id} className="flex px-4 py-6 sm:px-6">
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400 text-xs">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-1 flex-col">
                      <div>
                        <div className="flex justify-between text-base font-medium text-gray-900">
                          <h3>{item.product.name}</h3>
                          <p className="ml-4">
                            {formatPrice(item.product.price * item.quantity)}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {formatPrice(item.product.price)} each
                        </p>
                      </div>
                      <div className="flex flex-1 items-end justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <label htmlFor={`quantity-${item.id}`} className="text-gray-500">
                            Qty
                          </label>
                          <select
                            id={`quantity-${item.id}`}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                            disabled={updatingItem === item.id}
                            className="rounded-md border border-gray-300 py-1 pl-2 pr-8 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={updatingItem === item.id}
                          className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mt-8 lg:col-span-5 lg:mt-0">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-medium text-gray-900">Order Summary</h2>

              {/* Discount Code Input */}
              <div className="mt-6">
                <label htmlFor="discount-code" className="block text-sm font-medium text-gray-700">
                  Discount Code
                </label>
                {discount ? (
                  <div className="mt-2 flex items-center justify-between rounded-md bg-green-50 px-3 py-2">
                    <div>
                      <span className="font-medium text-green-800">{discount.code}</span>
                      <span className="ml-2 text-sm text-green-600">({discount.description})</span>
                    </div>
                    <button
                      onClick={removeDiscount}
                      className="text-sm font-medium text-green-700 hover:text-green-800"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      id="discount-code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <button
                      onClick={applyDiscount}
                      disabled={isApplyingDiscount || !discountCode.trim()}
                      className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                    >
                      {isApplyingDiscount ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
                {discountError && (
                  <p className="mt-2 text-sm text-red-600">{discountError}</p>
                )}
                <div className="mt-3 rounded-md bg-blue-50 p-3">
                  <p className="text-xs font-medium text-blue-800 mb-1">Test Discount Codes:</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li><code className="rounded bg-blue-100 px-1 font-mono">FREEORDER</code> — 100% off (free!)</li>
                    <li><code className="rounded bg-blue-100 px-1 font-mono">HALF50</code> — 50% off</li>
                    <li><code className="rounded bg-blue-100 px-1 font-mono">SAVE20</code> — 20% off</li>
                  </ul>
                </div>
              </div>

              {/* Price Breakdown */}
              <dl className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-gray-600">Subtotal</dt>
                  <dd className="text-sm font-medium text-gray-900">{formatPrice(subtotal)}</dd>
                </div>

                {discount && (
                  <div className="flex items-center justify-between text-green-600">
                    <dt className="text-sm">Discount ({discount.percentage}%)</dt>
                    <dd className="text-sm font-medium">-{formatPrice(discountAmount)}</dd>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <dt className="text-base font-medium text-gray-900">Order Total</dt>
                  <dd className="text-base font-medium text-gray-900">{formatPrice(total)}</dd>
                </div>
              </dl>

              {/* Email input for free orders */}
              {(showEmailInput || (discount?.percentage === 100)) && (
                <div className="mt-6">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">For order confirmation</p>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
              )}

              {checkoutError && (
                <div className="mt-4 rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-700">{checkoutError}</p>
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full rounded-md bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCheckingOut ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      Processing...
                    </span>
                  ) : total === 0 ? (
                    'Complete Free Order'
                  ) : (
                    `Pay ${formatPrice(total)}`
                  )}
                </button>
              </div>

              <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
                <p>
                  or{' '}
                  <Link
                    href="/products"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Continue Shopping
                    <span aria-hidden="true"> &rarr;</span>
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
