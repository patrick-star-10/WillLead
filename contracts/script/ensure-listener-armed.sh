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
require_env REACTIVE_RPC_URL
require_execution_env "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER

WILLLEAD_REACTIVE_LISTENER="$(execution_env_value "$EXECUTION_ENV" WILLLEAD_REACTIVE_LISTENER)"

listener_owner="$(
  cast call "$WILLLEAD_REACTIVE_LISTENER" "ownerAddress()(address)" --rpc-url "$REACTIVE_RPC_URL" | awk '{print $1}'
)"
listener_paused="$(cast call "$WILLLEAD_REACTIVE_LISTENER" "isPaused()(bool)" --rpc-url "$REACTIVE_RPC_URL")"
operator_address="$(cast wallet address --private-key "$OWNER_PRIVATE_KEY")"

echo "execution_env=$EXECUTION_ENV"
echo "listener_arm=checking"
echo "listener_owner=$listener_owner"
echo "operator_address=$operator_address"

EXECUTION_ENV="$EXECUTION_ENV" ./contracts/script/sync-listener-subscription.sh >/dev/null
echo "listener_subscription=armed"

if [[ "$listener_paused" == "true" ]]; then
  if [[ "${listener_owner,,}" != "${operator_address,,}" ]]; then
    echo "listener_resume=blocked"
    echo "reason=operator key does not own reactive listener"
    exit 1
  fi

  ./contracts/script/resume-listener.sh >/dev/null
  listener_paused="false"
  echo "listener_resume=sent"
else
  echo "listener_resume=not_needed"
fi

EXECUTION_ENV="$EXECUTION_ENV" ./contracts/script/sync-listener-subscription.sh --check >/dev/null

echo "listener_arm=ok"
echo "listener_paused=$listener_paused"
