#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_ROOT="$ROOT_DIR/logs"
SETUP_LOG_DIR="$LOG_ROOT/setup"
RUNTIME_LOG_DIR="$LOG_ROOT/runtime"
API_LOG_DIR="$RUNTIME_LOG_DIR/backend"
WEB_LOG_DIR="$RUNTIME_LOG_DIR/frontend"
SETUP_LOG="$SETUP_LOG_DIR/setup-$(date +%Y%m%d-%H%M%S).log"
API_LOG=""
WEB_LOG=""
ENV_FILE="$ROOT_DIR/.env"
ENV_EXAMPLE="$ROOT_DIR/.env.example"
API_PORT="${API_PORT:-7010}"
WEB_PORT="${WEB_PORT:-7000}"
POSTGRES_PORT="${POSTGRES_PORT:-55432}"
REDIS_PORT="${REDIS_PORT:-56379}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-retail_agent_provider}"
LOG_RETENTION_DAYS="${LOG_RETENTION_DAYS:-7}"
LOG_MAX_SIZE_MB="${LOG_MAX_SIZE_MB:-20}"
RUN_TESTS="${RUN_TESTS:-0}"
SKIP_DOCKER="${SKIP_DOCKER:-0}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

mkdir -p "$SETUP_LOG_DIR" "$API_LOG_DIR" "$WEB_LOG_DIR"
: > "$SETUP_LOG"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$SETUP_LOG"
}

print_banner() {
  printf "${GREEN}${BOLD}\n"
  printf "╔══════════════════════════════════════════════════════╗\n"
  printf "║              Retail AI Agent Setup                  ║\n"
  printf "║        backend + frontend + logs + runtime          ║\n"
  printf "╚══════════════════════════════════════════════════════╝\n"
  printf "${RESET}\n"
  printf "${GRAY}Root: %s${RESET}\n" "$ROOT_DIR"
  printf "${GRAY}Setup log: %s${RESET}\n\n" "$SETUP_LOG"
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

run() {
  log "RUN $*"
  "$@" >> "$SETUP_LOG" 2>&1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

load_env_file() {
  local incoming_api_port="${API_PORT:-}"
  local incoming_web_port="${WEB_PORT:-}"
  local incoming_postgres_port="${POSTGRES_PORT:-}"
  local incoming_redis_port="${REDIS_PORT:-}"
  local incoming_compose_project_name="${COMPOSE_PROJECT_NAME:-}"
  local incoming_database_url="${DATABASE_URL:-}"
  local incoming_chat_model_base_url="${CHAT_MODEL_BASE_URL:-}"
  local incoming_chat_model_id="${CHAT_MODEL_ID:-}"
  local incoming_embed_rerank_base_url="${EMBED_RERANK_BASE_URL:-}"
  local incoming_redis_url="${REDIS_URL:-}"

  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    ok "Loaded .env"
  elif [[ -f "$ENV_EXAMPLE" ]]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
    warn "Created .env from .env.example; review model/database values if needed"
  else
    warn "No .env or .env.example found; using process environment"
  fi

  export API_PORT="${incoming_api_port:-${API_PORT:-7010}}"
  export WEB_PORT="${incoming_web_port:-${WEB_PORT:-7000}}"
  export POSTGRES_PORT="${incoming_postgres_port:-${POSTGRES_PORT:-55432}}"
  export REDIS_PORT="${incoming_redis_port:-${REDIS_PORT:-56379}}"
  export COMPOSE_PROJECT_NAME="${incoming_compose_project_name:-${COMPOSE_PROJECT_NAME:-retail_agent_provider}}"
  export DATABASE_URL="${incoming_database_url:-${DATABASE_URL:-postgresql://retail:retail_password@localhost:${POSTGRES_PORT}/retail_agent?schema=public}}"
  export CHAT_MODEL_BASE_URL="${incoming_chat_model_base_url:-${CHAT_MODEL_BASE_URL:-https://replace-with-your-vllm-gateway.example.invalid}}"
  export CHAT_MODEL_ID="${incoming_chat_model_id:-${CHAT_MODEL_ID:-replace-with-your-chat-model-id}}"
  export EMBED_RERANK_BASE_URL="${incoming_embed_rerank_base_url:-${EMBED_RERANK_BASE_URL:-https://replace-with-your-embed-rerank-gateway.example.invalid}}"
  export REDIS_URL="${incoming_redis_url:-${REDIS_URL:-redis://localhost:${REDIS_PORT}}}"
  export API_BASE_URL="http://127.0.0.1:${API_PORT}"
  API_LOG="$API_LOG_DIR/api-${API_PORT}.log"
  WEB_LOG="$WEB_LOG_DIR/web-${WEB_PORT}.log"
}

cleanup_logs() {
  step "Prepare and rotate logs"
  mkdir -p "$SETUP_LOG_DIR" "$API_LOG_DIR" "$WEB_LOG_DIR"
  : > "$API_LOG"
  : > "$WEB_LOG"

  find "$LOG_ROOT" -type f \( -name '*.log' -o -name '*.md' \) -mtime "+$LOG_RETENTION_DAYS" -print -delete >> "$SETUP_LOG" 2>&1 || true
  find "$LOG_ROOT" -type f -name '*.log' -size "+${LOG_MAX_SIZE_MB}M" -print -exec sh -c ': > "$1"' _ {} \; >> "$SETUP_LOG" 2>&1 || true
  ok "Logs ready: backend=$API_LOG frontend=$WEB_LOG"
}

check_node() {
  step "Check Node.js, Corepack and pnpm"
  command_exists node || fail "Node.js is required. Install Node.js 20+ first."
  command_exists corepack || fail "Corepack is required. Install a recent Node.js version with Corepack."

  local node_major
  node_major="$(node -p 'process.versions.node.split(`.`)[0]')"
  if [[ "$node_major" -lt 20 ]]; then
    fail "Node.js 20+ is required, found $(node -v)"
  fi

  if ! corepack enable >> "$SETUP_LOG" 2>&1; then
    warn "corepack enable failed; continuing with existing Corepack shims"
  fi
  run corepack pnpm --version
  ok "Node $(node -v), pnpm $(corepack pnpm --version)"
}

check_python() {
  step "Check Python and venv support"
  local python_cmd=()
  if command_exists python3; then
    python_cmd=(python3)
  elif command_exists python; then
    python_cmd=(python)
  elif command_exists py; then
    python_cmd=(py -3)
  fi

  if [[ "${#python_cmd[@]}" -eq 0 ]]; then
    warn "Python not found; no Python dependencies are required by this repo right now"
    return
  fi

  "${python_cmd[@]}" --version >> "$SETUP_LOG" 2>&1 || warn "Python exists but version check failed"
  if [[ ! -d "$ROOT_DIR/.venv" ]]; then
    "${python_cmd[@]}" -m venv "$ROOT_DIR/.venv" >> "$SETUP_LOG" 2>&1 || warn "Could not create .venv; continuing because repo has no Python requirements"
  fi
  ok "Python checked; .venv available when supported"
}

install_dependencies() {
  step "Install workspace dependencies"
  run corepack pnpm install
  ok "Node dependencies installed"
}

start_docker_services() {
  if [[ "$SKIP_DOCKER" == "1" ]]; then
    warn "Skipping Docker services because SKIP_DOCKER=1"
    return
  fi

  step "Start PostgreSQL and Redis"
  command_exists docker || fail "Docker is required to start local PostgreSQL/Redis. Set SKIP_DOCKER=1 to skip."
  if docker compose -p "$COMPOSE_PROJECT_NAME" -f "$ROOT_DIR/infra/docker/docker-compose.yml" up -d >> "$SETUP_LOG" 2>&1; then
    ok "Docker services requested"
  else
    fail "Docker compose failed. Check Docker Desktop and make sure POSTGRES_PORT=$POSTGRES_PORT and REDIS_PORT=$REDIS_PORT are free, or set SKIP_DOCKER=1 with external services."
  fi
}

wait_for_port() {
  local host="$1"
  local port="$2"
  local name="$3"
  local attempts="${4:-60}"

  for _ in $(seq 1 "$attempts"); do
    if command_exists nc && nc -z "$host" "$port" >/dev/null 2>&1; then
      ok "$name is reachable on $host:$port"
      return
    fi
    if command_exists powershell.exe && powershell.exe -NoProfile -Command "exit ([int]-not (Test-NetConnection -ComputerName '$host' -Port $port -InformationLevel Quiet))" >/dev/null 2>&1; then
      ok "$name is reachable on $host:$port"
      return
    fi
    sleep 1
  done

  fail "$name did not become reachable on $host:$port"
}

wait_for_http() {
  local url="$1"
  local name="$2"
  local attempts="${3:-60}"

  for _ in $(seq 1 "$attempts"); do
    if command_exists curl && curl -fsS "$url" >> "$SETUP_LOG" 2>&1; then
      ok "$name responded successfully: $url"
      return
    fi
    if command_exists powershell.exe && powershell.exe -NoProfile -Command "try { \$response = Invoke-WebRequest -Uri '$url' -UseBasicParsing -TimeoutSec 5; exit ([int](\$response.StatusCode -lt 200 -or \$response.StatusCode -ge 300)) } catch { exit 1 }" >> "$SETUP_LOG" 2>&1; then
      ok "$name responded successfully: $url"
      return
    fi
    sleep 1
  done

  fail "$name did not return a successful HTTP response: $url"
}

prepare_database() {
  step "Prepare Prisma database"
  wait_for_port 127.0.0.1 "$POSTGRES_PORT" PostgreSQL 90
  wait_for_port 127.0.0.1 "$REDIS_PORT" Redis 90
  run corepack pnpm --filter @retail-agent/api db:generate
  run corepack pnpm --filter @retail-agent/api db:push
  run corepack pnpm --filter @retail-agent/api db:seed
  ok "Database generated, pushed and seeded"
}

run_optional_tests() {
  if [[ "$RUN_TESTS" != "1" ]]; then
    warn "Skipping tests by default. Run with RUN_TESTS=1 ./setup.sh to validate before startup."
    return
  fi

  step "Run typechecks and tests"
  run corepack pnpm --filter @retail-agent/api typecheck
  run corepack pnpm --filter @retail-agent/web typecheck
  run corepack pnpm --filter @retail-agent/web test
  ok "Selected checks passed"
}

cleanup_next_locks() {
  rm -rf "$ROOT_DIR/apps/web/.next/dev/lock" "$ROOT_DIR/apps/web/.next/dev/server" >> "$SETUP_LOG" 2>&1 || true
  ok "Cleared stale Next dev locks for apps/web when present"
}

start_runtime() {
  step "Start backend and frontend"
  cleanup_next_locks

  run corepack pnpm --filter @retail-agent/api build

  (
    cd "$ROOT_DIR"
    API_PORT="$API_PORT" PORT="$API_PORT" DATABASE_URL="$DATABASE_URL" CHAT_MODEL_BASE_URL="$CHAT_MODEL_BASE_URL" CHAT_MODEL_ID="$CHAT_MODEL_ID" EMBED_RERANK_BASE_URL="$EMBED_RERANK_BASE_URL" REDIS_URL="$REDIS_URL" corepack pnpm --filter @retail-agent/api start >> "$API_LOG" 2>&1
  ) &
  local api_pid=$!

  wait_for_port 127.0.0.1 "$API_PORT" "API" 90
  wait_for_http "http://127.0.0.1:${API_PORT}/health" "API health" 90
  wait_for_http "http://127.0.0.1:${API_PORT}/api/v1/products" "API products" 90

  (
    cd "$ROOT_DIR/apps/web"
    API_BASE_URL="http://127.0.0.1:${API_PORT}" PORT="$WEB_PORT" corepack pnpm exec next dev -H 0.0.0.0 -p "$WEB_PORT" >> "$WEB_LOG" 2>&1
  ) &
  local web_pid=$!

  wait_for_port 127.0.0.1 "$WEB_PORT" "Web" 90

  printf "%s\n" "$api_pid" > "$API_LOG_DIR/api.pid"
  printf "%s\n" "$web_pid" > "$WEB_LOG_DIR/web.pid"

  ok "Backend running: http://127.0.0.1:${API_PORT} (pid $api_pid)"
  ok "Frontend running: http://127.0.0.1:${WEB_PORT} (pid $web_pid)"
  printf "\n${GREEN}${BOLD}Ready${RESET}\n"
  printf "  API:  http://127.0.0.1:%s\n" "$API_PORT"
  printf "  Web:  http://127.0.0.1:%s\n" "$WEB_PORT"
  printf "  Logs: %s\n        %s\n" "$API_LOG" "$WEB_LOG"
  printf "\n${GRAY}Stop later with: ./stop.sh${RESET}\n"
}

main() {
  cd "$ROOT_DIR"
  if [[ "${SETUP_SKIP_STOP:-0}" != "1" && -x "$ROOT_DIR/stop.sh" ]]; then
    "$ROOT_DIR/stop.sh" || true
  fi
  print_banner
  load_env_file
  cleanup_logs
  check_node
  check_python
  install_dependencies
  start_docker_services
  prepare_database
  run_optional_tests
  start_runtime
}

main "$@"
