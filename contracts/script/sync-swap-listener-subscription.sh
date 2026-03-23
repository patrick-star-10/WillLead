#!/usr/bin/env bash
set -euo pipefail

cd frontend
node ./scripts/sync-swap-listener-subscription.mjs "$@"
