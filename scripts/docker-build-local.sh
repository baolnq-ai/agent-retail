#!/usr/bin/env sh
set -eu

REPO="${DOCKER_IMAGE_REPO:-baonguyen3568/ai-agent-retail}"
TAG="${IMAGE_TAG:-v0.1.0-20260528}"

docker build --target api --tag "$REPO:api-$TAG" .
docker build --target web --tag "$REPO:web-$TAG" .
