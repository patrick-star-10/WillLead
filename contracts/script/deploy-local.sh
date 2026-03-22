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
DESTINATION_CHAIN_NAME="$(execution_env_value "$EXECUTION_ENV" DESTINATION_CHAIN_NAME)"
CALLBACK_PROXY="$(execution_env_value "$EXECUTION_ENV" CALLBACK_PROXY)"

CALLBACK_GAS_LIMIT="${CALLBACK_GAS_LIMIT:-1000000}"
REACTIVE_DEPLOY_VALUE="${REACTIVE_DEPLOY_VALUE:-0.01ether}"
OWNER_ADDRESS="$(cast wallet address --private-key "$OWNER_PRIVATE_KEY")"

deploy_contract() {
  local rpc_url="$1"
  local contract_ref="$2"
  shift 2

  forge create "$contract_ref" \
    --rpc-url "$rpc_url" \
    --private-key "$OWNER_PRIVATE_KEY" \
    --broadcast \
    --json \
    "$@"
}

extract_address() {
  local output="$1"
  echo "$output" | jq -r '.deployedTo // .deployed_to // .address'
}

echo "Deploying WillLeadSignalEmitter on origin chain..."
SIGNAL_OUTPUT="$(
  deploy_contract \
    "$ORIGIN_RPC_URL" \
    contracts/src/WillLeadSignalEmitter.sol:WillLeadSignalEmitter \
    --constructor-args "$OWNER_ADDRESS"
)"
SIGNAL_ADDRESS="$(extract_address "$SIGNAL_OUTPUT")"
echo "SignalEmitter: $SIGNAL_ADDRESS"

echo "Deploying WillLeadReactiveListener on Reactive Network..."
LISTENER_OUTPUT="$(
  deploy_contract \
    "$REACTIVE_RPC_URL" \
    contracts/src/WillLeadReactiveListener.sol:WillLeadReactiveListener \
    --value "$REACTIVE_DEPLOY_VALUE" \
    --constructor-args "$SIGNAL_ADDRESS" "$ORIGIN_CHAIN_ID" "$DESTINATION_CHAIN_ID" "$CALLBACK_GAS_LIMIT"
)"
LISTENER_ADDRESS="$(extract_address "$LISTENER_OUTPUT")"
echo "ReactiveListener: $LISTENER_ADDRESS"

echo "Deploying WillLeadWalletFactory on destination chain..."
FACTORY_OUTPUT="$(
  deploy_contract \
    "$DESTINATION_RPC_URL" \
    contracts/src/WillLeadWalletFactory.sol:WillLeadWalletFactory \
    --constructor-args \
    "$CALLBACK_PROXY" \
    "$AUTHORIZED_RVM_ID" \
    "$LISTENER_ADDRESS" \
    "$SIGNAL_ADDRESS" \
    "$ORIGIN_CHAIN_ID" \
    "$DESTINATION_CHAIN_ID"
)"
FACTORY_ADDRESS="$(extract_address "$FACTORY_OUTPUT")"
echo "WalletFactory: $FACTORY_ADDRESS"

upsert_execution_env_var .env "$EXECUTION_ENV" WILLLEAD_SIGNAL_EMITTER "$SIGNAL_ADDRESS"
upsert_execution_env_var .env "$EXECUTION_ENV" WILLLEAD_WALLET_FACTORY "$FACTORY_ADDRESS"
upsert_execution_env_var .env "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER "$LISTENER_ADDRESS"

if [[ "$(normalize_execution_env_name "$EXECUTION_ENV")" == "PRIMARY" ]]; then
  upsert_env_var .env VITE_SIGNAL_EMITTER_ADDRESS "$SIGNAL_ADDRESS"
  upsert_env_var .env VITE_WALLET_FACTORY_ADDRESS "$FACTORY_ADDRESS"
  upsert_env_var .env VITE_REACTIVE_LISTENER_ADDRESS "$LISTENER_ADDRESS"
  upsert_env_var .env VITE_CALLBACK_PROXY "$CALLBACK_PROXY"
  upsert_env_var .env VITE_AUTHORIZED_RVM_ID "$AUTHORIZED_RVM_ID"
  upsert_env_var .env VITE_ORIGIN_RPC_URL "$ORIGIN_RPC_URL"
  upsert_env_var .env VITE_ORIGIN_CHAIN_ID "$ORIGIN_CHAIN_ID"
  upsert_env_var .env VITE_ORIGIN_CHAIN_NAME "${ORIGIN_CHAIN_NAME:-}"
  upsert_env_var .env VITE_DESTINATION_RPC_URL "$DESTINATION_RPC_URL"
  upsert_env_var .env VITE_DESTINATION_CHAIN_ID "$DESTINATION_CHAIN_ID"
  upsert_env_var .env VITE_DESTINATION_CHAIN_NAME "${DESTINATION_CHAIN_NAME:-}"
  upsert_env_var .env VITE_REACTIVE_RPC_URL "$REACTIVE_RPC_URL"
  upsert_env_var .env VITE_REACTIVE_CHAIN_ID "${REACTIVE_CHAIN_ID:-}"
  upsert_env_var .env VITE_REACTIVE_CHAIN_NAME "${REACTIVE_CHAIN_NAME:-}"
fi

EXECUTION_ENV="$EXECUTION_ENV" ./contracts/script/create-wallet.sh >/dev/null
WALLET_ADDRESS="$(cast call "$FACTORY_ADDRESS" "walletOf(address)(address)" "$OWNER_ADDRESS" --rpc-url "$DESTINATION_RPC_URL")"
EXECUTION_ENV="$EXECUTION_ENV" ./contracts/script/sync-listener-subscription.sh
EXECUTION_ENV="$EXECUTION_ENV" ./contracts/script/fund-reactive-listener.sh >/dev/null

echo
echo "Deployment complete."
echo "Execution env: $EXECUTION_ENV"
echo "Owner: $OWNER_ADDRESS"
echo "SignalEmitter: $SIGNAL_ADDRESS"
echo "ReactiveListener: $LISTENER_ADDRESS"
echo "WalletFactory: $FACTORY_ADDRESS"
echo "Wallet: $WALLET_ADDRESS"
echo
echo "Next:"
echo "1. Run EXECUTION_ENV=$EXECUTION_ENV ./contracts/script/fund-callback.sh"
echo "2. Run EXECUTION_ENV=$EXECUTION_ENV ./contracts/script/configure-intent.sh <token> <recipient>"
echo "3. Run EXECUTION_ENV=$EXECUTION_ENV ./contracts/script/sync-frontend-env.sh"
echo "4. Run EXECUTION_ENV=$EXECUTION_ENV ./contracts/script/demo-readiness.sh"
echo "5. Start frontend with npm run dev"
