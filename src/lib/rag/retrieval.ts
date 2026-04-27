import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Query embedding via Voyage AI ─────────────────────────────
export async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: [text],
      model: "voyage-3",
      input_type: "query",
    }),
  });

  if (!res.ok) throw new Error(`Voyage AI error: ${await res.text()}`);
  const data = await res.json() as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

// ── Vector similarity search ──────────────────────────────────
export interface RetrievedChunk {
  id: string;
  module_id: string;
  module_slug: string;
  module_title: string;
  section: string;
  content: string;
  node_ids: string[];
  similarity: number;
}

export async function vectorSearch(
  embedding: number[],
  threshold = 0.45,
  limit = 6
): Promise<RetrievedChunk[]> {
  const { data, error } = await supabase.rpc("search_chunks", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) throw error;
  return (data ?? []) as RetrievedChunk[];
}

// ── Graph neighbourhood expansion ────────────────────────────
export interface GraphNode {
  node_id: string;
  label: string;
  type: string;
  description: string;
  relation: string | null;
  hop: number;
  weight: number;
}

export async function expandGraph(nodeIds: string[], maxHops = 2): Promise<GraphNode[]> {
  const allNodes: GraphNode[] = [];
  const seen = new Set<string>();

  for (const nodeId of nodeIds.slice(0, 5)) { // Limit to 5 seed nodes
    const { data, error } = await supabase.rpc("get_node_neighbourhood", {
      start_node_id: nodeId,
      max_hops: maxHops,
      max_nodes: 15,
    });

    if (error) { console.warn("Graph expand error:", error); continue; }

    for (const node of (data ?? [])) {
      if (!seen.has(node.node_id)) {
        seen.add(node.node_id);
        allNodes.push(node as GraphNode);
      }
    }
  }

  return allNodes.sort((a, b) => a.hop - b.hop || b.weight - a.weight);
}

// ── Entity extraction from question ──────────────────────────
export async function extractEntities(question: string): Promise<string[]> {
  // Fetch all node labels from Supabase
  const { data } = await supabase
    .from("kg_nodes")
    .select("id, label")
    .order("label");

  if (!data) return [];

  const q = question.toLowerCase();
  return data
    .filter(n => q.includes(n.label.toLowerCase()))
    .map(n => n.id)
    .slice(0, 8);
}

// ── Hybrid GraphRAG retrieval ─────────────────────────────────
export interface RetrievalResult {
  chunks: RetrievedChunk[];
  graphNodes: GraphNode[];
  entityIds: string[];
}

export async function hybridRetrieve(
  question: string,
  moduleContext?: string
): Promise<RetrievalResult> {
  // Run all three in parallel
  const [embedding, entityIds] = await Promise.all([
    embedQuery(question),
    extractEntities(question),
  ]);

  const [chunks, graphNodes] = await Promise.all([
    vectorSearch(embedding, 0.45, 6),
    entityIds.length > 0 ? expandGraph(entityIds) : Promise.resolve([]),
  ]);

  // If we have a module context, also pull chunks from that module
  let finalChunks = chunks;
  if (moduleContext && chunks.length < 4) {
    const { data: moduleChunks } = await supabase
      .from("content_chunks")
      .select("id, module_id, module_slug, module_title, section, content, node_ids")
      .eq("module_slug", moduleContext)
      .limit(3);

    if (moduleChunks) {
      const extra = moduleChunks.map(c => ({ ...c, similarity: 0.6 })) as RetrievedChunk[];
      finalChunks = [...chunks, ...extra].slice(0, 8);
    }
  }

  return { chunks: finalChunks, graphNodes, entityIds };
}

// ── Context formatter for Claude ─────────────────────────────
export function formatContext(result: RetrievalResult): string {
  const parts: string[] = [];

  if (result.chunks.length > 0) {
    parts.push("## Relevant Course Content\n");
    for (const chunk of result.chunks) {
      parts.push(
        `### ${chunk.module_title} — ${chunk.section}\n` +
        `*(Module M${chunk.module_id}, similarity: ${(chunk.similarity * 100).toFixed(0)}%)*\n\n` +
        chunk.content + "\n"
      );
    }
  }

  if (result.graphNodes.length > 0) {
    parts.push("\n## Related Concepts (Knowledge Graph)\n");
    const byType: Record<string, GraphNode[]> = {};
    for (const node of result.graphNodes.slice(0, 12)) {
      (byType[node.type] ??= []).push(node);
    }
    for (const [type, nodes] of Object.entries(byType)) {
      parts.push(`**${type}:** ${nodes.map(n => n.label).join(", ")}`);
    }
  }

  return parts.join("\n");
}
