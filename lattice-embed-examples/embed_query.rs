//! Print a bge-small query embedding as a JSON float array, for feeding into an
//! external vector store (e.g. the knowledge-pack's prebuilt `.rvf`).
//!
//! Embeds with lattice (BgeSmallEnV15, 384-dim) and prepends the canonical
//! bge-small retrieval instruction so the vector matches the asymmetric
//! convention the `.rvf` was built with.
//!
//!   cargo run -q -p lattice-embed --example embed_query -- "your question"
//!   -> [0.0123,-0.0456,...]   (384 floats, L2-normalized)

use lattice_embed::{EmbeddingModel, EmbeddingService, NativeEmbeddingService};

const QUERY_PREFIX: &str = "Represent this sentence for searching relevant passages: ";

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let query = std::env::args()
        .skip(1)
        .collect::<Vec<_>>()
        .join(" ");
    if query.trim().is_empty() {
        return Err("usage: embed_query <query text>".into());
    }
    let service = NativeEmbeddingService::default();
    let model = EmbeddingModel::default(); // BgeSmallEnV15, 384-dim
    let v = service
        .embed_one(&format!("{QUERY_PREFIX}{query}"), model)
        .await?;
    // Compact JSON array on stdout; diagnostics stay on stderr.
    let body = v
        .iter()
        .map(|x| format!("{x}"))
        .collect::<Vec<_>>()
        .join(",");
    println!("[{body}]");
    Ok(())
}
