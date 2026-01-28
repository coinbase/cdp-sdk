package com.coinbase.cdp.errors;

/**
 * Base exception class for all CDP SDK errors.
 *
 * <p>This is the parent class for all exceptions thrown by the CDP SDK. It provides a common base
 * for catching all SDK-related errors.
 */
public class CdpException extends RuntimeException {

  /**
   * Creates a new CDP exception with the specified message.
   *
   * @param message the error message
   */
  public CdpException(String message) {
    super(message);
  }

  /**
   * Creates a new CDP exception with the specified message and cause.
   *
   * @param message the error message
   * @param cause the underlying cause
   */
  public CdpException(String message, Throwable cause) {
    super(message, cause);
  }
}
