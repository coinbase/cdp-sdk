package com.coinbase.cdp.evm.options;

import java.util.Optional;

/**
 * Options for creating an EVM smart account.
 */
public class CreateSmartAccountOptions {

  private final String ownerAddress;
  private final String name;
  private final String idempotencyKey;

  private CreateSmartAccountOptions(Builder builder) {
    this.ownerAddress = builder.ownerAddress;
    this.name = builder.name;
    this.idempotencyKey = builder.idempotencyKey;
  }

  public String ownerAddress() {
    return ownerAddress;
  }

  public Optional<String> name() {
    return Optional.ofNullable(name);
  }

  public Optional<String> idempotencyKey() {
    return Optional.ofNullable(idempotencyKey);
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {
    private String ownerAddress;
    private String name;
    private String idempotencyKey;

    public Builder ownerAddress(String ownerAddress) {
      this.ownerAddress = ownerAddress;
      return this;
    }

    public Builder name(String name) {
      this.name = name;
      return this;
    }

    public Builder idempotencyKey(String idempotencyKey) {
      this.idempotencyKey = idempotencyKey;
      return this;
    }

    public CreateSmartAccountOptions build() {
      if (ownerAddress == null || ownerAddress.isBlank()) {
        throw new IllegalArgumentException("Owner address is required");
      }
      return new CreateSmartAccountOptions(this);
    }
  }
}
