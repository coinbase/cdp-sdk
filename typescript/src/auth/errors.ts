/**
 * @module Errors
 */

/**
 * A class of errors for capturing stack traces.
 */
class BaseError extends Error {
  /**
   * Base error constructor.
   *
   * @param message - The message to display.
   */
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * An error for invalid API key format.
 */
export class InvalidAPIKeyFormatError extends BaseError {
  /**
   * Invalid API key format error constructor.
   *
   * @param message - The message to display.
   */
  constructor(message: string) {
    super("Invalid API key format: " + message);
  }
}

/**
 * An error for invalid Wallet Secret format.
 */
export class InvalidWalletSecretFormatError extends BaseError {
  /**
   * Invalid Wallet Secret format error constructor.
   *
   * @param message - The message to display.
   */
  constructor(message: string) {
    super("Invalid Wallet Secret format: " + message);
  }
}

/**
 * An error for an undefined Wallet Secret.
 */
export class UndefinedWalletSecretError extends BaseError {
  /**
   * Undefined Wallet Secret error constructor.
   *
   * @param message - The message to display.
   */
  constructor(message: string) {
    super("Undefined Wallet Secret: " + message);
  }
}
