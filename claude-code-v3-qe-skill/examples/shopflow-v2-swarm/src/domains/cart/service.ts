/**
 * Cart Domain Service
 * Manages shopping cart operations with reservation support
 */

import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import type {
  Cart,
  CartItem,
  AddToCartInput,
  UpdateCartItemInput,
} from '@/types';

const CART_EXPIRY_HOURS = 72;

export class CartService {
  /**
   * Get or create cart for user/session
   */
  async getOrCreateCart(userId?: string, sessionId?: string): Promise<Cart> {
    if (!userId && !sessionId) {
      sessionId = nanoid(21);
    }

    let cart = await this.findCart(userId, sessionId);

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId,
          sessionId: userId ? null : sessionId,
          expiresAt: this.getExpiryDate(),
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { where: { isPrimary: true } },
                },
              },
              variant: true,
            },
          },
        },
      });
    }

    return this.mapCartToDto(cart);
  }

  /**
   * Add item to cart
   */
  async addItem(
    cartId: string,
    input: AddToCartInput
  ): Promise<Cart> {
    const { productId, variantId, quantity } = input;

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId,
        productId,
        variantId: variantId || null,
      },
    });

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
          cartId,
          productId,
          variantId,
          quantity,
        },
      });
    }

    // Update cart expiry
    await prisma.cart.update({
      where: { id: cartId },
      data: { expiresAt: this.getExpiryDate() },
    });

    return this.getCart(cartId);
  }

  /**
   * Update cart item quantity
   */
  async updateItemQuantity(
    cartId: string,
    itemId: string,
    input: UpdateCartItemInput
  ): Promise<Cart> {
    const { quantity } = input;

    if (quantity === 0) {
      // Remove item
      await prisma.cartItem.delete({
        where: { id: itemId },
      });
    } else {
      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });
    }

    return this.getCart(cartId);
  }

  /**
   * Remove item from cart
   */
  async removeItem(cartId: string, itemId: string): Promise<Cart> {
    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCart(cartId);
  }

  /**
   * Clear all items from cart
   */
  async clearCart(cartId: string): Promise<Cart> {
    await prisma.cartItem.deleteMany({
      where: { cartId },
    });

    return this.getCart(cartId);
  }

  /**
   * Merge guest cart into user cart after login
   */
  async mergeCarts(sessionId: string, userId: string): Promise<Cart> {
    const [guestCart, userCart] = await Promise.all([
      prisma.cart.findUnique({
        where: { sessionId },
        include: { items: true },
      }),
      prisma.cart.findUnique({
        where: { userId },
        include: { items: true },
      }),
    ]);

    if (!guestCart) {
      return this.getOrCreateCart(userId);
    }

    if (!userCart) {
      // Transfer guest cart to user
      await prisma.cart.update({
        where: { id: guestCart.id },
        data: {
          userId,
          sessionId: null,
        },
      });
      return this.getCart(guestCart.id);
    }

    // Merge items from guest cart to user cart
    for (const item of guestCart.items) {
      const existingItem = userCart.items.find(
        (i) =>
          i.productId === item.productId && i.variantId === item.variantId
      );

      if (existingItem) {
        await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + item.quantity },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          },
        });
      }
    }

    // Delete guest cart
    await prisma.cart.delete({ where: { id: guestCart.id } });

    return this.getCart(userCart.id);
  }

  /**
   * Get cart by ID
   */
  async getCart(cartId: string): Promise<Cart> {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true } },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      throw new Error('Cart not found');
    }

    return this.mapCartToDto(cart);
  }

  private async findCart(
    userId?: string,
    sessionId?: string
  ): Promise<any | null> {
    if (userId) {
      return prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { where: { isPrimary: true } },
                },
              },
              variant: true,
            },
          },
        },
      });
    }

    if (sessionId) {
      return prisma.cart.findUnique({
        where: { sessionId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { where: { isPrimary: true } },
                },
              },
              variant: true,
            },
          },
        },
      });
    }

    return null;
  }

  private getExpiryDate(): Date {
    return new Date(Date.now() + CART_EXPIRY_HOURS * 60 * 60 * 1000);
  }

  private mapCartToDto(cart: any): Cart {
    const items: CartItem[] = cart.items.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: Number(item.product.price),
        images: item.product.images.map((img: any) => ({
          id: img.id,
          url: img.url,
          altText: img.altText,
          sortOrder: img.sortOrder,
          isPrimary: img.isPrimary,
        })),
      },
      variant: item.variant
        ? {
            id: item.variant.id,
            sku: item.variant.sku,
            name: item.variant.name,
            price: Number(item.variant.price),
            attributes: item.variant.attributes,
          }
        : null,
    }));

    const subtotal = items.reduce((sum, item) => {
      const price = item.variant?.price ?? item.product.price;
      return sum + price * item.quantity;
    }, 0);

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      items,
      subtotal,
      itemCount,
      expiresAt: cart.expiresAt,
    };
  }
}

export const cartService = new CartService();
