/// Native MCP server implementation using the official Rust MCP SDK (rmcp).
///
/// Tools exposed:
///   aave_get_markets       — all active reserves + APYs for a chain
///   aave_get_user_account  — risk snapshot for a wallet address
///
/// To add write tools (supply / borrow / repay) in Phase 2, add them here
/// with appropriate wallet/signer injection via AaveClient.

use rmcp::{
    handler::server::router::tool::ToolRouter,
    model::{
        CallToolResult, Content, Implementation, ProtocolVersion,
        ServerCapabilities, ServerInfo,
    },
    tool, tool_handler, tool_router, ErrorData as McpError, ServerHandler,
};
use schemars::JsonSchema;
use serde::Deserialize;
use std::sync::Arc;

use crate::aave::{AaveClient, Chain};

// ─── Input schemas ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, JsonSchema)]
pub struct GetMarketsInput {
    #[schemars(description = "Target chain: 'ethereum' or 'base' (default: 'base')")]
    pub chain: Option<String>,

    #[schemars(description = "Custom RPC URL. Omit to use the public default.")]
    pub rpc_url: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct GetUserAccountInput {
    #[schemars(description = "Ethereum wallet address (0x…)")]
    pub address: String,

    #[schemars(description = "Target chain: 'ethereum' or 'base' (default: 'base')")]
    pub chain: Option<String>,

    #[schemars(description = "Custom RPC URL. Omit to use the public default.")]
    pub rpc_url: Option<String>,
}

// ─── Server struct ────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AaveMcpServer {
    tool_router: ToolRouter<Self>,
}

// ─── Tool implementations ─────────────────────────────────────────────────────

#[tool_router]
impl AaveMcpServer {
    pub fn new() -> Self {
        Self {
            tool_router: Self::tool_router(),
        }
    }

    /// Returns all active Aave V3 reserve markets on the specified chain,
    /// including supply APY, variable borrow APY, LTV, and liquidation threshold.
    #[tool(description = "List all active Aave V3 markets (reserves) on a given chain. \
        Returns asset symbol, supply APY, variable borrow APY, LTV, and liquidation \
        threshold. Chain options: 'ethereum', 'base'.")]
    async fn aave_get_markets(
        &self,
        #[tool(aggr)] input: GetMarketsInput,
    ) -> Result<CallToolResult, McpError> {
        let chain = resolve_chain(input.chain.as_deref())?;
        let client = AaveClient::new(chain, input.rpc_url);

        let markets = client.get_markets().await.map_err(mcp_err)?;

        let json = serde_json::to_string_pretty(&markets).map_err(mcp_err)?;
        Ok(CallToolResult::success(vec![Content::text(json)]))
    }

    /// Returns the Aave V3 account health metrics for a wallet address:
    /// total collateral, total debt, available borrows, health factor, and a
    /// risk label (SAFE / MODERATE / RISKY / CRITICAL / LIQUIDATABLE).
    #[tool(description = "Get Aave V3 account data for a wallet address. Returns \
        total collateral (USD), total debt (USD), available borrows (USD), health \
        factor, and a risk label. Chain options: 'ethereum', 'base'.")]
    async fn aave_get_user_account(
        &self,
        #[tool(aggr)] input: GetUserAccountInput,
    ) -> Result<CallToolResult, McpError> {
        let chain = resolve_chain(input.chain.as_deref())?;
        let client = AaveClient::new(chain, input.rpc_url);

        let account = client
            .get_user_account_data(&input.address)
            .await
            .map_err(mcp_err)?;

        let json = serde_json::to_string_pretty(&account).map_err(mcp_err)?;
        Ok(CallToolResult::success(vec![Content::text(json)]))
    }
}

// ─── ServerHandler impl ───────────────────────────────────────────────────────

#[tool_handler]
impl ServerHandler for AaveMcpServer {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            protocol_version: ProtocolVersion::V_2024_11_05,
            capabilities: ServerCapabilities::builder()
                .enable_tools()
                .build(),
            server_info: Implementation {
                name: "aave-mcp".into(),
                version: env!("CARGO_PKG_VERSION").into(),
            },
            instructions: Some(
                "Aave V3 read-only MCP server. \
                 Use aave_get_markets to explore all markets on a chain, \
                 and aave_get_user_account to check a wallet's health factor \
                 and liquidation risk. Supported chains: ethereum, base."
                    .into(),
            ),
        }
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn resolve_chain(input: Option<&str>) -> Result<Chain, McpError> {
    let s = input.unwrap_or("base");
    Chain::try_from(s).map_err(|e| McpError::invalid_params(e.to_string(), None))
}

fn mcp_err(e: impl std::fmt::Display) -> McpError {
    McpError::internal_error(e.to_string(), None)
}
