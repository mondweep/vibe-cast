import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const body = await request.json();
    const { profileId } = body;

    if (!profileId) {
        return NextResponse.json({ error: 'Profile ID required' }, { status: 400 });
    }

    // Simulate a long provisioning process
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return NextResponse.json({
        success: true,
        message: `Profile ${profileId} downloaded and enabled successfully.`,
        iccid: `89${Math.floor(Math.random() * 100000000000000000)}`
    });
}
