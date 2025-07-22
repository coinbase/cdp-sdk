from typing import Any


# HTTP Error Types
class HttpErrorType:
    """HTTP error type constants."""
    UNEXPECTED_ERROR = "unexpected_error"
    UNAUTHORIZED = "unauthorized"
    NOT_FOUND = "not_found"
    BAD_GATEWAY = "bad_gateway"
    SERVICE_UNAVAILABLE = "service_unavailable"
    UNKNOWN = "unknown"
    # Network-specific error types
    NETWORK_TIMEOUT = "network_timeout"
    NETWORK_CONNECTION_FAILED = "network_connection_failed"
    NETWORK_IP_BLOCKED = "network_ip_blocked"
    NETWORK_DNS_FAILURE = "network_dns_failure"


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


class NetworkError(ApiError):
    """Error thrown when a network-level failure occurs before reaching the CDP service.
    
    This includes gateway errors, IP blocklist rejections, DNS failures, etc.
    """

    def __init__(
        self,
        error_type: str,
        error_message: str,
        network_details: dict[str, Any] | None = None,
        error_link: str | None = None,
    ) -> None:
        """Initialize a NetworkError.

        Args:
            error_type: The type of network error
            error_message: The error message
            network_details: Additional network error details (code, message, retryable)
            error_link: URL to documentation about this error

        """
        super().__init__(
            http_code=0,  # Status code 0 indicates no response was received
            error_type=error_type,
            error_message=error_message,
            error_link=error_link,
        )
        self._network_details = network_details or {}

    @property
    def network_details(self) -> dict[str, Any]:
        """Get network error details.

        Returns:
            dict: Network error details including code, message, and retryable flag

        """
        return self._network_details

    def __str__(self) -> str:
        """Get a string representation of the NetworkError.

        Returns:
            str: The string representation of the NetworkError.

        """
        base_str = super().__str__().replace("ApiError", "NetworkError")
        if self._network_details:
            # Add network details to the string representation
            details_str = ", ".join(f"{k}={v}" for k, v in self._network_details.items())
            return base_str[:-1] + f", network_details={{{details_str}}})"
        return base_str


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
