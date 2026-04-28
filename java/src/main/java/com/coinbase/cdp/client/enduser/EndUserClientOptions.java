package com.coinbase.cdp.client.enduser;

import java.util.List;

/**
 * Options records for EndUser client operations.
 *
 * <p>For operations that accept request bodies, use the generated OpenAPI request types directly.
 * This file contains options classes for operations that use query parameters.
 */
public final class EndUserClientOptions {
  private EndUserClientOptions() {}

  /** Options for looking up end users by a single identity parameter. */
  public static final class LookupEndUserOptions {
    private final String email;

    private LookupEndUserOptions(Builder builder) {
      this.email = builder.email;
    }

    public String email() {
      return email;
    }

    public static Builder builder() {
      return new Builder();
    }

    public static final class Builder {
      private String email;

      private Builder() {}

      public Builder email(String email) {
        this.email = email;
        return this;
      }

      public LookupEndUserOptions build() {
        return new LookupEndUserOptions(this);
      }
    }
  }

  /** Options for listing end users with pagination and sorting. */
  public record ListEndUsersOptions(Integer pageSize, String pageToken, List<String> sort) {
    public static Builder builder() {
      return new Builder();
    }

    public static class Builder {
      private Integer pageSize;
      private String pageToken;
      private List<String> sort;

      public Builder pageSize(Integer size) {
        this.pageSize = size;
        return this;
      }

      public Builder pageToken(String token) {
        this.pageToken = token;
        return this;
      }

      public Builder sort(List<String> sort) {
        this.sort = sort;
        return this;
      }

      public ListEndUsersOptions build() {
        return new ListEndUsersOptions(pageSize, pageToken, sort);
      }
    }
  }
}
