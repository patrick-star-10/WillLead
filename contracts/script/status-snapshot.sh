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
DESTINATION_RPC_URL="$(execution_env_value "$EXECUTION_ENV" DESTINATION_RPC_URL)"
CALLBACK_PROXY="$(execution_env_value "$EXECUTION_ENV" CALLBACK_PROXY)"
WILLLEAD_WALLET_FACTORY="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET_FACTORY)"
WILLLEAD_WALLET="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET)"
WILLLEAD_SIGNAL_EMITTER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_SIGNAL_EMITTER)"
WILLLEAD_REACTIVE_LISTENER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER)"

if [[ -n "${WILLLEAD_WALLET_FACTORY:-}" ]]; then
  echo "execution_env=$EXECUTION_ENV"
  echo "== Wallet factory =="
  cast call "$WILLLEAD_WALLET_FACTORY" "walletOf(address)(address)" "$(cast wallet address --private-key "$OWNER_PRIVATE_KEY")" --rpc-url "$DESTINATION_RPC_URL"
  cast call "$WILLLEAD_WALLET_FACTORY" "reactiveListener()(address)" --rpc-url "$DESTINATION_RPC_URL"
  cast call "$WILLLEAD_WALLET_FACTORY" "signalEmitter()(address)" --rpc-url "$DESTINATION_RPC_URL"
  echo
fi

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
cast balance "$WILLLEAD_REACTIVE_LISTENER" --rpc-url "$REACTIVE_RPC_URL"
cast call "$REACTIVE_SYSTEM_CONTRACT" "debt(address)(uint256)" "$WILLLEAD_REACTIVE_LISTENER" --rpc-url "$REACTIVE_RPC_URL"
echo
echo "== Reactive subscription =="
./contracts/script/sync-listener-subscription.sh --check
