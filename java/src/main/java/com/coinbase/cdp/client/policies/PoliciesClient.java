package com.coinbase.cdp.client.policies;

import com.coinbase.cdp.CdpClient;
import com.coinbase.cdp.auth.TokenProvider;
import com.coinbase.cdp.client.policies.PoliciesClientOptions.ListPoliciesOptions;
import com.coinbase.cdp.openapi.ApiClient;
import com.coinbase.cdp.openapi.ApiException;
import com.coinbase.cdp.openapi.api.PolicyEngineApi;
import com.coinbase.cdp.openapi.model.CreatePolicyRequest;
import com.coinbase.cdp.openapi.model.ListPolicies200Response;
import com.coinbase.cdp.openapi.model.Policy;
import com.coinbase.cdp.openapi.model.UpdatePolicyRequest;

/**
 * The namespace client for policy operations.
 *
 * <p>Provides high-level methods for creating, managing, and deleting policies.
 *
 * <p>Methods accept generated OpenAPI request types directly to reduce boilerplate.
 *
 * <p>Usage patterns:
 *
 * <pre>{@code
 * // Pattern 1: From environment variables
 * try (CdpClient cdp = CdpClient.create()) {
 *     Policy policy = cdp.policies().createPolicy(
 *         new CreatePolicyRequest()
 *             .scope("account")
 *             .description("My policy")
 *             .rules(rules)
 *     );
 * }
 *
 * // Pattern 2: With credentials
 * try (CdpClient cdp = CdpClient.builder()
 *         .credentials("api-key-id", "api-key-secret")
 *         .build()) {
 *     Policy policy = cdp.policies().createPolicy(
 *         new CreatePolicyRequest()
 *             .scope("account")
 *             .description("My policy")
 *             .rules(rules)
 *     );
 * }
 *
 * // Pattern 3: With pre-generated TokenProvider
 * try (CdpClient cdp = CdpClient.builder()
 *         .tokenProvider(myTokenProvider)
 *         .build()) {
 *     Policy policy = cdp.policies().createPolicy(
 *         new CreatePolicyRequest()
 *             .scope("account")
 *             .description("My policy")
 *             .rules(rules)
 *     );
 * }
 * }</pre>
 */
public class PoliciesClient {

  private final PolicyEngineApi policyEngineApi;

  /**
   * Creates a new Policies client for instance-based usage.
   *
   * @param cdpClient the parent CDP client
   */
  public PoliciesClient(CdpClient cdpClient) {
    this.policyEngineApi = new PolicyEngineApi(cdpClient.getApiClient());
  }

  /**
   * Creates a new Policies client for static factory usage with pre-generated tokens.
   *
   * @param apiClient the pre-configured API client with tokens
   * @param tokenProvider the token provider containing pre-generated tokens (reserved for future
   *     use)
   */
  public PoliciesClient(ApiClient apiClient, TokenProvider tokenProvider) {
    // TokenProvider not currently used for policy operations but accepted for API consistency
    this.policyEngineApi = new PolicyEngineApi(apiClient);
  }

  // ==================== Policy Operations ====================

  /**
   * Creates a new policy.
   *
   * @param request the policy creation request
   * @return the created policy
   * @throws ApiException if the API call fails
   */
  public Policy createPolicy(CreatePolicyRequest request) throws ApiException {
    return createPolicy(request, null);
  }

  /**
   * Creates a new policy with idempotency key.
   *
   * @param request the policy creation request
   * @param idempotencyKey optional idempotency key
   * @return the created policy
   * @throws ApiException if the API call fails
   */
  public Policy createPolicy(CreatePolicyRequest request, String idempotencyKey)
      throws ApiException {
    return policyEngineApi.createPolicy(request, idempotencyKey);
  }

  /**
   * Gets a policy by ID.
   *
   * @param id the policy ID
   * @return the policy
   * @throws ApiException if the API call fails
   */
  public Policy getPolicy(String id) throws ApiException {
    return policyEngineApi.getPolicyById(id);
  }

  /**
   * Lists policies.
   *
   * @return the list response
   * @throws ApiException if the API call fails
   */
  public ListPolicies200Response listPolicies() throws ApiException {
    return listPolicies(ListPoliciesOptions.builder().build());
  }

  /**
   * Lists policies with pagination and optional scope filter.
   *
   * @param options the list options
   * @return the list response
   * @throws ApiException if the API call fails
   */
  public ListPolicies200Response listPolicies(ListPoliciesOptions options) throws ApiException {
    return policyEngineApi.listPolicies(options.pageSize(), options.pageToken(), options.scope());
  }

  /**
   * Updates a policy.
   *
   * @param id the policy ID
   * @param request the update request
   * @return the updated policy
   * @throws ApiException if the API call fails
   */
  public Policy updatePolicy(String id, UpdatePolicyRequest request) throws ApiException {
    return updatePolicy(id, request, null);
  }

  /**
   * Updates a policy with idempotency key.
   *
   * @param id the policy ID
   * @param request the update request
   * @param idempotencyKey optional idempotency key
   * @return the updated policy
   * @throws ApiException if the API call fails
   */
  public Policy updatePolicy(String id, UpdatePolicyRequest request, String idempotencyKey)
      throws ApiException {
    return policyEngineApi.updatePolicy(id, request, idempotencyKey);
  }

  /**
   * Deletes a policy.
   *
   * @param id the policy ID
   * @throws ApiException if the API call fails
   */
  public void deletePolicy(String id) throws ApiException {
    deletePolicy(id, null);
  }

  /**
   * Deletes a policy with idempotency key.
   *
   * @param id the policy ID
   * @param idempotencyKey optional idempotency key
   * @throws ApiException if the API call fails
   */
  public void deletePolicy(String id, String idempotencyKey) throws ApiException {
    policyEngineApi.deletePolicy(id, idempotencyKey);
  }
}
