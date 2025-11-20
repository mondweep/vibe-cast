/**
 * Enhanced Broker Client using @neural-trader/brokers
 * Provides unified interface to Alpaca with advanced order management
 */

require('dotenv').config();
const { BrokerClient } = require('@neural-trader/brokers');

class EnhancedBrokerClient {
  constructor(config = {}) {
    this.client = new BrokerClient({
      brokerType: 'alpaca',
      apiKey: process.env.ALPACA_API_KEY,
      apiSecret: process.env.ALPACA_API_SECRET,
      baseUrl: process.env.ALPACA_API_ENDPOINT || 'https://paper-api.alpaca.markets',
      paperTrading: true,
      websocketEnabled: config.websocketEnabled !== false,
      timeout: config.timeout || 30000,
      ...config
    });

    this.connected = false;
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Connect to broker with retry logic
   */
  async connect() {
    if (this.connected) {
      console.log('✅ Already connected to broker');
      return true;
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Connecting to Alpaca... (attempt ${attempt}/${this.maxRetries})`);
        await this.client.connect();
        this.connected = true;
        console.log('✅ Successfully connected to Alpaca Paper Trading');
        return true;
      } catch (error) {
        console.error(`❌ Connection attempt ${attempt} failed:`, error.message);

        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw new Error(`Failed to connect after ${this.maxRetries} attempts`);
        }
      }
    }
  }

  /**
   * Get account balance and equity
   */
  async getAccountBalance() {
    if (!this.connected) await this.connect();

    try {
      const balance = await this.client.getAccountBalance();
      return {
        cash: parseFloat(balance.cash),
        equity: parseFloat(balance.equity),
        buyingPower: parseFloat(balance.buyingPower),
        currency: balance.currency || 'USD'
      };
    } catch (error) {
      console.error('Error fetching account balance:', error.message);
      throw error;
    }
  }

  /**
   * Get all open positions
   */
  async getPositions() {
    if (!this.connected) await this.connect();

    try {
      const positions = await this.client.getPositions();
      return positions.map(pos => ({
        symbol: pos.symbol,
        quantity: parseFloat(pos.quantity),
        avgEntryPrice: parseFloat(pos.avgEntryPrice),
        currentPrice: parseFloat(pos.currentPrice),
        marketValue: parseFloat(pos.marketValue),
        unrealizedPnl: parseFloat(pos.unrealizedPnl),
        unrealizedPnlPct: parseFloat(pos.unrealizedPnlPct)
      }));
    } catch (error) {
      console.error('Error fetching positions:', error.message);
      return [];
    }
  }

  /**
   * Place a market order with retry logic
   */
  async placeMarketOrder(symbol, side, quantity) {
    if (!this.connected) await this.connect();

    const order = {
      symbol,
      side,
      orderType: 'market',
      quantity,
      timeInForce: 'day'
    };

    return await this._placeOrderWithRetry(order);
  }

  /**
   * Place a limit order
   */
  async placeLimitOrder(symbol, side, quantity, limitPrice) {
    if (!this.connected) await this.connect();

    const order = {
      symbol,
      side,
      orderType: 'limit',
      quantity,
      limitPrice,
      timeInForce: 'gtc' // Good till canceled
    };

    return await this._placeOrderWithRetry(order);
  }

  /**
   * Place a stop-loss order
   */
  async placeStopLoss(symbol, quantity, stopPrice) {
    if (!this.connected) await this.connect();

    const order = {
      symbol,
      side: 'sell',
      orderType: 'stop',
      quantity,
      stopPrice,
      timeInForce: 'day'
    };

    return await this._placeOrderWithRetry(order);
  }

  /**
   * Get real-time quote for a symbol
   */
  async getQuote(symbol) {
    if (!this.connected) await this.connect();

    try {
      const quote = await this.client.getQuote(symbol);
      return {
        symbol,
        bid: parseFloat(quote.bid),
        ask: parseFloat(quote.ask),
        last: parseFloat(quote.last),
        timestamp: quote.timestamp
      };
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Cancel all orders for a symbol (or all if no symbol specified)
   */
  async cancelAllOrders(symbol = null) {
    if (!this.connected) await this.connect();

    try {
      const count = await this.client.cancelAllOrders(symbol);
      console.log(`✅ Canceled ${count} orders${symbol ? ` for ${symbol}` : ''}`);
      return count;
    } catch (error) {
      console.error('Error canceling orders:', error.message);
      throw error;
    }
  }

  /**
   * Internal: Place order with retry logic
   */
  async _placeOrderWithRetry(order) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client.placeOrder(order);
        console.log(`✅ Order placed: ${response.orderId} - ${order.side.toUpperCase()} ${order.quantity} ${order.symbol} @ ${order.orderType}`);
        return {
          orderId: response.orderId,
          status: response.status,
          filledQuantity: parseFloat(response.filledQuantity || 0),
          filledPrice: parseFloat(response.filledPrice || 0),
          timestamp: response.timestamp
        };
      } catch (error) {
        console.error(`❌ Order placement attempt ${attempt} failed:`, error.message);

        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 500; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw new Error(`Failed to place order after ${this.maxRetries} attempts: ${error.message}`);
        }
      }
    }
  }

  /**
   * Disconnect from broker
   */
  async disconnect() {
    if (this.connected) {
      await this.client.disconnect();
      this.connected = false;
      console.log('👋 Disconnected from broker');
    }
  }

  /**
   * Get connection status
   */
  isConnected() {
    return this.connected;
  }
}

module.exports = EnhancedBrokerClient;
