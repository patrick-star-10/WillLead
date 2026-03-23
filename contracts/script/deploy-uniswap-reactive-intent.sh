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
require_env REACTIVE_RPC_URL
require_env ORIGIN_CHAIN_ID
require_env AUTHORIZED_RVM_ID
require_env DESTINATION_RPC_URL
require_env DESTINATION_CHAIN_ID
require_env CALLBACK_PROXY

UNISWAP_V4_POOL_MANAGER="${1:-}"
UNISWAP_V4_POOL_ID="${2:-}"
REACTIVE_FAUCET_ADDRESS="${3:-0x9b9BB25f1A81078C544C829c5EB7822d747Cf434}"
LREACT_RECIPIENT="${4:-}"
REQUEST_VALUE="${5:-0.01ether}"
MAX_EXECUTIONS="${6:-3}"
CALLBACK_GAS_LIMIT="${CALLBACK_GAS_LIMIT:-800000}"
REACTIVE_DEPLOY_VALUE="${REACTIVE_DEPLOY_VALUE:-0.01ether}"

if [[ -z "$UNISWAP_V4_POOL_MANAGER" || -z "$UNISWAP_V4_POOL_ID" || -z "$LREACT_RECIPIENT" ]]; then
  echo "Usage: ./contracts/script/deploy-uniswap-reactive-intent.sh <poolManager> <poolIdBytes32> <faucetAddress> <lreactRecipient> [requestValue] [maxExecutions]"
  exit 1
fi

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

echo "Deploying Uniswap-triggered faucet intent on destination chain..."
INTENT_OUTPUT="$(
  deploy_contract \
    "$DESTINATION_RPC_URL" \
    contracts/src/WillLeadReactiveFaucetIntent.sol:WillLeadReactiveFaucetIntent \
    --constructor-args "$OWNER_ADDRESS" "$CALLBACK_PROXY" "$AUTHORIZED_RVM_ID"
)"
INTENT_ADDRESS="$(extract_address "$INTENT_OUTPUT")"
echo "ReactiveFaucetIntent: $INTENT_ADDRESS"

echo "Deploying Uniswap v4 swap listener on Reactive Network..."
LISTENER_OUTPUT="$(
  deploy_contract \
    "$REACTIVE_RPC_URL" \
    contracts/src/WillLeadUniswapV4SwapListener.sol:WillLeadUniswapV4SwapListener \
    --value "$REACTIVE_DEPLOY_VALUE" \
    --constructor-args \
    "$UNISWAP_V4_POOL_MANAGER" \
    "$INTENT_ADDRESS" \
    "$UNISWAP_V4_POOL_ID" \
    "$ORIGIN_CHAIN_ID" \
    "$DESTINATION_CHAIN_ID" \
    "$CALLBACK_GAS_LIMIT"
)"
LISTENER_ADDRESS="$(extract_address "$LISTENER_OUTPUT")"
echo "UniswapSwapListener: $LISTENER_ADDRESS"

SWAP_TOPIC0="$(cast call "$LISTENER_ADDRESS" "swapTopic0()(uint256)" --rpc-url "$REACTIVE_RPC_URL")"

echo "Configuring runtime route..."
cast send \
  --rpc-url "$DESTINATION_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$INTENT_ADDRESS" \
  "configureRuntimeRoute(address,address,bytes32,uint256,uint256,uint256)" \
  "$LISTENER_ADDRESS" \
  "$UNISWAP_V4_POOL_MANAGER" \
  "$UNISWAP_V4_POOL_ID" \
  "$ORIGIN_CHAIN_ID" \
  "$DESTINATION_CHAIN_ID" \
  "$SWAP_TOPIC0" >/dev/null

echo "Saving intent configuration..."
cast send \
  --rpc-url "$DESTINATION_RPC_URL" \
  --private-key "$OWNER_PRIVATE_KEY" \
  "$INTENT_ADDRESS" \
  "configureIntent(address,address,uint256,uint256)" \
  "$REACTIVE_FAUCET_ADDRESS" \
  "$LREACT_RECIPIENT" \
  "$REQUEST_VALUE" \
  "$MAX_EXECUTIONS" >/dev/null

echo
echo "Deployment complete."
echo "Owner: $OWNER_ADDRESS"
echo "Destination intent: $INTENT_ADDRESS"
echo "Reactive listener: $LISTENER_ADDRESS"
echo "Pool manager: $UNISWAP_V4_POOL_MANAGER"
echo "Watched pool id: $UNISWAP_V4_POOL_ID"
echo "Faucet: $REACTIVE_FAUCET_ADDRESS"
echo "lREACT recipient: $LREACT_RECIPIENT"
echo
echo "Next:"
echo "1. Fund the intent with Sepolia ETH so it can call the faucet"
echo "2. Ensure the listener has Reactive runtime balance"
echo "3. Send a swap into the watched Uniswap v4 pool on Sepolia"
