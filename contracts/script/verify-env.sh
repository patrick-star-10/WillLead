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

DESTINATION_RPC_URL="$(execution_env_value "$EXECUTION_ENV" DESTINATION_RPC_URL)"
DESTINATION_CHAIN_ID="$(execution_env_value "$EXECUTION_ENV" DESTINATION_CHAIN_ID)"
CALLBACK_PROXY="$(execution_env_value "$EXECUTION_ENV" CALLBACK_PROXY)"

OWNER_ADDRESS="$(cast wallet address --private-key "$OWNER_PRIVATE_KEY")"

echo "== Required configuration =="
echo "Execution env:           $EXECUTION_ENV"
echo "Owner address:           $OWNER_ADDRESS"
echo "Origin chain id:         $ORIGIN_CHAIN_ID"
echo "Destination chain id:    $DESTINATION_CHAIN_ID"
echo "Reactive chain id:       ${REACTIVE_CHAIN_ID:-<unset>}"
echo "Callback proxy:          $CALLBACK_PROXY"
echo "Authorized RVM ID:       $AUTHORIZED_RVM_ID"
echo

AUTHORIZED_RVM_ID_LOWER="$(printf '%s' "$AUTHORIZED_RVM_ID" | tr '[:upper:]' '[:lower:]')"
OWNER_ADDRESS_LOWER="$(printf '%s' "$OWNER_ADDRESS" | tr '[:upper:]' '[:lower:]')"

if [[ "$AUTHORIZED_RVM_ID_LOWER" != "$OWNER_ADDRESS_LOWER" ]]; then
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
