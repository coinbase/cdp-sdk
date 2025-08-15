use crate::auth::{AuthConfig, AuthMiddleware};
use crate::error::{CdpError, Result};
use crate::evm::EvmApi;
use crate::solana::SolanaApi;
use crate::policies::PoliciesApi;
use reqwest_middleware::{ClientBuilder, ClientWithMiddleware};
use std::env;

/// Configuration options for the CDP client
#[derive(Debug, Clone)]
pub struct CdpClientOptions {
    /// The API key ID
    pub api_key_id: Option<String>,
    /// The API key secret
    pub api_key_secret: Option<String>,
    /// The wallet secret
    pub wallet_secret: Option<String>,
    /// Whether to enable debugging
    pub debugging: Option<bool>,
    /// The host URL to connect to
    pub base_path: Option<String>,
    /// The source identifier for requests
    pub source: Option<String>,
    /// The version of the source making requests
    pub source_version: Option<String>,
    /// JWT expiration time in seconds
    pub expires_in: Option<u64>,
}

impl Default for CdpClientOptions {
    fn default() -> Self {
        Self {
            api_key_id: None,
            api_key_secret: None,
            wallet_secret: None,
            debugging: None,
            base_path: None,
            source: None,
            source_version: None,
            expires_in: None,
        }
    }
}

/// The main client for interacting with the CDP API
pub struct CdpClient {
    client: ClientWithMiddleware,
    base_url: String,
}

impl CdpClient {
    /// Creates a new CDP client with the specified configuration.
    ///
    /// Required parameters can be set as environment variables:
    /// - `CDP_API_KEY_ID`: Your API key ID
    /// - `CDP_API_KEY_SECRET`: Your API key secret
    /// - `CDP_WALLET_SECRET`: Your wallet secret (for write operations)
    ///
    /// Or passed as options to the constructor.
    ///
    /// # Example
    ///
    /// ```rust
    /// use cdp_sdk::{CdpClient, CdpClientOptions};
    ///
    /// let client = CdpClient::new(CdpClientOptions {
    ///     api_key_id: Some("your-api-key-id".to_string()),
    ///     api_key_secret: Some("your-api-key-secret".to_string()),
    ///     wallet_secret: Some("your-wallet-secret".to_string()),
    ///     ..Default::default()
    /// }).expect("Failed to create client");
    /// ```
    pub fn new(options: CdpClientOptions) -> Result<Self> {
        // Get configuration from options or environment variables
        let api_key_id = options.api_key_id
            .or_else(|| env::var("CDP_API_KEY_ID").ok())
            .or_else(|| env::var("CDP_API_KEY_NAME").ok())
            .ok_or_else(|| CdpError::Config(
                "Missing required CDP Secret API Key configuration.\n\n\
                You can set them as environment variables:\n\
                CDP_API_KEY_ID=your-api-key-id\n\
                CDP_API_KEY_SECRET=your-api-key-secret\n\n\
                Or pass them as options to the constructor.\n\n\
                For write operations, also set:\n\
                CDP_WALLET_SECRET=your-wallet-secret".to_string()
            ))?;

        let api_key_secret = options.api_key_secret
            .or_else(|| env::var("CDP_API_KEY_SECRET").ok())
            .ok_or_else(|| CdpError::Config(
                "Missing required CDP Secret API Key configuration.\n\n\
                You can set them as environment variables:\n\
                CDP_API_KEY_ID=your-api-key-id\n\
                CDP_API_KEY_SECRET=your-api-key-secret\n\n\
                Or pass them as options to the constructor.\n\n\
                For write operations, also set:\n\
                CDP_WALLET_SECRET=your-wallet-secret".to_string()
            ))?;

        let wallet_secret = options.wallet_secret
            .or_else(|| env::var("CDP_WALLET_SECRET").ok());

        let debug = options.debugging.unwrap_or(false);
        let base_url = options.base_path
            .unwrap_or_else(|| "https://api.cdp.coinbase.com".to_string());

        // Create auth configuration
        let auth_config = AuthConfig {
            api_key_id,
            api_key_secret,
            wallet_secret,
            source: options.source,
            source_version: options.source_version,
            expires_in: options.expires_in,
            debug,
        };

        // Build HTTP client with auth middleware
        let client = ClientBuilder::new(reqwest::Client::new())
            .with(AuthMiddleware::new(auth_config))
            .build();

        Ok(Self {
            client,
            base_url,
        })
    }

    /// Get the underlying HTTP client
    pub fn http_client(&self) -> &ClientWithMiddleware {
        &self.client
    }

    /// Get the base URL
    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    /// Create a new openapi client configuration using this client's settings
    pub fn openapi_config(&self) -> crate::apis::configuration::Configuration {
        let mut config = crate::apis::configuration::Configuration::new();
        config.client = self.client.clone();
        config
    }

    /// Get high-level EVM API
    pub fn evm(&self) -> EvmApi<'_> {
        EvmApi::new(self)
    }

    /// Get high-level Solana API
    pub fn solana(&self) -> SolanaApi<'_> {
        SolanaApi::new(self)
    }

    /// Get high-level Policies API
    pub fn policies(&self) -> PoliciesApi<'_> {
        PoliciesApi::new(self)
    }
}
