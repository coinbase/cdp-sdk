"""Types and parsers for the spend controls API."""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated, Any, Final, Literal

from pydantic import ConfigDict, SkipValidation, field_validator
from pydantic.dataclasses import dataclass as pydantic_dataclass

# Simple string type aliases
Asset = str
Address = str

SpendControlErrorCode = Literal[
    "per_payment_cap",
    "cumulative_cap",
    "already_applied",
    "configuration_invalid",
    "ledger_capacity_exceeded",
    "network_not_allowed",
    "asset_not_allowed",
    "payee_not_allowed",
    "amount_unparseable",
]
SpendControlErrorDetails = dict[str, Any]


class SpendControlErrorCodes:
    """Typed string constants for every :data:`SpendControlErrorCode` value.

    Prefer referencing these constants over raw string literals:

        if (
            isinstance(err, SpendControlError)
            and err.code == SpendControlErrorCodes.PER_PAYMENT_CAP
        ):
            ...
    """

    PER_PAYMENT_CAP: Final[SpendControlErrorCode] = "per_payment_cap"
    CUMULATIVE_CAP: Final[SpendControlErrorCode] = "cumulative_cap"
    ALREADY_APPLIED: Final[SpendControlErrorCode] = "already_applied"
    CONFIGURATION_INVALID: Final[SpendControlErrorCode] = "configuration_invalid"
    LEDGER_CAPACITY_EXCEEDED: Final[SpendControlErrorCode] = "ledger_capacity_exceeded"
    NETWORK_NOT_ALLOWED: Final[SpendControlErrorCode] = "network_not_allowed"
    ASSET_NOT_ALLOWED: Final[SpendControlErrorCode] = "asset_not_allowed"
    PAYEE_NOT_ALLOWED: Final[SpendControlErrorCode] = "payee_not_allowed"
    AMOUNT_UNPARSEABLE: Final[SpendControlErrorCode] = "amount_unparseable"


# Duration expressed as milliseconds (int/float) or a shorthand string
# like "500ms", "30s", "5m", "1h", "24h", "7d".
Duration = int | float | str


@dataclass
class Amount:
    """A payment amount in base units (smallest denomination for the asset).

    - ``atomic`` is a non-negative integer. String values are accepted for
      convenience and are converted to ``int`` automatically on construction.
    - ``asset`` is optional but recommended. When set, caps and totals are
      scoped to that asset.

    Use the contract address, not a ticker symbol. ``"usdc"`` and
    ``"0x036cbd…"`` are treated as different assets.
    """

    atomic: int
    asset: Asset | None = None

    def __post_init__(self) -> None:
        if isinstance(self.atomic, str):
            trimmed = self.atomic.strip()
            if not re.fullmatch(r"\d+", trimmed):
                raise SpendControlError(
                    "amount_unparseable",
                    f"Cannot parse amount {self.atomic!r}; expected a non-negative integer",
                    {"input": self.atomic},
                )
            self.atomic = int(trimmed)
        elif isinstance(self.atomic, bool) or not isinstance(self.atomic, int):
            raise SpendControlError(
                "amount_unparseable",
                f"Cannot parse amount: unsupported value of type {type(self.atomic).__name__}",
                {"input": self.atomic},
            )
        if self.atomic < 0:
            raise SpendControlError(
                "amount_unparseable",
                f"Amount must be non-negative, got {self.atomic}",
                {"input": str(self.atomic)},
            )


@dataclass
class SpendLedgerEntry:
    """A single recorded payment in the spend ledger."""

    atomic_amount: int
    asset: Asset
    network: str
    pay_to: Address
    at: int  # ms since Unix epoch


class SpendControlError(Exception):
    """Thrown when a payment is blocked by the configured spend controls.

    Check the :attr:`code` field to identify the specific reason.
    """

    def __init__(
        self,
        code: SpendControlErrorCode,
        message: str,
        details: SpendControlErrorDetails | None = None,
    ) -> None:
        super().__init__(message)
        self.code: SpendControlErrorCode = code
        self.details: SpendControlErrorDetails = details or {}


class SpendStore(ABC):
    """Storage interface for the spend ledger.

    The default implementation is in-memory. Subclass this to use a
    persistent backend (Redis, database, etc.) without changing anything else.

    All methods are async so network I/O is supported naturally.
    """

    @abstractmethod
    async def load(self) -> list[SpendLedgerEntry]:
        """Return all entries currently held by the store."""
        ...

    @abstractmethod
    async def append(self, entry: SpendLedgerEntry) -> None:
        """Add a single entry to the store."""
        ...

    async def size(self) -> int:
        """Optional: return the current entry count without loading all entries.

        When implemented, the tracker uses this for capacity checks instead
        of calling :meth:`load`. Raise :exc:`NotImplementedError` to fall back
        to the default load-based count.
        """
        raise NotImplementedError

    async def prune(self, older_than_ms: int) -> None:  # noqa: B027
        """Optional: drop entries older than ``older_than_ms``.

        Called during rolling-window pruning. Backends that handle expiry
        themselves can no-op this.
        """

    async def remove_entry(self, entry: SpendLedgerEntry) -> None:
        """Optional: remove a specific entry by its field values.

        Used to undo a provisional record if payment creation fails. If not
        implemented, the tracker warns once and continues — over-counting is
        preferable to silently under-counting.
        """
        raise NotImplementedError

    async def drop_oldest(self, n: int) -> None:
        """Optional: drop the oldest *n* entries.

        Reserved for custom store implementations that want their own trimming.
        Not called by the default tracker.
        """
        raise NotImplementedError


@pydantic_dataclass(config=ConfigDict(arbitrary_types_allowed=True, extra="forbid"))
class SpendControls:
    """Configuration for spend controls.

    All fields are optional — omitting a field disables the corresponding
    check. All limits are set in code; there are no environment variable
    fallbacks.
    """

    max_amount_per_payment: Amount | None = None
    """Hard cap on a single payment's atomic amount."""

    max_cumulative_spend: Amount | None = None
    """Cap on total spend for a single asset across all payments.
    The ``asset`` field is **required** — each asset uses different base
    units, so a cross-asset total would be meaningless. Configure one cap
    per asset.
    """

    max_cumulative_spend_window: int | None = None
    """Rolling window for the cumulative cap in milliseconds. Older entries are
    pruned and excluded from the running total.

    Accepts a non-negative number of milliseconds or a duration shorthand
    string (``"500ms"``, ``"30s"``, ``"5m"``, ``"1h"``, ``"24h"``, ``"7d"``)
    at construction time; the value is always stored as an ``int`` (ms).
    """

    allowed_networks: list[str] | None = None
    """Networks payments are allowed on. Empty or ``None`` means "allow all"."""

    allowed_assets: list[str] | None = None
    """Allow-list of asset identifiers. Empty / ``None`` means "allow all"."""

    allowed_payees: list[str] | None = None
    """Allow-list of payee addresses. Empty / ``None`` means "allow all"."""

    on_approaching_limit: Callable[[Amount, Amount], None] | None = None
    """Notifier invoked when the running total crosses one of the configured
    thresholds (default ``[0.8, 0.95]``). A raising callback won't block
    a payment.
    """

    approaching_limit_thresholds: list[float] | None = None
    """Thresholds (as fractions of the cap) that trigger
    :attr:`on_approaching_limit`. Defaults to ``[0.8, 0.95]``.
    Values outside ``(0, 1]`` are silently dropped.
    """

    max_ledger_entries: int | None = None
    """Maximum number of entries in the spend ledger. Once reached, new
    entries are rejected so the cumulative total stays accurate. Defaults
    to ``10_000``.
    """

    store: Annotated[SpendStore | None, SkipValidation()] = None
    """Custom storage backend. Defaults to an in-memory store. Any duck-typed
    object that implements the :class:`SpendStore` interface is accepted.
    """

    @field_validator("max_amount_per_payment", "max_cumulative_spend", mode="before")
    @classmethod
    def _coerce_amount(cls, value: Any) -> Any:
        if value is None or isinstance(value, Amount):
            return value
        if isinstance(value, dict):
            asset = value.get("asset")
            atomic = value.get("atomic")
            return parse_amount(atomic, asset) if atomic is not None else Amount(**value)
        if isinstance(value, (int, str)):
            return parse_amount(value)
        return value

    @field_validator("max_cumulative_spend", mode="after")
    @classmethod
    def _validate_cumulative_spend_has_asset(cls, value: Amount | None) -> Amount | None:
        if value is not None and value.asset is None:
            raise SpendControlError(
                "amount_unparseable",
                "max_cumulative_spend requires an `asset` — cross-asset atomic units "
                "cannot be summed. Configure one cumulative cap per asset, or scope "
                "the cap to a single asset.",
                {"input": value},
            )
        return value

    @field_validator("max_cumulative_spend_window", mode="before")
    @classmethod
    def _coerce_duration(cls, value: Any) -> Any:
        if value is None:
            return None
        return parse_duration(value)


# ---------------------------------------------------------------------------
# Parsers
# ---------------------------------------------------------------------------

_MS_UNIT_FACTORS: dict[str, float] = {
    "ms": 1.0,
    "s": 1_000.0,
    "m": 60.0 * 1_000.0,
    "h": 60.0 * 60.0 * 1_000.0,
    "d": 24.0 * 60.0 * 60.0 * 1_000.0,
}

_DURATION_PATTERN = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)\s*$", re.IGNORECASE)
_AMOUNT_SHORTHAND_PATTERN = re.compile(r"^([^:]+):(\d+)$")
_DECIMAL_INTEGER_PATTERN = re.compile(r"^\d+$")


def parse_duration(value: Duration) -> int:
    """Convert a :type:`Duration` to milliseconds.

    Accepts a non-negative number (already in milliseconds) or a shorthand
    string: ``"500ms"``, ``"30s"``, ``"5m"``, ``"1h"``, ``"24h"``, ``"7d"``.

    :raises SpendControlError: ``"amount_unparseable"`` if the input can't be
        parsed.
    """
    if isinstance(value, bool):
        raise SpendControlError(
            "amount_unparseable",
            f"Duration must be a non-negative finite number, received {value!r}",
            {"input": value},
        )
    if isinstance(value, (int, float)):
        import math

        if math.isnan(value) or math.isinf(value) or value < 0:
            raise SpendControlError(
                "amount_unparseable",
                f"Duration must be a non-negative finite number, received {value}",
                {"input": value},
            )
        return int(value)

    match = _DURATION_PATTERN.match(value)
    if not match:
        raise SpendControlError(
            "amount_unparseable",
            f"Cannot parse duration {value!r}; expected e.g. "
            f'"500ms", "30s", "5m", "1h", "24h", "7d"',
            {"input": value},
        )
    numeric_part, unit = match.group(1), match.group(2)
    factor = _MS_UNIT_FACTORS[unit.lower()]
    return int(float(numeric_part) * factor)


def parse_amount(
    value: int | str | Amount,
    asset: str | None = None,
) -> Amount:
    """Parse an amount into ``Amount(atomic: int, asset: str | None)``.

    Accepts:

    - ``int`` — used as-is with the optional *asset* argument.
    - ``str`` — a decimal integer (``"100000"``) or
      ``"<asset>:<atomic>"`` shorthand.
    - :class:`Amount` — the ``Amount`` shape; *asset* argument takes priority.

    :raises SpendControlError: ``"amount_unparseable"`` on bad input.
    """
    if isinstance(value, bool):
        raise SpendControlError(
            "amount_unparseable",
            f"Cannot parse amount: unsupported value of type {type(value).__name__}",
            {"input": value},
        )

    if isinstance(value, int):
        if value < 0:
            raise SpendControlError(
                "amount_unparseable",
                f"Amount must be non-negative, got {value}",
                {"input": str(value)},
            )
        return Amount(atomic=value, asset=asset)

    if isinstance(value, str):
        trimmed = value.strip()
        if not trimmed:
            raise SpendControlError(
                "amount_unparseable",
                "Amount string is empty",
                {"input": value},
            )
        shorthand = _AMOUNT_SHORTHAND_PATTERN.match(trimmed)
        if shorthand:
            parsed_asset, parsed_atomic = shorthand.group(1), shorthand.group(2)
            return parse_amount(
                Amount(atomic=int(parsed_atomic), asset=parsed_asset),
                asset if asset is not None else parsed_asset,
            )
        if not _DECIMAL_INTEGER_PATTERN.match(trimmed):
            raise SpendControlError(
                "amount_unparseable",
                f"Cannot parse amount {value!r}; expected a non-negative integer "
                f'or an "<asset>:<atomic>" shorthand',
                {"input": value},
            )
        return Amount(atomic=int(trimmed), asset=asset)

    if isinstance(value, Amount):
        inner_asset = asset if asset is not None else value.asset
        atomic = value.atomic
        if isinstance(atomic, str):
            return parse_amount(atomic, inner_asset)
        if isinstance(atomic, bool):
            raise SpendControlError(
                "amount_unparseable",
                f"Cannot parse amount: unsupported value of type {type(atomic).__name__}",
                {"input": atomic},
            )
        if isinstance(atomic, int):
            return parse_amount(atomic, inner_asset)
        raise SpendControlError(
            "amount_unparseable",
            f"Cannot parse amount: unsupported value of type {type(atomic).__name__}",
            {"input": atomic},
        )

    raise SpendControlError(
        "amount_unparseable",
        f"Cannot parse amount: unsupported value of type {type(value).__name__}",
        {"input": value},
    )
