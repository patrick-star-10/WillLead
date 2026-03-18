#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env

TARGET_NONCE="${1:-}"
TIMEOUT_SECONDS="${2:-90}"
POLL_INTERVAL="${3:-5}"

if [[ -z "$TARGET_NONCE" ]]; then
  echo "Usage: ./contracts/script/wait-for-execution.sh <targetNonce> [timeoutSeconds] [pollInterval]"
  exit 1
fi

reactive_latest="$(cast block-number --rpc-url "$REACTIVE_RPC_URL")"
destination_latest="$(cast block-number --rpc-url "$DESTINATION_RPC_URL")"

reactive_from=$(( reactive_latest > 2 ? reactive_latest - 2 : 0 ))
destination_from=$(( destination_latest > 2 ? destination_latest - 2 : 0 ))

deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))

echo "target_nonce=$TARGET_NONCE"
echo "timeout_seconds=$TIMEOUT_SECONDS"
echo "poll_interval=$POLL_INTERVAL"
echo "reactive_from_block=$reactive_from"
echo "destination_from_block=$destination_from"
echo "status=waiting"

latest_reactive_tx=""
latest_destination_tx=""

while (( $(date +%s) <= deadline )); do
  current_nonce="$(cast call "$WILLLEAD_WALLET" "lastExecutionNonce()(uint256)" --rpc-url "$DESTINATION_RPC_URL")"
  listener_paused="$(cast call "$WILLLEAD_REACTIVE_LISTENER" "isPaused()(bool)" --rpc-url "$REACTIVE_RPC_URL")"

  reactive_logs="$(
    cast logs \
      "Callback(uint256,address,uint64,bytes)" \
      "$DESTINATION_CHAIN_ID" \
      "$WILLLEAD_WALLET" \
      --address "$WILLLEAD_REACTIVE_LISTENER" \
      --from-block "$reactive_from" \
      --to-block latest \
      --rpc-url "$REACTIVE_RPC_URL" \
      --json
  )"

  destination_logs="$(
    cast logs \
      "IntentExecuted(address,address,address,uint256,uint256,bytes32,uint256)" \
      "$WILLLEAD_WALLET" \
      --address "$WILLLEAD_WALLET" \
      --from-block "$destination_from" \
      --to-block latest \
      --rpc-url "$DESTINATION_RPC_URL" \
      --json
  )"

  latest_reactive_tx="$(echo "$reactive_logs" | jq -r 'if length == 0 then "" else .[-1].transactionHash end')"
  latest_destination_tx="$(echo "$destination_logs" | jq -r 'if length == 0 then "" else .[-1].transactionHash end')"

  echo "current_nonce=$current_nonce listener_paused=$listener_paused reactive_callback_seen=$([[ -n "$latest_reactive_tx" ]] && echo true || echo false) destination_execution_seen=$([[ -n "$latest_destination_tx" ]] && echo true || echo false)"

  if (( current_nonce >= TARGET_NONCE )) && [[ -n "$latest_destination_tx" ]]; then
    echo "status=confirmed"
    if [[ -n "$latest_reactive_tx" ]]; then
      echo "reactive_tx=$latest_reactive_tx"
    fi
    echo "destination_tx=$latest_destination_tx"
    exit 0
  fi

  sleep "$POLL_INTERVAL"
done

echo "status=timeout"
if [[ "$listener_paused" == "true" ]]; then
  echo "hint=reactive listener is paused"
fi
echo "hint=run ./contracts/script/status-snapshot.sh and ./contracts/script/collect-proof.sh"
exit 1
