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
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    ok "Loaded .env"
  else
    warn "No .env found; using default ports"
  fi

  export API_PORT="${API_PORT:-7010}"
  export WEB_PORT="${WEB_PORT:-7000}"
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

stop_port() {
  local port="$1"
  local label="$2"

  if command_exists powershell.exe; then
    powershell.exe -NoProfile -Command "\$portNumber=$port; Get-NetTCPConnection -LocalPort \$portNumber -State Listen -ErrorAction SilentlyContinue | Where-Object { \$_.OwningProcess -gt 0 } | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id \$_ -Force -ErrorAction SilentlyContinue }" >> "$STOP_LOG" 2>&1 || true
    ok "Cleared $label listeners on port $port when present"
    return
  fi

  if command_exists lsof; then
    local pids
    pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      printf '%s\n' "$pids" | xargs -r kill -TERM >> "$STOP_LOG" 2>&1 || true
      sleep 1
      printf '%s\n' "$pids" | xargs -r kill -KILL >> "$STOP_LOG" 2>&1 || true
      ok "Cleared $label listeners on port $port"
    else
      warn "No $label listener found on port $port"
    fi
    return
  fi

  warn "No supported port cleanup tool found for $label on port $port"
}

stop_next_dev_servers() {
  if command_exists powershell.exe; then
    powershell.exe -NoProfile -Command "\$webDir = (Resolve-Path '$ROOT_DIR/apps/web').Path.ToLowerInvariant(); Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -and \$_.CommandLine.ToLowerInvariant().Contains('next') -and \$_.CommandLine.ToLowerInvariant().Contains(\$webDir) } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" >> "$STOP_LOG" 2>&1 || true
  fi
  rm -rf "$ROOT_DIR/apps/web/.next/dev/lock" "$ROOT_DIR/apps/web/.next/dev/server" >> "$STOP_LOG" 2>&1 || true
  ok "Cleared stale Next dev servers and locks for apps/web when present"
}

main() {
  cd "$ROOT_DIR"
  print_banner
  load_env_file

  step "Stop processes from setup PID files"
  stop_pid_file "$API_LOG_DIR/api.pid" "backend"
  stop_pid_file "$WEB_LOG_DIR/web.pid" "frontend"

  step "Fallback cleanup by configured ports"
  stop_port "$API_PORT" "backend"
  stop_port "$WEB_PORT" "frontend"
  stop_port 3000 "legacy frontend"
  stop_port 3001 "legacy backend"
  stop_next_dev_servers

  printf "\n${GREEN}${BOLD}Stopped${RESET}\n"
  printf "  API port checked:  %s\n" "$API_PORT"
  printf "  Web port checked:  %s\n" "$WEB_PORT"
  printf "  Log: %s\n" "$STOP_LOG"
}

main "$@"
