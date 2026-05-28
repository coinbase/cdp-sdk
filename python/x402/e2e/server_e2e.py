#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["cdp-sdk>=1.45.1", "x402[flask,evm,requests]", "flask", "werkzeug", "eth-account", "web3>=7.0.0,<7.16.0"]  # noqa: E501
# ///
"""
E2E test for the Python x402 facilitator SDK.

Starts a Flask server backed by the CDP facilitator in a background thread,
then makes a real x402 payment to it using a raw EVM private key,
and asserts that the server accepts the payment and returns 200.

Required environment variables:
  CDP_API_KEY_ID, CDP_API_KEY_SECRET — CDP API credentials (for facilitator)
  PAYER_PRIVATE_KEY                  — Hex private key of the payer wallet
  RECEIVER_ADDRESS                   — EVM address that receives the payment
                                       (must differ from payer)

Run:
  uv run ./e2e/server_e2e.py
"""

from __future__ import annotations

import os
import sys
import threading
from pathlib import Path

SERVER_PORT = 4023
SERVER_URL = f"http://localhost:{SERVER_PORT}"
PROTECTED_PATH = "/protected"


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
                "description": "x402 e2e test endpoint",
            },
        },
        server=resource_server,
    )

    @app.get(PROTECTED_PATH)
    def protected() -> object:
        return jsonify({"message": "payment accepted"})

    srv = make_server("127.0.0.1", SERVER_PORT, app)
    srv.serve_forever()


def _run_payment_test(private_key_hex: str) -> None:
    """Make a real x402 payment and assert the server returns 200."""
    import requests
    from eth_account import Account
    from x402.client import x402ClientSync
    from x402.http.clients.requests import x402HTTPAdapter
    from x402.mechanisms.evm.exact import ExactEvmScheme
    from x402.mechanisms.evm.signers import EthAccountSigner

    account = Account.from_key(private_key_hex)
    signer = EthAccountSigner(account)
    scheme = ExactEvmScheme(signer)

    client = x402ClientSync()
    client.register("eip155:84532", scheme)

    session = requests.Session()
    session.mount("http://", x402HTTPAdapter(client))
    session.mount("https://", x402HTTPAdapter(client))

    response = session.get(f"{SERVER_URL}{PROTECTED_PATH}", timeout=120)

    if response.status_code != 200:
        raise RuntimeError(
            f"Payment failed: expected 200, got {response.status_code}: {response.text}"
        )

    body = response.json()
    if body.get("message") != "payment accepted":
        raise RuntimeError(f"Unexpected response body: {body}")


def main() -> int:
    _load_env()

    payer_key = os.environ.get("PAYER_PRIVATE_KEY")
    if not payer_key:
        print("Skipping python e2e: PAYER_PRIVATE_KEY not set.")
        return 0

    if not os.environ.get("CDP_API_KEY_ID") or not os.environ.get("CDP_API_KEY_SECRET"):
        print("Skipping python e2e: missing CDP_API_KEY_ID/CDP_API_KEY_SECRET.")
        return 0

    receiver = os.environ.get("RECEIVER_ADDRESS")
    if not receiver:
        print("Skipping python e2e: RECEIVER_ADDRESS not set.")
        return 0

    # Start server in a daemon thread so it exits when the process exits.
    t = threading.Thread(target=_start_server, args=(receiver,), daemon=True)
    t.start()

    # Give the server a moment to bind.
    import socket
    import time

    for _ in range(30):
        try:
            with socket.create_connection(("127.0.0.1", SERVER_PORT), timeout=1):
                break
        except OSError:
            time.sleep(0.5)
    else:
        raise RuntimeError(f"Server did not start on port {SERVER_PORT}")

    _run_payment_test(payer_key)
    print("python facilitator e2e passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
