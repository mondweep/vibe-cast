/**
 * Client-side State Store (Zustand)
 *
 * Manages cart UI state and syncs with server
 */

import { create } from 'zustand';
import type { CartItem } from '@/domains/cart/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setItems: (items: CartItem[]) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API actions
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isOpen: false,
  isLoading: false,
  error: null,

  setItems: (items) => set({ items }),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/cart');
      const data = await res.json();
      if (res.ok) {
        set({ items: data.items || [] });
      } else {
        set({ error: data.error || 'Failed to fetch cart' });
      }
    } catch (err) {
      set({ error: 'Network error' });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, quantity = 1) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();
      if (res.ok) {
        set({ items: data.cart.items, isOpen: true });
      } else {
        set({ error: data.error || 'Failed to add item' });
      }
    } catch (err) {
      set({ error: 'Network error' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateQuantity: async (productId, quantity) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();
      if (res.ok) {
        set({ items: data.cart.items });
      } else {
        set({ error: data.error || 'Failed to update quantity' });
      }
    } catch (err) {
      set({ error: 'Network error' });
    } finally {
      set({ isLoading: false });
    }
  },

  removeItem: async (productId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (res.ok) {
        set({ items: data.cart.items });
      } else {
        set({ error: data.error || 'Failed to remove item' });
      }
    } catch (err) {
      set({ error: 'Network error' });
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Computed values
export function useCartTotals() {
  const items = useCartStore((state) => state.items);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice.amount * item.quantity,
    0
  );

  return { itemCount, subtotal };
}
