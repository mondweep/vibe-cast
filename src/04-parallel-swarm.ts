/**
 * Example 4: Parallel Browser Swarm
 * 
 * Demonstrates:
 * - Creating a browser swarm for parallel operations
 * - Spawning multiple browser sessions
 * - Coordinating parallel scraping tasks
 * - Aggregating results from multiple browsers
 */

import { createBrowserSwarm, createBrowserService } from '@claude-flow/browser';

interface ScrapedResult {
  url: string;
  title: string;
  status: 'success' | 'error';
  data?: any;
  error?: string;
  duration: number;
}

async function parallelScrape(urls: string[]): Promise<ScrapedResult[]> {
  console.log('🐝 Starting Parallel Swarm Example...\n');
  console.log(`📋 URLs to process: ${urls.length}`);

  // Create a swarm with max 5 concurrent sessions
  const swarm = createBrowserSwarm({
    maxSessions: 5,
    enableSecurity: true,
    enableMemory: true,
  });

  console.log('🚀 Spawning browser swarm...\n');

  const results: ScrapedResult[] = [];
  const startTime = Date.now();

  // Process all URLs in parallel
  const promises = urls.map(async (url, index) => {
    const taskStart = Date.now();
    console.log(`  [${index + 1}/${urls.length}] Starting: ${url}`);

    try {
      // Spawn a new browser session from the swarm
      const browser = await swarm.spawn();

      // Navigate and extract
      await browser.open(url);
      const snapshot = await browser.snapshot({ interactive: true });

      // Extract page data
      const data = await browser.evaluate(`
        ({
          title: document.title,
          elementCount: document.querySelectorAll('*').length,
          textLength: document.body?.innerText?.length || 0,
          linkCount: document.querySelectorAll('a').length,
        })
      `);

      await browser.close();

      const duration = Date.now() - taskStart;
      console.log(`  ✅ [${index + 1}] Done: ${url} (${duration}ms)`);

      return {
        url,
        title: data.title || snapshot.title || 'Unknown',
        status: 'success' as const,
        data,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - taskStart;
      console.log(`  ❌ [${index + 1}] Failed: ${url} - ${error}`);

      return {
        url,
        title: 'Error',
        status: 'error' as const,
        error: String(error),
        duration,
      };
    }
  });

  // Wait for all to complete
  const settled = await Promise.all(promises);
  results.push(...settled);

  const totalDuration = Date.now() - startTime;

  // Summary
  console.log('\n' + '─'.repeat(60));
  console.log('📊 SWARM RESULTS SUMMARY');
  console.log('─'.repeat(60));

  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');

  console.log(`✅ Successful: ${successful.length}/${urls.length}`);
  console.log(`❌ Failed: ${failed.length}/${urls.length}`);
  console.log(`⏱️  Total time: ${totalDuration}ms`);
  console.log(`⚡ Avg per URL: ${Math.round(totalDuration / urls.length)}ms`);

  if (successful.length > 0) {
    console.log('\n📄 Successful extractions:');
    successful.forEach((r, i) => {
      console.log(`   ${i + 1}. "${r.title}" - ${r.data?.elementCount || 0} elements`);
    });
  }

  if (failed.length > 0) {
    console.log('\n⚠️  Failed URLs:');
    failed.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.url}: ${r.error}`);
    });
  }

  console.log('─'.repeat(60));

  return results;
}

// Alternative: Sequential processing (for comparison)
async function sequentialScrape(urls: string[]): Promise<ScrapedResult[]> {
  console.log('🔄 Sequential Processing (for comparison)...\n');

  const browser = createBrowserService({
    sessionId: 'sequential-demo',
  });

  const results: ScrapedResult[] = [];
  const startTime = Date.now();

  for (const url of urls) {
    const taskStart = Date.now();
    try {
      await browser.open(url);
      const data = await browser.evaluate(`({ title: document.title })`);
      results.push({
        url,
        title: data.title,
        status: 'success',
        data,
        duration: Date.now() - taskStart,
      });
    } catch (error) {
      results.push({
        url,
        title: 'Error',
        status: 'error',
        error: String(error),
        duration: Date.now() - taskStart,
      });
    }
  }

  await browser.close();
  console.log(`Sequential total: ${Date.now() - startTime}ms\n`);

  return results;
}

// Demo
async function main() {
  const testUrls = [
    'https://example.com',
    'https://httpbin.org/html',
    'https://httpbin.org/headers',
    'https://jsonplaceholder.typicode.com',
    'https://httpbin.org/get',
  ];

  console.log('═'.repeat(60));
  console.log('🐝 BROWSER SWARM DEMO');
  console.log('═'.repeat(60));
  console.log('\nThis example shows parallel vs sequential scraping.\n');

  // Parallel swarm processing
  await parallelScrape(testUrls);

  console.log('\n');
}

main().catch(console.error);
