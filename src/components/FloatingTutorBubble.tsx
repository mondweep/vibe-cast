"use client";

import { useState, useRef, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const STARTER_QUESTIONS = [
  "What's the difference between impermanent loss and slippage?",
  "How does Aave's liquidation system work?",
  "Explain arbitrage in DeFi",
  "What's the best strategy for stablecoin LPs?",
  "How do flash loans work?",
];

export function FloatingTutorBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionKey] = useState(() => {
    if (typeof window === "undefined") return `ssr-${Date.now()}`;
    const stored = sessionStorage.getItem("defi-tutor-session");
    if (stored) return stored;
    const fresh = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("defi-tutor-session", fresh);
    return fresh;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load message history
  useEffect(() => {
    const loadHistory = async () => {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setHasSession(true);
            const { data } = await supabase
              .from("defi_learning_as_chat_messages")
              .select("*")
              .eq("user_id", session.user.id)
              .order("created_at", { ascending: true })
              .limit(50);

            if (data) {
              setMessages(
                data.map((msg: any) => ({
                  id: msg.id,
                  role: msg.role,
                  content: msg.content,
                  timestamp: msg.created_at,
                }))
              );
            }
            return;
          }
        } catch (error) {
          console.warn("Failed to load from Supabase:", error);
        }
      }

      // Fall back to sessionStorage
      const saved = sessionStorage.getItem(`defi_tutor_msgs_${sessionKey}`);
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (error) {
          console.warn("Failed to parse saved messages:", error);
        }
      }
    };

    loadHistory();
  }, [sessionKey]);

  // Save messages
  useEffect(() => {
    if (!hasSession) {
      sessionStorage.setItem(`defi_tutor_msgs_${sessionKey}`, JSON.stringify(messages));
    }
  }, [messages, hasSession, sessionKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Save user message to Supabase if session exists
      const supabase = getSupabase();
      if (supabase && hasSession) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase.from("defi_learning_as_chat_messages").insert({
              user_id: session.user.id,
              role: "user",
              content: input,
              created_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.warn("Failed to save user message:", error);
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        fullContent += text;

        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            lastMsg.content = fullContent;
          }
          return updated;
        });
      }

      // Save assistant response
      if (supabase && hasSession) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase.from("defi_learning_as_chat_messages").insert({
              user_id: session.user.id,
              role: "assistant",
              content: fullContent,
              created_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.warn("Failed to save assistant response:", error);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === "assistant") {
          lastMsg.content = "Sorry, there was an error. Please try again.";
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-40 font-bold text-xl"
        title="Open DeFi Tutor"
      >
        💡
      </button>
    );
  }

  return (
    <div
      className={`fixed z-50 transition-all ${
        isMaximized
          ? "inset-4"
          : "bottom-4 right-4 w-96 h-[600px]"
      } bg-gray-900 border border-gray-700 rounded-lg shadow-2xl flex flex-col`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h2 className="font-bold text-sm">DeFi Tutor</h2>
          <p className="text-xs opacity-90">Powered by Claude</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="hover:bg-white/20 p-2 rounded transition-colors"
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? "−" : "□"}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-2 rounded transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col h-full justify-center items-center text-center text-gray-400">
            <p className="font-semibold mb-4">Ask me about DeFi!</p>
            <div className="space-y-2">
              {STARTER_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="block text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded transition-colors w-full text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-xs mt-1 ${
                  msg.role === "user" ? "text-blue-200" : "text-gray-500"
                }`}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role === "assistant" && (
          <div className="flex justify-start">
            <div className="bg-gray-800 px-3 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-700 bg-gray-800 p-3 rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-semibold transition-colors"
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
