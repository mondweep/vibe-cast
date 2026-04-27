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

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };

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
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
          moduleContext: moduleSlug,
          persona,
        }),
      });

      if (!res.ok) throw new Error("Chat API failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let metaData: { chunkCount: number; nodeCount: number } | undefined;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data) as { type: string; text?: string; error?: string; chunkCount?: number; nodeCount?: number };
            if (parsed.type === "text" && parsed.text) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + parsed.text }
                  : m
              ));
            } else if (parsed.type === "meta") {
              metaData = { chunkCount: parsed.chunkCount ?? 0, nodeCount: parsed.nodeCount ?? 0 };
            } else if (parsed.type === "error") {
              throw new Error(parsed.error);
            }
          } catch {}
        }
      }

      if (metaData) {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, meta: metaData } : m
        ));
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: "Sorry, I couldn't process that. Please try again." }
          : m
      ));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, isLoading, moduleSlug, persona]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[420px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-4rem)] rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <div>
            <p className="text-sm font-bold text-foreground">AI Tutor</p>
            <p className="text-[10px] text-muted-foreground font-mono">
              GraphRAG · Knowledge graph · {persona}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setIsOpen(false); onClose?.(); }}
          className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
          aria-label="Close chat"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-secondary text-secondary-foreground rounded-bl-sm"
            )}>
              {/* Render content with basic markdown */}
              {msg.content
                ? msg.content.split("\n").map((line, i) => (
                    <p key={i} className={cn("mb-1 last:mb-0", line.startsWith("- ") && "pl-2")}>
                      {line.startsWith("**") && line.endsWith("**")
                        ? <strong>{line.slice(2, -2)}</strong>
                        : line}
                    </p>
                  ))
                : isLoading && msg.role === "assistant" && (
                    <div className="flex gap-1 py-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  )
              }
              {/* Retrieval metadata */}
              {msg.meta && (
                <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                  <span>📄 {msg.meta.chunkCount} chunks</span>
                  <span>🔷 {msg.meta.nodeCount} graph nodes</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Starter questions (only if just the welcome message) */}
        {messages.length === 1 && (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono text-center">
              Try asking
            </p>
            {STARTER_QUESTIONS.map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                className="w-full text-left text-xs text-muted-foreground border border-border/50 rounded-lg px-3 py-2 hover:border-primary/50 hover:text-foreground transition-all bg-background/50">
                {q}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about AWS networking..."
            rows={1}
            className="flex-1 resize-none bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors max-h-24"
            style={{ height: "auto", minHeight: "38px" }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 96) + "px";
            }}
            disabled={isLoading}
            aria-label="Chat input"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="shrink-0 font-mono h-9"
          >
            →
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center font-mono">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
