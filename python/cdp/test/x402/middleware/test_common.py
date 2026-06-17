"""Unit tests for middleware/_common.py gate helpers."""

from __future__ import annotations

import asyncio
import threading
from unittest.mock import MagicMock

from cdp.x402.middleware._common import AsyncPaymentGate, SyncPaymentGate


class TestAsyncPaymentGateLocks:
    """Verify that asyncio locks are created eagerly in __init__, not lazily."""

    def test_async_lock_is_created_in_init(self) -> None:
        gate = AsyncPaymentGate(facilitator_client=MagicMock())
        assert isinstance(gate._async_lock, asyncio.Lock)

    def test_http_server_lock_is_created_in_init(self) -> None:
        gate = AsyncPaymentGate(facilitator_client=MagicMock())
        assert isinstance(gate._http_server_lock, asyncio.Lock)

    def test_both_locks_are_distinct_objects(self) -> None:
        gate = AsyncPaymentGate(facilitator_client=MagicMock())
        assert gate._async_lock is not gate._http_server_lock

    def test_separate_instances_have_independent_locks(self) -> None:
        gate_a = AsyncPaymentGate(facilitator_client=MagicMock())
        gate_b = AsyncPaymentGate(facilitator_client=MagicMock())
        assert gate_a._async_lock is not gate_b._async_lock
        assert gate_a._http_server_lock is not gate_b._http_server_lock


class TestSyncPaymentGateLocks:
    """SyncPaymentGate should also hold its threading lock eagerly (existing behaviour)."""

    def test_http_server_lock_is_threading_lock(self) -> None:
        gate = SyncPaymentGate(facilitator_client=MagicMock())
        assert isinstance(gate._http_server_lock, type(threading.Lock()))
