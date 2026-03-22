#!/usr/bin/env bash
set -euo pipefail

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env: $name"
    exit 1
  fi
}

normalize_execution_env_name() {
  local value="${1:-primary}"
  printf '%s' "$value" | tr '[:lower:]-' '[:upper:]_'
}

execution_env_var_name() {
  local execution_env="${1:-primary}"
  local base_name="$2"
  local normalized
  normalized="$(normalize_execution_env_name "$execution_env")"

  if [[ "$normalized" == "PRIMARY" ]]; then
    printf '%s\n' "$base_name"
    return
  fi

  printf '%s_EXECUTION_%s\n' "$normalized" "$base_name"
}

execution_env_value() {
  local execution_env="${1:-primary}"
  local base_name="$2"
  local var_name
  var_name="$(execution_env_var_name "$execution_env" "$base_name")"
  printf '%s' "${!var_name:-}"
}

require_execution_env() {
  local execution_env="${1:-primary}"
  local base_name="$2"
  local var_name
  var_name="$(execution_env_var_name "$execution_env" "$base_name")"

  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required env: $var_name"
    exit 1
  fi
}

upsert_execution_env_var() {
  local file="$1"
  local execution_env="${2:-primary}"
  local base_name="$3"
  local value="$4"
  local var_name
  var_name="$(execution_env_var_name "$execution_env" "$base_name")"
  upsert_env_var "$file" "$var_name" "$value"
}

upsert_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"

  touch "$file"

  if grep -q "^${key}=" "$file"; then
    perl -0pi -e "s#^${key}=.*#${key}=${value}#m" "$file"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$file"
  fi
}
