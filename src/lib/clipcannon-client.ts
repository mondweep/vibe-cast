/**
 * ClipCannon MCP Client
 *
 * Bridges this web app to a locally-running ClipCannon MCP server.
 * The server exposes 51 tools via stdio or HTTP bridge.
 *
 * In development, requests go through Next.js API routes which
 * forward to the ClipCannon process. In production, you'd configure
 * the MCP server endpoint via CLIPCANNON_URL env var.
 */

export interface McpToolCall {
  tool: string;
  params: Record<string, unknown>;
}

export interface McpToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_CLIPCANNON_URL || "/api/clipcannon";

export async function callTool(call: McpToolCall): Promise<McpToolResult> {
  const res = await fetch(`${BASE_URL}/tool`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(call),
  });

  if (!res.ok) {
    return {
      success: false,
      error: `HTTP ${res.status}: ${await res.text()}`,
    };
  }

  return res.json();
}

export async function uploadVideo(file: File): Promise<{ projectId: string; path: string }> {
  const formData = new FormData();
  formData.append("video", file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }

  return res.json();
}

export async function ingestUrl(url: string): Promise<{ projectId: string }> {
  const res = await fetch(`${BASE_URL}/ingest-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    throw new Error(`Ingest failed: ${res.status}`);
  }

  return res.json();
}

export async function getJobStatus(jobId: string): Promise<{
  status: "queued" | "running" | "done" | "error";
  progress: number;
  message: string;
  result?: unknown;
}> {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
  return res.json();
}
