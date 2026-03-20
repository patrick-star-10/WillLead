#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env
source contracts/script/lib/env-utils.sh

require_env OWNER_PRIVATE_KEY
require_env DESTINATION_RPC_URL
require_env WILLLEAD_WALLET_FACTORY

OWNER_ADDRESS="$(cast wallet address --private-key "$OWNER_PRIVATE_KEY")"
CURRENT_WALLET="$(cast call "$WILLLEAD_WALLET_FACTORY" "walletOf(address)(address)" "$OWNER_ADDRESS" --rpc-url "$DESTINATION_RPC_URL")"

if [[ "$(printf '%s' "$CURRENT_WALLET" | tr '[:upper:]' '[:lower:]')" == "0x0000000000000000000000000000000000000000" ]]; then
  echo "Creating autonomous wallet for owner $OWNER_ADDRESS ..."
  cast send \
    --rpc-url "$DESTINATION_RPC_URL" \
    --private-key "$OWNER_PRIVATE_KEY" \
    "$WILLLEAD_WALLET_FACTORY" \
    "createWallet()"
  CURRENT_WALLET="$(cast call "$WILLLEAD_WALLET_FACTORY" "walletOf(address)(address)" "$OWNER_ADDRESS" --rpc-url "$DESTINATION_RPC_URL")"
else
  echo "Autonomous wallet already exists for owner $OWNER_ADDRESS"
fi

FACTORY_LISTENER="$(cast call "$WILLLEAD_WALLET_FACTORY" "reactiveListener()(address)" --rpc-url "$DESTINATION_RPC_URL")"
FACTORY_SIGNAL_EMITTER="$(cast call "$WILLLEAD_WALLET_FACTORY" "signalEmitter()(address)" --rpc-url "$DESTINATION_RPC_URL")"

upsert_env_var .env WILLLEAD_WALLET "$CURRENT_WALLET"
upsert_env_var .env WILLLEAD_REACTIVE_LISTENER "$FACTORY_LISTENER"
upsert_env_var .env WILLLEAD_SIGNAL_EMITTER "$FACTORY_SIGNAL_EMITTER"
upsert_env_var .env VITE_WALLET_ADDRESS "$CURRENT_WALLET"
upsert_env_var .env VITE_REACTIVE_LISTENER_ADDRESS "$FACTORY_LISTENER"
upsert_env_var .env VITE_SIGNAL_EMITTER_ADDRESS "$FACTORY_SIGNAL_EMITTER"

echo "owner=$OWNER_ADDRESS"
echo "wallet=$CURRENT_WALLET"
echo "listener=$FACTORY_LISTENER"
echo "signal_emitter=$FACTORY_SIGNAL_EMITTER"
