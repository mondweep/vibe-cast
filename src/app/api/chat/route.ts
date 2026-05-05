import { Anthropic } from "@anthropic-ai/sdk";
import { PHASES, RESOURCES } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";
import { getNodesByType } from "@/lib/knowledge/defi-ontology";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function buildContext(): string {
  const phaseDescriptions = PHASES.map(
    (phase) => `
**${phase.title}** (${phase.weeks})
Goal: ${phase.goal}
Skills: ${phase.jdMap}

Topics covered:
${phase.weeks_data
  .flatMap((week) =>
    week.tasks.map(
      (task) =>
        `- ${task.text}${task.resource ? ` [${task.resource}]` : ""}`
    )
  )
  .join("\n")}
`
  ).join("\n");

  const resourceDescriptions = RESOURCES.map(
    (category) => `
**${category.category}**
${category.items.map((item) => `- ${item.name}: ${item.desc}`).join("\n")}
`
  ).join("\n");

  // Build knowledge graph context
  const protocols = getNodesByType("Protocol");
  const concepts = getNodesByType("Concept");
  const strategies = getNodesByType("Strategy");
  const risks = getNodesByType("Risk");

  const kgContext = `
KEY DeFi PROTOCOLS:
${protocols.map(p => `- ${p.label}: ${p.description}`).join("\n")}

CORE CONCEPTS:
${concepts.map(c => `- ${c.label}: ${c.description}`).join("\n")}

STRATEGIES:
${strategies.map(s => `- ${s.label}: ${s.description}`).join("\n")}

RISK TYPES:
${risks.map(r => `- ${r.label}: ${r.description}`).join("\n")}
`;

  return `
You are a specialized DeFi learning tutor helping someone navigate a 8-week intensive program.
Your role is to answer questions about DeFi protocols, strategies, and learning resources using the provided knowledge graph.

LEARNING PHASES:
${phaseDescriptions}

RECOMMENDED RESOURCES:
${resourceDescriptions}

DeFi KNOWLEDGE GRAPH:
${kgContext}

Guidelines:
1. Use the knowledge graph to provide accurate, contextual answers about DeFi concepts and protocols
2. When answering, reference related concepts from the graph to deepen understanding
3. Explain complex relationships (e.g., how strategies relate to risks, or prerequisites between concepts)
4. Suggest which phase of the learning program covers each topic
5. Be encouraging and supportive of the learner's journey
6. If a concept is in the knowledge graph, provide its definition and how it relates to other concepts
7. Keep responses concise (2-3 paragraphs unless asked for more detail)
8. When relevant, explain trade-offs between strategies and risks
`;
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Claude API key not configured. Please set ANTHROPIC_API_KEY",
        }),
        { status: 500 }
      );
    }

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
      });
    }

    const systemPrompt = buildContext();

    // Optional: Save chat to Supabase if available
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from("defi_learning_as_chat_messages").insert({
            user_id: session.user.id,
            role: "user",
            content: message,
            created_at: new Date().toISOString(),
          });
        }
      } catch (dbError) {
        console.warn("Failed to save message to Supabase:", dbError);
        // Continue without persistence
      }
    }

    // Create streaming response
    const encoder = new TextEncoder();
    let fullResponse = "";

    const response = new Response(
      new ReadableStream({
        async start(controller) {
          const stream = anthropic.messages.stream({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: message,
              },
            ],
          });

          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              fullResponse += chunk.delta.text;
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }

          // Save assistant response to Supabase if available
          if (supabase) {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                await supabase.from("defi_learning_as_chat_messages").insert({
                  user_id: session.user.id,
                  role: "assistant",
                  content: fullResponse,
                  created_at: new Date().toISOString(),
                });
              }
            } catch (dbError) {
              console.warn("Failed to save assistant response to Supabase:", dbError);
            }
          }

          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );

    return response;
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500 }
    );
  }
}
