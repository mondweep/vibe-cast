import apiClient from './client';

export interface TutorCitation {
  name: string;
  kind: string;
  summary: string;
  score: number;
  sourceRefs: { file: string; lines?: string; quote?: string }[];
}

export interface TutorLesson {
  id: string;
  title: string;
  order: number;
  pathId: string;
}

export interface TutorResponse {
  mode: 'synthesized' | 'retrieval' | 'refused';
  provider?: string;
  answer: string;
  citations: TutorCitation[];
  lessons: TutorLesson[];
  suggestedNext: TutorLesson[];
}

export type LLMProvider = 'anthropic' | 'openai' | 'requesty' | 'gemini';

export interface TutorLLMSettings {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
}

const STORAGE_KEY = 'tutorLLM';

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  requesty: 'Requesty',
  gemini: 'Google Gemini',
};

export const PROVIDER_DEFAULT_MODEL: Record<LLMProvider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o-mini',
  requesty: 'openai/gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
};

/** Read the user's bring-your-own-key settings from localStorage (browser only). */
export function loadTutorSettings(): TutorLLMSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.apiKey === 'string' && parsed.apiKey.trim()) {
      return parsed as TutorLLMSettings;
    }
  } catch {
    // ignore malformed settings
  }
  return null;
}

export function saveTutorSettings(settings: TutorLLMSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearTutorSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export const tutorApi = {
  async ask(
    question: string,
    context?: { lessonId?: string; pathId?: string },
  ): Promise<TutorResponse> {
    // Bring-your-own-key: if the user has set a provider + key in the browser,
    // send it with the request. The backend uses it transiently and never
    // stores it. With no key set, the backend falls back to its env config.
    const llm = loadTutorSettings() || undefined;
    const res = await apiClient.post('/tutor/ask', { question, context, llm });
    return res.data.data;
  },
};

export default tutorApi;
