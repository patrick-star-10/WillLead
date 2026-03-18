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

OWNER_ADDRESS="$(cast wallet address --private-key "$OWNER_PRIVATE_KEY")"

echo "== Required configuration =="
echo "Owner address:           $OWNER_ADDRESS"
echo "Origin chain id:         $ORIGIN_CHAIN_ID"
echo "Destination chain id:    $DESTINATION_CHAIN_ID"
echo "Reactive chain id:       ${REACTIVE_CHAIN_ID:-<unset>}"
echo "Callback proxy:          $CALLBACK_PROXY"
echo "Authorized RVM ID:       $AUTHORIZED_RVM_ID"
echo

if [[ "${AUTHORIZED_RVM_ID,,}" != "${OWNER_ADDRESS,,}" ]]; then
  echo "Mismatch: AUTHORIZED_RVM_ID must match the deployer EOA for wallet callback checks."
  exit 1
fi

echo "AUTHORIZED_RVM_ID matches deployer EOA."
echo
echo "== RPC reachability =="
cast chain-id --rpc-url "$ORIGIN_RPC_URL"
cast chain-id --rpc-url "$DESTINATION_RPC_URL"
cast chain-id --rpc-url "$REACTIVE_RPC_URL"
echo
echo "Environment looks usable."

