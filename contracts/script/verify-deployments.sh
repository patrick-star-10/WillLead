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
require_env ORIGIN_RPC_URL
require_env REACTIVE_RPC_URL
require_env ORIGIN_CHAIN_ID
require_env AUTHORIZED_RVM_ID
require_execution_env "$EXECUTION_ENV" DESTINATION_RPC_URL
require_execution_env "$EXECUTION_ENV" DESTINATION_CHAIN_ID
require_execution_env "$EXECUTION_ENV" CALLBACK_PROXY
require_execution_env "$EXECUTION_ENV" WILLLEAD_SIGNAL_EMITTER
require_execution_env "$EXECUTION_ENV" WILLLEAD_WALLET
require_execution_env "$EXECUTION_ENV" WILLLEAD_WALLET_FACTORY
require_execution_env "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER

DESTINATION_RPC_URL="$(execution_env_value "$EXECUTION_ENV" DESTINATION_RPC_URL)"
DESTINATION_CHAIN_ID="$(execution_env_value "$EXECUTION_ENV" DESTINATION_CHAIN_ID)"
CALLBACK_PROXY="$(execution_env_value "$EXECUTION_ENV" CALLBACK_PROXY)"
WILLLEAD_SIGNAL_EMITTER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_SIGNAL_EMITTER)"
WILLLEAD_WALLET="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET)"
WILLLEAD_WALLET_FACTORY="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET_FACTORY)"
WILLLEAD_REACTIVE_LISTENER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER)"

OWNER_ADDRESS="$(cast wallet address --private-key "$OWNER_PRIVATE_KEY")"

assert_code_exists() {
  local rpc_url="$1"
  local address="$2"
  local label="$3"
  local code
  code="$(cast code "$address" --rpc-url "$rpc_url")"
  if [[ "$code" == "0x" ]]; then
    echo "$label has no code at $address"
    exit 1
  fi
  echo "$label code present: $address"
}

assert_eq() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  local actual_lower
  local expected_lower
  actual_lower="$(printf '%s' "$actual" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
  expected_lower="$(printf '%s' "$expected" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
  if [[ "$actual_lower" != "$expected_lower" ]]; then
    echo "$label mismatch"
    echo "expected: $expected"
    echo "actual:   $actual"
    exit 1
  fi
  echo "$label ok: $actual"
}

echo "== Execution env =="
echo "$EXECUTION_ENV"
echo

echo "== Code presence =="
assert_code_exists "$ORIGIN_RPC_URL" "$WILLLEAD_SIGNAL_EMITTER" "SignalEmitter"
assert_code_exists "$DESTINATION_RPC_URL" "$WILLLEAD_WALLET_FACTORY" "WalletFactory"
assert_code_exists "$DESTINATION_RPC_URL" "$WILLLEAD_WALLET" "Wallet"
assert_code_exists "$REACTIVE_RPC_URL" "$WILLLEAD_REACTIVE_LISTENER" "ReactiveListener"
echo

echo "== Wallet factory wiring =="
factory_callback_proxy="$(cast call "$WILLLEAD_WALLET_FACTORY" "callbackProxy()(address)" --rpc-url "$DESTINATION_RPC_URL")"
factory_authorized_rvm_id="$(cast call "$WILLLEAD_WALLET_FACTORY" "authorizedRvmId()(address)" --rpc-url "$DESTINATION_RPC_URL")"
factory_listener="$(cast call "$WILLLEAD_WALLET_FACTORY" "reactiveListener()(address)" --rpc-url "$DESTINATION_RPC_URL")"
factory_signal_emitter="$(cast call "$WILLLEAD_WALLET_FACTORY" "signalEmitter()(address)" --rpc-url "$DESTINATION_RPC_URL")"
factory_origin_chain_id="$(cast call "$WILLLEAD_WALLET_FACTORY" "originChainId()(uint256)" --rpc-url "$DESTINATION_RPC_URL")"
factory_destination_chain_id="$(cast call "$WILLLEAD_WALLET_FACTORY" "destinationChainId()(uint256)" --rpc-url "$DESTINATION_RPC_URL")"
factory_wallet_for_owner="$(cast call "$WILLLEAD_WALLET_FACTORY" "walletOf(address)(address)" "$OWNER_ADDRESS" --rpc-url "$DESTINATION_RPC_URL")"

assert_eq "$factory_callback_proxy" "$CALLBACK_PROXY" "Factory callback proxy"
assert_eq "$factory_authorized_rvm_id" "$AUTHORIZED_RVM_ID" "Factory authorized RVM ID"
assert_eq "$factory_listener" "$WILLLEAD_REACTIVE_LISTENER" "Factory reactive listener"
assert_eq "$factory_signal_emitter" "$WILLLEAD_SIGNAL_EMITTER" "Factory signal emitter"
assert_eq "$factory_origin_chain_id" "$ORIGIN_CHAIN_ID" "Factory origin chain id"
assert_eq "$factory_destination_chain_id" "$DESTINATION_CHAIN_ID" "Factory destination chain id"
assert_eq "$factory_wallet_for_owner" "$WILLLEAD_WALLET" "Factory wallet for owner"
echo

echo "== Wallet wiring =="
wallet_owner="$(cast call "$WILLLEAD_WALLET" "owner()(address)" --rpc-url "$DESTINATION_RPC_URL")"
wallet_callback_proxy="$(cast call "$WILLLEAD_WALLET" "callbackProxy()(address)" --rpc-url "$DESTINATION_RPC_URL")"
wallet_authorized_rvm_id="$(cast call "$WILLLEAD_WALLET" "authorizedRvmId()(address)" --rpc-url "$DESTINATION_RPC_URL")"
wallet_listener="$(cast call "$WILLLEAD_WALLET" "listener()(address)" --rpc-url "$DESTINATION_RPC_URL")"
wallet_signal_emitter="$(cast call "$WILLLEAD_WALLET" "signalEmitter()(address)" --rpc-url "$DESTINATION_RPC_URL")"
wallet_source_chain_id="$(cast call "$WILLLEAD_WALLET" "sourceChainId()(uint256)" --rpc-url "$DESTINATION_RPC_URL")"
wallet_destination_chain_id="$(cast call "$WILLLEAD_WALLET" "destinationChainId()(uint256)" --rpc-url "$DESTINATION_RPC_URL")"

assert_eq "$wallet_owner" "$OWNER_ADDRESS" "Wallet owner"
assert_eq "$wallet_callback_proxy" "$CALLBACK_PROXY" "Wallet callback proxy"
assert_eq "$wallet_authorized_rvm_id" "$AUTHORIZED_RVM_ID" "Wallet authorized RVM ID"
assert_eq "$wallet_listener" "$WILLLEAD_REACTIVE_LISTENER" "Wallet reactive listener"
assert_eq "$wallet_signal_emitter" "$WILLLEAD_SIGNAL_EMITTER" "Wallet signal emitter"
assert_eq "$wallet_source_chain_id" "$ORIGIN_CHAIN_ID" "Wallet source chain id"
assert_eq "$wallet_destination_chain_id" "$DESTINATION_CHAIN_ID" "Wallet destination chain id"
echo

echo "== Reactive listener wiring =="
listener_signal_emitter="$(cast call "$WILLLEAD_REACTIVE_LISTENER" "signalEmitter()(address)" --rpc-url "$REACTIVE_RPC_URL")"
listener_origin_chain_id="$(cast call "$WILLLEAD_REACTIVE_LISTENER" "originChainId()(uint256)" --rpc-url "$REACTIVE_RPC_URL")"
listener_destination_chain_id="$(cast call "$WILLLEAD_REACTIVE_LISTENER" "destinationChainId()(uint256)" --rpc-url "$REACTIVE_RPC_URL")"
listener_gas_limit="$(cast call "$WILLLEAD_REACTIVE_LISTENER" "callbackGasLimit()(uint64)" --rpc-url "$REACTIVE_RPC_URL")"
listener_paused="$(cast call "$WILLLEAD_REACTIVE_LISTENER" "isPaused()(bool)" --rpc-url "$REACTIVE_RPC_URL")"

assert_eq "$listener_signal_emitter" "$WILLLEAD_SIGNAL_EMITTER" "Listener signal emitter"
assert_eq "$listener_origin_chain_id" "$ORIGIN_CHAIN_ID" "Listener origin chain id"
assert_eq "$listener_destination_chain_id" "$DESTINATION_CHAIN_ID" "Listener destination chain id"
echo "Listener callback gas limit: $listener_gas_limit"
echo "Listener paused:             $listener_paused"
echo

echo "== Deployment verification complete =="
