/**
 * Cart Domain - Bounded Context
 *
 * Aggregate: Cart
 * Entities: CartItem
 * Value Objects: CartId, CartTotals
 */

import { z } from 'zod';
import { MoneySchema, type Money } from '../catalog/types';

// Value Objects
export const CartIdSchema = z.string().uuid();
export type CartId = z.infer<typeof CartIdSchema>;

// Entity: CartItem
export const CartItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  productImage: z.string().url(),
  unitPrice: MoneySchema,
  quantity: z.number().int().min(1).max(99),
  addedAt: z.date(),
});
export type CartItem = z.infer<typeof CartItemSchema>;

// Value Object: Cart Totals
export const CartTotalsSchema = z.object({
  subtotal: MoneySchema,
  shipping: MoneySchema.nullable(),
  tax: MoneySchema.nullable(),
  total: MoneySchema,
  itemCount: z.number().int().min(0),
});
export type CartTotals = z.infer<typeof CartTotalsSchema>;

// Aggregate Root: Cart
export const CartSchema = z.object({
  id: CartIdSchema,
  userId: z.string().uuid().nullable(), // null for anonymous carts
  items: z.array(CartItemSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date(), // TTL for Redis
});
export type Cart = z.infer<typeof CartSchema>;

// Domain Events
export type CartDomainEvent =
  | { type: 'CartCreated'; payload: { cartId: CartId } }
  | { type: 'ProductAddedToCart'; payload: { cartId: CartId; item: CartItem } }
  | { type: 'ProductRemovedFromCart'; payload: { cartId: CartId; productId: string } }
  | { type: 'CartQuantityUpdated'; payload: { cartId: CartId; productId: string; quantity: number } }
  | { type: 'CartCleared'; payload: { cartId: CartId } }
  | { type: 'CartMerged'; payload: { fromCartId: CartId; toCartId: CartId } };

// Commands
export interface AddToCartCommand {
  cartId: CartId;
  productId: string;
  productName: string;
  productImage: string;
  unitPrice: Money;
  quantity: number;
}

export interface UpdateQuantityCommand {
  cartId: CartId;
  productId: string;
  quantity: number;
}

export interface RemoveFromCartCommand {
  cartId: CartId;
  productId: string;
}

// Factory functions
export function createCart(userId: string | null = null): Cart {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    id: crypto.randomUUID(),
    userId,
    items: [],
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };
}

export function createCartItem(
  productId: string,
  productName: string,
  productImage: string,
  unitPrice: Money,
  quantity: number
): CartItem {
  return {
    productId,
    productName,
    productImage,
    unitPrice,
    quantity,
    addedAt: new Date(),
  };
}

// Domain logic
export function calculateCartTotals(cart: Cart): CartTotals {
  const subtotal = cart.items.reduce(
    (sum, item) => sum + item.unitPrice.amount * item.quantity,
    0
  );
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const currency = cart.items[0]?.unitPrice.currency || 'USD';

  return {
    subtotal: { amount: subtotal, currency },
    shipping: null, // Calculated at checkout
    tax: null, // Calculated at checkout
    total: { amount: subtotal, currency },
    itemCount,
  };
}

export function addItemToCart(cart: Cart, item: CartItem): Cart {
  const existingIndex = cart.items.findIndex(
    (i) => i.productId === item.productId
  );

  let newItems: CartItem[];
  if (existingIndex >= 0) {
    // Update quantity
    newItems = cart.items.map((i, index) =>
      index === existingIndex
        ? { ...i, quantity: Math.min(i.quantity + item.quantity, 99) }
        : i
    );
  } else {
    // Add new item
    newItems = [...cart.items, item];
  }

  return {
    ...cart,
    items: newItems,
    updatedAt: new Date(),
  };
}

export function updateItemQuantity(
  cart: Cart,
  productId: string,
  quantity: number
): Cart {
  if (quantity <= 0) {
    return removeItemFromCart(cart, productId);
  }

  return {
    ...cart,
    items: cart.items.map((item) =>
      item.productId === productId
        ? { ...item, quantity: Math.min(quantity, 99) }
        : item
    ),
    updatedAt: new Date(),
  };
}

export function removeItemFromCart(cart: Cart, productId: string): Cart {
  return {
    ...cart,
    items: cart.items.filter((item) => item.productId !== productId),
    updatedAt: new Date(),
  };
}

export function clearCart(cart: Cart): Cart {
  return {
    ...cart,
    items: [],
    updatedAt: new Date(),
  };
}

export function mergeCarts(targetCart: Cart, sourceCart: Cart): Cart {
  let merged = { ...targetCart };

  for (const item of sourceCart.items) {
    merged = addItemToCart(merged, item);
  }

  return merged;
}
