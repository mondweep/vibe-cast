import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, X, Send, Loader, BookOpen, Sparkles, Settings, KeyRound, Check } from 'lucide-react';
import {
  tutorApi,
  TutorCitation,
  TutorLesson,
  LLMProvider,
  PROVIDER_LABELS,
  PROVIDER_DEFAULT_MODEL,
  loadTutorSettings,
  saveTutorSettings,
  clearTutorSettings,
} from '@/api/tutor';

interface ChatTurn {
  role: 'user' | 'tutor';
  text: string;
  citations?: TutorCitation[];
  lessons?: TutorLesson[];
  mode?: string;
  provider?: string;
}

const PROVIDERS: LLMProvider[] = ['anthropic', 'openai', 'requesty', 'gemini'];

function TutorSettings({ onClose }: { onClose: () => void }) {
  const existing = loadTutorSettings();
  const [provider, setProvider] = useState<LLMProvider>(existing?.provider || 'anthropic');
  const [apiKey, setApiKey] = useState(existing?.apiKey || '');
  const [model, setModel] = useState(existing?.model || '');
  const [saved, setSaved] = useState(false);

  const save = () => {
    if (!apiKey.trim()) return;
    saveTutorSettings({ provider, apiKey: apiKey.trim(), model: model.trim() || undefined });
    setSaved(true);
    setTimeout(onClose, 600);
  };

  const clear = () => {
    clearTutorSettings();
    setApiKey('');
    setModel('');
    onClose();
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <KeyRound size={16} className="text-primary-600" />
        <p>Bring your own key. Choose a provider and paste an API key — it stays in this browser and is sent only with your questions, never stored on the server.</p>
      </div>

      <label className="block text-sm font-medium text-gray-700">
        Provider
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as LLMProvider)}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
        >
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_LABELS[p]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-gray-700">
        API key
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-… / paste your key"
          autoComplete="off"
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
        />
      </label>

      <label className="block text-sm font-medium text-gray-700">
        Model <span className="font-normal text-gray-400">(optional)</span>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={PROVIDER_DEFAULT_MODEL[provider]}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
        />
      </label>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={save}
          disabled={!apiKey.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
        >
          {saved ? <Check size={16} /> : null}
          {saved ? 'Saved' : 'Save key'}
        </button>
        {existing && (
          <button onClick={clear} className="px-3 py-2 text-sm text-gray-600 hover:text-red-600">
            Remove key
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400">
        No key set? The tutor still answers using the knowledge graph with citations — it just won't write a conversational summary.
      </p>
    </div>
  );
}

export function TutorDrawer() {
  const { lessonId, pathId } = useParams();
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, busy]);

  // Open the drawer and ask a question when another component dispatches
  // `ruflo:ask-tutor` (e.g. the "Ask the tutor" button on the Knowledge Graph).
  useEffect(() => {
    const handler = (e: Event) => {
      const q = (e as CustomEvent).detail?.question as string | undefined;
      setOpen(true);
      setShowSettings(false);
      if (q) {
        setInput(q);
        setTimeout(() => send(q), 0);
      }
    };
    window.addEventListener('ruflo:ask-tutor', handler);
    return () => window.removeEventListener('ruflo:ask-tutor', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async (override?: string) => {
    const q = (override ?? input).trim();
    if (!q || busy) return;
    if (override === undefined) setInput('');
    setTurns((t) => [...t, { role: 'user', text: q }]);
    setBusy(true);
    try {
      const res = await tutorApi.ask(q, { lessonId, pathId });
      setTurns((t) => [
        ...t,
        {
          role: 'tutor',
          text: res.answer,
          citations: res.citations,
          lessons: res.lessons,
          mode: res.mode,
          provider: res.provider,
        },
      ]);
    } catch {
      setTurns((t) => [...t, { role: 'tutor', text: 'Sorry — the tutor is unavailable right now. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition"
        >
          <MessageCircle size={20} /> Ask the tutor
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-200">
          <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary-600" />
              <h2 className="font-semibold text-gray-900">Ruflo Tutor</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings((s) => !s)}
                className={`p-1.5 rounded-lg ${showSettings ? 'bg-primary-50 text-primary-600' : 'hover:bg-gray-100'}`}
                aria-label="Tutor settings"
                title="Bring your own API key"
              >
                <Settings size={18} />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="Close tutor">
                <X size={18} />
              </button>
            </div>
          </header>

          {showSettings && <TutorSettings onClose={() => setShowSettings(false)} />}

          {!showSettings && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {turns.length === 0 && (
              <div className="text-sm text-gray-500">
                <p className="mb-2">Ask anything about Ruflo agent orchestration — grounded in the knowledge graph, with citations.</p>
                <ul className="space-y-1 text-gray-400">
                  <li>• "How do agents reach agreement?"</li>
                  <li>• "What topology should I use for a small team?"</li>
                  <li>• "How do I store and recall memory?"</li>
                </ul>
              </div>
            )}

            {turns.map((turn, i) =>
              turn.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="bg-primary-600 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[85%] text-sm">{turn.text}</div>
                </div>
              ) : (
                <div key={i} className="space-y-2">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[95%]">
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <ReactMarkdown>{turn.text}</ReactMarkdown>
                    </div>
                  </div>
                  {turn.citations && turn.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {turn.citations.slice(0, 6).map((c, j) => (
                        <span
                          key={j}
                          title={c.summary}
                          className="text-xs bg-primary-50 text-primary-700 border border-primary-100 px-2 py-0.5 rounded"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {turn.lessons && turn.lessons.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {turn.lessons.slice(0, 3).map((l) => (
                        <a
                          key={l.id}
                          href={`/lessons/${l.id}`}
                          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
                        >
                          <BookOpen size={12} /> Lesson {l.order}: {l.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}

            {busy && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader size={16} className="animate-spin" /> Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>
          )}

          {!showSettings && (
          <div className="border-t border-gray-200 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Ask the Ruflo tutor…"
                className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                aria-label="Send"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
          )}
        </div>
      )}
    </>
  );
}

export default TutorDrawer;
