"""Unit tests for guardrails/spend_tracker.py."""

from __future__ import annotations

import time

import pytest

from cdp_x402.core.guardrails.spend_tracker import (
    RecordSpendInput,
    SpendTracker,
    TotalSpendQuery,
)
from cdp_x402.core.guardrails.types import SpendControlError, SpendLedgerEntry, SpendStore

# ---------------------------------------------------------------------------
# record + total
# ---------------------------------------------------------------------------


class TestRecordAndTotal:
    async def test_sums_entries_for_requested_asset_only(self) -> None:
        tracker = SpendTracker()
        await tracker.record(RecordSpendInput(10, "usdc", "eip155:8453", "0x1"))
        await tracker.record(RecordSpendInput(5, "usdc", "eip155:8453", "0x1"))
        await tracker.record(RecordSpendInput(100, "dai", "eip155:8453", "0x2"))

        assert await tracker.total(TotalSpendQuery(asset="usdc")) == 15
        assert await tracker.total(TotalSpendQuery(asset="dai")) == 100
        assert await tracker.total(TotalSpendQuery(asset="weth")) == 0

    async def test_respects_since_lower_bound(self, freezegun_ms: None) -> None:
        tracker = SpendTracker()
        t1 = 1_000
        t2 = 2_000

        import unittest.mock as mock

        with mock.patch("time.time", return_value=t1 / 1000):
            await tracker.record(RecordSpendInput(10, "usdc", "eip155:8453", "0x1"))
        with mock.patch("time.time", return_value=t2 / 1000):
            await tracker.record(RecordSpendInput(7, "usdc", "eip155:8453", "0x1"))

        assert await tracker.total(TotalSpendQuery(asset="usdc", since=t1)) == 17
        assert await tracker.total(TotalSpendQuery(asset="usdc", since=1_500)) == 7
        assert await tracker.total(TotalSpendQuery(asset="usdc", since=t2)) == 7

    async def test_records_entry_with_current_timestamp(self) -> None:
        tracker = SpendTracker()
        before = int(time.time() * 1000)
        entry = await tracker.record(RecordSpendInput(1, "usdc", "eip155:8453", "0x1"))
        after = int(time.time() * 1000)
        assert before <= entry.at <= after

    async def test_negative_amount_raises(self) -> None:
        tracker = SpendTracker()
        with pytest.raises(SpendControlError) as exc_info:
            await tracker.record(RecordSpendInput(-1, "usdc", "eip155:8453", "0x1"))
        assert exc_info.value.code == "amount_unparseable"

    async def test_prunes_via_store_prune_when_since_given(self) -> None:
        entries = [
            SpendLedgerEntry(4, "usdc", "eip155:8453", "0x1", 100),
            SpendLedgerEntry(7, "usdc", "eip155:8453", "0x1", 200),
        ]

        class CustomStore(SpendStore):
            async def load(self) -> list[SpendLedgerEntry]:
                return entries

            async def append(self, entry: SpendLedgerEntry) -> None:
                entries.append(entry)

            async def prune(self, older_than_ms: int) -> None:
                to_remove = [e for e in entries if e.at < older_than_ms]
                for e in to_remove:
                    entries.remove(e)

        tracker = SpendTracker(store=CustomStore())
        result = await tracker.total(TotalSpendQuery(asset="usdc", since=150))
        assert result == 7
        assert len(entries) == 1


# ---------------------------------------------------------------------------
# prune
# ---------------------------------------------------------------------------


class TestPrune:
    async def test_drops_entries_strictly_older_than_cutoff(self) -> None:
        import unittest.mock as mock

        tracker = SpendTracker()
        with mock.patch("time.time", return_value=1.0):
            await tracker.record(RecordSpendInput(1, "usdc", "eip155:8453", "0x1"))
        with mock.patch("time.time", return_value=2.0):
            await tracker.record(RecordSpendInput(2, "usdc", "eip155:8453", "0x1"))
        with mock.patch("time.time", return_value=3.0):
            await tracker.record(RecordSpendInput(3, "usdc", "eip155:8453", "0x1"))

        # Window of 1500ms relative to now=3500 → cutoff 2000. Entry at 1000 drops.
        await tracker.prune(3_500, 1_500)
        entries = await tracker.entries()
        assert [e.atomic_amount for e in entries] == [2, 3]

    async def test_keeps_entry_exactly_at_cutoff(self) -> None:
        import unittest.mock as mock

        tracker = SpendTracker()
        with mock.patch("time.time", return_value=2.0):
            await tracker.record(RecordSpendInput(1, "usdc", "eip155:8453", "0x1"))

        # cutoff 2000 → entry at 2000 stays (strict less-than).
        await tracker.prune(3_000, 1_000)
        assert len(await tracker.entries()) == 1

    async def test_noop_when_window_is_none_or_nonpositive(self) -> None:
        tracker = SpendTracker()
        await tracker.record(RecordSpendInput(1, "usdc", "eip155:8453", "0x1"))
        await tracker.prune(int(time.time() * 1000))
        await tracker.prune(int(time.time() * 1000), 0)
        assert len(await tracker.entries()) == 1


# ---------------------------------------------------------------------------
# maxLedgerEntries capacity
# ---------------------------------------------------------------------------


class TestCapacity:
    async def test_rejects_new_records_at_capacity(self) -> None:
        tracker = SpendTracker(max_ledger_entries=3)
        for i in range(3):
            await tracker.record(RecordSpendInput(i + 1, "usdc", "eip155:8453", "0x1"))
        with pytest.raises(SpendControlError) as exc_info:
            await tracker.record(RecordSpendInput(4, "usdc", "eip155:8453", "0x1"))
        assert exc_info.value.code == "ledger_capacity_exceeded"
        assert len(await tracker.entries()) == 3

    @pytest.mark.parametrize("bad", [0, -1])
    def test_validates_max_ledger_entries_as_positive_integer(self, bad: int) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            SpendTracker(max_ledger_entries=bad)
        assert exc_info.value.code == "configuration_invalid"

    def test_float_max_ledger_entries_raises(self) -> None:
        with pytest.raises(SpendControlError) as exc_info:
            SpendTracker(max_ledger_entries=1.5)  # type: ignore[arg-type]
        assert exc_info.value.code == "configuration_invalid"

    async def test_uses_store_size_when_available(self) -> None:
        load_called = False

        class SizedStore(SpendStore):
            async def load(self) -> list[SpendLedgerEntry]:
                nonlocal load_called
                load_called = True
                return []

            async def append(self, entry: SpendLedgerEntry) -> None:
                pass

            async def size(self) -> int:
                return 1

        tracker = SpendTracker(max_ledger_entries=1, store=SizedStore())
        with pytest.raises(SpendControlError) as exc_info:
            await tracker.record(RecordSpendInput(1, "usdc", "eip155:8453", "0x1"))
        assert exc_info.value.code == "ledger_capacity_exceeded"
        assert not load_called


# ---------------------------------------------------------------------------
# removeEntry (rollback)
# ---------------------------------------------------------------------------


class TestRemoveEntry:
    async def test_removes_previously_recorded_entry(self) -> None:
        tracker = SpendTracker()
        entry = await tracker.record(RecordSpendInput(5, "usdc", "eip155:8453", "0x1"))
        assert await tracker.total(TotalSpendQuery(asset="usdc")) == 5
        await tracker.remove_entry(entry)
        assert await tracker.total(TotalSpendQuery(asset="usdc")) == 0

    async def test_second_removal_is_noop(self) -> None:
        tracker = SpendTracker()
        entry = await tracker.record(RecordSpendInput(5, "usdc", "eip155:8453", "0x1"))
        await tracker.remove_entry(entry)
        # Second removal should not raise.
        await tracker.remove_entry(entry)
        assert await tracker.total(TotalSpendQuery(asset="usdc")) == 0

    async def test_warns_once_when_store_lacks_remove_entry(self, capsys: object) -> None:
        import warnings

        class NoRemoveStore(SpendStore):
            async def load(self) -> list[SpendLedgerEntry]:
                return [SpendLedgerEntry(1, "usdc", "eip155:8453", "0x1", 0)]

            async def append(self, entry: SpendLedgerEntry) -> None:
                pass

        store = NoRemoveStore()
        tracker = SpendTracker(store=store)
        entry = await tracker.record(RecordSpendInput(1, "usdc", "eip155:8453", "0x1"))

        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            await tracker.remove_entry(entry)
            await tracker.remove_entry(entry)  # second call — no extra warning

        cdp_warnings = [x for x in w if "remove_entry" in str(x.message)]
        assert len(cdp_warnings) == 1


# ---------------------------------------------------------------------------
# Fixture helpers
# ---------------------------------------------------------------------------


@pytest.fixture
def freezegun_ms() -> None:
    """Placeholder fixture (time.time is mocked inside individual tests)."""
    return None
