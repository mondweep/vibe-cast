export type Pass = "clarity" | "conciseness" | "structure" | "tone" | "iterate";

export type Genre =
  | "essay"
  | "technical"
  | "journalism"
  | "academic"
  | "business";

export interface ToneOptions {
  audience: string;
  tone: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RefineRequest {
  text: string;
  pass: Pass;
  genre: Genre;
  options?: {
    audience?: string;
    tone?: string;
    conversation?: ConversationMessage[];
  };
  customPrompt?: string;
}

export interface Suggestion {
  original: string;
  revised: string;
  explanation: string;
  position: { start: number; end: number };
}

export interface StructureNode {
  paragraph: number;
  summary: string;
  role: string;
  connectionToNext: string;
  issues: string[];
}

export interface StructureAnalysis {
  outline: StructureNode[];
  overallFlow: string;
  gaps: string[];
  suggestedReordering: string[];
  reasoning: string;
}

export interface RefineMeta {
  wordCountOriginal: number;
  wordCountRevised: number;
  tokensUsed: number;
  promptUsed: string;
}

export interface RefineResponse {
  suggestions: Suggestion[];
  structure?: StructureAnalysis;
  meta: RefineMeta;
}

export interface PromptTemplate {
  id: string;
  name: string;
  pass: Pass;
  systemPrompt: string;
  userPromptTemplate: string;
  fewShotExamples?: Array<{ input: string; output: string }>;
}
