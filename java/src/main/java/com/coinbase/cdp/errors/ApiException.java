package com.coinbase.cdp.errors;

import java.util.Optional;

/**
 * Exception for API-level errors returned by the CDP service.
 *
 * <p>This exception is thrown when the CDP API returns an error response. It includes detailed
 * information about the error, including the HTTP status code, error type, and correlation ID for
 * debugging.
 */
public class ApiException extends CdpException {

  private final int statusCode;
  private final String errorType;
  private final String errorMessage;
  private final String correlationId;
  private final String errorLink;

  /**
   * Creates a new API exception.
   *
   * @param statusCode the HTTP status code
   * @param errorType the error type (e.g., "unauthorized", "not_found")
   * @param errorMessage the human-readable error message
   * @param correlationId the correlation ID for support debugging (optional)
   * @param errorLink a URL to documentation about this error (optional)
   */
  public ApiException(
      int statusCode,
      String errorType,
      String errorMessage,
      String correlationId,
      String errorLink) {
    super(formatMessage(statusCode, errorType, errorMessage));
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.errorMessage = errorMessage;
    this.correlationId = correlationId;
    this.errorLink = errorLink;
  }

  /**
   * Creates a new API exception with a cause.
   *
   * @param statusCode the HTTP status code
   * @param errorType the error type
   * @param errorMessage the error message
   * @param cause the underlying cause
   */
  public ApiException(int statusCode, String errorType, String errorMessage, Throwable cause) {
    super(formatMessage(statusCode, errorType, errorMessage), cause);
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.errorMessage = errorMessage;
    this.correlationId = null;
    this.errorLink = null;
  }

  /**
   * Returns the HTTP status code.
   *
   * @return the status code
   */
  public int getStatusCode() {
    return statusCode;
  }

  /**
   * Returns the error type.
   *
   * @return the error type
   */
  public String getErrorType() {
    return errorType;
  }

  /**
   * Returns the error message.
   *
   * @return the error message
   */
  public String getErrorMessage() {
    return errorMessage;
  }

  /**
   * Returns the correlation ID for support debugging.
   *
   * @return the correlation ID, or empty if not available
   */
  public Optional<String> getCorrelationId() {
    return Optional.ofNullable(correlationId);
  }

  /**
   * Returns a URL to documentation about this error.
   *
   * @return the error link, or empty if not available
   */
  public Optional<String> getErrorLink() {
    return Optional.ofNullable(errorLink);
  }

  private static String formatMessage(int statusCode, String errorType, String errorMessage) {
    return String.format("API error [%d] %s: %s", statusCode, errorType, errorMessage);
  }
}
