#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

source .env
source contracts/script/lib/env-utils.sh

EXECUTION_ENV="${EXECUTION_ENV:-primary}"

DESTINATION_RPC_URL="$(execution_env_value "$EXECUTION_ENV" DESTINATION_RPC_URL)"
CALLBACK_PROXY="$(execution_env_value "$EXECUTION_ENV" CALLBACK_PROXY)"
WILLLEAD_WALLET="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET)"
WILLLEAD_WALLET_FACTORY="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_WALLET_FACTORY)"
WILLLEAD_SIGNAL_EMITTER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_SIGNAL_EMITTER)"
WILLLEAD_REACTIVE_LISTENER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER)"

EXECUTION_ENV="$EXECUTION_ENV" ./contracts/script/verify-env.sh >/dev/null
EXECUTION_ENV="$EXECUTION_ENV" ./contracts/script/verify-deployments.sh >/dev/null

REACTIVE_SYSTEM_CONTRACT="0x0000000000000000000000000000000000fffFfF"

fail() {
  echo "readiness=failed"
  echo "reason=$1"
  exit 1
}

warn() {
  echo "warning=$1"
}

numeric_value() {
  printf '%s' "$1" | awk '{print $1}'
}

EXECUTION_ENV="$EXECUTION_ENV" ./contracts/script/sync-listener-subscription.sh --check >/dev/null || fail "reactive listener subscription is missing or stale"

expect_nonzero_address() {
  local value="$1"
  local label="$2"
  if [[ "$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')" == "0x0000000000000000000000000000000000000000" ]]; then
    fail "$label is zero"
  fi
  echo "$label=$value"
}

intent_enabled="$(cast call "$WILLLEAD_WALLET" "intent()(bool,address,address,uint256,uint256,uint256)" --rpc-url "$DESTINATION_RPC_URL" | sed -n '1p')"
intent_token="$(cast call "$WILLLEAD_WALLET" "intent()(bool,address,address,uint256,uint256,uint256)" --rpc-url "$DESTINATION_RPC_URL" | sed -n '2p')"
intent_recipient="$(cast call "$WILLLEAD_WALLET" "intent()(bool,address,address,uint256,uint256,uint256)" --rpc-url "$DESTINATION_RPC_URL" | sed -n '3p')"
intent_amount="$(cast call "$WILLLEAD_WALLET" "intent()(bool,address,address,uint256,uint256,uint256)" --rpc-url "$DESTINATION_RPC_URL" | sed -n '4p')"
intent_max="$(cast call "$WILLLEAD_WALLET" "intent()(bool,address,address,uint256,uint256,uint256)" --rpc-url "$DESTINATION_RPC_URL" | sed -n '5p')"
intent_executed="$(cast call "$WILLLEAD_WALLET" "intent()(bool,address,address,uint256,uint256,uint256)" --rpc-url "$DESTINATION_RPC_URL" | sed -n '6p')"
runtime_status="$(numeric_value "$(cast call "$WILLLEAD_WALLET" "runtimeStatus()(uint8)" --rpc-url "$DESTINATION_RPC_URL")")"
min_automation_balance="$(numeric_value "$(cast call "$WILLLEAD_WALLET" "minAutomationBalance()(uint256)" --rpc-url "$DESTINATION_RPC_URL")")"
callback_reserve="$(numeric_value "$(cast call "$CALLBACK_PROXY" "reserves(address)(uint256)" "$WILLLEAD_WALLET" --rpc-url "$DESTINATION_RPC_URL")")"
callback_debt="$(numeric_value "$(cast call "$CALLBACK_PROXY" "debts(address)(uint256)" "$WILLLEAD_WALLET" --rpc-url "$DESTINATION_RPC_URL")")"
listener_paused="$(cast call "$WILLLEAD_REACTIVE_LISTENER" "isPaused()(bool)" --rpc-url "$REACTIVE_RPC_URL")"
listener_gas_limit="$(numeric_value "$(cast call "$WILLLEAD_REACTIVE_LISTENER" "callbackGasLimit()(uint64)" --rpc-url "$REACTIVE_RPC_URL")")"
listener_balance="$(numeric_value "$(cast balance "$WILLLEAD_REACTIVE_LISTENER" --rpc-url "$REACTIVE_RPC_URL")")"
listener_debt="$(numeric_value "$(cast call "$REACTIVE_SYSTEM_CONTRACT" "debt(address)(uint256)" "$WILLLEAD_REACTIVE_LISTENER" --rpc-url "$REACTIVE_RPC_URL")")"

echo "execution_env=$EXECUTION_ENV"
echo "readiness=checking"

if [[ "$intent_enabled" != "true" ]]; then
  fail "wallet intent is not enabled"
fi

expect_nonzero_address "$intent_recipient" "intent_recipient"

if [[ "$(numeric_value "$intent_amount")" == "0" ]]; then
  fail "intent amount is zero"
fi

if [[ "$(numeric_value "$intent_max")" == "0" ]]; then
  fail "intent max executions is zero"
fi

if (( $(numeric_value "$intent_executed") >= $(numeric_value "$intent_max") )); then
  fail "intent already exhausted"
fi

if [[ "$runtime_status" != "1" ]]; then
  fail "wallet runtime status is not Active"
fi

if [[ "$listener_paused" != "false" ]]; then
  fail "reactive listener is paused"
fi

if (( callback_reserve < min_automation_balance )); then
  fail "callback reserve below wallet min automation balance"
fi

if [[ "$listener_gas_limit" == "0" ]]; then
  fail "listener callback gas limit is zero"
fi

if (( listener_balance < listener_debt )); then
  fail "reactive listener runtime is underfunded"
fi

if [[ ! -f frontend/.env.local ]]; then
  warn "frontend/.env.local is missing"
else
  if ! rg -q "^VITE_WALLET_ADDRESS=${WILLLEAD_WALLET}$" frontend/.env.local; then
    warn "frontend wallet address is not synced"
  fi
  if [[ -n "${WILLLEAD_WALLET_FACTORY:-}" ]] && ! rg -q "^VITE_WALLET_FACTORY_ADDRESS=${WILLLEAD_WALLET_FACTORY}$" frontend/.env.local; then
    warn "frontend wallet factory address is not synced"
  fi
  if ! rg -q "^VITE_SIGNAL_EMITTER_ADDRESS=${WILLLEAD_SIGNAL_EMITTER}$" frontend/.env.local; then
    warn "frontend signal emitter address is not synced"
  fi
  if ! rg -q "^VITE_REACTIVE_LISTENER_ADDRESS=${WILLLEAD_REACTIVE_LISTENER}$" frontend/.env.local; then
    warn "frontend reactive listener address is not synced"
  fi
fi

if [[ -z "${VITE_ORIGIN_EXPLORER_BASE_URL:-}" || -z "${VITE_REACTIVE_EXPLORER_BASE_URL:-}" || -z "${VITE_DESTINATION_EXPLORER_BASE_URL:-}" ]]; then
  warn "one or more explorer base URLs are missing"
fi

echo "readiness=ok"
echo "intent_token=$intent_token"
echo "intent_amount=$(numeric_value "$intent_amount")"
echo "intent_executed=$(numeric_value "$intent_executed")"
echo "intent_max=$(numeric_value "$intent_max")"
echo "callback_reserve=$callback_reserve"
echo "callback_debt=$callback_debt"
echo "min_automation_balance=$min_automation_balance"
echo "listener_callback_gas_limit=$listener_gas_limit"
echo "listener_balance=$listener_balance"
echo "listener_debt=$listener_debt"
