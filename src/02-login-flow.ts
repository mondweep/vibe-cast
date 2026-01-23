/**
 * Example 2: Login Flow Automation
 * 
 * Demonstrates:
 * - Form filling with element refs
 * - Click actions
 * - Waiting for page state changes
 * - Error handling
 */

import { createBrowserService } from '@claude-flow/browser';

interface LoginConfig {
  url: string;
  email: string;
  password: string;
  // Element refs - these would come from a snapshot in real usage
  emailSelector: string;
  passwordSelector: string;
  submitSelector: string;
  successSelector: string;
}

async function loginFlow(config: LoginConfig) {
  console.log('🔐 Starting Login Flow Example...\n');

  const browser = createBrowserService({
    sessionId: 'login-demo',
    enableSecurity: true,
    enableMemory: true,
  });

  try {
    browser.startTrajectory('Login to application');

    // Step 1: Navigate to login page
    console.log(`📍 Opening ${config.url}...`);
    await browser.open(config.url);

    // Step 2: Get snapshot to identify form elements
    console.log('📸 Analyzing login form...');
    const snapshot = await browser.snapshot({ interactive: true });
    
    // In real usage, you'd use the element refs from the snapshot
    // e.g., @e1 for email, @e2 for password, @e3 for submit
    console.log('   Found interactive elements:', 
      Object.keys(snapshot.elements || {}).slice(0, 5).join(', '));

    // Step 3: Fill in credentials
    console.log('✏️  Filling email...');
    await browser.fill(config.emailSelector, config.email);

    console.log('✏️  Filling password...');
    await browser.fill(config.passwordSelector, config.password);

    // Step 4: Submit the form
    console.log('🖱️  Clicking submit...');
    await browser.click(config.submitSelector);

    // Step 5: Wait for successful login
    console.log('⏳ Waiting for dashboard...');
    await browser.wait({ 
      selector: config.successSelector,
      timeout: 10000 
    });

    console.log('\n✅ Login successful!');
    
    // Save this pattern for future use
    await browser.endTrajectory(true, 'Login completed successfully');

    // Return the post-login snapshot
    return await browser.snapshot({ interactive: true });

  } catch (error) {
    console.error('❌ Login failed:', error);
    await browser.endTrajectory(false, `Login failed: ${error}`);
    throw error;
  } finally {
    await browser.close();
    console.log('👋 Browser closed.');
  }
}

// Demo with a test site (httpbin provides form testing)
async function main() {
  // Example configuration - replace with real values
  const config: LoginConfig = {
    url: 'https://httpbin.org/forms/post',  // Test form endpoint
    email: 'demo@example.com',
    password: 'demo-password',
    // In real usage, these come from snapshot element refs
    emailSelector: '@e1',  // or '#email', 'input[name="email"]'
    passwordSelector: '@e2',
    submitSelector: '@e3',
    successSelector: '.dashboard',
  };

  console.log('ℹ️  This is a demo - using httpbin.org test form\n');
  console.log('   In real usage, replace with your target site\n');
  
  try {
    await loginFlow(config);
  } catch (error) {
    console.log('\n💡 Tip: This demo uses a test form that may not have');
    console.log('   all expected elements. In production, use actual');
    console.log('   element refs from browser.snapshot()');
  }
}

main().catch(console.error);
