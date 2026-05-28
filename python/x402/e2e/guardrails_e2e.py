#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["cdp-sdk", "x402[flask,evm,requests,httpx]", "flask", "werkzeug", "eth-account", "web3>=7.0.0,<7.16.0", "httpx"]  # noqa: E501
# ///
"""
E2E tests for the Python x402 spend guardrails SDK and pre-flight balance check.

Starts a Flask server backed by the CDP facilitator in a background thread,
then makes x402 payments and asserts that:

1. Payments within a generous cumulative cap succeed.
2. A payment that would exceed a tight cumulative cap is rejected with
   SpendControlError(code="cumulative_cap") *before* it hits the server.
3. An unfunded CDP wallet is rejected immediately by the pre-flight balance
   check (InsufficientFundsError, available=0) across all supported networks.
   Base Sepolia is tested via the full x402AsyncTransport path; all other
   networks are tested by invoking the balance-check hook directly.

Required environment variables:
  CDP_API_KEY_ID, CDP_API_KEY_SECRET — CDP API credentials (for facilitator)
  CDP_WALLET_SECRET                  — CDP wallet secret (for balance-check test)
  PAYER_PRIVATE_KEY                  — Hex private key of the payer wallet
                                       (spend-controls tests only)
  RECEIVER_ADDRESS                   — EVM address that receives the payment

Run:
  uv run ./e2e/guardrails_e2e.py
"""

from __future__ import annotations

import os
import socket
import sys
import threading
import time
from pathlib import Path

SERVER_PORT = 4025  # Distinct from server_e2e.py (4023) to avoid port conflicts
SERVER_URL = f"http://localhost:{SERVER_PORT}"
PROTECTED_PATH = "/protected"
USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"


def _load_env() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue
        os.environ.setdefault(key, value.strip().strip('"').strip("'"))


def _start_server(pay_to: str) -> None:
    """Start the Flask x402 server in the current thread (blocks)."""
    python_root = str(Path(__file__).resolve().parents[1])
    sys.path.insert(0, python_root)

    from flask import Flask, jsonify
    from werkzeug.serving import make_server
    from x402.http.middleware.flask import PaymentMiddleware
    from x402.mechanisms.evm.exact import ExactEvmServerScheme
    from x402.server import x402ResourceServerSync

    from cdp_x402.core import create_cdp_facilitator_client_sync  # noqa: PLC0415

    app = Flask(__name__)

    facilitator = create_cdp_facilitator_client_sync()
    resource_server = x402ResourceServerSync(facilitator)
    resource_server.register("eip155:84532", ExactEvmServerScheme())

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
                "description": "x402 guardrails e2e test endpoint",
            },
        },
        server=resource_server,
    )

    @app.get(PROTECTED_PATH)
    def protected() -> object:
        return jsonify({"message": "payment accepted"})

    srv = make_server("127.0.0.1", SERVER_PORT, app)
    srv.serve_forever()


def _wait_for_server() -> None:
    for _ in range(30):
        try:
            with socket.create_connection(("127.0.0.1", SERVER_PORT), timeout=1):
                return
        except OSError:
            time.sleep(0.5)
    raise RuntimeError(f"Server did not start on port {SERVER_PORT}")


def _run_guardrails_test(private_key_hex: str) -> None:
    """Make x402 payments with spend controls and assert guardrail behaviour."""
    import requests
    from eth_account import Account
    from x402.client import x402ClientSync
    from x402.http.clients.requests import x402HTTPAdapter
    from x402.mechanisms.evm.exact import ExactEvmScheme
    from x402.mechanisms.evm.signers import EthAccountSigner

    # Build two clients:
    # - client_ok: generous cap, all payments succeed
    # - client_capped: tight cap so the second payment is blocked

    python_root = str(Path(__file__).resolve().parents[1])
    sys.path.insert(0, python_root)

    from cdp_x402.core.guardrails import Amount, SpendControls, apply_spend_controls
    from cdp_x402.core.guardrails.types import SpendControlError

    account = Account.from_key(private_key_hex)
    signer = EthAccountSigner(account)

    def make_client() -> x402ClientSync:
        c = x402ClientSync()
        c.register("eip155:84532", ExactEvmScheme(signer))
        return c

    # ------------------------------------------------------------------ #
    # Test 1: One successful payment under a generous cap.
    # ------------------------------------------------------------------ #
    client_ok = make_client()
    apply_spend_controls(
        client_ok,
        SpendControls(
            max_cumulative_spend=Amount(atomic=10_000_000, asset=USDC_BASE_SEPOLIA),
            max_cumulative_spend_window="24h",
            allowed_networks=["eip155:84532"],
            allowed_assets=[USDC_BASE_SEPOLIA],
        ),
    )

    session_ok = requests.Session()
    session_ok.mount("http://", x402HTTPAdapter(client_ok))

    resp = session_ok.get(f"{SERVER_URL}{PROTECTED_PATH}", timeout=120)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    assert resp.json().get("message") == "payment accepted"
    print("  [1/2] Payment under generous cap: PASSED")

    # ------------------------------------------------------------------ #
    # Test 2: Cumulative cap blocks the second payment locally.
    # ------------------------------------------------------------------ #
    client_capped = make_client()
    apply_spend_controls(
        client_capped,
        SpendControls(
            # Cap is exactly one payment's worth (0.001 USDC = 1_000 atomic).
            # The first payment passes because 0 + 1_000 <= 1_000.
            # The second payment is blocked because 1_000 + 1_000 > 1_000.
            max_cumulative_spend=Amount(atomic=1_000, asset=USDC_BASE_SEPOLIA),
            max_cumulative_spend_window="24h",
        ),
    )

    session_capped = requests.Session()
    session_capped.mount("http://", x402HTTPAdapter(client_capped))

    # First payment must succeed (0 + 1_000 <= 1_000).
    resp2 = session_capped.get(f"{SERVER_URL}{PROTECTED_PATH}", timeout=120)
    assert resp2.status_code == 200, (
        f"Expected first capped payment to succeed, got {resp2.status_code}: {resp2.text}"
    )

    # Second payment must be blocked locally by the guardrail before reaching
    # the server. x402HTTPAdapter wraps the SpendControlError in its own
    # PaymentError, so we inspect __cause__ to find the original error.
    try:
        session_capped.get(f"{SERVER_URL}{PROTECTED_PATH}", timeout=30)
    except AssertionError:
        raise
    except Exception as exc:
        cause = exc.__cause__ if not isinstance(exc, SpendControlError) else exc
        if not isinstance(cause, SpendControlError):
            raise AssertionError(
                f"Expected SpendControlError(cumulative_cap) as cause, "
                f"got {type(exc).__name__}: {exc}"
            ) from exc
        assert cause.code == "cumulative_cap", f"Expected code='cumulative_cap', got {cause.code!r}"
    else:
        raise AssertionError(
            "Expected second payment to be blocked by cumulative cap, but it succeeded"
        )

    print("  [2/2] Cumulative cap blocks second payment: PASSED")


def _run_pre_flight_balance_check_tests() -> None:
    """Assert that an unfunded CDP wallet is rejected on all supported networks.

    Base Sepolia is exercised via the full x402AsyncTransport path (equivalent
    to the TypeScript createPaymentPayload path) to cover the HTTP transport
    integration. All other networks are tested by invoking the balance-check
    hook directly.
    """
    import asyncio

    python_root = str(Path(__file__).resolve().parents[1])
    sys.path.insert(0, python_root)

    from unittest.mock import MagicMock  # noqa: PLC0415

    import httpx  # noqa: PLC0415
    from x402.http.clients.httpx import x402AsyncTransport  # noqa: PLC0415

    from cdp_x402.core import (  # noqa: PLC0415
        CdpX402ClientConfig,
        InsufficientFundsError,
        create_cdp_x402_client,
    )
    from cdp_x402.core.balance_check import create_balance_check_hook  # noqa: PLC0415
    from cdp_x402.core.wallets.config import WalletConfig  # noqa: PLC0415

    USDC_SOLANA_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
    USDC_POLYGON = "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359"
    USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
    USDC_WORLD = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"
    USDC_WORLD_SEPOLIA = "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88"
    USDC_SOLANA_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

    def _make_ctx(network: str, asset: str, amount: str = "1000000") -> object:
        req = MagicMock()
        req.network = network
        req.asset = asset
        req.amount = amount
        req.max_amount_required = None
        ctx = MagicMock()
        ctx.selected_requirements = req
        return ctx

    async def _run() -> None:
        # Deterministically empty account — must never be funded.
        result = await create_cdp_x402_client(
            CdpX402ClientConfig(
                wallet_config=WalletConfig(account_name="x402-e2e-balance-check-empty"),
            )
        )
        try:
            # --- Base Sepolia: full HTTP transport path ---
            # Exercises the complete x402AsyncTransport → x402Client →
            # balance-check-hook pipeline.
            transport = x402AsyncTransport(result.client)
            async with httpx.AsyncClient(transport=transport) as http:
                try:
                    await http.get(f"{SERVER_URL}{PROTECTED_PATH}")
                except Exception as exc:
                    cause = exc.__cause__ if not isinstance(exc, InsufficientFundsError) else exc
                    if not isinstance(cause, InsufficientFundsError):
                        raise AssertionError(
                            f"Expected InsufficientFundsError, got {type(exc).__name__}: {exc}"
                        ) from exc
                    assert cause.available == 0, f"Expected available=0, got {cause.available}"
                    assert cause.required > 0, f"Expected required>0, got {cause.required}"
                    assert cause.address.lower() == result.evm_address.lower(), (
                        f"Expected address={result.evm_address!r}, got {cause.address!r}"
                    )
                else:
                    raise AssertionError(
                        "Expected InsufficientFundsError from unfunded wallet,"
                        " but request succeeded"
                    )
            print("    [EVM/Base Sepolia (CDP indexed, transport path)]: PASSED")

            # --- All other supported networks: hook path ---
            hook = create_balance_check_hook(
                cdp_client=result.cdp_client,
                evm_address=result.evm_address,
                svm_address=result.svm_address,
            )
            for label, network, asset, expected_addr in [
                (
                    "Solana devnet (CDP indexed)",
                    "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
                    USDC_SOLANA_DEVNET,
                    result.svm_address,
                ),
                ("Polygon (on-chain balanceOf)", "eip155:137", USDC_POLYGON, result.evm_address),
                (
                    "Base mainnet (CDP indexed)",
                    "eip155:8453",
                    USDC_BASE_MAINNET,
                    result.evm_address,
                ),
                (
                    "Arbitrum (on-chain balanceOf)",
                    "eip155:42161",
                    USDC_ARBITRUM,
                    result.evm_address,
                ),
                ("World Chain (on-chain balanceOf)", "eip155:480", USDC_WORLD, result.evm_address),
                (
                    "World Chain Sepolia (on-chain balanceOf)",
                    "eip155:4801",
                    USDC_WORLD_SEPOLIA,
                    result.evm_address,
                ),
                (
                    "Solana mainnet (CDP indexed)",
                    "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
                    USDC_SOLANA_MAINNET,
                    result.svm_address,
                ),
            ]:
                try:
                    await hook(_make_ctx(network, asset))
                except InsufficientFundsError as exc:
                    assert exc.available == 0, (
                        f"[{label}] Expected available=0, got {exc.available}"
                    )
                    assert exc.required > 0, f"[{label}] Expected required>0, got {exc.required}"
                    assert exc.address.lower() == expected_addr.lower(), (
                        f"[{label}] Expected address={expected_addr!r}, got {exc.address!r}"
                    )
                    print(f"    [{label}]: PASSED")
                else:
                    raise AssertionError(
                        f"[{label}] Expected InsufficientFundsError for unfunded wallet,"
                        " but check passed"
                    )
        finally:
            await result.cdp_client.close()

    asyncio.run(_run())


def main() -> int:
    _load_env()

    missing = [
        var
        for var in ("CDP_API_KEY_ID", "CDP_API_KEY_SECRET", "CDP_WALLET_SECRET")
        if not os.environ.get(var)
    ]
    if missing:
        raise RuntimeError(
            f"Missing required env vars: {', '.join(missing)}. "
            "These must be set to run the guardrails e2e tests."
        )

    payer_key = os.environ.get("PAYER_PRIVATE_KEY")
    receiver = os.environ.get("RECEIVER_ADDRESS") or "0x0000000000000000000000000000000000000001"
    run_spend_controls = bool(payer_key and os.environ.get("RECEIVER_ADDRESS"))

    t = threading.Thread(target=_start_server, args=(receiver,), daemon=True)
    t.start()
    _wait_for_server()

    print("Running guardrails e2e tests:")

    if run_spend_controls:
        _run_guardrails_test(payer_key)  # type: ignore[arg-type]
    else:
        print("  [spend controls] SKIPPED (PAYER_PRIVATE_KEY / RECEIVER_ADDRESS not set)")

    _run_pre_flight_balance_check_tests()
    print("  [balance check] Pre-flight blocks unfunded wallet (all supported networks): PASSED")

    print("python guardrails e2e PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
