use crate::client::CdpClient;
use crate::error::{CdpError, Result};
use openapi_client::apis::solana_accounts_api;
use openapi_client::models::{
    SolanaAccount, CreateSolanaAccountRequest, SignSolanaTransactionRequest, ImportSolanaAccountRequest,
    UpdateSolanaAccountRequest, SignSolanaMessageRequest
};

/// High-level Solana API wrapper that provides easy access to Solana-related operations
pub struct SolanaApi<'a> {
    client: &'a CdpClient,
}

impl<'a> SolanaApi<'a> {
    pub fn new(client: &'a CdpClient) -> Self {
        Self { client }
    }

    /// List Solana accounts
    pub async fn list_accounts(
        &self,
        page_size: Option<i32>,
        page_token: Option<String>,
    ) -> Result<openapi_client::models::ListSolanaAccounts200Response> {
        let config = self.client.openapi_config();
        let params = solana_accounts_api::ListSolanaAccountsParams {
            page_size,
            page_token,
        };
        solana_accounts_api::list_solana_accounts(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Create a new Solana account
    pub async fn create_account(
        &self,
        request: CreateSolanaAccountRequest,
    ) -> Result<SolanaAccount> {
        let config = self.client.openapi_config();
        let params = solana_accounts_api::CreateSolanaAccountParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            create_solana_account_request: Some(request),
        };
        solana_accounts_api::create_solana_account(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Get a Solana account by address
    pub async fn get_account(
        &self,
        address: String,
    ) -> Result<SolanaAccount> {
        let config = self.client.openapi_config();
        let params = solana_accounts_api::GetSolanaAccountParams {
            address,
        };
        solana_accounts_api::get_solana_account(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Get a Solana account by name
    pub async fn get_account_by_name(
        &self,
        name: String,
    ) -> Result<SolanaAccount> {
        let config = self.client.openapi_config();
        let params = solana_accounts_api::GetSolanaAccountByNameParams {
            name,
        };
        solana_accounts_api::get_solana_account_by_name(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Import a Solana account
    pub async fn import_account(
        &self,
        request: ImportSolanaAccountRequest,
    ) -> Result<SolanaAccount> {
        let config = self.client.openapi_config();
        let params = solana_accounts_api::ImportSolanaAccountParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            import_solana_account_request: Some(request),
        };
        solana_accounts_api::import_solana_account(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Export a Solana account by address
    pub async fn export_account(
        &self,
        address: String,
        request: openapi_client::models::ExportEvmAccountRequest,
    ) -> Result<openapi_client::models::ExportSolanaAccount200Response> {
        let config = self.client.openapi_config();
        let params = solana_accounts_api::ExportSolanaAccountParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            address,
            export_evm_account_request: Some(request),
        };
        solana_accounts_api::export_solana_account(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Export a Solana account by name
    pub async fn export_account_by_name(
        &self,
        name: String,
        request: openapi_client::models::ExportEvmAccountRequest,
    ) -> Result<openapi_client::models::ExportSolanaAccount200Response> {
        let config = self.client.openapi_config();
        let params = solana_accounts_api::ExportSolanaAccountByNameParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            name,
            export_evm_account_request: Some(request),
        };
        solana_accounts_api::export_solana_account_by_name(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Update a Solana account
    pub async fn update_account(
        &self,
        address: String,
        request: UpdateSolanaAccountRequest,
    ) -> Result<SolanaAccount> {
        let config = self.client.openapi_config();
        let params = solana_accounts_api::UpdateSolanaAccountParams {
            address,
            x_idempotency_key: None,
            update_solana_account_request: Some(request),
        };
        solana_accounts_api::update_solana_account(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Sign a message with a Solana account
    pub async fn sign_message(
        &self,
        address: String,
        request: SignSolanaMessageRequest,
    ) -> Result<openapi_client::models::SignSolanaMessage200Response> {
        let config = self.client.openapi_config();
        let params = solana_accounts_api::SignSolanaMessageParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            address,
            sign_solana_message_request: Some(request),
        };
        solana_accounts_api::sign_solana_message(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Sign a transaction with a Solana account
    pub async fn sign_transaction(
        &self,
        address: String,
        request: SignSolanaTransactionRequest,
    ) -> Result<openapi_client::models::SignSolanaTransaction200Response> {
        let config = self.client.openapi_config();
        let params = solana_accounts_api::SignSolanaTransactionParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            address,
            sign_solana_transaction_request: Some(request),
        };
        solana_accounts_api::sign_solana_transaction(&config, params)
            .await
            .map_err(CdpError::from)
    }
}
