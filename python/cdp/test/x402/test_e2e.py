"""End-to-end tests for the cdp.x402 payment protocol integration.

Requires live CDP credentials and funded wallets. Run with:

    make e2e-x402

Skips gracefully when required environment variables are absent.
"""

from __future__ import annotations

import asyncio
import os
import socket
import threading
import time
from typing import Generator

import pytest
import pytest_asyncio
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Ports
# ---------------------------------------------------------------------------

_SERVER_PORT_BASIC = 4073
_SERVER_PORT_GUARDRAILS = 4075
_SERVER_PORT_CDP_WALLET = 4077

PROTECTED_PATH = "/protected"
USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _wait_for_port(port: int, timeout: float = 15.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError(f"Server on port {port} did not start within {timeout}s")


def _start_flask_server(pay_to: str, port: int) -> None:
    """Start a minimal Flask x402 server in the current thread (blocks)."""
    from flask import Flask, jsonify
    from werkzeug.serving import make_server
    from x402.http.middleware.flask import PaymentMiddleware
    from x402.mechanisms.evm.exact import ExactEvmServerScheme
    from x402.server import x402ResourceServerSync

    from cdp.x402.core import create_cdp_facilitator_client_sync

    app = Flask(__name__)

    facilitator = create_cdp_facilitator_client_sync()
    resource_server = x402ResourceServerSync(facilitator)
    resource_server.register("eip155:84532", ExactEvmServerScheme())  # type: ignore[no-untyped-call]

    PaymentMiddleware(
        app,
        routes={
            f"GET {PROTECTED_PATH}": {
                "accepts": {
                    "scheme": "exact",
                    "price": "$0.001",
                    "network": "eip155:84532",
                    "payTo": pay_to,
                    "maxTimeoutSeconds": 300,
                },
                "description": "x402 e2e test endpoint",
            },
        },
        server=resource_server,
    )

    @app.get(PROTECTED_PATH)
    def protected():
        return jsonify({"message": "payment accepted"})

    srv = make_server("127.0.0.1", port, app)
    srv.serve_forever()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def basic_server(receiver_address: str) -> Generator[str, None, None]:
    """Start a Flask x402 server on _SERVER_PORT_BASIC."""
    t = threading.Thread(
        target=_start_flask_server, args=(receiver_address, _SERVER_PORT_BASIC), daemon=True
    )
    t.start()
    _wait_for_port(_SERVER_PORT_BASIC)
    yield f"http://127.0.0.1:{_SERVER_PORT_BASIC}"


@pytest.fixture(scope="module")
def guardrails_server(receiver_address: str) -> Generator[str, None, None]:
    """Start a Flask x402 server on _SERVER_PORT_GUARDRAILS."""
    t = threading.Thread(
        target=_start_flask_server, args=(receiver_address, _SERVER_PORT_GUARDRAILS), daemon=True
    )
    t.start()
    _wait_for_port(_SERVER_PORT_GUARDRAILS)
    yield f"http://127.0.0.1:{_SERVER_PORT_GUARDRAILS}"


@pytest.fixture(scope="module")
def cdp_wallet_server(receiver_address: str) -> Generator[str, None, None]:
    """Start a Flask x402 server on _SERVER_PORT_CDP_WALLET."""
    t = threading.Thread(
        target=_start_flask_server, args=(receiver_address, _SERVER_PORT_CDP_WALLET), daemon=True
    )
    t.start()
    _wait_for_port(_SERVER_PORT_CDP_WALLET)
    yield f"http://127.0.0.1:{_SERVER_PORT_CDP_WALLET}"


@pytest.fixture(scope="module")
def receiver_address() -> str:
    addr = os.environ.get("RECEIVER_ADDRESS", "0x0000000000000000000000000000000000000001")
    return addr


@pytest.fixture(scope="module")
def payer_private_key() -> str | None:
    return os.environ.get("PAYER_PRIVATE_KEY")


@pytest.fixture(scope="module")
def cdp_credentials() -> bool:
    return bool(
        os.environ.get("CDP_API_KEY_ID")
        and os.environ.get("CDP_API_KEY_SECRET")
        and os.environ.get("CDP_WALLET_SECRET")
    )


# ---------------------------------------------------------------------------
# Basic x402 facilitator tests (raw private key payer)
# ---------------------------------------------------------------------------


@pytest.mark.e2e
def test_raw_key_payment_succeeds(basic_server: str, payer_private_key: str | None) -> None:
    """A raw EVM private-key wallet can pay a Flask+CDP-facilitator server."""
    if not payer_private_key:
        pytest.skip("PAYER_PRIVATE_KEY not set")
    if not os.environ.get("RECEIVER_ADDRESS"):
        pytest.skip("RECEIVER_ADDRESS not set")

    import requests
    from eth_account import Account
    from x402.client import x402ClientSync
    from x402.http.clients.requests import x402HTTPAdapter
    from x402.mechanisms.evm.exact import ExactEvmScheme
    from x402.mechanisms.evm.signers import EthAccountSigner

    account = Account.from_key(payer_private_key)
    signer = EthAccountSigner(account)
    scheme = ExactEvmScheme(signer)

    client = x402ClientSync()
    client.register("eip155:84532", scheme)

    session = requests.Session()
    session.mount("http://", x402HTTPAdapter(client))

    response = session.get(f"{basic_server}{PROTECTED_PATH}", timeout=120)

    assert response.status_code == 200, (
        f"Expected 200, got {response.status_code}: {response.text}"
    )
    assert response.json().get("message") == "payment accepted"


# ---------------------------------------------------------------------------
# Spend controls (guardrails) tests
# ---------------------------------------------------------------------------


@pytest.mark.e2e
def test_spend_controls_permit_payment_under_cap(
    guardrails_server: str,
    payer_private_key: str | None,
) -> None:
    """A payment within a generous cumulative cap succeeds."""
    if not payer_private_key:
        pytest.skip("PAYER_PRIVATE_KEY not set")

    import requests
    from eth_account import Account
    from x402.client import x402ClientSync
    from x402.http.clients.requests import x402HTTPAdapter
    from x402.mechanisms.evm.exact import ExactEvmScheme
    from x402.mechanisms.evm.signers import EthAccountSigner

    from cdp.x402.core.guardrails import Amount, SpendControls, apply_spend_controls

    account = Account.from_key(payer_private_key)
    signer = EthAccountSigner(account)
    client = x402ClientSync()
    client.register("eip155:84532", ExactEvmScheme(signer))
    apply_spend_controls(
        client,
        SpendControls(
            max_cumulative_spend=Amount(atomic=10_000_000, asset=USDC_BASE_SEPOLIA),
            max_cumulative_spend_window="24h",
            allowed_networks=["eip155:84532"],
            allowed_assets=[USDC_BASE_SEPOLIA],
        ),
    )

    session = requests.Session()
    session.mount("http://", x402HTTPAdapter(client))
    response = session.get(f"{guardrails_server}{PROTECTED_PATH}", timeout=120)

    assert response.status_code == 200
    assert response.json().get("message") == "payment accepted"


@pytest.mark.e2e
def test_spend_controls_block_second_payment_over_cap(
    guardrails_server: str,
    payer_private_key: str | None,
) -> None:
    """A cumulative cap blocks the second payment locally without hitting the server."""
    if not payer_private_key:
        pytest.skip("PAYER_PRIVATE_KEY not set")

    import requests
    from eth_account import Account
    from x402.client import x402ClientSync
    from x402.http.clients.requests import x402HTTPAdapter
    from x402.mechanisms.evm.exact import ExactEvmScheme
    from x402.mechanisms.evm.signers import EthAccountSigner

    from cdp.x402.core.guardrails import Amount, SpendControls, apply_spend_controls
    from cdp.x402.core.guardrails.types import SpendControlError

    account = Account.from_key(payer_private_key)
    signer = EthAccountSigner(account)
    client = x402ClientSync()
    client.register("eip155:84532", ExactEvmScheme(signer))
    apply_spend_controls(
        client,
        SpendControls(
            max_cumulative_spend=Amount(atomic=1_000, asset=USDC_BASE_SEPOLIA),
            max_cumulative_spend_window="24h",
        ),
    )

    session = requests.Session()
    session.mount("http://", x402HTTPAdapter(client))

    # First payment should succeed.
    resp1 = session.get(f"{guardrails_server}{PROTECTED_PATH}", timeout=120)
    assert resp1.status_code == 200

    # Second payment should be blocked locally by the cumulative cap.
    with pytest.raises(Exception) as exc_info:
        session.get(f"{guardrails_server}{PROTECTED_PATH}", timeout=30)

    # Walk the cause chain to find SpendControlError.
    cause: BaseException | None = exc_info.value
    while cause is not None:
        if isinstance(cause, SpendControlError):
            assert cause.code == "cumulative_cap"
            return
        cause = getattr(cause, "__cause__", None) or getattr(cause, "__context__", None)

    pytest.fail(
        f"Expected SpendControlError(cumulative_cap) in cause chain, "
        f"got: {exc_info.value!r}"
    )


# ---------------------------------------------------------------------------
# CDP wallet payment tests (EOA + SCW)
# ---------------------------------------------------------------------------


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_cdp_eoa_wallet_payment(
    cdp_wallet_server: str,
    cdp_credentials: bool,
) -> None:
    """A CDP Server Wallet (EOA) can provision and make a real x402 payment."""
    if not cdp_credentials:
        pytest.skip("CDP credentials not set")

    import httpx
    from x402.http.clients.httpx import x402AsyncTransport

    from cdp.x402 import CDPx402ClientConfig, WalletConfig, create_cdp_x402_client

    result = await create_cdp_x402_client(
        CDPx402ClientConfig(wallet_config=WalletConfig(account_name="x402-e2e-eoa"))
    )
    try:
        assert result.evm_address.startswith("0x") and len(result.evm_address) == 42
        assert result.owner_wallet is None

        transport = x402AsyncTransport(result.client)
        async with httpx.AsyncClient(transport=transport) as http:
            response = await http.get(f"{cdp_wallet_server}{PROTECTED_PATH}")

        assert response.status_code == 200
        assert response.json().get("message") == "payment accepted"
    finally:
        await result.cdp_client.close()


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_cdp_scw_wallet_payment(
    cdp_wallet_server: str,
    cdp_credentials: bool,
) -> None:
    """A CDP Smart Contract Wallet can provision and make a real x402 payment."""
    run_scw_env = os.environ.get("CDP_RUN_SCW_E2E")
    if run_scw_env is not None and run_scw_env.lower() in {"0", "false", "no"}:
        pytest.skip("CDP_RUN_SCW_E2E disabled")
    if not cdp_credentials:
        pytest.skip("CDP credentials not set")

    import httpx
    from x402.http.clients.httpx import x402AsyncTransport

    from cdp.x402 import CDPx402ClientConfig, WalletConfig, create_cdp_x402_client

    result = await create_cdp_x402_client(
        CDPx402ClientConfig(
            wallet_config=WalletConfig(
                type="cdp-smart",
                account_name="x402-e2e-scw",
                owner_account_name=os.environ.get("CDP_OWNER_ACCOUNT_NAME", "x402-e2e-scw-owner"),
            )
        )
    )
    try:
        assert result.evm_address.startswith("0x") and len(result.evm_address) == 42
        assert result.owner_wallet is not None and len(result.owner_wallet) > 0

        transport = x402AsyncTransport(result.client)
        async with httpx.AsyncClient(transport=transport) as http:
            response = await http.get(f"{cdp_wallet_server}{PROTECTED_PATH}")

        assert response.status_code == 200
        assert response.json().get("message") == "payment accepted"
    finally:
        await result.cdp_client.close()


# ---------------------------------------------------------------------------
# Pre-flight balance check tests
# ---------------------------------------------------------------------------


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_preflight_balance_check_blocks_unfunded_wallet_base_sepolia(
    cdp_wallet_server: str,
    cdp_credentials: bool,
) -> None:
    """An unfunded wallet is rejected by the pre-flight balance check on Base Sepolia."""
    if not cdp_credentials:
        pytest.skip("CDP credentials not set")

    import httpx
    from x402.http.clients.httpx import x402AsyncTransport

    from cdp.x402 import CDPx402ClientConfig, WalletConfig, create_cdp_x402_client
    from cdp.x402.core.balance_check import InsufficientFundsError

    result = await create_cdp_x402_client(
        CDPx402ClientConfig(
            wallet_config=WalletConfig(account_name="x402-e2e-balance-check-empty"),
        )
    )
    try:
        transport = x402AsyncTransport(result.client)
        async with httpx.AsyncClient(transport=transport) as http:
            with pytest.raises(Exception) as exc_info:
                await http.get(f"{cdp_wallet_server}{PROTECTED_PATH}")

        cause: BaseException | None = exc_info.value
        while cause is not None:
            if isinstance(cause, InsufficientFundsError):
                assert cause.available == 0
                assert cause.required > 0
                assert cause.address.lower() == result.evm_address.lower()
                return
            cause = getattr(cause, "__cause__", None) or getattr(cause, "__context__", None)

        pytest.fail(
            f"Expected InsufficientFundsError in cause chain, got: {exc_info.value!r}"
        )
    finally:
        await result.cdp_client.close()


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_preflight_balance_check_all_networks(cdp_credentials: bool) -> None:
    """Pre-flight balance check correctly detects zero balance across all supported networks."""
    if not cdp_credentials:
        pytest.skip("CDP credentials not set")

    from unittest.mock import MagicMock

    from cdp import CdpClient
    from cdp.x402.core.balance_check import InsufficientFundsError, create_balance_check_hook

    NETWORK_CASES = [
        ("Solana devnet (CDP indexed)", "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", "svm"),
        ("Polygon (on-chain balanceOf)", "eip155:137", "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", "evm"),
        ("Base mainnet (CDP indexed)", "eip155:8453", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "evm"),
        ("Arbitrum (on-chain balanceOf)", "eip155:42161", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "evm"),
        ("World Chain (on-chain balanceOf)", "eip155:480", "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1", "evm"),
        ("World Chain Sepolia (on-chain balanceOf)", "eip155:4801", "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88", "evm"),
        ("Solana mainnet (CDP indexed)", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "svm"),
    ]

    async with CdpClient() as cdp_client:
        evm_account = await cdp_client.evm.get_or_create_account(
            name="x402-e2e-balance-check-empty"
        )
        svm_account = await cdp_client.solana.get_or_create_account(
            name="x402-e2e-balance-check-empty"
        )
        evm_address = evm_account.address
        svm_address = svm_account.address

        hook = create_balance_check_hook(
            cdp_client=cdp_client,
            evm_address=evm_address,
            svm_address=svm_address,
        )

        for label, network, asset, addr_type in NETWORK_CASES:
            req = MagicMock()
            req.network = network
            req.asset = asset
            req.amount = "1000000"
            req.max_amount_required = None
            ctx = MagicMock()
            ctx.selected_requirements = req

            expected_addr = evm_address if addr_type == "evm" else svm_address

            with pytest.raises(InsufficientFundsError) as exc_info:
                await hook(ctx)

            err = exc_info.value
            assert err.available == 0, f"[{label}] expected available=0"
            assert err.required > 0, f"[{label}] expected required>0"
            assert err.address.lower() == expected_addr.lower(), (
                f"[{label}] expected address={expected_addr!r}, got {err.address!r}"
            )
