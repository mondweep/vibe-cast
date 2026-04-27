"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/contexts/ProgressContext";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: { chunkCount: number; nodeCount: number };
  error?: boolean;
}

const STARTER_QUESTIONS = [
  "When should I use Transit Gateway instead of VPC peering?",
  "Explain BGP path selection in simple terms",
  "What's the difference between Security Groups and NACLs?",
  "How do I achieve 99.99% availability with Direct Connect?",
];

interface CourseChatProps {
  moduleSlug?: string;
  onClose?: () => void;
}

// Simple markdown renderer for assistant messages
function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading
    if (line.startsWith("## ")) {
      elements.push(<p key={i} className="font-bold text-foreground mt-3 mb-1 text-sm">{line.slice(3)}</p>);
    } else if (line.startsWith("# ")) {
      elements.push(<p key={i} className="font-bold text-foreground mt-2 mb-1 text-sm">{line.slice(2)}</p>);
    }
    // Bullet
    else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex gap-2 mb-0.5">
          <span className="text-primary mt-0.5 shrink-0">·</span>
          <span className="text-sm leading-relaxed">{renderInline(line.slice(2))}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)?.[1];
      elements.push(
        <div key={i} className="flex gap-2 mb-0.5">
          <span className="text-primary font-mono text-xs mt-1 shrink-0 w-4">{num}.</span>
          <span className="text-sm leading-relaxed">{renderInline(line.replace(/^\d+\. /, ""))}</span>
        </div>
      );
    }
    // Horizontal rule
    else if (line.startsWith("---")) {
      elements.push(<hr key={i} className="border-border/50 my-2" />);
    }
    // Empty line
    else if (!line.trim()) {
      elements.push(<div key={i} className="h-1.5" />);
    }
    // Normal paragraph
    else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed mb-0.5">{renderInline(line)}</p>
      );
    }
    i++;
  }
  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="bg-muted/60 text-primary px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export function CourseChat({ moduleSlug, onClose }: CourseChatProps) {
  const { persona } = useProgress();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your AWS networking tutor. I use the full course content and a knowledge graph to give you precise, contextual answers.\n\nAsk me anything — concept explanations, architecture decisions, exam prep, or troubleshooting.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          moduleContext: moduleSlug,
          persona,
        }),
      });

      if (!res.ok) throw new Error(`Chat API error: ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let metaData: { chunkCount: number; nodeCount: number } | undefined;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") break;

          try {
            const parsed = JSON.parse(raw) as { type: string; text?: string; error?: string; chunkCount?: number; nodeCount?: number };
            if (parsed.type === "text" && parsed.text) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + parsed.text } : m
              ));
            } else if (parsed.type === "meta") {
              metaData = { chunkCount: parsed.chunkCount ?? 0, nodeCount: parsed.nodeCount ?? 0 };
            } else if (parsed.type === "error") {
              // Show error in the message bubble so it's visible
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: `Error from AI: ${parsed.error}`, error: true }
                  : m
              ));
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }

      if (metaData) {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, meta: metaData } : m
        ));
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: "Sorry, I couldn't get a response. Please check that the API keys are configured in Vercel and try again.", error: true }
          : m
      ));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, isLoading, moduleSlug, persona]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-primary text-primary-foreground px-4 py-3 rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105 font-mono text-sm font-bold"
        aria-label="Open course chat assistant"
      >
        <span className="text-base">◈</span>
        Ask AI Tutor
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[440px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-4rem)] rounded-xl border border-border/80 bg-[#111827] shadow-2xl shadow-black/50 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-[#0f1623] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <div>
            <p className="text-sm font-bold text-white">AI Tutor</p>
            <p className="text-[10px] text-slate-400 font-mono">GraphRAG · Knowledge graph · {persona}</p>
          </div>
        </div>
        <button
          onClick={() => { setIsOpen(false); onClose?.(); }}
          className="text-slate-500 hover:text-slate-200 transition-colors text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-white/10"
          aria-label="Close chat"
        >×</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#111827]">
        {messages.map(msg => (
          <div key={msg.id} className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start items-start")}>

            {/* Assistant avatar */}
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary text-[10px] font-bold">AI</span>
              </div>
            )}

            <div className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3",
              msg.role === "user"
                // User: amber/orange on dark — clearly distinct, high contrast
                ? "bg-primary text-[#0D1117] font-medium rounded-br-sm"
                // Assistant: light slate on dark navy — readable
                : msg.error
                  ? "bg-red-950/60 border border-red-800/50 text-red-300 rounded-bl-sm"
                  : "bg-[#1e2d3d] border border-[#2a3f55] text-slate-100 rounded-bl-sm"
            )}>
              {/* Content */}
              {msg.content
                ? msg.role === "user"
                  ? <p className="text-sm leading-relaxed">{msg.content}</p>
                  : <MessageContent content={msg.content} />
                : isLoading && msg.role === "assistant" && (
                    <div className="flex gap-1 py-1 px-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  )
              }

              {/* Retrieval metadata */}
              {msg.meta && (
                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                  <span>📄 {msg.meta.chunkCount} chunks</span>
                  <span>🔷 {msg.meta.nodeCount} graph nodes</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Starter questions */}
        {messages.length === 1 && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono text-center">Try asking</p>
            {STARTER_QUESTIONS.map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                className="w-full text-left text-xs text-slate-400 border border-[#2a3f55] rounded-lg px-3 py-2.5 hover:border-primary/50 hover:text-slate-200 hover:bg-[#1e2d3d] transition-all bg-[#0f1623]">
                {q}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/60 p-3 bg-[#0f1623] shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about AWS networking..."
            rows={1}
            className="flex-1 resize-none bg-[#1e2d3d] border border-[#2a3f55] rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary/60 transition-colors max-h-24"
            style={{ minHeight: "40px" }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 96) + "px";
            }}
            disabled={isLoading}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="shrink-0 h-10 w-10 p-0 rounded-xl"
          >→</Button>
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5 text-center font-mono">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}
