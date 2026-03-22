#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env
source contracts/script/lib/env-utils.sh

EXECUTION_ENV="${EXECUTION_ENV:-primary}"

NEW_GAS_LIMIT="${1:-1000000}"
require_env OWNER_PRIVATE_KEY
require_env REACTIVE_RPC_URL
require_execution_env "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER

WILLLEAD_REACTIVE_LISTENER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER)"

cast send \
  --rpc-url "$REACTIVE_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$WILLLEAD_REACTIVE_LISTENER" \
  "setCallbackGasLimit(uint64)" \
  "$NEW_GAS_LIMIT"
