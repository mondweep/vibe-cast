/// Aave protocol data types — shared by native and WASM targets.
/// All types derive Serialize/Deserialize so they round-trip cleanly
/// through MCP JSON responses and wasm-bindgen JsValue conversions.
use serde::{Deserialize, Serialize};

// ─── Chain configuration ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Chain {
    Ethereum,
    Base,
}

impl Chain {
    /// Human-readable name
    pub fn name(&self) -> &'static str {
        match self {
            Chain::Ethereum => "ethereum",
            Chain::Base => "base",
        }
    }

    /// EIP-155 chain ID
    pub fn chain_id(&self) -> u64 {
        match self {
            Chain::Ethereum => 1,
            Chain::Base => 8453,
        }
    }

    /// Aave V3 Pool contract address
    pub fn pool_address(&self) -> &'static str {
        match self {
            Chain::Ethereum => "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
            Chain::Base     => "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
        }
    }

    /// Aave V3 PoolAddressesProvider
    pub fn addresses_provider(&self) -> &'static str {
        match self {
            Chain::Ethereum => "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e",
            Chain::Base     => "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64b",
        }
    }

    /// UiPoolDataProviderV3 (aggregated reserve + user data)
    pub fn ui_data_provider(&self) -> &'static str {
        match self {
            Chain::Ethereum => "0x91c0eA31b49B69Ea18607702c5d9aC360bf3dE7d",
            Chain::Base     => "0x68100bD5345eA474D93577127C11F39FF8463e93",
        }
    }

    /// Default public RPC endpoint (no auth required — replace with Alchemy/Infura for prod)
    pub fn default_rpc(&self) -> &'static str {
        match self {
            Chain::Ethereum => "https://eth.llamarpc.com",
            Chain::Base     => "https://mainnet.base.org",
        }
    }
}

impl std::fmt::Display for Chain {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.name())
    }
}

impl TryFrom<&str> for Chain {
    type Error = crate::AaveMcpError;
    fn try_from(s: &str) -> Result<Self, Self::Error> {
        match s.to_lowercase().as_str() {
            "ethereum" | "eth" | "mainnet" | "1" => Ok(Chain::Ethereum),
            "base" | "8453"                       => Ok(Chain::Base),
            other => Err(crate::AaveMcpError::UnknownChain(other.to_string())),
        }
    }
}

// ─── User account snapshot ────────────────────────────────────────────────────

/// Result of Pool.getUserAccountData() — the key risk metrics for a wallet.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserAccountData {
    /// Wallet address queried
    pub address: String,
    /// Chain the data came from
    pub chain: String,
    /// Total collateral in USD (8 decimals, base currency = USD)
    pub total_collateral_usd: f64,
    /// Total debt in USD
    pub total_debt_usd: f64,
    /// Available to borrow in USD
    pub available_borrows_usd: f64,
    /// Liquidation threshold (percentage, e.g. 80.5)
    pub liquidation_threshold_pct: f64,
    /// Loan-to-value ratio (percentage)
    pub ltv_pct: f64,
    /// Health factor — <1.0 means liquidatable. Raw u256 / 1e18.
    pub health_factor: f64,
    /// Summary risk label
    pub risk_label: &'static str,
}

impl UserAccountData {
    /// Classify health factor into a simple risk label
    pub fn risk_label_for(hf: f64) -> &'static str {
        if hf < 1.0      { "LIQUIDATABLE" }
        else if hf < 1.1 { "CRITICAL" }
        else if hf < 1.5 { "RISKY" }
        else if hf < 2.0 { "MODERATE" }
        else              { "SAFE" }
    }
}

// ─── Reserve (market) snapshot ────────────────────────────────────────────────

/// Per-asset reserve data from the Pool.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReserveData {
    /// Token contract address
    pub asset_address: String,
    /// Token symbol (USDC, WETH, …)
    pub symbol: String,
    /// Whether supplying this asset is enabled
    pub supply_enabled: bool,
    /// Whether borrowing this asset is enabled
    pub borrow_enabled: bool,
    /// Annual supply APY in percent
    pub supply_apy_pct: f64,
    /// Annual variable borrow APY in percent
    pub variable_borrow_apy_pct: f64,
    /// Available liquidity (human units, 6 decimal approximation)
    pub available_liquidity: f64,
    /// LTV as collateral (percentage)
    pub ltv_pct: f64,
    /// Liquidation threshold (percentage)
    pub liquidation_threshold_pct: f64,
}

// ─── Error type ───────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum AaveMcpError {
    #[error("RPC error: {0}")]
    Rpc(#[from] alloy::transports::RpcError<alloy::transports::TransportErrorKind>),

    #[error("Contract error: {0}")]
    Contract(String),

    #[error("Unknown chain: '{0}'. Use 'ethereum' or 'base'.")]
    UnknownChain(String),

    #[error("Address parse error: {0}")]
    AddressParse(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}
