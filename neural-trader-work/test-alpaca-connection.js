// Test Alpaca Paper Trading Connection
// Run with: node test-alpaca-connection.js

require('dotenv').config();

async function testAlpacaConnection() {
  try {
    console.log('🔍 Testing Alpaca Paper Trading Connection...\n');

    // Display configuration (without exposing full secrets)
    console.log('Configuration:');
    console.log('  API Key:', process.env.ALPACA_API_KEY ? `${process.env.ALPACA_API_KEY.substring(0, 8)}...` : 'NOT SET');
    console.log('  API Secret:', process.env.ALPACA_API_SECRET ? 'SET (hidden)' : 'NOT SET');
    console.log('  Endpoint:', process.env.ALPACA_API_ENDPOINT || 'NOT SET');
    console.log('');

    // Import neural-trader functions
    const { validateBrokerConfig, getPortfolioStatus } = require('neural-trader');

    // Create broker configuration
    const brokerConfig = {
      brokerType: 'alpaca',
      apiKey: process.env.ALPACA_API_KEY,
      apiSecret: process.env.ALPACA_API_SECRET,
      paperTrading: true
    };

    console.log('📡 Validating Alpaca broker configuration...');
    const validation = await validateBrokerConfig(brokerConfig);

    if (validation.valid) {
      console.log('✅ Broker configuration is valid!\n');
    } else {
      console.log('❌ Broker configuration is invalid');
      console.log('Errors:', validation.errors);
      process.exit(1);
    }

    // Get portfolio status
    console.log('📊 Fetching portfolio status...');
    try {
      const portfolio = await getPortfolioStatus(brokerConfig);

      console.log('\nPortfolio Summary:');
      console.log('  Total Value:', portfolio.totalValue ? `$${parseFloat(portfolio.totalValue).toFixed(2)}` : 'N/A');
      console.log('  Cash:', portfolio.cash ? `$${parseFloat(portfolio.cash).toFixed(2)}` : 'N/A');
      console.log('  Positions:', portfolio.positions ? portfolio.positions.length : 0);
    } catch (err) {
      console.log('  Note: Could not fetch portfolio details (may require additional setup)');
      console.log('  Error:', err.message);
    }

    console.log('\n✨ Connection test completed successfully!');

  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testAlpacaConnection();
