#!/bin/sh
set -eu

cd /app

node /app/docker/wait-for-tcp.mjs "${DATABASE_HOST:-postgres}" "${DATABASE_PORT:-5432}" PostgreSQL

if [ "${WAIT_FOR_REDIS:-1}" = "1" ]; then
  node /app/docker/wait-for-tcp.mjs "${REDIS_HOST:-redis}" "${REDIS_PORT:-6379}" Redis
fi

if [ "${WAIT_FOR_QDRANT:-1}" = "1" ]; then
  node /app/docker/wait-for-tcp.mjs "${QDRANT_HOST:-qdrant}" "${QDRANT_PORT_INTERNAL:-6333}" Qdrant
fi

if [ "${RUN_PRISMA_GENERATE:-0}" = "1" ]; then
  corepack pnpm --filter @retail-agent/api db:generate
fi

if [ "${RUN_DB_PUSH:-1}" = "1" ]; then
  corepack pnpm --filter @retail-agent/api db:push
fi

if [ "${RUN_DB_SEED:-1}" = "1" ]; then
  corepack pnpm --filter @retail-agent/api db:seed
fi

exec corepack pnpm --filter @retail-agent/api start
