/**
 * Products API
 *
 * GET /api/products - List products with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const querySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  inStock: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  sort: z.enum(['price-asc', 'price-desc', 'name', 'newest']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (params.category) {
      where.category = { slug: params.category };
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.minPrice !== undefined) {
      where.priceAmount = { ...((where.priceAmount as object) || {}), gte: params.minPrice };
    }

    if (params.maxPrice !== undefined) {
      where.priceAmount = { ...((where.priceAmount as object) || {}), lte: params.maxPrice };
    }

    if (params.inStock) {
      where.stockTotal = { gt: 0 };
    }

    if (params.featured) {
      where.isFeatured = true;
    }

    const orderBy: Record<string, string> = {};
    switch (params.sort) {
      case 'price-asc':
        orderBy.priceAmount = 'asc';
        break;
      case 'price-desc':
        orderBy.priceAmount = 'desc';
        break;
      case 'name':
        orderBy.name = 'asc';
        break;
      case 'newest':
      default:
        orderBy.createdAt = 'desc';
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          images: { orderBy: { position: 'asc' }, take: 1 },
          category: { select: { name: true, slug: true } },
        },
      }),
      db.product.count({ where }),
    ]);

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: { amount: p.priceAmount, currency: p.priceCurrency },
        compareAtPrice: p.compareAtPrice
          ? { amount: p.compareAtPrice, currency: p.priceCurrency }
          : null,
        image: p.images[0] || null,
        category: p.category,
        inStock: p.stockTotal - p.stockReserved - p.stockSold > 0,
        isFeatured: p.isFeatured,
      })),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    });
  } catch (error) {
    console.error('Products API error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
