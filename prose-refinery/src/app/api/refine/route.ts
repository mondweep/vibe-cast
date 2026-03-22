import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { RefineRequest } from "@/lib/types";
import { refineText } from "@/lib/refine";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RefineRequest;

    if (!body.text || !body.pass || !body.genre) {
      return NextResponse.json(
        { error: "Missing required fields: text, pass, genre" },
        { status: 400 }
      );
    }

    const validPasses = ["clarity", "conciseness", "structure", "tone", "iterate"];
    if (!validPasses.includes(body.pass)) {
      return NextResponse.json(
        { error: `Invalid pass. Must be one of: ${validPasses.join(", ")}` },
        { status: 400 }
      );
    }

    const validGenres = ["essay", "technical", "journalism", "academic", "business"];
    if (!validGenres.includes(body.genre)) {
      return NextResponse.json(
        { error: `Invalid genre. Must be one of: ${validGenres.join(", ")}` },
        { status: 400 }
      );
    }

    if (body.pass === "tone" && (!body.options?.audience || !body.options?.tone)) {
      return NextResponse.json(
        { error: "Tone pass requires options.audience and options.tone" },
        { status: 400 }
      );
    }

    const result = await refineText(body, client);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Refine API error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
