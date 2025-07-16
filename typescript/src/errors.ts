/**
 * TimeoutError is thrown when an operation times out.
 */
export class TimeoutError extends Error {
  /**
   * Initializes a new TimeoutError instance.
   *
   * @param message - The error message.
   */
  constructor(message: string = "Timeout Error") {
    super(message);
    this.name = "TimeoutError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}

/**
 * UserInputValidationError is thrown when validation of a user-supplied input fails.
 */
export class UserInputValidationError extends Error {
  /**
   * Initializes a new UserInputValidationError instance.
   *
   * @param message - The user input validation error message.
   */
  constructor(message: string) {
    super(message);
    this.name = "UserInputValidationError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UserInputValidationError);
    }
  }
}
