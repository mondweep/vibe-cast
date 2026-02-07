Feature: Payments — Card Management, Wallet & Transaction Processing

  Background:
    Given the payments service is running and healthy
    And the identity service is running and healthy
    And I am logged in as "testuser@example.com"
    And test payment data has been seeded via API

  # ===========================================================================
  # Card Management Scenarios
  # ===========================================================================

  Scenario: User adds a new credit card
    Given I navigate to "Payment Methods"
    When I click "Add New Card"
    And I enter card number "4242 4242 4242 4242"
    And I enter expiry "12/28"
    And I enter CVV "123"
    And I enter cardholder name "Test User"
    And I click "Save Card"
    Then I should see the card ending in "4242" in my payment methods
    And the card should show as "Visa" with correct expiry

  Scenario: User removes a payment method
    Given I navigate to "Payment Methods"
    And I have a card ending in "4242" saved
    When I click "Remove" on the card ending in "4242"
    And I confirm the removal dialog
    Then the card ending in "4242" should no longer appear
    And I should see "Payment method removed successfully"

  Scenario: User sets default payment method
    Given I navigate to "Payment Methods"
    And I have multiple cards saved
    When I click "Set as Default" on the card ending in "5555"
    Then the card ending in "5555" should show a "Default" badge
    And the previous default card should no longer have the badge

  Scenario: Card validation rejects invalid input
    Given I navigate to "Payment Methods"
    When I click "Add New Card"
    And I enter card number "1234 5678 9012 3456"
    Then I should see "Invalid card number"
    When I enter expiry "01/20"
    Then I should see "Card has expired"
    When I enter CVV "12"
    Then I should see "Invalid CVV"

  # ===========================================================================
  # Wallet Operations Scenarios
  # ===========================================================================

  Scenario: User views wallet balance
    Given I navigate to "My Wallet"
    Then I should see my current balance displayed
    And the balance should match the API response from /api/wallet/balance

  Scenario: User tops up wallet from saved card
    Given I navigate to "My Wallet"
    And my current balance is "$50.00"
    When I click "Top Up"
    And I enter amount "$100.00"
    And I select card ending in "4242" as funding source
    And I confirm the top-up
    Then my wallet balance should update to "$150.00"
    And I should see a transaction record for the top-up

  # ===========================================================================
  # Transaction History Scenarios
  # ===========================================================================

  Scenario: User views transaction history with filtering
    Given I navigate to "Transaction History"
    Then I should see transactions listed in reverse chronological order
    When I filter by "This Month"
    Then I should only see transactions from the current month
    When I filter by type "Purchases"
    Then I should only see purchase transactions

  Scenario: User downloads transaction receipt
    Given I navigate to "Transaction History"
    When I click on a completed transaction
    Then I should see the transaction details panel
    And I should see the receipt with amount, date, and merchant
    When I click "Download Receipt"
    Then a PDF receipt should download

  # ===========================================================================
  # Payment Processing Scenarios
  # ===========================================================================

  Scenario: Successful payment for order
    Given I have items in my cart totaling "$89.99"
    And I am on the checkout page
    When I select card ending in "4242" as payment method
    And I click "Pay Now"
    Then the payment should be processed successfully
    And I should see "Payment of $89.99 confirmed"
    And the transaction should appear in my history

  Scenario: Payment fails due to insufficient funds
    Given I have items in my cart totaling "$10,000.00"
    And I am on the checkout page
    When I select a card with insufficient funds
    And I click "Pay Now"
    Then I should see "Payment declined: Insufficient funds"
    And I should be prompted to try a different payment method
    And no order should be created

  Scenario: Refund is processed for returned item
    Given I have a completed order with a returnable item
    When I initiate a return for the item
    And the return is approved
    Then I should see "Refund of $29.99 initiated"
    And the refund should appear in transaction history within 5 business days
    And the refund amount should credit to the original payment method
