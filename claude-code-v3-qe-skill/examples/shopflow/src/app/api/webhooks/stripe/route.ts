/**
 * Stripe Webhook Handler
 *
 * Handles payment events from Stripe
 * ADR-001: Webhook-based async payment confirmation
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { deleteCart } from '@/lib/redis';
import { constructWebhookEvent, retrieveCheckoutSession } from '@/lib/stripe';
import { generateOrderNumber } from '@/lib/utils';
import type Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const event = await constructWebhookEvent(body, signature);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        // Could trigger email notification here
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const cartId = session.metadata?.cartId;
  if (!cartId) {
    console.error('No cartId in session metadata');
    return;
  }

  // Get full session with line items
  const fullSession = await retrieveCheckoutSession(session.id);
  const shipping = fullSession.shipping_details;
  const lineItems = fullSession.line_items?.data || [];

  // Create order in database
  await db.$transaction(async (tx) => {
    // Find or create user
    let user = await tx.user.findUnique({
      where: { email: session.customer_email! },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          email: session.customer_email!,
          name: shipping?.name || null,
          stripeCustomerId: session.customer as string || null,
        },
      });
    }

    // Get reservations for this cart
    const reservations = await tx.stockReservation.findMany({
      where: { cartId, status: 'active' },
    });

    // Create order
    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: user.id,
        status: 'paid',
        // Shipping
        shippingFullName: shipping?.name || '',
        shippingLine1: shipping?.address?.line1 || '',
        shippingLine2: shipping?.address?.line2 || null,
        shippingCity: shipping?.address?.city || '',
        shippingState: shipping?.address?.state || '',
        shippingPostalCode: shipping?.address?.postal_code || '',
        shippingCountry: shipping?.address?.country || 'US',
        // Totals
        subtotalAmount: fullSession.amount_subtotal || 0,
        shippingAmount: fullSession.shipping_cost?.amount_total || 0,
        taxAmount: fullSession.total_details?.amount_tax || 0,
        totalAmount: fullSession.amount_total || 0,
        // Payment
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string,
        paidAt: new Date(),
      },
    });

    // Create order items and confirm reservations
    for (const reservation of reservations) {
      const product = await tx.product.findUnique({
        where: { id: reservation.productId },
        include: { images: { take: 1 } },
      });

      if (product) {
        // Create order item
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            productName: product.name,
            productImage: product.images[0]?.url || '/placeholder.png',
            unitPrice: product.priceAmount,
            quantity: reservation.quantity,
            subtotal: product.priceAmount * reservation.quantity,
          },
        });

        // Confirm reservation: move from reserved to sold
        await tx.product.update({
          where: { id: product.id },
          data: {
            stockReserved: { decrement: reservation.quantity },
            stockSold: { increment: reservation.quantity },
          },
        });

        // Mark reservation as confirmed
        await tx.stockReservation.update({
          where: { id: reservation.id },
          data: {
            status: 'confirmed',
            orderId: order.id,
          },
        });
      }
    }

    // TODO: Send order confirmation email
    console.log(`Order ${order.orderNumber} created for ${user.email}`);
  });

  // Clear the cart
  await deleteCart(cartId);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const cartId = session.metadata?.cartId;
  if (!cartId) return;

  // Release all reservations for this cart
  await db.$transaction(async (tx) => {
    const reservations = await tx.stockReservation.findMany({
      where: { cartId, status: 'active' },
    });

    for (const reservation of reservations) {
      // Release stock
      await tx.product.update({
        where: { id: reservation.productId },
        data: { stockReserved: { decrement: reservation.quantity } },
      });

      // Mark reservation as released
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: { status: 'released' },
      });
    }
  });

  console.log(`Reservations released for expired session: ${session.id}`);
}
