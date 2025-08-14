use crate::client::CdpClient;
use crate::error::{CdpError, Result};
use openapi_client::apis::policy_engine_api;
use openapi_client::models::{CreatePolicyRequest, UpdatePolicyRequest};

/// High-level Policies API wrapper that provides easy access to policy management operations
pub struct PoliciesApi<'a> {
    client: &'a CdpClient,
}

impl<'a> PoliciesApi<'a> {
    pub fn new(client: &'a CdpClient) -> Self {
        Self { client }
    }

    /// List policies
    pub async fn list_policies(
        &self,
        page_size: Option<i32>,
        page_token: Option<String>,
        scope: Option<String>,
    ) -> Result<openapi_client::models::ListPolicies200Response> {
        let config = self.client.openapi_config();
        let params = policy_engine_api::ListPoliciesParams {
            page_size,
            page_token,
            scope,
        };
        policy_engine_api::list_policies(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Delete a policy
    pub async fn delete_policy(
        &self,
        policy_id: String,
    ) -> Result<()> {
        let config = self.client.openapi_config();
        let params = policy_engine_api::DeletePolicyParams {
            policy_id,
            x_idempotency_key: None,
        };
        policy_engine_api::delete_policy(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Get a policy by ID
    pub async fn get_policy(
        &self,
        policy_id: String,
    ) -> Result<openapi_client::models::Policy> {
        let config = self.client.openapi_config();
        let params = policy_engine_api::GetPolicyByIdParams {
            policy_id,
        };
        policy_engine_api::get_policy_by_id(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Create a new policy
    pub async fn create_policy(
        &self,
        request: CreatePolicyRequest,
    ) -> Result<openapi_client::models::Policy> {
        let config = self.client.openapi_config();
        let params = policy_engine_api::CreatePolicyParams {
            create_policy_request: request,
            x_idempotency_key: None,
        };
        policy_engine_api::create_policy(&config, params)
            .await
            .map_err(CdpError::from)
    }

    /// Update an existing policy
    pub async fn update_policy(
        &self,
        policy_id: String,
        request: UpdatePolicyRequest,
    ) -> Result<openapi_client::models::Policy> {
        let config = self.client.openapi_config();
        let params = policy_engine_api::UpdatePolicyParams {
            policy_id,
            update_policy_request: request,
            x_idempotency_key: None,
        };
        policy_engine_api::update_policy(&config, params)
            .await
            .map_err(CdpError::from)
    }
}
