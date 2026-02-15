//! Convenience wrapper around the CDP [`Client`] for common wallet operations.
//!
//! The [`Wallet`] struct provides a high-level, ergonomic interface for
//! interacting with an EVM account on the Coinbase Developer Platform.
//! It abstracts away the raw request builders exposed by the generated API
//! client, offering simple methods for requesting testnet funds, querying
//! balances, and sending asset transfers.
//!
//! # Example
//!
//! ```rust,no_run
//! use cdp_sdk::wallet::Wallet;
//! use cdp_sdk::api::Client;
//! use cdp_sdk::auth::WalletAuth;
//! use cdp_sdk::CDP_BASE_URL;
//!
//! # async fn example() -> Result<(), Box<dyn std::error::Error>> {
//! let auth = WalletAuth::builder()
//!     .api_key_id("my-key-id".to_string())
//!     .api_key_secret("my-key-secret".to_string())
//!     .wallet_secret("my-wallet-secret".to_string())
//!     .build()?;
//!
//! let http = reqwest_middleware::ClientBuilder::new(reqwest::Client::new())
//!     .with(auth)
//!     .build();
//!
//! let client = Client::new_with_client(CDP_BASE_URL, http);
//!
//! let wallet = Wallet::new(client, "0xYourAddress", "base-sepolia");
//!
//! // Request testnet ETH
//! let faucet_tx = wallet.faucet("eth").await?;
//! println!("Faucet tx: {}", faucet_tx.transaction_hash);
//!
//! // Check balance
//! let bal = wallet.balance("eth").await?;
//! println!("Balance: {} (decimals: {})", bal.amount.amount.as_str(), bal.amount.decimals);
//! # Ok(())
//! # }
//! ```

use crate::api::{
    self,
    types::{
        self, ListEvmTokenBalancesNetwork, RequestEvmFaucetBodyNetwork, RequestEvmFaucetBodyToken,
        RequestEvmFaucetResponse, SendEvmTransactionBodyNetwork, SendEvmTransactionResponse,
        TokenBalance,
    },
    Client,
};

/// Alias for the error type returned by wallet operations.
pub type WalletError = api::Error<types::Error>;

/// The result of a faucet request, containing the transaction hash.
pub type FaucetResponse = RequestEvmFaucetResponse;

/// The result of sending a transaction, containing the transaction hash.
pub type TransactionResponse = SendEvmTransactionResponse;

/// A token balance entry with amount, decimals, and token metadata.
///
/// The `amount` field is denominated in the smallest indivisible unit of the
/// token (e.g., Wei for ETH). Use `decimals` to convert to standard units.
pub type BalanceResponse = TokenBalance;

/// High-level convenience wrapper around the CDP [`Client`].
///
/// A `Wallet` is bound to a specific EVM address and network. It delegates
/// all HTTP communication to the underlying generated [`Client`], but exposes
/// simpler method signatures that hide the builder pattern.
pub struct Wallet {
    client: Client,
    address: String,
    network: String,
}

impl Wallet {
    /// Create a new `Wallet` bound to the given address and network.
    ///
    /// # Arguments
    ///
    /// * `client` – An authenticated [`Client`] instance (typically built with
    ///   [`WalletAuth`](crate::auth::WalletAuth) middleware).
    /// * `address` – A 0x-prefixed EVM address that this wallet operates on.
    /// * `network` – The human-readable network name (e.g. `"base-sepolia"`,
    ///   `"ethereum-sepolia"`).
    pub fn new(client: Client, address: &str, network: &str) -> Self {
        Self {
            client,
            address: address.to_owned(),
            network: network.to_owned(),
        }
    }

    /// Request testnet funds from the faucet.
    ///
    /// # Arguments
    ///
    /// * `asset_id` – The token to request (e.g. `"eth"`, `"usdc"`, `"eurc"`,
    ///   `"cbbtc"`).
    ///
    /// # Errors
    ///
    /// Returns an error if the network or token is not supported by the faucet,
    /// or if the underlying API request fails.
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// # async fn example(wallet: cdp_sdk::wallet::Wallet) -> Result<(), Box<dyn std::error::Error>> {
    /// let resp = wallet.faucet("eth").await?;
    /// println!("Faucet tx hash: {}", resp.transaction_hash);
    /// # Ok(())
    /// # }
    /// ```
    pub async fn faucet(&self, asset_id: &str) -> Result<FaucetResponse, WalletError> {
        let network: RequestEvmFaucetBodyNetwork = self
            .network
            .parse()
            .map_err(|_| api::Error::InvalidRequest(format!(
                "unsupported faucet network: {}",
                self.network
            )))?;

        let token: RequestEvmFaucetBodyToken = asset_id
            .parse()
            .map_err(|_| api::Error::InvalidRequest(format!(
                "unsupported faucet token: {}",
                asset_id
            )))?;

        let address = self.address.clone();
        let resp = self
            .client
            .request_evm_faucet()
            .body_map(|body| body.address(address).network(network).token(token))
            .send()
            .await?;

        Ok(resp.into_inner())
    }

    /// Send a raw, RLP-encoded EVM transaction.
    ///
    /// This is the low-level transfer primitive. The `transaction` parameter
    /// must be a 0x-prefixed hex string containing the RLP-encoded transaction.
    ///
    /// For most use-cases you will want to construct the transaction using a
    /// library such as [`alloy`](https://docs.rs/alloy) and then pass the
    /// serialised bytes here.
    ///
    /// # Arguments
    ///
    /// * `transaction` – A 0x-prefixed, RLP-encoded transaction hex string.
    ///
    /// # Errors
    ///
    /// Returns an error if the network is not supported or the API call fails.
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// # async fn example(wallet: cdp_sdk::wallet::Wallet) -> Result<(), Box<dyn std::error::Error>> {
    /// let tx_hash = wallet.transfer("0x02f8...").await?;
    /// println!("Transaction hash: {}", tx_hash.transaction_hash);
    /// # Ok(())
    /// # }
    /// ```
    pub async fn transfer(
        &self,
        transaction: &str,
    ) -> Result<TransactionResponse, WalletError> {
        let network: SendEvmTransactionBodyNetwork = self
            .network
            .parse()
            .map_err(|_| api::Error::InvalidRequest(format!(
                "unsupported transaction network: {}",
                self.network
            )))?;

        let tx = transaction.to_owned();
        let resp = self
            .client
            .send_evm_transaction()
            .address(&self.address)
            .body_map(|body| body.network(network).transaction(tx))
            .send()
            .await?;

        Ok(resp.into_inner())
    }

    /// Fetch the balance of a specific token for this wallet.
    ///
    /// Queries the EVM token balances endpoint and returns the first entry
    /// whose token symbol matches `asset_id` (case-insensitive). If the token
    /// is not found in the response, an [`InvalidRequest`](api::Error::InvalidRequest)
    /// error is returned.
    ///
    /// # Arguments
    ///
    /// * `asset_id` – The token symbol to look up (e.g. `"ETH"`, `"USDC"`).
    ///   The comparison is case-insensitive.
    ///
    /// # Errors
    ///
    /// Returns an error if the network is not supported, the API call fails,
    /// or no balance entry matching `asset_id` is found.
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// # async fn example(wallet: cdp_sdk::wallet::Wallet) -> Result<(), Box<dyn std::error::Error>> {
    /// let bal = wallet.balance("eth").await?;
    /// println!("Balance: {} (decimals: {})", bal.amount.amount.as_str(), bal.amount.decimals);
    /// # Ok(())
    /// # }
    /// ```
    pub async fn balance(&self, asset_id: &str) -> Result<BalanceResponse, WalletError> {
        let network: ListEvmTokenBalancesNetwork = self
            .network
            .parse()
            .map_err(|_| api::Error::InvalidRequest(format!(
                "unsupported balance network: {}",
                self.network
            )))?;

        let resp = self
            .client
            .list_evm_token_balances()
            .network(network)
            .address(&self.address)
            .send()
            .await?;

        let asset_lower = asset_id.to_lowercase();
        let inner = resp.into_inner();

        inner
            .balances
            .into_iter()
            .find(|b| {
                b.token
                    .symbol
                    .as_deref()
                    .is_some_and(|s| s.to_lowercase() == asset_lower)
            })
            .ok_or_else(|| {
                api::Error::InvalidRequest(format!(
                    "no balance found for asset '{}' on network '{}'",
                    asset_id, self.network
                ))
            })
    }

    /// Returns a reference to the underlying [`Client`].
    pub fn client(&self) -> &Client {
        &self.client
    }

    /// Returns the EVM address this wallet is bound to.
    pub fn address(&self) -> &str {
        &self.address
    }

    /// Returns the network this wallet is bound to.
    pub fn network(&self) -> &str {
        &self.network
    }
}
