package com.coinbase.cdp.evm.options;

/**
 * Options for requesting testnet funds from the faucet.
 */
public class RequestFaucetOptions {

  private final String address;
  private final String network;
  private final String token;

  private RequestFaucetOptions(Builder builder) {
    this.address = builder.address;
    this.network = builder.network;
    this.token = builder.token;
  }

  public String address() {
    return address;
  }

  public String network() {
    return network;
  }

  public String token() {
    return token;
  }

  public static Builder builder() {
    return new Builder();
  }

  public static class Builder {
    private String address;
    private String network = "base-sepolia";
    private String token = "eth";

    public Builder address(String address) {
      this.address = address;
      return this;
    }

    public Builder network(String network) {
      this.network = network;
      return this;
    }

    public Builder token(String token) {
      this.token = token;
      return this;
    }

    public RequestFaucetOptions build() {
      if (address == null || address.isBlank()) {
        throw new IllegalArgumentException("Address is required");
      }
      return new RequestFaucetOptions(this);
    }
  }
}
