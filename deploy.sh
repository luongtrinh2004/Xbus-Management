#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE_REPOSITORY="${IMAGE_REPOSITORY:-luongtrinh462004/xbus-office}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_NAME="${IMAGE_REPOSITORY}:${IMAGE_TAG}"
VPS_USER="${VPS_USER:-stackops}"
VPS_HOST="${VPS_HOST:-aiot-dev}"
VPS_DIR="${VPS_DIR:-/home/stackops/xbus-management}"
VPS_TARGET="${VPS_USER}@${VPS_HOST}"

echo "🚀 [1/6] Build image local cho linux/amd64: ${IMAGE_NAME}"
docker build --platform linux/amd64 --tag "${IMAGE_NAME}" .

echo "📤 [2/6] Push image lên Docker Hub"
docker push "${IMAGE_NAME}"

echo "🧹 [3/6] Dọn các image rác ở local"
docker image prune --force

echo "📥 [4/6] Cập nhật mã nguồn và Compose trên VPS"
ssh "${VPS_TARGET}" "cd '${VPS_DIR}' && git pull --ff-only"

echo "🔄 [5/6] Pull image và restart container trên VPS (không build lại)"
ssh "${VPS_TARGET}" bash -s -- "${VPS_DIR}" "${IMAGE_NAME}" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

VPS_DIR="$1"
IMAGE_NAME="$2"
cd "${VPS_DIR}"

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Không tìm thấy Docker Compose trên VPS" >&2
  exit 1
fi

export XBUS_IMAGE="${IMAGE_NAME}"
"${COMPOSE[@]}" pull xbus-office
"${COMPOSE[@]}" up --detach --no-build --force-recreate xbus-office
"${COMPOSE[@]}" ps
docker image prune --force
REMOTE_SCRIPT

echo "🩺 [6/6] Kiểm tra ứng dụng trên VPS"
ssh "${VPS_TARGET}" bash -s <<'HEALTHCHECK_SCRIPT'
set -Eeuo pipefail

for attempt in $(seq 1 30); do
  if curl --fail --silent --max-time 5 http://127.0.0.1:3000/login >/dev/null; then
    echo "Ứng dụng đã sẵn sàng."
    exit 0
  fi
  sleep 2
done

echo "Ứng dụng chưa sẵn sàng sau 60 giây." >&2
docker logs --tail 100 xbus-office >&2 || true
exit 1
HEALTHCHECK_SCRIPT

echo "✅ Deploy ${IMAGE_NAME} lên ${VPS_TARGET} hoàn tất"
