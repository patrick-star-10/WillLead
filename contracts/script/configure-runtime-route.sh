#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env
source contracts/script/lib/env-utils.sh

EXECUTION_ENV="${EXECUTION_ENV:-primary}"

LISTENER_ADDRESS="${1:-}"
SIGNAL_EMITTER_ADDRESS="${2:-}"
SOURCE_CHAIN_ID="${3:-}"
RUNTIME_DESTINATION_CHAIN_ID="${4:-$(execution_env_value "$EXECUTION_ENV" DESTINATION_CHAIN_ID)}"
RUNTIME_SIGNAL_TOPIC0="${5:-}"

if [[ -z "$RUNTIME_SIGNAL_TOPIC0" ]]; then
  RUNTIME_SIGNAL_TOPIC0="$(cast keccak 'StrategySignal(address,address,address,uint256,uint256,uint256)')"
fi

require_env OWNER_PRIVATE_KEY
require_env REACTIVE_RPC_URL
require_execution_env "$EXECUTION_ENV" WILLLEAD_WALLET
require_execution_env "$EXECUTION_ENV" DESTINATION_RPC_URL

WILLLEAD_WALLET="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET)"
DESTINATION_RPC_URL="$(execution_env_value "$EXECUTION_ENV" DESTINATION_RPC_URL)"
DESTINATION_CHAIN_ID="$(execution_env_value "$EXECUTION_ENV" DESTINATION_CHAIN_ID)"

if [[ -z "$LISTENER_ADDRESS" || -z "$SIGNAL_EMITTER_ADDRESS" || -z "$SOURCE_CHAIN_ID" || -z "$RUNTIME_DESTINATION_CHAIN_ID" ]]; then
  echo "Missing required env or args"
  echo "Usage: ./contracts/script/configure-runtime-route.sh <listener> <signalEmitter> <sourceChainId> [destinationChainId] [signalTopic0]"
  exit 1
fi

lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

code="$(cast code "$LISTENER_ADDRESS" --rpc-url "$REACTIVE_RPC_URL")"
if [[ "$code" == "0x" ]]; then
  echo "route_check=failed"
  echo "reason=listener has no code on reactive chain"
  exit 1
fi

listener_signal_emitter="$(
  cast call "$LISTENER_ADDRESS" "signalEmitter()(address)" --rpc-url "$REACTIVE_RPC_URL" | awk '{print $1}'
)"
listener_origin_chain_id="$(
  cast call "$LISTENER_ADDRESS" "originChainId()(uint256)" --rpc-url "$REACTIVE_RPC_URL" | awk '{print $1}'
)"
listener_destination_chain_id="$(
  cast call "$LISTENER_ADDRESS" "destinationChainId()(uint256)" --rpc-url "$REACTIVE_RPC_URL" | awk '{print $1}'
)"
listener_strategy_signal_topic0="$(
  cast call "$LISTENER_ADDRESS" "strategySignalTopic0()(uint256)" --rpc-url "$REACTIVE_RPC_URL" | awk '{print $1}'
)"

echo "route_check=checking"
echo "execution_env=$EXECUTION_ENV"
echo "listener=$LISTENER_ADDRESS"
echo "listener_signal_emitter=$listener_signal_emitter"
echo "listener_origin_chain_id=$listener_origin_chain_id"
echo "listener_destination_chain_id=$listener_destination_chain_id"
echo "listener_strategy_signal_topic0=$listener_strategy_signal_topic0"

if [[ -n "${ORIGIN_CHAIN_ID:-}" && "$SOURCE_CHAIN_ID" != "$ORIGIN_CHAIN_ID" ]]; then
  echo "route_check=failed"
  echo "reason=requested source chain id does not match local ORIGIN_CHAIN_ID"
  exit 1
fi

if [[ -n "${DESTINATION_CHAIN_ID:-}" && "$RUNTIME_DESTINATION_CHAIN_ID" != "$DESTINATION_CHAIN_ID" ]]; then
  echo "route_check=failed"
  echo "reason=requested destination chain id does not match local DESTINATION_CHAIN_ID"
  exit 1
fi

if [[ "$(lower "$listener_signal_emitter")" != "$(lower "$SIGNAL_EMITTER_ADDRESS")" ]]; then
  echo "route_check=failed"
  echo "reason=listener signal emitter does not match requested emitter"
  exit 1
fi

if [[ "$listener_origin_chain_id" != "$SOURCE_CHAIN_ID" ]]; then
  echo "route_check=failed"
  echo "reason=listener origin chain id does not match requested source chain id"
  exit 1
fi

if [[ "$listener_destination_chain_id" != "$RUNTIME_DESTINATION_CHAIN_ID" ]]; then
  echo "route_check=failed"
  echo "reason=listener destination chain id does not match requested destination chain id"
  exit 1
fi

if [[ "$(lower "$listener_strategy_signal_topic0")" != "$(lower "$RUNTIME_SIGNAL_TOPIC0")" ]]; then
  echo "route_check=failed"
  echo "reason=listener topic0 does not match requested signal topic"
  exit 1
fi

echo "route_check=ok"

cast send \
  --rpc-url "$DESTINATION_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$WILLLEAD_WALLET" \
  "configureRuntimeRoute(address,address,uint256,uint256,uint256)" \
  "$LISTENER_ADDRESS" \
  "$SIGNAL_EMITTER_ADDRESS" \
  "$SOURCE_CHAIN_ID" \
  "$RUNTIME_DESTINATION_CHAIN_ID" \
  "$RUNTIME_SIGNAL_TOPIC0"

echo "runtime_route=configured"
