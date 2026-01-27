package com.coinbase.cdp.evm.options;

import java.util.Optional;

/**
 * Options for getting or creating an EVM smart account. The owner address is required. Name is
 * optional but recommended for identification.
 */
public class GetOrCreateSmartAccountOptions {

  private final String ownerAddress;
  private final String name;

  private GetOrCreateSmartAccountOptions(Builder builder) {
    this.ownerAddress = builder.ownerAddress;
    this.name = builder.name;
  }

  public String ownerAddress() {
    return ownerAddress;
  }

  public Optional<String> name() {
    return Optional.ofNullable(name);
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {
    private String ownerAddress;
    private String name;

    public Builder ownerAddress(String ownerAddress) {
      this.ownerAddress = ownerAddress;
      return this;
    }

    public Builder name(String name) {
      this.name = name;
      return this;
    }

    public GetOrCreateSmartAccountOptions build() {
      if (ownerAddress == null || ownerAddress.isBlank()) {
        throw new IllegalArgumentException("Owner address is required for getOrCreateSmartAccount");
      }
      return new GetOrCreateSmartAccountOptions(this);
    }
  }
}
