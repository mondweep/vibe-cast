/**
 * Example 1: Basic Browser Navigation
 * 
 * Demonstrates:
 * - Creating a browser service
 * - Opening URLs
 * - Taking snapshots with element refs
 * - Basic trajectory tracking
 */

import { createBrowserService } from '@claude-flow/browser';

async function basicNavigation() {
  console.log('🌐 Starting Basic Navigation Example...\n');

  // Create browser service with security and memory enabled
  const browser = createBrowserService({
    sessionId: 'basic-demo',
    enableSecurity: true,
    enableMemory: true,
  });

  try {
    // Start tracking this interaction pattern
    browser.startTrajectory('Basic navigation demo');

    // Navigate to a website
    console.log('📍 Opening https://example.com...');
    await browser.open('https://example.com');

    // Get an AI-optimized snapshot
    // This returns element refs (@e1, @e2, etc.) instead of full DOM
    console.log('📸 Taking snapshot...');
    const snapshot = await browser.snapshot({ interactive: true });

    console.log('\n✅ Snapshot received!');
    console.log('   Element refs available:', Object.keys(snapshot.elements || {}).length);
    console.log('   Page title:', snapshot.title || 'N/A');
    console.log('   Current URL:', snapshot.url || 'N/A');

    // Mark trajectory as successful
    await browser.endTrajectory(true, 'Navigation completed successfully');

    console.log('\n🎯 Trajectory saved for future learning!');

  } catch (error) {
    console.error('❌ Error:', error);
    await browser.endTrajectory(false, `Failed: ${error}`);
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed.');
  }
}

// Run the example
basicNavigation().catch(console.error);
