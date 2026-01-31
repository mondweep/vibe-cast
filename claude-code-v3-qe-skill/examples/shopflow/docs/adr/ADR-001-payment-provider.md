# ADR-001: Payment Provider Selection

## Status
Accepted

## Context
We need a payment provider for processing e-commerce transactions. The solution must:
- Handle credit/debit cards securely (PCI-DSS compliant)
- Support webhooks for async payment confirmation
- Provide good developer experience
- Handle refunds and disputes

Options considered:
1. **Stripe** - Industry leader, excellent DX, Checkout Sessions
2. **PayPal** - Wide adoption, PayPal balance support
3. **Square** - Good for omnichannel (online + POS)

## Decision
Use **Stripe** as the primary payment provider.

### Rationale
- **PCI-DSS Compliance**: Stripe Checkout handles card data, we never touch raw PANs
- **Checkout Sessions**: Pre-built, secure checkout flow
- **Webhooks**: Reliable event delivery with signatures
- **Developer Experience**: Excellent SDK, documentation, test mode
- **Payment Methods**: Cards, Apple Pay, Google Pay, Buy Now Pay Later

### Implementation
```typescript
// Server-side: Create checkout session
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: cartItems.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: { name: item.name },
      unit_amount: item.price * 100,
    },
    quantity: item.quantity,
  })),
  success_url: `${origin}/orders/{CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/cart`,
});

// Webhook: Handle payment completion
if (event.type === 'checkout.session.completed') {
  await fulfillOrder(session);
}
```

## Consequences

### Positive
- No PCI scope (Stripe handles card data)
- Rapid implementation with Checkout Sessions
- Built-in fraud detection (Radar)
- Easy refunds and dispute handling
- Comprehensive test mode

### Negative
- Vendor lock-in (Stripe-specific API)
- Transaction fees (2.9% + $0.30 per transaction)
- No PayPal wallet support (users with PayPal balance)

### Risks
- Stripe outages affect checkout (mitigate: queue orders, retry logic)
- Webhook delivery delays (mitigate: idempotency keys, polling fallback)

### Mitigations
- Implement graceful degradation for Stripe outages
- Use idempotency keys for all mutations
- Store webhook events for replay
