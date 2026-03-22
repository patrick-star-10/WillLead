#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env
source contracts/script/lib/env-utils.sh

EXECUTION_ENV="${EXECUTION_ENV:-primary}"

REACTIVE_SYSTEM_CONTRACT="0x0000000000000000000000000000000000fffFfF"
WINDOW="${1:-10000}"
OWNER_ADDRESS="$(cast wallet address --private-key "$OWNER_PRIVATE_KEY")"
DESTINATION_RPC_URL="$(execution_env_value "$EXECUTION_ENV" DESTINATION_RPC_URL)"
WILLLEAD_WALLET_FACTORY="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET_FACTORY)"
WILLLEAD_WALLET="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET)"
WILLLEAD_SIGNAL_EMITTER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_SIGNAL_EMITTER)"
WILLLEAD_REACTIVE_LISTENER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER)"

origin_explorer="${VITE_ORIGIN_EXPLORER_BASE_URL:-}"
reactive_explorer="${VITE_REACTIVE_EXPLORER_BASE_URL:-}"
destination_explorer="${VITE_DESTINATION_EXPLORER_BASE_URL:-}"

origin_latest="$(cast block-number --rpc-url "$ORIGIN_RPC_URL")"
reactive_latest="$(cast block-number --rpc-url "$REACTIVE_RPC_URL")"
destination_latest="$(cast block-number --rpc-url "$DESTINATION_RPC_URL")"

origin_from=$(( origin_latest > WINDOW ? origin_latest - WINDOW : 0 ))
reactive_from=$(( reactive_latest > WINDOW ? reactive_latest - WINDOW : 0 ))
destination_from=$(( destination_latest > WINDOW ? destination_latest - WINDOW : 0 ))

wallet_created_logs="[]"
if [[ -n "${WILLLEAD_WALLET_FACTORY:-}" ]]; then
  wallet_created_logs="$(
    cast logs \
      "WalletCreated(address,address,address)" \
      "$OWNER_ADDRESS" \
      --address "$WILLLEAD_WALLET_FACTORY" \
      --from-block "$destination_from" \
      --to-block latest \
      --rpc-url "$DESTINATION_RPC_URL" \
      --json
  )"
fi

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
    "WhitelistContract(address)" \
    "$WILLLEAD_REACTIVE_LISTENER" \
    --address "$REACTIVE_SYSTEM_CONTRACT" \
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

print_latest "Wallet Created" "destination" "$wallet_created_logs" "$destination_explorer"
print_latest "Origin Signal" "origin" "$origin_logs" "$origin_explorer"
print_latest "Reactive Dispatch" "reactive" "$reactive_logs" "$reactive_explorer"
print_latest "Destination Execution" "destination" "$destination_logs" "$destination_explorer"
