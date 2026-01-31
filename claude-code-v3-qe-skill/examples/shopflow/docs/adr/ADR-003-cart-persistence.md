# ADR-003: Cart Persistence Strategy

## Status
Accepted

## Context
Shopping carts must persist across sessions and devices. Requirements:
- Anonymous users can add to cart (no login required)
- Cart survives browser close
- Cart syncs when user logs in
- Fast read/write (cart is high-traffic)

Options considered:
1. **localStorage** - Client-only, no sync
2. **Database (PostgreSQL)** - Durable, but slower
3. **Redis** - Fast, TTL support, pub/sub
4. **Hybrid** - localStorage + Redis sync

## Decision
Use **Redis** for cart persistence with localStorage fallback.

### Architecture
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Redis   │────▶│ PostgreSQL│
│ (cookie) │     │ (7 days) │     │ (orders)  │
└──────────┘     └──────────┘     └──────────┘
     │                                  ▲
     │                                  │
     └─────── cart → order ─────────────┘
```

### Implementation
```typescript
// Cart ID stored in cookie (httpOnly)
const cartId = cookies().get('cart_id')?.value || createCartId();

// Redis operations
const cart = await redis.hgetall(`cart:${cartId}`);
await redis.hset(`cart:${cartId}`, productId, JSON.stringify(item));
await redis.expire(`cart:${cartId}`, 60 * 60 * 24 * 7); // 7 days

// Merge on login
async function mergeAnonymousCart(userId: string, anonymousCartId: string) {
  const anonymousCart = await getCart(anonymousCartId);
  const userCart = await getCart(`user:${userId}`);
  // Merge logic: keep higher quantities
  await redis.del(`cart:${anonymousCartId}`);
}
```

## Consequences

### Positive
- Sub-millisecond cart operations
- Automatic expiry (no cleanup jobs)
- Scales horizontally
- Works for anonymous users

### Negative
- Additional infrastructure (Redis)
- Data loss if Redis fails (mitigate: persistence, replicas)
- Complexity of cart merging on login

### Risks
- Redis unavailability (mitigate: localStorage fallback, queue writes)
