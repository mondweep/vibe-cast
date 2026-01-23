/**
 * Example 3: Data Extraction & Scraping
 * 
 * Demonstrates:
 * - Extracting structured data from pages
 * - Using element refs for targeted extraction
 * - JavaScript evaluation in page context
 * - Processing extracted data
 */

import { createBrowserService } from '@claude-flow/browser';

interface ExtractedData {
  title: string;
  headings: string[];
  links: Array<{ text: string; href: string }>;
  metadata: Record<string, string>;
}

async function extractDataFromPage(url: string): Promise<ExtractedData> {
  console.log('📊 Starting Data Extraction Example...\n');

  const browser = createBrowserService({
    sessionId: 'extract-demo',
    enableSecurity: true,
    enableMemory: true,
  });

  try {
    browser.startTrajectory(`Extract data from ${url}`);

    // Navigate to the page
    console.log(`📍 Opening ${url}...`);
    await browser.open(url);

    // Get snapshot with all interactive elements
    console.log('📸 Taking snapshot...');
    const snapshot = await browser.snapshot({ interactive: true });

    // Method 1: Use extractData with element refs
    // This is the preferred method for AI agents
    console.log('🔍 Extracting via element refs...');
    const elementData = await browser.extractData(['@e1', '@e2', '@e3', '@e4', '@e5']);
    console.log('   Extracted elements:', elementData?.length || 0);

    // Method 2: Run JavaScript to extract structured data
    console.log('🔍 Extracting via JavaScript...');
    const jsData = await browser.evaluate(`
      (() => {
        return {
          title: document.title,
          headings: Array.from(document.querySelectorAll('h1, h2, h3'))
            .map(h => h.textContent?.trim())
            .filter(Boolean)
            .slice(0, 10),
          links: Array.from(document.querySelectorAll('a[href]'))
            .map(a => ({ 
              text: a.textContent?.trim() || '', 
              href: a.href 
            }))
            .filter(l => l.text)
            .slice(0, 10),
          metadata: {
            description: document.querySelector('meta[name="description"]')?.content || '',
            url: window.location.href,
            loadTime: performance.now().toFixed(2) + 'ms'
          }
        };
      })()
    `);

    console.log('\n✅ Data extracted successfully!');
    console.log('─'.repeat(50));
    console.log('📄 Title:', jsData.title);
    console.log('📑 Headings found:', jsData.headings?.length || 0);
    console.log('🔗 Links found:', jsData.links?.length || 0);
    console.log('⏱️  Load time:', jsData.metadata?.loadTime);
    console.log('─'.repeat(50));

    // Display some extracted content
    if (jsData.headings?.length > 0) {
      console.log('\n📑 First headings:');
      jsData.headings.slice(0, 3).forEach((h: string, i: number) => {
        console.log(`   ${i + 1}. ${h}`);
      });
    }

    if (jsData.links?.length > 0) {
      console.log('\n🔗 First links:');
      jsData.links.slice(0, 3).forEach((l: { text: string; href: string }, i: number) => {
        console.log(`   ${i + 1}. "${l.text}" → ${l.href.substring(0, 50)}...`);
      });
    }

    await browser.endTrajectory(true, 'Data extraction completed');

    return jsData as ExtractedData;

  } catch (error) {
    console.error('❌ Extraction failed:', error);
    await browser.endTrajectory(false, `Failed: ${error}`);
    throw error;
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed.');
  }
}

// Run with a sample page
async function main() {
  const testUrls = [
    'https://example.com',
    'https://httpbin.org/html',
  ];

  for (const url of testUrls) {
    console.log('\n' + '='.repeat(60));
    try {
      await extractDataFromPage(url);
    } catch (error) {
      console.log(`Skipping ${url} due to error`);
    }
    console.log('='.repeat(60) + '\n');
  }
}

main().catch(console.error);
