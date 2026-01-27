package com.coinbase.cdp.client.solana;

import com.coinbase.cdp.openapi.model.ListSolanaTokenBalancesNetwork;

/**
 * Options records for Solana client operations.
 *
 * <p>For operations that accept request bodies, use the generated OpenAPI request types directly
 * (e.g., {@code CreateSolanaAccountRequest}, {@code SignSolanaMessageRequest}). This file contains
 * only options for operations that don't have corresponding request types, such as lookups by
 * address/name and query parameter-based operations.
 */
public final class SolanaClientOptions {
  private SolanaClientOptions() {}

  // ==================== Account Lookup Options ====================

  /** Options for getting a Solana account by address or name. */
  public record GetAccountOptions(String address, String name) {
    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {
      private String address;
      private String name;

      public Builder address(String address) {
        this.address = address;
        return this;
      }

      public Builder name(String name) {
        this.name = name;
        return this;
      }

      public GetAccountOptions build() {
        return new GetAccountOptions(address, name);
      }
    }
  }

  /** Options for getting or creating a Solana account. */
  public record GetOrCreateAccountOptions(String name, String accountPolicy) {
    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {
      private String name;
      private String accountPolicy;

      public Builder name(String name) {
        this.name = name;
        return this;
      }

      public Builder accountPolicy(String policy) {
        this.accountPolicy = policy;
        return this;
      }

      public GetOrCreateAccountOptions build() {
        return new GetOrCreateAccountOptions(name, accountPolicy);
      }
    }
  }

  // ==================== Pagination Options ====================

  /** Options for listing Solana accounts. */
  public record ListAccountsOptions(Integer pageSize, String pageToken) {
    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {
      private Integer pageSize;
      private String pageToken;

      public Builder pageSize(Integer size) {
        this.pageSize = size;
        return this;
      }

      public Builder pageToken(String token) {
        this.pageToken = token;
        return this;
      }

      public ListAccountsOptions build() {
        return new ListAccountsOptions(pageSize, pageToken);
      }
    }
  }

  // ==================== Query Parameter Options ====================

  /** Options for listing token balances (query parameters, no request body). */
  public record ListTokenBalancesOptions(
      String address, ListSolanaTokenBalancesNetwork network, Integer pageSize, String pageToken) {
    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {
      private String address;
      private ListSolanaTokenBalancesNetwork network;
      private Integer pageSize;
      private String pageToken;

      public Builder address(String address) {
        this.address = address;
        return this;
      }

      public Builder network(ListSolanaTokenBalancesNetwork network) {
        this.network = network;
        return this;
      }

      public Builder pageSize(Integer size) {
        this.pageSize = size;
        return this;
      }

      public Builder pageToken(String token) {
        this.pageToken = token;
        return this;
      }

      public ListTokenBalancesOptions build() {
        return new ListTokenBalancesOptions(address, network, pageSize, pageToken);
      }
    }
  }
}
