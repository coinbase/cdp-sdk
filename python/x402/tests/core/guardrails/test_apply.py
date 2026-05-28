"""Unit tests for guardrails/apply.py.

Uses a lightweight fake x402Client/x402ClientSync that captures hook
registrations, mirroring the TypeScript test pattern.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import FrozenInstanceError, dataclass, field
from typing import Any
from unittest.mock import patch

import pytest

from cdp_x402.core.guardrails.apply import (
    apply_spend_controls,
    get_spend_controls_registry,
)
from cdp_x402.core.guardrails.spend_tracker import TotalSpendQuery
from cdp_x402.core.guardrails.types import Amount, SpendControlError, SpendControls

USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"


# ---------------------------------------------------------------------------
# Fake clients
# ---------------------------------------------------------------------------


class FakeAsyncClient:
    """Lightweight fake async x402Client for unit tests."""

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
    """Build a fake PaymentRequirements-like object."""
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


def make_ctx(req: Any, payment_required: Any | None = None) -> Any:
    if payment_required is None:
        payment_required = object()

    class FakeCtx:
        pass

    ctx = FakeCtx()
    ctx.selected_requirements = req
    ctx.payment_required = payment_required
    # Simulate the PaymentPayload object the after-hook reads via ctx.payment_payload.
    ctx.payment_payload = object()
    return ctx


async def run_full_cycle_async(client: FakeAsyncClient, req: Any) -> None:
    """Simulate a successful before → after hook → settlement confirm cycle."""
    ctx = make_ctx(req)
    await client.before_hooks[0](ctx)
    await client.after_hooks[0](ctx)
    registry = get_spend_controls_registry(client)
    if registry is not None:
        await registry.confirm(ctx.payment_payload)


# ---------------------------------------------------------------------------
# apply_spend_controls — basic registration
# ---------------------------------------------------------------------------


class TestApplySpendControlsRegistration:
    def test_registers_exactly_one_policy_and_hooks(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(max_amount_per_payment=Amount(atomic=100, asset=USDC)),
        )
        assert len(client.policies) == 1
        assert len(client.before_hooks) == 1
        assert len(client.after_hooks) == 1
        assert len(client.failure_hooks) == 1

    def test_returns_resolved_controls_with_window_ms(self) -> None:
        client = FakeAsyncClient()
        resolved = apply_spend_controls(
            client,
            SpendControls(max_cumulative_spend_window="1h"),
        )
        assert resolved.max_cumulative_spend_window_ms == 3_600_000

    def test_returns_immutable_resolved_controls_snapshot(self) -> None:
        client = FakeAsyncClient()
        resolved = apply_spend_controls(client, SpendControls())
        with pytest.raises(FrozenInstanceError):
            resolved.max_cumulative_spend_window_ms = 1

    def test_rejects_second_apply_on_same_client(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(client, SpendControls())
        with pytest.raises(SpendControlError) as exc_info:
            apply_spend_controls(client, SpendControls())
        assert exc_info.value.code == "already_applied"

    def test_allows_reapply_after_config_error(self) -> None:
        client = FakeAsyncClient()
        with pytest.raises(SpendControlError):
            apply_spend_controls(
                client,
                SpendControls(max_cumulative_spend=Amount(atomic=100)),  # missing asset
            )
        # Config error should NOT mark the client as applied
        apply_spend_controls(client, SpendControls())  # should not raise

    def test_rejects_cumulative_spend_without_asset(self) -> None:
        client = FakeAsyncClient()
        with pytest.raises(SpendControlError) as exc_info:
            apply_spend_controls(
                client,
                SpendControls(max_cumulative_spend=Amount(atomic=100)),
            )
        assert exc_info.value.code == "amount_unparseable"

    def test_normalizes_evm_payees_in_resolved_view(self) -> None:
        client = FakeAsyncClient()
        resolved = apply_spend_controls(
            client,
            SpendControls(allowed_payees=["  0xABCDEF1234567890ABCDEF1234567890ABCDEF12  "]),
        )
        assert "0xabcdef1234567890abcdef1234567890abcdef12" in resolved.allowed_payees


# ---------------------------------------------------------------------------
# Policy (allow-lists)
# ---------------------------------------------------------------------------


class TestPolicy:
    def test_filters_by_network_caip(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(client, SpendControls(allowed_networks=["eip155:84532"]))
        r1 = make_req(network="eip155:8453")
        r2 = make_req(network="eip155:84532")
        result = client.policies[0](2, [r1, r2])
        assert result == [r2]

    def test_legacy_v1_short_forms_normalized_in_allow_list(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(client, SpendControls(allowed_networks=["base-sepolia"]))
        r = make_req(network="eip155:84532")
        result = client.policies[0](2, [r])
        assert result == [r]

    def test_filters_evm_payee_case_insensitively(self) -> None:
        client = FakeAsyncClient()
        allowed = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
        apply_spend_controls(client, SpendControls(allowed_payees=[allowed]))
        accept = make_req(pay_to=allowed.lower())
        reject = make_req(pay_to="0x9999999999999999999999999999999999999999")
        result = client.policies[0](2, [accept, reject])
        assert result == [accept]

    def test_filters_svm_payee_case_sensitively(self) -> None:
        client = FakeAsyncClient()
        svm_addr = "7nYT1Dv9QfMsQHcZJbNyA9JkHqoVrpLmkCFfBjDqkbu"
        apply_spend_controls(client, SpendControls(allowed_payees=[svm_addr]))
        ok = make_req(network="solana:mainnet", pay_to=svm_addr)
        wrong_case = make_req(network="solana:mainnet", pay_to=svm_addr.lower())
        result = client.policies[0](2, [ok, wrong_case])
        assert result == [ok]

    def test_empty_allow_list_means_allow_all(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(client, SpendControls())
        r1 = make_req()
        r2 = make_req(network="eip155:8453")
        result = client.policies[0](2, [r1, r2])
        assert result == [r1, r2]

    def test_all_filtered_raises_network_not_allowed(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(client, SpendControls(allowed_networks=["eip155:1"]))
        with pytest.raises(SpendControlError) as exc_info:
            client.policies[0](2, [make_req()])  # only eip155:84532
        assert exc_info.value.code == "network_not_allowed"

    def test_all_filtered_raises_asset_not_allowed(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(client, SpendControls(allowed_assets=["0xdeadbeef" + "0" * 32]))
        with pytest.raises(SpendControlError) as exc_info:
            client.policies[0](2, [make_req()])
        assert exc_info.value.code == "asset_not_allowed"

    def test_all_filtered_raises_payee_not_allowed(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(allowed_payees=["0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"]),
        )
        with pytest.raises(SpendControlError) as exc_info:
            client.policies[0](2, [make_req()])
        assert exc_info.value.code == "payee_not_allowed"

    def test_throws_payee_not_allowed_when_off_network_option_masks_on_network_payee_block(
        self,
    ) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                allowed_networks=["eip155:84532"],
                allowed_payees=["0xAAA0000000000000000000000000000000000000"],
            ),
        )
        off_network = make_req(network="solana:mainnet", pay_to="doesNotMatter")
        on_network_bad_payee = make_req(
            network="eip155:84532",
            pay_to="0xBBB0000000000000000000000000000000000000",
        )
        with pytest.raises(SpendControlError) as exc_info:
            client.policies[0](2, [off_network, on_network_bad_payee])
        assert exc_info.value.code == "payee_not_allowed"

    def test_throws_asset_not_allowed_when_off_network_option_masks_on_network_asset_block(
        self,
    ) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                allowed_networks=["eip155:84532"],
                allowed_assets=[USDC],
            ),
        )
        off_network = make_req(network="solana:mainnet", asset="SOL")
        on_network_bad_asset = make_req(network="eip155:84532", asset="0xdeadbeef")
        with pytest.raises(SpendControlError) as exc_info:
            client.policies[0](2, [off_network, on_network_bad_asset])
        assert exc_info.value.code == "asset_not_allowed"

    def test_prefers_asset_not_allowed_over_payee_not_allowed(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                allowed_networks=["eip155:84532"],
                allowed_assets=[USDC],
                allowed_payees=["0xAAA0000000000000000000000000000000000000"],
            ),
        )
        bad_asset = make_req(network="eip155:84532", asset="0xdeadbeef")
        bad_payee = make_req(
            network="eip155:84532",
            pay_to="0xBBB0000000000000000000000000000000000000",
        )
        with pytest.raises(SpendControlError) as exc_info:
            client.policies[0](2, [bad_asset, bad_payee])
        assert exc_info.value.code == "asset_not_allowed"

    def test_still_throws_network_not_allowed_when_every_option_fails_network_check(
        self,
    ) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                allowed_networks=["eip155:84532"],
                allowed_payees=["0xAAA0000000000000000000000000000000000000"],
            ),
        )
        with pytest.raises(SpendControlError) as exc_info:
            client.policies[0](
                2,
                [make_req(network="eip155:8453"), make_req(network="solana:mainnet")],
            )
        assert exc_info.value.code == "network_not_allowed"


# ---------------------------------------------------------------------------
# Before hook (per-payment cap)
# ---------------------------------------------------------------------------


class TestBeforeHookPerPaymentCap:
    async def test_throws_per_payment_cap_when_exceeded(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(max_amount_per_payment=Amount(atomic=999)),
        )
        ctx = make_ctx(make_req(amount="1000"))
        with pytest.raises(SpendControlError) as exc_info:
            await client.before_hooks[0](ctx)
        assert exc_info.value.code == "per_payment_cap"
        assert exc_info.value.details["attempted"] == "1000"
        assert exc_info.value.details["limit"] == "999"

    async def test_no_throw_when_cap_is_for_different_asset(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(max_amount_per_payment=Amount(atomic=1, asset="0xdeadbeef")),
        )
        ctx = make_ctx(make_req(amount="5000000"))
        result = await client.before_hooks[0](ctx)
        assert result is None

    async def test_rejects_negative_amount_as_unparseable(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(max_amount_per_payment=Amount(atomic=1_000)),
        )
        ctx = make_ctx(make_req(amount="-1"))
        with pytest.raises(SpendControlError) as exc_info:
            await client.before_hooks[0](ctx)
        assert exc_info.value.code == "amount_unparseable"

    async def test_rejects_underscored_amount_as_unparseable(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(max_amount_per_payment=Amount(atomic=1_000)),
        )
        ctx = make_ctx(make_req(amount="1_000"))
        with pytest.raises(SpendControlError) as exc_info:
            await client.before_hooks[0](ctx)
        assert exc_info.value.code == "amount_unparseable"

    async def test_reads_max_amount_required_for_v1_requirements(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(max_amount_per_payment=Amount(atomic=500)),
        )
        req = make_req()
        del req.amount
        req.max_amount_required = "1000"
        ctx = make_ctx(req)
        with pytest.raises(SpendControlError) as exc_info:
            await client.before_hooks[0](ctx)
        assert exc_info.value.code == "per_payment_cap"
        assert exc_info.value.details["attempted"] == "1000"
        assert exc_info.value.details["limit"] == "500"


# ---------------------------------------------------------------------------
# Before hook (cumulative cap)
# ---------------------------------------------------------------------------


class TestBeforeHookCumulativeCap:
    async def test_throws_cumulative_cap_when_total_would_exceed(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_500, asset=USDC),
                max_cumulative_spend_window="1h",
            ),
        )
        req = make_req(amount="1000")
        ctx = make_ctx(req)
        await client.before_hooks[0](ctx)
        # After hook to clear state
        await client.after_hooks[0](ctx)

        ctx2 = make_ctx(req)
        with pytest.raises(SpendControlError) as exc_info:
            await client.before_hooks[0](ctx2)
        assert exc_info.value.code == "cumulative_cap"

    async def test_does_not_count_payments_outside_rolling_window(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_500, asset=USDC),
                max_cumulative_spend_window="1h",
            ),
        )
        req = make_req(amount="1000")
        ctx = make_ctx(req)

        past = int(time.time() * 1000) - 2 * 3_600_000  # 2 hours ago
        with patch("time.time", return_value=past / 1000):
            await client.before_hooks[0](ctx)
            await client.after_hooks[0](ctx)

        # After window elapsed, a new payment should succeed
        ctx2 = make_ctx(req)
        result = await client.before_hooks[0](ctx2)
        assert result is None

    async def test_zero_duration_window_counts_only_same_ms(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_500, asset=USDC),
                max_cumulative_spend_window=0,
            ),
        )
        req = make_req(amount="1000")
        ctx1 = make_ctx(req)
        ctx2 = make_ctx(req)

        t1 = 1_000  # ms
        t2 = 2_000  # ms — distinct tick, so first payment is outside window

        with patch("time.time", return_value=t1 / 1000):
            await client.before_hooks[0](ctx1)
            await client.after_hooks[0](ctx1)

        with patch("time.time", return_value=t2 / 1000):
            result = await client.before_hooks[0](ctx2)
        assert result is None  # first payment is outside the 0ms window

    async def test_rolls_back_record_on_failure_hook(self) -> None:
        client = FakeAsyncClient()
        resolved = apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_500, asset=USDC),
                max_cumulative_spend_window="1h",
            ),
        )
        req = make_req(amount="1000")
        ctx = make_ctx(req)
        await client.before_hooks[0](ctx)
        assert await resolved.tracker.total(TotalSpendQuery(asset=USDC)) == 1000

        # Simulate payment failure
        await client.failure_hooks[0](ctx)
        assert await resolved.tracker.total(TotalSpendQuery(asset=USDC)) == 0

    async def test_tracks_state_per_operation_when_payment_required_is_reused(self) -> None:
        client = FakeAsyncClient()
        resolved = apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=10_000, asset=USDC),
                max_cumulative_spend_window="1h",
            ),
        )

        shared_payment_required = object()
        ctx_fail = make_ctx(
            make_req(
                amount="700",
                pay_to="0x2222222222222222222222222222222222222222",
            ),
            payment_required=shared_payment_required,
        )
        ctx_ok = make_ctx(
            make_req(
                amount="300",
                pay_to="0x3333333333333333333333333333333333333333",
            ),
            payment_required=shared_payment_required,
        )

        before_fail_done = asyncio.Event()
        before_ok_done = asyncio.Event()
        allow_ok_after = asyncio.Event()
        ok_after_done = asyncio.Event()

        async def fail_flow() -> None:
            await client.before_hooks[0](ctx_fail)
            before_fail_done.set()
            await ok_after_done.wait()
            await client.failure_hooks[0](ctx_fail)

        async def ok_flow() -> None:
            await before_fail_done.wait()
            await client.before_hooks[0](ctx_ok)
            before_ok_done.set()
            await allow_ok_after.wait()
            await client.after_hooks[0](ctx_ok)
            ok_after_done.set()

        fail_task = asyncio.create_task(fail_flow())
        ok_task = asyncio.create_task(ok_flow())
        await before_ok_done.wait()
        allow_ok_after.set()
        await asyncio.gather(fail_task, ok_task)

        # Only the successful operation should remain in the ledger.
        assert await resolved.tracker.total(TotalSpendQuery(asset=USDC)) == 300

    async def test_tracks_state_when_same_requirement_object_is_reused(self) -> None:
        client = FakeAsyncClient()
        resolved = apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=10_000, asset=USDC),
                max_cumulative_spend_window="1h",
            ),
        )

        shared_payment_required = object()
        shared_req = make_req(
            amount="700",
            pay_to="0x2222222222222222222222222222222222222222",
        )
        ctx_fail = make_ctx(shared_req, payment_required=shared_payment_required)
        ctx_ok = make_ctx(shared_req, payment_required=shared_payment_required)

        before_fail_done = asyncio.Event()
        before_ok_done = asyncio.Event()
        allow_ok_after = asyncio.Event()
        ok_after_done = asyncio.Event()

        async def fail_flow() -> None:
            await client.before_hooks[0](ctx_fail)
            before_fail_done.set()
            await ok_after_done.wait()
            await client.failure_hooks[0](ctx_fail)

        async def ok_flow() -> None:
            await before_fail_done.wait()
            # Keep object identity but change values for the second operation.
            shared_req.amount = "300"
            shared_req.pay_to = "0x3333333333333333333333333333333333333333"
            await client.before_hooks[0](ctx_ok)
            before_ok_done.set()
            await allow_ok_after.wait()
            await client.after_hooks[0](ctx_ok)
            ok_after_done.set()

        fail_task = asyncio.create_task(fail_flow())
        ok_task = asyncio.create_task(ok_flow())
        await before_ok_done.wait()
        allow_ok_after.set()
        await asyncio.gather(fail_task, ok_task)

        # The failed 700 spend must be rolled back while the successful 300 remains.
        assert await resolved.tracker.total(TotalSpendQuery(asset=USDC)) == 300

    async def test_before_hook_does_not_mutate_selected_requirements(self) -> None:
        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_500, asset=USDC),
                max_cumulative_spend_window="1h",
            ),
        )
        req = make_req(amount="1000")
        ctx = make_ctx(req)
        await client.before_hooks[0](ctx)
        assert not hasattr(req, "_cdp_x402_recorded_entry")
        assert not hasattr(req, "_cdp_x402_total_before")

    async def test_serializes_concurrent_before_hooks(self) -> None:
        client = FakeAsyncClient()
        resolved = apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_500, asset=USDC),
                max_cumulative_spend_window="1h",
            ),
        )
        # Use separate req objects so state stored on selected_requirements doesn't collide.
        ctx_a = make_ctx(make_req(amount="1000"))
        ctx_b = make_ctx(make_req(amount="1000"))

        results = await asyncio.gather(
            client.before_hooks[0](ctx_a),
            client.before_hooks[0](ctx_b),
            return_exceptions=True,
        )
        errors = [r for r in results if isinstance(r, SpendControlError)]
        successes = [r for r in results if r is None]
        assert len(errors) == 1
        assert errors[0].code == "cumulative_cap"
        assert len(successes) == 1
        assert await resolved.tracker.total(TotalSpendQuery(asset=USDC)) == 1000

    async def test_tracks_state_per_context_with_nested_same_task_flow(self) -> None:
        client = FakeAsyncClient()
        resolved = apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=10_000, asset=USDC),
                max_cumulative_spend_window="1h",
            ),
        )
        ctx_outer = make_ctx(make_req(amount="700"))
        ctx_inner = make_ctx(make_req(amount="300"))

        await client.before_hooks[0](ctx_outer)
        await client.before_hooks[0](ctx_inner)
        assert await resolved.tracker.total(TotalSpendQuery(asset=USDC)) == 1000

        # Failing the outer payment should roll back only its own provisional record.
        await client.failure_hooks[0](ctx_outer)
        await client.after_hooks[0](ctx_inner)
        assert await resolved.tracker.total(TotalSpendQuery(asset=USDC)) == 300


# ---------------------------------------------------------------------------
# onApproachingLimit
# ---------------------------------------------------------------------------


class TestOnApproachingLimit:
    async def test_fires_once_per_crossed_threshold(self) -> None:
        calls: list[tuple[Amount, Amount]] = []

        def notify(spent: Amount, limit: Amount) -> None:
            calls.append((spent, limit))

        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_000, asset=USDC),
                max_cumulative_spend_window="1h",
                on_approaching_limit=notify,
            ),
        )

        # 40% — no notify
        await run_full_cycle_async(client, make_req(amount="400"))
        assert len(calls) == 0

        # 80% — notify for 0.8 threshold
        await run_full_cycle_async(client, make_req(amount="400"))
        assert len(calls) == 1

        # 95% — notify for 0.95 threshold
        await run_full_cycle_async(client, make_req(amount="150"))
        assert len(calls) == 2

    async def test_respects_custom_thresholds(self) -> None:
        calls: list[Any] = []

        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=100, asset=USDC),
                max_cumulative_spend_window="1h",
                approaching_limit_thresholds=[0.5],
                on_approaching_limit=lambda s, lim: calls.append((s, lim)),
            ),
        )

        await run_full_cycle_async(client, make_req(amount="50"))
        assert len(calls) == 1

    async def test_re_fires_after_rolling_window_elapses(self) -> None:
        calls: list[Any] = []

        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_000, asset=USDC),
                max_cumulative_spend_window="1h",
                on_approaching_limit=lambda s, lim: calls.append((s, lim)),
            ),
        )

        now_ms = int(time.time() * 1000)
        with patch("time.time", return_value=now_ms / 1000):
            await run_full_cycle_async(client, make_req(amount="950"))
        assert len(calls) == 2  # 0.8 and 0.95

        # Advance past window
        future_ms = now_ms + 2 * 3_600_000
        with patch("time.time", return_value=future_ms / 1000):
            await run_full_cycle_async(client, make_req(amount="950"))
        assert len(calls) == 4  # re-fires both thresholds

    async def test_throwing_notifier_does_not_fail_after_hook(self) -> None:
        def bad_notify(s: Amount, lim: Amount) -> None:
            raise RuntimeError("notifier boom")

        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=100, asset=USDC),
                max_cumulative_spend_window="1h",
                on_approaching_limit=bad_notify,
            ),
        )
        # Should not raise even though notifier throws.
        await run_full_cycle_async(client, make_req(amount="90"))

    async def test_fires_exactly_once_when_two_parallel_payments_cross_threshold(
        self,
    ) -> None:
        calls: list[Any] = []

        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_000, asset=USDC),
                max_cumulative_spend_window="1h",
                approaching_limit_thresholds=[0.8],
                on_approaching_limit=lambda s, lim: calls.append((s, lim)),
            ),
        )
        # Use separate req objects (different instances) as in the TS test.
        ctx_a = make_ctx(make_req(amount="400"))
        ctx_b = make_ctx(make_req(amount="400"))

        a_before_done = asyncio.Event()
        b_before_done = asyncio.Event()
        release_after = asyncio.Event()
        registry = get_spend_controls_registry(client)

        async def flow(ctx: Any, done_evt: asyncio.Event) -> None:
            await client.before_hooks[0](ctx)
            done_evt.set()
            await release_after.wait()
            await client.after_hooks[0](ctx)
            if registry is not None:
                await registry.confirm(ctx.payment_payload)

        task_a = asyncio.create_task(flow(ctx_a, a_before_done))
        task_b = asyncio.create_task(flow(ctx_b, b_before_done))
        await asyncio.gather(a_before_done.wait(), b_before_done.wait())
        release_after.set()
        await asyncio.gather(task_a, task_b)

        # The 0.8 threshold (800) was crossed only once — the second confirm
        # must not re-fire because the total_before snapshot from the before-hook
        # is used for edge-triggered detection.
        assert len(calls) == 1

    async def test_does_not_re_notify_if_confirm_called_twice(self) -> None:
        calls: list[Any] = []

        client = FakeAsyncClient()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=100, asset=USDC),
                max_cumulative_spend_window="1h",
                approaching_limit_thresholds=[0.8],
                on_approaching_limit=lambda s, lim: calls.append((s, lim)),
            ),
        )
        registry = get_spend_controls_registry(client)
        assert registry is not None
        ctx = make_ctx(make_req(amount="90"))
        await client.before_hooks[0](ctx)
        await client.after_hooks[0](ctx)
        await registry.confirm(ctx.payment_payload)
        await registry.confirm(ctx.payment_payload)  # second confirm — no-op
        assert len(calls) == 1

    async def test_no_false_positive_warning_when_concurrent_provisional_payment_rolls_back(
        self,
    ) -> None:
        """Provisional tracking regression: payment A (100) and B (80) are created
        concurrently against a limit of 200 with an 80% threshold (160). A rolls back,
        B confirms. Confirmed total is 80, which is below 160 — no warning should fire.
        Without the provisional counter, A's amount would inflate B's effective
        totalBefore and cause a false threshold crossing."""
        calls: list[Any] = []
        client = FakeAsyncClient()
        resolved = apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=200, asset=USDC),
                max_cumulative_spend_window="1h",
                approaching_limit_thresholds=[0.8],  # fires at 160
                on_approaching_limit=lambda s, lim: calls.append((s, lim)),
            ),
        )
        registry = get_spend_controls_registry(client)
        assert registry is not None

        ctx_a = make_ctx(make_req(amount="100"))
        ctx_b = make_ctx(make_req(amount="80"))

        # Synchronize so both before-hooks complete before either after-hook runs.
        a_before_done = asyncio.Event()
        b_before_done = asyncio.Event()
        release_after = asyncio.Event()

        async def flow_rollback(ctx: Any, done_evt: asyncio.Event) -> None:
            await client.before_hooks[0](ctx)
            done_evt.set()
            await release_after.wait()
            await client.after_hooks[0](ctx)
            await registry.rollback(ctx.payment_payload)  # type: ignore[union-attr]

        async def flow_confirm(ctx: Any, done_evt: asyncio.Event) -> None:
            await client.before_hooks[0](ctx)
            done_evt.set()
            await release_after.wait()
            await client.after_hooks[0](ctx)
            await registry.confirm(ctx.payment_payload)  # type: ignore[union-attr]

        task_a = asyncio.create_task(flow_rollback(ctx_a, a_before_done))
        task_b = asyncio.create_task(flow_confirm(ctx_b, b_before_done))
        await asyncio.gather(a_before_done.wait(), b_before_done.wait())
        release_after.set()
        await asyncio.gather(task_a, task_b)

        # Confirmed total is 80 (only B). Threshold is 160. No warning should fire.
        assert len(calls) == 0
        total = await resolved.tracker.total(TotalSpendQuery(asset=USDC))
        assert total == 80

    async def test_warning_fires_correctly_when_both_concurrent_payments_confirm(self) -> None:
        """Both A (100) and B (80) confirm against a limit of 200, threshold 80% (160).
        A confirms first → confirmedAfter=100 < 160 (no warning).
        B confirms second → confirmedAfter=180 >= 160 (warning fires exactly once)."""
        calls: list[Any] = []
        client = FakeAsyncClient()
        resolved = apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=200, asset=USDC),
                max_cumulative_spend_window="1h",
                approaching_limit_thresholds=[0.8],
                on_approaching_limit=lambda s, lim: calls.append((s, lim)),
            ),
        )
        registry = get_spend_controls_registry(client)
        assert registry is not None

        ctx_a = make_ctx(make_req(amount="100"))
        ctx_b = make_ctx(make_req(amount="80"))

        a_before_done = asyncio.Event()
        b_before_done = asyncio.Event()
        release_after = asyncio.Event()

        async def flow(ctx: Any, done_evt: asyncio.Event) -> None:
            await client.before_hooks[0](ctx)
            done_evt.set()
            await release_after.wait()
            await client.after_hooks[0](ctx)
            await registry.confirm(ctx.payment_payload)  # type: ignore[union-attr]

        task_a = asyncio.create_task(flow(ctx_a, a_before_done))
        task_b = asyncio.create_task(flow(ctx_b, b_before_done))
        await asyncio.gather(a_before_done.wait(), b_before_done.wait())
        release_after.set()
        await asyncio.gather(task_a, task_b)

        # A and B both confirmed. Total = 180. Warning fires exactly once at 180 >= 160.
        assert len(calls) == 1
        total = await resolved.tracker.total(TotalSpendQuery(asset=USDC))
        assert total == 180


# ---------------------------------------------------------------------------
# Sync client
# ---------------------------------------------------------------------------


class TestSyncClient:
    def test_sync_client_detected_and_uses_sync_hooks(self) -> None:
        from x402.client import x402ClientSync

        client = x402ClientSync()
        resolved = apply_spend_controls(
            client,
            SpendControls(max_amount_per_payment=Amount(atomic=100, asset=USDC)),
        )
        assert resolved.max_amount_per_payment is not None
        assert resolved.max_amount_per_payment.atomic == 100

    def test_sync_per_payment_cap_raises(self) -> None:
        from x402.client import x402ClientSync

        client = x402ClientSync()
        apply_spend_controls(
            client,
            SpendControls(max_amount_per_payment=Amount(atomic=999)),
        )
        ctx = make_ctx(make_req(amount="1000"))
        # Invoke hook directly — sync client's on_before_payment_creation stores sync hooks
        with pytest.raises(SpendControlError) as exc_info:
            client._before_payment_creation_hooks[0](ctx)
        assert exc_info.value.code == "per_payment_cap"

    def test_sync_rejects_second_apply(self) -> None:
        from x402.client import x402ClientSync

        client = x402ClientSync()
        apply_spend_controls(client, SpendControls())
        with pytest.raises(SpendControlError) as exc_info:
            apply_spend_controls(client, SpendControls())
        assert exc_info.value.code == "already_applied"

    def test_sync_confirm_logs_threshold_errors_but_does_not_raise(self, caplog: Any) -> None:
        """Threshold notification errors in confirm() are best-effort — logged, not raised."""
        import logging

        from x402.client import x402ClientSync

        client = x402ClientSync()
        resolved = apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_000, asset=USDC),
                max_cumulative_spend_window="1h",
                approaching_limit_thresholds=[0.5],
                on_approaching_limit=lambda _spent, _limit: None,
            ),
        )
        assert resolved.registry is not None
        ctx = make_ctx(make_req(amount="600"))
        client._before_payment_creation_hooks[0](ctx)
        client._after_payment_creation_hooks[0](ctx)  # stores pending

        async def _boom(_query: Any) -> int:
            raise RuntimeError("tracker total boom")

        resolved.tracker.total = _boom  # type: ignore[method-assign]

        with caplog.at_level(logging.WARNING, logger="cdp_x402.core.guardrails.apply"):
            resolved.registry.confirm_sync(ctx.payment_payload)  # must not raise

        assert any("tracker total boom" in r.message for r in caplog.records)

    def test_sync_shared_unhashable_store_does_not_crash(self) -> None:
        from x402.client import x402ClientSync

        @dataclass
        class UnhashableStore:
            entries: list[Any] = field(default_factory=list)

            async def size(self) -> int:
                return len(self.entries)

            async def load(self) -> list[Any]:
                return list(self.entries)

            async def append(self, entry: Any) -> None:
                self.entries.append(entry)

            async def prune(self, older_than_ms: int) -> None:
                del older_than_ms

        store = UnhashableStore()
        controls = SpendControls(
            max_cumulative_spend=Amount(atomic=1_500, asset=USDC),
            max_cumulative_spend_window="1h",
            store=store,  # type: ignore[arg-type]
        )

        client = x402ClientSync()
        apply_spend_controls(client, controls)

        ctx = make_ctx(make_req(amount="1000"))
        # Should not raise TypeError from weak-key lock bookkeeping.
        client._before_payment_creation_hooks[0](ctx)

    def test_sync_tracks_state_per_context_with_nested_same_thread_flow(self) -> None:
        from x402.client import x402ClientSync

        client = x402ClientSync()
        resolved = apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=10_000, asset=USDC),
                max_cumulative_spend_window="1h",
            ),
        )
        ctx_outer = make_ctx(make_req(amount="700"))
        ctx_inner = make_ctx(make_req(amount="300"))

        client._before_payment_creation_hooks[0](ctx_outer)
        client._before_payment_creation_hooks[0](ctx_inner)
        assert asyncio.run(resolved.tracker.total(TotalSpendQuery(asset=USDC))) == 1000

        client._on_payment_creation_failure_hooks[0](ctx_outer)
        client._after_payment_creation_hooks[0](ctx_inner)
        assert asyncio.run(resolved.tracker.total(TotalSpendQuery(asset=USDC))) == 300

    def test_sync_does_not_count_payments_outside_rolling_window(self) -> None:
        """Sync before hook must prune old entries before checking totals."""
        from unittest.mock import patch

        from x402.client import x402ClientSync

        client = x402ClientSync()
        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=1_500, asset=USDC),
                max_cumulative_spend_window="1h",
            ),
        )

        past = int(time.time() * 1000) - 2 * 3_600_000  # 2 hours ago
        ctx_old = make_ctx(make_req(amount="1000"))
        with patch("time.time", return_value=past / 1000):
            client._before_payment_creation_hooks[0](ctx_old)
            client._after_payment_creation_hooks[0](ctx_old)

        # Old entry is outside the 1h window; a new payment should succeed.
        ctx_new = make_ctx(make_req(amount="1000"))
        client._before_payment_creation_hooks[0](ctx_new)  # must not raise


# ---------------------------------------------------------------------------
# _STORE_*_LOCKS_BY_ID weakref cleanup
# ---------------------------------------------------------------------------


class TestStoreByIdWeakrefCleanup:
    def test_async_by_id_entry_removed_after_store_gc(self) -> None:
        import gc
        from dataclasses import dataclass as _dc

        from cdp_x402.core.guardrails.apply import (
            _STORE_ASYNC_LOCKS_BY_ID,
            _get_async_store_lock_map,
        )

        @_dc
        class UnhashableStore:
            tag: int = 0

        store = UnhashableStore()
        key = id(store)
        _get_async_store_lock_map(store)
        assert key in _STORE_ASYNC_LOCKS_BY_ID

        del store
        gc.collect()
        assert key not in _STORE_ASYNC_LOCKS_BY_ID

    def test_sync_by_id_entry_removed_after_store_gc(self) -> None:
        import gc
        from dataclasses import dataclass as _dc

        from cdp_x402.core.guardrails.apply import (
            _STORE_SYNC_LOCKS_BY_ID,
            _get_sync_store_lock_map,
        )

        @_dc
        class UnhashableStore:
            tag: int = 0

        store = UnhashableStore()
        key = id(store)
        _get_sync_store_lock_map(store)
        assert key in _STORE_SYNC_LOCKS_BY_ID

        del store
        gc.collect()
        assert key not in _STORE_SYNC_LOCKS_BY_ID
