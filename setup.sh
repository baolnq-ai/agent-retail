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
API_PORT="${API_PORT:-3110}"
WEB_PORT="${WEB_PORT:-3100}"
NGINX_PORT="${NGINX_PORT:-3120}"
POSTGRES_PORT="${POSTGRES_PORT:-3132}"
REDIS_PORT="${REDIS_PORT:-3139}"
QDRANT_PORT="${QDRANT_PORT:-3133}"
QDRANT_GRPC_PORT="${QDRANT_GRPC_PORT:-3134}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-retail_agent_dev}"
DOCKER_COMPOSE_PROJECT_NAME="${DOCKER_COMPOSE_PROJECT_NAME:-retail_agent_full}"
DOCKER_IMAGE_REPO="${DOCKER_IMAGE_REPO:-baonguyen3568/ai-agent-retail}"
IMAGE_TAG="${IMAGE_TAG:-v0.1.0-20260528}"
SETUP_RUN_MODE="${SETUP_RUN_MODE:-}"
LOG_RETENTION_DAYS="${LOG_RETENTION_DAYS:-7}"
LOG_MAX_SIZE_MB="${LOG_MAX_SIZE_MB:-20}"
RUN_TESTS="${RUN_TESTS:-0}"
SKIP_DOCKER="${SKIP_DOCKER:-0}"
SETUP_TERMINAL_MODE="${SETUP_TERMINAL_MODE:-auto}"
TMUX_SESSION="${TMUX_SESSION:-egnt-retail}"
PORT_MIN=3100
PORT_MAX=3150

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

run_with_sudo() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command_exists sudo; then
    sudo "$@"
  else
    return 1
  fi
}

install_system_packages() {
  local packages=("$@")
  [[ "${#packages[@]}" -gt 0 ]] || return 0

  if command_exists apt-get; then
    run_with_sudo apt-get update >> "$SETUP_LOG" 2>&1 || return 1
    run_with_sudo apt-get install -y "${packages[@]}" >> "$SETUP_LOG" 2>&1
    return $?
  fi
  if command_exists dnf; then
    run_with_sudo dnf install -y "${packages[@]}" >> "$SETUP_LOG" 2>&1
    return $?
  fi
  if command_exists yum; then
    run_with_sudo yum install -y "${packages[@]}" >> "$SETUP_LOG" 2>&1
    return $?
  fi
  if command_exists pacman; then
    run_with_sudo pacman -Sy --noconfirm "${packages[@]}" >> "$SETUP_LOG" 2>&1
    return $?
  fi
  if command_exists apk; then
    run_with_sudo apk add --no-cache "${packages[@]}" >> "$SETUP_LOG" 2>&1
    return $?
  fi
  if command_exists brew; then
    brew install "${packages[@]}" >> "$SETUP_LOG" 2>&1
    return $?
  fi
  return 1
}

ensure_system_dependencies() {
  step "Check Linux/macOS helper tools"

  local missing=()
  command_exists curl || missing+=(curl)
  command_exists tmux || missing+=(tmux)
  if ! command_exists nc; then
    if command_exists apt-get || command_exists dnf || command_exists yum; then
      missing+=(netcat-openbsd)
    elif command_exists pacman; then
      missing+=(gnu-netcat)
    elif command_exists apk; then
      missing+=(netcat-openbsd)
    else
      missing+=(netcat)
    fi
  fi
  command_exists lsof || missing+=(lsof)

  if [[ "${#missing[@]}" -gt 0 ]]; then
    if install_system_packages "${missing[@]}"; then
      ok "Installed missing helper tools: ${missing[*]}"
    else
      warn "Could not auto-install helper tools (${missing[*]}). Install them manually if port/tmux checks fail."
    fi
  else
    ok "Helper tools are available"
  fi

  if ! command_exists docker; then
    if [[ "$SKIP_DOCKER" != "1" ]]; then
      if command_exists apt-get; then
        if install_system_packages docker.io docker-compose-plugin; then
          ok "Installed Docker packages from apt. If the daemon is not running, start Docker and rerun setup."
        else
          warn "Docker CLI not found and auto-install failed. Install Docker Engine/Desktop or run with SKIP_DOCKER=1."
        fi
      else
        warn "Docker CLI not found. Install Docker Engine/Desktop or run with SKIP_DOCKER=1."
      fi
    fi
  fi
}

validate_port_range() {
  local name="$1"
  local value="$2"
  if ! [[ "$value" =~ ^[0-9]+$ ]]; then
    fail "$name must be a number, got: $value"
  fi
  if (( value < PORT_MIN || value > PORT_MAX )); then
    fail "$name=$value is outside the project port range ${PORT_MIN}-${PORT_MAX}"
  fi
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
  local incoming_docker_image_repo="${DOCKER_IMAGE_REPO:-}"
  local incoming_image_tag="${IMAGE_TAG:-}"
  local incoming_setup_run_mode="${SETUP_RUN_MODE:-}"
  local incoming_tmux_session="${TMUX_SESSION:-}"
  local incoming_database_url="${DATABASE_URL:-}"
  local incoming_chat_model_base_url="${CHAT_MODEL_BASE_URL:-}"
  local incoming_chat_model_id="${CHAT_MODEL_ID:-}"
  local incoming_embed_rerank_base_url="${EMBED_RERANK_BASE_URL:-}"
  local incoming_redis_url="${REDIS_URL:-}"
  local incoming_qdrant_url="${QDRANT_URL:-}"
  local incoming_cors_origins="${CORS_ORIGINS:-}"
  local incoming_next_public_api_base_url="${NEXT_PUBLIC_API_BASE_URL:-}"
  local incoming_next_public_site_url="${NEXT_PUBLIC_SITE_URL:-}"
  local incoming_next_allowed_dev_origins="${NEXT_ALLOWED_DEV_ORIGINS:-}"
  local incoming_tunnel_public_url="${TUNNEL_PUBLIC_URL:-}"

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

  local loaded_chat_model_base_url="${CHAT_MODEL_BASE_URL:-}"
  local loaded_chat_model_id="${CHAT_MODEL_ID:-}"
  local loaded_embed_rerank_base_url="${EMBED_RERANK_BASE_URL:-}"

  export API_PORT="${incoming_api_port:-${API_PORT:-3110}}"
  export WEB_PORT="${incoming_web_port:-${WEB_PORT:-3100}}"
  export NGINX_PORT="${incoming_nginx_port:-${NGINX_PORT:-3120}}"
  export POSTGRES_PORT="${incoming_postgres_port:-${POSTGRES_PORT:-3132}}"
  export REDIS_PORT="${incoming_redis_port:-${REDIS_PORT:-3139}}"
  export QDRANT_PORT="${incoming_qdrant_port:-${QDRANT_PORT:-3133}}"
  export QDRANT_GRPC_PORT="${incoming_qdrant_grpc_port:-${QDRANT_GRPC_PORT:-3134}}"
  export COMPOSE_PROJECT_NAME="${incoming_compose_project_name:-${COMPOSE_PROJECT_NAME:-retail_agent_dev}}"
  export DOCKER_COMPOSE_PROJECT_NAME="${incoming_docker_compose_project_name:-${DOCKER_COMPOSE_PROJECT_NAME:-retail_agent_full}}"
  export DOCKER_IMAGE_REPO="${incoming_docker_image_repo:-${DOCKER_IMAGE_REPO:-baonguyen3568/ai-agent-retail}}"
  export IMAGE_TAG="${incoming_image_tag:-${IMAGE_TAG:-v0.1.0-20260528}}"
  export SETUP_RUN_MODE="${incoming_setup_run_mode:-${SETUP_RUN_MODE:-}}"
  export TMUX_SESSION="${incoming_tmux_session:-${TMUX_SESSION:-egnt-retail}}"
  if [[ "$TMUX_SESSION" != *"egnt-retail"* ]]; then
    warn "TMUX_SESSION must contain egnt-retail; using egnt-retail-${TMUX_SESSION}"
    export TMUX_SESSION="egnt-retail-${TMUX_SESSION}"
  fi
  export DATABASE_URL="${incoming_database_url:-${DATABASE_URL:-postgresql://retail:retail_password@localhost:${POSTGRES_PORT}/retail_agent?schema=public}}"
  if [[ "$incoming_chat_model_base_url" =~ replace-with|example\.invalid ]]; then incoming_chat_model_base_url=""; fi
  if [[ "$incoming_chat_model_id" == "replace-with-your-chat-model-id" ]]; then incoming_chat_model_id=""; fi
  if [[ "$incoming_embed_rerank_base_url" =~ replace-with|example\.invalid ]]; then incoming_embed_rerank_base_url=""; fi

  export CHAT_MODEL_BASE_URL="${incoming_chat_model_base_url:-${CHAT_MODEL_BASE_URL:-https://replace-with-your-vllm-gateway.example.invalid}}"
  export CHAT_MODEL_ID="${incoming_chat_model_id:-${CHAT_MODEL_ID:-google/gemma-4-E4B-it}}"
  export EMBED_RERANK_BASE_URL="${incoming_embed_rerank_base_url:-${EMBED_RERANK_BASE_URL:-https://replace-with-your-embed-rerank-gateway.example.invalid}}"
  if [[ -n "$incoming_chat_model_base_url" && -n "$loaded_chat_model_base_url" && "$incoming_chat_model_base_url" != "$loaded_chat_model_base_url" ]]; then warn "CHAT_MODEL_BASE_URL from shell overrides .env value. Effective value: $incoming_chat_model_base_url"; fi
  if [[ -n "$incoming_chat_model_id" && -n "$loaded_chat_model_id" && "$incoming_chat_model_id" != "$loaded_chat_model_id" ]]; then warn "CHAT_MODEL_ID from shell overrides .env value. Effective value: $incoming_chat_model_id"; fi
  if [[ -n "$incoming_embed_rerank_base_url" && -n "$loaded_embed_rerank_base_url" && "$incoming_embed_rerank_base_url" != "$loaded_embed_rerank_base_url" ]]; then warn "EMBED_RERANK_BASE_URL from shell overrides .env value. Effective value: $incoming_embed_rerank_base_url"; fi
  if [[ "$CHAT_MODEL_BASE_URL" =~ replace-with|example\.invalid || "$CHAT_MODEL_ID" == "replace-with-your-chat-model-id" || "$EMBED_RERANK_BASE_URL" =~ replace-with|example\.invalid ]]; then
    warn "Model config still uses placeholders. Set CHAT_MODEL_BASE_URL, CHAT_MODEL_ID and EMBED_RERANK_BASE_URL in .env for real chatbot validation."
  fi
  ok "Effective model config: CHAT_MODEL_BASE_URL=$CHAT_MODEL_BASE_URL; CHAT_MODEL_ID=$CHAT_MODEL_ID; EMBED_RERANK_BASE_URL=$EMBED_RERANK_BASE_URL"
  export REDIS_URL="${incoming_redis_url:-${REDIS_URL:-redis://localhost:${REDIS_PORT}}}"
  export QDRANT_URL="${incoming_qdrant_url:-${QDRANT_URL:-http://localhost:${QDRANT_PORT}}}"
  export CORS_ORIGINS="${incoming_cors_origins:-${CORS_ORIGINS:-http://127.0.0.1:${WEB_PORT},http://localhost:${WEB_PORT},http://127.0.0.1:${NGINX_PORT},http://localhost:${NGINX_PORT}}}"
  export NEXT_ALLOWED_DEV_ORIGINS="${incoming_next_allowed_dev_origins:-${NEXT_ALLOWED_DEV_ORIGINS:-*.trycloudflare.com}}"
  export TUNNEL_PUBLIC_URL="${incoming_tunnel_public_url:-${TUNNEL_PUBLIC_URL:-}}"
  if [[ -n "$TUNNEL_PUBLIC_URL" ]]; then
    TUNNEL_PUBLIC_URL="${TUNNEL_PUBLIC_URL%/}"
    if [[ ! "$TUNNEL_PUBLIC_URL" =~ ^https?://[^/]+$ ]]; then
      fail "TUNNEL_PUBLIC_URL must be a valid origin such as https://example.trycloudflare.com"
    fi
    export NEXT_PUBLIC_API_BASE_URL="$TUNNEL_PUBLIC_URL"
    export NEXT_PUBLIC_SITE_URL="$TUNNEL_PUBLIC_URL"
    if [[ ",$CORS_ORIGINS," != *",$TUNNEL_PUBLIC_URL,"* ]]; then
      export CORS_ORIGINS="${CORS_ORIGINS},${TUNNEL_PUBLIC_URL}"
    fi
    local tunnel_host="${TUNNEL_PUBLIC_URL#*://}"
    if [[ ",$NEXT_ALLOWED_DEV_ORIGINS," != *",$tunnel_host,"* ]]; then
      export NEXT_ALLOWED_DEV_ORIGINS="${NEXT_ALLOWED_DEV_ORIGINS},${tunnel_host}"
    fi
  else
    export NEXT_PUBLIC_API_BASE_URL="${incoming_next_public_api_base_url:-${NEXT_PUBLIC_API_BASE_URL:-http://127.0.0.1:${NGINX_PORT}}}"
    export NEXT_PUBLIC_SITE_URL="${incoming_next_public_site_url:-${NEXT_PUBLIC_SITE_URL:-$NEXT_PUBLIC_API_BASE_URL}}"
  fi
  validate_port_range API_PORT "$API_PORT"
  validate_port_range WEB_PORT "$WEB_PORT"
  validate_port_range NGINX_PORT "$NGINX_PORT"
  validate_port_range POSTGRES_PORT "$POSTGRES_PORT"
  validate_port_range REDIS_PORT "$REDIS_PORT"
  validate_port_range QDRANT_PORT "$QDRANT_PORT"
  validate_port_range QDRANT_GRPC_PORT "$QDRANT_GRPC_PORT"
  export API_BASE_URL="http://127.0.0.1:${API_PORT}"
  if [[ "$SKIP_DOCKER" == "1" && -z "$TUNNEL_PUBLIC_URL" ]]; then
    export NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:${API_PORT}"
    export NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_API_BASE_URL"
  elif [[ -z "$TUNNEL_PUBLIC_URL" && -z "$incoming_next_public_api_base_url" ]]; then
    export NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:${NGINX_PORT}"
    export NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_API_BASE_URL"
  fi
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
  if ! command_exists node; then
    warn "Node.js not found; trying to install nodejs/npm from system package manager."
    install_system_packages nodejs npm || true
  fi
  command_exists node || fail "Node.js 20+ is required. Install Node.js 20+ first."

  if ! command_exists corepack; then
    warn "Corepack not found; trying npm install -g corepack."
    if command_exists npm; then
      run_with_sudo npm install -g corepack >> "$SETUP_LOG" 2>&1 || true
    fi
  fi
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

  step "Start PostgreSQL, Redis, Qdrant and nginx"
  command_exists docker || fail "Docker is required to start local PostgreSQL/Redis/Qdrant. Set SKIP_DOCKER=1 to skip."
  if docker compose -p "$COMPOSE_PROJECT_NAME" -f "$ROOT_DIR/infra/docker/docker-compose.yml" up -d >> "$SETUP_LOG" 2>&1; then
    ok "Docker services requested"
  else
    fail "Docker compose failed. Check Docker Desktop and make sure POSTGRES_PORT=$POSTGRES_PORT, REDIS_PORT=$REDIS_PORT, QDRANT_PORT=$QDRANT_PORT and NGINX_PORT=$NGINX_PORT are free, or set SKIP_DOCKER=1 with external services."
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
  if [[ "$SKIP_DOCKER" != "1" ]]; then
    wait_for_http "${QDRANT_URL}/healthz" "Qdrant" 90
    wait_for_http "http://127.0.0.1:${NGINX_PORT}/nginx-health" "nginx" 90
  fi
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

quote_arg() {
  printf '%q' "$1"
}

start_runtime_tmux() {
  step "Start backend and frontend in tmux"
  cleanup_next_locks

  run corepack pnpm prepare:generated
  run corepack pnpm --filter @retail-agent/api build

  if tmux has-session -t "$TMUX_SESSION" >/dev/null 2>&1; then
    tmux kill-session -t "$TMUX_SESSION" >> "$SETUP_LOG" 2>&1 || true
    warn "Replaced existing tmux session: $TMUX_SESSION"
  fi

  local root_q api_log_q web_log_q api_pid_q web_pid_q api_port_q web_port_q database_url_q chat_base_q chat_id_q embed_base_q redis_url_q qdrant_url_q api_base_q public_api_base_q
  root_q="$(quote_arg "$ROOT_DIR")"
  api_log_q="$(quote_arg "$API_LOG")"
  web_log_q="$(quote_arg "$WEB_LOG")"
  api_pid_q="$(quote_arg "$API_LOG_DIR/api.pid")"
  web_pid_q="$(quote_arg "$WEB_LOG_DIR/web.pid")"
  api_port_q="$(quote_arg "$API_PORT")"
  web_port_q="$(quote_arg "$WEB_PORT")"
  database_url_q="$(quote_arg "$DATABASE_URL")"
  chat_base_q="$(quote_arg "$CHAT_MODEL_BASE_URL")"
  chat_id_q="$(quote_arg "$CHAT_MODEL_ID")"
  embed_base_q="$(quote_arg "$EMBED_RERANK_BASE_URL")"
  redis_url_q="$(quote_arg "$REDIS_URL")"
  qdrant_url_q="$(quote_arg "$QDRANT_URL")"
  cors_origins_q="$(quote_arg "$CORS_ORIGINS")"
  api_base_q="$(quote_arg "http://127.0.0.1:${API_PORT}")"
  public_api_base_q="$(quote_arg "$NEXT_PUBLIC_API_BASE_URL")"
  public_site_url_q="$(quote_arg "$NEXT_PUBLIC_SITE_URL")"
  next_allowed_dev_origins_q="$(quote_arg "$NEXT_ALLOWED_DEV_ORIGINS")"

  local api_cmd web_cmd
  api_cmd="cd $root_q && echo \$\$ > $api_pid_q && exec > >(tee -a $api_log_q) 2>&1 && exec env API_PORT=$api_port_q PORT=$api_port_q DATABASE_URL=$database_url_q CHAT_MODEL_BASE_URL=$chat_base_q CHAT_MODEL_ID=$chat_id_q EMBED_RERANK_BASE_URL=$embed_base_q REDIS_URL=$redis_url_q QDRANT_URL=$qdrant_url_q CORS_ORIGINS=$cors_origins_q corepack pnpm --filter @retail-agent/api start"
  web_cmd="cd $root_q/apps/web && echo \$\$ > $web_pid_q && exec > >(tee -a $web_log_q) 2>&1 && exec env API_BASE_URL=$api_base_q NEXT_PUBLIC_API_BASE_URL=$public_api_base_q NEXT_PUBLIC_SITE_URL=$public_site_url_q NEXT_ALLOWED_DEV_ORIGINS=$next_allowed_dev_origins_q PORT=$web_port_q corepack pnpm exec next dev -H 0.0.0.0 -p $web_port_q"

  tmux new-session -d -s "$TMUX_SESSION" -n api "bash -lc $(quote_arg "$api_cmd")" >> "$SETUP_LOG" 2>&1
  ok "tmux session started: $TMUX_SESSION window=api"

  wait_for_port 127.0.0.1 "$API_PORT" "API" 90
  wait_for_http "http://127.0.0.1:${API_PORT}/health" "API health" 90
  wait_for_http "http://127.0.0.1:${API_PORT}/api/v1/products" "API products" 90

  tmux new-window -t "$TMUX_SESSION" -n web "bash -lc $(quote_arg "$web_cmd")" >> "$SETUP_LOG" 2>&1
  ok "tmux window started: $TMUX_SESSION:web"
  wait_for_port 127.0.0.1 "$WEB_PORT" "Web" 90
  if [[ "$SKIP_DOCKER" != "1" ]]; then
    wait_for_http "http://127.0.0.1:${NGINX_PORT}/health" "nginx API proxy" 90
    wait_for_http "http://127.0.0.1:${NGINX_PORT}/" "nginx web proxy" 90
  fi

  local api_pid web_pid
  api_pid="$(cat "$API_LOG_DIR/api.pid" 2>/dev/null || true)"
  web_pid="$(cat "$WEB_LOG_DIR/web.pid" 2>/dev/null || true)"

  ok "Backend running in tmux: $TMUX_SESSION:api http://127.0.0.1:${API_PORT} (pid ${api_pid:-unknown})"
  ok "Frontend running in tmux: $TMUX_SESSION:web http://127.0.0.1:${WEB_PORT} (pid ${web_pid:-unknown})"
  print_ready_summary "tmux"
}

start_runtime_background() {
  step "Start backend and frontend in background"
  cleanup_next_locks

  run corepack pnpm prepare:generated
  run corepack pnpm --filter @retail-agent/api build

  (
    cd "$ROOT_DIR"
    API_PORT="$API_PORT" PORT="$API_PORT" DATABASE_URL="$DATABASE_URL" CHAT_MODEL_BASE_URL="$CHAT_MODEL_BASE_URL" CHAT_MODEL_ID="$CHAT_MODEL_ID" EMBED_RERANK_BASE_URL="$EMBED_RERANK_BASE_URL" REDIS_URL="$REDIS_URL" QDRANT_URL="$QDRANT_URL" CORS_ORIGINS="$CORS_ORIGINS" corepack pnpm --filter @retail-agent/api start >> "$API_LOG" 2>&1
  ) &
  local api_pid=$!

  wait_for_port 127.0.0.1 "$API_PORT" "API" 90
  wait_for_http "http://127.0.0.1:${API_PORT}/health" "API health" 90
  wait_for_http "http://127.0.0.1:${API_PORT}/api/v1/products" "API products" 90

  (
    cd "$ROOT_DIR/apps/web"
    API_BASE_URL="http://127.0.0.1:${API_PORT}" NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" NEXT_ALLOWED_DEV_ORIGINS="$NEXT_ALLOWED_DEV_ORIGINS" PORT="$WEB_PORT" corepack pnpm exec next dev -H 0.0.0.0 -p "$WEB_PORT" >> "$WEB_LOG" 2>&1
  ) &
  local web_pid=$!

  wait_for_port 127.0.0.1 "$WEB_PORT" "Web" 90
  if [[ "$SKIP_DOCKER" != "1" ]]; then
    wait_for_http "http://127.0.0.1:${NGINX_PORT}/health" "nginx API proxy" 90
    wait_for_http "http://127.0.0.1:${NGINX_PORT}/" "nginx web proxy" 90
  fi

  printf "%s\n" "$api_pid" > "$API_LOG_DIR/api.pid"
  printf "%s\n" "$web_pid" > "$WEB_LOG_DIR/web.pid"

  ok "Backend running: http://127.0.0.1:${API_PORT} (pid $api_pid)"
  ok "Frontend running: http://127.0.0.1:${WEB_PORT} (pid $web_pid)"
  print_ready_summary "background"
}

print_ready_summary() {
  local mode="$1"
  printf "\n${GREEN}${BOLD}Ready${RESET}\n"
  printf "  Mode: %s\n" "$mode"
  printf "  API:  http://127.0.0.1:%s\n" "$API_PORT"
  printf "  Web:  http://127.0.0.1:%s\n" "$WEB_PORT"
  if [[ "$SKIP_DOCKER" != "1" ]]; then
    printf "  Tunnel/nginx entry: http://127.0.0.1:%s\n" "$NGINX_PORT"
  fi
  printf "  Agent dashboard: http://127.0.0.1:%s/agent-dashboard\n" "$WEB_PORT"
  printf "  API health: http://127.0.0.1:%s/health\n" "$API_PORT"
  printf "  Setup log: %s\n" "$SETUP_LOG"
  printf "  API log:   %s\n" "$API_LOG"
  printf "  Web log:   %s\n" "$WEB_LOG"
  if [[ "$mode" == "tmux" ]]; then
    printf "  tmux session: %s\n" "$TMUX_SESSION"
    printf "  Attach: tmux attach -t %s\n" "$TMUX_SESSION"
    printf "  API window: tmux select-window -t %s:api\n" "$TMUX_SESSION"
    printf "  Web window: tmux select-window -t %s:web\n" "$TMUX_SESSION"
  else
    printf "  API pid file: %s\n" "$API_LOG_DIR/api.pid"
    printf "  Web pid file: %s\n" "$WEB_LOG_DIR/web.pid"
    printf "  Follow logs: tail -f %s %s\n" "$API_LOG" "$WEB_LOG"
  fi
  printf "\n${GRAY}Stop later with: ./stop.sh${RESET}\n"
}

start_runtime() {
  case "$SETUP_TERMINAL_MODE" in
    tmux)
      command_exists tmux || fail "SETUP_TERMINAL_MODE=tmux requires tmux. Install tmux or use SETUP_TERMINAL_MODE=background."
      start_runtime_tmux
      ;;
    background)
      start_runtime_background
      ;;
    auto)
      if command_exists tmux; then
        start_runtime_tmux
      else
        warn "tmux not found; falling back to background mode. Install tmux or set SETUP_TERMINAL_MODE=background explicitly."
        start_runtime_background
      fi
      ;;
    *)
      fail "Unknown SETUP_TERMINAL_MODE=$SETUP_TERMINAL_MODE. Use auto, tmux, or background."
      ;;
  esac
}

choose_setup_mode() {
  if [[ -n "$SETUP_RUN_MODE" ]]; then
    case "$SETUP_RUN_MODE" in
      source|docker)
        ok "Setup mode from environment: $SETUP_RUN_MODE"
        return
        ;;
      *)
        fail "SETUP_RUN_MODE must be source or docker, got: $SETUP_RUN_MODE"
        ;;
    esac
  fi

  if [[ -t 0 ]]; then
    printf "\n${BOLD}Chọn chế độ chạy:${RESET}\n"
    printf "  1) source - chạy API/Web từ source, Docker chỉ chạy Postgres/Redis/Qdrant/nginx dev\n"
    printf "  2) docker - chạy 100%% bằng root docker-compose.yml gồm backend + frontend + hạ tầng\n"
    printf "Nhập lựa chọn [1/source, 2/docker] (mặc định: source): "
    local answer
    read -r answer || answer=""
    case "${answer:-source}" in
      2|docker|Docker|DOCKER)
        export SETUP_RUN_MODE="docker"
        ;;
      1|source|Source|SOURCE|"")
        export SETUP_RUN_MODE="source"
        ;;
      *)
        fail "Unknown setup choice: $answer"
        ;;
    esac
  else
    export SETUP_RUN_MODE="source"
    warn "Non-interactive shell detected; defaulting setup mode to source. Use SETUP_RUN_MODE=docker ./setup.sh for full Docker runtime."
  fi
}

start_docker_runtime() {
  step "Start full Docker runtime from root docker-compose.yml"
  command_exists docker || fail "Docker is required for SETUP_RUN_MODE=docker."

  log "DOCKER_IMAGE_REPO=$DOCKER_IMAGE_REPO IMAGE_TAG=$IMAGE_TAG DOCKER_COMPOSE_PROJECT_NAME=$DOCKER_COMPOSE_PROJECT_NAME"

  docker compose -p "$DOCKER_COMPOSE_PROJECT_NAME" -f "$ROOT_DIR/docker-compose.yml" pull >> "$SETUP_LOG" 2>&1
  docker compose -p "$DOCKER_COMPOSE_PROJECT_NAME" -f "$ROOT_DIR/docker-compose.yml" up -d --remove-orphans >> "$SETUP_LOG" 2>&1
  ok "Docker services requested from root docker-compose.yml"

  wait_for_http "http://127.0.0.1:${NGINX_PORT}/nginx-health" "nginx" 120
  wait_for_http "http://127.0.0.1:${NGINX_PORT}/health" "API health through nginx" 120
  wait_for_http "http://127.0.0.1:${NGINX_PORT}/api/v1/products" "products API through nginx" 120
  wait_for_http "http://127.0.0.1:${NGINX_PORT}/agent-dashboard" "web dashboard through nginx" 120

  printf "\n${GREEN}${BOLD}Ready${RESET}\n"
  printf "  Mode: docker\n"
  printf "  Compose file: %s\n" "$ROOT_DIR/docker-compose.yml"
  printf "  Compose project: %s\n" "$DOCKER_COMPOSE_PROJECT_NAME"
  printf "  Image repo: %s\n" "$DOCKER_IMAGE_REPO"
  printf "  Image tag: %s\n" "$IMAGE_TAG"
  printf "  Web/API entry: http://127.0.0.1:%s\n" "$NGINX_PORT"
  printf "  Agent dashboard: http://127.0.0.1:%s/agent-dashboard\n" "$NGINX_PORT"
  printf "  API health: http://127.0.0.1:%s/health\n" "$NGINX_PORT"
  printf "  Setup log: %s\n" "$SETUP_LOG"
  printf "\n${GRAY}Stop later with: docker compose -p %s -f docker-compose.yml down${RESET}\n" "$DOCKER_COMPOSE_PROJECT_NAME"
}

main() {
  cd "$ROOT_DIR"
  if [[ "${SETUP_SKIP_STOP:-0}" != "1" && -x "$ROOT_DIR/stop.sh" ]]; then
    "$ROOT_DIR/stop.sh" || true
  fi
  print_banner
  load_env_file
  choose_setup_mode
  cleanup_logs
  ensure_system_dependencies
  if [[ "$SETUP_RUN_MODE" == "docker" ]]; then
    start_docker_runtime
    return
  fi
  check_node
  check_python
  install_dependencies
  start_docker_services
  prepare_database
  run_optional_tests
  start_runtime
}

main "$@"
