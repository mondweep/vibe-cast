import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { hybridRetrieve, formatContext } from "@/lib/rag/retrieval";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are the AWS Advanced Networking Course assistant — a knowledgeable, precise tutor helping students, teachers, and cloud practitioners master AWS networking concepts in preparation for real-world work and the ANS-C01 certification.

You have access to the full course content: 10 modules covering VPC deep dive, hybrid connectivity, Transit Gateway, DNS, load balancing, network security, monitoring, automation, multi-account architecture, and BGP mastery.

Guidelines:
- Answer based primarily on the provided course content context
- Be precise — AWS networking has exact behaviours that matter in production and exams
- When comparing services (e.g. VPC peering vs TGW), give the decision criteria clearly
- Flag ANS-C01 exam traps or high-frequency topics when relevant
- If the answer spans multiple modules, reference them (e.g. "M01 covers this, M10 has the exam strategy")
- For architecture questions, follow the DDD approach: identify the constraint first, then the pattern
- Keep answers focused and scannable — use bullets and short sections, not walls of text
- If you don't know something, say so clearly rather than hallucinating AWS behaviour`;

export async function POST(req: NextRequest) {
  try {
    const { messages, moduleContext, persona } = await req.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
      moduleContext?: string;
      persona?: string;
    };

    const lastUserMessage = messages.findLast(m => m.role === "user")?.content ?? "";
    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message" }, { status: 400 });
    }

    // ── GraphRAG retrieval ────────────────────────────────────
    let contextBlock = "";
    let retrievalMeta = { chunkCount: 0, nodeCount: 0 };

    try {
      const result = await hybridRetrieve(lastUserMessage, moduleContext);
      contextBlock = formatContext(result);
      retrievalMeta = {
        chunkCount: result.chunks.length,
        nodeCount: result.graphNodes.length,
      };
    } catch (err) {
      console.warn("Retrieval failed, continuing without context:", err);
    }

    // ── Build messages for Claude ─────────────────────────────
    const personaNote = persona
      ? `\nThe learner's persona is: **${persona}**. Tailor depth accordingly (student = more explanation, practitioner = concise reference, teacher = include teaching notes).`
      : "";

    const contextNote = contextBlock
      ? `\n\nHere is the relevant course content and knowledge graph context:\n\n${contextBlock}`
      : "";

    const systemWithContext = SYSTEM_PROMPT + personaNote + contextNote;

    // ── Stream response from Claude ───────────────────────────
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send retrieval metadata first
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "meta", ...retrievalMeta })}\n\n`
            )
          );

          const anthropicStream = anthropic.messages.stream({
            model: "claude-sonnet-4-5-20251022",
            max_tokens: 1024,
            system: systemWithContext,
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
          });

          for await (const chunk of anthropicStream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", text: chunk.delta.text })}\n\n`
                )
              );
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: String(err) })}\n\n`
            )
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
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
