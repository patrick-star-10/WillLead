#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env

WINDOW="${1:-50000}"

origin_explorer="${VITE_ORIGIN_EXPLORER_BASE_URL:-}"
reactive_explorer="${VITE_REACTIVE_EXPLORER_BASE_URL:-}"
destination_explorer="${VITE_DESTINATION_EXPLORER_BASE_URL:-}"

origin_latest="$(cast block-number --rpc-url "$ORIGIN_RPC_URL")"
reactive_latest="$(cast block-number --rpc-url "$REACTIVE_RPC_URL")"
destination_latest="$(cast block-number --rpc-url "$DESTINATION_RPC_URL")"

origin_from=$(( origin_latest > WINDOW ? origin_latest - WINDOW : 0 ))
reactive_from=$(( reactive_latest > WINDOW ? reactive_latest - WINDOW : 0 ))
destination_from=$(( destination_latest > WINDOW ? destination_latest - WINDOW : 0 ))

origin_logs="$(
  cast logs \
    "StrategySignal(address,address,address,uint256,uint256,uint256)" \
    "$WILLLEAD_WALLET" \
    --address "$WILLLEAD_SIGNAL_EMITTER" \
    --from-block "$origin_from" \
    --to-block latest \
    --rpc-url "$ORIGIN_RPC_URL" \
    --json
)"

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

print_latest() {
  local label="$1"
  local chain="$2"
  local payload="$3"
  local explorer_base="$4"

  local latest
  latest="$(echo "$payload" | jq 'if length == 0 then null else .[-1] end')"

  echo "== ${label} =="
  if [[ "$latest" == "null" ]]; then
    echo "not found"
    echo
    return
  fi

  echo "$latest" | jq -r --arg chain "$chain" '
    [
      "chain=\($chain)",
      "block=\(.blockNumber)",
      "tx=\(.transactionHash)",
      "address=\(.address)"
    ] | .[]
  '
  if [[ -n "$explorer_base" ]]; then
    local tx_hash
    tx_hash="$(echo "$latest" | jq -r '.transactionHash')"
    echo "url=${explorer_base%/}/tx/${tx_hash}"
  fi
  echo
}

print_latest "Origin Signal" "origin" "$origin_logs" "$origin_explorer"
print_latest "Reactive Callback" "reactive" "$reactive_logs" "$reactive_explorer"
print_latest "Destination Execution" "destination" "$destination_logs" "$destination_explorer"
