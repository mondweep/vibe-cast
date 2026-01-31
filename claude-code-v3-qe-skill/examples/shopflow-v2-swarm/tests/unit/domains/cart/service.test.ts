/**
 * Cart Service Unit Tests
 * TDD: Tests written following Red-Green-Refactor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    cart: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    cartItem: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { CartService } from '@/domains/cart/service';

describe('CartService', () => {
  let cartService: CartService;

  beforeEach(() => {
    cartService = new CartService();
    vi.clearAllMocks();
  });

  describe('getOrCreateCart', () => {
    it('should create a new cart for anonymous user with session', async () => {
      const mockCart = {
        id: 'cart-1',
        userId: null,
        sessionId: 'session-123',
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        items: [],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.cart.create).mockResolvedValue(mockCart);

      const cart = await cartService.getOrCreateCart(undefined, 'session-123');

      expect(cart.id).toBe('cart-1');
      expect(cart.sessionId).toBe('session-123');
      expect(cart.items).toEqual([]);
    });

    it('should return existing cart for user', async () => {
      const mockCart = {
        id: 'cart-2',
        userId: 'user-1',
        sessionId: null,
        expiresAt: new Date(),
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            variantId: null,
            quantity: 2,
            product: {
              id: 'prod-1',
              name: 'Test Product',
              slug: 'test-product',
              price: 29.99,
              images: [],
            },
            variant: null,
          },
        ],
      };

      vi.mocked(prisma.cart.findUnique).mockResolvedValue(mockCart);

      const cart = await cartService.getOrCreateCart('user-1');

      expect(cart.id).toBe('cart-2');
      expect(cart.userId).toBe('user-1');
      expect(cart.items).toHaveLength(1);
      expect(cart.itemCount).toBe(2);
    });
  });

  describe('addItem', () => {
    it('should add new item to cart', async () => {
      vi.mocked(prisma.cartItem.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.cartItem.create).mockResolvedValue({
        id: 'item-new',
        cartId: 'cart-1',
        productId: 'prod-1',
        variantId: null,
        quantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.cart.update).mockResolvedValue({} as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValue({
        id: 'cart-1',
        userId: null,
        sessionId: 'session-1',
        expiresAt: new Date(),
        items: [
          {
            id: 'item-new',
            productId: 'prod-1',
            variantId: null,
            quantity: 1,
            product: {
              id: 'prod-1',
              name: 'Product',
              slug: 'product',
              price: 19.99,
              images: [],
            },
            variant: null,
          },
        ],
      } as any);

      const cart = await cartService.addItem('cart-1', {
        productId: 'prod-1',
        quantity: 1,
      });

      expect(prisma.cartItem.create).toHaveBeenCalled();
      expect(cart.items).toHaveLength(1);
    });

    it('should increment quantity for existing item', async () => {
      vi.mocked(prisma.cartItem.findFirst).mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        productId: 'prod-1',
        variantId: null,
        quantity: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.cartItem.update).mockResolvedValue({} as any);
      vi.mocked(prisma.cart.update).mockResolvedValue({} as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValue({
        id: 'cart-1',
        userId: null,
        sessionId: 'session-1',
        expiresAt: new Date(),
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            variantId: null,
            quantity: 5,
            product: {
              id: 'prod-1',
              name: 'Product',
              slug: 'product',
              price: 19.99,
              images: [],
            },
            variant: null,
          },
        ],
      } as any);

      const cart = await cartService.addItem('cart-1', {
        productId: 'prod-1',
        quantity: 3,
      });

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: { quantity: 5 },
        })
      );
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity', async () => {
      vi.mocked(prisma.cartItem.update).mockResolvedValue({} as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValue({
        id: 'cart-1',
        items: [],
        expiresAt: new Date(),
      } as any);

      await cartService.updateItemQuantity('cart-1', 'item-1', { quantity: 5 });

      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: { quantity: 5 },
        })
      );
    });

    it('should remove item when quantity is 0', async () => {
      vi.mocked(prisma.cartItem.delete).mockResolvedValue({} as any);
      vi.mocked(prisma.cart.findUnique).mockResolvedValue({
        id: 'cart-1',
        items: [],
        expiresAt: new Date(),
      } as any);

      await cartService.updateItemQuantity('cart-1', 'item-1', { quantity: 0 });

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });
  });

  describe('clearCart', () => {
    it('should remove all items from cart', async () => {
      vi.mocked(prisma.cartItem.deleteMany).mockResolvedValue({ count: 3 });
      vi.mocked(prisma.cart.findUnique).mockResolvedValue({
        id: 'cart-1',
        items: [],
        expiresAt: new Date(),
      } as any);

      const cart = await cartService.clearCart('cart-1');

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1' },
      });
      expect(cart.items).toHaveLength(0);
    });
  });

  describe('subtotal calculation', () => {
    it('should calculate correct subtotal', async () => {
      vi.mocked(prisma.cart.findUnique).mockResolvedValue({
        id: 'cart-1',
        userId: null,
        sessionId: 'session-1',
        expiresAt: new Date(),
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            variantId: null,
            quantity: 2,
            product: { price: 10.0, images: [] },
            variant: null,
          },
          {
            id: 'item-2',
            productId: 'prod-2',
            variantId: 'var-1',
            quantity: 1,
            product: { price: 20.0, images: [] },
            variant: { price: 25.0 },
          },
        ],
      } as any);

      const cart = await cartService.getCart('cart-1');

      // 2 * $10 + 1 * $25 (variant price) = $45
      expect(cart.subtotal).toBe(45);
      expect(cart.itemCount).toBe(3);
    });
  });
});
