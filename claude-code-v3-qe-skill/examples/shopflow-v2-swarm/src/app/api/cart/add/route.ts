import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

const CART_COOKIE_NAME = 'cart_session_id';
const CART_EXPIRY_HOURS = 72;

function getExpiryDate(): Date {
  return new Date(Date.now() + CART_EXPIRY_HOURS * 60 * 60 * 1000);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity = 1 } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get or create session ID
    const cookieStore = await cookies();
    let sessionId = cookieStore.get(CART_COOKIE_NAME)?.value;

    if (!sessionId) {
      sessionId = nanoid(21);
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          sessionId,
          expiresAt: getExpiryDate(),
        },
        include: { items: true },
      });
    }

    // Check if item already in cart
    const existingItem = cart.items.find(
      (item) => item.productId === productId && item.variantId === null
    );

    if (existingItem) {
      // Update quantity
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      // Add new item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    // Update cart expiry
    await prisma.cart.update({
      where: { id: cart.id },
      data: { expiresAt: getExpiryDate() },
    });

    // Get updated cart with items
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
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

    const response = NextResponse.json({
      success: true,
      cart: updatedCart,
      itemCount: updatedCart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0,
    });

    // Set cookie
    response.cookies.set(CART_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: CART_EXPIRY_HOURS * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json(
      { error: 'Failed to add item to cart' },
      { status: 500 }
    );
  }
}
