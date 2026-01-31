# ADR-003: Real-time Inventory with Reservation Pattern

## Status
Accepted

## Context
ShopFlow V2 must handle inventory accurately to prevent:
- Overselling products
- Customer disappointment from out-of-stock items
- Inventory discrepancies between warehouses

Key requirements:
- Real-time availability updates
- Multi-warehouse support
- Reservation during checkout flow
- Automatic reorder point notifications

## Decision
Implement **Reservation Pattern** with **Eventual Consistency**:

```typescript
// Inventory states
Available = Quantity - Reserved

// Checkout flow
1. User adds to cart → No reservation
2. User starts checkout → Reserve inventory
3. Payment succeeds → Convert reservation to sale
4. Payment fails/timeout → Release reservation
```

### Implementation Details

```typescript
interface InventoryService {
  checkAvailability(productId: string, quantity: number): Promise<boolean>;
  reserve(orderId: string, items: ReserveItem[]): Promise<Reservation>;
  confirm(reservationId: string): Promise<void>;
  release(reservationId: string): Promise<void>;
}
```

- Reservations expire after 15 minutes
- Background job cleans up expired reservations
- Redis used for real-time availability caching
- PostgreSQL is source of truth

## Consequences

### Positive
- Prevents overselling with high concurrency
- Users see accurate availability
- Supports multi-warehouse fulfillment
- Audit trail via movement records

### Negative
- Added complexity vs simple decrement
- Need to handle reservation timeouts
- Eventual consistency requires careful UI messaging

## Alternatives Considered
1. **Optimistic Locking**: Simpler but poor UX with conflicts
2. **Synchronous Decrement**: Race conditions at scale
3. **Queue-based**: Too slow for checkout UX

## References
- Martin Fowler's Reservation Pattern
- Saga Pattern for distributed transactions
