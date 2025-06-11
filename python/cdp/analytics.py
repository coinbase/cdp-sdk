import asyncio
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

from cdp.__version__ import __version__
from cdp.openapi_client.errors import ApiError

# This is a public client id for the analytics service
public_client_id = "54f2ee2fb3d2b901a829940d70fbfc13"


class ErrorEventData(BaseModel):
    """The data in an error event."""

    method: str  # The API method where the error occurred, e.g. createAccount, getAccount
    message: str  # The error message
    name: str  # The name of the event. This should match the name in AEC
    stack: str | None = None  # The error stack trace


EventData = ErrorEventData

Analytics = {
    "identifier": "",  # set in cdp_client.py
}


async def send_event(event: EventData) -> None:
    """Send an analytics event to the default endpoint.

    Args:
        event: The event data containing event-specific fields

    Returns:
        None - resolves when the event is sent

    """
    if os.getenv("DISABLE_CDP_ERROR_REPORTING") == "true":
        return

    timestamp = int(time.time() * 1000)

    enhanced_event = {
        "user_id": Analytics["identifier"],
        "event_type": event.name,
        "platform": "server",
        "timestamp": timestamp,
        "event_properties": {
            "project_name": "cdp-sdk",
            "cdp_sdk_language": "python",
            "version": __version__,
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


def _run_async_in_sync(coroutine):
    """Run an async coroutine in a sync context.

    Args:
        coroutine: The coroutine to run

    Returns:
        Any: The result of the coroutine, or None if it fails

    """
    try:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        # Check if loop is already running (e.g., in Jupyter notebooks)
        if loop.is_running():
            # We can't run the coroutine in an already running loop
            # This is a limitation of asyncio, so we skip analytics
            return None

        return loop.run_until_complete(coroutine)
    except Exception:
        # If anything goes wrong, silently fail to avoid breaking the SDK
        return None


def wrap_with_error_tracking(func):
    """Wrap a method with error tracking.

    Args:
        func: The function to wrap.

    Returns:
        The wrapped function.

    """
    if inspect.iscoroutinefunction(func):
        # Original function is async
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as error:
                if not should_track_error(error):
                    raise error

                event_data = ErrorEventData(
                    method=func.__name__,
                    message=str(error),
                    stack=traceback.format_exc(),
                    name="error",
                )

                with contextlib.suppress(Exception):
                    await send_event(event_data)

                raise error

        return async_wrapper
    else:
        # Original function is sync
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as error:
                if not should_track_error(error):
                    raise error

                event_data = ErrorEventData(
                    method=func.__name__,
                    message=str(error),
                    stack=traceback.format_exc(),
                    name="error",
                )

                # Try to send analytics event from sync context
                with contextlib.suppress(Exception):
                    _run_async_in_sync(send_event(event_data))

                raise error

        return sync_wrapper


def wrap_class_with_error_tracking(cls):
    """Wrap all methods of a class with error tracking.

    Args:
        cls: The class to wrap.

    Returns:
        The class with wrapped methods.

    """
    if os.getenv("DISABLE_CDP_ERROR_REPORTING") == "true":
        return cls

    for name, method in inspect.getmembers(cls, inspect.isfunction):
        if not name.startswith("__"):
            setattr(cls, name, wrap_with_error_tracking(method))
    return cls


def should_track_error(error: Exception) -> bool:
    """Determine if an error should be tracked.

    Args:
        error: The error to check.

    Returns:
        True if the error should be tracked, False otherwise.

    """
    if isinstance(error, ApiError) and error.error_type != "unexpected_error":  # noqa: SIM103
        return False

    return True
