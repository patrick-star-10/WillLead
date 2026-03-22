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
MAX_EXECUTIONS="${4:-5}"
MIN_AUTOMATION_BALANCE="${5:-0.005ether}"

require_env OWNER_PRIVATE_KEY
require_execution_env "$EXECUTION_ENV" WILLLEAD_WALLET
require_execution_env "$EXECUTION_ENV" DESTINATION_RPC_URL

WILLLEAD_WALLET="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET)"
DESTINATION_RPC_URL="$(execution_env_value "$EXECUTION_ENV" DESTINATION_RPC_URL)"

if [[ -z "$RECIPIENT_ADDRESS" ]]; then
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

echo "execution_env=$EXECUTION_ENV"
echo "intent_status=configured"
EXECUTION_ENV="$EXECUTION_ENV" ./contracts/script/ensure-listener-armed.sh
