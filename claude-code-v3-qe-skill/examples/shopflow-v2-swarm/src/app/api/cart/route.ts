/**
 * Cart API Routes
 * GET /api/cart - Get cart
 * POST /api/cart - Add item to cart
 * DELETE /api/cart - Clear cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { cartService } from '@/domains/cart/service';
import { AddToCartSchema } from '@/types';
import { z } from 'zod';

const CART_SESSION_COOKIE = 'cart_session';

async function getSessionId(): Promise<string | undefined> {
  const cookieStore = cookies();
  return cookieStore.get(CART_SESSION_COOKIE)?.value;
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = await getSessionId();
    // TODO: Get userId from auth session
    const userId = undefined;

    const cart = await cartService.getOrCreateCart(userId, sessionId);

    const response = NextResponse.json({
      success: true,
      data: cart,
    });

    // Set session cookie if new cart
    if (!sessionId && cart.sessionId) {
      response.cookies.set(CART_SESSION_COOKIE, cart.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return response;
  } catch (error) {
    console.error('GET /api/cart error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get cart',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const userId = undefined;
    const body = await request.json();

    const input = AddToCartSchema.parse(body);

    const cart = await cartService.getOrCreateCart(userId, sessionId);
    const updatedCart = await cartService.addItem(cart.id, input);

    const response = NextResponse.json({
      success: true,
      data: updatedCart,
    });

    if (!sessionId && updatedCart.sessionId) {
      response.cookies.set(CART_SESSION_COOKIE, updatedCart.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (error) {
    console.error('POST /api/cart error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid cart item',
            details: error.flatten().fieldErrors,
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
          message: 'Failed to add item to cart',
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const userId = undefined;

    const cart = await cartService.getOrCreateCart(userId, sessionId);
    const clearedCart = await cartService.clearCart(cart.id);

    return NextResponse.json({
      success: true,
      data: clearedCart,
    });
  } catch (error) {
    console.error('DELETE /api/cart error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to clear cart',
        },
      },
      { status: 500 }
    );
  }
}
