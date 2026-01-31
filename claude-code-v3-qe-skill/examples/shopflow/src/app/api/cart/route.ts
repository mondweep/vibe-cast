/**
 * Cart API
 *
 * GET /api/cart - Get current cart
 * POST /api/cart - Add item to cart
 * PATCH /api/cart - Update item quantity
 * DELETE /api/cart - Remove item from cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getCart, saveCart, deleteCart } from '@/lib/redis';
import { db } from '@/lib/db';
import {
  createCart,
  createCartItem,
  addItemToCart,
  updateItemQuantity,
  removeItemFromCart,
  calculateCartTotals,
} from '@/domains/cart/types';

const CART_COOKIE = 'cart_id';

async function getOrCreateCart() {
  const cookieStore = await cookies();
  let cartId = cookieStore.get(CART_COOKIE)?.value;
  let cart = cartId ? await getCart(cartId) : null;

  if (!cart) {
    cart = createCart();
    cartId = cart.id;
    await saveCart(cart);
    cookieStore.set(CART_COOKIE, cartId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }

  return cart;
}

// GET - Get cart
export async function GET() {
  try {
    const cart = await getOrCreateCart();
    const totals = calculateCartTotals(cart);

    return NextResponse.json({
      id: cart.id,
      items: cart.items,
      totals,
    });
  } catch (error) {
    console.error('Cart GET error:', error);
    return NextResponse.json({ error: 'Failed to get cart' }, { status: 500 });
  }
}

// POST - Add item
const addItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity } = addItemSchema.parse(body);

    // Get product details
    const product = await db.product.findUnique({
      where: { id: productId, isActive: true },
      include: { images: { take: 1, orderBy: { position: 'asc' } } },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const available = product.stockTotal - product.stockReserved - product.stockSold;
    if (available < quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock', available },
        { status: 400 }
      );
    }

    const cart = await getOrCreateCart();
    const item = createCartItem(
      product.id,
      product.name,
      product.images[0]?.url || '/placeholder.png',
      { amount: product.priceAmount, currency: product.priceCurrency as 'USD' | 'EUR' | 'GBP' },
      quantity
    );

    const updatedCart = addItemToCart(cart, item);
    await saveCart(updatedCart);

    return NextResponse.json({
      message: 'Item added to cart',
      cart: {
        id: updatedCart.id,
        items: updatedCart.items,
        totals: calculateCartTotals(updatedCart),
      },
    });
  } catch (error) {
    console.error('Cart POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}

// PATCH - Update quantity
const updateSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(0).max(99),
});

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity } = updateSchema.parse(body);

    const cart = await getOrCreateCart();
    const updatedCart = updateItemQuantity(cart, productId, quantity);
    await saveCart(updatedCart);

    return NextResponse.json({
      message: quantity > 0 ? 'Quantity updated' : 'Item removed',
      cart: {
        id: updatedCart.id,
        items: updatedCart.items,
        totals: calculateCartTotals(updatedCart),
      },
    });
  } catch (error) {
    console.error('Cart PATCH error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}

// DELETE - Remove item
const deleteSchema = z.object({
  productId: z.string().uuid(),
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId } = deleteSchema.parse(body);

    const cart = await getOrCreateCart();
    const updatedCart = removeItemFromCart(cart, productId);
    await saveCart(updatedCart);

    return NextResponse.json({
      message: 'Item removed',
      cart: {
        id: updatedCart.id,
        items: updatedCart.items,
        totals: calculateCartTotals(updatedCart),
      },
    });
  } catch (error) {
    console.error('Cart DELETE error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
  }
}
