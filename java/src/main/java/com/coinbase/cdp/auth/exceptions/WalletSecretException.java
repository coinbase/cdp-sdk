package com.coinbase.cdp.auth.exceptions;

/** Exception thrown when wallet secret is missing or invalid. */
public class WalletSecretException extends RuntimeException {

  public WalletSecretException(String message) {
    super(message);
  }

  public WalletSecretException(String message, Throwable cause) {
    super(message, cause);
  }
}
