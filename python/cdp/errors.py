"""Custom error types for the CDP SDK."""


class UserInputValidationError(ValueError):
    """UserInputValidationError is thrown when validation of a user-supplied input fails."""

    def __init__(self, message: str):
        """Initialize a new UserInputValidationError instance.

        Args:
            message: The user input validation error message.

        """
        super().__init__(message)


class SmartAccountAlreadyExistsError(Exception):
    """Raised when attempting to create a smart account for an owner that already has one.

    CDP allows only one smart wallet per owner EOA. Catch this error to recover
    by retrieving the existing smart account instead.
    """

    def __init__(self, message: str):
        """Initialize a new SmartAccountAlreadyExistsError instance.

        Args:
            message: The error message describing the duplicate smart wallet condition.

        """
        super().__init__(message)
