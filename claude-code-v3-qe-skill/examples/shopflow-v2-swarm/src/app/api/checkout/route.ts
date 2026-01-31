/**
 * Checkout API Route
 * POST /api/checkout - Create order and payment intent
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ordersService } from '@/domains/orders/service';
import { paymentsService } from '@/domains/payments/service';
import { cartService } from '@/domains/cart/service';
import { CreateOrderSchema } from '@/types';
import { z } from 'zod';

const CART_SESSION_COOKIE = 'cart_session';

export async function POST(request: NextRequest) {
  try {
    // TODO: Get userId from auth session
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Please log in to checkout',
          },
        },
        { status: 401 }
      );
    }

    const cookieStore = cookies();
    const sessionId = cookieStore.get(CART_SESSION_COOKIE)?.value;

    const body = await request.json();
    const input = CreateOrderSchema.parse(body);

    // Get cart
    const cart = await cartService.getOrCreateCart(userId, sessionId);
    if (cart.itemCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMPTY_CART',
            message: 'Cart is empty',
          },
        },
        { status: 400 }
      );
    }

    // Create order
    const order = await ordersService.createOrder(userId, cart.id, input);

    // Create payment intent
    const { clientSecret, paymentId } = await paymentsService.createPaymentIntent(
      order.id,
      userId
    );

    return NextResponse.json({
      success: true,
      data: {
        order,
        payment: {
          clientSecret,
          paymentId,
        },
      },
    });
  } catch (error) {
    console.error('POST /api/checkout error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid checkout data',
            details: error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CHECKOUT_FAILED',
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Checkout failed',
        },
      },
      { status: 500 }
    );
  }
}
