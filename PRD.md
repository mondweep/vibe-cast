# Product Requirements Document: Shopping Cart Enhancements

## 1. Introduction

The current Shopping Cart Management system provides basic functionality for adding and removing items from a digital basket. To improve the user experience and business operations, the system requires a shift from a static inventory list to a real-time, quantity-aware management system with an integrated promotion engine.

## 2. Objectives

* Real-Time Stock Management: Ensure the inventory dynamically reflects available quantities as users interact with the cart.
* Flexible Item Entry: Allow users to add multiple units of a single item in one action.
* Promotion Engine: Implement automated and manual discount logic to incentivise higher spending and loyalty.

## 3. User Stories

* As a user, I want to specify how many units of a product I am adding to my cart so that I don't have to click "add" multiple times.
* As a user, I want to see how many items are left in stock to avoid adding unavailable products.
* As a shopper, I want to apply a coupon code or receive an automatic discount on large orders to save money.
* As an administrator, I want the inventory to automatically update when a cart is modified so that I can maintain accurate records.

## 4. Functional Requirements

### 4.1 Real-Time Inventory & Quantity Selection

* Requirement: The system must track current stock levels for every item in the inventory.
* Requirement: The add_item_to_cart function must accept a quantity parameter.
* Logic:
   * When adding an item, the system must check if requested_quantity <= available_stock.
   * If valid, the available_stock must be decremented by the requested amount.
   * When removing an item, the corresponding quantity must be added back to the available_stock.
* UI Update: The Gradio interface should include a numeric input or slider for quantity next to the item selection dropdown.

### 4.2 Promotion and Discount System

The system must support two types of percentage-based discounts and a BOGO offer.

#### 4.2.1 Percentage Discounts

* Threshold Discount: Apply an automatic 5% discount to the cart total if the value exceeds $1,000.
* Coupon Codes: Implement a text input field for coupon codes.
   * The system should validate the code against a predefined list (e.g., SAVE10 for 10% off).
   * Only one coupon code can be active at a time.

#### 4.2.2 Buy-One-Get-One-Free (BOGO)

* Requirement: Certain items (flagged in the inventory) should trigger a BOGO offer.
* Logic: For every two units of a BOGO-eligible item, the price of one unit is deducted from the total.
   * Formula: Final_Item_Cost = (Quantity // 2 + Quantity % 2) * Unit_Price.

## 5. Technical Specifications

### 5.1 Data Structure Migration

Currently, the system utilizes a list of tuples for inventory: (id, "Item Name", price). To support these enhancements, the inventory must migrate to a dictionary or a structured object to store stock levels and promotion flags.

New Suggested Structure:

```python
inventory = {
    1: {"name": "Apples", "price": 250, "stock": 50, "is_bogo": False},
    2: {"name": "Cherry", "price": 650, "stock": 20, "is_bogo": True}
}
```

### 5.2 Price Calculation Logic

The calculate_total function must be refactored into a multi-step pipeline:

1. Subtotal Calculation: Sum the price of all items (applying BOGO logic where applicable).
2. Threshold Check: If subtotal > 1000, apply 5% reduction.
3. Coupon Application: If a valid coupon is provided, apply the additional percentage reduction.
4. Final Total: Output the net amount.

## 6. UI/UX Enhancements

* Stock Status: Display "In Stock: X" next to item names in the selection menu.
* Alerts: Provide immediate feedback if a user attempts to add more items than are currently available.
* Summary: The checkout area should clearly show:
   * Gross Total
   * Discounts Applied (BOGO, Threshold, or Coupon)
   * Net Total

## 7. Success Metrics

* Inventory Accuracy: 100% correlation between cart actions and stock level changes.
* Transaction Value: Increased average order value through the $1,000 discount incentive.
* Error Reduction: Zero "out of stock" errors during the final checkout phase.
