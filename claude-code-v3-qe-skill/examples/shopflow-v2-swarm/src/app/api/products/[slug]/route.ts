/**
 * Product Detail API Route
 * GET /api/products/[slug] - Get product by slug
 */

import { NextRequest, NextResponse } from 'next/server';
import { catalogService } from '@/domains/catalog/service';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const product = await catalogService.getProductBySlug(params.slug);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(`GET /api/products/${params.slug} error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch product',
        },
      },
      { status: 500 }
    );
  }
}
