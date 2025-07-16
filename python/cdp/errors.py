"""Custom error types for the CDP SDK."""


class UserInputValidationError(ValueError):
    """UserInputValidationError is thrown when validation of a user-supplied input fails."""

    def __init__(self, message: str):
        """Initialize a new UserInputValidationError instance.

        Args:
            message: The user input validation error message.

        """
        super().__init__(message)
