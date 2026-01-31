/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe - Handle Stripe events
 */

import { NextRequest, NextResponse } from 'next/server';
import { paymentsService } from '@/domains/payments/service';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    await paymentsService.handleWebhook(
      Buffer.from(payload),
      signature
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Disable body parsing for raw webhook payload
export const config = {
  api: {
    bodyParser: false,
  },
};
