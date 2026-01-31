import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AddToCartButton } from './AddToCartButton';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

async function getProducts() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: {
      category: true,
      images: {
        where: { isPrimary: true },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return products;
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Products
        </h1>
        <div className="flex items-center gap-4">
          <Link
            href="/cart"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            View Cart &rarr;
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-gray-500"
          >
            <span aria-hidden="true">&larr;</span> Home
          </Link>
        </div>
      </div>

      <p className="mt-4 text-gray-600">
        Browse our collection of {products.length} quality products.
      </p>

      {products.length === 0 ? (
        <div className="mt-10 rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No products available yet.</p>
          <p className="mt-2 text-sm text-gray-400">
            Run <code className="rounded bg-gray-100 px-1">npx tsx prisma/seed.ts</code> to add demo products.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
          {products.map((product) => (
            <div key={product.id} className="group relative">
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                {product.images[0] ? (
                  <img
                    src={product.images[0].url}
                    alt={product.images[0].altText || product.name}
                    className="h-full w-full object-cover object-center group-hover:opacity-75 transition-opacity"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    No image
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {product.category.name}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatPrice(Number(product.price))}
                </p>
              </div>
              <AddToCartButton productId={product.id} productName={product.name} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
