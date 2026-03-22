#!/usr/bin/env bash
set -euo pipefail

node frontend/scripts/retry-reactive-execution.mjs "$@"
