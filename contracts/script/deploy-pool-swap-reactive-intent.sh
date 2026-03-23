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
require_env DESTINATION_RPC_URL
require_env ORIGIN_CHAIN_ID
require_env DESTINATION_CHAIN_ID

WATCHED_POOL="${1:-}"
TARGET_INTENT="${2:-}"
POOL_FEE="${3:-10000}"
CALLBACK_GAS_LIMIT="${4:-800000}"
REACTIVE_DEPLOY_VALUE="${REACTIVE_DEPLOY_VALUE:-0.01ether}"

if [[ -z "$WATCHED_POOL" || -z "$TARGET_INTENT" ]]; then
  echo "Usage: ./contracts/script/deploy-pool-swap-reactive-intent.sh <watchedPool> <targetIntent> [poolFee] [callbackGasLimit]"
  exit 1
fi

LISTENER_OUTPUT="$(
  forge create contracts/src/WillLeadPoolSwapListener.sol:WillLeadPoolSwapListener \
    --rpc-url "$REACTIVE_RPC_URL" \
    --private-key "$OWNER_PRIVATE_KEY" \
    --broadcast \
    --value "$REACTIVE_DEPLOY_VALUE" \
    --json \
    --constructor-args "$WATCHED_POOL" "$TARGET_INTENT" "$POOL_FEE" "$ORIGIN_CHAIN_ID" "$DESTINATION_CHAIN_ID" "$CALLBACK_GAS_LIMIT"
)"

LISTENER_ADDRESS="$(echo "$LISTENER_OUTPUT" | jq -r '.deployedTo // .deployed_to // .address')"
SWAP_TOPIC0="$(cast call "$LISTENER_ADDRESS" "swapTopic0()(uint256)" --rpc-url "$REACTIVE_RPC_URL")"
WATCHED_POOL_ID="$(cast call "$LISTENER_ADDRESS" "watchedPoolId()(bytes32)" --rpc-url "$REACTIVE_RPC_URL")"

cast send \
  --rpc-url "$DESTINATION_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$TARGET_INTENT" \
  "configureRuntimeRoute(address,address,bytes32,uint256,uint256,uint256)" \
  "$LISTENER_ADDRESS" \
  "$WATCHED_POOL" \
  "$WATCHED_POOL_ID" \
  "$ORIGIN_CHAIN_ID" \
  "$DESTINATION_CHAIN_ID" \
  "$SWAP_TOPIC0" >/dev/null

echo "PoolSwapListener: $LISTENER_ADDRESS"
echo "WatchedPool: $WATCHED_POOL"
echo "WatchedPoolId: $WATCHED_POOL_ID"
