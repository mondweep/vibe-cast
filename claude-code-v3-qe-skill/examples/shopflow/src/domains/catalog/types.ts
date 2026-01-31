/**
 * Catalog Domain - Bounded Context
 *
 * Aggregate: Product
 * Entities: Product, Category
 * Value Objects: Money, ProductImage, ProductVariant
 */

import { z } from 'zod';

// Value Objects
export const MoneySchema = z.object({
  amount: z.number().int().min(0), // Cents
  currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
});
export type Money = z.infer<typeof MoneySchema>;

export const ProductImageSchema = z.object({
  url: z.string().url(),
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type ProductImage = z.infer<typeof ProductImageSchema>;

// Entity: Category
export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  parentId: z.string().uuid().nullable(),
});
export type Category = z.infer<typeof CategorySchema>;

// Aggregate Root: Product
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string(),
  price: MoneySchema,
  compareAtPrice: MoneySchema.nullable(), // Original price for sales
  images: z.array(ProductImageSchema).min(1),
  categoryId: z.string().uuid(),
  tags: z.array(z.string()),
  // Inventory (read from Inventory bounded context)
  stockAvailable: z.number().int().min(0),
  // Metadata
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Product = z.infer<typeof ProductSchema>;

// Domain Events
export type CatalogDomainEvent =
  | { type: 'ProductCreated'; payload: Product }
  | { type: 'ProductUpdated'; payload: { id: string; changes: Partial<Product> } }
  | { type: 'ProductDeleted'; payload: { id: string } }
  | { type: 'ProductStockUpdated'; payload: { id: string; stockAvailable: number } };

// Query types
export interface ProductFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  inStock?: boolean;
  search?: string;
}

export interface ProductSort {
  field: 'price' | 'name' | 'createdAt';
  direction: 'asc' | 'desc';
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Factory functions
export function createProduct(
  data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Product {
  const now = new Date();
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
}

export function formatMoney(money: Money): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currency,
  });
  return formatter.format(money.amount / 100);
}

export function calculateDiscount(product: Product): number | null {
  if (!product.compareAtPrice) return null;
  const discount =
    ((product.compareAtPrice.amount - product.price.amount) /
      product.compareAtPrice.amount) *
    100;
  return Math.round(discount);
}
