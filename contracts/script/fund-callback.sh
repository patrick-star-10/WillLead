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
TARGET_ACCOUNT_OVERRIDE="${2:-}"

require_env OWNER_PRIVATE_KEY
require_execution_env "$EXECUTION_ENV" CALLBACK_PROXY
require_execution_env "$EXECUTION_ENV" DESTINATION_RPC_URL
CALLBACK_PROXY="$(execution_env_value "$EXECUTION_ENV" CALLBACK_PROXY)"
DESTINATION_RPC_URL="$(execution_env_value "$EXECUTION_ENV" DESTINATION_RPC_URL)"
DEFAULT_TARGET_ACCOUNT="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET)"
TARGET_ACCOUNT="${TARGET_ACCOUNT_OVERRIDE:-$DEFAULT_TARGET_ACCOUNT}"

if [[ -z "$TARGET_ACCOUNT" ]]; then
  echo "Missing target account. Pass it as the second argument or configure WILLLEAD_WALLET for EXECUTION_ENV=$EXECUTION_ENV."
  exit 1
fi

cast send \
  --rpc-url "$DESTINATION_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$CALLBACK_PROXY" \
  "depositTo(address)" \
  "$TARGET_ACCOUNT" \
  --value "$AMOUNT"

echo "execution_env=$EXECUTION_ENV"
echo "callback_target=$TARGET_ACCOUNT"
