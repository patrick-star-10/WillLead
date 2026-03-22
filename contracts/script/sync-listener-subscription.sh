#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env
source contracts/script/lib/env-utils.sh

EXECUTION_ENV="${EXECUTION_ENV:-primary}"

require_env OWNER_PRIVATE_KEY
require_env REACTIVE_RPC_URL
require_env AUTHORIZED_RVM_ID
require_execution_env "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER

CHECK_ONLY="${1:-}"
REACTIVE_SYSTEM_CONTRACT="0x0000000000000000000000000000000000fffFfF"
REACTIVE_IGNORE="0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad"
STRATEGY_SIGNAL_TOPIC0="0xe45289780e7528d2841b99cd319e5c8b096bbcabe47294706cae408a97267f92"
SUBSCRIBE_EVENT_TOPIC0="0xf2856a60f496a79f2738ebb36013248bb2f4a85116d90c2a595a96ef780137d2"
WILLLEAD_REACTIVE_LISTENER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER)"

lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

topic_for_address() {
  local value
  value="$(lower "${1#0x}")"
  printf '0x%064s' "$value" | tr ' ' '0'
}

topic_for_uint() {
  printf '0x%064x' "$1"
}

signal_emitter="$(cast call "$WILLLEAD_REACTIVE_LISTENER" "signalEmitter()(address)" --rpc-url "$REACTIVE_RPC_URL" | awk '{print $1}')"
origin_chain_id="$(cast call "$WILLLEAD_REACTIVE_LISTENER" "originChainId()(uint256)" --rpc-url "$REACTIVE_RPC_URL" | awk '{print $1}')"

subscription_logs_json="$(
  curl --silent --show-error \
    --header 'Content-Type: application/json' \
    --data "$(
      jq -cn \
        --arg address "$REACTIVE_SYSTEM_CONTRACT" \
        --arg topic0 "$SUBSCRIBE_EVENT_TOPIC0" \
        --arg topic1 "$(topic_for_address "$WILLLEAD_REACTIVE_LISTENER")" \
        --arg topic2 "$(topic_for_uint "$origin_chain_id")" \
        --arg topic3 "$(topic_for_address "$signal_emitter")" \
        '{
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getLogs",
          params: [
            {
              address: $address,
              fromBlock: "0x0",
              topics: [$topic0, $topic1, $topic2, $topic3]
            }
          ]
        }'
    )" \
    "$REACTIVE_RPC_URL"
)"

matching_subscription_count="$(
  printf '%s' "$subscription_logs_json" | jq -r \
    --arg strategy_topic0 "$(lower "${STRATEGY_SIGNAL_TOPIC0#0x}")" \
    --arg authorized_rvm_id "$(lower "${AUTHORIZED_RVM_ID#0x}")" \
    '
      if .error then
        .error | @json | halt_error(1)
      else
        [
          (.result // [])[]
          | select(((.data[2:66] // "") | ascii_downcase) == $strategy_topic0)
          | select(((.data[282:322] // "") | ascii_downcase) == $authorized_rvm_id)
        ] | length
      end
    '
)"

if [[ "$matching_subscription_count" != "0" ]]; then
  echo "execution_env=$EXECUTION_ENV"
  echo "listener_subscription=ok"
  echo "signal_emitter=$signal_emitter"
  echo "origin_chain_id=$origin_chain_id"
  echo "matching_subscriptions=$matching_subscription_count"
  exit 0
fi

if [[ "$CHECK_ONLY" == "--check" ]]; then
  echo "execution_env=$EXECUTION_ENV"
  echo "listener_subscription=missing"
  echo "signal_emitter=$signal_emitter"
  echo "origin_chain_id=$origin_chain_id"
  exit 1
fi

echo "execution_env=$EXECUTION_ENV"
echo "listener_subscription=syncing"
cast send \
  --rpc-url "$REACTIVE_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$REACTIVE_SYSTEM_CONTRACT" \
  "subscribeContract(address,uint256,address,uint256,uint256,uint256,uint256)" \
  "$WILLLEAD_REACTIVE_LISTENER" \
  "$origin_chain_id" \
  "$signal_emitter" \
  "$STRATEGY_SIGNAL_TOPIC0" \
  "$REACTIVE_IGNORE" \
  "$REACTIVE_IGNORE" \
  "$REACTIVE_IGNORE"

echo "listener_subscription=synced"
