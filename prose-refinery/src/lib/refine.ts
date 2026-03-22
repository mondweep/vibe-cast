import Anthropic from "@anthropic-ai/sdk";
import { RefineRequest, RefineResponse, Suggestion, StructureAnalysis } from "./types";
import { buildPrompt } from "./prompts";

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function parseJsonResponse(text: string): unknown {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

export async function refineText(
  request: RefineRequest,
  client: Anthropic
): Promise<RefineResponse> {
  const { text, pass, genre, options, customPrompt } = request;

  const { system, user } = buildPrompt(pass, genre, text, {
    audience: options?.audience,
    tone: options?.tone,
    conversation: options?.conversation,
    feedback: options?.conversation?.at(-1)?.content,
    customPrompt,
  });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: user }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  const tokensUsed =
    (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);

  if (pass === "structure") {
    const parsed = parseJsonResponse(responseText) as StructureAnalysis;
    return {
      suggestions: [],
      structure: parsed,
      meta: {
        wordCountOriginal: countWords(text),
        wordCountRevised: countWords(text),
        tokensUsed,
        promptUsed: `SYSTEM:\n${system}\n\nUSER:\n${user}`,
      },
    };
  }

  const parsed = parseJsonResponse(responseText);
  const suggestions: Suggestion[] = Array.isArray(parsed)
    ? parsed
    : (parsed as { suggestions: Suggestion[] }).suggestions || [];

  const revisedWordCount = suggestions.reduce((count, s) => {
    const originalWords = countWords(s.original);
    const revisedWords = countWords(s.revised);
    return count - originalWords + revisedWords;
  }, countWords(text));

  return {
    suggestions,
    meta: {
      wordCountOriginal: countWords(text),
      wordCountRevised: revisedWordCount,
      tokensUsed,
      promptUsed: `SYSTEM:\n${system}\n\nUSER:\n${user}`,
    },
  };
}
