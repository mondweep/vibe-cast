import { test, expect } from '@playwright/test';

test.describe('Paid Order with Stripe', () => {
  test('should complete paid order flow with 50% discount', async ({ page }) => {
    // Step 1: Go to products page
    console.log('Step 1: Navigate to products page');
    await page.goto('/products');
    await expect(page.locator('h1')).toHaveText('Products');

    // Step 2: Add first product to cart
    console.log('Step 2: Add product to cart');
    const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
    await addToCartButton.click();

    // Wait for "Added to cart!" message
    await expect(page.locator('text=Added to cart!')).toBeVisible({ timeout: 5000 });
    console.log('Product added successfully');

    // Step 3: Navigate to cart
    console.log('Step 3: Navigate to cart');
    await page.goto('/cart');
    await expect(page.locator('h1')).toHaveText('Shopping Cart');

    // Verify cart has items
    await expect(page.locator('text=Subtotal')).toBeVisible();
    await page.screenshot({ path: 'test-results/paid-01-cart-with-item.png' });

    // Step 4: Apply HALF50 discount (50% off - still requires payment)
    console.log('Step 4: Apply HALF50 discount code (50% off)');
    const discountInput = page.locator('input#discount-code');
    await discountInput.fill('HALF50');
    await page.locator('button:has-text("Apply")').click();

    // Wait for discount to be applied
    await expect(page.locator('text=50% off')).toBeVisible({ timeout: 5000 });
    console.log('50% discount applied');
    await page.screenshot({ path: 'test-results/paid-02-discount-applied.png' });

    // Step 5: Click checkout button (should redirect to Stripe)
    console.log('Step 5: Proceed to Stripe Checkout');
    // Button shows "Pay $XX.XX" for paid orders
    const checkoutButton = page.locator('button:has-text("Pay $")');
    await expect(checkoutButton).toBeVisible();
    await checkoutButton.click();

    // Step 6: Wait for Stripe checkout page
    console.log('Step 6: On Stripe Checkout page');
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    console.log('Redirected to Stripe Checkout:', page.url());
    await page.screenshot({ path: 'test-results/paid-03-stripe-checkout.png' });

    // Step 7: Fill in Stripe Checkout payment details
    console.log('Step 7: Fill in payment details');

    // Wait for the email input to be visible (indicates form is loaded)
    const emailInput = page.locator('input[name="email"], input[placeholder*="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 15000 });

    // Give Stripe a moment to fully initialize
    await page.waitForTimeout(1000);

    // Fill email first (it's required)
    await emailInput.fill('mondweep@gmail.com');
    console.log('Email filled');

    // Fill card number
    const cardInput = page.locator('input[placeholder*="1234"]').first();
    await cardInput.fill('4242424242424242');
    console.log('Card number filled');

    // Fill expiry date
    const expiryInput = page.locator('input[placeholder*="MM"]');
    await expiryInput.fill('1230');
    console.log('Expiry filled');

    // Fill CVC
    const cvcInput = page.locator('input[placeholder*="CVC"]');
    await cvcInput.fill('123');
    console.log('CVC filled');

    // Fill cardholder name
    const nameInput = page.locator('input[placeholder*="name on card"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User');
      console.log('Name filled');
    }

    // Fill postal code if visible
    const postalInput = page.locator('input[placeholder*="Postal"]');
    if (await postalInput.isVisible()) {
      await postalInput.fill('12345');
      console.log('Postal filled');
    }

    await page.screenshot({ path: 'test-results/paid-04-payment-filled.png' });

    // Step 8: Submit payment
    console.log('Step 8: Submit payment');
    const payButton = page.locator('button:has-text("Pay")').first();
    await payButton.click();

    // Step 9: Wait for redirect back to success page
    console.log('Step 9: Waiting for success redirect...');
    await page.waitForURL(/\/checkout\/success/, { timeout: 60000 });

    // Verify success page
    await expect(page.locator('text=Order Confirmed!')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/paid-05-order-success.png', fullPage: true });

    // For Stripe payments, the page shows Session ID (webhook will generate order number)
    const sessionText = await page.locator('text=Session:').textContent();
    console.log('Payment confirmed:', sessionText);

    // Verify payment was processed via Stripe
    await expect(page.locator('text=Payment processed via Stripe')).toBeVisible();

    console.log('✅ Paid order with Stripe completed successfully!');
  });
});
