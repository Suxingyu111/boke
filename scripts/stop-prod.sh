#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
DEFAULT_ENV_FILE="$PROJECT_ROOT/.env.docker"
TEMPLATE_ENV_FILE="$PROJECT_ROOT/.env.docker.example"

resolve_env_file() {
  local requested_file="${1:-}"

  if [[ -n "$requested_file" ]]; then
    if [[ "$requested_file" = /* ]]; then
      printf '%s\n' "$requested_file"
    else
      printf '%s\n' "$PROJECT_ROOT/$requested_file"
    fi
    return
  fi

  if [[ -f "$DEFAULT_ENV_FILE" ]]; then
    printf '%s\n' "$DEFAULT_ENV_FILE"
    return
  fi

  if [[ -f "$TEMPLATE_ENV_FILE" ]]; then
    echo "Env file not found, fallback to template: $TEMPLATE_ENV_FILE"
    printf '%s\n' "$TEMPLATE_ENV_FILE"
    return
  fi

  printf '%s\n' "$DEFAULT_ENV_FILE"
}

ENV_FILE="$(resolve_env_file "${1:-}")"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found" >&2
  exit 1
fi

echo "Using env file: $ENV_FILE"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down