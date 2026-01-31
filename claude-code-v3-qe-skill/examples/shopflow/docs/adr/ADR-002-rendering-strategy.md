# ADR-002: Rendering Strategy for Product Catalog

## Status
Accepted

## Context
Next.js 14 offers multiple rendering strategies. We need to choose the optimal approach for:
- Product catalog pages (SEO critical)
- Product detail pages (SEO critical)
- Cart and checkout (user-specific)
- Admin dashboard (authenticated)

## Decision
Use a **hybrid approach** with React Server Components as default.

### Strategy by Page Type

| Page | Strategy | Rationale |
|------|----------|-----------|
| Product catalog | RSC + SSG with ISR | SEO, performance, cache |
| Product detail | RSC + SSG with ISR | SEO, performance |
| Search results | RSC + streaming | Dynamic, fast TTFB |
| Cart | Client Component | User-specific, real-time |
| Checkout | RSC + Client islands | Security, interactivity |
| Admin | RSC + Client islands | Auth, data tables |

### Implementation
```typescript
// Product catalog - Server Component with ISR
// app/(shop)/products/page.tsx
export const revalidate = 60; // ISR: revalidate every 60s

async function ProductsPage({ searchParams }) {
  const products = await getProducts(searchParams);
  return <ProductGrid products={products} />;
}

// Cart - Client Component
// components/cart/CartDrawer.tsx
'use client';
export function CartDrawer() {
  const { items, updateQuantity } = useCart();
  // Real-time cart updates
}
```

## Consequences

### Positive
- Zero JS for catalog browsing (faster LCP)
- Excellent SEO for product pages
- Reduced client bundle size
- Streaming for search results

### Negative
- Learning curve for RSC patterns
- Some interactivity requires client components
- Cache invalidation complexity

### Risks
- Stale product data (mitigate: short ISR intervals, on-demand revalidation)
