'use client';

import { useState } from 'react';

interface AddToCartButtonProps {
  productId: string;
  productName: string;
}

export function AddToCartButton({ productId, productName }: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAddToCart() {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Added to cart!');
        setTimeout(() => setMessage(null), 2000);
      } else {
        setMessage(data.error || 'Failed to add');
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage('Error adding to cart');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={handleAddToCart}
        disabled={isLoading}
        className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Adding...' : 'Add to Cart'}
      </button>
      {message && (
        <p className={`mt-2 text-sm text-center ${message.includes('Added') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
