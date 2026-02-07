// =============================================================================
// Payments Context — E2E Test Suite
// =============================================================================
// Tests run against the REAL backend — NO mocking/stubbing.
// Each test traces to a Gherkin scenario in specs/payments.feature
// =============================================================================

describe('Payments — Card Management, Wallet & Transactions', () => {
  const API_BASE = Cypress.env('PAYMENTS_API') || 'http://localhost:8083';

  before(() => {
    // Seed test payment data via real API call
    cy.request('POST', `${API_BASE}/api/v1/test/seed`, {
      cards: [
        { last4: '4242', brand: 'visa', expiry: '12/28' },
        { last4: '5555', brand: 'mastercard', expiry: '06/27' },
      ],
      wallet: { balance: 5000 }, // $50.00 in cents
    });
  });

  // =========================================================================
  // Card Management — Traces to payments.feature Card Management Scenarios
  // =========================================================================

  describe('Card Management', () => {
    beforeEach(() => {
      cy.login('testuser@example.com', 'SecurePass123!');
      cy.visit('/payment-methods');
    });

    it('should add a new credit card', () => {
      // Gherkin: Scenario: User adds a new credit card
      cy.get('[data-testid="add-card-button"]').click();
      cy.get('[data-testid="card-number-input"]').type('4242424242424242');
      cy.get('[data-testid="card-expiry-input"]').type('1228');
      cy.get('[data-testid="card-cvv-input"]').type('123');
      cy.get('[data-testid="card-name-input"]').type('Test User');
      cy.get('[data-testid="save-card-button"]').click();

      cy.get('[data-testid="card-list"]').should('contain', '4242');
      cy.get('[data-testid="card-brand-visa"]').should('exist');
    });

    it('should remove a payment method', () => {
      // Gherkin: Scenario: User removes a payment method
      cy.get('[data-testid="card-4242"] [data-testid="remove-button"]').click();
      cy.get('[data-testid="confirm-remove-dialog"]')
        .find('[data-testid="confirm-button"]')
        .click();

      cy.get('[data-testid="card-list"]').should('not.contain', '4242');
      cy.get('[data-testid="success-toast"]').should(
        'contain',
        'Payment method removed successfully'
      );
    });

    it('should set default payment method', () => {
      // Gherkin: Scenario: User sets default payment method
      cy.get(
        '[data-testid="card-5555"] [data-testid="set-default-button"]'
      ).click();

      cy.get('[data-testid="card-5555"] [data-testid="default-badge"]').should(
        'exist'
      );
    });

    it('should reject invalid card details', () => {
      // Gherkin: Scenario: Card validation rejects invalid input
      cy.get('[data-testid="add-card-button"]').click();

      cy.get('[data-testid="card-number-input"]').type('1234567890123456');
      cy.get('[data-testid="card-number-error"]').should(
        'contain',
        'Invalid card number'
      );

      cy.get('[data-testid="card-expiry-input"]').type('0120');
      cy.get('[data-testid="card-expiry-error"]').should(
        'contain',
        'Card has expired'
      );

      cy.get('[data-testid="card-cvv-input"]').type('12');
      cy.get('[data-testid="card-cvv-error"]').should(
        'contain',
        'Invalid CVV'
      );
    });
  });

  // =========================================================================
  // Wallet Operations — Traces to payments.feature Wallet Scenarios
  // =========================================================================

  describe('Wallet Operations', () => {
    beforeEach(() => {
      cy.login('testuser@example.com', 'SecurePass123!');
      cy.visit('/wallet');
    });

    it('should display wallet balance matching API', () => {
      // Gherkin: Scenario: User views wallet balance
      cy.request(`${API_BASE}/api/wallet/balance`).then((response) => {
        const expectedBalance = (response.body.balance / 100).toFixed(2);
        cy.get('[data-testid="wallet-balance"]').should(
          'contain',
          `$${expectedBalance}`
        );
      });
    });

    it('should top up wallet from saved card', () => {
      // Gherkin: Scenario: User tops up wallet from saved card
      cy.get('[data-testid="topup-button"]').click();
      cy.get('[data-testid="topup-amount-input"]').type('100.00');
      cy.get('[data-testid="funding-source-select"]').select('card-4242');
      cy.get('[data-testid="confirm-topup-button"]').click();

      cy.get('[data-testid="wallet-balance"]').should('contain', '$150.00');
      cy.get('[data-testid="success-toast"]').should('contain', 'Top-up successful');
    });
  });

  // =========================================================================
  // Transaction History — Traces to payments.feature Transaction Scenarios
  // =========================================================================

  describe('Transaction History', () => {
    beforeEach(() => {
      cy.login('testuser@example.com', 'SecurePass123!');
      cy.visit('/transactions');
    });

    it('should display transactions in reverse chronological order', () => {
      // Gherkin: Scenario: User views transaction history with filtering
      cy.get('[data-testid="transaction-list"] [data-testid="transaction-item"]')
        .should('have.length.greaterThan', 0)
        .then(($items) => {
          const dates = $items
            .map((_, el) => new Date(el.dataset.date).getTime())
            .get();
          const isSorted = dates.every(
            (val: number, i: number) => i === 0 || val <= dates[i - 1]
          );
          expect(isSorted).to.be.true;
        });
    });

    it('should filter transactions by time period and type', () => {
      // Gherkin: Scenario: User views transaction history with filtering
      cy.get('[data-testid="period-filter"]').select('this-month');
      cy.get('[data-testid="transaction-list"]')
        .find('[data-testid="transaction-item"]')
        .should('have.length.greaterThan', 0);

      cy.get('[data-testid="type-filter"]').select('purchases');
      cy.get('[data-testid="transaction-list"]')
        .find('[data-testid="transaction-type"]')
        .each(($el) => {
          expect($el.text()).to.eq('Purchase');
        });
    });
  });

  // =========================================================================
  // Payment Processing — Traces to payments.feature Processing Scenarios
  // =========================================================================

  describe('Payment Processing', () => {
    beforeEach(() => {
      cy.login('testuser@example.com', 'SecurePass123!');
    });

    it('should process payment successfully', () => {
      // Gherkin: Scenario: Successful payment for order
      // Add item to cart and go to checkout (depends on catalog + orders)
      cy.visit('/checkout');
      cy.get('[data-testid="payment-method-select"]').select('card-4242');
      cy.get('[data-testid="pay-now-button"]').click();

      cy.get('[data-testid="payment-confirmation"]').should(
        'contain',
        'Payment of'
      );
      cy.get('[data-testid="payment-confirmation"]').should(
        'contain',
        'confirmed'
      );
    });

    it('should handle payment failure gracefully', () => {
      // Gherkin: Scenario: Payment fails due to insufficient funds
      cy.visit('/checkout');
      cy.get('[data-testid="payment-method-select"]').select(
        'card-insufficient'
      );
      cy.get('[data-testid="pay-now-button"]').click();

      cy.get('[data-testid="payment-error"]').should(
        'contain',
        'Payment declined'
      );
      cy.get('[data-testid="try-different-method"]').should('be.visible');
    });
  });
});
