#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env

AMOUNT="${1:-0.02ether}"

if [[ -z "${CALLBACK_PROXY:-}" || -z "${DESTINATION_RPC_URL:-}" || -z "${OWNER_PRIVATE_KEY:-}" || -z "${WILLLEAD_WALLET:-}" ]]; then
  echo "Missing required env"
  echo "Usage: ./contracts/script/fund-callback.sh [amount]"
  exit 1
fi

cast send \
  --rpc-url "$DESTINATION_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$CALLBACK_PROXY" \
  "depositTo(address)" \
  "$WILLLEAD_WALLET" \
  --value "$AMOUNT"
