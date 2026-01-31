import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sendOrderConfirmationEmail } from '@/lib/email';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const CART_COOKIE_NAME = 'cart_session_id';

// Discount codes
const DISCOUNT_CODES: Record<string, number> = {
  'FREEORDER': 100,
  'HALF50': 50,
  'SAVE20': 20,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { discountCode, email } = body;

    // Get cart
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(CART_COOKIE_NAME)?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'No cart found' },
        { status: 400 }
      );
    }

    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );

    // Apply discount
    let discountPercentage = 0;
    if (discountCode) {
      discountPercentage = DISCOUNT_CODES[discountCode.toUpperCase()] || 0;
    }

    const discountAmount = (subtotal * discountPercentage) / 100;
    const finalAmount = Math.max(0, subtotal - discountAmount);

    // If total is 0, create a free order without Stripe
    if (finalAmount === 0) {
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Send confirmation email for free orders
      if (email) {
        await sendOrderConfirmationEmail({
          to: email,
          orderNumber,
          items: cart.items.map((item) => ({
            name: item.product.name,
            quantity: item.quantity,
            price: Number(item.product.price),
          })),
          subtotal,
          discount: discountAmount,
          total: 0,
        });
      }

      // Clear the cart
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return NextResponse.json({
        success: true,
        freeOrder: true,
        orderNumber,
        message: 'Order placed for free with discount code!',
        subtotal,
        discountAmount,
        finalAmount: 0,
      });
    }

    // Create Stripe Checkout Session
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product.name,
          images: item.product.images[0] ? [item.product.images[0].url] : [],
        },
        unit_amount: Math.round(Number(item.product.price) * 100),
      },
      quantity: item.quantity,
    }));

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/cart`,
      metadata: {
        cartId: cart.id,
        discountCode: discountCode || '',
        discountPercentage: discountPercentage.toString(),
      },
    };

    // Apply coupon/discount if there's a percentage discount
    if (discountPercentage > 0 && discountPercentage < 100) {
      const coupon = await stripe.coupons.create({
        percent_off: discountPercentage,
        duration: 'once',
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      subtotal,
      discountAmount,
      finalAmount,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
