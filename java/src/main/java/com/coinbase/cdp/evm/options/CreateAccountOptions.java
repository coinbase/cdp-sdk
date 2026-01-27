package com.coinbase.cdp.evm.options;

import java.util.Optional;

/**
 * Options for creating an EVM account.
 */
public class CreateAccountOptions {

  private final String name;
  private final String idempotencyKey;
  private final String accountPolicy;

  private CreateAccountOptions(Builder builder) {
    this.name = builder.name;
    this.idempotencyKey = builder.idempotencyKey;
    this.accountPolicy = builder.accountPolicy;
  }

  public Optional<String> name() {
    return Optional.ofNullable(name);
  }

  public Optional<String> idempotencyKey() {
    return Optional.ofNullable(idempotencyKey);
  }

  public Optional<String> accountPolicy() {
    return Optional.ofNullable(accountPolicy);
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {
    private String name;
    private String idempotencyKey;
    private String accountPolicy;

    public Builder name(String name) {
      this.name = name;
      return this;
    }

    public Builder idempotencyKey(String idempotencyKey) {
      this.idempotencyKey = idempotencyKey;
      return this;
    }

    public Builder accountPolicy(String accountPolicy) {
      this.accountPolicy = accountPolicy;
      return this;
    }

    public CreateAccountOptions build() {
      return new CreateAccountOptions(this);
    }
  }
}
