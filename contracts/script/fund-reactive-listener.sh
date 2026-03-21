#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env
source contracts/script/lib/env-utils.sh

require_env OWNER_PRIVATE_KEY
require_env REACTIVE_RPC_URL
require_env WILLLEAD_REACTIVE_LISTENER

REACTIVE_SYSTEM_CONTRACT="0x0000000000000000000000000000000000fffFfF"
BUFFER_WEI="${1:-1000000000000000}"

numeric_value() {
  printf '%s' "$1" | awk '{print $1}'
}

listener_balance="$(numeric_value "$(cast balance "$WILLLEAD_REACTIVE_LISTENER" --rpc-url "$REACTIVE_RPC_URL")")"
listener_debt="$(numeric_value "$(cast call "$REACTIVE_SYSTEM_CONTRACT" "debt(address)(uint256)" "$WILLLEAD_REACTIVE_LISTENER" --rpc-url "$REACTIVE_RPC_URL")")"
required_balance=$(( listener_debt + BUFFER_WEI ))

echo "listener_balance=$listener_balance"
echo "listener_debt=$listener_debt"
echo "buffer_wei=$BUFFER_WEI"

if (( listener_balance < required_balance )); then
  shortfall=$(( required_balance - listener_balance ))
  echo "listener_top_up=$shortfall"
  cast send \
    --rpc-url "$REACTIVE_RPC_URL" \
    --private-key "$OWNER_PRIVATE_KEY" \
    --value "$shortfall" \
    "$WILLLEAD_REACTIVE_LISTENER"
else
  echo "listener_top_up=0"
fi

if (( listener_debt > 0 )); then
  echo "listener_cover_debt=running"
  cast send \
    --rpc-url "$REACTIVE_RPC_URL" \
    --private-key "$OWNER_PRIVATE_KEY" \
    "$WILLLEAD_REACTIVE_LISTENER" \
    "coverDebt()"
else
  echo "listener_cover_debt=skipped"
fi

updated_balance="$(numeric_value "$(cast balance "$WILLLEAD_REACTIVE_LISTENER" --rpc-url "$REACTIVE_RPC_URL")")"
updated_debt="$(numeric_value "$(cast call "$REACTIVE_SYSTEM_CONTRACT" "debt(address)(uint256)" "$WILLLEAD_REACTIVE_LISTENER" --rpc-url "$REACTIVE_RPC_URL")")"

echo "updated_listener_balance=$updated_balance"
echo "updated_listener_debt=$updated_debt"
