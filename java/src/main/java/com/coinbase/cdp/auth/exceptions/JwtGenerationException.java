package com.coinbase.cdp.auth.exceptions;

/** Exception thrown when JWT generation fails. */
public class JwtGenerationException extends RuntimeException {

  public JwtGenerationException(String message) {
    super(message);
  }

  public JwtGenerationException(String message, Throwable cause) {
    super(message, cause);
  }
}
