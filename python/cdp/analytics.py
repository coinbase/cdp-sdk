import contextlib
import functools
import hashlib
import inspect
import json
import os
import time
import traceback

import requests
from pydantic import BaseModel

from cdp.cdp_client import CdpClient
from cdp.evm_client import EvmClient
from cdp.solana_client import SolanaClient

# This is a public client id for the analytics service
public_client_id = "54f2ee2fb3d2b901a829940d70fbfc13"


class AnalyticsConfig:
    """AnalyticsConfig singleton class for holding the API key ID."""

    api_key_id = None

    @classmethod
    def set(cls, api_key_id: str) -> None:
        """Set the API key ID.

        Args:
            api_key_id: The API key ID

        """
        cls.api_key_id = api_key_id


class ErrorEventData(BaseModel):
    """The data in an error event."""

    method: str  # The API method where the error occurred, e.g. createAccount, getAccount
    message: str  # The error message
    name: str  # The name of the event. This should match the name in AEC
    stack: str | None = None  # The error stack trace


EventData = ErrorEventData


async def send_event(event: EventData) -> None:
    """Send an analytics event to the default endpoint.

    Args:
        event: The event data containing event-specific fields

    Returns:
        None - resolves when the event is sent

    """
    timestamp = int(time.time() * 1000)

    enhanced_event = {
        "user_id": AnalyticsConfig.api_key_id,
        "event_type": event.name,
        "platform": "server",
        "timestamp": timestamp,
        "event_properties": {
            "project_name": "cdp-sdk",
            "cdp_sdk_language": "python",
            **event.model_dump(),
        },
    }

    events = [enhanced_event]
    stringified_event_data = json.dumps(events)
    upload_time = str(timestamp)

    checksum = hashlib.md5((stringified_event_data + upload_time).encode("utf-8")).hexdigest()

    analytics_service_data = {
        "client": public_client_id,
        "e": stringified_event_data,
        "checksum": checksum,
    }

    api_endpoint = "https://cca-lite.coinbase.com"
    event_path = "/amp"
    event_endpoint = f"{api_endpoint}{event_path}"

    requests.post(
        event_endpoint,
        headers={"Content-Type": "application/json"},
        json=analytics_service_data,
    )


def wrap_with_error_tracking(func):
    """Wrap a method with error tracking.

    Args:
        func: The function to wrap.

    Returns:
        The wrapped function.

    """

    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as error:
            event_data = ErrorEventData(
                method=func.__name__,
                message=str(error),
                stack=traceback.format_exc(),
                name="error",
            )

            if os.getenv("DISABLE_CDP_ERROR_REPORTING") != "true":
                with contextlib.suppress(Exception):
                    await send_event(event_data)

            raise

    return wrapper


def wrap_class_with_error_tracking(cls):
    """Wrap all methods of a class with error tracking.

    Args:
        cls: The class to wrap.

    Returns:
        The class with wrapped methods.

    """
    for name, method in inspect.getmembers(cls, inspect.isfunction):
        if not name.startswith("__"):
            setattr(cls, name, wrap_with_error_tracking(method))
    return cls


wrap_class_with_error_tracking(CdpClient)
wrap_class_with_error_tracking(EvmClient)
wrap_class_with_error_tracking(SolanaClient)
