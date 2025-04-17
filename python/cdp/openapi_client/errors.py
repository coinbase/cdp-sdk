from typing import Any


class ApiError(Exception):
    """A wrapper for API exceptions to provide more context."""

    def __init__(
        self,
        http_code: int | None,
        error_type: str | None,
        error_message: str | None,
        correlation_id: str | None = None,
        error_link: str | None = None,
    ) -> None:
        self._http_code = http_code
        self._error_type = error_type
        self._error_message = error_message
        self._correlation_id = correlation_id
        self._error_link = error_link
        super().__init__(error_message)

    @property
    def http_code(self) -> int | None:
        """Get the HTTP status code.

        Returns:
            int: The HTTP status code.

        """
        return self._http_code

    @property
    def error_type(self) -> str | None:
        """Get the API error type.

        Returns:
            str | None: The API error type.

        """
        return self._error_type

    @property
    def error_message(self) -> str | None:
        """Get the API error message.

        Returns:
            str | None: The API error message.

        """
        return self._error_message

    @property
    def correlation_id(self) -> str | None:
        """Get the correlation ID.

        Returns:
            str | None: The correlation ID.

        """
        return self._correlation_id

    @property
    def error_link(self) -> str | None:
        """Get the documentation URL for this error.

        Returns:
            str | None: The URL to the error documentation.

        """
        return self._error_link

    def __str__(self) -> str:
        """Get a string representation of the ApiError.

        Returns:
            str: The string representation of the ApiError.

        """
        fields = [
            f"http_code={self.http_code}",
            f"error_type={self.error_type}",
            f"error_message={self.error_message}",
        ]
        if self.correlation_id is not None:
            fields.append(f"correlation_id={self.correlation_id}")
        if self.error_link is not None:
            fields.append(f"error_link={self.error_link}")

        return f"ApiError({', '.join(fields)})"


def is_openapi_error(obj: Any) -> bool:
    """Check if an object matches the OpenAPI error format.

    Args:
        obj: The object to check

    Returns:
        bool: True if the object is an OpenAPI error

    """
    return (
        isinstance(obj, dict)
        and "errorType" in obj
        and isinstance(obj["errorType"], str)
        and "errorMessage" in obj
        and isinstance(obj["errorMessage"], str)
    )
