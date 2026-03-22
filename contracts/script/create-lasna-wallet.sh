#!/usr/bin/env bash
set -euo pipefail

EXECUTION_ENV=lasna ./contracts/script/create-wallet.sh "$@"
