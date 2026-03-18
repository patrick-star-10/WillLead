#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

TOKEN_ADDRESS="${1:-0x0000000000000000000000000000000000000000}"
RECIPIENT_ADDRESS="${2:-}"
AMOUNT_PER_EXECUTION="${3:-0.01ether}"
MAX_EXECUTIONS="${4:-5}"
MIN_AUTOMATION_BALANCE="${5:-0.005ether}"
CALLBACK_TOP_UP="${6:-0.02ether}"

if [[ -z "$RECIPIENT_ADDRESS" ]]; then
  echo "Usage: ./contracts/script/bootstrap-demo.sh <token> <recipient> [amountPerExecution] [maxExecutions] [minAutomationBalance] [callbackTopUp]"
  exit 1
fi

./contracts/script/verify-env.sh
./contracts/script/deploy-local.sh
./contracts/script/verify-deployments.sh
./contracts/script/fund-callback.sh "$CALLBACK_TOP_UP"
./contracts/script/configure-intent.sh \
  "$TOKEN_ADDRESS" \
  "$RECIPIENT_ADDRESS" \
  "$AMOUNT_PER_EXECUTION" \
  "$MAX_EXECUTIONS" \
  "$MIN_AUTOMATION_BALANCE"
./contracts/script/sync-frontend-env.sh
./contracts/script/demo-readiness.sh
./contracts/script/status-snapshot.sh

echo
echo "Bootstrap complete."
echo "Next:"
echo "1. Start frontend: cd frontend && npm run dev"
echo "2. Re-check readiness any time: ./contracts/script/demo-readiness.sh"
echo "3. Trigger source signal: ./contracts/script/emit-signal.sh $TOKEN_ADDRESS $RECIPIENT_ADDRESS $AMOUNT_PER_EXECUTION 1"
echo "4. Collect proof: ./contracts/script/collect-proof.sh"
