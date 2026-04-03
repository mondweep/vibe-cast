"use client";

import { useState, useEffect } from "react";

export default function ConnectionStatus() {
  const [status, setStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [serverInfo, setServerInfo] = useState<string>("");

  useEffect(() => {
    async function checkConnection() {
      try {
        const res = await fetch("/api/clipcannon/health");
        if (res.ok) {
          const data = await res.json();
          setStatus("connected");
          setServerInfo(data.version || "ClipCannon MCP Server");
        } else {
          setStatus("disconnected");
        }
      } catch {
        setStatus("disconnected");
      }
    }

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`w-2 h-2 rounded-full ${
          status === "connected"
            ? "bg-success"
            : status === "disconnected"
            ? "bg-error"
            : "bg-warning animate-pulse"
        }`}
      />
      <span className="text-foreground/50">
        {status === "connected"
          ? serverInfo
          : status === "disconnected"
          ? "ClipCannon not connected"
          : "Checking..."}
      </span>
      {status === "disconnected" && (
        <a
          href="https://github.com/mondweep/clipcannon#installation"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Setup guide
        </a>
      )}
    </div>
  );
}
