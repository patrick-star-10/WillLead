#!/usr/bin/env bash
set -euo pipefail

source .env

cast send \
  --rpc-url "$DESTINATION_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$WILLLEAD_WALLET" \
  "resumeIntent()"

