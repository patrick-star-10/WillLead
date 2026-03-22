#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env
source contracts/script/lib/env-utils.sh

EXECUTION_ENV="${EXECUTION_ENV:-primary}"

TOKEN_ADDRESS="${1:-0x0000000000000000000000000000000000000000}"
RECIPIENT_ADDRESS="${2:-}"
AMOUNT_PER_EXECUTION="${3:-0.01ether}"
EXECUTION_NONCE="${4:-1}"

require_env ORIGIN_RPC_URL
require_env OWNER_PRIVATE_KEY
require_execution_env "$EXECUTION_ENV" WILLLEAD_SIGNAL_EMITTER
require_execution_env "$EXECUTION_ENV" WILLLEAD_WALLET

WILLLEAD_SIGNAL_EMITTER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_SIGNAL_EMITTER)"
WILLLEAD_WALLET="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET)"

if [[ -z "$RECIPIENT_ADDRESS" ]]; then
  echo "Missing required env or args"
  echo "Usage: ./contracts/script/emit-signal.sh <token> <recipient> [amountPerExecution] [executionNonce]"
  exit 1
fi

cast send \
  --rpc-url "$ORIGIN_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$WILLLEAD_SIGNAL_EMITTER" \
  "emitSignal(address,address,address,uint256,uint256)" \
  "$WILLLEAD_WALLET" \
  "$TOKEN_ADDRESS" \
  "$RECIPIENT_ADDRESS" \
  "$AMOUNT_PER_EXECUTION" \
  "$EXECUTION_NONCE"

echo "execution_env=$EXECUTION_ENV"
