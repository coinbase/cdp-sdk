"""Ledger that tracks cumulative spend and backs the ``on_approaching_limit``
notifier.

Spend is tracked per asset — there is no cross-asset total because each asset
uses different base units. All public methods are ``async`` so the tracker can
be backed by an external store (Redis, database, etc.) without any changes to
the calling code. The default in-memory store resolves synchronously.
"""

from __future__ import annotations

import logging
import warnings
from dataclasses import dataclass

from cdp_x402.core.guardrails.types import (
    Address,
    Asset,
    SpendControlError,
    SpendLedgerEntry,
    SpendStore,
)

logger = logging.getLogger(__name__)

DEFAULT_MAX_LEDGER_ENTRIES: int = 10_000
"""Default maximum number of ledger entries kept in memory."""


class _InMemorySpendStore(SpendStore):
    """Default in-memory :class:`SpendStore` backed by a plain list."""

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
        # Scan from the end so we remove the most recent match.
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
    """Argument shape for :meth:`SpendTracker.record`."""

    atomic_amount: int
    asset: Asset
    network: str
    pay_to: Address


@dataclass
class TotalSpendQuery:
    """Argument shape for :meth:`SpendTracker.total`."""

    asset: Asset
    since: int | None = None
    """Inclusive lower bound (ms since epoch). Entries strictly older are excluded."""


class SpendTracker:
    """Tracks spend per asset in an append-only ledger.

    Each asset is totalled independently — there is no cross-asset sum.

    All read/write methods are ``async`` so external stores (Redis, etc.) can
    be plugged in without changing the calling code.
    """

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
        """Add a spend entry to the ledger and return it.

        The returned entry can be passed to :meth:`remove_entry` to undo the
        record if the payment later fails.
        """
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
        """Sum atomic amounts for the given asset.

        Optionally restricted to entries recorded at or after ``query.since``.
        """
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
        """Drop entries older than ``now - window_ms``. Idempotent."""
        if window_ms is None or window_ms <= 0:
            return
        cutoff = now - window_ms
        try:
            await self._store.prune(cutoff)
        except (NotImplementedError, AttributeError):
            pass

    async def remove_entry(self, entry: SpendLedgerEntry) -> None:
        """Remove a previously recorded entry, undoing its contribution to the
        cumulative total.

        Used to roll back a provisional record if payment creation fails.

        If the store doesn't implement ``remove_entry``, warns once and
        continues — over-counting is preferable to silently under-counting.
        """
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
        """Return all current ledger entries as a snapshot.

        Intended for tests and debugging.
        """
        return await self._store.load()
