# ADR-004: Inventory Management Strategy

## Status
Accepted

## Context
E-commerce inventory management must handle:
- Concurrent purchases of limited stock
- Overselling prevention
- Cart reservation (hold items)
- Stock updates from multiple sources

Options considered:
1. **Optimistic locking** - Check at checkout, fast but risky
2. **Pessimistic locking** - Lock rows, safe but slow
3. **Reservation system** - Hold stock temporarily
4. **Event sourcing** - Full audit trail, complex

## Decision
Use **Reservation-based pessimistic inventory** with database transactions.

### Strategy
1. **Add to cart**: Soft reservation (no decrement)
2. **Start checkout**: Hard reservation (decrement available, increment reserved)
3. **Payment success**: Confirm reservation (move reserved to sold)
4. **Payment failure/timeout**: Release reservation (restore available)

### Implementation
```typescript
// Prisma schema
model Product {
  id            String @id
  stockTotal    Int    // Total physical stock
  stockReserved Int    // Reserved in checkout
  stockSold     Int    // Actually sold
  // Available = stockTotal - stockReserved - stockSold
}

// Reserve stock (start checkout)
async function reserveStock(productId: string, quantity: number) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    const available = product.stockTotal - product.stockReserved - product.stockSold;
    if (available < quantity) {
      throw new InsufficientStockError(productId, available);
    }

    return tx.product.update({
      where: { id: productId },
      data: { stockReserved: { increment: quantity } },
    });
  });
}

// Confirm reservation (payment success)
async function confirmReservation(productId: string, quantity: number) {
  return prisma.product.update({
    where: { id: productId },
    data: {
      stockReserved: { decrement: quantity },
      stockSold: { increment: quantity },
    },
  });
}

// Release reservation (payment failed/timeout)
async function releaseReservation(productId: string, quantity: number) {
  return prisma.product.update({
    where: { id: productId },
    data: { stockReserved: { decrement: quantity } },
  });
}
```

### Reservation Timeout
- Reservations expire after 15 minutes
- Cron job releases expired reservations
- User warned at 10 minutes remaining

## Consequences

### Positive
- No overselling (guaranteed)
- Fair to all customers (first-come-first-served)
- Clear audit trail
- Graceful handling of abandoned checkouts

### Negative
- Stock can appear "sold out" during high traffic
- Need background job for releasing expired reservations
- Slight latency on checkout start

### Risks
- Reservation timeout too short (users frustrated)
- Reservation timeout too long (stock held unnecessarily)
- Mitigate: A/B test timeout duration
