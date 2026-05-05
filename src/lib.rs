/// aave-mcp crate root.
///
/// This crate compiles to two very different things depending on target:
///
///   native (x86_64 / aarch64)
///   ──────────────────────────
///   The `server` binary (src/bin/server.rs) links against this rlib
///   and runs as a stdio MCP server using rmcp.
///
///   WASM (wasm32-unknown-unknown via wasm-pack)
///   ────────────────────────────────────────────
///   Produces a .wasm + JS glue bundle exposing `AaveWasm` to JavaScript.
///   Runs in browsers, Cloudflare Workers, or any WASM runtime.
///   Signs nothing — tx-building only; delegate signing to the wallet.

pub mod aave;

// Re-export the error type so aave sub-modules can use `crate::AaveMcpError`
pub use aave::types::AaveMcpError;

// ─── Native MCP tools ─────────────────────────────────────────────────────────
#[cfg(not(target_arch = "wasm32"))]
pub mod mcp;

// ─── WASM public API ──────────────────────────────────────────────────────────
#[cfg(target_arch = "wasm32")]
pub mod wasm;
