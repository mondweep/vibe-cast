"use client";

import { useEffect, useRef, useState } from "react";
import { PHASES } from "@/lib/constants";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function CourseChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load chat history from localStorage
    const stored = localStorage.getItem("defi-tutor-chat-v1");
    if (stored) {
      setMessages(JSON.parse(stored));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    // Persist messages
    if (loaded) {
      localStorage.setItem("defi-tutor-chat-v1", JSON.stringify(messages));
    }
  }, [messages, loaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          context: {
            phases: PHASES,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI tutor");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullContent += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...assistantMessage,
            content: fullContent,
          };
          return updated;
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== (Date.now() + 1).toString())
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!loaded) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 300,
          fontFamily: "'IBM Plex Mono', monospace",
          color: "#8A92A0",
        }}
      >
        Loading tutor...
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#0F131A",
        borderRadius: 8,
        border: "1px solid #1A1F2E",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #1A1F2E",
          backgroundColor: "#0A0E14",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontFamily: "'Libre Baskerville', serif",
            fontSize: 16,
            color: "#E0E6ED",
          }}
        >
          DeFi Tutor
        </h3>
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: 12,
            color: "#8A92A0",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          Ask me about any phase, protocol, or strategy
        </p>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#8A92A0",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            <p>
              Start by asking about a protocol, risk strategy, or learning
              phase.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent:
                  msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: 6,
                  backgroundColor:
                    msg.role === "user" ? "#00C2CB" : "#1A1F2E",
                  color: msg.role === "user" ? "#0A0E14" : "#E0E6ED",
                  fontSize: 12,
                  fontFamily: "'IBM Plex Mono', monospace",
                  wordBreak: "break-word",
                  lineHeight: 1.5,
                }}
              >
                {msg.content || (
                  <span style={{ opacity: 0.6 }}>typing...</span>
                )}
              </div>
            </div>
          ))
        )}

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 6,
              backgroundColor: "#3A2424",
              borderLeft: "3px solid #E84B3A",
              color: "#E84B3A",
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            Error: {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        style={{
          padding: "12px 20px",
          borderTop: "1px solid #1A1F2E",
          display: "flex",
          gap: 8,
          backgroundColor: "#0A0E14",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about Aave, LP strategies, on-chain data..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "8px 12px",
            backgroundColor: "#0F131A",
            border: "1px solid #1A1F2E",
            borderRadius: 4,
            color: "#E0E6ED",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#00C2CB";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#1A1F2E";
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{
            padding: "8px 16px",
            backgroundColor: isLoading ? "#556D80" : "#00C2CB",
            color: "#0A0E14",
            border: "none",
            borderRadius: 4,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            fontWeight: 600,
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            opacity: isLoading || !input.trim() ? 0.6 : 1,
          }}
        >
          {isLoading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
