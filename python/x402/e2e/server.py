#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["cdp-sdk", "x402[flask,evm]", "flask", "werkzeug"]
# ///
"""
Flask x402 resource server for e2e testing.

Starts a Flask server protected by x402 using the CDP hosted facilitator.
Prints "READY" to stdout once listening so the test runner knows to proceed.

Required environment variables:
  CDP_API_KEY_ID, CDP_API_KEY_SECRET — CDP API credentials
  PAY_TO                             — EVM address that receives payments

Optional:
  E2E_SERVER_PORT — TCP port to listen on (default: 4023)

Run:
  PAY_TO=0x... uv run ./e2e/server.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path


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


def main() -> None:
    _load_env()

    pay_to = os.environ.get("PAY_TO")
    if not pay_to:
        sys.exit("PAY_TO env var required (0x... EVM address)")

    port = int(os.environ.get("E2E_SERVER_PORT", "4023"))

    python_root = str(Path(__file__).resolve().parents[1])
    sys.path.insert(0, python_root)

    from flask import Flask, jsonify
    from werkzeug.serving import make_server
    from x402.mechanisms.evm.exact import ExactEvmServerScheme
    from x402.http.middleware.flask import PaymentMiddleware
    from x402.server import x402ResourceServerSync
    from cdp_x402.core import create_cdp_facilitator_client_sync  # noqa: PLC0415

    app = Flask(__name__)

    facilitator = create_cdp_facilitator_client_sync()
    resource_server = x402ResourceServerSync(facilitator)
    resource_server.register("eip155:84532", ExactEvmServerScheme())

    routes = {
        "GET /protected": {
            "accepts": {
                "scheme": "exact",
                "price": "$0.001",
                "network": "eip155:84532",  # Base Sepolia
                "payTo": pay_to,
                "maxTimeoutSeconds": 300,
            },
            "description": "x402 e2e test endpoint",
        },
    }

    PaymentMiddleware(app, routes, resource_server)

    @app.get("/protected")
    def protected() -> object:
        return jsonify({"message": "payment accepted"})

    @app.get("/health")
    def health() -> object:
        return jsonify({"status": "ok"})

    srv = make_server("0.0.0.0", port, app)
    print("READY", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
