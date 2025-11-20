/**
 * Enhanced Neural Trading System - Main Entry Point
 * Combines @neural-trader/brokers + @neural-trader/e2b-strategies
 */

require('dotenv').config();
const EnhancedBrokerClient = require('./enhanced-broker');
const TradingSystem = require('./trading-system');

class NeuralTradingApp {
  constructor() {
    this.broker = null;
    this.tradingSystem = null;
  }

  /**
   * Initialize and start the complete trading system
   */
  async start() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║   NEURAL TRADING SYSTEM - ENHANCED VERSION         ║');
    console.log('║   Powered by @neural-trader/brokers +             ║');
    console.log('║   @neural-trader/e2b-strategies                    ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    try {
      // Step 1: Initialize Enhanced Broker
      console.log('🔧 Step 1: Initializing Enhanced Broker Client...');
      this.broker = new EnhancedBrokerClient({
        websocketEnabled: true,
        maxRetries: 3,
        timeout: 30000
      });

      await this.broker.connect();

      // Step 2: Display Account Info
      console.log('\n💰 Step 2: Fetching Account Information...');
      const balance = await this.broker.getAccountBalance();
      console.log(`   Cash: $${balance.cash.toFixed(2)}`);
      console.log(`   Equity: $${balance.equity.toFixed(2)}`);
      console.log(`   Buying Power: $${balance.buyingPower.toFixed(2)}`);

      // Step 3: Check Existing Positions
      console.log('\n📊 Step 3: Checking Existing Positions...');
      const positions = await this.broker.getPositions();
      if (positions.length > 0) {
        positions.forEach(pos => {
          const pnlSign = pos.unrealizedPnl >= 0 ? '+' : '';
          console.log(`   ${pos.symbol}: ${pos.quantity} shares @ $${pos.avgEntryPrice.toFixed(2)}`);
          console.log(`      Current: $${pos.currentPrice.toFixed(2)} | P&L: ${pnlSign}$${pos.unrealizedPnl.toFixed(2)} (${pnlSign}${pos.unrealizedPnlPct.toFixed(2)}%)`);
        });
      } else {
        console.log('   No open positions');
      }

      // Step 4: Initialize Trading System
      console.log('\n⚙️  Step 4: Initializing Multi-Strategy Trading System...');
      this.tradingSystem = new TradingSystem({
        symbols: ['SPY', 'QQQ', 'AAPL'],
        momentumThreshold: 0.02,  // 2% momentum threshold
        positionSize: 10,         // 10 shares per trade
        maxDrawdown: 0.10,        // 10% max portfolio drawdown
        stopLoss: 0.02            // 2% stop loss per trade
      });

      await this.tradingSystem.initialize();

      // Step 5: Start Trading
      console.log('\n🎯 Step 5: Starting Trading Strategies...');
      await this.tradingSystem.start();

      // Step 6: Monitor System
      console.log('\n🔍 Step 6: Starting System Monitoring...');
      this._startMonitoring();

      // Setup graceful shutdown
      this._setupShutdown();

      console.log('\n✅ Neural Trading System is fully operational!');
      console.log('━'.repeat(60));

    } catch (error) {
      console.error('\n❌ Failed to start trading system:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Start periodic system monitoring
   */
  _startMonitoring() {
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.tradingSystem.getHealth();

        if (!health.healthy) {
          console.warn('\n⚠️  SYSTEM HEALTH WARNING:');
          console.warn('   One or more strategies are unhealthy');
          console.warn('   Status:', JSON.stringify(health, null, 2));
        }
      } catch (error) {
        console.error('Error checking system health:', error.message);
      }
    }, 30000);

    // Display metrics every 5 minutes
    this.metricsInterval = setInterval(async () => {
      console.log('\n' + '═'.repeat(60));
      console.log('📊 PERIODIC METRICS UPDATE');
      console.log('═'.repeat(60));

      try {
        // System metrics
        const systemMetrics = this.tradingSystem.getSystemMetrics();
        console.log('\n💹 Trading Performance:');
        console.log(`   Total Trades: ${systemMetrics.trades}`);
        console.log(`   Win Rate: ${systemMetrics.winRate}`);
        console.log(`   Total P&L: $${systemMetrics.totalPnl.toFixed(2)}`);
        console.log(`   Avg P&L per Trade: $${systemMetrics.avgPnl}`);

        // Account balance
        const balance = await this.broker.getAccountBalance();
        console.log('\n💰 Account Status:');
        console.log(`   Equity: $${balance.equity.toFixed(2)}`);
        console.log(`   Cash: $${balance.cash.toFixed(2)}`);

        // Positions
        const positions = await this.broker.getPositions();
        if (positions.length > 0) {
          console.log('\n📈 Current Positions:');
          positions.forEach(pos => {
            const pnlSign = pos.unrealizedPnl >= 0 ? '+' : '';
            console.log(`   ${pos.symbol}: ${pos.quantity} @ $${pos.currentPrice.toFixed(2)} | P&L: ${pnlSign}$${pos.unrealizedPnl.toFixed(2)}`);
          });
        }

        console.log('═'.repeat(60) + '\n');

      } catch (error) {
        console.error('Error fetching metrics:', error.message);
      }
    }, 300000); // 5 minutes

    console.log('   ✓ Health checks every 30 seconds');
    console.log('   ✓ Metrics updates every 5 minutes');
  }

  /**
   * Setup graceful shutdown handlers
   */
  _setupShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n\n📥 Received ${signal} signal. Shutting down gracefully...`);

      // Clear monitoring intervals
      if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
      if (this.metricsInterval) clearInterval(this.metricsInterval);

      try {
        // Stop trading system
        if (this.tradingSystem && this.tradingSystem.isRunning()) {
          await this.tradingSystem.stop();
        }

        // Disconnect broker
        if (this.broker && this.broker.isConnected()) {
          await this.broker.disconnect();
        }

        console.log('\n✅ Shutdown completed successfully');
        process.exit(0);

      } catch (error) {
        console.error('\n❌ Error during shutdown:', error.message);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle unhandled errors
    process.on('unhandledRejection', (reason, promise) => {
      console.error('\n❌ Unhandled Promise Rejection:', reason);
      shutdown('unhandledRejection');
    });

    process.on('uncaughtException', (error) => {
      console.error('\n❌ Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
  }

  /**
   * Manual shutdown method
   */
  async stop() {
    console.log('\n🛑 Manually stopping trading system...');

    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.metricsInterval) clearInterval(this.metricsInterval);

    if (this.tradingSystem) {
      await this.tradingSystem.stop();
    }

    if (this.broker) {
      await this.broker.disconnect();
    }

    console.log('✅ Trading system stopped');
  }
}

// Auto-start if run directly
if (require.main === module) {
  const app = new NeuralTradingApp();
  app.start().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = NeuralTradingApp;
