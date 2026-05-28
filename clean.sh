#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_ROOT="$ROOT_DIR/logs"
SETUP_LOG_DIR="$LOG_ROOT/setup"
CLEAN_LOG="$SETUP_LOG_DIR/clean-$(date +%Y%m%d-%H%M%S).log"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-retail_agent_provider}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

mkdir -p "$SETUP_LOG_DIR"
: > "$CLEAN_LOG"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$CLEAN_LOG"
}

step() {
  printf "${BLUE}▶ %s${RESET}\n" "$1"
  log "STEP $1"
}

ok() {
  printf "${GREEN}✓ %s${RESET}\n" "$1"
  log "OK $1"
}

warn() {
  printf "${YELLOW}⚠ %s${RESET}\n" "$1"
  log "WARN $1"
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

load_env_file() {
  local incoming_compose_project_name="${COMPOSE_PROJECT_NAME:-}"

  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    ok "Loaded .env"
  else
    warn "No .env found; using default provider project name"
  fi

  export COMPOSE_PROJECT_NAME="${incoming_compose_project_name:-${COMPOSE_PROJECT_NAME:-retail_agent_provider}}"
}

main() {
  cd "$ROOT_DIR"
  printf "${YELLOW}${BOLD}\nRetail AI Agent Clean${RESET}\n"
  printf "${GRAY}Root: %s${RESET}\n" "$ROOT_DIR"
  printf "${GRAY}Clean log: %s${RESET}\n\n" "$CLEAN_LOG"

  load_env_file

  if [[ -x "$ROOT_DIR/stop.sh" ]]; then
    step "Stop provider runtime"
    "$ROOT_DIR/stop.sh" >> "$CLEAN_LOG" 2>&1 || true
    ok "Provider runtime stopped when present"
  fi

  step "Remove provider Docker resources"
  if command_exists docker; then
    docker compose -p "$COMPOSE_PROJECT_NAME" -f "$ROOT_DIR/infra/docker/docker-compose.yml" down --volumes --remove-orphans --rmi all >> "$CLEAN_LOG" 2>&1 || true
    ok "Removed provider Compose containers, networks, volumes and provider-owned images"
  else
    warn "Docker not found; skipped Docker cleanup"
  fi

  step "Remove generated runtime files"
  rm -f "$ROOT_DIR/logs/runtime/backend/api.pid" "$ROOT_DIR/logs/runtime/frontend/web.pid" >> "$CLEAN_LOG" 2>&1 || true
  rm -rf "$ROOT_DIR/apps/web/.next/dev/lock" "$ROOT_DIR/apps/web/.next/dev/server" >> "$CLEAN_LOG" 2>&1 || true
  ok "Removed provider runtime PID files and stale web locks"

  step "Remove temporary workspace junk"
  if command_exists pkill; then
    pkill -f "$ROOT_DIR/.tmp-chrome-" >> "$CLEAN_LOG" 2>&1 || true
  fi
  find "$ROOT_DIR" -maxdepth 1 \( -name '.tmp' -o -name '.tmp-*' -o -name 'test-results' \) -print -exec rm -rf {} + >> "$CLEAN_LOG" 2>&1 || true
  ok "Removed root-level temporary folders/files only; .codex/skills and evidence folders are kept"

  printf "\n${GREEN}${BOLD}Clean complete${RESET}\n"
  printf "  Compose project: %s\n" "$COMPOSE_PROJECT_NAME"
  printf "  Log: %s\n" "$CLEAN_LOG"
}

main "$@"
