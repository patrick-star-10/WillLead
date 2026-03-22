#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env
source contracts/script/lib/env-utils.sh

EXECUTION_ENV="${EXECUTION_ENV:-primary}"

AMOUNT="${1:-0.02ether}"

require_env OWNER_PRIVATE_KEY
require_execution_env "$EXECUTION_ENV" CALLBACK_PROXY
require_execution_env "$EXECUTION_ENV" DESTINATION_RPC_URL
require_execution_env "$EXECUTION_ENV" WILLLEAD_WALLET

CALLBACK_PROXY="$(execution_env_value "$EXECUTION_ENV" CALLBACK_PROXY)"
DESTINATION_RPC_URL="$(execution_env_value "$EXECUTION_ENV" DESTINATION_RPC_URL)"
WILLLEAD_WALLET="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET)"

cast send \
  --rpc-url "$DESTINATION_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$CALLBACK_PROXY" \
  "depositTo(address)" \
  "$WILLLEAD_WALLET" \
  --value "$AMOUNT"

echo "execution_env=$EXECUTION_ENV"
