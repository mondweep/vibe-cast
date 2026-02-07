Feature: Orders — Shopping Cart, Checkout & Order Tracking

  Background:
    Given all backend services are running and healthy
    And I am logged in as "testuser@example.com"
    And test product and payment data has been seeded via API

  # ===========================================================================
  # Shopping Cart Scenarios
  # ===========================================================================

  Scenario: User adds item to cart
    Given I am viewing product "Wireless Headphones" on the catalog page
    When I click "Add to Cart"
    Then the cart badge should show "1"
    And I should see a confirmation toast "Added to cart"

  Scenario: User updates item quantity in cart
    Given I have "Wireless Headphones" in my cart with quantity 1
    When I navigate to the cart
    And I increase the quantity to 3
    Then the line item total should update to reflect 3 units
    And the cart total should recalculate

  Scenario: User removes item from cart
    Given I have 2 items in my cart
    When I navigate to the cart
    And I click "Remove" on the first item
    Then the cart should show 1 item
    And the cart total should update accordingly

  Scenario: Cart persists across sessions
    Given I have items in my cart
    When I log out
    And I log back in as "testuser@example.com"
    Then my cart should contain the same items as before

  # ===========================================================================
  # Checkout Scenarios
  # ===========================================================================

  Scenario: User completes full checkout flow
    Given I have items in my cart totaling "$149.97"
    When I proceed to checkout
    And I select shipping address "123 Main St, Springfield, IL 62701"
    And I select shipping method "Standard (5-7 days)"
    And I select payment method card ending in "4242"
    And I review the order summary
    And I click "Place Order"
    Then I should see order confirmation with an order number
    And I should receive an order confirmation email
    And my cart should be empty

  Scenario: Checkout applies discount code
    Given I have items in my cart totaling "$200.00"
    When I proceed to checkout
    And I enter promo code "SAVE20"
    And I click "Apply"
    Then the discount of "$40.00" should be reflected
    And the new total should be "$160.00" plus shipping

  Scenario: Checkout validates shipping address
    Given I am on the checkout page
    When I enter an incomplete shipping address (missing zip code)
    And I try to proceed to payment
    Then I should see "Please enter a valid zip code"
    And I should not be able to proceed until the address is complete

  # ===========================================================================
  # Order Tracking Scenarios
  # ===========================================================================

  Scenario: User tracks order status
    Given I have a recently placed order
    When I navigate to "My Orders"
    And I click on the order
    Then I should see the order status timeline
    And the current status should be "Processing"
    And estimated delivery date should be displayed

  Scenario: User receives status update notification
    Given I have an order in "Shipped" status
    When the delivery partner updates the tracking
    Then the order status should update to show latest tracking info
    And I should see the carrier tracking number as a clickable link

  # ===========================================================================
  # Order History Scenarios
  # ===========================================================================

  Scenario: User views order history
    Given I have completed orders in my account
    When I navigate to "My Orders"
    Then I should see orders listed newest first
    And each order should show date, total, and status

  Scenario: User re-orders from history
    Given I have a completed order with available items
    When I navigate to "My Orders"
    And I click "Re-order" on a past order
    Then all available items should be added to my cart
    And I should see a message if any items are no longer available
