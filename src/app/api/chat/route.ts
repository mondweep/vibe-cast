import { Anthropic } from "@anthropic-ai/sdk";
import { PHASES, RESOURCES } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";

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

  return `
You are a specialized DeFi learning tutor helping someone navigate a 8-week intensive program.
Your role is to answer questions about DeFi protocols, strategies, and learning resources.

LEARNING PHASES:
${phaseDescriptions}

RECOMMENDED RESOURCES:
${resourceDescriptions}

Guidelines:
1. Answer questions about any phase of the learning program
2. Explain concepts clearly, using examples from the linked resources
3. When relevant, suggest which phase or resource is most appropriate
4. Be encouraging and supportive of the learner's journey
5. If you don't know something, admit it and suggest where to find the answer
6. Keep responses concise (2-3 paragraphs unless asked for more detail)
7. Use the learner's own phase data to provide personalized guidance
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
    const response = new Response(
      (async function* () {
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
            yield chunk.delta.text;
          }
        }

        // Save assistant response to Supabase if available
        if (supabase) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const fullContent = stream.finalMessage();
              await supabase.from("defi_learning_as_chat_messages").insert({
                user_id: session.user.id,
                role: "assistant",
                content: fullContent.content
                  .filter((block) => block.type === "text")
                  .map((block) => (block as any).text)
                  .join(""),
                created_at: new Date().toISOString(),
              });
            }
          } catch (dbError) {
            console.warn("Failed to save assistant response to Supabase:", dbError);
          }
        }
      })(),
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
