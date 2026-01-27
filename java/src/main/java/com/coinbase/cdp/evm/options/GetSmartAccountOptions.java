package com.coinbase.cdp.evm.options;

import java.util.Optional;

/**
 * Options for getting an EVM smart account. Either address or name must be provided.
 */
public class GetSmartAccountOptions {

  private final String address;
  private final String name;

  private GetSmartAccountOptions(Builder builder) {
    this.address = builder.address;
    this.name = builder.name;
  }

  public Optional<String> address() {
    return Optional.ofNullable(address);
  }

  public Optional<String> name() {
    return Optional.ofNullable(name);
  }

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

    public GetSmartAccountOptions build() {
      if (address == null && name == null) {
        throw new IllegalArgumentException("Either address or name must be provided");
      }
      return new GetSmartAccountOptions(this);
    }
  }
}
