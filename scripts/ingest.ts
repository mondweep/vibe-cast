/**
 * GraphRAG Ingestion Pipeline
 * 
 * Run with: npx tsx scripts/ingest.ts
 * 
 * Steps:
 * 1. Parse all MDX modules into chunks
 * 2. Insert knowledge graph nodes + edges (ontology)
 * 3. Generate Voyage AI embeddings for each chunk
 * 4. Store chunks + embeddings in Supabase pgvector
 */

import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";
import { NODES, EDGES } from "../src/lib/knowledge/ontology";

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const VOYAGE_API_KEY   = process.env.VOYAGE_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE || !VOYAGE_API_KEY) {
  console.error("Missing environment variables:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL");
  console.error("  SUPABASE_SERVICE_ROLE_KEY");
  console.error("  VOYAGE_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

// ── STEP 1: Chunk MDX content ─────────────────────────────────

interface Chunk {
  module_id: string;
  module_slug: string;
  module_title: string;
  section: string;
  chunk_index: number;
  content: string;
}

function chunkModule(filePath: string): Chunk[] {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const chunks: Chunk[] = [];

  // Split on h2 headings (##)
  const sections = content.split(/\n(?=## )/);
  let chunkIdx = 0;

  for (const section of sections) {
    // Extract section heading
    const headingMatch = section.match(/^## (.+)/);
    const heading = headingMatch ? headingMatch[1].trim() : "Introduction";

    // Further chunk by paragraph blocks (max ~400 tokens each)
    const paragraphs = section.split(/\n{2,}/);
    let buffer = "";

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      buffer += (buffer ? "\n\n" : "") + trimmed;

      // Roughly 400 tokens (~1600 chars) per chunk
      if (buffer.length > 1500) {
        chunks.push({
          module_id: data.id ?? "",
          module_slug: data.slug ?? filePath.split("/").slice(-2)[0].replace(/^M\d+-/, ""),
          module_title: data.title ?? "",
          section: heading,
          chunk_index: chunkIdx++,
          content: buffer.slice(0, 2000),
        });
        buffer = "";
      }
    }

    if (buffer.trim()) {
      chunks.push({
        module_id: data.id ?? "",
        module_slug: data.slug ?? "",
        module_title: data.title ?? "",
        section: heading,
        chunk_index: chunkIdx++,
        content: buffer.slice(0, 2000),
      });
    }
  }

  return chunks;
}

// ── STEP 2: Voyage AI embedding ────────────────────────────────

async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({
      input: texts,
      model: "voyage-3",   // 1024 dims, fast, free tier
      input_type: "document",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Voyage AI error: ${err}`);
  }

  const data = await response.json() as { data: { embedding: number[] }[] };
  return data.data.map(d => d.embedding);
}

// ── STEP 3: Insert knowledge graph ────────────────────────────

async function ingestKnowledgeGraph() {
  console.log("\n🔷 Inserting knowledge graph nodes...");

  // Insert nodes (upsert by label+type)
  const { data: insertedNodes, error: nodeErr } = await supabase
    .from("kg_nodes")
    .upsert(
      NODES.map(n => ({
        label: n.label,
        type: n.type,
        description: n.description,
        module_ids: n.module_ids,
        properties: n.properties ?? {},
      })),
      { onConflict: "label,type" }
    )
    .select("id, label");

  if (nodeErr) throw nodeErr;
  console.log(`  ✓ ${insertedNodes?.length} nodes upserted`);

  // Build label → id map
  const labelToId = new Map<string, string>();
  for (const node of insertedNodes ?? []) {
    labelToId.set(node.label, node.id);
  }

  console.log("🔷 Inserting knowledge graph edges...");
  const edgeRows = EDGES
    .map(e => {
      const from_id = labelToId.get(e.from);
      const to_id   = labelToId.get(e.to);
      if (!from_id || !to_id) {
        console.warn(`  ⚠ Missing node for edge: ${e.from} → ${e.to}`);
        return null;
      }
      return {
        from_node_id: from_id,
        to_node_id:   to_id,
        relation:     e.relation,
        weight:       e.weight ?? 1.0,
        properties:   e.properties ?? {},
      };
    })
    .filter(Boolean);

  const { error: edgeErr } = await supabase
    .from("kg_edges")
    .upsert(edgeRows as never[], { onConflict: "from_node_id,to_node_id,relation" });

  if (edgeErr) throw edgeErr;
  console.log(`  ✓ ${edgeRows.length} edges upserted`);

  return labelToId;
}

// ── STEP 4: Ingest content chunks with embeddings ──────────────

async function ingestContent(labelToId: Map<string, string>) {
  console.log("\n🔷 Ingesting content chunks...");

  const contentDir = path.join(process.cwd(), "content", "modules");
  const moduleDirs = fs.readdirSync(contentDir);

  let totalChunks = 0;

  for (const dir of moduleDirs) {
    const mdxPath = path.join(contentDir, dir, "index.mdx");
    if (!fs.existsSync(mdxPath)) continue;

    const chunks = chunkModule(mdxPath);
    if (chunks.length === 0) continue;

    console.log(`  📄 ${dir}: ${chunks.length} chunks`);

    // Embed in batches of 8 (Voyage AI rate limit)
    const BATCH = 8;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const texts = batch.map(c =>
        `Module: ${c.module_title}\nSection: ${c.section}\n\n${c.content}`
      );

      const embeddings = await embedTexts(texts);

      // Find which KG node IDs are mentioned in each chunk
      const rows = batch.map((chunk, idx) => {
        const mentionedNodeIds: string[] = [];
        for (const [label, id] of labelToId) {
          if (chunk.content.toLowerCase().includes(label.toLowerCase())) {
            mentionedNodeIds.push(id);
          }
        }
        return {
          module_id:    chunk.module_id,
          module_slug:  chunk.module_slug,
          module_title: chunk.module_title,
          section:      chunk.section,
          chunk_index:  chunk.chunk_index,
          content:      chunk.content,
          token_count:  Math.round(chunk.content.length / 4),
          embedding:    JSON.stringify(embeddings[idx]),
          node_ids:     mentionedNodeIds,
        };
      });

      const { error } = await supabase.from("content_chunks").upsert(rows as never[]);
      if (error) throw error;

      totalChunks += batch.length;
      process.stdout.write(`\r    Embedded ${totalChunks} chunks...`);

      // Rate limit: 100ms between batches
      await new Promise(r => setTimeout(r, 100));
    }
    console.log();
  }

  console.log(`\n  ✓ ${totalChunks} chunks ingested with embeddings`);
}

// ── MAIN ───────────────────────────────────────────────────────

async function main() {
  console.log("🚀 GraphRAG Ingestion Pipeline");
  console.log("================================");

  try {
    const labelToId = await ingestKnowledgeGraph();
    await ingestContent(labelToId);
    console.log("\n✅ Ingestion complete!\n");
  } catch (err) {
    console.error("\n❌ Ingestion failed:", err);
    process.exit(1);
  }
}

main();
