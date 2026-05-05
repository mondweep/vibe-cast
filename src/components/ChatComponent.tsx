"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load message history on mount
  useEffect(() => {
    const loadHistory = async () => {
      const supabase = getSupabase();

      // Try to load from Supabase if session exists
      if (supabase) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            setHasSession(true);
            const { data } = await supabase
              .from("defi_learning_as_chat_messages")
              .select("*")
              .eq("user_id", session.user.id)
              .order("created_at", { ascending: true });

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

      // Fall back to localStorage
      const saved = localStorage.getItem("defi_tutor_messages");
      if (saved) {
        try {
          setMessages(JSON.parse(saved));
        } catch (error) {
          console.warn("Failed to parse saved messages:", error);
        }
      }
    };

    loadHistory();
  }, []);

  // Save messages to localStorage whenever they change (if no session)
  useEffect(() => {
    if (!hasSession) {
      localStorage.setItem("defi_tutor_messages", JSON.stringify(messages));
    }
  }, [messages, hasSession]);

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
          const {
            data: { session },
          } = await supabase.auth.getSession();
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

      // Save assistant response to Supabase if session exists
      if (supabase && hasSession) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
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
          lastMsg.content =
            "Sorry, there was an error processing your request. Please try again.";
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <h1 className="text-2xl font-bold">DeFi Learning Tutor</h1>
        <p className="text-sm text-gray-400">
          {hasSession
            ? "Messages saved to your account"
            : "Messages saved locally"}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg font-semibold">Welcome to the DeFi Tutor</p>
              <p className="mt-2">
                Ask me anything about DeFi protocols, strategies, and learning
                resources.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-md lg:max-w-2xl px-4 py-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.role === "user" ? "text-blue-200" : "text-gray-500"
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role === "assistant" && (
          <div className="flex justify-start">
            <div className="bg-gray-800 px-4 py-2 rounded-lg">
              <div className="flex space-x-2">
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
      <form onSubmit={handleSubmit} className="border-t border-gray-700 bg-gray-800 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about DeFi..."
            disabled={isLoading}
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg px-6 py-2 font-semibold transition-colors"
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
