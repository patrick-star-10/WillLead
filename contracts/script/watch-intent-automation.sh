#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env
source contracts/script/lib/env-utils.sh

require_env DESTINATION_RPC_URL
require_env WILLLEAD_WALLET

POLL_INTERVAL="${1:-5}"
LOOKBACK_BLOCKS="${2:-200}"
RUN_MODE="${3:-}"

last_seen_id=""

echo "intent_watch=starting"
echo "wallet=$WILLLEAD_WALLET"
echo "poll_interval=$POLL_INTERVAL"
echo "lookback_blocks=$LOOKBACK_BLOCKS"

process_latest_intent() {
  local current_block from_block logs_json latest_log latest_id tx_hash block_number

  current_block="$(cast block-number --rpc-url "$DESTINATION_RPC_URL")"
  from_block=$(( current_block > LOOKBACK_BLOCKS ? current_block - LOOKBACK_BLOCKS : 0 ))

  logs_json="$(
    cast logs \
      "IntentConfigured(address,address,address,uint256,uint256,uint256)" \
      --address "$WILLLEAD_WALLET" \
      --from-block "$from_block" \
      --to-block latest \
      --rpc-url "$DESTINATION_RPC_URL" \
      --json
  )"

  latest_log="$(printf '%s' "$logs_json" | jq 'if length == 0 then null else .[-1] end')"

  if [[ "$latest_log" == "null" ]]; then
    if [[ "$RUN_MODE" == "--once" ]]; then
      echo "intent_watch=no_events"
    fi
    return 0
  fi

  latest_id="$(printf '%s' "$latest_log" | jq -r '"\(.blockNumber)-\(.logIndex)-\(.transactionHash)"')"
  if [[ "$latest_id" == "$last_seen_id" ]]; then
    if [[ "$RUN_MODE" == "--once" ]]; then
      echo "intent_watch=no_new_events"
      echo "latest_intent_id=$latest_id"
    fi
    return 0
  fi

  last_seen_id="$latest_id"
  tx_hash="$(printf '%s' "$latest_log" | jq -r '.transactionHash')"
  block_number="$(printf '%s' "$latest_log" | jq -r '.blockNumber')"

  echo "intent_watch=detected"
  echo "intent_block=$block_number"
  echo "intent_tx=$tx_hash"

  ./contracts/script/ensure-listener-armed.sh
}

while true; do
  process_latest_intent

  if [[ "$RUN_MODE" == "--once" ]]; then
    exit 0
  fi

  sleep "$POLL_INTERVAL"
done
