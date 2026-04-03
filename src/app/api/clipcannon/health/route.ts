import { NextResponse } from "next/server";

const CLIPCANNON_URL = process.env.CLIPCANNON_URL || "http://localhost:8765";

export async function GET() {
  try {
    const res = await fetch(`${CLIPCANNON_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        status: "connected",
        version: data.version || "ClipCannon MCP Server",
        tools: data.tools_count || 51,
      });
    }

    return NextResponse.json(
      { status: "error", message: "Server responded with error" },
      { status: 502 }
    );
  } catch {
    return NextResponse.json(
      {
        status: "disconnected",
        message:
          "ClipCannon MCP server not reachable. Start it with: clipcannon --http --port 8765",
        setup: "pip install -e . && clipcannon --http --port 8765",
      },
      { status: 503 }
    );
  }
}
