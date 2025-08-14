use crate::client::CdpClient;
use crate::error::{CdpError, Result};
use openapi_client::apis::evm_accounts_api;
use openapi_client::models::{CreateEvmAccountRequest, EvmAccount, SignEvmTransactionRequest};

/// High-level EVM API wrapper that provides easy access to EVM-related operations
pub struct EvmApi<'a> {
    client: &'a CdpClient,
}

impl<'a> EvmApi<'a> {
    pub fn new(client: &'a CdpClient) -> Self {
        Self { client }
    }

    /// List EVM accounts
    pub async fn list_accounts(
        &self,
        page_size: Option<i32>,
        page_token: Option<String>,
    ) -> Result<openapi_client::models::ListEvmAccounts200Response> {
        let config = self.client.openapi_config();
        let params = evm_accounts_api::ListEvmAccountsParams {
            page_size,
            page_token,
        };
        evm_accounts_api::list_evm_accounts(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Create a new EVM account
    pub async fn create_account(
        &self,
        request: CreateEvmAccountRequest,
    ) -> Result<EvmAccount> {
        let config = self.client.openapi_config();
        let params = evm_accounts_api::CreateEvmAccountParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            create_evm_account_request: Some(request),
        };
        evm_accounts_api::create_evm_account(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Get an EVM account by address
    pub async fn get_account(
        &self,
        address: String,
    ) -> Result<EvmAccount> {
        let config = self.client.openapi_config();
        let params = evm_accounts_api::GetEvmAccountParams {
            address,
        };
        evm_accounts_api::get_evm_account(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Sign a transaction with an EVM account
    pub async fn sign_transaction(
        &self,
        address: String,
        request: SignEvmTransactionRequest,
    ) -> Result<openapi_client::models::SignEvmTransaction200Response> {
        let config = self.client.openapi_config();
        evm_accounts_api::sign_evm_transaction(&config, openapi_client::apis::evm_accounts_api::SignEvmTransactionParams {
            x_wallet_auth: "".to_string(),
            x_idempotency_key: None,
            address,
            sign_evm_transaction_request: Some(request),
        })
            .await
            .map_err(CdpError::from)
    }
}
