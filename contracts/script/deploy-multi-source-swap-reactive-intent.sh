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

SOURCES_CSV="${1:-}"
TOPICS_CSV="${2:-}"
FEES_CSV="${3:-}"
TOPIC1_FLAGS_CSV="${4:-}"
TARGET_CALLBACK_CONTRACT="${5:-}"
CALLBACK_GAS_LIMIT="${6:-800000}"
ROUTE_ID="${7:-}"
REACTIVE_DEPLOY_VALUE="${REACTIVE_DEPLOY_VALUE:-0.01ether}"

if [[ -z "$SOURCES_CSV" || -z "$TOPICS_CSV" || -z "$FEES_CSV" || -z "$TOPIC1_FLAGS_CSV" || -z "$TARGET_CALLBACK_CONTRACT" ]]; then
  echo "Usage: ./contracts/script/deploy-multi-source-swap-reactive-intent.sh <sources_csv> <topics_csv> <fees_csv> <topic1_flags_csv> <targetCallbackContract> [callbackGasLimit] [routeId]"
  echo "Example topics: 0xc420...,0xd78ad9..."
  echo "Example flags: true,true,false"
  exit 1
fi

normalize_array_arg() {
  local value="$1"
  if [[ "$value" == \[*\] ]]; then
    echo "$value"
  else
    echo "[$value]"
  fi
}

SOURCES_ARG="$(normalize_array_arg "$SOURCES_CSV")"
TOPICS_ARG="$(normalize_array_arg "$TOPICS_CSV")"
FEES_ARG="$(normalize_array_arg "$FEES_CSV")"
TOPIC1_FLAGS_ARG="$(normalize_array_arg "$TOPIC1_FLAGS_CSV")"

IFS=',' read -r -a SOURCES <<< "$SOURCES_CSV"
IFS=',' read -r -a TOPICS <<< "$TOPICS_CSV"
IFS=',' read -r -a FEES <<< "$FEES_CSV"
IFS=',' read -r -a TOPIC1_FLAGS <<< "$TOPIC1_FLAGS_CSV"

COUNT="${#SOURCES[@]}"
if [[ "$COUNT" -eq 0 || "${#TOPICS[@]}" -ne "$COUNT" || "${#FEES[@]}" -ne "$COUNT" || "${#TOPIC1_FLAGS[@]}" -ne "$COUNT" ]]; then
  echo "All CSV lists must have the same non-zero length"
  exit 1
fi

if [[ -z "$ROUTE_ID" ]]; then
  ROUTE_ID="$(cast keccak "$(cast from-utf8 "$SOURCES_CSV|$TOPICS_CSV|$TARGET_CALLBACK_CONTRACT")")"
fi

LISTENER_OUTPUT="$(
  forge create contracts/src/WillLeadMultiSourceSwapListener.sol:WillLeadMultiSourceSwapListener \
    --rpc-url "$REACTIVE_RPC_URL" \
    --private-key "$OWNER_PRIVATE_KEY" \
    --broadcast \
    --value "$REACTIVE_DEPLOY_VALUE" \
    --json \
    --constructor-args "$SOURCES_ARG" "$TOPICS_ARG" "$FEES_ARG" "$TOPIC1_FLAGS_ARG" "$TARGET_CALLBACK_CONTRACT" "$ROUTE_ID" "$ORIGIN_CHAIN_ID" "$DESTINATION_CHAIN_ID" "$CALLBACK_GAS_LIMIT"
)"

LISTENER_ADDRESS="$(echo "$LISTENER_OUTPUT" | jq -r '.deployedTo // .deployed_to // .address')"

cast send \
  --rpc-url "$REACTIVE_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$LISTENER_ADDRESS" \
  "repairSubscriptions()" >/dev/null

if cast call \
  "$TARGET_CALLBACK_CONTRACT" \
  "getSwapRuntimeBinding()(address,address,bytes32,uint256,uint256,uint256)" \
  --rpc-url "$DESTINATION_RPC_URL" >/dev/null 2>&1; then
  cast send \
    --rpc-url "$DESTINATION_RPC_URL" \
    --private-key "$OWNER_PRIVATE_KEY" \
    "$TARGET_CALLBACK_CONTRACT" \
    "configureSwapRuntimeRoute(address,address,bytes32,uint256,uint256,uint256)" \
    "$LISTENER_ADDRESS" \
    "${SOURCES[0]}" \
    "$ROUTE_ID" \
    "$ORIGIN_CHAIN_ID" \
    "$DESTINATION_CHAIN_ID" \
    "${TOPICS[0]}" >/dev/null
else
  cast send \
    --rpc-url "$DESTINATION_RPC_URL" \
    --private-key "$OWNER_PRIVATE_KEY" \
    "$TARGET_CALLBACK_CONTRACT" \
    "configureRuntimeRoute(address,address,bytes32,uint256,uint256,uint256)" \
    "$LISTENER_ADDRESS" \
    "${SOURCES[0]}" \
    "$ROUTE_ID" \
    "$ORIGIN_CHAIN_ID" \
    "$DESTINATION_CHAIN_ID" \
    "${TOPICS[0]}" >/dev/null
fi

echo "MultiSourceSwapListener: $LISTENER_ADDRESS"
echo "CallbackTarget: $TARGET_CALLBACK_CONTRACT"
echo "PrimarySource: ${SOURCES[0]}"
echo "RouteId: $ROUTE_ID"
echo "WatchedSources: $SOURCES_CSV"
