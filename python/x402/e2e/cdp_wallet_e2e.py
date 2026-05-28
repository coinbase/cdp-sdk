#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["cdp-sdk", "x402[flask,evm,httpx]", "flask", "werkzeug", "httpx"]
# ///
"""
E2E tests for CDP x402 wallet client — EOA and Smart Contract Wallet flows.

Starts a Flask server backed by the CDP facilitator in a background thread,
then provisions a CDP wallet and makes a real x402 payment against it on
Base Sepolia. Tests both the EOA (default) and Smart Contract Wallet (SCW)
flows.

Mirrors the TypeScript cdp-fetch.e2e.test.ts and cdp-scw.e2e.test.ts tests.

Required environment variables:
  CDP_API_KEY_ID       — CDP API key ID
  CDP_API_KEY_SECRET   — CDP API key secret
  CDP_WALLET_SECRET    — CDP wallet secret

Optional environment variables:
  CDP_ACCOUNT_NAME         — Named CDP account (default: "x402-e2e-test")
  CDP_OWNER_ACCOUNT_NAME   — Owner EOA name for SCW tests
                             (default: "x402-e2e-scw-owner")
  CDP_RUN_SCW_E2E          — Set to "0"/"false"/"no" to disable SCW e2e

Run:
  uv run ./e2e/cdp_wallet_e2e.py
"""

from __future__ import annotations

import asyncio
import os
import socket
import sys
import threading
import time
from pathlib import Path

SERVER_PORT = 4027  # Distinct from other e2e ports (4023, 4025)
SERVER_URL = f"http://localhost:{SERVER_PORT}"
PROTECTED_PATH = "/protected"
USDC_BASE_SEPOLIA = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"


def _add_python_path() -> None:
    """Ensure local python package imports resolve from the e2e workspace."""
    python_root = str(Path(__file__).resolve().parents[1])
    if python_root not in sys.path:
        sys.path.insert(0, python_root)


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


def _wait_for_port(port: int, timeout: float = 10.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError(f"Server on port {port} did not start within {timeout}s")


def _start_server(pay_to: str) -> None:
    """Start the Flask x402 server in the current thread (blocks)."""
    _add_python_path()

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
                "description": "CDP wallet e2e test endpoint",
            },
        },
        server=resource_server,
    )

    @app.get(PROTECTED_PATH)
    def protected() -> object:
        return jsonify({"message": "payment accepted"})

    srv = make_server("127.0.0.1", SERVER_PORT, app)
    srv.serve_forever()


async def _run_eoa_tests(account_name: str) -> None:
    """Provision a CDP EOA wallet and make a real x402 payment."""
    import httpx
    from x402.http.clients.httpx import x402AsyncTransport

    from cdp_x402 import CdpX402ClientConfig, WalletConfig, create_cdp_x402_client

    print("\n=== CDP x402 E2E (EOA) ===")

    result = await create_cdp_x402_client(
        CdpX402ClientConfig(wallet_config=WalletConfig(account_name=account_name))
    )
    try:
        # Assertions matching TypeScript cdp-fetch.e2e.test.ts
        assert (
            result.evm_address
            and result.evm_address.startswith("0x")
            and len(result.evm_address) == 42
        ), f"Expected valid EVM address, got: {result.evm_address!r}"
        print(f"  ✓ Provisioned EOA wallet: {result.evm_address}")

        assert result.client is not None, "Expected x402 client to be defined"
        print("  ✓ x402 client is configured")

        assert result.owner_wallet is None, (
            f"Expected no owner wallet for EOA, got: {result.owner_wallet!r}"
        )
        print("  ✓ No owner wallet set for EOA")

        transport = x402AsyncTransport(result.client)
        async with httpx.AsyncClient(transport=transport) as http:
            response = await http.get(f"{SERVER_URL}{PROTECTED_PATH}")

        body = (
            response.json()
            if "application/json" in response.headers.get("content-type", "")
            else {}
        )
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. Body: {body}"
        )
        assert body.get("message") == "payment accepted", f"Unexpected body: {body}"
        print("  ✓ Real x402 payment completed on Base Sepolia (EOA)")
    finally:
        await result.cdp_client.close()


async def _run_scw_tests(account_name: str, owner_account_name: str) -> None:
    """Provision a CDP Smart Contract Wallet and make a real x402 payment."""
    import httpx
    from x402.http.clients.httpx import x402AsyncTransport

    from cdp_x402 import CdpX402ClientConfig, WalletConfig, create_cdp_x402_client

    print("\n=== CDP x402 E2E (SCW) ===")

    result = await create_cdp_x402_client(
        CdpX402ClientConfig(
            wallet_config=WalletConfig(
                type="cdp-smart",
                account_name=account_name,
                owner_account_name=owner_account_name,
            )
        )
    )
    try:
        # Assertions matching TypeScript cdp-scw.e2e.test.ts
        assert (
            result.evm_address
            and result.evm_address.startswith("0x")
            and len(result.evm_address) == 42
        ), f"Expected valid SCW address, got: {result.evm_address!r}"
        print(f"  ✓ Provisioned Smart Contract Wallet: {result.evm_address}")

        assert result.owner_wallet and len(result.owner_wallet) > 0, (
            f"Expected owner wallet name to be set, got: {result.owner_wallet!r}"
        )
        print(f"  ✓ Owner wallet name: {result.owner_wallet}")

        assert result.client is not None, "Expected x402 client to be defined"
        print("  ✓ x402 client is configured")

        transport = x402AsyncTransport(result.client)
        async with httpx.AsyncClient(transport=transport) as http:
            response = await http.get(f"{SERVER_URL}{PROTECTED_PATH}")

        body = (
            response.json()
            if "application/json" in response.headers.get("content-type", "")
            else {}
        )
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. Body: {body}"
        )
        assert body.get("message") == "payment accepted", f"Unexpected body: {body}"
        print("  ✓ Real x402 payment completed on Base Sepolia (SCW)")
    finally:
        await result.cdp_client.close()


async def _main() -> None:
    account_name = os.environ.get("CDP_ACCOUNT_NAME", "x402-e2e-test")
    owner_account_name = os.environ.get("CDP_OWNER_ACCOUNT_NAME", "x402-e2e-scw-owner")
    run_scw_env = os.environ.get("CDP_RUN_SCW_E2E")
    run_scw = (
        True if run_scw_env is None else run_scw_env.lower() not in {"0", "false", "no"}
    )

    from cdp_x402.core.credentials import resolve_credentials  # noqa: PLC0415

    try:
        resolve_credentials()
    except ValueError as exc:
        print(f"SKIP: {exc}")
        return

    # Provision a separate receiver account so payments aren't self-transfers.
    # The CDP facilitator rejects self-payment (from == to).
    from cdp import CdpClient  # noqa: PLC0415

    async with CdpClient() as cdp_client:
        receiver = await cdp_client.evm.get_or_create_account(
            name=f"{account_name}-receiver"
        )
        pay_to = receiver.address
    print(f"Receiver address: {pay_to}")

    server_thread = threading.Thread(target=_start_server, args=(pay_to,), daemon=True)
    server_thread.start()
    _wait_for_port(SERVER_PORT)

    await _run_eoa_tests(account_name)

    if run_scw:
        await _run_scw_tests(account_name, owner_account_name)
    else:
        print(
            "\n=== CDP x402 E2E (SCW) — skipped (unset CDP_RUN_SCW_E2E or set it to a value other than 0/false/no to enable) ==="
        )

    print("\nAll CDP wallet e2e tests passed.")


def main() -> None:
    _add_python_path()
    _load_env()
    asyncio.run(_main())


if __name__ == "__main__":
    main()
