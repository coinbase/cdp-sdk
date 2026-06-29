#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../contracts"
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2
forge install aave/aave-v3-core@v1.19.4
forge build
