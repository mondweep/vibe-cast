/// aave-mcp stdio server binary.
///
/// Run directly:
///   cargo run --bin server
///
/// Or via Claude Desktop / Claude Code (.mcp.json):
///   {
///     "mcpServers": {
///       "aave": {
///         "command": "/path/to/target/release/server"
///       }
///     }
///   }
///
/// CRITICAL: Never write to stdout except via rmcp — doing so corrupts
/// the JSON-RPC stream. All logging goes to stderr via tracing.

use aave_mcp::mcp::AaveMcpServer;
use rmcp::{transport::stdio, ServiceExt};
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Route all logs to stderr — stdout is owned by the MCP JSON-RPC transport.
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_env_filter(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "aave_mcp=info".into()),
        )
        .init();

    info!(
        version = env!("CARGO_PKG_VERSION"),
        "starting aave-mcp stdio server"
    );

    let service = AaveMcpServer::new().serve(stdio()).await?;
    service.waiting().await?;

    info!("aave-mcp server shut down cleanly");
    Ok(())
}
