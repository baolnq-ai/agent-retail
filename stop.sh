#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_ROOT="$ROOT_DIR/logs"
SETUP_LOG_DIR="$LOG_ROOT/setup"
RUNTIME_LOG_DIR="$LOG_ROOT/runtime"
API_LOG_DIR="$RUNTIME_LOG_DIR/backend"
WEB_LOG_DIR="$RUNTIME_LOG_DIR/frontend"
STOP_LOG="$SETUP_LOG_DIR/stop-$(date +%Y%m%d-%H%M%S).log"
ENV_FILE="$ROOT_DIR/.env"
API_PORT="${API_PORT:-7010}"
WEB_PORT="${WEB_PORT:-7000}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-retail_agent_provider}"
TMUX_SESSION="${TMUX_SESSION:-retail-agent}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

mkdir -p "$SETUP_LOG_DIR" "$API_LOG_DIR" "$WEB_LOG_DIR"
: > "$STOP_LOG"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$STOP_LOG"
}

print_banner() {
  printf "${YELLOW}${BOLD}\n"
  printf "╔══════════════════════════════════════════════════════╗\n"
  printf "║              Retail AI Agent Stop                   ║\n"
  printf "║             backend + frontend shutdown             ║\n"
  printf "╚══════════════════════════════════════════════════════╝\n"
  printf "${RESET}\n"
  printf "${GRAY}Root: %s${RESET}\n" "$ROOT_DIR"
  printf "${GRAY}Stop log: %s${RESET}\n\n" "$STOP_LOG"
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

fail() {
  printf "${RED}✕ %s${RESET}\n" "$1" >&2
  log "FAIL $1"
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

load_env_file() {
  local incoming_api_port="${API_PORT:-}"
  local incoming_web_port="${WEB_PORT:-}"
  local incoming_compose_project_name="${COMPOSE_PROJECT_NAME:-}"

  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    ok "Loaded .env"
  else
    warn "No .env found; using default ports"
  fi

  export API_PORT="${incoming_api_port:-${API_PORT:-7010}}"
  export WEB_PORT="${incoming_web_port:-${WEB_PORT:-7000}}"
  export COMPOSE_PROJECT_NAME="${incoming_compose_project_name:-${COMPOSE_PROJECT_NAME:-retail_agent_provider}}"
}

is_pid_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

stop_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [[ ! -f "$pid_file" ]]; then
    warn "No $label pid file found at $pid_file"
    return
  fi

  local pid
  pid="$(tr -dc '0-9' < "$pid_file")"
  if [[ -z "$pid" ]]; then
    warn "$label pid file is empty or invalid"
    rm -f "$pid_file"
    return
  fi

  if is_pid_running "$pid"; then
    kill "$pid" >> "$STOP_LOG" 2>&1 || true
    sleep 1
    if is_pid_running "$pid"; then
      kill -9 "$pid" >> "$STOP_LOG" 2>&1 || true
    fi
    ok "Stopped $label process from pid file: $pid"
  else
    warn "$label pid $pid was not running"
  fi

  rm -f "$pid_file"
}

stop_repo_runtime_processes() {
  if ! command_exists powershell.exe; then
    warn "Repo-scoped process cleanup is only available on Windows PowerShell from this shell"
    return
  fi

  local root_path="$ROOT_DIR"
  if command_exists cygpath; then
    root_path="$(cygpath -w "$ROOT_DIR")"
  fi

  powershell.exe -NoProfile -Command "\$root = '$root_path'.ToLowerInvariant(); Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -and \$_.CommandLine.ToLowerInvariant().Contains(\$root) -and (\$_.CommandLine.ToLowerInvariant().Contains('@retail-agent/api') -or \$_.CommandLine.ToLowerInvariant().Contains('apps\\web') -or \$_.CommandLine.ToLowerInvariant().Contains('next dev')) } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" >> "$STOP_LOG" 2>&1 || true
  ok "Stopped provider runtime processes scoped to this repo when present"
}

stop_compose_services() {
  if ! command_exists docker; then
    warn "Docker not found; skipping provider compose shutdown"
    return
  fi

  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$ROOT_DIR/infra/docker/docker-compose.yml" down --remove-orphans >> "$STOP_LOG" 2>&1 || true
  ok "Stopped provider Docker Compose project: $COMPOSE_PROJECT_NAME"
}

stop_tmux_session() {
  if ! command_exists tmux; then
    warn "tmux not found; skipping tmux session cleanup"
    return
  fi

  if tmux has-session -t "$TMUX_SESSION" >/dev/null 2>&1; then
    tmux kill-session -t "$TMUX_SESSION" >> "$STOP_LOG" 2>&1 || true
    ok "Stopped tmux session: $TMUX_SESSION"
  else
    warn "No tmux session found: $TMUX_SESSION"
  fi
}

cleanup_next_locks() {
  rm -rf "$ROOT_DIR/apps/web/.next/dev/lock" "$ROOT_DIR/apps/web/.next/dev/server" >> "$STOP_LOG" 2>&1 || true
  ok "Cleared stale Next dev locks for apps/web when present"
}

main() {
  cd "$ROOT_DIR"
  print_banner
  load_env_file

  step "Stop processes from setup PID files"
  stop_pid_file "$API_LOG_DIR/api.pid" "backend"
  stop_pid_file "$WEB_LOG_DIR/web.pid" "frontend"

  step "Stop repo-scoped runtime processes"
  stop_repo_runtime_processes

  step "Stop tmux runtime session"
  stop_tmux_session

  step "Stop provider Docker services"
  stop_compose_services

  step "Clean provider web runtime locks"
  cleanup_next_locks

  printf "\n${GREEN}${BOLD}Stopped${RESET}\n"
  printf "  API pid file: %s\n" "$API_LOG_DIR/api.pid"
  printf "  Web pid file: %s\n" "$WEB_LOG_DIR/web.pid"
  printf "  tmux session: %s\n" "$TMUX_SESSION"
  printf "  Compose project: %s\n" "$COMPOSE_PROJECT_NAME"
  printf "  Log: %s\n" "$STOP_LOG"
}

main "$@"
