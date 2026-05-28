# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

ARG NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:6820
ARG NEXT_PUBLIC_SITE_URL=http://127.0.0.1:6820
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV DATABASE_URL=postgresql://retail:retail_password@localhost:5432/retail_agent?schema=public

COPY . .

RUN pnpm --filter @retail-agent/shared build \
  && pnpm --filter @retail-agent/api db:generate \
  && pnpm --filter @retail-agent/api build \
  && pnpm --filter @retail-agent/web build \
  && chmod +x /app/docker/*.sh

FROM base AS runtime-base

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app /app

FROM runtime-base AS api

ENV API_PORT=6810
ENV PORT=6810
EXPOSE 6810
ENTRYPOINT ["/app/docker/api-entrypoint.sh"]

FROM runtime-base AS web

ENV PORT=6800
ENV API_BASE_URL=http://api:6810
ENV NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:6820
EXPOSE 6800
CMD ["sh", "-lc", "cd /app/apps/web && PORT=${PORT:-6800} corepack pnpm start"]
