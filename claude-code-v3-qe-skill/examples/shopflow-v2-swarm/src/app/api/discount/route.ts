import { NextRequest, NextResponse } from 'next/server';

// Discount codes - in production, store these in the database
const DISCOUNT_CODES: Record<string, { percentage: number; description: string }> = {
  'FREEORDER': { percentage: 100, description: '100% off - Free order!' },
  'HALF50': { percentage: 50, description: '50% off your order' },
  'SAVE20': { percentage: 20, description: '20% off your order' },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Discount code is required' },
        { status: 400 }
      );
    }

    const discount = DISCOUNT_CODES[code.toUpperCase()];

    if (!discount) {
      return NextResponse.json(
        { error: 'Invalid discount code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      code: code.toUpperCase(),
      percentage: discount.percentage,
      description: discount.description,
    });
  } catch (error) {
    console.error('Discount validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate discount code' },
      { status: 500 }
    );
  }
}
