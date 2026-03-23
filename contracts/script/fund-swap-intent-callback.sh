#!/usr/bin/env bash
set -euo pipefail

TARGET_CALLBACK_TARGET="${1:-}"
AMOUNT="${2:-0.02ether}"

if [[ -z "$TARGET_CALLBACK_TARGET" ]]; then
  echo "Usage: ./contracts/script/fund-swap-intent-callback.sh <callbackTarget> [amount]"
  exit 1
fi

./contracts/script/fund-callback.sh "$AMOUNT" "$TARGET_CALLBACK_TARGET"
