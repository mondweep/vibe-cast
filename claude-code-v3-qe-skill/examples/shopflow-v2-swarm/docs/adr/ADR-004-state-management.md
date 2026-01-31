# ADR-004: Zustand for Client-Side State Management

## Status
Accepted

## Context
ShopFlow V2 frontend needs to manage:
- Shopping cart state (persisted)
- User session/auth state
- UI state (modals, filters, etc.)
- Cached server data

Requirements:
- TypeScript support
- React 18 compatibility
- Minimal boilerplate
- DevTools support
- SSR compatibility with Next.js

## Decision
Use **Zustand** for global client state with the following structure:

```typescript
// Store slices
src/lib/stores/
├── cart.ts      # Cart state with localStorage persistence
├── auth.ts      # Auth state with session management
├── ui.ts        # UI state (modals, toasts, etc.)
└── index.ts     # Combined store exports
```

### Implementation Pattern

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartStore {
  items: CartItem[];
  addItem: (item: AddToCartInput) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => ({
        items: [...state.items, item]
      })),
      // ...
    }),
    { name: 'cart-storage' }
  )
);
```

### Server State
Use React Query / TanStack Query for server state caching separately from Zustand.

## Consequences

### Positive
- Minimal bundle size (~1KB)
- No context providers needed
- Simple, intuitive API
- Built-in persistence middleware
- Excellent TypeScript inference

### Negative
- Less structured than Redux for large teams
- No built-in action logging (need middleware)
- Fewer ecosystem tools than Redux

## Alternatives Considered
1. **Redux Toolkit**: Too much boilerplate for our needs
2. **Jotai**: Good but less intuitive for complex state
3. **Recoil**: Facebook-specific, uncertain future
4. **React Context**: Performance issues with frequent updates

## References
- Zustand Documentation
- React State Management Patterns
