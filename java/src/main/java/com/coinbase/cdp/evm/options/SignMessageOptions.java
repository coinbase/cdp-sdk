package com.coinbase.cdp.evm.options;

import java.util.Optional;

/**
 * Options for signing a message with an EVM account.
 */
public class SignMessageOptions {

  private final String address;
  private final String message;
  private final String idempotencyKey;

  private SignMessageOptions(Builder builder) {
    this.address = builder.address;
    this.message = builder.message;
    this.idempotencyKey = builder.idempotencyKey;
  }

  public String address() {
    return address;
  }

  public String message() {
    return message;
  }

  public Optional<String> idempotencyKey() {
    return Optional.ofNullable(idempotencyKey);
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {
    private String address;
    private String message;
    private String idempotencyKey;

    public Builder address(String address) {
      this.address = address;
      return this;
    }

    public Builder message(String message) {
      this.message = message;
      return this;
    }

    public Builder idempotencyKey(String idempotencyKey) {
      this.idempotencyKey = idempotencyKey;
      return this;
    }

    public SignMessageOptions build() {
      if (address == null || address.isBlank()) {
        throw new IllegalArgumentException("Address is required");
      }
      if (message == null) {
        throw new IllegalArgumentException("Message is required");
      }
      return new SignMessageOptions(this);
    }
  }
}
