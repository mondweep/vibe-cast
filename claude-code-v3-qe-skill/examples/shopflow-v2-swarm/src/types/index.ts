/**
 * ShopFlow V2 - Core Type Definitions
 * Built with Claude Flow V3 Swarm (DDD + ADR + TDD)
 */

import { z } from 'zod';

// ============================================
// COMMON VALUE OBJECTS
// ============================================

export const MoneySchema = z.object({
  amount: z.number().min(0),
  currency: z.string().length(3).default('USD'),
});
export type Money = z.infer<typeof MoneySchema>;

export const AddressSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  street: z.string().min(1).max(100),
  city: z.string().min(1).max(50),
  state: z.string().min(1).max(50),
  postalCode: z.string().min(1).max(20),
  country: z.string().length(2).default('US'),
});
export type Address = z.infer<typeof AddressSchema>;

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================
// USER DOMAIN TYPES
// ============================================

export const UserRoleSchema = z.enum(['CUSTOMER', 'ADMIN', 'SUPER_ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UserSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: UserRoleSchema,
  emailVerified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

// ============================================
// CATALOG DOMAIN TYPES
// ============================================

export const ProductStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

export const ProductImageSchema = z.object({
  id: z.string().cuid(),
  url: z.string().url(),
  altText: z.string().nullable(),
  sortOrder: z.number().int().min(0),
  isPrimary: z.boolean(),
});
export type ProductImage = z.infer<typeof ProductImageSchema>;

export const ProductVariantSchema = z.object({
  id: z.string().cuid(),
  sku: z.string(),
  name: z.string(),
  price: z.number().min(0),
  attributes: z.record(z.string()),
});
export type ProductVariant = z.infer<typeof ProductVariantSchema>;

export const ProductSchema = z.object({
  id: z.string().cuid(),
  sku: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  price: z.number().min(0),
  comparePrice: z.number().nullable(),
  status: ProductStatusSchema,
  isFeatured: z.boolean(),
  categoryId: z.string().cuid(),
  brandId: z.string().cuid().nullable(),
  images: z.array(ProductImageSchema),
  variants: z.array(ProductVariantSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Product = z.infer<typeof ProductSchema>;

export const CreateProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  price: z.number().min(0),
  comparePrice: z.number().min(0).optional(),
  categoryId: z.string().cuid(),
  brandId: z.string().cuid().optional(),
  status: ProductStatusSchema.default('DRAFT'),
  isFeatured: z.boolean().default(false),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const CategorySchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  parentId: z.string().cuid().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});
export type Category = z.infer<typeof CategorySchema>;

// ============================================
// CART DOMAIN TYPES
// ============================================

export const CartItemSchema = z.object({
  id: z.string().cuid(),
  productId: z.string().cuid(),
  variantId: z.string().cuid().nullable(),
  quantity: z.number().int().min(1),
  product: ProductSchema.pick({
    id: true,
    name: true,
    slug: true,
    price: true,
    images: true
  }),
  variant: ProductVariantSchema.nullable(),
});
export type CartItem = z.infer<typeof CartItemSchema>;

export const CartSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid().nullable(),
  sessionId: z.string().nullable(),
  items: z.array(CartItemSchema),
  subtotal: z.number().min(0),
  itemCount: z.number().int().min(0),
  expiresAt: z.date(),
});
export type Cart = z.infer<typeof CartSchema>;

export const AddToCartSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional(),
  quantity: z.number().int().min(1).default(1),
});
export type AddToCartInput = z.infer<typeof AddToCartSchema>;

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(0),
});
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;

// ============================================
// ORDER DOMAIN TYPES
// ============================================

export const OrderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderItemSchema = z.object({
  id: z.string().cuid(),
  productId: z.string().cuid(),
  variantId: z.string().cuid().nullable(),
  productName: z.string(),
  variantName: z.string().nullable(),
  sku: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string().cuid(),
  orderNumber: z.string(),
  userId: z.string().cuid(),
  status: OrderStatusSchema,
  items: z.array(OrderItemSchema),
  subtotal: z.number().min(0),
  shippingAmount: z.number().min(0),
  taxAmount: z.number().min(0),
  discountAmount: z.number().min(0),
  total: z.number().min(0),
  currency: z.string().length(3),
  shippingAddress: AddressSchema,
  placedAt: z.date(),
  updatedAt: z.date(),
});
export type Order = z.infer<typeof OrderSchema>;

export const CreateOrderSchema = z.object({
  addressId: z.string().cuid(),
  notes: z.string().max(500).optional(),
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// ============================================
// PAYMENT DOMAIN TYPES
// ============================================

export const PaymentStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const PaymentMethodSchema = z.enum(['CARD', 'BANK_TRANSFER', 'WALLET']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentSchema = z.object({
  id: z.string().cuid(),
  orderId: z.string().cuid(),
  stripePaymentId: z.string().nullable(),
  amount: z.number().min(0),
  currency: z.string().length(3),
  status: PaymentStatusSchema,
  method: PaymentMethodSchema,
  createdAt: z.date(),
});
export type Payment = z.infer<typeof PaymentSchema>;

export const CreatePaymentIntentSchema = z.object({
  orderId: z.string().cuid(),
  amount: z.number().min(0),
  currency: z.string().length(3).default('USD'),
});
export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>;

// ============================================
// INVENTORY DOMAIN TYPES
// ============================================

export const MovementTypeSchema = z.enum([
  'RECEIVED',
  'SOLD',
  'RESERVED',
  'RELEASED',
  'ADJUSTED',
  'RETURNED',
  'DAMAGED',
]);
export type MovementType = z.infer<typeof MovementTypeSchema>;

export const InventorySchema = z.object({
  id: z.string().cuid(),
  productId: z.string().cuid(),
  variantId: z.string().cuid().nullable(),
  warehouseId: z.string().cuid(),
  quantity: z.number().int().min(0),
  reservedQty: z.number().int().min(0),
  availableQty: z.number().int(),
  reorderPoint: z.number().int().min(0),
  reorderQuantity: z.number().int().min(0),
});
export type Inventory = z.infer<typeof InventorySchema>;

export const InventoryMovementSchema = z.object({
  id: z.string().cuid(),
  inventoryId: z.string().cuid(),
  type: MovementTypeSchema,
  quantity: z.number().int(),
  reference: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
});
export type InventoryMovement = z.infer<typeof InventoryMovementSchema>;

export const AdjustInventorySchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional(),
  warehouseId: z.string().cuid(),
  quantity: z.number().int(),
  type: MovementTypeSchema,
  reference: z.string().optional(),
  notes: z.string().optional(),
});
export type AdjustInventoryInput = z.infer<typeof AdjustInventorySchema>;

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

// ============================================
// DOMAIN EVENTS
// ============================================

export interface DomainEvent<T = unknown> {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  payload: T;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

export type OrderPlacedEvent = DomainEvent<{
  orderId: string;
  userId: string;
  total: number;
  itemCount: number;
}>;

export type PaymentSucceededEvent = DomainEvent<{
  paymentId: string;
  orderId: string;
  amount: number;
}>;

export type InventoryReservedEvent = DomainEvent<{
  orderId: string;
  items: Array<{ productId: string; quantity: number }>;
}>;

export type OrderShippedEvent = DomainEvent<{
  orderId: string;
  shipmentId: string;
  carrier: string;
  trackingNumber: string;
}>;
