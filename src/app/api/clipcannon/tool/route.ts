import { NextRequest, NextResponse } from "next/server";

const CLIPCANNON_URL = process.env.CLIPCANNON_URL || "http://localhost:8765";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tool, params } = body;

    if (!tool) {
      return NextResponse.json(
        { success: false, error: "Missing 'tool' field" },
        { status: 400 }
      );
    }

    const res = await fetch(`${CLIPCANNON_URL}/mcp/tool`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tool,
        arguments: params || {},
      }),
      signal: AbortSignal.timeout(300000), // 5 min timeout for long operations
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { success: false, error: `ClipCannon error: ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
