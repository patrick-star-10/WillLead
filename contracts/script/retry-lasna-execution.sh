#!/usr/bin/env bash
set -euo pipefail

EXECUTION_ENV=lasna node frontend/scripts/retry-reactive-execution.mjs "$@"
