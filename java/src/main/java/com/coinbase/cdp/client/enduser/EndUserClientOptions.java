package com.coinbase.cdp.client.enduser;

import com.coinbase.cdp.openapi.model.AuthenticationMethods;
import java.util.ArrayList;
import java.util.List;

/**
 * Options records for End User client operations.
 *
 * <p>For operations that accept request bodies, use the generated OpenAPI request types directly
 * (e.g., {@code CreateEndUserRequest}, {@code ImportEndUserRequest}). This file contains only
 * options for operations that don't have corresponding request types, such as list operations with
 * query parameters.
 */
public final class EndUserClientOptions {
  private EndUserClientOptions() {}

  // ==================== Pagination / List Options ====================

  /** Options for listing end users. */
  public record ListEndUsersOptions(Integer pageSize, String pageToken, List<String> sort) {
    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {
      private Integer pageSize;
      private String pageToken;
      private List<String> sort;

      /**
       * Sets the number of end users per page.
       *
       * @param size the page size (default: 20)
       * @return this builder
       */
      public Builder pageSize(Integer size) {
        this.pageSize = size;
        return this;
      }

      /**
       * Sets the page token for pagination.
       *
       * @param token the page token
       * @return this builder
       */
      public Builder pageToken(String token) {
        this.pageToken = token;
        return this;
      }

      /**
       * Sets the sort order.
       *
       * <p>Example: {@code List.of("createdAt=desc")}
       *
       * @param sort the sort criteria
       * @return this builder
       */
      public Builder sort(List<String> sort) {
        this.sort = sort != null ? new ArrayList<>(sort) : null;
        return this;
      }

      public ListEndUsersOptions build() {
        return new ListEndUsersOptions(pageSize, pageToken, sort);
      }
    }
  }

  /** Options for importing an end user's private key. */
  public record ImportEndUserOptions(
      String userId,
      String privateKey,
      String keyType,
      AuthenticationMethods authenticationMethods,
      String encryptionPublicKey) {
    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {
      private String userId;
      private String privateKey;
      private String keyType;
      private AuthenticationMethods authenticationMethods;
      private String encryptionPublicKey;

      /**
       * Sets the stable, unique identifier for the end user. If not provided, a UUID will be
       * generated.
       *
       * @param userId the user ID
       * @return this builder
       */
      public Builder userId(String userId) {
        this.userId = userId;
        return this;
      }

      /**
       * Sets the private key to import.
       *
       * <ul>
       *   <li>For EVM: hex string (with or without 0x prefix)
       *   <li>For Solana: base58 encoded string
       * </ul>
       *
       * <p>The SDK will encrypt this before sending to the API.
       *
       * @param privateKey the private key string
       * @return this builder
       */
      public Builder privateKey(String privateKey) {
        this.privateKey = privateKey;
        return this;
      }

      /**
       * Sets the type of key being imported.
       *
       * @param keyType "evm" or "solana"
       * @return this builder
       */
      public Builder keyType(String keyType) {
        this.keyType = keyType;
        return this;
      }

      /**
       * Sets the authentication methods for the end user.
       *
       * @param authenticationMethods the authentication methods
       * @return this builder
       */
      public Builder authenticationMethods(AuthenticationMethods authenticationMethods) {
        this.authenticationMethods = authenticationMethods;
        return this;
      }

      /**
       * Sets an optional RSA public key to encrypt the private key. Defaults to the known CDP
       * public key if not provided.
       *
       * @param encryptionPublicKey the RSA public key in PEM format
       * @return this builder
       */
      public Builder encryptionPublicKey(String encryptionPublicKey) {
        this.encryptionPublicKey = encryptionPublicKey;
        return this;
      }

      /**
       * Builds the import options.
       *
       * @return the import options
       * @throws IllegalArgumentException if required fields are missing
       */
      public ImportEndUserOptions build() {
        if (privateKey == null || privateKey.isBlank()) {
          throw new IllegalArgumentException("privateKey is required");
        }
        if (keyType == null || keyType.isBlank()) {
          throw new IllegalArgumentException("keyType is required (\"evm\" or \"solana\")");
        }
        if (authenticationMethods == null) {
          throw new IllegalArgumentException("authenticationMethods is required");
        }
        return new ImportEndUserOptions(
            userId, privateKey, keyType, authenticationMethods, encryptionPublicKey);
      }
    }
  }
}
