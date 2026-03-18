#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env

TOKEN_ADDRESS="${1:-0x0000000000000000000000000000000000000000}"
RECIPIENT_ADDRESS="${2:-}"
AMOUNT_PER_EXECUTION="${3:-0.01ether}"
MAX_EXECUTIONS="${4:-5}"
MIN_AUTOMATION_BALANCE="${5:-0.005ether}"

if [[ -z "${WILLLEAD_WALLET:-}" || -z "${DESTINATION_RPC_URL:-}" || -z "${OWNER_PRIVATE_KEY:-}" || -z "$RECIPIENT_ADDRESS" ]]; then
  echo "Missing required env or args"
  echo "Usage: ./contracts/script/configure-intent.sh <token> <recipient> [amountPerExecution] [maxExecutions] [minAutomationBalance]"
  exit 1
fi

cast send \
  --rpc-url "$DESTINATION_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$WILLLEAD_WALLET" \
  "configureIntent(address,address,uint256,uint256,uint256)" \
  "$TOKEN_ADDRESS" \
  "$RECIPIENT_ADDRESS" \
  "$AMOUNT_PER_EXECUTION" \
  "$MAX_EXECUTIONS" \
  "$MIN_AUTOMATION_BALANCE"

