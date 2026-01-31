/**
 * Orders Domain - Bounded Context (Core Domain)
 *
 * Aggregate: Order
 * Entities: OrderItem, ShippingAddress
 * Value Objects: OrderStatus, OrderTotals
 */

import { z } from 'zod';
import { MoneySchema, type Money } from '../catalog/types';

// Value Objects
export const OrderStatusSchema = z.enum([
  'pending',        // Order created, awaiting payment
  'paid',           // Payment confirmed
  'processing',     // Being prepared
  'shipped',        // In transit
  'delivered',      // Delivered to customer
  'cancelled',      // Cancelled by user or system
  'refunded',       // Money returned
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const ShippingAddressSchema = z.object({
  fullName: z.string().min(1).max(100),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2), // ISO 3166-1 alpha-2
  phone: z.string().optional(),
});
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;

// Entity: OrderItem
export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  productImage: z.string().url(),
  unitPrice: MoneySchema,
  quantity: z.number().int().min(1),
  subtotal: MoneySchema,
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

// Value Object: Order Totals
export const OrderTotalsSchema = z.object({
  subtotal: MoneySchema,
  shipping: MoneySchema,
  tax: MoneySchema,
  discount: MoneySchema,
  total: MoneySchema,
});
export type OrderTotals = z.infer<typeof OrderTotalsSchema>;

// Aggregate Root: Order
export const OrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(), // Human-readable: ORD-2024-001234
  userId: z.string().uuid(),
  status: OrderStatusSchema,
  items: z.array(OrderItemSchema).min(1),
  shippingAddress: ShippingAddressSchema,
  totals: OrderTotalsSchema,
  // Payment info (from Payments bounded context)
  stripeSessionId: z.string().nullable(),
  stripePaymentIntentId: z.string().nullable(),
  // Tracking
  trackingNumber: z.string().nullable(),
  trackingUrl: z.string().url().nullable(),
  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  paidAt: z.date().nullable(),
  shippedAt: z.date().nullable(),
  deliveredAt: z.date().nullable(),
  cancelledAt: z.date().nullable(),
});
export type Order = z.infer<typeof OrderSchema>;

// Domain Events
export type OrderDomainEvent =
  | { type: 'OrderPlaced'; payload: { orderId: string; userId: string } }
  | { type: 'OrderPaid'; payload: { orderId: string; paymentIntentId: string } }
  | { type: 'OrderShipped'; payload: { orderId: string; trackingNumber: string } }
  | { type: 'OrderDelivered'; payload: { orderId: string } }
  | { type: 'OrderCancelled'; payload: { orderId: string; reason: string } }
  | { type: 'OrderRefunded'; payload: { orderId: string; amount: Money } };

// Factory functions
let orderCounter = 0;

export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const sequence = String(++orderCounter).padStart(6, '0');
  return `ORD-${year}-${sequence}`;
}

export function createOrderItem(
  productId: string,
  productName: string,
  productImage: string,
  unitPrice: Money,
  quantity: number
): OrderItem {
  return {
    id: crypto.randomUUID(),
    productId,
    productName,
    productImage,
    unitPrice,
    quantity,
    subtotal: {
      amount: unitPrice.amount * quantity,
      currency: unitPrice.currency,
    },
  };
}

export function createOrder(
  userId: string,
  items: OrderItem[],
  shippingAddress: ShippingAddress,
  totals: OrderTotals
): Order {
  const now = new Date();

  return {
    id: crypto.randomUUID(),
    orderNumber: generateOrderNumber(),
    userId,
    status: 'pending',
    items,
    shippingAddress,
    totals,
    stripeSessionId: null,
    stripePaymentIntentId: null,
    trackingNumber: null,
    trackingUrl: null,
    createdAt: now,
    updatedAt: now,
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
  };
}

// Domain logic - State transitions
export function canTransitionTo(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['paid', 'cancelled'],
    paid: ['processing', 'cancelled', 'refunded'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: ['refunded'],
    cancelled: [],
    refunded: [],
  };

  return transitions[currentStatus].includes(targetStatus);
}

export function markOrderPaid(
  order: Order,
  paymentIntentId: string
): Order {
  if (!canTransitionTo(order.status, 'paid')) {
    throw new Error(`Cannot mark order ${order.id} as paid from status ${order.status}`);
  }

  return {
    ...order,
    status: 'paid',
    stripePaymentIntentId: paymentIntentId,
    paidAt: new Date(),
    updatedAt: new Date(),
  };
}

export function markOrderShipped(
  order: Order,
  trackingNumber: string,
  trackingUrl?: string
): Order {
  if (!canTransitionTo(order.status, 'shipped')) {
    throw new Error(`Cannot mark order ${order.id} as shipped from status ${order.status}`);
  }

  return {
    ...order,
    status: 'shipped',
    trackingNumber,
    trackingUrl: trackingUrl || null,
    shippedAt: new Date(),
    updatedAt: new Date(),
  };
}

export function markOrderDelivered(order: Order): Order {
  if (!canTransitionTo(order.status, 'delivered')) {
    throw new Error(`Cannot mark order ${order.id} as delivered from status ${order.status}`);
  }

  return {
    ...order,
    status: 'delivered',
    deliveredAt: new Date(),
    updatedAt: new Date(),
  };
}

export function cancelOrder(order: Order, _reason: string): Order {
  if (!canTransitionTo(order.status, 'cancelled')) {
    throw new Error(`Cannot cancel order ${order.id} from status ${order.status}`);
  }

  return {
    ...order,
    status: 'cancelled',
    cancelledAt: new Date(),
    updatedAt: new Date(),
  };
}

// Queries
export function getOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Awaiting Payment',
    paid: 'Payment Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };
  return labels[status];
}

export function canCancel(order: Order): boolean {
  return canTransitionTo(order.status, 'cancelled');
}

export function canRefund(order: Order): boolean {
  return canTransitionTo(order.status, 'refunded');
}
