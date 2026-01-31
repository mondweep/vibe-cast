/**
 * Catalog Domain Service
 * Manages products, categories, and brands
 */

import { prisma } from '@/lib/prisma';
import type {
  Product,
  Category,
  CreateProductInput,
  PaginatedResult,
  Pagination,
} from '@/types';

export class CatalogService {
  /**
   * Get paginated list of active products
   */
  async getProducts(
    pagination: Pagination,
    filters?: {
      categoryId?: string;
      brandId?: string;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
    }
  ): Promise<PaginatedResult<Product>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ACTIVE',
    };

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.brandId) {
      where.brandId = filters.brandId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          variants: true,
          category: true,
          brand: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: products.map(this.mapProductToDto),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
        category: true,
        brand: true,
        reviews: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    return product ? this.mapProductToDto(product) : null;
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        isFeatured: true,
      },
      include: {
        images: { where: { isPrimary: true } },
        variants: true,
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    return products.map(this.mapProductToDto);
  }

  /**
   * Get all active categories
   */
  async getCategories(): Promise<Category[]> {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      imageUrl: cat.imageUrl,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    }));
  }

  /**
   * Get category by slug with products
   */
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        children: { where: { isActive: true } },
      },
    });

    return category
      ? {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          imageUrl: category.imageUrl,
          parentId: category.parentId,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
        }
      : null;
  }

  /**
   * Create a new product (admin)
   */
  async createProduct(input: CreateProductInput): Promise<Product> {
    const product = await prisma.product.create({
      data: {
        sku: input.sku,
        name: input.name,
        slug: input.slug,
        description: input.description,
        price: input.price,
        comparePrice: input.comparePrice,
        categoryId: input.categoryId,
        brandId: input.brandId,
        status: input.status,
        isFeatured: input.isFeatured,
      },
      include: {
        images: true,
        variants: true,
        category: true,
        brand: true,
      },
    });

    return this.mapProductToDto(product);
  }

  /**
   * Search products with full-text search
   */
  async searchProducts(
    query: string,
    limit: number = 10
  ): Promise<Product[]> {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        images: { where: { isPrimary: true } },
      },
      take: limit,
    });

    return products.map(this.mapProductToDto);
  }

  private mapProductToDto(product: any): Product {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: Number(product.price),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : null,
      status: product.status,
      isFeatured: product.isFeatured,
      categoryId: product.categoryId,
      brandId: product.brandId,
      images: product.images?.map((img: any) => ({
        id: img.id,
        url: img.url,
        altText: img.altText,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })) || [],
      variants: product.variants?.map((v: any) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        price: Number(v.price),
        attributes: v.attributes,
      })) || [],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}

export const catalogService = new CatalogService();
