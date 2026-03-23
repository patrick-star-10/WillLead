#!/usr/bin/env bash
set -euo pipefail

TARGET_INTENT="${1:-}"
AMOUNT="${2:-0.02ether}"

if [[ -z "$TARGET_INTENT" ]]; then
  echo "Usage: ./contracts/script/fund-swap-intent-callback.sh <intentAddress> [amount]"
  exit 1
fi

./contracts/script/fund-callback.sh "$AMOUNT" "$TARGET_INTENT"
