#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env
source contracts/script/lib/env-utils.sh

EXECUTION_ENV="${EXECUTION_ENV:-primary}"

DEFAULT_WALLET_ADDRESS="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET)"
WILLLEAD_SIGNAL_EMITTER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_SIGNAL_EMITTER)"
WALLET_ADDRESS="${1:-${DEFAULT_WALLET_ADDRESS:-}}"
EXECUTION_NONCE="${2:-}"
CALLER_PRIVATE_KEY="${POKE_PRIVATE_KEY:-${OWNER_PRIVATE_KEY:-}}"

if [[ -z "${WILLLEAD_SIGNAL_EMITTER:-}" || -z "${ORIGIN_RPC_URL:-}" || -z "$CALLER_PRIVATE_KEY" || -z "$WALLET_ADDRESS" || -z "$EXECUTION_NONCE" ]]; then
  echo "Missing required env or args"
  echo "Usage: ./contracts/script/poke-signal.sh [wallet] <executionNonce>"
  exit 1
fi

cast send \
  --rpc-url "$ORIGIN_RPC_URL" \
  --private-key "$CALLER_PRIVATE_KEY" \
  "$WILLLEAD_SIGNAL_EMITTER" \
  "poke(address,uint256)" \
  "$WALLET_ADDRESS" \
  "$EXECUTION_NONCE"

echo "execution_env=$EXECUTION_ENV"
