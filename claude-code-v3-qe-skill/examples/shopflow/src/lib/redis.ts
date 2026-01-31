/**
 * Redis Client
 *
 * Used for cart persistence (ADR-003)
 * Provides fast read/write with TTL support
 */

import Redis from 'ioredis';
import type { Cart, CartItem } from '../domains/cart/types';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const CART_PREFIX = 'cart:';
const CART_TTL = 60 * 60 * 24 * 7; // 7 days

// Cart operations
export async function getCart(cartId: string): Promise<Cart | null> {
  const data = await redis.get(`${CART_PREFIX}${cartId}`);
  if (!data) return null;

  const parsed = JSON.parse(data);
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt),
    expiresAt: new Date(parsed.expiresAt),
    items: parsed.items.map((item: CartItem) => ({
      ...item,
      addedAt: new Date(item.addedAt),
    })),
  };
}

export async function saveCart(cart: Cart): Promise<void> {
  await redis.setex(
    `${CART_PREFIX}${cart.id}`,
    CART_TTL,
    JSON.stringify(cart)
  );
}

export async function deleteCart(cartId: string): Promise<void> {
  await redis.del(`${CART_PREFIX}${cartId}`);
}

// User cart mapping
export async function getUserCartId(userId: string): Promise<string | null> {
  return redis.get(`user:${userId}:cart`);
}

export async function setUserCartId(userId: string, cartId: string): Promise<void> {
  await redis.setex(`user:${userId}:cart`, CART_TTL, cartId);
}

// Session/rate limiting helpers
export async function incrementRateLimit(
  key: string,
  windowSeconds: number
): Promise<number> {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  return count;
}

export { redis };
