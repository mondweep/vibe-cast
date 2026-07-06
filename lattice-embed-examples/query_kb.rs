//! Query the lattice knowledge-pack passages using lattice's own embedder.
//!
//! Pure-lattice RAG retrieval: no Node, no transformers.js, no @ruvector/rvf.
//! Reads the pack's `lattice-kb.passages.jsonl`, embeds every passage and the
//! query with `lattice-embed` (BgeSmallEnV15, 384-dim — the same model the pack
//! was built with), and returns the cosine top-k passages.
//!
//! One-shot:
//!   cargo run -p lattice-embed --example query_kb -- \
//!     <passages.jsonl> "your question here" [top_k]
//!
//! Interactive REPL (embeds passages once, then loops on stdin):
//!   cargo run -p lattice-embed --example query_kb -- <passages.jsonl>
//!
//! The pack embeds passages with no prefix and queries with the canonical
//! bge-small retrieval instruction (asymmetric retrieval), read here from the
//! `.rvf.embed.json` sidecar convention and applied to the query only.

use lattice_embed::{EmbeddingModel, EmbeddingService, NativeEmbeddingService};
use std::fs;
use std::io::{BufRead, Write};

const QUERY_PREFIX: &str = "Represent this sentence for searching relevant passages: ";

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = std::env::args().skip(1);
    let passages_path = args
        .next()
        .ok_or("usage: query_kb <passages.jsonl> <query> [top_k]")?;
    // No query arg => interactive REPL over stdin.
    let query = args.next();
    let top_k: usize = args.next().and_then(|s| s.parse().ok()).unwrap_or(5);

    // Parse the pack's passages.jsonl: one {"id","text",...} object per line.
    let raw = fs::read_to_string(&passages_path)?;
    let mut ids = Vec::new();
    let mut texts = Vec::new();
    for line in raw.lines().filter(|l| !l.trim().is_empty()) {
        let v: serde_json::Value = serde_json::from_str(line)?;
        let text = v["text"].as_str().unwrap_or_default().to_string();
        if text.is_empty() {
            continue;
        }
        ids.push(v["id"].as_str().unwrap_or("?").to_string());
        texts.push(text);
    }
    eprintln!("Loaded {} passages from {passages_path}", texts.len());

    let service = NativeEmbeddingService::default();
    let model = EmbeddingModel::default(); // BgeSmallEnV15, 384-dim

    // Passages: no prefix (matches the build-time convention). Embed once.
    eprintln!("Embedding passages with lattice ({model}, {}d)...", model.dimensions());
    let passage_vecs = service.embed(&texts, model).await?;

    match query {
        Some(q) => search(&service, model, &passage_vecs, &ids, &texts, &q, top_k).await?,
        None => {
            // REPL: passages stay embedded; each line is a fresh query.
            eprintln!("Ready. Type a question (blank line or Ctrl-D to quit).");
            let stdin = std::io::stdin();
            loop {
                print!("\nkb> ");
                std::io::stdout().flush()?;
                let mut line = String::new();
                if stdin.lock().read_line(&mut line)? == 0 {
                    break; // EOF (Ctrl-D)
                }
                let q = line.trim();
                if q.is_empty() {
                    break;
                }
                search(&service, model, &passage_vecs, &ids, &texts, q, top_k).await?;
            }
        }
    }
    Ok(())
}

/// Embed one query with the retrieval prefix and print the cosine top-k passages.
async fn search(
    service: &NativeEmbeddingService,
    model: EmbeddingModel,
    passage_vecs: &[Vec<f32>],
    ids: &[String],
    texts: &[String],
    query: &str,
    top_k: usize,
) -> Result<(), Box<dyn std::error::Error>> {
    // Query: prepend the bge retrieval instruction (asymmetric retrieval).
    let query_vec = service
        .embed_one(&format!("{QUERY_PREFIX}{query}"), model)
        .await?;

    // Cosine top-k. Embeddings are already L2-normalized, so dot == cosine.
    let mut scored: Vec<(f32, usize)> = passage_vecs
        .iter()
        .enumerate()
        .map(|(i, v)| (lattice_embed::utils::cosine_similarity(&query_vec, v), i))
        .collect();
    scored.sort_by(|a, b| b.0.total_cmp(&a.0));

    for (rank, (score, i)) in scored.iter().take(top_k).enumerate() {
        let snippet: String = texts[*i].chars().take(280).collect();
        let snippet = snippet.replace('\n', " ");
        println!("#{}  score={score:.4}  id={}", rank + 1, ids[*i]);
        println!("    {snippet}\n");
    }
    Ok(())
}
