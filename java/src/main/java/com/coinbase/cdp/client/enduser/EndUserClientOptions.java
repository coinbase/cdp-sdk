package com.coinbase.cdp.client.enduser;

import java.util.List;

/**
 * Options records for EndUser client operations.
 *
 * <p>For operations that accept request bodies, use the generated OpenAPI request types directly.
 * This file contains only options for listing operations with pagination.
 */
public final class EndUserClientOptions {
  private EndUserClientOptions() {}

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
