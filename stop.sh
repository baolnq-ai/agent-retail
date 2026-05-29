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
API_PORT="${API_PORT:-3110}"
WEB_PORT="${WEB_PORT:-3100}"
NGINX_PORT="${NGINX_PORT:-3120}"
POSTGRES_PORT="${POSTGRES_PORT:-3132}"
REDIS_PORT="${REDIS_PORT:-3139}"
QDRANT_PORT="${QDRANT_PORT:-3133}"
QDRANT_GRPC_PORT="${QDRANT_GRPC_PORT:-3134}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-retail_agent_dev}"
DOCKER_COMPOSE_PROJECT_NAME="${DOCKER_COMPOSE_PROJECT_NAME:-retail_agent_full}"
TMUX_SESSION="${TMUX_SESSION:-egnt-retail}"
PROJECT_PORTS=("${WEB_PORT}" "${API_PORT}" "${NGINX_PORT:-3120}" "${POSTGRES_PORT:-3132}" "${REDIS_PORT:-3139}" "${QDRANT_PORT:-3133}" "${QDRANT_GRPC_PORT:-3134}")

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
  local incoming_nginx_port="${NGINX_PORT:-}"
  local incoming_postgres_port="${POSTGRES_PORT:-}"
  local incoming_redis_port="${REDIS_PORT:-}"
  local incoming_qdrant_port="${QDRANT_PORT:-}"
  local incoming_qdrant_grpc_port="${QDRANT_GRPC_PORT:-}"
  local incoming_compose_project_name="${COMPOSE_PROJECT_NAME:-}"
  local incoming_docker_compose_project_name="${DOCKER_COMPOSE_PROJECT_NAME:-}"
  local incoming_tmux_session="${TMUX_SESSION:-}"

  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    ok "Loaded .env"
  else
    warn "No .env found; using default ports"
  fi

  export API_PORT="${incoming_api_port:-${API_PORT:-3110}}"
  export WEB_PORT="${incoming_web_port:-${WEB_PORT:-3100}}"
  export NGINX_PORT="${incoming_nginx_port:-${NGINX_PORT:-3120}}"
  export POSTGRES_PORT="${incoming_postgres_port:-${POSTGRES_PORT:-3132}}"
  export REDIS_PORT="${incoming_redis_port:-${REDIS_PORT:-3139}}"
  export QDRANT_PORT="${incoming_qdrant_port:-${QDRANT_PORT:-3133}}"
  export QDRANT_GRPC_PORT="${incoming_qdrant_grpc_port:-${QDRANT_GRPC_PORT:-3134}}"
  export COMPOSE_PROJECT_NAME="${incoming_compose_project_name:-${COMPOSE_PROJECT_NAME:-retail_agent_dev}}"
  export DOCKER_COMPOSE_PROJECT_NAME="${incoming_docker_compose_project_name:-${DOCKER_COMPOSE_PROJECT_NAME:-retail_agent_full}}"
  export TMUX_SESSION="${incoming_tmux_session:-${TMUX_SESSION:-egnt-retail}}"
  if [[ "$TMUX_SESSION" != *"egnt-retail"* ]]; then
    export TMUX_SESSION="egnt-retail-${TMUX_SESSION}"
  fi
  PROJECT_PORTS=("${WEB_PORT}" "${API_PORT}" "$NGINX_PORT" "$POSTGRES_PORT" "$REDIS_PORT" "$QDRANT_PORT" "$QDRANT_GRPC_PORT")
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
  local root_path="$ROOT_DIR"
  if command_exists powershell.exe && command_exists cygpath; then
    root_path="$(cygpath -w "$ROOT_DIR")"
  fi

  if command_exists powershell.exe; then
    powershell.exe -NoProfile -Command "\$root = '$root_path'.ToLowerInvariant(); Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -and \$_.CommandLine.ToLowerInvariant().Contains(\$root) -and (\$_.CommandLine.ToLowerInvariant().Contains('@retail-agent/api') -or \$_.CommandLine.ToLowerInvariant().Contains('apps\\web') -or \$_.CommandLine.ToLowerInvariant().Contains('next dev')) } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" >> "$STOP_LOG" 2>&1 || true
  fi

  if command_exists ps; then
    while read -r pid; do
      [[ -n "$pid" && "$pid" != "$$" ]] || continue
      local cmd
      cmd="$(ps -p "$pid" -o args= 2>/dev/null || true)"
      if [[ "$cmd" == *"$ROOT_DIR"* && ( "$cmd" == *"@retail-agent/api"* || "$cmd" == *"apps/web"* || "$cmd" == *"next dev"* || "$cmd" == *"dist/main.js"* ) ]]; then
        kill "$pid" >> "$STOP_LOG" 2>&1 || true
        sleep 1
        kill -9 "$pid" >> "$STOP_LOG" 2>&1 || true
      fi
    done < <(ps -eo pid= 2>/dev/null || true)
  fi

  ok "Stopped project runtime processes scoped to this repo when present"
}

stop_compose_services() {
  if ! command_exists docker; then
    warn "Docker not found; skipping provider compose shutdown"
    return
  fi

  docker compose -p "$COMPOSE_PROJECT_NAME" -f "$ROOT_DIR/infra/docker/docker-compose.yml" down --remove-orphans >> "$STOP_LOG" 2>&1 || true
  ok "Stopped provider Docker Compose project: $COMPOSE_PROJECT_NAME"

  docker compose -p "$DOCKER_COMPOSE_PROJECT_NAME" -f "$ROOT_DIR/docker-compose.yml" down --remove-orphans >> "$STOP_LOG" 2>&1 || true
  ok "Stopped full Docker Compose project: $DOCKER_COMPOSE_PROJECT_NAME"
}

stop_tmux_session() {
  if ! command_exists tmux; then
    warn "tmux not found; skipping tmux session cleanup"
    return
  fi

  local stopped=0
  for session in "$TMUX_SESSION" "retail-agent"; do
    if tmux has-session -t "$session" >/dev/null 2>&1; then
      tmux kill-session -t "$session" >> "$STOP_LOG" 2>&1 || true
      ok "Stopped tmux session: $session"
      stopped=1
    fi
  done
  while IFS=: read -r session _; do
    if [[ "$session" == *"egnt-retail"* && "$session" != "$TMUX_SESSION" ]]; then
      tmux kill-session -t "$session" >> "$STOP_LOG" 2>&1 || true
      ok "Stopped tmux session matching egnt-retail: $session"
      stopped=1
    fi
  done < <(tmux list-sessions -F '#S:' 2>/dev/null || true)
  [[ "$stopped" == "1" ]] || warn "No tmux runtime session found"
}

stop_project_ports() {
  local port pid
  for port in "${PROJECT_PORTS[@]}"; do
    [[ "$port" =~ ^[0-9]+$ ]] || continue
    if command_exists lsof; then
      while read -r pid; do
        [[ -n "$pid" ]] || continue
        kill "$pid" >> "$STOP_LOG" 2>&1 || true
        sleep 1
        kill -9 "$pid" >> "$STOP_LOG" 2>&1 || true
        ok "Stopped process on port $port: $pid"
      done < <(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
    elif command_exists fuser; then
      fuser -k "${port}/tcp" >> "$STOP_LOG" 2>&1 || true
      ok "Requested fuser cleanup for port $port"
    else
      warn "Cannot inspect port $port because neither lsof nor fuser is available"
    fi
  done
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

  step "Clear project ports"
  stop_project_ports

  step "Stop provider Docker services"
  stop_compose_services

  step "Clean provider web runtime locks"
  cleanup_next_locks

  printf "\n${GREEN}${BOLD}Stopped${RESET}\n"
  printf "  API pid file: %s\n" "$API_LOG_DIR/api.pid"
  printf "  Web pid file: %s\n" "$WEB_LOG_DIR/web.pid"
  printf "  tmux session: %s\n" "$TMUX_SESSION"
  printf "  Compose project: %s\n" "$COMPOSE_PROJECT_NAME"
  printf "  Full Docker compose project: %s\n" "$DOCKER_COMPOSE_PROJECT_NAME"
  printf "  Log: %s\n" "$STOP_LOG"
}

main "$@"
