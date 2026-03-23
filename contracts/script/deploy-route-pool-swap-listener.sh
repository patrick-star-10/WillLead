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
require_env ORIGIN_CHAIN_ID
require_env DESTINATION_CHAIN_ID

WATCHED_POOL="${1:-}"
TARGET_INTENT="${2:-}"
ROUTE_ID="${3:-}"
POOL_FEE="${4:-10000}"
CALLBACK_GAS_LIMIT="${5:-800000}"
REACTIVE_DEPLOY_VALUE="${REACTIVE_DEPLOY_VALUE:-0.01ether}"

if [[ -z "$WATCHED_POOL" || -z "$TARGET_INTENT" || -z "$ROUTE_ID" ]]; then
  echo "Usage: ./contracts/script/deploy-route-pool-swap-listener.sh <watchedPool> <targetIntent> <routeId> [poolFee] [callbackGasLimit]"
  exit 1
fi

LISTENER_OUTPUT="$(
  forge create contracts/src/WillLeadRoutePoolSwapListener.sol:WillLeadRoutePoolSwapListener \
    --rpc-url "$REACTIVE_RPC_URL" \
    --private-key "$OWNER_PRIVATE_KEY" \
    --broadcast \
    --value "$REACTIVE_DEPLOY_VALUE" \
    --json \
    --constructor-args "$WATCHED_POOL" "$TARGET_INTENT" "$ROUTE_ID" "$POOL_FEE" "$ORIGIN_CHAIN_ID" "$DESTINATION_CHAIN_ID" "$CALLBACK_GAS_LIMIT"
)"

LISTENER_ADDRESS="$(echo "$LISTENER_OUTPUT" | jq -r '.deployedTo // .deployed_to // .address')"

cast send \
  --rpc-url "$REACTIVE_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$LISTENER_ADDRESS" \
  "repairSubscriptions()" >/dev/null

echo "RoutePoolSwapListener: $LISTENER_ADDRESS"
echo "WatchedPool: $WATCHED_POOL"
echo "RouteId: $ROUTE_ID"
