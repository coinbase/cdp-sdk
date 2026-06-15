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

/**
 * SmartAccountAlreadyExistsError is thrown when attempting to create a smart account
 * for an owner EOA that already has a smart wallet registered under a different name.
 * CDP allows only one smart wallet per owner EOA.
 */
export class SmartAccountAlreadyExistsError extends Error {
  /**
   * Initializes a new SmartAccountAlreadyExistsError instance.
   *
   * @param message - The error message. Defaults to "Multiple smart wallets with the same owner".
   */
  constructor(message: string = "Multiple smart wallets with the same owner") {
    super(message);
    this.name = "SmartAccountAlreadyExistsError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SmartAccountAlreadyExistsError);
    }
  }
}
