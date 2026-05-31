#!/usr/bin/env sh
set -eu

REPO="${DOCKER_IMAGE_REPO:-baonguyen3568/ai-agent-retail}"
TAG="${IMAGE_TAG:-v0.1.0-20260531}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"

docker buildx inspect >/dev/null 2>&1 || docker buildx create --use

docker buildx build \
  --platform "$PLATFORMS" \
  --target api \
  --tag "$REPO:api-$TAG" \
  --tag "$REPO:api-latest" \
  --push \
  .

docker buildx build \
  --platform "$PLATFORMS" \
  --target web \
  --tag "$REPO:web-$TAG" \
  --tag "$REPO:web-latest" \
  --push \
  .
