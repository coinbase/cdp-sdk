package com.coinbase.cdp.errors;

/**
 * Exception for network-level failures.
 *
 * <p>This exception is thrown when a network error occurs, such as DNS resolution failure,
 * connection timeout, or other transport-level issues.
 */
public class NetworkException extends CdpException {

  private final String networkErrorType;
  private final boolean retryable;

  /**
   * Creates a new network exception.
   *
   * @param networkErrorType the type of network error (e.g., "timeout", "connection_refused")
   * @param message the error message
   * @param retryable whether the operation can be retried
   */
  public NetworkException(String networkErrorType, String message, boolean retryable) {
    super(message);
    this.networkErrorType = networkErrorType;
    this.retryable = retryable;
  }

  /**
   * Creates a new network exception with a cause.
   *
   * @param networkErrorType the type of network error
   * @param message the error message
   * @param retryable whether the operation can be retried
   * @param cause the underlying cause
   */
  public NetworkException(
      String networkErrorType, String message, boolean retryable, Throwable cause) {
    super(message, cause);
    this.networkErrorType = networkErrorType;
    this.retryable = retryable;
  }

  /**
   * Returns the type of network error.
   *
   * @return the network error type
   */
  public String getNetworkErrorType() {
    return networkErrorType;
  }

  /**
   * Returns whether the operation can be retried.
   *
   * @return true if the operation is retryable
   */
  public boolean isRetryable() {
    return retryable;
  }
}
