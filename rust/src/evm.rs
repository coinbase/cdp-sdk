use crate::client::CdpClient;
use crate::error::{CdpError, Result};
use openapi_client::apis::evm_accounts_api;
use openapi_client::models::{
    CreateEvmAccountRequest, EvmAccount, SignEvmTransactionRequest, ImportEvmAccountRequest,
    ExportEvmAccountRequest, UpdateEvmAccountRequest, SignEvmHashRequest, SignEvmMessageRequest,
    SendEvmTransactionRequest
};

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

    /// Get an EVM account by name
    pub async fn get_account_by_name(
        &self,
        name: String,
    ) -> Result<EvmAccount> {
        let config = self.client.openapi_config();
        let params = evm_accounts_api::GetEvmAccountByNameParams {
            name,
        };
        evm_accounts_api::get_evm_account_by_name(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Import an EVM account
    pub async fn import_account(
        &self,
        request: ImportEvmAccountRequest,
    ) -> Result<EvmAccount> {
        let config = self.client.openapi_config();
        let params = evm_accounts_api::ImportEvmAccountParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            import_evm_account_request: Some(request),
        };
        evm_accounts_api::import_evm_account(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Export an EVM account by address
    pub async fn export_account(
        &self,
        address: String,
        request: ExportEvmAccountRequest,
    ) -> Result<openapi_client::models::ExportEvmAccount200Response> {
        let config = self.client.openapi_config();
        let params = evm_accounts_api::ExportEvmAccountParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            address,
            export_evm_account_request: Some(request),
        };
        evm_accounts_api::export_evm_account(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Export an EVM account by name
    pub async fn export_account_by_name(
        &self,
        name: String,
        request: ExportEvmAccountRequest,
    ) -> Result<openapi_client::models::ExportEvmAccount200Response> {
        let config = self.client.openapi_config();
        let params = evm_accounts_api::ExportEvmAccountByNameParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            name,
            export_evm_account_request: Some(request),
        };
        evm_accounts_api::export_evm_account_by_name(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Update an EVM account
    pub async fn update_account(
        &self,
        address: String,
        request: UpdateEvmAccountRequest,
    ) -> Result<EvmAccount> {
        let config = self.client.openapi_config();
        let params = evm_accounts_api::UpdateEvmAccountParams {
            address,
            x_idempotency_key: None,
            update_evm_account_request: Some(request),
        };
        evm_accounts_api::update_evm_account(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Sign a hash with an EVM account
    pub async fn sign_hash(
        &self,
        address: String,
        request: SignEvmHashRequest,
    ) -> Result<openapi_client::models::SignEvmHash200Response> {
        let config = self.client.openapi_config();
        let params = evm_accounts_api::SignEvmHashParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            address,
            sign_evm_hash_request: Some(request),
        };
        evm_accounts_api::sign_evm_hash(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Sign a message with an EVM account
    pub async fn sign_message(
        &self,
        address: String,
        request: SignEvmMessageRequest,
    ) -> Result<openapi_client::models::SignEvmMessage200Response> {
        let config = self.client.openapi_config();
        let params = evm_accounts_api::SignEvmMessageParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            address,
            sign_evm_message_request: Some(request),
        };
        evm_accounts_api::sign_evm_message(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Sign typed data with an EVM account
    pub async fn sign_typed_data(
        &self,
        address: String,
        eip712_message: openapi_client::models::Eip712Message,
    ) -> Result<openapi_client::models::SignEvmTypedData200Response> {
        let config = self.client.openapi_config();
        let params = evm_accounts_api::SignEvmTypedDataParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            address,
            eip712_message: Some(eip712_message),
        };
        evm_accounts_api::sign_evm_typed_data(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Send a transaction with an EVM account
    pub async fn send_transaction(
        &self,
        address: String,
        request: SendEvmTransactionRequest,
    ) -> Result<openapi_client::models::SendEvmTransaction200Response> {
        let config = self.client.openapi_config();
        let params = evm_accounts_api::SendEvmTransactionParams {
            x_wallet_auth: "".to_string(), // Will be replaced by middleware
            x_idempotency_key: None,
            address,
            send_evm_transaction_request: Some(request),
        };
        evm_accounts_api::send_evm_transaction(&config, params)
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
