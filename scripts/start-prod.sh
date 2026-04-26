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
    cp "$TEMPLATE_ENV_FILE" "$DEFAULT_ENV_FILE"
    chmod 600 "$DEFAULT_ENV_FILE" 2>/dev/null || true
    echo "Generated env file from template: $DEFAULT_ENV_FILE"
    echo "Review domain and password settings in $DEFAULT_ENV_FILE before exposing the service publicly."
    printf '%s\n' "$DEFAULT_ENV_FILE"
    return
  fi

  printf '%s\n' "$DEFAULT_ENV_FILE"
}

read_env_value() {
  local key="$1"
  local line

  line="$(grep -E "^[[:space:]]*${key}=" "$ENV_FILE" | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    return 1
  fi

  line="${line#*=}"
  line="${line%$'\r'}"
  printf '%s\n' "$line"
}

escape_sql_literal() {
  printf '%s' "$1" | sed "s/'/''/g"
}

wait_for_service_state() {
  local service_name="$1"
  local expected_state="$2"
  local timeout_seconds="${3:-180}"
  local started_at
  local container_id
  local current_state

  started_at="$(date +%s)"

  while true; do
    container_id="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q "$service_name")"

    if [[ -n "$container_id" ]]; then
      current_state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
      if [[ "$current_state" == "$expected_state" ]]; then
        echo "$service_name is $expected_state"
        return 0
      fi
    else
      current_state="missing"
    fi

    if (( $(date +%s) - started_at >= timeout_seconds )); then
      echo "Timed out waiting for $service_name to become $expected_state. Current state: ${current_state:-unknown}" >&2
      return 1
    fi

    sleep 2
  done
}

verify_mysql_database_name() {
  if [[ ! "$MYSQL_DATABASE" =~ ^[A-Za-z0-9_]+$ ]]; then
    echo "MYSQL_DATABASE may only contain letters, numbers, and underscores for automatic bootstrap: $MYSQL_DATABASE" >&2
    return 1
  fi
}

verify_mysql_root_login() {
  if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mysql \
    sh -lc 'mysql --protocol=tcp --host=127.0.0.1 --default-character-set=utf8mb4 -u root -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1"' \
    >/dev/null 2>&1; then
    return 0
  fi

  cat >&2 <<EOF
Unable to authenticate to MySQL as root with MYSQL_ROOT_PASSWORD from $ENV_FILE.
If mysql_data already exists, keep .env.docker aligned with the original MySQL credentials.
For a fresh deployment, remove the old mysql_data volume before starting.
EOF
  return 1
}

verify_mysql_app_login() {
  if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mysql \
    sh -lc 'mysql --protocol=tcp --host=127.0.0.1 --default-character-set=utf8mb4 -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT 1"' \
    >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

ensure_mysql_app_user() {
  local safe_user
  local safe_password
  local sql

  safe_user="$(escape_sql_literal "$MYSQL_USER")"
  safe_password="$(escape_sql_literal "$MYSQL_PASSWORD")"

  printf -v sql '%s\n' \
    "CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" \
    "CREATE USER IF NOT EXISTS '${safe_user}'@'%%' IDENTIFIED BY '${safe_password}';" \
    "ALTER USER '${safe_user}'@'%%' IDENTIFIED BY '${safe_password}';" \
    "GRANT ALL PRIVILEGES ON ${MYSQL_DATABASE}.* TO '${safe_user}'@'%%';" \
    'FLUSH PRIVILEGES;'

  printf '%s' "$sql" | docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mysql \
    sh -lc 'mysql --protocol=tcp --host=127.0.0.1 --default-character-set=utf8mb4 -u root -p"$MYSQL_ROOT_PASSWORD"'
}

bootstrap_mysql_access() {
  if verify_mysql_app_login; then
    echo "MySQL app user is ready"
    return 0
  fi

  if verify_mysql_root_login; then
    echo "MySQL root login succeeded, repairing app user grants"
    ensure_mysql_app_user

    if verify_mysql_app_login; then
      echo "MySQL app user grants repaired"
      return 0
    fi

    cat >&2 <<EOF
MySQL root login succeeded, but the app user still cannot access database ${MYSQL_DATABASE}.
Check MYSQL_DATABASE, MYSQL_USER, and MYSQL_PASSWORD in $ENV_FILE.
EOF
    return 1
  fi

  cat >&2 <<EOF
Unable to authenticate to MySQL using either the app credentials or MYSQL_ROOT_PASSWORD from $ENV_FILE.
If mysql_data already exists, keep the env file aligned with the original MySQL credentials used to initialize that volume.
For a fresh deployment, remove the old mysql_data volume before starting.
EOF
  return 1
}

wait_for_mysql_access() {
  local timeout_seconds="${1:-60}"
  local started_at

  started_at="$(date +%s)"

  while true; do
    if bootstrap_mysql_access; then
      return 0
    fi

    if (( $(date +%s) - started_at >= timeout_seconds )); then
      echo "Timed out waiting for MySQL credentials to become usable." >&2
      return 1
    fi

    echo "Waiting for MySQL credentials to become usable..."
    sleep 3
  done
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

MYSQL_ROOT_PASSWORD="$(read_env_value MYSQL_ROOT_PASSWORD || true)"
MYSQL_DATABASE="$(read_env_value MYSQL_DATABASE || true)"
MYSQL_USER="$(read_env_value MYSQL_USER || true)"
MYSQL_PASSWORD="$(read_env_value MYSQL_PASSWORD || true)"

required_vars=(MYSQL_ROOT_PASSWORD MYSQL_DATABASE MYSQL_USER MYSQL_PASSWORD)
for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required env value: $var_name" >&2
    exit 1
  fi
done

verify_mysql_database_name

echo "Using env file: $ENV_FILE"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build mysql redis elasticsearch kibana
wait_for_service_state mysql healthy 180
wait_for_service_state elasticsearch healthy 180
wait_for_mysql_access 90
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build server nginx
wait_for_service_state server healthy 240
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
