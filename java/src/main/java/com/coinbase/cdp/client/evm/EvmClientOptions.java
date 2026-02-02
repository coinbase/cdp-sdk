package com.coinbase.cdp.client.evm;

import com.coinbase.cdp.openapi.model.EvmSwapsNetwork;
import com.coinbase.cdp.openapi.model.ListEvmTokenBalancesNetwork;
import com.coinbase.cdp.openapi.model.SendEvmTransactionRequest;
import java.math.BigInteger;

/**
 * Options records for EVM client operations.
 *
 * <p>For operations that accept request bodies, use the generated OpenAPI request types directly
 * (e.g., {@code CreateEvmAccountRequest}, {@code SignEvmMessageRequest}). This file contains only
 * options for operations that don't have corresponding request types, such as lookups by
 * address/name and query parameter-based operations.
 */
public final class EvmClientOptions {
  private EvmClientOptions() {}

  // ==================== Account Lookup Options ====================

  /** Options for getting an EVM account by address or name. */
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

  /** Options for getting or creating an EVM account. */
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

  /** Options for listing EVM accounts. */
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

  /** Options for listing EVM smart accounts. */
  public record ListSmartAccountsOptions(Integer pageSize, String pageToken) {
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

      public ListSmartAccountsOptions build() {
        return new ListSmartAccountsOptions(pageSize, pageToken);
      }
    }
  }

  /** Options for listing spend permissions for a smart account. */
  public record ListSpendPermissionsOptions(String address, Integer pageSize, String pageToken) {
    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {
      private String address;
      private Integer pageSize;
      private String pageToken;

      public Builder address(String address) {
        this.address = address;
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

      public ListSpendPermissionsOptions build() {
        return new ListSpendPermissionsOptions(address, pageSize, pageToken);
      }
    }
  }

  // ==================== Query Parameter Options ====================

  /** Options for listing token balances (query parameters, no request body). */
  public record ListTokenBalancesOptions(
      String address, ListEvmTokenBalancesNetwork network, Integer pageSize, String pageToken) {
    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {
      private String address;
      private ListEvmTokenBalancesNetwork network;
      private Integer pageSize;
      private String pageToken;

      public Builder address(String address) {
        this.address = address;
        return this;
      }

      public Builder network(ListEvmTokenBalancesNetwork network) {
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

  /** Options for getting a swap price (GET request with query parameters). */
  public record GetSwapPriceOptions(
      EvmSwapsNetwork network,
      String fromToken,
      String toToken,
      String fromAmount,
      String taker,
      String signerAddress,
      String gasPrice,
      Integer slippageBps) {
    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {
      private EvmSwapsNetwork network;
      private String fromToken;
      private String toToken;
      private String fromAmount;
      private String taker;
      private String signerAddress;
      private String gasPrice;
      private Integer slippageBps;

      public Builder network(EvmSwapsNetwork network) {
        this.network = network;
        return this;
      }

      public Builder fromToken(String token) {
        this.fromToken = token;
        return this;
      }

      public Builder toToken(String token) {
        this.toToken = token;
        return this;
      }

      public Builder fromAmount(String amount) {
        this.fromAmount = amount;
        return this;
      }

      public Builder taker(String taker) {
        this.taker = taker;
        return this;
      }

      public Builder signerAddress(String address) {
        this.signerAddress = address;
        return this;
      }

      public Builder gasPrice(String gasPrice) {
        this.gasPrice = gasPrice;
        return this;
      }

      public Builder slippageBps(Integer bps) {
        this.slippageBps = bps;
        return this;
      }

      public GetSwapPriceOptions build() {
        return new GetSwapPriceOptions(
            network, fromToken, toToken, fromAmount, taker, signerAddress, gasPrice, slippageBps);
      }
    }
  }

  // ==================== Transfer Options ====================

  /**
   * Options for transferring tokens.
   *
   * <p>Supports:
   *
   * <ul>
   *   <li>"eth" for native ETH transfers
   *   <li>"usdc" for USDC (address resolved per network)
   *   <li>0x-prefixed address for any ERC20 token
   * </ul>
   */
  public record TransferOptions(
      String to, BigInteger amount, String token, SendEvmTransactionRequest.NetworkEnum network) {

    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {
      private String to;
      private BigInteger amount;
      private String token;
      private SendEvmTransactionRequest.NetworkEnum network;

      /**
       * Sets the recipient address.
       *
       * @param to the recipient address (0x-prefixed hex string)
       * @return this builder
       */
      public Builder to(String to) {
        this.to = to;
        return this;
      }

      /**
       * Sets the amount to transfer in atomic units (wei for ETH, smallest unit for tokens).
       *
       * @param amount the amount to transfer
       * @return this builder
       */
      public Builder amount(BigInteger amount) {
        this.amount = amount;
        return this;
      }

      /**
       * Sets the token to transfer.
       *
       * @param token "eth" for native ETH, "usdc" for USDC, or a 0x-prefixed token contract address
       * @return this builder
       */
      public Builder token(String token) {
        this.token = token;
        return this;
      }

      /**
       * Sets the network for the transfer.
       *
       * @param network the target network
       * @return this builder
       */
      public Builder network(SendEvmTransactionRequest.NetworkEnum network) {
        this.network = network;
        return this;
      }

      /**
       * Builds the transfer options.
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
