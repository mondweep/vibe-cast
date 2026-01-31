/**
 * Products API Route
 * GET /api/products - List products with pagination and filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { catalogService } from '@/domains/catalog/service';
import { PaginationSchema } from '@/types';
import { z } from 'zod';

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  brand: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = QuerySchema.parse(searchParams);

    const result = await catalogService.getProducts(
      { page: query.page, limit: query.limit },
      {
        categoryId: query.category,
        brandId: query.brand,
        search: query.search,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
      }
    );

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      },
    });
  } catch (error) {
    console.error('GET /api/products error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch products',
        },
      },
      { status: 500 }
    );
  }
}
