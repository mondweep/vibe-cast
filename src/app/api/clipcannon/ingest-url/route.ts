import { NextRequest, NextResponse } from "next/server";

const CLIPCANNON_URL = process.env.CLIPCANNON_URL || "http://localhost:8765";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Call ClipCannon's ingest tool with the URL
    const res = await fetch(`${CLIPCANNON_URL}/mcp/tool`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "clipcannon_ingest",
        arguments: { source: url },
      }),
      signal: AbortSignal.timeout(300000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Ingest failed: ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      projectId: data.project_id || data.id || "project-1",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
