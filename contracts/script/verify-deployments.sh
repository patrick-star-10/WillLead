#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env
source contracts/script/lib/env-utils.sh

require_env OWNER_PRIVATE_KEY
require_env ORIGIN_RPC_URL
require_env DESTINATION_RPC_URL
require_env REACTIVE_RPC_URL
require_env ORIGIN_CHAIN_ID
require_env DESTINATION_CHAIN_ID
require_env CALLBACK_PROXY
require_env AUTHORIZED_RVM_ID
require_env WILLLEAD_SIGNAL_EMITTER
require_env WILLLEAD_WALLET
require_env WILLLEAD_REACTIVE_LISTENER

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
  if [[ "${actual,,}" != "${expected,,}" ]]; then
    echo "$label mismatch"
    echo "expected: $expected"
    echo "actual:   $actual"
    exit 1
  fi
  echo "$label ok: $actual"
}

echo "== Code presence =="
assert_code_exists "$ORIGIN_RPC_URL" "$WILLLEAD_SIGNAL_EMITTER" "SignalEmitter"
assert_code_exists "$DESTINATION_RPC_URL" "$WILLLEAD_WALLET" "Wallet"
assert_code_exists "$REACTIVE_RPC_URL" "$WILLLEAD_REACTIVE_LISTENER" "ReactiveListener"
echo

echo "== Wallet wiring =="
wallet_owner="$(cast call "$WILLLEAD_WALLET" "owner()(address)" --rpc-url "$DESTINATION_RPC_URL")"
wallet_callback_proxy="$(cast call "$WILLLEAD_WALLET" "callbackProxy()(address)" --rpc-url "$DESTINATION_RPC_URL")"
wallet_authorized_rvm_id="$(cast call "$WILLLEAD_WALLET" "authorizedRvmId()(address)" --rpc-url "$DESTINATION_RPC_URL")"

assert_eq "$wallet_owner" "$OWNER_ADDRESS" "Wallet owner"
assert_eq "$wallet_callback_proxy" "$CALLBACK_PROXY" "Wallet callback proxy"
assert_eq "$wallet_authorized_rvm_id" "$AUTHORIZED_RVM_ID" "Wallet authorized RVM ID"
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

