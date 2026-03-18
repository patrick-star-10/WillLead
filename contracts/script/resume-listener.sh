#!/usr/bin/env bash
set -euo pipefail

source .env

cast send \
  --rpc-url "$REACTIVE_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$WILLLEAD_REACTIVE_LISTENER" \
  "resume()"

