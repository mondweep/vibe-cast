/**
 * Checkout API
 *
 * POST /api/checkout - Create Stripe checkout session
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getCart, deleteCart } from '@/lib/redis';
import { db } from '@/lib/db';
import { createCheckoutSession } from '@/lib/stripe';
import { absoluteUrl } from '@/lib/utils';

const CART_COOKIE = 'cart_id';

const checkoutSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = checkoutSchema.parse(body);

    // Get cart
    const cookieStore = await cookies();
    const cartId = cookieStore.get(CART_COOKIE)?.value;

    if (!cartId) {
      return NextResponse.json({ error: 'No cart found' }, { status: 400 });
    }

    const cart = await getCart(cartId);
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Verify stock availability for all items
    const productIds = cart.items.map((item) => item.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
    });

    for (const item of cart.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productName} no longer available` },
          { status: 400 }
        );
      }

      const available = product.stockTotal - product.stockReserved - product.stockSold;
      if (available < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${item.productName}`,
            available,
            requested: item.quantity,
          },
          { status: 400 }
        );
      }
    }

    // Reserve stock (pessimistic locking per ADR-004)
    await db.$transaction(async (tx) => {
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockReserved: { increment: item.quantity } },
        });

        await tx.stockReservation.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            cartId: cart.id,
            status: 'active',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          },
        });
      }
    });

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      cartItems: cart.items,
      userId: cart.userId || 'guest',
      customerEmail: email,
      successUrl: absoluteUrl(`/orders/{CHECKOUT_SESSION_ID}?success=true`),
      cancelUrl: absoluteUrl('/cart?cancelled=true'),
      metadata: {
        cartId: cart.id,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
