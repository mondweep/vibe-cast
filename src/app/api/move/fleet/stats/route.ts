import { NextResponse } from 'next/server';
import { generateFleetStats } from '@/lib/mock-data';

export async function GET() {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const stats = generateFleetStats();
    return NextResponse.json(stats);
}
