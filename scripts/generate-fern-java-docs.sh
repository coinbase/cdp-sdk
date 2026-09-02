#!/usr/bin/env bash
# Generates the Java SDK README.md and reference.md for the cdp-docs pipeline.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_FERN_DIR=""

if [ -z "${CDP_FERN_DIR:-}" ]; then
  TEMP_FERN_DIR="$(mktemp -d)"
  trap 'rm -rf "${TEMP_FERN_DIR}"' EXIT
  git clone --depth 1 https://coinbase.ghe.com/c3/cdp-fern.git "${TEMP_FERN_DIR}/cdp-fern"
  export CDP_FERN_DIR="${TEMP_FERN_DIR}/cdp-fern"
fi

export CDP_FERN_JAVA_GROUP=docs
"${SCRIPT_DIR}/generate-fern-java.sh"
