package com.coinbase.cdp.evm.options;

import java.util.Optional;

/**
 * Options for listing EVM accounts.
 */
public class ListAccountsOptions {

  private final Integer pageSize;
  private final String pageToken;

  private ListAccountsOptions(Builder builder) {
    this.pageSize = builder.pageSize;
    this.pageToken = builder.pageToken;
  }

  public Optional<Integer> pageSize() {
    return Optional.ofNullable(pageSize);
  }

  public Optional<String> pageToken() {
    return Optional.ofNullable(pageToken);
  }

  public static Builder builder() {
    return new Builder();
  }

  public static ListAccountsOptions empty() {
    return new Builder().build();
  }

  public static class Builder {
    private Integer pageSize;
    private String pageToken;

    public Builder pageSize(Integer pageSize) {
      this.pageSize = pageSize;
      return this;
    }

    public Builder pageToken(String pageToken) {
      this.pageToken = pageToken;
      return this;
    }

    public ListAccountsOptions build() {
      return new ListAccountsOptions(this);
    }
  }
}
