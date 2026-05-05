/// Aave V3 contract ABI definitions via alloy's sol! macro.
///
/// We only define the functions we actually call — no need to inline
/// the full ABIs. The #[sol(rpc)] attribute generates typed async
/// call methods that work on both native and WASM providers.
use alloy::sol;

// ─── Aave V3 Pool ─────────────────────────────────────────────────────────────

sol! {
    #[sol(rpc)]
    interface IPool {
        /// Core risk metrics for a wallet position.
        /// Returns values in USD with 8 decimal places (base currency).
        function getUserAccountData(address user)
            external
            view
            returns (
                uint256 totalCollateralBase,
                uint256 totalDebtBase,
                uint256 availableBorrowsBase,
                uint256 currentLiquidationThreshold,
                uint256 ltv,
                uint256 healthFactor
            );

        /// Returns the list of all initialised reserves (asset addresses).
        function getReservesList()
            external
            view
            returns (address[] memory);

        /// Packed reserve configuration bitmap.
        /// Bits 0–15: LTV, 16–31: liquidation threshold, 32–47: liquidation bonus,
        /// 48–55: decimals, 56: reserve is active, 57: reserve is frozen, etc.
        function getConfiguration(address asset)
            external
            view
            returns (uint256 data);

        /// Reserve normalised income (liquidity index scaled by 1e27 RAY).
        /// Used to derive supply APY from the raw rate.
        function getReserveNormalizedIncome(address asset)
            external
            view
            returns (uint256);
    }
}

// ─── Aave V3 DataProvider ─────────────────────────────────────────────────────

sol! {
    #[sol(rpc)]
    interface IProtocolDataProvider {
        /// Aggregated per-reserve data — one call instead of many.
        function getReserveData(address asset)
            external
            view
            returns (
                uint256 unbacked,
                uint256 accruedToTreasuryScaled,
                uint256 totalAToken,
                uint256 totalStableDebt,
                uint256 totalVariableDebt,
                uint256 liquidityRate,       // supply APY in RAY (1e27)
                uint256 variableBorrowRate,  // variable borrow APY in RAY
                uint256 stableBorrowRate,
                uint256 averageStableBorrowRate,
                uint256 liquidityIndex,
                uint256 variableBorrowIndex,
                uint40  lastUpdateTimestamp
            );

        /// Human-readable token metadata for a reserve.
        function getReserveTokensAddresses(address asset)
            external
            view
            returns (
                address aTokenAddress,
                address stableDebtTokenAddress,
                address variableDebtTokenAddress
            );
    }
}

// ─── ERC-20 (symbol + decimals) ───────────────────────────────────────────────

sol! {
    #[sol(rpc)]
    interface IERC20Meta {
        function symbol()   external view returns (string);
        function decimals() external view returns (uint8);
    }
}

// ─── Helper: RAY → APY ────────────────────────────────────────────────────────

/// Convert an Aave RAY rate (1e27 fixed-point) to an annualised APY percentage.
/// Formula: APY = ((1 + rate / SECONDS_PER_YEAR / 1e27) ^ SECONDS_PER_YEAR - 1) * 100
pub fn ray_to_apy_pct(ray: u128) -> f64 {
    const RAY: f64 = 1e27;
    const SPY: f64 = 31_536_000.0; // seconds per year
    let rate_per_second = ray as f64 / RAY / SPY;
    ((1.0 + rate_per_second).powf(SPY) - 1.0) * 100.0
}

/// Convert a base-currency value (8-decimal USD) to f64 USD.
pub fn base_to_usd(base: u128) -> f64 {
    base as f64 / 1e8
}

/// Unpack LTV from Aave's configuration bitmap (bits 0–15, basis points).
pub fn unpack_ltv(config: u128) -> f64 {
    (config & 0xFFFF) as f64 / 100.0
}

/// Unpack liquidation threshold from config bitmap (bits 16–31, basis points).
pub fn unpack_liq_threshold(config: u128) -> f64 {
    ((config >> 16) & 0xFFFF) as f64 / 100.0
}

/// Unpack "reserve is active" flag from config bitmap (bit 56).
pub fn unpack_is_active(config: u128) -> bool {
    (config >> 56) & 1 == 1
}

/// Unpack "borrowing enabled" flag from config bitmap (bit 58).
pub fn unpack_borrow_enabled(config: u128) -> bool {
    (config >> 58) & 1 == 1
}
