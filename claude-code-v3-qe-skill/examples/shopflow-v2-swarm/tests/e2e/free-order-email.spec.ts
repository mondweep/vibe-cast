import { test, expect } from '@playwright/test';

test.describe('Free Order Email Flow', () => {
  test('should complete free order flow with email', async ({ page }) => {
    // Step 1: Go to products page
    console.log('Step 1: Navigate to products page');
    await page.goto('/products');
    await expect(page.locator('h1')).toHaveText('Products');

    // Take screenshot
    await page.screenshot({ path: 'test-results/01-products-page.png' });

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
    await page.screenshot({ path: 'test-results/02-cart-with-item.png' });

    // Step 4: Apply FREEORDER discount
    console.log('Step 4: Apply FREEORDER discount code');
    const discountInput = page.locator('input#discount-code');
    await discountInput.fill('FREEORDER');
    await page.locator('button:has-text("Apply")').click();

    // Wait for discount to be applied
    await expect(page.locator('text=100% off')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=$0.00')).toBeVisible();
    console.log('Discount applied - total is $0.00');
    await page.screenshot({ path: 'test-results/03-discount-applied.png' });

    // Step 5: Enter email address
    console.log('Step 5: Enter email address');
    const emailInput = page.locator('input#email');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('test@example.com');
    await page.screenshot({ path: 'test-results/04-email-entered.png' });

    // Step 6: Click checkout button
    console.log('Step 6: Complete free order');
    const checkoutButton = page.locator('button:has-text("Complete Free Order")');
    await expect(checkoutButton).toBeVisible();
    await checkoutButton.click();

    // Step 7: Verify redirect to success page
    console.log('Step 7: Verify success page');
    await page.waitForURL(/\/checkout\/success/, { timeout: 10000 });

    // Check success page content
    await expect(page.locator('text=Order Confirmed!')).toBeVisible();
    await expect(page.locator('text=discount code was applied')).toBeVisible();
    await page.screenshot({ path: 'test-results/05-order-success.png', fullPage: true });

    // Get order number
    const orderNumber = await page.locator('text=ORD-').textContent();
    console.log('Order completed:', orderNumber);

    console.log('✅ Free order email flow completed successfully!');
  });
});
