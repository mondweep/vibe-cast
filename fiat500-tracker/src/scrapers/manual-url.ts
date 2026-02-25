import { chromium, type Browser } from 'playwright';
import type { ScrapedListing } from '../types/index.js';

export async function scrapeManualUrl(url: string): Promise<ScrapedListing | null> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const platform = detectPlatform(url);

    // Try to extract structured data (JSON-LD)
    const jsonLd = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'Car' || data['@type'] === 'Vehicle' || data['@type'] === 'Product') {
            return data;
          }
        } catch { /* skip */ }
      }
      return null;
    });

    // Extract basic page info
    const title = await page.title();
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null);
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null);

    // Try to find price on page
    const priceText = await page.evaluate(() => {
      const priceSelectors = [
        '[data-testid="price"]',
        '.price',
        '[class*="price"]',
        'span:has-text("£")',
      ];
      for (const sel of priceSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.includes('£')) return el.textContent;
      }
      // Fallback: search all text for price pattern
      const body = document.body.textContent || '';
      const match = body.match(/£[\d,]+/);
      return match ? match[0] : null;
    });

    const price = priceText ? parseInt(priceText.replace(/[^0-9]/g, ''), 10) * 100 : 0;

    const displayTitle = ogTitle || title || 'Fiat 500';
    const year = extractYear(displayTitle) || 2015;

    await context.close();

    return {
      platform,
      platform_listing_id: `manual-${Date.now()}`,
      url,
      title: displayTitle,
      price,
      year,
      mileage: 0,
      engine_size: extractEngineSize(displayTitle),
      fuel_type: 'petrol',
      transmission: 'manual',
      colour: null,
      mot_expiry: null,
      seller_name: null,
      seller_type: 'private',
      seller_rating: null,
      location_postcode: null,
      description: jsonLd?.description || null,
      image_urls: ogImage ? [ogImage] : [],
    };
  } catch (err) {
    console.error('[ManualURL] Error:', err);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

function detectPlatform(url: string): string {
  const domain = new URL(url).hostname.toLowerCase();
  if (domain.includes('autotrader')) return 'autotrader';
  if (domain.includes('gumtree')) return 'gumtree';
  if (domain.includes('cargurus')) return 'cargurus';
  if (domain.includes('ebay')) return 'ebay-motors';
  if (domain.includes('facebook')) return 'facebook-marketplace';
  if (domain.includes('cinch')) return 'cinch';
  if (domain.includes('cazoo')) return 'cazoo';
  if (domain.includes('heycar')) return 'heycar';
  if (domain.includes('motors.co.uk')) return 'motors-co-uk';
  return 'other';
}

function extractYear(text: string): number | null {
  const match = text.match(/\b(20[0-2]\d)\b/);
  return match ? parseInt(match[1], 10) : null;
}

function extractEngineSize(text: string): string {
  if (/0\.9|twinair/i.test(text)) return '0.9';
  if (/1\.2/i.test(text)) return '1.2';
  if (/1\.4/i.test(text)) return '1.4';
  if (/1\.0/i.test(text)) return '1.0';
  return '1.2';
}
