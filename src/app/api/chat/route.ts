import { NextRequest, NextResponse } from "next/server";
import { hybridRetrieve, formatContext } from "@/lib/rag/retrieval";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

// Haiku 4.5 pricing (per token)
const COST_INPUT_PER_TOKEN  = 1.00 / 1_000_000;   // $1.00 / MTok
const COST_OUTPUT_PER_TOKEN = 5.00 / 1_000_000;   // $5.00 / MTok

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}

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
      sessionKey?: string;
    };

    const { messages, moduleContext, persona, sessionKey } = body;
    const lastUserMessage = messages.findLast(m => m.role === "user")?.content ?? "";

    if (!lastUserMessage) {
      return NextResponse.json({ error: "No user message" }, { status: 400 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    // ── Geo headers from Vercel ───────────────────────────────
    const country = req.headers.get("x-vercel-ip-country") ?? null;
    const city    = req.headers.get("x-vercel-ip-city")    ?? null;
    const region  = req.headers.get("x-vercel-ip-region")  ?? null;

    // ── GraphRAG retrieval ────────────────────────────────────
    let contextBlock = "";
    let retrievalMeta = { chunkCount: 0, nodeCount: 0 };
    let topicLabels: string[] = [];

    try {
      const result = await hybridRetrieve(lastUserMessage, moduleContext);
      contextBlock = formatContext(result);
      retrievalMeta = {
        chunkCount: result.chunks.length,
        nodeCount:  result.graphNodes.length,
      };
      topicLabels = result.graphNodes.map(n => n.label).slice(0, 10);
      console.log(`[chat] Retrieved ${result.chunks.length} chunks, ${result.graphNodes.length} graph nodes`);
    } catch (err) {
      console.warn("[chat] Retrieval failed, proceeding without context:", err);
    }

    // ── Build system prompt ───────────────────────────────────
    const personaNote = persona
      ? `\nLearner persona: **${persona}**. Adjust accordingly.`
      : "";
    const contextNote = contextBlock
      ? `\n\nRelevant course content:\n\n${contextBlock}`
      : "";
    const systemWithContext = SYSTEM_PROMPT + personaNote + contextNote;

    // ── Upsert session in Supabase ────────────────────────────
    let sessionId: string | null = null;
    const key = sessionKey ?? `anon-${Date.now()}`;

    try {
      const sb = getServiceSupabase();
      const { data: session, error: sessionErr } = await sb
        .from("chat_sessions")
        .upsert(
          {
            session_key: key,
            persona: persona ?? null,
            module_id: moduleContext ?? null,
            country,
            city,
            region,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_key" }
        )
        .select("id")
        .single();

      if (sessionErr) console.warn("[chat] Session upsert error:", sessionErr.message);
      else sessionId = session?.id ?? null;
    } catch (err) {
      console.warn("[chat] Session save failed:", err);
    }

    // ── Stream from Anthropic ─────────────────────────────────
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic  = new Anthropic({ apiKey: anthropicKey });
    const encoder    = new TextEncoder();
    let   fullResponse = "";
    let   inputTokens  = 0;
    let   outputTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "meta", ...retrievalMeta })}\n\n`)
          );

          const anthropicStream = anthropic.messages.stream({
            model:      "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            system:     systemWithContext,
            messages:   messages.map(m => ({ role: m.role, content: m.content })),
          });

          for await (const chunk of anthropicStream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              fullResponse += chunk.delta.text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "text", text: chunk.delta.text })}\n\n`)
              );
            }
            // Capture final token counts
            if (chunk.type === "message_delta" && chunk.usage) {
              outputTokens = chunk.usage.output_tokens ?? 0;
            }
            if (chunk.type === "message_start" && chunk.message?.usage) {
              inputTokens = chunk.message.usage.input_tokens ?? 0;
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          // ── Save messages to Supabase (after stream completes) ──
          if (sessionId) {
            const costUsd = (inputTokens * COST_INPUT_PER_TOKEN) + (outputTokens * COST_OUTPUT_PER_TOKEN);
            const sb      = getServiceSupabase();

            // Save user message
            await sb.from("chat_messages").insert({
              session_id: sessionId,
              role:       "user",
              content:    lastUserMessage,
              context: {
                chunk_count:   retrievalMeta.chunkCount,
                graph_nodes:   retrievalMeta.nodeCount,
                topics:        topicLabels,
                module_context: moduleContext ?? null,
              },
            });

            // Save assistant message with cost
            await sb.from("chat_messages").insert({
              session_id: sessionId,
              role:       "assistant",
              content:    fullResponse,
              context: {
                input_tokens:  inputTokens,
                output_tokens: outputTokens,
                cost_usd:      costUsd,
                topics:        topicLabels,
                chunks_used:   retrievalMeta.chunkCount,
                graph_nodes:   retrievalMeta.nodeCount,
                module_context: moduleContext ?? null,
              },
            });

            // Update session totals
            await sb.rpc("increment_session_totals", {
              p_session_id:  sessionId,
              p_cost:        costUsd,
              p_msg_count:   2,
            }).catch(() => {
              // RPC may not exist yet — fall back to direct update
              sb.from("chat_sessions")
                .select("total_cost_usd, message_count")
                .eq("id", sessionId)
                .single()
                .then(({ data }) => {
                  sb.from("chat_sessions").update({
                    total_cost_usd: (data?.total_cost_usd ?? 0) + costUsd,
                    message_count:  (data?.message_count  ?? 0) + 2,
                    updated_at:     new Date().toISOString(),
                  }).eq("id", sessionId);
                });
            });

            console.log(`[chat] Saved session ${sessionId} | cost: $${costUsd.toFixed(5)} | topics: ${topicLabels.join(", ")}`);
          }

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
        "Content-Type":      "text/event-stream",
        "Cache-Control":     "no-cache",
        "Connection":        "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });

  } catch (err) {
    console.error("[chat] Request error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
