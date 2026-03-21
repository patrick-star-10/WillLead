#!/usr/bin/env bash
set -euo pipefail

cd frontend
node ./scripts/operator-auto-arm.mjs "$@"
