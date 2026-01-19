import { NextResponse } from 'next/server';
import { MOCK_ESIM_PROFILES } from '../../../../../lib/mock-data';

export async function GET() {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json(MOCK_ESIM_PROFILES);
}
