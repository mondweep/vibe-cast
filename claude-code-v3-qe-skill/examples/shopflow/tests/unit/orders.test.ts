/**
 * Orders Domain Tests (TDD)
 *
 * Tests for Order aggregate and state machine
 */

import { describe, it, expect } from 'vitest';
import {
  createOrder,
  createOrderItem,
  generateOrderNumber,
  markOrderPaid,
  markOrderShipped,
  markOrderDelivered,
  cancelOrder,
  canTransitionTo,
  canCancel,
  canRefund,
  getOrderStatusLabel,
  type Order,
  type OrderStatus,
} from '../../src/domains/orders/types';

describe('Orders Domain', () => {
  const mockAddress = {
    fullName: 'John Doe',
    line1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
  };

  const mockTotals = {
    subtotal: { amount: 5000, currency: 'USD' as const },
    shipping: { amount: 500, currency: 'USD' as const },
    tax: { amount: 450, currency: 'USD' as const },
    discount: { amount: 0, currency: 'USD' as const },
    total: { amount: 5950, currency: 'USD' as const },
  };

  describe('generateOrderNumber', () => {
    it('should_generate_order_number_with_year_prefix', () => {
      const orderNumber = generateOrderNumber();
      const year = new Date().getFullYear();

      expect(orderNumber).toMatch(new RegExp(`^ORD-${year}-\\d{6}$`));
    });

    it('should_generate_sequential_order_numbers', () => {
      const order1 = generateOrderNumber();
      const order2 = generateOrderNumber();

      expect(order1).not.toBe(order2);
    });
  });

  describe('createOrderItem', () => {
    it('should_calculate_subtotal_correctly', () => {
      const item = createOrderItem(
        'prod-123',
        'Test Product',
        'https://example.com/image.jpg',
        { amount: 1999, currency: 'USD' },
        3
      );

      expect(item.subtotal.amount).toBe(5997); // 1999 * 3
    });
  });

  describe('createOrder', () => {
    it('should_create_order_with_pending_status', () => {
      const items = [
        createOrderItem('prod-1', 'Product 1', 'url1', { amount: 2500, currency: 'USD' }, 2),
      ];

      const order = createOrder('user-123', items, mockAddress, mockTotals);

      expect(order.status).toBe('pending');
      expect(order.userId).toBe('user-123');
      expect(order.items).toHaveLength(1);
      expect(order.paidAt).toBeNull();
      expect(order.shippedAt).toBeNull();
    });

    it('should_generate_unique_order_number', () => {
      const items = [createOrderItem('prod-1', 'P1', 'url', { amount: 100, currency: 'USD' }, 1)];

      const order1 = createOrder('user-1', items, mockAddress, mockTotals);
      const order2 = createOrder('user-2', items, mockAddress, mockTotals);

      expect(order1.orderNumber).not.toBe(order2.orderNumber);
    });
  });

  describe('Order State Machine', () => {
    describe('canTransitionTo', () => {
      const validTransitions: [OrderStatus, OrderStatus][] = [
        ['pending', 'paid'],
        ['pending', 'cancelled'],
        ['paid', 'processing'],
        ['paid', 'cancelled'],
        ['paid', 'refunded'],
        ['processing', 'shipped'],
        ['processing', 'cancelled'],
        ['shipped', 'delivered'],
        ['delivered', 'refunded'],
      ];

      const invalidTransitions: [OrderStatus, OrderStatus][] = [
        ['pending', 'shipped'],
        ['pending', 'delivered'],
        ['cancelled', 'paid'],
        ['refunded', 'shipped'],
        ['delivered', 'pending'],
      ];

      it.each(validTransitions)(
        'should_allow_transition_from_%s_to_%s',
        (from, to) => {
          expect(canTransitionTo(from, to)).toBe(true);
        }
      );

      it.each(invalidTransitions)(
        'should_not_allow_transition_from_%s_to_%s',
        (from, to) => {
          expect(canTransitionTo(from, to)).toBe(false);
        }
      );
    });

    describe('markOrderPaid', () => {
      it('should_transition_pending_order_to_paid', () => {
        const items = [createOrderItem('p1', 'Product', 'url', { amount: 100, currency: 'USD' }, 1)];
        const order = createOrder('user-1', items, mockAddress, mockTotals);

        const paidOrder = markOrderPaid(order, 'pi_123456');

        expect(paidOrder.status).toBe('paid');
        expect(paidOrder.stripePaymentIntentId).toBe('pi_123456');
        expect(paidOrder.paidAt).toBeInstanceOf(Date);
      });

      it('should_throw_when_order_already_shipped', () => {
        const items = [createOrderItem('p1', 'Product', 'url', { amount: 100, currency: 'USD' }, 1)];
        let order = createOrder('user-1', items, mockAddress, mockTotals);
        order = markOrderPaid(order, 'pi_123');
        order = { ...order, status: 'shipped', shippedAt: new Date() };

        expect(() => markOrderPaid(order, 'pi_456')).toThrow();
      });
    });

    describe('markOrderShipped', () => {
      it('should_transition_processing_order_to_shipped', () => {
        const items = [createOrderItem('p1', 'Product', 'url', { amount: 100, currency: 'USD' }, 1)];
        let order = createOrder('user-1', items, mockAddress, mockTotals);
        order = markOrderPaid(order, 'pi_123');
        order = { ...order, status: 'processing' };

        const shippedOrder = markOrderShipped(order, 'TRK123456', 'https://track.example.com/TRK123456');

        expect(shippedOrder.status).toBe('shipped');
        expect(shippedOrder.trackingNumber).toBe('TRK123456');
        expect(shippedOrder.trackingUrl).toBe('https://track.example.com/TRK123456');
        expect(shippedOrder.shippedAt).toBeInstanceOf(Date);
      });

      it('should_throw_when_order_pending', () => {
        const items = [createOrderItem('p1', 'Product', 'url', { amount: 100, currency: 'USD' }, 1)];
        const order = createOrder('user-1', items, mockAddress, mockTotals);

        expect(() => markOrderShipped(order, 'TRK123')).toThrow();
      });
    });

    describe('markOrderDelivered', () => {
      it('should_transition_shipped_order_to_delivered', () => {
        const items = [createOrderItem('p1', 'Product', 'url', { amount: 100, currency: 'USD' }, 1)];
        let order = createOrder('user-1', items, mockAddress, mockTotals);
        order = { ...order, status: 'shipped', shippedAt: new Date() };

        const deliveredOrder = markOrderDelivered(order);

        expect(deliveredOrder.status).toBe('delivered');
        expect(deliveredOrder.deliveredAt).toBeInstanceOf(Date);
      });
    });

    describe('cancelOrder', () => {
      it('should_cancel_pending_order', () => {
        const items = [createOrderItem('p1', 'Product', 'url', { amount: 100, currency: 'USD' }, 1)];
        const order = createOrder('user-1', items, mockAddress, mockTotals);

        const cancelledOrder = cancelOrder(order, 'Customer request');

        expect(cancelledOrder.status).toBe('cancelled');
        expect(cancelledOrder.cancelledAt).toBeInstanceOf(Date);
      });

      it('should_throw_when_cancelling_delivered_order', () => {
        const items = [createOrderItem('p1', 'Product', 'url', { amount: 100, currency: 'USD' }, 1)];
        let order = createOrder('user-1', items, mockAddress, mockTotals);
        order = { ...order, status: 'delivered', deliveredAt: new Date() };

        expect(() => cancelOrder(order, 'Too late')).toThrow();
      });
    });
  });

  describe('Query helpers', () => {
    describe('getOrderStatusLabel', () => {
      it('should_return_human_readable_labels', () => {
        expect(getOrderStatusLabel('pending')).toBe('Awaiting Payment');
        expect(getOrderStatusLabel('paid')).toBe('Payment Confirmed');
        expect(getOrderStatusLabel('shipped')).toBe('Shipped');
        expect(getOrderStatusLabel('delivered')).toBe('Delivered');
      });
    });

    describe('canCancel', () => {
      it('should_return_true_for_pending_orders', () => {
        const items = [createOrderItem('p1', 'P', 'url', { amount: 100, currency: 'USD' }, 1)];
        const order = createOrder('user-1', items, mockAddress, mockTotals);

        expect(canCancel(order)).toBe(true);
      });

      it('should_return_false_for_delivered_orders', () => {
        const items = [createOrderItem('p1', 'P', 'url', { amount: 100, currency: 'USD' }, 1)];
        let order = createOrder('user-1', items, mockAddress, mockTotals);
        order = { ...order, status: 'delivered' };

        expect(canCancel(order)).toBe(false);
      });
    });

    describe('canRefund', () => {
      it('should_return_true_for_delivered_orders', () => {
        const items = [createOrderItem('p1', 'P', 'url', { amount: 100, currency: 'USD' }, 1)];
        let order = createOrder('user-1', items, mockAddress, mockTotals);
        order = { ...order, status: 'delivered' };

        expect(canRefund(order)).toBe(true);
      });

      it('should_return_false_for_pending_orders', () => {
        const items = [createOrderItem('p1', 'P', 'url', { amount: 100, currency: 'USD' }, 1)];
        const order = createOrder('user-1', items, mockAddress, mockTotals);

        expect(canRefund(order)).toBe(false);
      });
    });
  });
});
