import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { sendOrderConfirmationEmail } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('No stripe signature found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('Received Stripe webhook:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const cartId = session.metadata?.cartId;
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name;
  const discountCode = session.metadata?.discountCode;
  const discountPercentage = parseInt(session.metadata?.discountPercentage || '0');

  console.log('Processing checkout complete:', {
    sessionId: session.id,
    cartId,
    customerEmail,
    discountCode,
  });

  if (!cartId) {
    console.error('No cart ID in session metadata');
    return;
  }

  // Get cart with items
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart) {
    console.error('Cart not found:', cartId);
    return;
  }

  // Generate order number
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Calculate totals
  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );
  const discountAmount = (subtotal * discountPercentage) / 100;
  const total = Math.max(0, subtotal - discountAmount);

  // Clear the cart after successful payment
  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  console.log('Order processed:', orderNumber);

  // Send confirmation email
  if (customerEmail) {
    const emailResult = await sendOrderConfirmationEmail({
      to: customerEmail,
      orderNumber,
      customerName: customerName || undefined,
      items: cart.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        price: Number(item.product.price),
      })),
      subtotal,
      discount: discountAmount,
      total,
    });

    if (emailResult.success) {
      console.log('Confirmation email sent to:', customerEmail);
    } else {
      console.error('Failed to send confirmation email:', emailResult.error);
    }
  }
}
