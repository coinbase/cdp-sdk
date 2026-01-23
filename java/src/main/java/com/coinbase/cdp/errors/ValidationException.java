package com.coinbase.cdp.errors;

/**
 * Exception for client-side input validation errors.
 *
 * <p>This exception is thrown when user input fails validation before being sent to the API.
 */
public class ValidationException extends CdpException {

  private final String field;

  /**
   * Creates a new validation exception.
   *
   * @param message the error message
   */
  public ValidationException(String message) {
    super(message);
    this.field = null;
  }

  /**
   * Creates a new validation exception for a specific field.
   *
   * @param field the field that failed validation
   * @param message the error message
   */
  public ValidationException(String field, String message) {
    super(String.format("Validation error for '%s': %s", field, message));
    this.field = field;
  }

  /**
   * Returns the field that failed validation.
   *
   * @return the field name, or null if not applicable
   */
  public String getField() {
    return field;
  }
}
