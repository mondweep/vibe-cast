require('dotenv').config();
const nt = require('neural-trader');
const config = require('../config.json');

async function main() {
  console.log('🚀 Starting Neural Trader with Alpaca...\n');

  // Verify environment variables
  console.log('Environment Check:');
  console.log('  ALPACA_API_KEY:', process.env.ALPACA_API_KEY ? '✓ Set' : '✗ Missing');
  console.log('  ALPACA_API_SECRET:', process.env.ALPACA_API_SECRET ? '✓ Set' : '✗ Missing');
  console.log('  ALPACA_API_ENDPOINT:', process.env.ALPACA_API_ENDPOINT || 'Using default');
  console.log('');

  // Test market data fetch
  console.log(`📊 Fetching market data for ${config.trading.symbols[0]} from ${config.trading.provider}...`);

  try {
    const data = await nt.fetchMarketData(
      config.trading.symbols[0],
      '2024-11-01',
      '2024-11-15',  // Recent date range for testing
      config.trading.provider
    );

    console.log(`✅ Successfully fetched ${data.length} data points`);

    if (data.length > 0) {
      console.log('\nSample Data (first entry):');
      console.log('  ', JSON.stringify(data[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error fetching market data:', error.message);
    throw error;
  }
}

main().catch(console.error);
