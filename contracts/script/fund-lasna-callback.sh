#!/usr/bin/env bash
set -euo pipefail

EXECUTION_ENV=lasna ./contracts/script/fund-callback.sh "$@"
