/**
 * Multi-Strategy Trading System using @neural-trader/e2b-strategies
 * Coordinates multiple strategies with risk management and monitoring
 */

require('dotenv').config();
const { MomentumStrategy } = require('@neural-trader/e2b-strategies/momentum');
const { RiskManager } = require('@neural-trader/e2b-strategies/risk-manager');
const axios = require('axios');

class TradingSystem {
  constructor(config = {}) {
    this.config = config;
    this.strategies = [];
    this.riskManager = null;
    this.running = false;
    this.metrics = {
      trades: 0,
      profits: 0,
      losses: 0,
      totalPnl: 0
    };
  }

  /**
   * Initialize the trading system
   */
  async initialize() {
    console.log('🚀 Initializing Neural Trading System...\n');

    // 1. Initialize Momentum Strategy
    console.log('📈 Setting up Momentum Strategy...');
    this.momentumStrategy = new MomentumStrategy({
      apiKey: process.env.ALPACA_API_KEY,
      secretKey: process.env.ALPACA_API_SECRET,
      symbols: this.config.symbols || ['SPY', 'QQQ', 'AAPL'],
      threshold: this.config.momentumThreshold || 0.02,
      positionSize: this.config.positionSize || 10,

      // Performance optimizations
      cacheEnabled: true,
      cacheTTL: 60,
      batchWindow: 50,

      // Resilience
      circuitBreakerTimeout: 3000,
      maxRetries: 3,

      // Monitoring
      metricsEnabled: true,
      logLevel: 'info',

      port: 3000
    });

    this.strategies.push({
      name: 'Momentum',
      instance: this.momentumStrategy,
      port: 3000
    });

    // 2. Initialize Risk Manager
    console.log('🛡️  Setting up Risk Manager...');
    this.riskManager = new RiskManager({
      apiKey: process.env.ALPACA_API_KEY,
      secretKey: process.env.ALPACA_API_SECRET,

      // Risk parameters
      maxDrawdown: this.config.maxDrawdown || 0.10,        // 10% max portfolio drawdown
      stopLossPerTrade: this.config.stopLoss || 0.02,      // 2% stop per trade
      varConfidence: 0.95,                                  // 95% VaR calculation

      // Monitoring
      metricsEnabled: true,
      logLevel: 'info',

      port: 3003
    });

    // Set up event handlers
    this._setupEventHandlers();

    console.log('\n✅ Trading System initialized successfully!');
  }

  /**
   * Set up event handlers for strategies
   */
  _setupEventHandlers() {
    // Momentum strategy events
    this.momentumStrategy.on('trade', (trade) => {
      console.log(`\n📊 TRADE EXECUTED:`);
      console.log(`   Symbol: ${trade.symbol}`);
      console.log(`   Action: ${trade.action.toUpperCase()}`);
      console.log(`   Quantity: ${trade.quantity}`);
      console.log(`   Price: $${trade.price.toFixed(2)}`);

      this.metrics.trades++;
      if (trade.pnl > 0) {
        this.metrics.profits++;
        this.metrics.totalPnl += trade.pnl;
      } else if (trade.pnl < 0) {
        this.metrics.losses++;
        this.metrics.totalPnl += trade.pnl;
      }
    });

    this.momentumStrategy.on('signal', (signal) => {
      console.log(`\n🔔 TRADING SIGNAL:`);
      console.log(`   Symbol: ${signal.symbol}`);
      console.log(`   Type: ${signal.type}`);
      console.log(`   Strength: ${(signal.strength * 100).toFixed(1)}%`);
    });

    this.momentumStrategy.on('error', (error) => {
      console.error(`\n❌ Momentum Strategy Error:`, error.message);
    });

    // Risk manager events
    this.riskManager.on('alert', (alert) => {
      console.warn(`\n⚠️  RISK ALERT:`);
      console.warn(`   Type: ${alert.type}`);
      console.warn(`   Symbol: ${alert.symbol}`);
      console.warn(`   Message: ${alert.message}`);

      if (alert.type === 'STOP_LOSS') {
        console.log(`   🛑 Auto-closed position: ${alert.symbol}`);
      }
    });

    this.riskManager.on('var_exceeded', (data) => {
      console.warn(`\n⚠️  VALUE AT RISK EXCEEDED:`);
      console.warn(`   Current VaR: $${data.currentVaR.toFixed(2)}`);
      console.warn(`   Threshold: $${data.threshold.toFixed(2)}`);
      console.warn(`   Action: ${data.action}`);
    });
  }

  /**
   * Start the trading system
   */
  async start() {
    if (this.running) {
      console.log('⚠️  Trading system is already running');
      return;
    }

    try {
      console.log('\n🎬 Starting trading strategies...\n');

      // Start all strategies in parallel
      await Promise.all([
        this.momentumStrategy.start(),
        this.riskManager.start()
      ]);

      this.running = true;
      console.log('\n✅ All strategies are running!');
      console.log('\n📊 Monitoring endpoints:');
      console.log('   Momentum Strategy: http://localhost:3000');
      console.log('   Risk Manager: http://localhost:3003');
      console.log('\n💡 Use /health, /ready, /metrics endpoints for monitoring');

    } catch (error) {
      console.error('\n❌ Failed to start trading system:', error.message);
      throw error;
    }
  }

  /**
   * Stop the trading system
   */
  async stop() {
    if (!this.running) {
      console.log('⚠️  Trading system is not running');
      return;
    }

    try {
      console.log('\n🛑 Stopping trading strategies...');

      // Stop all strategies
      await Promise.all([
        this.momentumStrategy.stop(),
        this.riskManager.stop()
      ]);

      this.running = false;
      console.log('✅ All strategies stopped');

      // Display final metrics
      this._displayMetrics();

    } catch (error) {
      console.error('❌ Error stopping trading system:', error.message);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  async getHealth() {
    if (!this.running) {
      return { status: 'stopped', healthy: false };
    }

    try {
      const [momentumHealth, riskHealth] = await Promise.all([
        axios.get('http://localhost:3000/health').catch(() => ({ data: { status: 'unhealthy' } })),
        axios.get('http://localhost:3003/health').catch(() => ({ data: { status: 'unhealthy' } }))
      ]);

      return {
        status: 'running',
        healthy: momentumHealth.data.status === 'healthy' && riskHealth.data.status === 'healthy',
        strategies: {
          momentum: momentumHealth.data,
          risk: riskHealth.data
        }
      };
    } catch (error) {
      return { status: 'error', healthy: false, error: error.message };
    }
  }

  /**
   * Get Prometheus metrics from all strategies
   */
  async getMetrics() {
    if (!this.running) {
      return { error: 'System not running' };
    }

    try {
      const [momentumMetrics, riskMetrics] = await Promise.all([
        axios.get('http://localhost:3000/metrics').catch(() => ({ data: 'N/A' })),
        axios.get('http://localhost:3003/metrics').catch(() => ({ data: 'N/A' }))
      ]);

      return {
        momentum: momentumMetrics.data,
        risk: riskMetrics.data,
        system: this.metrics
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get current positions from momentum strategy
   */
  async getPositions() {
    if (!this.running) {
      return [];
    }

    try {
      const positions = await this.momentumStrategy.getPositions();
      return positions;
    } catch (error) {
      console.error('Error fetching positions:', error.message);
      return [];
    }
  }

  /**
   * Get trading metrics
   */
  getSystemMetrics() {
    return {
      ...this.metrics,
      winRate: this.metrics.trades > 0
        ? (this.metrics.profits / this.metrics.trades * 100).toFixed(2) + '%'
        : '0%',
      avgPnl: this.metrics.trades > 0
        ? (this.metrics.totalPnl / this.metrics.trades).toFixed(2)
        : 0
    };
  }

  /**
   * Display metrics summary
   */
  _displayMetrics() {
    console.log('\n📈 TRADING SYSTEM METRICS:');
    console.log('═'.repeat(50));
    console.log(`Total Trades: ${this.metrics.trades}`);
    console.log(`Winning Trades: ${this.metrics.profits}`);
    console.log(`Losing Trades: ${this.metrics.losses}`);
    const winRate = this.metrics.trades > 0
      ? (this.metrics.profits / this.metrics.trades * 100).toFixed(2)
      : 0;
    console.log(`Win Rate: ${winRate}%`);
    console.log(`Total P&L: $${this.metrics.totalPnl.toFixed(2)}`);
    console.log('═'.repeat(50));
  }

  /**
   * Check if system is running
   */
  isRunning() {
    return this.running;
  }
}

module.exports = TradingSystem;
