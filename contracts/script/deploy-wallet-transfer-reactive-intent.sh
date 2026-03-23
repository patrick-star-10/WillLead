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

WATCHED_TOKEN="${1:-}"
WATCHED_WALLET="${2:-}"
TARGET_INTENT="${3:-}"
CALLBACK_GAS_LIMIT="${4:-800000}"
WATCH_INCOMING="${5:-true}"
WATCH_OUTGOING="${6:-false}"
ROUTE_ID="${7:-}"
REACTIVE_DEPLOY_VALUE="${REACTIVE_DEPLOY_VALUE:-0.01ether}"

if [[ -z "$WATCHED_TOKEN" || -z "$WATCHED_WALLET" || -z "$TARGET_INTENT" ]]; then
  echo "Usage: ./contracts/script/deploy-wallet-transfer-reactive-intent.sh <watchedToken> <watchedWallet> <targetIntent> [callbackGasLimit] [watchIncoming] [watchOutgoing] [routeId]"
  exit 1
fi

if [[ -z "$ROUTE_ID" ]]; then
  ROUTE_ID="$(cast keccak "wallet-transfer:${WATCHED_TOKEN}:${WATCHED_WALLET}:${TARGET_INTENT}" | awk '{print $1}')"
fi

LISTENER_OUTPUT="$(
  forge create contracts/src/WillLeadWalletTransferListener.sol:WillLeadWalletTransferListener \
    --rpc-url "$REACTIVE_RPC_URL" \
    --private-key "$OWNER_PRIVATE_KEY" \
    --broadcast \
    --value "$REACTIVE_DEPLOY_VALUE" \
    --json \
    --constructor-args "$WATCHED_TOKEN" "$WATCHED_WALLET" "$TARGET_INTENT" "$ROUTE_ID" "$ORIGIN_CHAIN_ID" "$DESTINATION_CHAIN_ID" "$CALLBACK_GAS_LIMIT" "$WATCH_INCOMING" "$WATCH_OUTGOING"
)"

LISTENER_ADDRESS="$(echo "$LISTENER_OUTPUT" | jq -r '.deployedTo // .deployed_to // .address')"
SWAP_TOPIC0="$(cast call "$LISTENER_ADDRESS" "swapTopic0()(uint256)" --rpc-url "$REACTIVE_RPC_URL" | awk '{print $1}')"
WATCHED_POOL_ID="$(cast call "$LISTENER_ADDRESS" "watchedPoolId()(bytes32)" --rpc-url "$REACTIVE_RPC_URL" | awk '{print $1}')"

cast send \
  --rpc-url "$REACTIVE_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$LISTENER_ADDRESS" \
  "repairSubscriptions()" >/dev/null

cast send \
  --rpc-url "$DESTINATION_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$TARGET_INTENT" \
  "configureRuntimeRoute(address,address,bytes32,uint256,uint256,uint256)" \
  "$LISTENER_ADDRESS" \
  "$WATCHED_TOKEN" \
  "$WATCHED_POOL_ID" \
  "$ORIGIN_CHAIN_ID" \
  "$DESTINATION_CHAIN_ID" \
  "$SWAP_TOPIC0" >/dev/null

echo "WalletTransferListener: $LISTENER_ADDRESS"
echo "WatchedToken: $WATCHED_TOKEN"
echo "WatchedWallet: $WATCHED_WALLET"
echo "WatchedPoolId: $WATCHED_POOL_ID"
