/// WASM public API — exposed to JavaScript via wasm-bindgen.
///
/// Design principles:
///   - Read-only: fetches data, returns JSON strings.
///   - No signing: tx building is out of scope here; the host wallet does that.
///   - All async functions return JsValue (serialised JSON) or JsValue error.
///
/// Usage from JavaScript / TypeScript:
///   ```ts
///   import init, { AaveWasm } from "./pkg/aave_mcp.js";
///   await init();
///
///   const sdk = new AaveWasm("base", undefined);
///   const markets = JSON.parse(await sdk.get_markets());
///   const account = JSON.parse(await sdk.get_user_account("0xYourAddress"));
///   ```

use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::future_to_promise;

use crate::aave::{AaveClient, Chain};

// Better panic messages in browser console
#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

// ─── AaveWasm class ───────────────────────────────────────────────────────────

#[wasm_bindgen]
pub struct AaveWasm {
    client: AaveClient,
}

#[wasm_bindgen]
impl AaveWasm {
    /// Construct the SDK.
    ///
    /// @param chain    - "ethereum" | "base"
    /// @param rpc_url  - optional custom RPC URL (pass `undefined` for public default)
    #[wasm_bindgen(constructor)]
    pub fn new(chain: &str, rpc_url: Option<String>) -> Result<AaveWasm, JsValue> {
        let chain = Chain::try_from(chain)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        Ok(AaveWasm {
            client: AaveClient::new(chain, rpc_url),
        })
    }

    /// Fetch all active Aave V3 markets.
    ///
    /// @returns Promise<string> — JSON array of ReserveData objects.
    pub fn get_markets(&self) -> js_sys::Promise {
        let client = self.client.clone();
        future_to_promise(async move {
            let markets = client
                .get_markets()
                .await
                .map_err(|e| JsValue::from_str(&e.to_string()))?;
            let json = serde_json::to_string_pretty(&markets)
                .map_err(|e| JsValue::from_str(&e.to_string()))?;
            Ok(JsValue::from_str(&json))
        })
    }

    /// Fetch account health data for a wallet address.
    ///
    /// @param address  - Ethereum address (0x…)
    /// @returns Promise<string> — JSON UserAccountData object.
    pub fn get_user_account(&self, address: String) -> js_sys::Promise {
        let client = self.client.clone();
        future_to_promise(async move {
            let account = client
                .get_user_account_data(&address)
                .await
                .map_err(|e| JsValue::from_str(&e.to_string()))?;
            let json = serde_json::to_string_pretty(&account)
                .map_err(|e| JsValue::from_str(&e.to_string()))?;
            Ok(JsValue::from_str(&json))
        })
    }

    /// Returns the chain name this instance is configured for.
    pub fn chain_name(&self) -> String {
        self.client.chain_name().to_string()
    }
}
