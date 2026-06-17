"""Types and parsers for the spend controls API."""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated, Any, Final, Literal

from pydantic import ConfigDict, SkipValidation, field_validator
from pydantic.dataclasses import dataclass as pydantic_dataclass

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
    PER_PAYMENT_CAP: Final[SpendControlErrorCode] = "per_payment_cap"
    CUMULATIVE_CAP: Final[SpendControlErrorCode] = "cumulative_cap"
    ALREADY_APPLIED: Final[SpendControlErrorCode] = "already_applied"
    CONFIGURATION_INVALID: Final[SpendControlErrorCode] = "configuration_invalid"
    LEDGER_CAPACITY_EXCEEDED: Final[SpendControlErrorCode] = "ledger_capacity_exceeded"
    NETWORK_NOT_ALLOWED: Final[SpendControlErrorCode] = "network_not_allowed"
    ASSET_NOT_ALLOWED: Final[SpendControlErrorCode] = "asset_not_allowed"
    PAYEE_NOT_ALLOWED: Final[SpendControlErrorCode] = "payee_not_allowed"
    AMOUNT_UNPARSEABLE: Final[SpendControlErrorCode] = "amount_unparseable"


Duration = int | float | str


@dataclass
class Amount:
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
    atomic_amount: int
    asset: Asset
    network: str
    pay_to: Address
    at: int


class SpendControlError(Exception):
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
    @abstractmethod
    async def load(self) -> list[SpendLedgerEntry]:
        ...

    @abstractmethod
    async def append(self, entry: SpendLedgerEntry) -> None:
        ...

    async def size(self) -> int:
        raise NotImplementedError

    async def prune(self, older_than_ms: int) -> None:  # noqa: B027
        ...

    async def remove_entry(self, entry: SpendLedgerEntry) -> None:
        raise NotImplementedError

    async def drop_oldest(self, n: int) -> None:
        raise NotImplementedError


@pydantic_dataclass(config=ConfigDict(arbitrary_types_allowed=True, extra="forbid"))
class SpendControls:
    max_amount_per_payment: Amount | None = None
    max_cumulative_spend: Amount | None = None
    max_cumulative_spend_window: int | None = None
    allowed_networks: list[str] | None = None
    allowed_assets: list[str] | None = None
    allowed_payees: list[str] | None = None
    on_approaching_limit: Callable[[Amount, Amount], None] | None = None
    approaching_limit_thresholds: list[float] | None = None
    max_ledger_entries: int | None = None
    store: Annotated[SpendStore | None, SkipValidation()] = None

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
                "cannot be summed.",
                {"input": value},
            )
        return value

    @field_validator("max_cumulative_spend_window", mode="before")
    @classmethod
    def _coerce_duration(cls, value: Any) -> Any:
        if value is None:
            return None
        return parse_duration(value)


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
