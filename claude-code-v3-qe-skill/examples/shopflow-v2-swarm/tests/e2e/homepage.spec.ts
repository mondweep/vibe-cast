import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load and display content with CSS', async ({ page }) => {
    await page.goto('/');

    // Take screenshot to see current state
    await page.screenshot({ path: 'test-results/homepage.png', fullPage: true });

    // Check title is visible
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('ShopFlow V2');

    // Check if CSS is loaded by verifying computed styles
    const titleStyles = await title.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        color: styles.color,
      };
    });

    console.log('Title styles:', titleStyles);

    // Check if Tailwind classes are applied (font should be bold)
    expect(parseInt(titleStyles.fontWeight)).toBeGreaterThanOrEqual(700);

    // Check links are present
    const browseLink = page.locator('a[href="/products"]');
    await expect(browseLink).toBeVisible();

    const cartLink = page.locator('a[href="/cart"]');
    await expect(cartLink).toBeVisible();
  });

  test('should navigate to cart page', async ({ page }) => {
    await page.goto('/');

    // Click cart link
    await page.click('a[href="/cart"]');

    // Wait for navigation
    await page.waitForURL('/cart');

    // Take screenshot
    await page.screenshot({ path: 'test-results/cart.png', fullPage: true });

    // Check cart page loaded
    const cartTitle = page.locator('h1');
    await expect(cartTitle).toHaveText('Shopping Cart');
  });

  test('check page source for CSS issues', async ({ page }) => {
    await page.goto('/');

    // Check for stylesheet links
    const stylesheets = await page.evaluate(() => {
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      return Array.from(links).map(link => (link as HTMLLinkElement).href);
    });
    console.log('Stylesheets found:', stylesheets);

    // Check for style tags
    const styleTags = await page.evaluate(() => {
      const styles = document.querySelectorAll('style');
      return styles.length;
    });
    console.log('Style tags found:', styleTags);

    // Check body background color
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    console.log('Body background color:', bgColor);

    // Check for any CSS errors in console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Reload to capture console errors
    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log('Console errors:', consoleErrors);
  });
});
