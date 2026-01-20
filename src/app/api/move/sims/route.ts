import { NextResponse } from 'next/server';
import { generateMockSims } from '../../../lib/mock-data';

export async function GET() {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    const sims = generateMockSims(200); // Generate 200 random SIMs
    return NextResponse.json(sims);
}
