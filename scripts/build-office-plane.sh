#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_DIR}"

if ! docker compose version >/dev/null 2>&1; then
  echo "Cần Docker Compose v2 để build Plane với additional_contexts." >&2
  exit 1
fi
for env_file in .env plane.env; do
  if [[ ! -f "${env_file}" ]]; then
    echo "Thiếu ${PROJECT_DIR}/${env_file}." >&2
    exit 1
  fi
done

export XBUS_IMAGE="${XBUS_IMAGE:-xbus-office:local}"
export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
export NEXT_PUBLIC_PLANE_URL="${NEXT_PUBLIC_PLANE_URL:-http://localhost:3100}"
# Build tuần tự để hạn chế bộ nhớ trên VPS.
export COMPOSE_PARALLEL_LIMIT=1
PLANE_COMPOSE=(docker compose --project-directory . --env-file plane.env -p xbus-plane
  -f services/plane/deployments/cli/community/docker-compose.yml
  -f docker-compose.plane.override.yml)
OFFICE_COMPOSE=(docker compose --project-directory . --env-file .env -f docker-compose.yml)

# Kiểm tra cả hai cấu hình trước khi bắt đầu build; không in biến môi trường.
"${PLANE_COMPOSE[@]}" config --quiet
"${OFFICE_COMPOSE[@]}" config --quiet

echo "[1/3] Build Plane backend (API, worker, beat-worker, migrator dùng chung image)"
"${PLANE_COMPOSE[@]}" build api
echo "[2/3] Build Plane frontend"
"${PLANE_COMPOSE[@]}" build web
echo "[3/3] Build XBus Office (gallery-worker dùng chung image)"
"${OFFICE_COMPOSE[@]}" build xbus-office

echo "Build thành công: Plane backend, Plane frontend và ${XBUS_IMAGE}."
