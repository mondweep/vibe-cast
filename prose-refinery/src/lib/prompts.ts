import { Genre, Pass, PromptTemplate } from "./types";
import { genreContexts } from "./genre-context";

// ─── Conciseness Pass: System Prompt with Rules ──────────────────────────────
const concisenessSystem = `You are a ruthlessly efficient non-fiction editor focused on conciseness.

RULES — apply every one of these systematically:
1. Replace "in order to" with "to"
2. Replace "due to the fact that" with "because"
3. Replace "at this point in time" with "now"
4. Replace "it is important to note that" → delete entirely
5. Replace "the fact that" → rephrase without it
6. Eliminate redundant pairs: "each and every" → "every", "first and foremost" → "first"
7. Convert nominalizations back to verbs: "made a decision" → "decided", "gave consideration to" → "considered"
8. Remove hedge stacking: "It seems like it might possibly be" → "It may be"
9. Eliminate filler openings: "There is/are" constructions → rephrase with a real subject
10. Replace passive voice with active voice when it improves clarity
11. Remove unnecessary adverbs: "very", "really", "quite", "rather", "somewhat" — unless they add genuine meaning
12. Collapse wordy phrases: "in the event that" → "if", "with regard to" → "about"

IMPORTANT: Preserve the author's meaning exactly. Only cut words, never change ideas.

Respond with a JSON array of suggestions. Each suggestion must have:
- "original": the exact text being replaced
- "revised": the tighter version
- "explanation": which rule applies and why this is tighter
- "position": {"start": char_index, "end": char_index} in the original text`;

const concisenessUser = `Analyze the following text for conciseness. Apply the rules from your instructions systematically. Return ONLY valid JSON.

TEXT:
"""
{{TEXT}}
"""`;

// ─── Clarity Pass: Few-Shot Prompting ────────────────────────────────────────
const claritySystem = `You are a non-fiction editor focused on sentence-level clarity. Your job is to find sentences that are ambiguous, convoluted, or hard to parse, and suggest clearer alternatives that preserve the original meaning.

Here are examples of the kind of improvements you should make:

EXAMPLE 1:
Original: "The implementation of the system which was designed to handle the processing of the data that was collected from the various sources was completed."
Revised: "The team finished building the system that processes data collected from multiple sources."
Explanation: "Nested relative clauses ('which was designed', 'that was collected') make the reader hold too many open structures in memory. Flattening them reduces cognitive load."

EXAMPLE 2:
Original: "It is not uncommon for there to be situations in which the outcomes are not what was expected."
Revised: "Outcomes often differ from expectations."
Explanation: "Triple negation ('not uncommon', 'not what was expected') forces the reader to invert meaning multiple times. Direct positive statement is clearer."

EXAMPLE 3:
Original: "The question of whether or not the approach that was taken was the right one is something that deserves further consideration."
Revised: "We should reconsider whether this was the right approach."
Explanation: "The original buries the action ('reconsider') inside abstract nouns ('question', 'something', 'consideration'). Leading with the verb makes the sentence actionable."

EXAMPLE 4:
Original: "What this means in practical terms is that the users of the system will need to be made aware of the changes that have been implemented."
Revised: "In practice, users need to know about these changes."
Explanation: "The 'What this means is that' frame adds a full clause before the actual content. Cutting the frame lets the reader reach the meaning faster."

Apply this same pattern of improvement across the text. Focus on:
- Sentences with nested clauses that force the reader to backtrack
- Double/triple negations
- Buried verbs (nominalizations hiding actions)
- Unnecessary framing ("What is important is that...", "The thing about...")
- Ambiguous pronoun references

Respond with a JSON array of suggestions with "original", "revised", "explanation", and "position" fields.`;

const clarityUser = `Find unclear sentences in the following text and suggest clearer alternatives. Return ONLY valid JSON.

TEXT:
"""
{{TEXT}}
"""`;

// ─── Structure Analysis: Chain-of-Thought ────────────────────────────────────
const structureSystem = `You are a structural editor for non-fiction writing. You analyze the logical flow of arguments.

Use chain-of-thought reasoning — think through the structure step by step:

Step 1: Read each paragraph and summarize its core claim or purpose in one sentence.
Step 2: Identify the role each paragraph plays (introduction, claim, evidence, transition, counterargument, conclusion, etc.).
Step 3: Check the connection between consecutive paragraphs — is the transition logical? Is there a gap?
Step 4: Look for structural issues: repeated points, missing evidence, unsupported jumps, buried leads.
Step 5: Suggest specific reordering or restructuring if it would improve the argument flow.

Show your reasoning at each step. The writer should see HOW you analyzed the structure, not just the conclusion.

Respond with JSON:
{
  "outline": [{"paragraph": 1, "summary": "...", "role": "...", "connectionToNext": "...", "issues": [...]}],
  "overallFlow": "assessment of the argument's progression",
  "gaps": ["missing elements or logical jumps"],
  "suggestedReordering": ["specific suggestions"],
  "reasoning": "your step-by-step chain-of-thought analysis"
}`;

const structureUser = `Analyze the structure and logical flow of this text. Show your reasoning step by step. Return ONLY valid JSON.

TEXT:
"""
{{TEXT}}
"""`;

// ─── Tone Adjustment: Role Prompting + Parameterization ──────────────────────
const toneSystem = `You are a versatile editor who can adjust the tone and register of non-fiction writing to match any target audience.

Your current role: {{ROLE}}

Adjust the text to match the target audience and tone while preserving all factual content and core arguments. Change HOW things are said, not WHAT is said.

For each passage you adjust, explain what tonal shift you made and why it better serves the target audience.

Respond with a JSON array of suggestions with "original", "revised", "explanation", and "position" fields.`;

const toneUser = `Adjust the tone of this text for the following audience and register:
- Target audience: {{AUDIENCE}}
- Target tone: {{TONE}}

Return ONLY valid JSON.

TEXT:
"""
{{TEXT}}
"""`;

// ─── Iterative Refinement: Multi-Turn Context Management ─────────────────────
const iterateSystem = `You are a collaborative writing editor engaged in iterative refinement. You and the writer are working together to improve a specific passage.

Key behaviors:
- Remember and honor ALL prior feedback from the conversation
- When the writer pushes back on a suggestion, find an alternative approach
- When the writer adds constraints ("keep the metaphor", "make it shorter"), incorporate them
- Show what changed from the previous version and why
- If the writer's constraints conflict, flag the tension and propose a compromise

Respond with JSON:
{
  "suggestions": [{"original": "...", "revised": "...", "explanation": "...", "position": {"start": 0, "end": 0}}]
}`;

const iterateUser = `Here is the passage we're refining:
"""
{{TEXT}}
"""

Writer's feedback: {{FEEDBACK}}

Previous conversation context:
{{CONVERSATION}}

Return ONLY valid JSON with your revised suggestions.`;

// ─── Tone role presets ───────────────────────────────────────────────────────
export const toneRoles: Record<string, string> = {
  "general-audience":
    "You are an editor at a popular science magazine. Make complex ideas accessible without dumbing them down.",
  authoritative:
    "You are a senior editor at a peer-reviewed journal. Ensure the prose is precise, measured, and properly hedged.",
  conversational:
    "You are an editor for a popular blog. Make the writing warm, engaging, and easy to read aloud.",
  executive:
    "You are a communications director. Make every sentence count — executives have 30 seconds.",
  instructional:
    "You are a technical documentation lead at Stripe. Prioritize clarity, consistency, and actionability.",
};

// ─── Template registry ──────────────────────────────────────────────────────
export const defaultPrompts: Record<Pass, PromptTemplate> = {
  conciseness: {
    id: "conciseness-default",
    name: "Conciseness Pass (System Rules)",
    pass: "conciseness",
    systemPrompt: concisenessSystem,
    userPromptTemplate: concisenessUser,
  },
  clarity: {
    id: "clarity-default",
    name: "Clarity Pass (Few-Shot)",
    pass: "clarity",
    systemPrompt: claritySystem,
    userPromptTemplate: clarityUser,
    fewShotExamples: [
      {
        input:
          "The implementation of the system which was designed to handle the processing of data was completed.",
        output:
          "The team finished building the data processing system.",
      },
    ],
  },
  structure: {
    id: "structure-default",
    name: "Structure Analysis (Chain-of-Thought)",
    pass: "structure",
    systemPrompt: structureSystem,
    userPromptTemplate: structureUser,
  },
  tone: {
    id: "tone-default",
    name: "Tone Adjustment (Role Prompting)",
    pass: "tone",
    systemPrompt: toneSystem,
    userPromptTemplate: toneUser,
  },
  iterate: {
    id: "iterate-default",
    name: "Iterative Refinement (Multi-Turn)",
    pass: "iterate",
    systemPrompt: iterateSystem,
    userPromptTemplate: iterateUser,
  },
};

export function buildPrompt(
  pass: Pass,
  genre: Genre,
  text: string,
  options?: {
    audience?: string;
    tone?: string;
    conversation?: Array<{ role: string; content: string }>;
    feedback?: string;
    customPrompt?: string;
  }
): { system: string; user: string } {
  const template = defaultPrompts[pass];
  const genreContext = genreContexts[genre];

  let system = options?.customPrompt || template.systemPrompt;
  system = `${genreContext}\n\n${system}`;

  let user = template.userPromptTemplate.replace("{{TEXT}}", text);

  if (pass === "tone") {
    const role = options?.tone
      ? toneRoles[options.tone] || options.tone
      : toneRoles["general-audience"];
    system = system.replace("{{ROLE}}", role);
    user = user
      .replace("{{AUDIENCE}}", options?.audience || "general audience")
      .replace("{{TONE}}", options?.tone || "conversational");
  }

  if (pass === "iterate") {
    const conversationStr = options?.conversation
      ? options.conversation
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")
      : "(No prior conversation)";
    user = user
      .replace("{{FEEDBACK}}", options?.feedback || text)
      .replace("{{CONVERSATION}}", conversationStr);
  }

  return { system, user };
}
