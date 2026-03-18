#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo ".env not found"
  exit 1
fi

TOKEN_ADDRESS="${1:-0x0000000000000000000000000000000000000000}"
RECIPIENT_ADDRESS="${2:-}"
AMOUNT_PER_EXECUTION="${3:-0.01ether}"
EXECUTION_NONCE="${4:-1}"
WAIT_SECONDS="${5:-45}"

if [[ -z "$RECIPIENT_ADDRESS" ]]; then
  echo "Usage: ./contracts/script/demo-cycle.sh <token> <recipient> [amountPerExecution] [executionNonce] [waitSeconds]"
  exit 1
fi

echo "== Before =="
./contracts/script/status-snapshot.sh
echo
echo "== Emit signal =="
./contracts/script/emit-signal.sh "$TOKEN_ADDRESS" "$RECIPIENT_ADDRESS" "$AMOUNT_PER_EXECUTION" "$EXECUTION_NONCE"
echo
echo "== Wait for execution =="
./contracts/script/wait-for-execution.sh "$EXECUTION_NONCE" "$WAIT_SECONDS"
echo
echo "== Proof =="
./contracts/script/collect-proof.sh
echo
echo "== After =="
./contracts/script/status-snapshot.sh
