/**
 * Multi-provider LLM abstraction for the Ruflo tutor (ADR-014).
 *
 * Supports Anthropic, OpenAI, Requesty (OpenAI-compatible router) and Google
 * Gemini. The provider + key can come from EITHER:
 *   1. the request itself (bring-your-own-key — a user pastes a key in the
 *      browser; it is sent per-request and NEVER persisted server-side), or
 *   2. server environment variables (operator-provided default).
 *
 * Security: keys are used transiently for a single outbound call and are never
 * logged or stored. Callers must keep the key out of log lines.
 */

export type LLMProvider = 'anthropic' | 'openai' | 'requesty' | 'gemini';

const PROVIDERS: LLMProvider[] = ['anthropic', 'openai', 'requesty', 'gemini'];

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o-mini',
  requesty: 'openai/gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
};

const ENV_KEY: Record<LLMProvider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  requesty: 'REQUESTY_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
}

export interface ResolveInput {
  /** Per-request override sent from the browser (bring-your-own-key). */
  provider?: string;
  apiKey?: string;
  model?: string;
}

function isProvider(value: unknown): value is LLMProvider {
  return typeof value === 'string' && (PROVIDERS as string[]).includes(value);
}

/**
 * Resolve which provider/key/model to use. Request-supplied values win; we then
 * fall back to env. Returns null when no usable key is available (the tutor then
 * degrades to grounded-retrieval answers).
 */
export function resolveLLMConfig(
  reqLlm: ResolveInput | undefined,
  env: NodeJS.ProcessEnv = process.env,
): LLMConfig | null {
  // 1. Bring-your-own-key from the request.
  if (reqLlm && typeof reqLlm.apiKey === 'string' && reqLlm.apiKey.trim()) {
    const provider = isProvider(reqLlm.provider) ? reqLlm.provider : 'anthropic';
    return {
      provider,
      apiKey: reqLlm.apiKey.trim(),
      model: (reqLlm.model && reqLlm.model.trim()) || DEFAULT_MODELS[provider],
    };
  }

  // 2. Operator default via env. Honour an explicit LLM_PROVIDER first.
  const preferred = env.LLM_PROVIDER;
  const order = isProvider(preferred)
    ? [preferred, ...PROVIDERS.filter((p) => p !== preferred)]
    : PROVIDERS;

  for (const provider of order) {
    const key = env[ENV_KEY[provider]];
    if (key && key.trim()) {
      return {
        provider,
        apiKey: key.trim(),
        model: (env.LLM_MODEL && env.LLM_MODEL.trim()) || DEFAULT_MODELS[provider],
      };
    }
  }
  return null;
}

export interface ChatParams {
  system: string;
  prompt: string;
  maxTokens?: number;
}

/** Dispatch a single-turn chat completion to the resolved provider. */
export async function chatComplete(config: LLMConfig, params: ChatParams): Promise<string> {
  const maxTokens = params.maxTokens ?? 700;
  switch (config.provider) {
    case 'anthropic':
      return anthropicChat(config, params, maxTokens);
    case 'openai':
      return openAICompatChat('https://api.openai.com/v1', config, params, maxTokens);
    case 'requesty':
      return openAICompatChat('https://router.requesty.ai/v1', config, params, maxTokens);
    case 'gemini':
      return geminiChat(config, params, maxTokens);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

async function anthropicChat(config: LLMConfig, params: ChatParams, maxTokens: number): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      system: params.system,
      messages: [{ role: 'user', content: params.prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await safeBody(res)}`);
  const data: any = await res.json();
  return (data.content || [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')
    .trim();
}

async function openAICompatChat(
  baseUrl: string,
  config: LLMConfig,
  params: ChatParams,
  maxTokens: number,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${config.provider} ${res.status}: ${await safeBody(res)}`);
  const data: any = await res.json();
  return String(data.choices?.[0]?.message?.content || '').trim();
}

async function geminiChat(config: LLMConfig, params: ChatParams, maxTokens: number): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent` +
    `?key=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: params.system }] },
      contents: [{ role: 'user', parts: [{ text: params.prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await safeBody(res)}`);
  const data: any = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts
    .map((p: any) => p.text || '')
    .join('')
    .trim();
}

async function safeBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 300);
  } catch {
    return '<unreadable>';
  }
}
