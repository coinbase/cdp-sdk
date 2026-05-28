"""Shared fakes for the middleware tests.

The fakes implement just enough of the x402 facilitator client protocol to
exercise the cdp-x402 Flask and FastAPI middleware end-to-end without any
network access.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import pytest
from x402.http.utils import encode_payment_signature_header
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.mechanisms.evm.upto import UptoEvmServerScheme
from x402.schemas import (
    PaymentPayload,
    SettleResponse,
    SupportedKind,
    SupportedResponse,
    VerifyResponse,
)
from x402.server import ResourceConfig, x402ResourceServerSync

PAY_TO = "0x" + "11" * 20
NETWORK = "eip155:8453"


@dataclass
class FakeFacilitatorSync:
    """Sync facilitator stub used by the Flask integration tests."""

    next_verify: VerifyResponse = field(default_factory=lambda: VerifyResponse(is_valid=True))
    next_settle: SettleResponse = field(
        default_factory=lambda: SettleResponse(success=True, transaction="0xtx", network=NETWORK)
    )
    verify_error: Exception | None = None
    settle_error: Exception | None = None
    verify_calls: list[tuple[Any, Any]] = field(default_factory=list)
    settle_calls: list[tuple[Any, Any]] = field(default_factory=list)
    supported_calls: int = 0

    def get_supported(self) -> SupportedResponse:
        self.supported_calls += 1
        return SupportedResponse(
            kinds=[
                SupportedKind(x402Version=2, scheme="exact", network=NETWORK),
                SupportedKind(
                    x402Version=2,
                    scheme="upto",
                    network=NETWORK,
                    extra={"facilitatorAddress": PAY_TO},
                ),
            ],
        )

    def verify(self, payload: Any, requirements: Any) -> VerifyResponse:
        self.verify_calls.append((payload, requirements))
        if self.verify_error is not None:
            raise self.verify_error
        return self.next_verify

    def settle(self, payload: Any, requirements: Any) -> SettleResponse:
        self.settle_calls.append((payload, requirements))
        if self.settle_error is not None:
            raise self.settle_error
        return self.next_settle


@dataclass
class FakeFacilitatorAsync:
    """Async facilitator stub used by the FastAPI integration tests."""

    next_verify: VerifyResponse = field(default_factory=lambda: VerifyResponse(is_valid=True))
    next_settle: SettleResponse = field(
        default_factory=lambda: SettleResponse(success=True, transaction="0xtx", network=NETWORK)
    )
    verify_error: Exception | None = None
    settle_error: Exception | None = None
    verify_calls: list[tuple[Any, Any]] = field(default_factory=list)
    settle_calls: list[tuple[Any, Any]] = field(default_factory=list)
    supported_calls: int = 0

    def get_supported(self) -> SupportedResponse:
        # ``initialize()`` is sync on the resource server; this matches the protocol.
        self.supported_calls += 1
        return SupportedResponse(
            kinds=[
                SupportedKind(x402Version=2, scheme="exact", network=NETWORK),
                SupportedKind(
                    x402Version=2,
                    scheme="upto",
                    network=NETWORK,
                    extra={"facilitatorAddress": PAY_TO},
                ),
            ],
        )

    async def verify(self, payload: Any, requirements: Any) -> VerifyResponse:
        self.verify_calls.append((payload, requirements))
        if self.verify_error is not None:
            raise self.verify_error
        return self.next_verify

    async def settle(self, payload: Any, requirements: Any) -> SettleResponse:
        self.settle_calls.append((payload, requirements))
        if self.settle_error is not None:
            raise self.settle_error
        return self.next_settle


def build_payment_signature_header(
    price: str = "$0.01",
    pay_to: str = PAY_TO,
    scheme: str = "exact",
) -> str:
    """Encode a payment payload that matches the requirements built for ``price``."""
    server = x402ResourceServerSync(FakeFacilitatorSync())
    if scheme == "exact":
        server.register(NETWORK, ExactEvmServerScheme())
    elif scheme == "upto":
        server.register(NETWORK, UptoEvmServerScheme())
    else:
        raise ValueError(f"Unsupported scheme for test helper: {scheme}")
    server.initialize()
    requirements = server.build_payment_requirements(
        ResourceConfig(scheme=scheme, price=price, network=NETWORK, pay_to=pay_to)
    )[0]
    payload = PaymentPayload(
        x402_version=2,
        payload={"signature": "0xdeadbeef"},
        accepted=requirements,
    )
    return encode_payment_signature_header(payload)


@pytest.fixture
def pay_to() -> str:
    return PAY_TO


@pytest.fixture
def network() -> str:
    return NETWORK


@pytest.fixture
def fake_facilitator_sync() -> FakeFacilitatorSync:
    return FakeFacilitatorSync()


@pytest.fixture
def fake_facilitator_async() -> FakeFacilitatorAsync:
    return FakeFacilitatorAsync()


@pytest.fixture
def valid_payment_header() -> str:
    return build_payment_signature_header()
