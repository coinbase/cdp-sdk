"""Wires a :class:`~cdp.x402.core.guardrails.types.SpendControls` configuration
onto an upstream ``x402Client`` or ``x402ClientSync``.

Registers one allow-list policy, one before-hook (cap enforcement + provisional
spend recording), one after-hook (stores pending state for settlement
confirmation), and one failure-hook (rollback of anticipatory records) on the
client.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import logging
import math
import re
import threading
import weakref
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Generic, Literal, TypeVar

from x402.client import x402ClientSync

from cdp.x402.core.guardrails.normalize import normalize_asset, normalize_network, normalize_payee
from cdp.x402.core.guardrails.spend_tracker import SpendTracker
from cdp.x402.core.guardrails.types import (
    Amount,
    SpendControlError,
    SpendControls,
    SpendLedgerEntry,
)

logger = logging.getLogger(__name__)

DEFAULT_APPROACHING_LIMIT_THRESHOLDS: tuple[float, ...] = (0.8, 0.95)

PolicyFilterFailure = Literal["network_not_allowed", "asset_not_allowed", "payee_not_allowed"]

_FILTER_FAILURE_NETWORK_NOT_ALLOWED: PolicyFilterFailure = "network_not_allowed"
_FILTER_FAILURE_ASSET_NOT_ALLOWED: PolicyFilterFailure = "asset_not_allowed"
_FILTER_FAILURE_PAYEE_NOT_ALLOWED: PolicyFilterFailure = "payee_not_allowed"

_APPLIED_ATTR = "_cdp_x402_spend_controls_applied"
_REGISTRY_ATTR = "_cdp_x402_spend_controls_registry"

_STORE_ASYNC_LOCKS: weakref.WeakKeyDictionary[object, dict[str, asyncio.Lock]] = (
    weakref.WeakKeyDictionary()
)
_STORE_SYNC_LOCKS: weakref.WeakKeyDictionary[object, dict[str, threading.Lock]] = (
    weakref.WeakKeyDictionary()
)
_STORE_ASYNC_LOCKS_BY_ID: dict[int, dict[str, asyncio.Lock]] = {}
_STORE_SYNC_LOCKS_BY_ID: dict[int, dict[str, threading.Lock]] = {}

_STORE_PROVISIONAL_ASYNC: weakref.WeakKeyDictionary[object, dict[str, int]] = (
    weakref.WeakKeyDictionary()
)
_STORE_PROVISIONAL_SYNC: weakref.WeakKeyDictionary[object, dict[str, int]] = (
    weakref.WeakKeyDictionary()
)
_STORE_PROVISIONAL_ASYNC_BY_ID: dict[int, dict[str, int]] = {}
_STORE_PROVISIONAL_SYNC_BY_ID: dict[int, dict[str, int]] = {}

_SYNC_BRIDGE_EXECUTOR: concurrent.futures.ThreadPoolExecutor | None = None
_SYNC_BRIDGE_EXECUTOR_LOCK = threading.Lock()


def _get_sync_bridge_executor() -> concurrent.futures.ThreadPoolExecutor:
    global _SYNC_BRIDGE_EXECUTOR
    if _SYNC_BRIDGE_EXECUTOR is None:
        with _SYNC_BRIDGE_EXECUTOR_LOCK:
            if _SYNC_BRIDGE_EXECUTOR is None:
                _SYNC_BRIDGE_EXECUTOR = concurrent.futures.ThreadPoolExecutor(
                    max_workers=1, thread_name_prefix="cdp_x402_sync_bridge"
                )
    return _SYNC_BRIDGE_EXECUTOR


@dataclass
class PendingPayment:
    entry: SpendLedgerEntry
    notify_key: str
    req_asset: str
    notified_thresholds: set[float]


class SpendControlsRegistry:
    """Settlement-aware finalization handlers attached to a client by
    :func:`apply_spend_controls`. Exposed via :func:`get_spend_controls_registry`.
    """

    def __init__(
        self,
        *,
        async_confirm: Any,
        async_rollback: Any,
        sync_confirm: Any = None,
        sync_rollback: Any = None,
    ) -> None:
        self._async_confirm = async_confirm
        self._async_rollback = async_rollback
        self._sync_confirm = sync_confirm
        self._sync_rollback = sync_rollback

    async def confirm(self, payment_payload: Any) -> None:
        """Mark a payment as settled on-chain. Fires threshold notifications."""
        await self._async_confirm(payment_payload)

    async def rollback(self, payment_payload: Any) -> None:
        """Undo a provisional spend."""
        await self._async_rollback(payment_payload)

    def confirm_sync(self, payment_payload: Any) -> None:
        """Synchronous variant of :meth:`confirm`."""
        if self._sync_confirm is not None:
            self._sync_confirm(payment_payload)

    def rollback_sync(self, payment_payload: Any) -> None:
        """Synchronous variant of :meth:`rollback`."""
        if self._sync_rollback is not None:
            self._sync_rollback(payment_payload)


def get_spend_controls_registry(client: Any) -> SpendControlsRegistry | None:
    """Return the :class:`SpendControlsRegistry` attached to *client*, or ``None``."""
    registry = getattr(client, _REGISTRY_ATTR, None)
    if isinstance(registry, SpendControlsRegistry):
        return registry
    inner = getattr(client, "_inner", None)
    if inner is not None:
        inner_registry = getattr(inner, _REGISTRY_ATTR, None)
        if isinstance(inner_registry, SpendControlsRegistry):
            return inner_registry
    http_inner = getattr(client, "_client", None)
    if http_inner is not None and http_inner is not client:
        inner_registry = getattr(http_inner, _REGISTRY_ATTR, None)
        if isinstance(inner_registry, SpendControlsRegistry):
            return inner_registry
    return None


@dataclass(frozen=True)
class ResolvedSpendControls:
    """The active spend controls configuration after defaults are filled in."""

    max_amount_per_payment: Amount | None
    max_cumulative_spend: Amount | None
    max_cumulative_spend_window_ms: int | None
    allowed_networks: frozenset[str]
    allowed_assets: frozenset[str]
    allowed_payees: frozenset[str]
    approaching_limit_thresholds: tuple[float, ...]
    on_approaching_limit: Any
    tracker: SpendTracker
    registry: SpendControlsRegistry | None = None


def _build_allowed_set(
    values: list[str] | None,
    normalize_fn: Any,
) -> frozenset[str]:
    if not values:
        return frozenset()
    return frozenset(normalize_fn(v) for v in values)


def _dedupe_thresholds(thresholds: list[float] | None) -> tuple[float, ...]:
    source = thresholds if thresholds else list(DEFAULT_APPROACHING_LIMIT_THRESHOLDS)
    seen: set[float] = set()
    result = []
    for t in source:
        if math.isfinite(t) and 0 < t <= 1 and t not in seen:
            seen.add(t)
            result.append(t)
    result.sort()
    return tuple(result)


def _asset_matches(cap_asset: str | None, req_asset: str) -> bool:
    if cap_asset is None:
        return True
    return normalize_asset(cap_asset) == normalize_asset(req_asset)


def _parse_atomic_from_requirement(req: Any) -> int:
    raw: str | None = None
    if hasattr(req, "amount") and req.amount is not None:
        raw = req.amount
    elif hasattr(req, "max_amount_required") and req.max_amount_required is not None:
        raw = req.max_amount_required

    if raw is None:
        raise SpendControlError(
            "amount_unparseable",
            f"PaymentRequirements has no amount field: {req!r}",
            {
                "asset": getattr(req, "asset", None),
                "network": getattr(req, "network", None),
                "pay_to": getattr(req, "pay_to", None),
            },
        )

    if isinstance(raw, bool):
        raise SpendControlError(
            "amount_unparseable",
            f"PaymentRequirements amount {raw!r} is not a valid atomic integer",
            {"attempted": str(raw)},
        )

    if isinstance(raw, int):
        parsed = raw
    elif isinstance(raw, str):
        trimmed = raw.strip()
        if not re.fullmatch(r"\d+", trimmed):
            raise SpendControlError(
                "amount_unparseable",
                f"PaymentRequirements amount {raw!r} is not a valid atomic integer",
                {"attempted": str(raw)},
            )
        parsed = int(trimmed)
    else:
        raise SpendControlError(
            "amount_unparseable",
            f"PaymentRequirements amount {raw!r} is not a valid atomic integer",
            {"attempted": str(raw)},
        )

    if parsed < 0:
        raise SpendControlError(
            "amount_unparseable",
            f"PaymentRequirements.amount {raw!r} must be a non-negative atomic integer",
            {"attempted": str(parsed)},
        )

    return parsed


def _get_async_store_lock_map(store: object) -> dict[str, asyncio.Lock]:
    try:
        return _STORE_ASYNC_LOCKS.setdefault(store, {})
    except TypeError:
        key = id(store)
        lock_map = _STORE_ASYNC_LOCKS_BY_ID.get(key)
        if lock_map is None:
            lock_map = {}
            _STORE_ASYNC_LOCKS_BY_ID[key] = lock_map
            try:
                weakref.finalize(store, _STORE_ASYNC_LOCKS_BY_ID.pop, key, None)
            except TypeError:
                pass
        return lock_map


def _get_sync_store_lock_map(store: object) -> dict[str, threading.Lock]:
    try:
        return _STORE_SYNC_LOCKS.setdefault(store, {})
    except TypeError:
        key = id(store)
        lock_map = _STORE_SYNC_LOCKS_BY_ID.get(key)
        if lock_map is None:
            lock_map = {}
            _STORE_SYNC_LOCKS_BY_ID[key] = lock_map
            try:
                weakref.finalize(store, _STORE_SYNC_LOCKS_BY_ID.pop, key, None)
            except TypeError:
                pass
        return lock_map


def _get_async_provisional_map(store: object) -> dict[str, int]:
    try:
        existing = _STORE_PROVISIONAL_ASYNC.get(store)
        if existing is None:
            new_map: dict[str, int] = {}
            _STORE_PROVISIONAL_ASYNC[store] = new_map
            return new_map
        return existing
    except TypeError:
        key = id(store)
        m = _STORE_PROVISIONAL_ASYNC_BY_ID.get(key)
        if m is None:
            m = {}
            _STORE_PROVISIONAL_ASYNC_BY_ID[key] = m
            try:
                weakref.finalize(store, _STORE_PROVISIONAL_ASYNC_BY_ID.pop, key, None)
            except TypeError:
                pass
        return m


def _get_sync_provisional_map(store: object) -> dict[str, int]:
    try:
        existing = _STORE_PROVISIONAL_SYNC.get(store)
        if existing is None:
            new_map2: dict[str, int] = {}
            _STORE_PROVISIONAL_SYNC[store] = new_map2
            return new_map2
        return existing
    except TypeError:
        key = id(store)
        m = _STORE_PROVISIONAL_SYNC_BY_ID.get(key)
        if m is None:
            m = {}
            _STORE_PROVISIONAL_SYNC_BY_ID[key] = m
            try:
                weakref.finalize(store, _STORE_PROVISIONAL_SYNC_BY_ID.pop, key, None)
            except TypeError:
                pass
        return m


_LockT = TypeVar("_LockT")


class _AssetLockMap(Generic[_LockT]):
    def __init__(
        self,
        shared_store: object | None,
        get_store_map: Callable[[object], dict[str, _LockT]],
        make_lock: Callable[[], _LockT],
    ) -> None:
        self._local: dict[str, _LockT] = {}
        self._shared_store = shared_store
        self._get_store_map = get_store_map
        self._make_lock = make_lock

    def get(self, asset_key: str) -> _LockT:
        lock_map: dict[str, _LockT] = (
            self._get_store_map(self._shared_store)
            if self._shared_store is not None
            else self._local
        )
        if asset_key not in lock_map:
            lock_map[asset_key] = self._make_lock()
        return lock_map[asset_key]


class _ThresholdNotificationState:
    def __init__(self) -> None:
        self._notified: dict[str, set[float]] = {}

    def get(self, asset: str) -> set[float]:
        return self._notified.setdefault(asset, set())


class _PaymentStateStore:
    def __init__(self, execution_id_fn: Callable[[], int]) -> None:
        self._state: dict[tuple[int, int, int], tuple[SpendLedgerEntry, int]] = {}
        self._execution_id_fn = execution_id_fn

    def _key(self, ctx: Any) -> tuple[int, int, int]:
        execution_id = self._execution_id_fn()
        payment_required = getattr(ctx, "payment_required", None)
        selected_requirements = getattr(ctx, "selected_requirements", None)
        if payment_required is None and selected_requirements is None:
            return (0, 0, execution_id or id(ctx))
        return (
            id(payment_required) if payment_required is not None else 0,
            id(selected_requirements) if selected_requirements is not None else 0,
            execution_id,
        )

    def read(self, ctx: Any) -> tuple[SpendLedgerEntry | None, int | None]:
        state = self._state.get(self._key(ctx))
        if state is None:
            return None, None
        return state

    def write(self, ctx: Any, entry: SpendLedgerEntry, total: int) -> None:
        self._state[self._key(ctx)] = (entry, total)

    def clear(self, ctx: Any) -> None:
        self._state.pop(self._key(ctx), None)


def _pin_guardrails_before_hook_last(client: Any, guardrails_before_hook: Any) -> None:
    original_register = getattr(client, "on_before_payment_creation", None)
    hooks = getattr(client, "_before_payment_creation_hooks", None)
    if not callable(original_register) or not isinstance(hooks, list):
        return

    def _register_before(hook: Any) -> Any:
        try:
            guardrails_index = hooks.index(guardrails_before_hook)
        except ValueError:
            return original_register(hook)
        hooks.insert(guardrails_index, hook)
        return client

    client.on_before_payment_creation = _register_before


def _check_asset(req: Any, allowed_assets: frozenset[str]) -> bool:
    if not allowed_assets:
        return True
    return normalize_asset(req.asset) in allowed_assets


def _check_payee(
    req: Any,
    raw_allowed_payees: list[str],
    normalized_payees_by_network: dict[str, frozenset[str]],
) -> bool:
    if not raw_allowed_payees:
        return True
    normalized_req_payee = normalize_payee(req.network, req.pay_to)
    try:
        canonical_req_network = normalize_network(req.network)
    except SpendControlError:
        return False
    if canonical_req_network not in normalized_payees_by_network:
        normalized_payees_by_network[canonical_req_network] = frozenset(
            normalize_payee(canonical_req_network, p) for p in raw_allowed_payees
        )
    return normalized_req_payee in normalized_payees_by_network[canonical_req_network]


def _check_network(req: Any, allowed_networks: frozenset[str]) -> bool:
    if not allowed_networks:
        return True
    try:
        return normalize_network(req.network) in allowed_networks
    except SpendControlError:
        return False


def _make_policy(
    allowed_networks: frozenset[str],
    allowed_assets: frozenset[str],
    raw_allowed_payees: list[str],
) -> Any:
    _normalized_payees_by_network: dict[str, frozenset[str]] = {}

    _filter_rules: tuple[tuple[PolicyFilterFailure, str, Any, int], ...] = (
        (
            _FILTER_FAILURE_NETWORK_NOT_ALLOWED,
            "All payment requirements were filtered out by allowed_networks",
            lambda req: _check_network(req, allowed_networks),
            2,
        ),
        (
            _FILTER_FAILURE_ASSET_NOT_ALLOWED,
            "All payment requirements were filtered out by allowed_assets",
            lambda req: _check_asset(req, allowed_assets),
            0,
        ),
        (
            _FILTER_FAILURE_PAYEE_NOT_ALLOWED,
            "All payment requirements were filtered out by allowed_payees",
            lambda req: _check_payee(req, raw_allowed_payees, _normalized_payees_by_network),
            1,
        ),
    )

    def _policy(version: int, requirements: list[Any]) -> list[Any]:
        per_option_failures: list[PolicyFilterFailure] = []
        filtered = []
        for req in requirements:
            for code, _message, check, _priority in _filter_rules:
                if not check(req):
                    per_option_failures.append(code)
                    break
            else:
                filtered.append(req)

        if not filtered and per_option_failures:
            for code, message, _check, _priority in sorted(_filter_rules, key=lambda r: r[3]):
                if code in per_option_failures:
                    raise SpendControlError(code, message)

        return filtered

    return _policy


def apply_spend_controls(
    client: Any,
    controls: SpendControls,
) -> ResolvedSpendControls:
    if isinstance(client, x402ClientSync):
        return _apply_spend_controls_sync(client, controls)
    return _apply_spend_controls_async(client, controls)


def _resolve_controls(
    controls: SpendControls,
) -> tuple[
    Amount | None,
    Amount | None,
    int | None,
    frozenset[str],
    frozenset[str],
    list[str],
    tuple[float, ...],
    SpendTracker,
]:
    max_amount_per_payment = controls.max_amount_per_payment
    max_cumulative_spend = controls.max_cumulative_spend
    max_cumulative_spend_window_ms = controls.max_cumulative_spend_window

    allowed_networks = _build_allowed_set(
        controls.allowed_networks,
        lambda n: normalize_network(n),
    )
    allowed_assets = _build_allowed_set(controls.allowed_assets, normalize_asset)
    raw_allowed_payees: list[str] = controls.allowed_payees or []
    thresholds = _dedupe_thresholds(controls.approaching_limit_thresholds)
    tracker = SpendTracker(
        max_ledger_entries=controls.max_ledger_entries,
        store=controls.store,
    )

    return (
        max_amount_per_payment,
        max_cumulative_spend,
        max_cumulative_spend_window_ms,
        allowed_networks,
        allowed_assets,
        raw_allowed_payees,
        thresholds,
        tracker,
    )


def _apply_spend_controls_async(
    client: Any,
    controls: SpendControls,
) -> ResolvedSpendControls:
    if getattr(client, _APPLIED_ATTR, False):
        raise SpendControlError(
            "already_applied",
            "apply_spend_controls() was called more than once on the same x402Client. "
            "Each client must have exactly one set of spend controls.",
        )

    (
        max_amount_per_payment,
        max_cumulative_spend,
        max_cumulative_spend_window_ms,
        allowed_networks,
        allowed_assets,
        raw_allowed_payees,
        thresholds,
        tracker,
    ) = _resolve_controls(controls)

    _async_locks: _AssetLockMap[asyncio.Lock] = _AssetLockMap(
        controls.store, _get_async_store_lock_map, asyncio.Lock
    )
    _notified = _ThresholdNotificationState()

    def _async_execution_id() -> int:
        current_task = asyncio.current_task()
        return id(current_task) if current_task is not None else 0

    _state = _PaymentStateStore(_async_execution_id)

    _provisional_atomic: dict[str, int] = (
        _get_async_provisional_map(controls.store) if controls.store is not None else {}
    )

    client.register_policy(_make_policy(allowed_networks, allowed_assets, raw_allowed_payees))

    async def _before_hook(ctx: Any) -> None:
        _state.clear(ctx)
        req = ctx.selected_requirements
        atomic = _parse_atomic_from_requirement(req)
        normalized_req_asset = normalize_asset(req.asset)

        if (
            max_amount_per_payment is not None
            and atomic > max_amount_per_payment.atomic
            and _asset_matches(max_amount_per_payment.asset, req.asset)
        ):
            raise SpendControlError(
                "per_payment_cap",
                f"Payment amount {atomic} exceeds per-payment cap "
                f"{max_amount_per_payment.atomic}"
                + (
                    f" for asset {max_amount_per_payment.asset}"
                    if max_amount_per_payment.asset
                    else ""
                ),
                {
                    "attempted": str(atomic),
                    "limit": str(max_amount_per_payment.atomic),
                    "asset": req.asset,
                    "network": req.network,
                    "pay_to": req.pay_to,
                },
            )

        if max_cumulative_spend is not None and _asset_matches(
            max_cumulative_spend.asset, req.asset
        ):
            lock_key = normalized_req_asset
            lock = _async_locks.get(lock_key)
            async with lock:
                import time

                now = int(time.time() * 1000)
                if max_cumulative_spend_window_ms is not None:
                    await tracker.prune(now, max_cumulative_spend_window_ms)
                since = (
                    now - max_cumulative_spend_window_ms
                    if max_cumulative_spend_window_ms is not None
                    else None
                )
                from cdp.x402.core.guardrails.spend_tracker import TotalSpendQuery

                total = await tracker.total(
                    TotalSpendQuery(asset=normalized_req_asset, since=since)
                )
                if total + atomic > max_cumulative_spend.atomic:
                    raise SpendControlError(
                        "cumulative_cap",
                        f"Payment of {atomic} would push cumulative spend to "
                        f"{total + atomic}, exceeding cap {max_cumulative_spend.atomic}"
                        + (
                            f" for asset {max_cumulative_spend.asset}"
                            if max_cumulative_spend.asset
                            else ""
                        )
                        + (
                            f" within {max_cumulative_spend_window_ms}ms window"
                            if max_cumulative_spend_window_ms
                            else ""
                        ),
                        {
                            "attempted": str(total + atomic),
                            "limit": str(max_cumulative_spend.atomic),
                            "asset": req.asset,
                            "network": req.network,
                            "pay_to": req.pay_to,
                        },
                    )

                from cdp.x402.core.guardrails.spend_tracker import RecordSpendInput

                entry = await tracker.record(
                    RecordSpendInput(
                        atomic_amount=atomic,
                        asset=normalized_req_asset,
                        network=req.network,
                        pay_to=normalize_payee(req.network, req.pay_to),
                    )
                )
                _state.write(ctx, entry, total)
                _provisional_atomic[normalized_req_asset] = (
                    _provisional_atomic.get(normalized_req_asset, 0) + atomic
                )

    client.on_before_payment_creation(_before_hook)
    _pin_guardrails_before_hook_last(client, _before_hook)

    _pending_by_payload: dict[int, PendingPayment] = {}

    def _register_pending(payload: Any, pending: PendingPayment) -> None:
        key = id(payload)
        _pending_by_payload[key] = pending
        try:
            weakref.finalize(payload, _pending_by_payload.pop, key, None)
        except TypeError:
            pass

    async def _fire_thresholds_for_pending(pending: PendingPayment) -> set[float]:
        fired: set[float] = set()
        lock = _async_locks.get(pending.notify_key)
        async with lock:
            _provisional_atomic[pending.notify_key] = max(
                0,
                _provisional_atomic.get(pending.notify_key, 0) - pending.entry.atomic_amount,
            )

            notify = controls.on_approaching_limit
            if (
                not max_cumulative_spend
                or not notify
                or not _asset_matches(max_cumulative_spend.asset, pending.req_asset)
            ):
                return fired
            limit = max_cumulative_spend.atomic
            if limit <= 0:
                return fired

            import time

            now = int(time.time() * 1000)
            if max_cumulative_spend_window_ms is not None:
                await tracker.prune(now, max_cumulative_spend_window_ms)
            since = (
                now - max_cumulative_spend_window_ms
                if max_cumulative_spend_window_ms is not None
                else None
            )
            from cdp.x402.core.guardrails.spend_tracker import TotalSpendQuery

            tracker_total = await tracker.total(
                TotalSpendQuery(asset=pending.notify_key, since=since)
            )
            provisional = _provisional_atomic.get(pending.notify_key, 0)
            confirmed_after = tracker_total - provisional
            confirmed_before = confirmed_after - pending.entry.atomic_amount
            notified = _notified.get(pending.notify_key)

            for threshold in thresholds:
                scaled_threshold = round(threshold * 1_000_000)
                lhs_before = confirmed_before * 1_000_000
                lhs_after_this = confirmed_after * 1_000_000
                rhs = scaled_threshold * limit
                was_below = lhs_before < rhs
                now_at_or_above = lhs_after_this >= rhs
                if was_below:
                    notified.discard(threshold)
                if was_below and now_at_or_above and threshold not in notified:
                    notified.add(threshold)
                    fired.add(threshold)
                    try:
                        notify(
                            Amount(atomic=confirmed_after, asset=pending.req_asset),
                            Amount(
                                atomic=limit,
                                asset=max_cumulative_spend.asset or pending.req_asset,
                            ),
                        )
                    except Exception as e:
                        logger.warning("[cdp-x402] on_approaching_limit raised: %s", e)
        return fired

    async def _after_hook(ctx: Any) -> None:
        recorded_entry, _ = _state.read(ctx)
        _state.clear(ctx)
        if recorded_entry is None:
            return
        payload = getattr(ctx, "payment_payload", None)
        if payload is None:
            return
        req = ctx.selected_requirements
        _register_pending(
            payload,
            PendingPayment(
                entry=recorded_entry,
                notify_key=normalize_asset(req.asset),
                req_asset=req.asset,
                notified_thresholds=set(),
            ),
        )

    client.on_after_payment_creation(_after_hook)

    async def _failure_hook(ctx: Any) -> None:
        recorded_entry, _ = _state.read(ctx)
        _state.clear(ctx)
        if recorded_entry is None:
            return
        notify_key = normalize_asset(ctx.selected_requirements.asset)
        lock = _async_locks.get(notify_key)
        async with lock:
            _provisional_atomic[notify_key] = max(
                0, _provisional_atomic.get(notify_key, 0) - recorded_entry.atomic_amount
            )
            try:
                await tracker.remove_entry(recorded_entry)
            except Exception as e:
                logger.warning("[cdp-x402] SpendTracker rollback failed: %s", e)

    client.on_payment_creation_failure(_failure_hook)

    async def _confirm_payment(payment_payload: Any) -> None:
        pending = _pending_by_payload.pop(id(payment_payload), None)
        if pending is None:
            return
        try:
            fired = await _fire_thresholds_for_pending(pending)
            pending.notified_thresholds.update(fired)
        except Exception as e:
            logger.warning("[cdp-x402] threshold notification error on confirm: %s", e)

    async def _rollback_payment(payment_payload: Any) -> None:
        pending = _pending_by_payload.pop(id(payment_payload), None)
        if pending is None:
            return
        lock = _async_locks.get(pending.notify_key)
        async with lock:
            _provisional_atomic[pending.notify_key] = max(
                0,
                _provisional_atomic.get(pending.notify_key, 0) - pending.entry.atomic_amount,
            )
            try:
                await tracker.remove_entry(pending.entry)
            except Exception as e:
                logger.warning("[cdp-x402] SpendTracker rollback failed on settlement: %s", e)
        if pending.notified_thresholds:
            notified = _notified.get(pending.notify_key)
            for threshold in pending.notified_thresholds:
                notified.discard(threshold)

    registry = SpendControlsRegistry(
        async_confirm=_confirm_payment,
        async_rollback=_rollback_payment,
    )
    setattr(client, _REGISTRY_ATTR, registry)
    setattr(client, _APPLIED_ATTR, True)

    resolved_payees = frozenset(normalize_asset(p) for p in raw_allowed_payees)

    return ResolvedSpendControls(
        max_amount_per_payment=max_amount_per_payment,
        max_cumulative_spend=max_cumulative_spend,
        max_cumulative_spend_window_ms=max_cumulative_spend_window_ms,
        allowed_networks=allowed_networks,
        allowed_assets=allowed_assets,
        allowed_payees=resolved_payees,
        approaching_limit_thresholds=thresholds,
        on_approaching_limit=controls.on_approaching_limit,
        tracker=tracker,
        registry=registry,
    )


def _apply_spend_controls_sync(
    client: Any,
    controls: SpendControls,
) -> ResolvedSpendControls:
    if getattr(client, _APPLIED_ATTR, False):
        raise SpendControlError(
            "already_applied",
            "apply_spend_controls() was called more than once on the same x402ClientSync. "
            "Each client must have exactly one set of spend controls.",
        )

    (
        max_amount_per_payment,
        max_cumulative_spend,
        max_cumulative_spend_window_ms,
        allowed_networks,
        allowed_assets,
        raw_allowed_payees,
        thresholds,
        tracker,
    ) = _resolve_controls(controls)

    _sync_locks: _AssetLockMap[threading.Lock] = _AssetLockMap(
        controls.store, _get_sync_store_lock_map, threading.Lock
    )
    _notified = _ThresholdNotificationState()
    _state = _PaymentStateStore(threading.get_ident)

    _provisional_atomic_sync: dict[str, int] = (
        _get_sync_provisional_map(controls.store) if controls.store is not None else {}
    )

    client.register_policy(_make_policy(allowed_networks, allowed_assets, raw_allowed_payees))

    def _run_sync_async(coro: Any) -> Any:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(coro)
        future = _get_sync_bridge_executor().submit(asyncio.run, coro)
        return future.result()

    def _before_hook_sync(ctx: Any) -> None:
        _state.clear(ctx)
        req = ctx.selected_requirements
        atomic = _parse_atomic_from_requirement(req)
        normalized_req_asset = normalize_asset(req.asset)

        if (
            max_amount_per_payment is not None
            and atomic > max_amount_per_payment.atomic
            and _asset_matches(max_amount_per_payment.asset, req.asset)
        ):
            raise SpendControlError(
                "per_payment_cap",
                f"Payment amount {atomic} exceeds per-payment cap "
                f"{max_amount_per_payment.atomic}"
                + (
                    f" for asset {max_amount_per_payment.asset}"
                    if max_amount_per_payment.asset
                    else ""
                ),
                {
                    "attempted": str(atomic),
                    "limit": str(max_amount_per_payment.atomic),
                    "asset": req.asset,
                    "network": req.network,
                    "pay_to": req.pay_to,
                },
            )

        if max_cumulative_spend is not None and _asset_matches(
            max_cumulative_spend.asset, req.asset
        ):
            lock_key = normalized_req_asset
            lock = _sync_locks.get(lock_key)
            with lock:
                import time

                now = int(time.time() * 1000)
                if max_cumulative_spend_window_ms is not None:
                    _run_sync_async(tracker.prune(now, max_cumulative_spend_window_ms))
                since = (
                    now - max_cumulative_spend_window_ms
                    if max_cumulative_spend_window_ms is not None
                    else None
                )
                from cdp.x402.core.guardrails.spend_tracker import TotalSpendQuery

                total = _run_sync_async(
                    tracker.total(TotalSpendQuery(asset=normalized_req_asset, since=since))
                )

                if total + atomic > max_cumulative_spend.atomic:
                    raise SpendControlError(
                        "cumulative_cap",
                        f"Payment of {atomic} would push cumulative spend to "
                        f"{total + atomic}, exceeding cap {max_cumulative_spend.atomic}"
                        + (
                            f" for asset {max_cumulative_spend.asset}"
                            if max_cumulative_spend.asset
                            else ""
                        )
                        + (
                            f" within {max_cumulative_spend_window_ms}ms window"
                            if max_cumulative_spend_window_ms
                            else ""
                        ),
                        {
                            "attempted": str(total + atomic),
                            "limit": str(max_cumulative_spend.atomic),
                            "asset": req.asset,
                            "network": req.network,
                            "pay_to": req.pay_to,
                        },
                    )

                from cdp.x402.core.guardrails.spend_tracker import RecordSpendInput

                entry = _run_sync_async(
                    tracker.record(
                        RecordSpendInput(
                            atomic_amount=atomic,
                            asset=normalized_req_asset,
                            network=req.network,
                            pay_to=normalize_payee(req.network, req.pay_to),
                        )
                    )
                )
                _state.write(ctx, entry, total)
                _provisional_atomic_sync[normalized_req_asset] = (
                    _provisional_atomic_sync.get(normalized_req_asset, 0) + atomic
                )

    client.on_before_payment_creation(_before_hook_sync)
    _pin_guardrails_before_hook_last(client, _before_hook_sync)

    _pending_by_payload_sync: dict[int, PendingPayment] = {}

    def _register_pending_sync(payload: Any, pending: PendingPayment) -> None:
        key = id(payload)
        _pending_by_payload_sync[key] = pending
        try:
            weakref.finalize(payload, _pending_by_payload_sync.pop, key, None)
        except TypeError:
            pass

    def _fire_thresholds_for_pending_sync(pending: PendingPayment) -> set[float]:
        fired: set[float] = set()
        lock = _sync_locks.get(pending.notify_key)
        with lock:
            _provisional_atomic_sync[pending.notify_key] = max(
                0,
                _provisional_atomic_sync.get(pending.notify_key, 0) - pending.entry.atomic_amount,
            )

            notify = controls.on_approaching_limit
            if (
                not max_cumulative_spend
                or not notify
                or not _asset_matches(max_cumulative_spend.asset, pending.req_asset)
            ):
                return fired
            limit = max_cumulative_spend.atomic
            if limit <= 0:
                return fired

            import time

            now = int(time.time() * 1000)
            if max_cumulative_spend_window_ms is not None:
                _run_sync_async(tracker.prune(now, max_cumulative_spend_window_ms))
            since = (
                now - max_cumulative_spend_window_ms
                if max_cumulative_spend_window_ms is not None
                else None
            )
            from cdp.x402.core.guardrails.spend_tracker import TotalSpendQuery

            tracker_total = _run_sync_async(
                tracker.total(TotalSpendQuery(asset=pending.notify_key, since=since))
            )
            provisional = _provisional_atomic_sync.get(pending.notify_key, 0)
            confirmed_after = tracker_total - provisional
            confirmed_before = confirmed_after - pending.entry.atomic_amount
            notified = _notified.get(pending.notify_key)

            for threshold in thresholds:
                scaled_threshold = round(threshold * 1_000_000)
                lhs_before = confirmed_before * 1_000_000
                lhs_after_this = confirmed_after * 1_000_000
                rhs = scaled_threshold * limit
                was_below = lhs_before < rhs
                now_at_or_above = lhs_after_this >= rhs
                if was_below:
                    notified.discard(threshold)
                if was_below and now_at_or_above and threshold not in notified:
                    notified.add(threshold)
                    fired.add(threshold)
                    try:
                        notify(
                            Amount(atomic=confirmed_after, asset=pending.req_asset),
                            Amount(
                                atomic=limit,
                                asset=max_cumulative_spend.asset or pending.req_asset,
                            ),
                        )
                    except Exception as e:
                        logger.warning("[cdp-x402] on_approaching_limit raised: %s", e)
        return fired

    def _after_hook_sync(ctx: Any) -> None:
        recorded_entry, _ = _state.read(ctx)
        _state.clear(ctx)
        if recorded_entry is None:
            return
        payload = getattr(ctx, "payment_payload", None)
        if payload is None:
            return
        req = ctx.selected_requirements
        _register_pending_sync(
            payload,
            PendingPayment(
                entry=recorded_entry,
                notify_key=normalize_asset(req.asset),
                req_asset=req.asset,
                notified_thresholds=set(),
            ),
        )

    client.on_after_payment_creation(_after_hook_sync)

    def _failure_hook_sync(ctx: Any) -> None:
        recorded_entry, _ = _state.read(ctx)
        _state.clear(ctx)
        if recorded_entry is None:
            return
        notify_key = normalize_asset(ctx.selected_requirements.asset)
        lock = _sync_locks.get(notify_key)
        with lock:
            _provisional_atomic_sync[notify_key] = max(
                0, _provisional_atomic_sync.get(notify_key, 0) - recorded_entry.atomic_amount
            )
            try:
                _run_sync_async(tracker.remove_entry(recorded_entry))
            except Exception as e:
                logger.warning("[cdp-x402] SpendTracker rollback failed: %s", e)

    client.on_payment_creation_failure(_failure_hook_sync)

    def _confirm_payment_sync(payment_payload: Any) -> None:
        pending = _pending_by_payload_sync.pop(id(payment_payload), None)
        if pending is None:
            return
        try:
            fired = _fire_thresholds_for_pending_sync(pending)
            pending.notified_thresholds.update(fired)
        except Exception as e:
            logger.warning("[cdp-x402] threshold notification error on confirm: %s", e)

    def _rollback_payment_sync(payment_payload: Any) -> None:
        pending = _pending_by_payload_sync.pop(id(payment_payload), None)
        if pending is None:
            return
        lock = _sync_locks.get(pending.notify_key)
        with lock:
            _provisional_atomic_sync[pending.notify_key] = max(
                0,
                _provisional_atomic_sync.get(pending.notify_key, 0) - pending.entry.atomic_amount,
            )
            try:
                _run_sync_async(tracker.remove_entry(pending.entry))
            except Exception as e:
                logger.warning("[cdp-x402] SpendTracker rollback failed on settlement: %s", e)
        if pending.notified_thresholds:
            notified = _notified.get(pending.notify_key)
            for threshold in pending.notified_thresholds:
                notified.discard(threshold)

    async def _confirm_payment_sync_async(payment_payload: Any) -> None:
        _confirm_payment_sync(payment_payload)

    async def _rollback_payment_sync_async(payment_payload: Any) -> None:
        _rollback_payment_sync(payment_payload)

    registry = SpendControlsRegistry(
        async_confirm=_confirm_payment_sync_async,
        async_rollback=_rollback_payment_sync_async,
        sync_confirm=_confirm_payment_sync,
        sync_rollback=_rollback_payment_sync,
    )
    setattr(client, _REGISTRY_ATTR, registry)
    setattr(client, _APPLIED_ATTR, True)

    resolved_payees = frozenset(normalize_asset(p) for p in raw_allowed_payees)

    return ResolvedSpendControls(
        max_amount_per_payment=max_amount_per_payment,
        max_cumulative_spend=max_cumulative_spend,
        max_cumulative_spend_window_ms=max_cumulative_spend_window_ms,
        allowed_networks=allowed_networks,
        allowed_assets=allowed_assets,
        allowed_payees=resolved_payees,
        approaching_limit_thresholds=thresholds,
        on_approaching_limit=controls.on_approaching_limit,
        tracker=tracker,
        registry=registry,
    )
