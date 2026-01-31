/**
 * ProductCard Component
 *
 * Displays a product in the catalog grid
 * Accessible: alt text, keyboard navigation
 */

import Link from 'next/link';
import Image from 'next/image';
import { cn, formatPrice } from '@/lib/utils';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: { amount: number; currency: string };
    compareAtPrice?: { amount: number; currency: string } | null;
    image: { url: string; alt: string } | null;
    category: { name: string; slug: string };
    inStock: boolean;
    isFeatured: boolean;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const discount = product.compareAtPrice
    ? Math.round(
        ((product.compareAtPrice.amount - product.price.amount) /
          product.compareAtPrice.amount) *
          100
      )
    : null;

  return (
    <article className="group relative">
      <Link
        href={`/products/${product.slug}`}
        className="block focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-lg"
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
          {product.image ? (
            <Image
              src={product.image.url}
              alt={product.image.alt}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No image
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {discount && (
              <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded">
                -{discount}%
              </span>
            )}
            {product.isFeatured && (
              <span className="bg-indigo-500 text-white text-xs font-medium px-2 py-1 rounded">
                Featured
              </span>
            )}
          </div>

          {/* Out of stock overlay */}
          {!product.inStock && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <span className="text-gray-500 font-medium">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {product.category.name}
          </p>
          <h3 className="mt-1 text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
            {product.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className={cn(
              'text-sm font-semibold',
              product.compareAtPrice ? 'text-red-600' : 'text-gray-900'
            )}>
              {formatPrice(product.price.amount, product.price.currency)}
            </span>
            {product.compareAtPrice && (
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.compareAtPrice.amount, product.compareAtPrice.currency)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
