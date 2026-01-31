/**
 * Cart Domain Tests (TDD)
 *
 * Tests for Cart aggregate and domain logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCart,
  createCartItem,
  addItemToCart,
  updateItemQuantity,
  removeItemFromCart,
  clearCart,
  mergeCarts,
  calculateCartTotals,
  type Cart,
  type CartItem,
} from '../../src/domains/cart/types';

describe('Cart Domain', () => {
  describe('createCart', () => {
    it('should_create_cart_with_unique_id_when_called', () => {
      const cart = createCart();

      expect(cart.id).toBeDefined();
      expect(cart.id.length).toBeGreaterThan(0);
      expect(cart.items).toEqual([]);
      expect(cart.userId).toBeNull();
    });

    it('should_create_cart_with_userId_when_provided', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const cart = createCart(userId);

      expect(cart.userId).toBe(userId);
    });

    it('should_set_expiration_7_days_in_future', () => {
      const cart = createCart();
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Allow 1 second tolerance
      expect(cart.expiresAt.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3);
    });
  });

  describe('createCartItem', () => {
    it('should_create_cart_item_with_all_properties', () => {
      const item = createCartItem(
        'prod-123',
        'Test Product',
        'https://example.com/image.jpg',
        { amount: 1999, currency: 'USD' },
        2
      );

      expect(item.productId).toBe('prod-123');
      expect(item.productName).toBe('Test Product');
      expect(item.productImage).toBe('https://example.com/image.jpg');
      expect(item.unitPrice.amount).toBe(1999);
      expect(item.quantity).toBe(2);
      expect(item.addedAt).toBeInstanceOf(Date);
    });
  });

  describe('addItemToCart', () => {
    let cart: Cart;
    let item: CartItem;

    beforeEach(() => {
      cart = createCart();
      item = createCartItem(
        'prod-123',
        'Test Product',
        'https://example.com/image.jpg',
        { amount: 1999, currency: 'USD' },
        1
      );
    });

    it('should_add_new_item_to_empty_cart', () => {
      const updatedCart = addItemToCart(cart, item);

      expect(updatedCart.items).toHaveLength(1);
      expect(updatedCart.items[0].productId).toBe('prod-123');
      expect(updatedCart.items[0].quantity).toBe(1);
    });

    it('should_increase_quantity_when_adding_existing_product', () => {
      const cartWithItem = addItemToCart(cart, item);
      const updatedCart = addItemToCart(cartWithItem, item);

      expect(updatedCart.items).toHaveLength(1);
      expect(updatedCart.items[0].quantity).toBe(2);
    });

    it('should_cap_quantity_at_99_when_exceeding_limit', () => {
      const itemWithHighQty = { ...item, quantity: 50 };
      let updatedCart = addItemToCart(cart, itemWithHighQty);
      updatedCart = addItemToCart(updatedCart, itemWithHighQty);

      expect(updatedCart.items[0].quantity).toBe(99);
    });

    it('should_update_updatedAt_timestamp', () => {
      const originalUpdatedAt = cart.updatedAt;
      const updatedCart = addItemToCart(cart, item);

      expect(updatedCart.updatedAt.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe('updateItemQuantity', () => {
    let cartWithItem: Cart;

    beforeEach(() => {
      const cart = createCart();
      const item = createCartItem(
        'prod-123',
        'Test Product',
        'https://example.com/image.jpg',
        { amount: 1999, currency: 'USD' },
        2
      );
      cartWithItem = addItemToCart(cart, item);
    });

    it('should_update_quantity_when_valid_amount', () => {
      const updatedCart = updateItemQuantity(cartWithItem, 'prod-123', 5);

      expect(updatedCart.items[0].quantity).toBe(5);
    });

    it('should_remove_item_when_quantity_is_zero', () => {
      const updatedCart = updateItemQuantity(cartWithItem, 'prod-123', 0);

      expect(updatedCart.items).toHaveLength(0);
    });

    it('should_remove_item_when_quantity_is_negative', () => {
      const updatedCart = updateItemQuantity(cartWithItem, 'prod-123', -1);

      expect(updatedCart.items).toHaveLength(0);
    });

    it('should_cap_quantity_at_99', () => {
      const updatedCart = updateItemQuantity(cartWithItem, 'prod-123', 150);

      expect(updatedCart.items[0].quantity).toBe(99);
    });
  });

  describe('removeItemFromCart', () => {
    it('should_remove_specified_item', () => {
      const cart = createCart();
      const item1 = createCartItem('prod-1', 'Product 1', 'url1', { amount: 100, currency: 'USD' }, 1);
      const item2 = createCartItem('prod-2', 'Product 2', 'url2', { amount: 200, currency: 'USD' }, 1);

      let cartWithItems = addItemToCart(cart, item1);
      cartWithItems = addItemToCart(cartWithItems, item2);

      const updatedCart = removeItemFromCart(cartWithItems, 'prod-1');

      expect(updatedCart.items).toHaveLength(1);
      expect(updatedCart.items[0].productId).toBe('prod-2');
    });

    it('should_return_same_items_when_product_not_found', () => {
      const cart = createCart();
      const item = createCartItem('prod-1', 'Product 1', 'url1', { amount: 100, currency: 'USD' }, 1);
      const cartWithItem = addItemToCart(cart, item);

      const updatedCart = removeItemFromCart(cartWithItem, 'nonexistent');

      expect(updatedCart.items).toHaveLength(1);
    });
  });

  describe('clearCart', () => {
    it('should_remove_all_items', () => {
      const cart = createCart();
      const item1 = createCartItem('prod-1', 'Product 1', 'url1', { amount: 100, currency: 'USD' }, 1);
      const item2 = createCartItem('prod-2', 'Product 2', 'url2', { amount: 200, currency: 'USD' }, 1);

      let cartWithItems = addItemToCart(cart, item1);
      cartWithItems = addItemToCart(cartWithItems, item2);

      const clearedCart = clearCart(cartWithItems);

      expect(clearedCart.items).toHaveLength(0);
      expect(clearedCart.id).toBe(cartWithItems.id); // Same cart
    });
  });

  describe('mergeCarts', () => {
    it('should_combine_items_from_both_carts', () => {
      const cart1 = createCart('user-1');
      const cart2 = createCart();

      const item1 = createCartItem('prod-1', 'Product 1', 'url1', { amount: 100, currency: 'USD' }, 1);
      const item2 = createCartItem('prod-2', 'Product 2', 'url2', { amount: 200, currency: 'USD' }, 2);

      const cartWithItem1 = addItemToCart(cart1, item1);
      const cartWithItem2 = addItemToCart(cart2, item2);

      const merged = mergeCarts(cartWithItem1, cartWithItem2);

      expect(merged.items).toHaveLength(2);
      expect(merged.userId).toBe('user-1'); // Keeps target cart's userId
    });

    it('should_combine_quantities_for_same_product', () => {
      const cart1 = createCart();
      const cart2 = createCart();

      const item1 = createCartItem('prod-1', 'Product 1', 'url1', { amount: 100, currency: 'USD' }, 2);
      const item2 = createCartItem('prod-1', 'Product 1', 'url1', { amount: 100, currency: 'USD' }, 3);

      const cartWithItem1 = addItemToCart(cart1, item1);
      const cartWithItem2 = addItemToCart(cart2, item2);

      const merged = mergeCarts(cartWithItem1, cartWithItem2);

      expect(merged.items).toHaveLength(1);
      expect(merged.items[0].quantity).toBe(5);
    });
  });

  describe('calculateCartTotals', () => {
    it('should_calculate_correct_subtotal', () => {
      const cart = createCart();
      const item1 = createCartItem('prod-1', 'Product 1', 'url1', { amount: 1000, currency: 'USD' }, 2);
      const item2 = createCartItem('prod-2', 'Product 2', 'url2', { amount: 500, currency: 'USD' }, 3);

      let cartWithItems = addItemToCart(cart, item1);
      cartWithItems = addItemToCart(cartWithItems, item2);

      const totals = calculateCartTotals(cartWithItems);

      // 2 * 1000 + 3 * 500 = 3500
      expect(totals.subtotal.amount).toBe(3500);
      expect(totals.itemCount).toBe(5);
    });

    it('should_return_zero_totals_for_empty_cart', () => {
      const cart = createCart();
      const totals = calculateCartTotals(cart);

      expect(totals.subtotal.amount).toBe(0);
      expect(totals.itemCount).toBe(0);
    });
  });
});
