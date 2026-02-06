package com.coinbase.cdp.client.solana;

import com.coinbase.cdp.openapi.model.ListSolanaTokenBalancesNetwork;
import com.coinbase.cdp.openapi.model.SendSolanaTransactionRequest;
import java.math.BigInteger;

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

  // ==================== Transfer Options ====================

  /**
   * Options for transferring SOL or SPL tokens.
   *
   * <p>Supports:
   *
   * <ul>
   *   <li>"sol" for native SOL transfers
   *   <li>"usdc" for USDC (mint address resolved per network)
   *   <li>Base58 mint address for any SPL token
   * </ul>
   */
  public record TransferOptions(
      String to,
      BigInteger amount,
      String token,
      SendSolanaTransactionRequest.NetworkEnum network) {

    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {
      private String to;
      private BigInteger amount;
      private String token;
      private SendSolanaTransactionRequest.NetworkEnum network;

      /**
       * Sets the recipient address (base58-encoded Solana address).
       *
       * @param to the recipient address
       * @return this builder
       */
      public Builder to(String to) {
        this.to = to;
        return this;
      }

      /**
       * Sets the amount in atomic units (lamports for SOL, smallest unit for tokens).
       *
       * @param amount the amount to transfer
       * @return this builder
       */
      public Builder amount(BigInteger amount) {
        this.amount = amount;
        return this;
      }

      /**
       * Sets the token: "sol" for native, "usdc" for USDC, or mint address.
       *
       * @param token the token identifier
       * @return this builder
       */
      public Builder token(String token) {
        this.token = token;
        return this;
      }

      /**
       * Sets the network (SOLANA or SOLANA_DEVNET).
       *
       * @param network the network
       * @return this builder
       */
      public Builder network(SendSolanaTransactionRequest.NetworkEnum network) {
        this.network = network;
        return this;
      }

      /**
       * Builds the TransferOptions.
       *
       * @return the transfer options
       * @throws IllegalArgumentException if required fields are missing
       */
      public TransferOptions build() {
        if (to == null || to.isBlank()) {
          throw new IllegalArgumentException("to is required");
        }
        if (amount == null) {
          throw new IllegalArgumentException("amount is required");
        }
        if (token == null || token.isBlank()) {
          throw new IllegalArgumentException("token is required");
        }
        if (network == null) {
          throw new IllegalArgumentException("network is required");
        }
        return new TransferOptions(to, amount, token, network);
      }
    }
  }
}
