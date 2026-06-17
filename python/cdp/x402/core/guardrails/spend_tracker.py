"""Ledger that tracks cumulative spend for the ``on_approaching_limit`` notifier."""

from __future__ import annotations

import logging
import warnings
from dataclasses import dataclass

from cdp.x402.core.guardrails.types import (
    Address,
    Asset,
    SpendControlError,
    SpendLedgerEntry,
    SpendStore,
)

logger = logging.getLogger(__name__)

DEFAULT_MAX_LEDGER_ENTRIES: int = 10_000


class _InMemorySpendStore(SpendStore):
    def __init__(self) -> None:
        self._entries: list[SpendLedgerEntry] = []

    async def size(self) -> int:
        return len(self._entries)

    async def load(self) -> list[SpendLedgerEntry]:
        return list(self._entries)

    async def append(self, entry: SpendLedgerEntry) -> None:
        self._entries.append(entry)

    async def prune(self, older_than_ms: int) -> None:
        cut = 0
        while cut < len(self._entries) and self._entries[cut].at < older_than_ms:
            cut += 1
        if cut > 0:
            del self._entries[:cut]

    async def remove_entry(self, entry: SpendLedgerEntry) -> None:
        for i in range(len(self._entries) - 1, -1, -1):
            e = self._entries[i]
            if (
                e.at == entry.at
                and e.atomic_amount == entry.atomic_amount
                and e.asset == entry.asset
                and e.network == entry.network
                and e.pay_to == entry.pay_to
            ):
                del self._entries[i]
                return


@dataclass
class RecordSpendInput:
    atomic_amount: int
    asset: Asset
    network: str
    pay_to: Address


@dataclass
class TotalSpendQuery:
    asset: Asset
    since: int | None = None


class SpendTracker:
    def __init__(
        self,
        *,
        max_ledger_entries: int | None = None,
        store: SpendStore | None = None,
    ) -> None:
        self._store: SpendStore = store if store is not None else _InMemorySpendStore()
        self._max_ledger_entries: int = (
            max_ledger_entries if max_ledger_entries is not None else DEFAULT_MAX_LEDGER_ENTRIES
        )
        if (
            not isinstance(self._max_ledger_entries, int)
            or isinstance(self._max_ledger_entries, bool)
            or self._max_ledger_entries <= 0
        ):
            raise SpendControlError(
                "configuration_invalid",
                f"max_ledger_entries must be a positive integer, "
                f"received {self._max_ledger_entries!r}",
                {"input": max_ledger_entries},
            )
        self._warned_on_remove: bool = False

    async def record(self, input: RecordSpendInput) -> SpendLedgerEntry:
        import time

        if input.atomic_amount < 0:
            raise SpendControlError(
                "amount_unparseable",
                "Cannot record a negative spend",
                {
                    "attempted": str(input.atomic_amount),
                    "asset": input.asset,
                    "network": input.network,
                    "pay_to": input.pay_to,
                },
            )

        entry = SpendLedgerEntry(
            atomic_amount=input.atomic_amount,
            asset=input.asset,
            network=input.network,
            pay_to=input.pay_to,
            at=int(time.time() * 1000),
        )

        try:
            current_size = await self._store.size()
        except NotImplementedError:
            entries = await self._store.load()
            current_size = len(entries)

        if current_size >= self._max_ledger_entries:
            raise SpendControlError(
                "ledger_capacity_exceeded",
                f"SpendTracker ledger is full "
                f"(max_ledger_entries={self._max_ledger_entries}); "
                "rejecting new spend record to prevent under-counting.",
            )

        await self._store.append(entry)
        return entry

    async def total(self, query: TotalSpendQuery) -> int:
        if query.since is not None:
            try:
                await self._store.prune(query.since)
            except (NotImplementedError, AttributeError):
                pass

        total_sum = 0
        entries = await self._store.load()
        for entry in entries:
            if query.since is not None and entry.at < query.since:
                continue
            if entry.asset != query.asset:
                continue
            total_sum += entry.atomic_amount
        return total_sum

    async def prune(self, now: int, window_ms: int | None = None) -> None:
        if window_ms is None or window_ms <= 0:
            return
        cutoff = now - window_ms
        try:
            await self._store.prune(cutoff)
        except (NotImplementedError, AttributeError):
            pass

    async def remove_entry(self, entry: SpendLedgerEntry) -> None:
        try:
            await self._store.remove_entry(entry)
        except NotImplementedError:
            if not self._warned_on_remove:
                warnings.warn(
                    "[cdp-x402] SpendTracker: store does not implement remove_entry; "
                    "rollback is a no-op so the cumulative ledger may over-count "
                    "after a payment failure.",
                    stacklevel=2,
                )
                self._warned_on_remove = True

    async def entries(self) -> list[SpendLedgerEntry]:
        return await self._store.load()
