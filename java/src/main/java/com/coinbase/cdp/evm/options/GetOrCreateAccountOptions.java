package com.coinbase.cdp.evm.options;

/**
 * Options for getting or creating an EVM account. The name is required to identify the account.
 */
public class GetOrCreateAccountOptions {

  private final String name;

  private GetOrCreateAccountOptions(Builder builder) {
    this.name = builder.name;
  }

  public String name() {
    return name;
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {
    private String name;

    public Builder name(String name) {
      this.name = name;
      return this;
    }

    public GetOrCreateAccountOptions build() {
      if (name == null || name.isBlank()) {
        throw new IllegalArgumentException("Name is required for getOrCreateAccount");
      }
      return new GetOrCreateAccountOptions(this);
    }
  }
}
