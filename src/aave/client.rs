/// AaveClient — wraps alloy's RootProvider and exposes typed async reads.
///
/// Works identically on native (reqwest/tokio) and WASM (reqwest/wasm-bindgen-futures)
/// because alloy's ReqwestProvider uses reqwest, which has WASM support.
use alloy::{
    primitives::Address,
    providers::{Provider, ProviderBuilder},
};
use std::str::FromStr;

use crate::aave::{
    abi::{
        base_to_usd, ray_to_apy_pct, unpack_borrow_enabled, unpack_is_active,
        unpack_liq_threshold, unpack_ltv, IERC20Meta, IPool, IProtocolDataProvider,
    },
    types::{Chain, ReserveData, UserAccountData},
};
use crate::AaveMcpError;

// ─── Contract addresses for ProtocolDataProvider ─────────────────────────────

fn data_provider_address(chain: Chain) -> &'static str {
    match chain {
        Chain::Ethereum => "0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3",
        Chain::Base     => "0x2d8A3C5677189723C4cB8873CfC9C8976ddf54a3",
    }
}

// ─── Client ───────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AaveClient {
    chain: Chain,
    rpc_url: String,
}

impl AaveClient {
    /// Construct with an explicit RPC URL, or pass `None` to use the public default.
    pub fn new(chain: Chain, rpc_url: Option<String>) -> Self {
        let url = rpc_url.unwrap_or_else(|| chain.default_rpc().to_string());
        Self { chain, rpc_url: url }
    }

    /// Build a fresh provider for every call.
    /// alloy's ReqwestProvider is not Clone-safe across async boundaries in WASM,
    /// so we construct per-call — cheap enough for read-only queries.
    async fn provider(
        &self,
    ) -> Result<impl Provider, AaveMcpError> {
        let url = self.rpc_url.parse().map_err(|e| {
            AaveMcpError::Contract(format!("Invalid RPC URL: {e}"))
        })?;
        Ok(ProviderBuilder::new().on_http(url))
    }

    fn parse_addr(&self, addr: &str) -> Result<Address, AaveMcpError> {
        Address::from_str(addr)
            .map_err(|e| AaveMcpError::AddressParse(format!("{addr}: {e}")))
    }

    // ─── Public read methods ──────────────────────────────────────────────────

    /// Fetch risk metrics for a wallet address.
    pub async fn get_user_account_data(
        &self,
        user_address: &str,
    ) -> Result<UserAccountData, AaveMcpError> {
        let provider = self.provider().await?;
        let pool_addr = self.parse_addr(self.chain.pool_address())?;
        let user_addr = self.parse_addr(user_address)?;

        let pool = IPool::new(pool_addr, &provider);
        let data = pool
            .getUserAccountData(user_addr)
            .call()
            .await
            .map_err(|e| AaveMcpError::Contract(e.to_string()))?;

        // healthFactor == type(uint256).max when no borrows → treat as ∞
        let hf_raw = data.healthFactor;
        let health_factor = if hf_raw == alloy::primitives::U256::MAX {
            f64::INFINITY
        } else {
            // healthFactor is scaled by 1e18
            hf_raw.to::<u128>() as f64 / 1e18
        };

        let total_collateral_usd = base_to_usd(data.totalCollateralBase.to::<u128>());
        let total_debt_usd       = base_to_usd(data.totalDebtBase.to::<u128>());
        let available_borrows_usd = base_to_usd(data.availableBorrowsBase.to::<u128>());

        // thresholds are in basis points (1e4 = 100%)
        let liq_threshold_pct = data.currentLiquidationThreshold.to::<u128>() as f64 / 100.0;
        let ltv_pct           = data.ltv.to::<u128>() as f64 / 100.0;

        Ok(UserAccountData {
            address: user_address.to_string(),
            chain: self.chain.name().to_string(),
            total_collateral_usd,
            total_debt_usd,
            available_borrows_usd,
            liquidation_threshold_pct: liq_threshold_pct,
            ltv_pct,
            health_factor,
            risk_label: UserAccountData::risk_label_for(health_factor),
        })
    }

    /// Fetch all active reserves and key metrics for each.
    pub async fn get_markets(&self) -> Result<Vec<ReserveData>, AaveMcpError> {
        let provider = self.provider().await?;
        let pool_addr = self.parse_addr(self.chain.pool_address())?;
        let dp_addr   = self.parse_addr(data_provider_address(self.chain))?;

        let pool = IPool::new(pool_addr, &provider);
        let dp   = IProtocolDataProvider::new(dp_addr, &provider);

        // Fetch all reserve addresses in one call
        let reserves = pool
            .getReservesList()
            .call()
            .await
            .map_err(|e| AaveMcpError::Contract(e.to_string()))?;

        let mut result = Vec::with_capacity(reserves._0.len());

        for asset_addr in reserves._0 {
            // Fetch reserve data and config concurrently
            let config_fut  = pool.getConfiguration(asset_addr).call();
            let rd_fut      = dp.getReserveData(asset_addr).call();
            let symbol_fut  = IERC20Meta::new(asset_addr, &provider).symbol().call();

            let (config_res, rd_res, symbol_res) =
                tokio_or_wasm::join3(config_fut, rd_fut, symbol_fut).await;

            // Skip assets where any call fails (e.g. non-ERC20 edge cases)
            let config = match config_res {
                Ok(c) => c.data.to::<u128>(),
                Err(_) => continue,
            };
            let rd = match rd_res {
                Ok(r) => r,
                Err(_) => continue,
            };
            let symbol = match symbol_res {
                Ok(s) => s._0,
                Err(_) => format!("0x{}", hex::encode(asset_addr.as_slice())),
            };

            result.push(ReserveData {
                asset_address: format!("{asset_addr:#x}"),
                symbol,
                supply_enabled:         unpack_is_active(config),
                borrow_enabled:         unpack_borrow_enabled(config),
                supply_apy_pct:         ray_to_apy_pct(rd.liquidityRate.to::<u128>()),
                variable_borrow_apy_pct: ray_to_apy_pct(rd.variableBorrowRate.to::<u128>()),
                available_liquidity:    rd.totalAToken.to::<u128>() as f64 / 1e6, // approx
                ltv_pct:                unpack_ltv(config),
                liquidation_threshold_pct: unpack_liq_threshold(config),
            });
        }

        Ok(result)
    }

    /// Convenience: return chain name for tool responses.
    pub fn chain_name(&self) -> &str {
        self.chain.name()
    }
}

// ─── Minimal async join helper (native uses tokio, WASM uses futures) ─────────
//
// We don't depend on tokio in WASM, so we have a small shim module
// that uses platform-appropriate join semantics.

mod tokio_or_wasm {
    use std::future::Future;

    /// Join 3 futures sequentially (WASM) or concurrently (native).
    /// For read-only calls the latency difference is acceptable.
    #[cfg(not(target_arch = "wasm32"))]
    pub async fn join3<A, B, C, FA, FB, FC>(fa: FA, fb: FB, fc: FC) -> (A, B, C)
    where
        FA: Future<Output = A>,
        FB: Future<Output = B>,
        FC: Future<Output = C>,
    {
        tokio::join!(fa, fb, fc)
    }

    #[cfg(target_arch = "wasm32")]
    pub async fn join3<A, B, C, FA, FB, FC>(fa: FA, fb: FB, fc: FC) -> (A, B, C)
    where
        FA: Future<Output = A>,
        FB: Future<Output = B>,
        FC: Future<Output = C>,
    {
        // Sequential in WASM — simple and correct
        let a = fa.await;
        let b = fb.await;
        let c = fc.await;
        (a, b, c)
    }
}
