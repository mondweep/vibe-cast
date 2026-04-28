import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hybridRetrieve, formatContext } from "@/lib/rag/retrieval";

export const dynamic    = "force-dynamic";
export const runtime    = "nodejs";
export const maxDuration = 60;   // raised to 60s to allow for save after stream

const INPUT_COST_PER_TOKEN  = 1.00 / 1_000_000;   // $1.00/MTok  (Haiku 4.5)
const OUTPUT_COST_PER_TOKEN = 5.00 / 1_000_000;   // $5.00/MTok

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

const SYSTEM_PROMPT = `You are the AWS Advanced Networking Course assistant — a knowledgeable, precise tutor helping students, teachers, and cloud practitioners master AWS networking for real-world work and the ANS-C01 certification.

You have access to 10 modules: VPC deep dive, hybrid connectivity, Transit Gateway, DNS, load balancing, network security, monitoring, automation, multi-account architecture, and BGP mastery.

Guidelines:
- Answer based on the provided course content context
- Be precise — AWS networking has exact behaviours that matter in production and exams
- When comparing services, give clear decision criteria
- Flag ANS-C01 exam traps when relevant
- Keep answers focused and scannable — use bullets and short sections
- If you genuinely don't know, say so rather than hallucinating`;

export async function POST(req: NextRequest) {
  try {
    const { messages, moduleContext, persona, sessionKey } = await req.json() as {
      messages:      { role: "user" | "assistant"; content: string }[];
      moduleContext?: string;
      persona?:      string;
      sessionKey?:   string;
    };

    const lastUserMessage = messages.findLast(m => m.role === "user")?.content ?? "";
    if (!lastUserMessage) return NextResponse.json({ error: "No user message" }, { status: 400 });

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY missing" }, { status: 500 });

    // ── Vercel geo headers ────────────────────────────────────
    const country = req.headers.get("x-vercel-ip-country") ?? "Unknown";
    const city    = req.headers.get("x-vercel-ip-city")    ?? null;
    const region  = req.headers.get("x-vercel-ip-region")  ?? null;

    // ── GraphRAG retrieval ────────────────────────────────────
    let contextBlock   = "";
    let chunkCount     = 0;
    let nodeCount      = 0;
    let topicLabels: string[] = [];

    try {
      const result = await hybridRetrieve(lastUserMessage, moduleContext);
      contextBlock = formatContext(result);
      chunkCount   = result.chunks.length;
      nodeCount    = result.graphNodes.length;
      topicLabels  = result.graphNodes.map(n => n.label).slice(0, 10);
    } catch (err) {
      console.warn("[chat] Retrieval failed:", err);
    }

    const systemWithContext = SYSTEM_PROMPT
      + (persona ? `\nLearner persona: ${persona}. Adjust depth accordingly.` : "")
      + (contextBlock ? `\n\nCourse context:\n\n${contextBlock}` : "");

    // ── Upsert session (before streaming) ────────────────────
    const db  = getDb();
    const key = sessionKey ?? `anon-${Date.now()}`;
    let sessionId: string | null = null;

    try {
      const { data, error } = await db
        .from("chat_sessions")
        .upsert({
          session_key:   key,
          persona:       persona ?? null,
          module_id:     moduleContext ?? null,
          country,
          city,
          region,
          updated_at:    new Date().toISOString(),
        }, { onConflict: "session_key" })
        .select("id")
        .single();

      if (error) console.error("[chat] Session upsert error:", error.message);
      else       sessionId = data?.id ?? null;
    } catch (e) {
      console.error("[chat] Session save threw:", e);
    }

    // ── Collect full response + token counts ─────────────────
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client    = new Anthropic({ apiKey: anthropicKey });

    // Use non-streaming to get token counts reliably, then stream to client
    const response = await client.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:     systemWithContext,
      messages:   messages.map(m => ({ role: m.role, content: m.content })),
    });

    const fullText    = response.content.filter(b => b.type === "text").map(b => (b as {type:"text";text:string}).text).join("");
    const inputTokens  = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const costUsd      = (inputTokens * INPUT_COST_PER_TOKEN) + (outputTokens * OUTPUT_COST_PER_TOKEN);

    // ── Save messages to Supabase ─────────────────────────────
    if (sessionId) {
      try {
        await db.from("chat_messages").insert([
          {
            session_id: sessionId,
            role:       "user",
            content:    lastUserMessage,
            context: {
              topics:         topicLabels,
              chunk_count:    chunkCount,
              graph_nodes:    nodeCount,
              module_context: moduleContext ?? null,
            },
          },
          {
            session_id: sessionId,
            role:       "assistant",
            content:    fullText,
            context: {
              input_tokens:   inputTokens,
              output_tokens:  outputTokens,
              cost_usd:       costUsd,
              topics:         topicLabels,
              chunks_used:    chunkCount,
              graph_nodes:    nodeCount,
              module_context: moduleContext ?? null,
            },
          },
        ]);

        // Update session running totals
        const { data: curr } = await db
          .from("chat_sessions")
          .select("total_cost_usd, message_count")
          .eq("id", sessionId)
          .single();

        await db.from("chat_sessions").update({
          total_cost_usd: (curr?.total_cost_usd ?? 0) + costUsd,
          message_count:  (curr?.message_count  ?? 0) + 2,
          updated_at:     new Date().toISOString(),
        }).eq("id", sessionId);

        console.log(`[chat] Saved | session=${sessionId} | cost=$${costUsd.toFixed(5)} | topics=${topicLabels.join(",")}`);
      } catch (e) {
        console.error("[chat] Message save error:", e);
      }
    }

    // ── Stream the collected response to the client ───────────
    const encoder = new TextEncoder();
    const stream  = new ReadableStream({
      start(controller) {
        // Send retrieval metadata
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: "meta", chunkCount, nodeCount })}\n\n`
        ));

        // Stream the full response word by word (~20 chars per chunk for smooth UX)
        const CHUNK_SIZE = 20;
        for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "text", text: fullText.slice(i, i + CHUNK_SIZE) })}\n\n`
          ));
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type":      "text/event-stream",
        "Cache-Control":     "no-cache",
        "Connection":        "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });

  } catch (err) {
    console.error("[chat] Fatal error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
