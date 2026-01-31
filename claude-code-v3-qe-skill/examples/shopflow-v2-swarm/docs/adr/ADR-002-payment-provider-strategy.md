# ADR-002: Stripe as Primary Payment Provider with Abstraction

## Status
Accepted

## Context
ShopFlow V2 needs to process payments securely and reliably. Requirements include:
- PCI-DSS compliance
- Support for cards, wallets, and bank transfers
- Subscription billing capability for future features
- Refund and dispute handling
- Multi-currency support

## Decision
We choose **Stripe** as our primary payment provider, implemented behind an abstraction layer:

```typescript
// Port definition
interface PaymentGateway {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent>;
  confirmPayment(paymentId: string): Promise<Payment>;
  refundPayment(paymentId: string, amount?: number): Promise<Refund>;
  createCustomer(input: CreateCustomerInput): Promise<Customer>;
}

// Stripe adapter implementation
class StripePaymentGateway implements PaymentGateway {
  // Implementation using Stripe SDK
}
```

### Implementation Details
1. Use Stripe Elements for secure card collection
2. Implement webhook handler for async payment events
3. Store Stripe IDs in database for reconciliation
4. Use idempotency keys for safe retries

## Consequences

### Positive
- Industry-leading fraud detection
- Excellent developer experience
- Handles PCI compliance automatically
- Easy to add new payment methods
- Abstraction allows switching providers if needed

### Negative
- Higher fees than some alternatives (2.9% + 30¢)
- US-centric, some features limited internationally
- Webhook complexity for payment state management

## Alternatives Considered
1. **PayPal**: Lower brand trust, worse DX
2. **Square**: Limited international support
3. **Adyen**: Enterprise-focused, higher minimums
4. **Building in-house**: PCI compliance nightmare

## References
- Stripe API Documentation
- PCI-DSS Requirements
