/**
 * Payments Domain Service
 * Handles Stripe payment processing with PCI-DSS compliance
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import type {
  Payment,
  PaymentStatus,
  CreatePaymentIntentInput,
} from '@/types';
import { inventoryService } from '@/domains/inventory/service';
import { ordersService } from '@/domains/orders/service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class PaymentsService {
  /**
   * Create payment intent for order
   */
  async createPaymentIntent(
    orderId: string,
    userId: string
  ): Promise<{ clientSecret: string; paymentId: string }> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { user: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new Error('Order is not pending payment');
    }

    // Get or create Stripe customer
    let stripeCustomerId = await this.getStripeCustomerId(userId);
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: order.user.email,
        name: `${order.user.firstName} ${order.user.lastName}`,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      // Store customer ID for future use
      await this.saveStripeCustomerId(userId, stripeCustomerId);
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(order.total) * 100), // Convert to cents
      currency: order.currency.toLowerCase(),
      customer: stripeCustomerId,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        orderId,
        stripePaymentId: paymentIntent.id,
        stripeCustomerId,
        amount: Number(order.total),
        currency: order.currency,
        status: 'PENDING',
        method: 'CARD',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentId: payment.id,
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(
    payload: Buffer,
    signature: string
  ): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case 'charge.refunded':
        await this.handleRefund(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Process refund
   */
  async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<Payment> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || !payment.stripePaymentId) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'SUCCEEDED') {
      throw new Error('Payment cannot be refunded');
    }

    const refundAmount = amount || Number(payment.amount);

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentId,
      amount: Math.round(refundAmount * 100),
      reason: 'requested_by_customer',
    });

    await prisma.refund.create({
      data: {
        paymentId: payment.id,
        stripeRefundId: refund.id,
        amount: refundAmount,
        reason,
        status: 'SUCCEEDED',
      },
    });

    const newStatus: PaymentStatus =
      refundAmount >= Number(payment.amount)
        ? 'REFUNDED'
        : 'PARTIALLY_REFUNDED';

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: newStatus },
    });

    return this.mapPaymentToDto(updatedPayment);
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment | null> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    return payment ? this.mapPaymentToDto(payment) : null;
  }

  /**
   * Get payments for order
   */
  async getOrderPayments(orderId: string): Promise<Payment[]> {
    const payments = await prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map(this.mapPaymentToDto);
  }

  private async handlePaymentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const orderId = paymentIntent.metadata.orderId;

    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.updateMany({
        where: { stripePaymentId: paymentIntent.id },
        data: { status: 'SUCCEEDED' },
      });

      // Confirm order
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          timeline: {
            create: {
              type: 'PAYMENT_RECEIVED',
              message: 'Payment received successfully',
            },
          },
        },
        include: { items: true },
      });

      // Confirm inventory sales
      for (const item of order.items) {
        await inventoryService.confirmSale(
          item.productId,
          item.variantId,
          item.quantity,
          orderId
        );
      }
    });
  }

  private async handlePaymentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const orderId = paymentIntent.metadata.orderId;

    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.updateMany({
        where: { stripePaymentId: paymentIntent.id },
        data: {
          status: 'FAILED',
          failureReason:
            paymentIntent.last_payment_error?.message || 'Payment failed',
        },
      });

      // Add timeline event
      await tx.order.update({
        where: { id: orderId },
        data: {
          timeline: {
            create: {
              type: 'PAYMENT_FAILED',
              message: `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
            },
          },
        },
      });
    });
  }

  private async handleRefund(charge: Stripe.Charge): Promise<void> {
    // Handle async refund notifications
    if (charge.refunds?.data) {
      for (const refund of charge.refunds.data) {
        await prisma.refund.updateMany({
          where: { stripeRefundId: refund.id },
          data: { status: refund.status === 'succeeded' ? 'SUCCEEDED' : 'FAILED' },
        });
      }
    }
  }

  private async getStripeCustomerId(
    userId: string
  ): Promise<string | null> {
    // In production, store this in user record
    const payment = await prisma.payment.findFirst({
      where: { order: { userId } },
      select: { stripeCustomerId: true },
    });
    return payment?.stripeCustomerId || null;
  }

  private async saveStripeCustomerId(
    userId: string,
    stripeCustomerId: string
  ): Promise<void> {
    // In production, store in user record
    // For now, it's stored with each payment
  }

  private mapPaymentToDto(payment: any): Payment {
    return {
      id: payment.id,
      orderId: payment.orderId,
      stripePaymentId: payment.stripePaymentId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      createdAt: payment.createdAt,
    };
  }
}

export const paymentsService = new PaymentsService();
