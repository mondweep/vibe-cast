import { NextRequest, NextResponse } from "next/server";
import { hybridRetrieve, formatContext } from "@/lib/rag/retrieval";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are the AWS Advanced Networking Course assistant — a knowledgeable, precise tutor helping students, teachers, and cloud practitioners master AWS networking for real-world work and the ANS-C01 certification.

You have access to 10 modules covering: VPC deep dive, hybrid connectivity, Transit Gateway, DNS, load balancing, network security, monitoring, automation, multi-account architecture, and BGP mastery.

Guidelines:
- Answer based primarily on the provided course content context
- Be precise — AWS networking has exact behaviours that matter in production and exams  
- When comparing services (e.g. VPC peering vs TGW), give clear decision criteria
- Flag ANS-C01 exam traps or high-frequency topics when relevant
- Reference modules when relevant (e.g. "M05 covers this in detail")
- Keep answers focused and scannable — use bullets and short sections
- If you genuinely don't know, say so rather than hallucinating AWS behaviour`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
      moduleContext?: string;
      persona?: string;
    };

    const { messages, moduleContext, persona } = body;
    const lastUserMessage = messages.findLast(m => m.role === "user")?.content ?? "";

    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message" }, { status: 400 });
    }

    // Check API key early — return clear error if missing
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    // ── GraphRAG retrieval (non-blocking — chat still works without it) ──
    let contextBlock = "";
    let retrievalMeta = { chunkCount: 0, nodeCount: 0 };

    try {
      const result = await hybridRetrieve(lastUserMessage, moduleContext);
      contextBlock = formatContext(result);
      retrievalMeta = { chunkCount: result.chunks.length, nodeCount: result.graphNodes.length };
      console.log(`[chat] Retrieved ${result.chunks.length} chunks, ${result.graphNodes.length} graph nodes`);
    } catch (err) {
      console.warn("[chat] Retrieval failed, proceeding without context:", err);
    }

    // ── System prompt with context + persona ──────────────────
    const personaNote = persona
      ? `\nLearner persona: **${persona}**. Adjust accordingly — student: explain clearly; practitioner: be concise and reference-focused; teacher: include teaching angles.`
      : "";
    const contextNote = contextBlock
      ? `\n\nRelevant course content and knowledge graph context:\n\n${contextBlock}`
      : "";
    const systemWithContext = SYSTEM_PROMPT + personaNote + contextNote;

    // ── Stream from Anthropic ─────────────────────────────────
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send retrieval metadata first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "meta", ...retrievalMeta })}\n\n`)
          );

          const anthropicStream = anthropic.messages.stream({
            model: "claude-sonnet-4-5-20251022",
            max_tokens: 1024,
            system: systemWithContext,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
          });

          for await (const chunk of anthropicStream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", text: chunk.delta.text })}\n\n`)
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("[chat] Streaming error:", err);
          const errMsg = err instanceof Error ? err.message : String(err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", error: errMsg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });

  } catch (err) {
    console.error("[chat] Request error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
