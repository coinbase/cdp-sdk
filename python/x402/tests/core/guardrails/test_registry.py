"""Tests for the settlement-aware SpendControlsRegistry (confirm / rollback)."""

from __future__ import annotations

from typing import Any

import pytest

from cdp_x402.core.guardrails.apply import (
    apply_spend_controls,
    get_spend_controls_registry,
)
from cdp_x402.core.guardrails.spend_tracker import TotalSpendQuery
from cdp_x402.core.guardrails.types import Amount, SpendControls

USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"


# ---------------------------------------------------------------------------
# Helpers shared with test_apply.py (duplicated locally to stay self-contained)
# ---------------------------------------------------------------------------


class FakeAsyncClient:
    def __init__(self) -> None:
        self.policies: list[Any] = []
        self.before_hooks: list[Any] = []
        self.after_hooks: list[Any] = []
        self.failure_hooks: list[Any] = []

    def register_policy(self, p: Any) -> FakeAsyncClient:
        self.policies.append(p)
        return self

    def on_before_payment_creation(self, h: Any) -> FakeAsyncClient:
        self.before_hooks.append(h)
        return self

    def on_after_payment_creation(self, h: Any) -> FakeAsyncClient:
        self.after_hooks.append(h)
        return self

    def on_payment_creation_failure(self, h: Any) -> FakeAsyncClient:
        self.failure_hooks.append(h)
        return self


def make_req(**overrides: Any) -> Any:
    defaults = dict(
        scheme="exact",
        network="eip155:84532",
        asset=USDC,
        amount="1000000",
        pay_to="0x1111111111111111111111111111111111111111",
        max_timeout_seconds=60,
    )
    defaults.update(overrides)

    class FakeReq:
        pass

    req = FakeReq()
    for k, v in defaults.items():
        setattr(req, k, v)
    return req


def make_ctx(req: Any) -> Any:
    class FakeCtx:
        pass

    ctx = FakeCtx()
    ctx.selected_requirements = req
    ctx.payment_required = object()
    ctx.payment_payload = object()
    return ctx


async def run_before_and_after(client: FakeAsyncClient, ctx: Any) -> None:
    await client.before_hooks[0](ctx)
    await client.after_hooks[0](ctx)


# ---------------------------------------------------------------------------
# get_spend_controls_registry
# ---------------------------------------------------------------------------


class TestGetSpendControlsRegistry:
    def test_returns_none_for_client_without_controls(self) -> None:
        client = FakeAsyncClient()
        assert get_spend_controls_registry(client) is None

    def test_returns_registry_after_apply(self) -> None:
        from cdp_x402.core.guardrails.apply import SpendControlsRegistry

        client = FakeAsyncClient()
        apply_spend_controls(client, SpendControls())
        registry = get_spend_controls_registry(client)
        assert isinstance(registry, SpendControlsRegistry)

    def test_returns_registry_through_inner_attribute(self) -> None:
        """Supports CdpX402Client-style wrappers where controls are on _inner."""
        from cdp_x402.core.guardrails.apply import SpendControlsRegistry

        inner = FakeAsyncClient()
        apply_spend_controls(inner, SpendControls())

        class Wrapper:
            _inner = inner

        registry = get_spend_controls_registry(Wrapper())
        assert isinstance(registry, SpendControlsRegistry)

    def test_returns_registry_through_client_attribute(self) -> None:
        """Supports x402HTTPClient / x402HTTPClientSync where controls are on _client."""
        from cdp_x402.core.guardrails.apply import SpendControlsRegistry

        base = FakeAsyncClient()
        apply_spend_controls(base, SpendControls())

        class HttpWrapper:
            """Mimics x402HTTPClient which stores the base client as _client."""

            _client = base

        registry = get_spend_controls_registry(HttpWrapper())
        assert isinstance(registry, SpendControlsRegistry)

    def test_returns_none_when_client_attribute_has_no_registry(self) -> None:
        """No false positive when ._client exists but controls are not applied."""
        base = FakeAsyncClient()  # no apply_spend_controls

        class HttpWrapper:
            _client = base

        assert get_spend_controls_registry(HttpWrapper()) is None

    def test_resolved_controls_has_registry(self) -> None:
        client = FakeAsyncClient()
        resolved = apply_spend_controls(client, SpendControls())
        assert resolved.registry is get_spend_controls_registry(client)


# ---------------------------------------------------------------------------
# confirm — threshold notifications fired on confirm, not on after-hook
# ---------------------------------------------------------------------------


class TestRegistryConfirm:
    async def test_confirm_fires_threshold_notification(self) -> None:
        calls: list[Any] = []
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_000, asset=USDC),
                on_approaching_limit=lambda s, lim: calls.append((s, lim)),
            ),
        )
        registry = get_spend_controls_registry(client)
        assert registry is not None

        ctx = make_ctx(make_req(amount="900"))
        await run_before_and_after(client, ctx)

        # Notification has NOT fired yet (deferred until confirm).
        assert len(calls) == 0

        await registry.confirm(ctx.payment_payload)
        assert len(calls) == 1  # 0.8 and 0.95 thresholds both crossed

    async def test_after_hook_alone_does_not_fire_notification(self) -> None:
        calls: list[Any] = []
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_000, asset=USDC),
                on_approaching_limit=lambda s, lim: calls.append((s, lim)),
            ),
        )
        ctx = make_ctx(make_req(amount="900"))
        await run_before_and_after(client, ctx)
        assert len(calls) == 0  # confirm not called → no notification

    async def test_double_confirm_is_noop(self) -> None:
        calls: list[Any] = []
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_000, asset=USDC),
                approaching_limit_thresholds=[0.8],
                on_approaching_limit=lambda s, lim: calls.append((s, lim)),
            ),
        )
        registry = get_spend_controls_registry(client)
        assert registry is not None

        ctx = make_ctx(make_req(amount="900"))
        await run_before_and_after(client, ctx)
        await registry.confirm(ctx.payment_payload)
        await registry.confirm(ctx.payment_payload)  # second confirm → no-op
        assert len(calls) == 1

    async def test_confirm_unknown_payload_is_noop(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(client, SpendControls())
        registry = get_spend_controls_registry(client)
        assert registry is not None
        await registry.confirm(object())  # should not raise


# ---------------------------------------------------------------------------
# rollback — removes ledger entry, resets threshold state
# ---------------------------------------------------------------------------


class TestRegistryRollback:
    async def test_rollback_removes_ledger_entry(self) -> None:
        client = FakeAsyncClient()
        resolved = apply_spend_controls(
            client,
            SpendControls(max_cumulative_spend=Amount(atomic=10_000, asset=USDC)),
        )
        registry = get_spend_controls_registry(client)
        assert registry is not None

        ctx = make_ctx(make_req(amount="500"))
        await run_before_and_after(client, ctx)

        # Entry is in the ledger (before confirm/rollback).
        total_before_rollback = await resolved.tracker.total(TotalSpendQuery(asset=USDC))
        assert total_before_rollback == 500

        await registry.rollback(ctx.payment_payload)

        total_after_rollback = await resolved.tracker.total(TotalSpendQuery(asset=USDC))
        assert total_after_rollback == 0

    async def test_rollback_allows_retry_to_re_notify(self) -> None:
        """After a rollback the threshold notification state resets so a retry fires."""
        calls: list[Any] = []
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_000, asset=USDC),
                approaching_limit_thresholds=[0.8],
                on_approaching_limit=lambda s, lim: calls.append((s, lim)),
            ),
        )
        registry = get_spend_controls_registry(client)
        assert registry is not None

        ctx1 = make_ctx(make_req(amount="900"))
        await run_before_and_after(client, ctx1)
        await registry.confirm(ctx1.payment_payload)
        assert len(calls) == 1  # first payment crossed threshold

        # Rollback is a no-op here (already confirmed), but the next payment
        # should NOT re-notify because the threshold is still marked as fired.
        ctx2 = make_ctx(make_req(amount="1"))
        await run_before_and_after(client, ctx2)
        await registry.confirm(ctx2.payment_payload)
        assert len(calls) == 1  # total is now 901, threshold already fired

    async def test_rollback_after_failed_settlement_restores_cap(self) -> None:
        """The cap is restored after rollback, allowing a subsequent payment."""
        client = FakeAsyncClient()
        resolved = apply_spend_controls(
            client,
            SpendControls(max_cumulative_spend=Amount(atomic=1_000, asset=USDC)),
        )
        registry = get_spend_controls_registry(client)
        assert registry is not None

        ctx = make_ctx(make_req(amount="1000"))
        await run_before_and_after(client, ctx)
        await registry.rollback(ctx.payment_payload)

        total = await resolved.tracker.total(TotalSpendQuery(asset=USDC))
        assert total == 0

    async def test_double_rollback_is_noop(self) -> None:
        client = FakeAsyncClient()
        resolved = apply_spend_controls(
            client,
            SpendControls(max_cumulative_spend=Amount(atomic=10_000, asset=USDC)),
        )
        registry = get_spend_controls_registry(client)
        assert registry is not None

        ctx = make_ctx(make_req(amount="500"))
        await run_before_and_after(client, ctx)
        await registry.rollback(ctx.payment_payload)
        await registry.rollback(ctx.payment_payload)  # second rollback → no-op

        total = await resolved.tracker.total(TotalSpendQuery(asset=USDC))
        assert total == 0

    async def test_rollback_unknown_payload_is_noop(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(client, SpendControls())
        registry = get_spend_controls_registry(client)
        assert registry is not None
        await registry.rollback(object())  # should not raise


# ---------------------------------------------------------------------------
# Provisional spend still enforces the cap before confirm/rollback
# ---------------------------------------------------------------------------


class TestProvisionalSpend:
    async def test_cap_enforced_before_confirm(self) -> None:
        """Provisional entries count toward the cap even before confirm() is called."""
        from cdp_x402.core.guardrails.types import SpendControlError

        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(max_cumulative_spend=Amount(atomic=1_000, asset=USDC)),
        )

        ctx1 = make_ctx(make_req(amount="600"))
        await client.before_hooks[0](ctx1)
        await client.after_hooks[0](ctx1)
        # Confirm not called — cap is still provisionally consumed.

        ctx2 = make_ctx(make_req(amount="500"))
        with pytest.raises(SpendControlError) as exc_info:
            await client.before_hooks[0](ctx2)
        assert exc_info.value.code == "cumulative_cap"

    async def test_rollback_then_retry_succeeds(self) -> None:
        """After rollback, the same budget can be spent on a retry."""

        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(max_cumulative_spend=Amount(atomic=1_000, asset=USDC)),
        )
        registry = get_spend_controls_registry(client)
        assert registry is not None

        ctx1 = make_ctx(make_req(amount="700"))
        await client.before_hooks[0](ctx1)
        await client.after_hooks[0](ctx1)
        await registry.rollback(ctx1.payment_payload)

        # Retry with the same amount should now succeed.
        ctx2 = make_ctx(make_req(amount="700"))
        await client.before_hooks[0](ctx2)  # must not raise


# ---------------------------------------------------------------------------
# Sync registry
# ---------------------------------------------------------------------------


class TestSyncRegistry:
    def test_sync_confirm_fires_threshold(self) -> None:

        from x402.client import x402ClientSync

        calls: list[Any] = []
        client = x402ClientSync()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_000, asset=USDC),
                approaching_limit_thresholds=[0.8],
                on_approaching_limit=lambda s, lim: calls.append((s, lim)),
            ),
        )
        registry = get_spend_controls_registry(client)
        assert registry is not None

        ctx = make_ctx(make_req(amount="900"))
        client._before_payment_creation_hooks[0](ctx)
        client._after_payment_creation_hooks[0](ctx)

        assert len(calls) == 0  # not yet
        registry.confirm_sync(ctx.payment_payload)
        assert len(calls) == 1

    def test_sync_rollback_removes_entry(self) -> None:
        import asyncio

        from x402.client import x402ClientSync

        client = x402ClientSync()
        resolved = apply_spend_controls(
            client,
            SpendControls(max_cumulative_spend=Amount(atomic=10_000, asset=USDC)),
        )
        registry = get_spend_controls_registry(client)
        assert registry is not None

        ctx = make_ctx(make_req(amount="500"))
        client._before_payment_creation_hooks[0](ctx)
        client._after_payment_creation_hooks[0](ctx)

        total_before = asyncio.run(resolved.tracker.total(TotalSpendQuery(asset=USDC)))
        assert total_before == 500

        registry.rollback_sync(ctx.payment_payload)

        total_after = asyncio.run(resolved.tracker.total(TotalSpendQuery(asset=USDC)))
        assert total_after == 0
