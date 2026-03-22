#!/usr/bin/env bash
set -euo pipefail

source .env
source contracts/script/lib/env-utils.sh

EXECUTION_ENV="${EXECUTION_ENV:-primary}"

require_env OWNER_PRIVATE_KEY
require_execution_env "$EXECUTION_ENV" DESTINATION_RPC_URL
require_execution_env "$EXECUTION_ENV" WILLLEAD_WALLET

DESTINATION_RPC_URL="$(execution_env_value "$EXECUTION_ENV" DESTINATION_RPC_URL)"
WILLLEAD_WALLET="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET)"

cast send \
  --rpc-url "$DESTINATION_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$WILLLEAD_WALLET" \
  "pauseIntent()"
