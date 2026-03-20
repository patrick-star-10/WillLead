#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env

echo "== Wallet summary =="
cast call "$WILLLEAD_WALLET" "getIntentSummary()(uint8,address,address,uint256,uint256,uint256,uint256)" --rpc-url "$DESTINATION_RPC_URL"
echo
echo "== Wallet runtime =="
cast call "$WILLLEAD_WALLET" "lastExecutionNonce()(uint256)" --rpc-url "$DESTINATION_RPC_URL"
cast call "$WILLLEAD_WALLET" "lastExecutedAt()(uint256)" --rpc-url "$DESTINATION_RPC_URL"
cast call "$WILLLEAD_WALLET" "lastSignalHash()(bytes32)" --rpc-url "$DESTINATION_RPC_URL"
echo
echo "== Callback credit =="
cast call "$CALLBACK_PROXY" "reserves(address)(uint256)" "$WILLLEAD_WALLET" --rpc-url "$DESTINATION_RPC_URL"
cast call "$CALLBACK_PROXY" "debts(address)(uint256)" "$WILLLEAD_WALLET" --rpc-url "$DESTINATION_RPC_URL"
echo
echo "== Reactive listener =="
cast call "$WILLLEAD_REACTIVE_LISTENER" "isPaused()(bool)" --rpc-url "$REACTIVE_RPC_URL"
cast call "$WILLLEAD_REACTIVE_LISTENER" "callbackGasLimit()(uint64)" --rpc-url "$REACTIVE_RPC_URL"
echo
echo "== Reactive subscription =="
./contracts/script/sync-listener-subscription.sh --check
