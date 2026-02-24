/**
 * Integration Test Suite for Fiat 500 Tracker ↔ OpenClaw
 * Run: npx ts-node test-integration.ts
 */

import { Fiat500Client } from './client';
import { WebhookHandler } from './webhook-handler';
import { MessageRouter } from './message-router';

async function runTests() {
  console.log('🧪 Fiat 500 Tracker Integration Tests\n');

  const client = new Fiat500Client();
  const webhookHandler = new WebhookHandler(client);
  const messageRouter = new MessageRouter(client);

  let passed = 0;
  let failed = 0;

  // Test 1: Health check
  console.log('[1/5] Testing API health...');
  try {
    const health = await client.health();
    if (health.status === 'ok') {
      console.log('✅ API is healthy\n');
      passed++;
    } else {
      console.log('❌ API health check failed\n');
      failed++;
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}\n`);
    failed++;
  }

  // Test 2: Get config
  console.log('[2/5] Testing config retrieval...');
  try {
    const config = await client.getConfig();
    if (config.postcode && config.budget_min !== undefined) {
      console.log(`✅ Config loaded: ${config.postcode}, budget £${config.budget_min / 100}-${config.budget_max / 100}\n`);
      passed++;
    } else {
      console.log('❌ Config incomplete\n');
      failed++;
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}\n`);
    failed++;
  }

  // Test 3: Get shortlist
  console.log('[3/5] Testing shortlist retrieval...');
  try {
    const shortlist = await client.getShortlist();
    if (Array.isArray(shortlist)) {
      console.log(`✅ Shortlist loaded: ${shortlist.length} cars\n`);
      passed++;
    } else {
      console.log('❌ Shortlist not an array\n');
      failed++;
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}\n`);
    failed++;
  }

  // Test 4: Message router - help command
  console.log('[4/5] Testing message router (/tracker help)...');
  try {
    const response = await messageRouter.route('/tracker help');
    if (response.success && response.message.includes('shortlist')) {
      console.log('✅ Help command works\n');
      passed++;
    } else {
      console.log('❌ Help command failed\n');
      failed++;
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}\n`);
    failed++;
  }

  // Test 5: Webhook parsing
  console.log('[5/5] Testing webhook event parsing...');
  try {
    const mockEvent = {
      event: 'new_shortlist_entry',
      timestamp: new Date().toISOString(),
      data: {
        listing: {
          id: 'test-123',
          title: '2023 Fiat 500 1.2',
          price: 799999,
          mileage: 15000,
          year: 2023,
          engine_size: '1.2L',
          location: 'London',
          distance_miles: 2.5,
          composite_score: 89,
          insurance_estimate: 135000,
          url: 'https://example.com/listing/123',
          platform: 'AutoTrader',
          image_urls: ['https://example.com/image.jpg'],
        },
      },
    };

    const formatted = await webhookHandler.handleEvent(mockEvent);
    if (formatted.emoji === '🚗' && formatted.message.includes('2023 Fiat 500')) {
      console.log('✅ Webhook parsing works\n');
      passed++;
    } else {
      console.log('❌ Webhook parsing failed\n');
      failed++;
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}\n`);
    failed++;
  }

  // Summary
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('✅ All tests passed! Integration ready for deployment.\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Check logs above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((err) => {
  console.error('🔥 Test suite error:', err);
  process.exit(1);
});
