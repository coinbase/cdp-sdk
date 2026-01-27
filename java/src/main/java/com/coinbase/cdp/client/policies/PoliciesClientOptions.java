package com.coinbase.cdp.client.policies;

/**
 * Options records for Policies client operations.
 *
 * <p>For operations that accept request bodies, use the generated OpenAPI request types directly
 * (e.g., {@code CreatePolicyRequest}, {@code UpdatePolicyRequest}). This file contains only options
 * for listing operations with pagination.
 */
public final class PoliciesClientOptions {
  private PoliciesClientOptions() {}

  /** Options for listing policies with pagination and optional scope filter. */
  public record ListPoliciesOptions(Integer pageSize, String pageToken, String scope) {
    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {
      private Integer pageSize;
      private String pageToken;
      private String scope;

      public Builder pageSize(Integer size) {
        this.pageSize = size;
        return this;
      }

      public Builder pageToken(String token) {
        this.pageToken = token;
        return this;
      }

      public Builder scope(String scope) {
        this.scope = scope;
        return this;
      }

      public ListPoliciesOptions build() {
        return new ListPoliciesOptions(pageSize, pageToken, scope);
      }
    }
  }
}
