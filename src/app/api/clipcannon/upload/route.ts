import { NextRequest, NextResponse } from "next/server";

const CLIPCANNON_URL = process.env.CLIPCANNON_URL || "http://localhost:8765";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const video = formData.get("video");

    if (!video || !(video instanceof Blob)) {
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      );
    }

    // Forward the file to ClipCannon
    const forwardForm = new FormData();
    forwardForm.append("video", video);

    const res = await fetch(`${CLIPCANNON_URL}/upload`, {
      method: "POST",
      body: forwardForm,
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Upload failed: ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
