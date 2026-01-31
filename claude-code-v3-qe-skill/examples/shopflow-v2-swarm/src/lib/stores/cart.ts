/**
 * Cart Store - Zustand with persistence
 * ADR-004: Zustand for Client-Side State Management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, AddToCartInput } from '@/types';

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addItem: (input: AddToCartInput & { product: CartItem['product']; variant?: CartItem['variant'] }) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;

  // Computed
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,

      addItem: (input) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) =>
              item.productId === input.productId &&
              item.variantId === (input.variantId || null)
          );

          if (existingIndex >= 0) {
            // Update quantity of existing item
            const updatedItems = [...state.items];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + input.quantity,
            };
            return { items: updatedItems };
          }

          // Add new item
          const newItem: CartItem = {
            id: `${input.productId}-${input.variantId || 'default'}-${Date.now()}`,
            productId: input.productId,
            variantId: input.variantId || null,
            quantity: input.quantity,
            product: input.product,
            variant: input.variant || null,
          };

          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          const price = item.variant?.price ?? item.product.price;
          return sum + price * item.quantity;
        }, 0);
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'shopflow-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
