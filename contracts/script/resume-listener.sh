#!/usr/bin/env bash
set -euo pipefail

source .env
source contracts/script/lib/env-utils.sh

EXECUTION_ENV="${EXECUTION_ENV:-primary}"

require_env OWNER_PRIVATE_KEY
require_env REACTIVE_RPC_URL
require_execution_env "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER

WILLLEAD_REACTIVE_LISTENER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER)"

cast send \
  --rpc-url "$REACTIVE_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$WILLLEAD_REACTIVE_LISTENER" \
  "resume()"
