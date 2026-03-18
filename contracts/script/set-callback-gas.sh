#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env

NEW_GAS_LIMIT="${1:-1000000}"

cast send \
  --rpc-url "$REACTIVE_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$WILLLEAD_REACTIVE_LISTENER" \
  "setCallbackGasLimit(uint64)" \
  "$NEW_GAS_LIMIT"
