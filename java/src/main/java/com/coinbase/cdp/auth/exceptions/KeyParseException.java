package com.coinbase.cdp.auth.exceptions;

/** Exception thrown when private key parsing fails. */
public class KeyParseException extends RuntimeException {

  public KeyParseException(String message) {
    super(message);
  }

  public KeyParseException(String message, Throwable cause) {
    super(message, cause);
  }
}
