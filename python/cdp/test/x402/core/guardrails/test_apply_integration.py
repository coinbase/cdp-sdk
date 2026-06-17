"""Integration tests for apply_spend_controls against a real upstream x402Client.

The scheme client is mocked so we can spy on create_payment_payload and confirm
the policy filters payments before they reach the scheme.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any

import pytest

from cdp.x402.core.guardrails.apply import apply_spend_controls
from cdp.x402.core.guardrails.spend_tracker import TotalSpendQuery
from cdp.x402.core.guardrails.types import (
    Amount,
    SpendControlError,
    SpendControls,
    SpendLedgerEntry,
    SpendStore,
)

NETWORK = "eip155:84532"
ASSET = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"


def fake_scheme_client(call_count_ref: list[int] | None = None) -> Any:
    class FakeScheme:
        scheme = "exact"

        def create_payment_payload(self, requirements: Any) -> dict[str, Any]:
            if call_count_ref is not None:
                call_count_ref.append(1)
            return {"stub": True}

    return FakeScheme()


def payment_required(overrides: list[dict[str, Any]] | None = None) -> Any:
    from x402.schemas.payments import PaymentRequired, PaymentRequirements

    reqs = []
    for o in overrides or [{}]:
        base = dict(
            scheme="exact",
            network=NETWORK,
            asset=ASSET,
            amount="100000",
            pay_to="0x1111111111111111111111111111111111111111",
            max_timeout_seconds=60,
            extra={},
        )
        base.update(o)
        reqs.append(PaymentRequirements(**base))

    return PaymentRequired(
        x402_version=2,
        error=None,
        resource=None,
        accepts=reqs,
    )


class TestApplyIntegration:
    async def test_rejects_per_payment_cap_before_scheme_invoked(self) -> None:
        from x402.client import x402Client

        calls: list[int] = []
        client = x402Client()
        scheme = fake_scheme_client(calls)
        client.register(NETWORK, scheme)

        apply_spend_controls(
            client,
            SpendControls(max_amount_per_payment=Amount(atomic=50_000, asset=ASSET)),
        )

        with pytest.raises(SpendControlError) as exc_info:
            await client.create_payment_payload(payment_required())
        assert exc_info.value.code == "per_payment_cap"
        assert len(calls) == 0

    async def test_accumulates_and_rejects_on_cumulative_cap(self) -> None:
        from x402.client import x402Client

        calls: list[int] = []
        client = x402Client()
        scheme = fake_scheme_client(calls)
        client.register(NETWORK, scheme)

        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=250_000, asset=ASSET),
                max_cumulative_spend_window="1h",
            ),
        )

        await client.create_payment_payload(payment_required())
        await client.create_payment_payload(payment_required())
        with pytest.raises(SpendControlError) as exc_info:
            await client.create_payment_payload(payment_required())
        assert exc_info.value.code == "cumulative_cap"
        assert len(calls) == 2  # Two succeeded, one rejected.

    async def test_counts_evm_assets_case_insensitively(self) -> None:
        from x402.client import x402Client

        calls: list[int] = []
        client = x402Client()
        scheme = fake_scheme_client(calls)
        client.register(NETWORK, scheme)

        apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=150_000, asset=ASSET),
                max_cumulative_spend_window="1h",
            ),
        )

        mixed_case_asset = "0x" + ASSET[2:].upper()
        await client.create_payment_payload(payment_required([{"asset": mixed_case_asset}]))
        with pytest.raises(SpendControlError) as exc_info:
            await client.create_payment_payload(payment_required())
        assert exc_info.value.code == "cumulative_cap"
        assert len(calls) == 1

    async def test_filters_disallowed_payees_via_policy(self) -> None:
        from x402.client import x402Client

        calls: list[int] = []
        client = x402Client()
        scheme = fake_scheme_client(calls)
        client.register(NETWORK, scheme)

        allowed_payee = "0xAAA0000000000000000000000000000000000000"
        blocked_payee = "0xBBB0000000000000000000000000000000000000"

        apply_spend_controls(client, SpendControls(allowed_payees=[allowed_payee]))

        payload = await client.create_payment_payload(
            payment_required([{"pay_to": blocked_payee}, {"pay_to": allowed_payee.lower()}])
        )
        assert payload.accepted.pay_to == allowed_payee.lower()
        assert len(calls) == 1

    async def test_throws_payee_not_allowed_when_all_filtered(self) -> None:
        from x402.client import x402Client

        client = x402Client()
        client.register(NETWORK, fake_scheme_client())

        apply_spend_controls(
            client,
            SpendControls(allowed_payees=["0xAAA0000000000000000000000000000000000000"]),
        )

        with pytest.raises(SpendControlError) as exc_info:
            await client.create_payment_payload(
                payment_required([{"pay_to": "0xBBB0000000000000000000000000000000000000"}])
            )
        assert exc_info.value.code == "payee_not_allowed"

    async def test_filters_by_allowed_networks(self) -> None:
        from x402.client import x402Client

        calls84532: list[int] = []
        calls8453: list[int] = []
        client = x402Client()
        client.register("eip155:84532", fake_scheme_client(calls84532))
        client.register("eip155:8453", fake_scheme_client(calls8453))

        apply_spend_controls(client, SpendControls(allowed_networks=["eip155:84532"]))

        await client.create_payment_payload(
            payment_required([{"network": "eip155:8453"}, {"network": "eip155:84532"}])
        )
        assert len(calls84532) == 1
        assert len(calls8453) == 0

    async def test_noop_when_controls_is_empty(self) -> None:
        from x402.client import x402Client

        calls: list[int] = []
        client = x402Client()
        client.register(NETWORK, fake_scheme_client(calls))

        apply_spend_controls(client, SpendControls())

        payload = await client.create_payment_payload(payment_required())
        assert payload is not None
        assert len(calls) == 1

    async def test_propagates_spend_control_error_from_before_hook(self) -> None:
        from x402.client import x402Client

        client = x402Client()
        client.register(NETWORK, fake_scheme_client())

        apply_spend_controls(
            client,
            SpendControls(max_amount_per_payment=Amount(atomic=1, asset=ASSET)),
        )

        with pytest.raises(SpendControlError) as exc_info:
            await client.create_payment_payload(payment_required())
        assert exc_info.value.code == "per_payment_cap"
        assert exc_info.value.details["attempted"] == "100000"
        assert exc_info.value.details["limit"] == "1"

    async def test_rolls_back_record_when_scheme_fails(self) -> None:
        from x402.client import x402Client

        call_count = 0

        class FailingScheme:
            scheme = "exact"

            def create_payment_payload(self, requirements: Any) -> dict[str, Any]:
                nonlocal call_count
                call_count += 1
                if call_count == 3:
                    raise RuntimeError("scheme blew up")
                return {"stub": True}

        client = x402Client()
        client.register(NETWORK, FailingScheme())

        resolved = apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=500_000, asset=ASSET),
                max_cumulative_spend_window="1h",
            ),
        )

        await client.create_payment_payload(payment_required())
        await client.create_payment_payload(payment_required())
        with pytest.raises(RuntimeError, match="scheme blew up"):
            await client.create_payment_payload(payment_required())

        # After rollback, total reflects only the two successes.
        assert await resolved.tracker.total(TotalSpendQuery(asset=ASSET)) == 200_000

    async def test_does_not_record_spend_when_later_before_hook_raises(self) -> None:
        from x402.client import x402Client

        calls: list[int] = []
        client = x402Client()
        client.register(NETWORK, fake_scheme_client(calls))
        resolved = apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=500_000, asset=ASSET),
                max_cumulative_spend_window="1h",
            ),
        )

        async def later_before_hook(_ctx: Any) -> None:
            raise RuntimeError("later before failed")

        client.on_before_payment_creation(later_before_hook)

        with pytest.raises(RuntimeError, match="later before failed"):
            await client.create_payment_payload(payment_required())

        assert await resolved.tracker.total(TotalSpendQuery(asset=ASSET)) == 0
        assert len(calls) == 0

    def test_sync_does_not_record_spend_when_later_before_hook_raises(self) -> None:
        from x402.client import x402ClientSync

        calls: list[int] = []
        client = x402ClientSync()
        client.register(NETWORK, fake_scheme_client(calls))
        resolved = apply_spend_controls(
            client,
            SpendControls(
                max_cumulative_spend=Amount(atomic=500_000, asset=ASSET),
                max_cumulative_spend_window="1h",
            ),
        )

        def later_before_hook(_ctx: Any) -> None:
            raise RuntimeError("later before failed")

        client.on_before_payment_creation(later_before_hook)

        with pytest.raises(RuntimeError, match="later before failed"):
            client.create_payment_payload(payment_required())

        assert asyncio.run(resolved.tracker.total(TotalSpendQuery(asset=ASSET))) == 0
        assert len(calls) == 0

    async def test_rejects_second_apply_on_same_client(self) -> None:
        from x402.client import x402Client

        client = x402Client()
        apply_spend_controls(client, SpendControls())
        with pytest.raises(SpendControlError) as exc_info:
            apply_spend_controls(client, SpendControls())
        assert exc_info.value.code == "already_applied"

    async def test_serializes_cumulative_checks_across_clients_sharing_store(self) -> None:
        from x402.client import x402Client

        shared_entries: list[SpendLedgerEntry] = []

        class SharedStore(SpendStore):
            async def load(self) -> list[SpendLedgerEntry]:
                return list(shared_entries)

            async def append(self, entry: SpendLedgerEntry) -> None:
                shared_entries.append(entry)

            async def prune(self, older_than_ms: int) -> None:
                pass

            async def remove_entry(self, entry: SpendLedgerEntry) -> None:
                for i in range(len(shared_entries) - 1, -1, -1):
                    e = shared_entries[i]
                    if (
                        e.at == entry.at
                        and e.atomic_amount == entry.atomic_amount
                        and e.asset == entry.asset
                    ):
                        del shared_entries[i]
                        return

        shared_store = SharedStore()
        controls = SpendControls(
            max_cumulative_spend=Amount(atomic=150_000, asset=ASSET),
            max_cumulative_spend_window="1h",
            store=shared_store,
        )

        client_a = x402Client()
        client_b = x402Client()
        calls_a: list[int] = []
        calls_b: list[int] = []
        client_a.register(NETWORK, fake_scheme_client(calls_a))
        client_b.register(NETWORK, fake_scheme_client(calls_b))

        apply_spend_controls(client_a, controls)
        apply_spend_controls(client_b, controls)

        results = await asyncio.gather(
            client_a.create_payment_payload(payment_required()),
            client_b.create_payment_payload(payment_required()),
            return_exceptions=True,
        )

        errors = [r for r in results if isinstance(r, SpendControlError)]
        assert len(errors) == 1
        assert errors[0].code == "cumulative_cap"
        assert len(calls_a) + len(calls_b) == 1

    async def test_shared_unhashable_store_serializes_across_clients(self) -> None:
        from x402.client import x402Client

        @dataclass
        class UnhashableStore:
            entries: list[SpendLedgerEntry] = field(default_factory=list)

            async def size(self) -> int:
                return len(self.entries)

            async def load(self) -> list[SpendLedgerEntry]:
                return list(self.entries)

            async def append(self, entry: SpendLedgerEntry) -> None:
                self.entries.append(entry)

            async def prune(self, older_than_ms: int) -> None:
                pass

            async def remove_entry(self, entry: SpendLedgerEntry) -> None:
                for i in range(len(self.entries) - 1, -1, -1):
                    existing = self.entries[i]
                    if (
                        existing.at == entry.at
                        and existing.atomic_amount == entry.atomic_amount
                        and existing.asset == entry.asset
                    ):
                        del self.entries[i]
                        return

        controls = SpendControls(
            max_cumulative_spend=Amount(atomic=150_000, asset=ASSET),
            max_cumulative_spend_window="1h",
            store=UnhashableStore(),  # type: ignore[arg-type]
        )

        client_a = x402Client()
        client_b = x402Client()
        calls_a: list[int] = []
        calls_b: list[int] = []
        client_a.register(NETWORK, fake_scheme_client(calls_a))
        client_b.register(NETWORK, fake_scheme_client(calls_b))

        apply_spend_controls(client_a, controls)
        apply_spend_controls(client_b, controls)

        results = await asyncio.gather(
            client_a.create_payment_payload(payment_required()),
            client_b.create_payment_payload(payment_required()),
            return_exceptions=True,
        )

        errors = [r for r in results if isinstance(r, SpendControlError)]
        assert len(errors) == 1
        assert errors[0].code == "cumulative_cap"
        assert len(calls_a) + len(calls_b) == 1
