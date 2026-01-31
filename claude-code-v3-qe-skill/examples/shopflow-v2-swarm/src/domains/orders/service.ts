/**
 * Orders Domain Service
 * Manages order lifecycle from placement to fulfillment
 */

import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import type {
  Order,
  OrderItem,
  OrderStatus,
  CreateOrderInput,
  PaginatedResult,
  Pagination,
} from '@/types';
import { inventoryService } from '@/domains/inventory/service';

export class OrdersService {
  /**
   * Create order from cart
   */
  async createOrder(
    userId: string,
    cartId: string,
    input: CreateOrderInput
  ): Promise<Order> {
    // Get cart with items
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Get shipping address
    const address = await prisma.address.findUnique({
      where: { id: input.addressId },
    });

    if (!address || address.userId !== userId) {
      throw new Error('Invalid address');
    }

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.variant
        ? Number(item.variant.price)
        : Number(item.product.price);
      return sum + price * item.quantity;
    }, 0);

    const shippingAmount = this.calculateShipping(subtotal);
    const taxAmount = this.calculateTax(subtotal, address.state);
    const total = subtotal + shippingAmount + taxAmount;

    // Create order with items
    const order = await prisma.$transaction(async (tx) => {
      const orderNumber = this.generateOrderNumber();

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: input.addressId,
          status: 'PENDING',
          subtotal,
          shippingAmount,
          taxAmount,
          discountAmount: 0,
          total,
          notes: input.notes,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              productName: item.product.name,
              variantName: item.variant?.name,
              sku: item.variant?.sku || item.product.sku,
              quantity: item.quantity,
              unitPrice: item.variant
                ? Number(item.variant.price)
                : Number(item.product.price),
              total:
                (item.variant
                  ? Number(item.variant.price)
                  : Number(item.product.price)) * item.quantity,
            })),
          },
          timeline: {
            create: {
              type: 'ORDER_PLACED',
              message: 'Order placed successfully',
            },
          },
        },
        include: {
          items: true,
          address: true,
        },
      });

      // Reserve inventory for all items
      for (const item of cart.items) {
        await inventoryService.reserveInventory(
          item.productId,
          item.variantId,
          item.quantity,
          newOrder.id
        );
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId } });

      return newOrder;
    });

    return this.mapOrderToDto(order);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string, userId: string): Promise<Order | null> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: true,
        address: true,
        payments: true,
        shipments: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    return order ? this.mapOrderToDto(order) : null;
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(
    orderNumber: string,
    userId: string
  ): Promise<Order | null> {
    const order = await prisma.order.findFirst({
      where: { orderNumber, userId },
      include: {
        items: true,
        address: true,
        payments: true,
        shipments: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    return order ? this.mapOrderToDto(order) : null;
  }

  /**
   * Get user's orders
   */
  async getUserOrders(
    userId: string,
    pagination: Pagination
  ): Promise<PaginatedResult<Order>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        include: {
          items: true,
          address: true,
        },
        skip,
        take: limit,
        orderBy: { placedAt: 'desc' },
      }),
      prisma.order.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: orders.map(this.mapOrderToDto),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Update order status
   */
  async updateStatus(
    orderId: string,
    status: OrderStatus,
    message?: string
  ): Promise<Order> {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        timeline: {
          create: {
            type: `STATUS_${status}`,
            message: message || `Order status updated to ${status}`,
          },
        },
      },
      include: {
        items: true,
        address: true,
      },
    });

    return this.mapOrderToDto(order);
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, userId: string): Promise<Order> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new Error('Order cannot be cancelled');
    }

    // Release inventory reservations
    for (const item of order.items) {
      await inventoryService.releaseInventory(
        item.productId,
        item.variantId,
        item.quantity,
        orderId
      );
    }

    return this.updateStatus(orderId, 'CANCELLED', 'Order cancelled by customer');
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = nanoid(4).toUpperCase();
    return `SF-${timestamp}-${random}`;
  }

  private calculateShipping(subtotal: number): number {
    // Free shipping over $100
    if (subtotal >= 100) return 0;
    // Flat rate
    return 9.99;
  }

  private calculateTax(subtotal: number, state: string): number {
    // Simplified tax calculation
    const taxRates: Record<string, number> = {
      CA: 0.0725,
      NY: 0.08,
      TX: 0.0625,
      FL: 0.06,
    };
    const rate = taxRates[state] || 0;
    return subtotal * rate;
  }

  private mapOrderToDto(order: any): Order {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status,
      items: order.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      })),
      subtotal: Number(order.subtotal),
      shippingAmount: Number(order.shippingAmount),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      total: Number(order.total),
      currency: order.currency,
      shippingAddress: {
        firstName: order.address.firstName,
        lastName: order.address.lastName,
        street: order.address.street,
        city: order.address.city,
        state: order.address.state,
        postalCode: order.address.postalCode,
        country: order.address.country,
      },
      placedAt: order.placedAt,
      updatedAt: order.updatedAt,
    };
  }
}

export const ordersService = new OrdersService();
