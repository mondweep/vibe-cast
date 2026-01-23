/**
 * Example 5: Form Automation with Security
 * 
 * Demonstrates:
 * - Filling various form field types
 * - Handling dropdowns and checkboxes
 * - PII detection and security scanning
 * - Form submission with validation
 */

import { createBrowserService } from '@claude-flow/browser';

interface FormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
  category?: string;
  subscribe?: boolean;
}

async function automateForm(url: string, formData: FormData) {
  console.log('📝 Starting Form Automation Example...\n');

  const browser = createBrowserService({
    sessionId: 'form-demo',
    enableSecurity: true,  // Will scan for PII in submissions
    enableMemory: true,
    // Optional: restrict to specific domains
    allowedDomains: ['httpbin.org', 'example.com'],
  });

  try {
    browser.startTrajectory('Form submission automation');

    // Navigate to form page
    console.log(`📍 Opening ${url}...`);
    await browser.open(url);

    // Get interactive snapshot to identify form elements
    console.log('📸 Analyzing form structure...');
    const snapshot = await browser.snapshot({ interactive: true });

    // Display discovered elements
    const elements = snapshot.elements || {};
    const elementCount = Object.keys(elements).length;
    console.log(`   Found ${elementCount} interactive elements\n`);

    // In real usage, you'd map snapshot elements to your form fields
    // The snapshot returns refs like @e1, @e2 for each interactive element

    console.log('📋 Form data to submit:');
    console.log('   Name:', formData.name);
    console.log('   Email:', formData.email);
    console.log('   Message:', formData.message.substring(0, 50) + '...');
    console.log('');

    // Fill form fields using element refs or selectors
    // Method 1: Using element refs from snapshot (preferred for AI)
    console.log('✏️  Filling form fields...');

    // These selectors are examples - in real usage, use element refs
    const fieldMappings = [
      { ref: '@e1', value: formData.name, label: 'Name' },
      { ref: '@e2', value: formData.email, label: 'Email' },
      { ref: '@e3', value: formData.message, label: 'Message' },
    ];

    for (const field of fieldMappings) {
      try {
        await browser.fill(field.ref, field.value);
        console.log(`   ✓ Filled ${field.label}`);
      } catch (error) {
        console.log(`   ⚠️  Could not fill ${field.label}: ${error}`);
      }
    }

    // Handle dropdown if present
    if (formData.category) {
      try {
        console.log('   ✓ Selecting category...');
        await browser.select('@e4', formData.category);
      } catch {
        console.log('   ⚠️  No dropdown found');
      }
    }

    // Handle checkbox if present
    if (formData.subscribe) {
      try {
        console.log('   ✓ Checking subscribe box...');
        await browser.click('@e5'); // Checkbox toggle
      } catch {
        console.log('   ⚠️  No checkbox found');
      }
    }

    // Take screenshot before submission (for verification)
    console.log('\n📸 Capturing pre-submit state...');
    const preSubmitSnapshot = await browser.snapshot({ fullPage: true });

    // Submit the form
    console.log('🚀 Submitting form...');
    try {
      await browser.click('@submit'); // or find submit button ref
    } catch {
      // Try common submit patterns
      await browser.evaluate(`
        const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], button:contains("Submit")');
        if (submitBtn) submitBtn.click();
      `);
    }

    // Wait for response/redirect
    console.log('⏳ Waiting for response...');
    await browser.wait({ timeout: 5000 });

    // Check submission result
    const resultSnapshot = await browser.snapshot({ interactive: true });
    console.log('\n✅ Form submitted!');
    console.log('   New URL:', resultSnapshot.url);

    await browser.endTrajectory(true, 'Form submitted successfully');

    return {
      success: true,
      preSubmitSnapshot,
      resultSnapshot,
    };

  } catch (error) {
    console.error('❌ Form automation failed:', error);
    await browser.endTrajectory(false, `Failed: ${error}`);
    throw error;
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed.');
  }
}

// Demo using httpbin's form endpoint
async function main() {
  console.log('═'.repeat(60));
  console.log('📝 FORM AUTOMATION DEMO');
  console.log('═'.repeat(60));
  console.log('\nThis example demonstrates intelligent form filling.\n');

  const formData: FormData = {
    name: 'Demo User',
    email: 'demo@example.com',
    phone: '+1-555-0123',
    message: 'This is an automated form submission test using @claude-flow/browser. The system supports trajectory learning to remember successful form patterns.',
    category: 'general',
    subscribe: true,
  };

  try {
    // httpbin provides a test form endpoint
    await automateForm('https://httpbin.org/forms/post', formData);
  } catch (error) {
    console.log('\n💡 Note: httpbin form may not match expected selectors.');
    console.log('   In real usage, analyze the snapshot first to get');
    console.log('   accurate element refs for your target form.');
  }
}

main().catch(console.error);
