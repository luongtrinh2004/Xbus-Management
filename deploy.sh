#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/.deploy.env" ]]; then
  # Cấu hình riêng của máy deploy, không commit lên Git.
  set -a
  source "${SCRIPT_DIR}/.deploy.env"
  set +a
fi

IMAGE_REPOSITORY="${IMAGE_REPOSITORY:-luongtrinh462004/xbus-office}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_NAME="${IMAGE_REPOSITORY}:${IMAGE_TAG}"
PUBLIC_APP_URL="${PUBLIC_APP_URL:-https://xbus-office.xmobility.vn}"
VPS_USER="${VPS_USER:-stackops}"
VPS_HOST="${VPS_HOST:-42.1.126.80}"
VPS_PORT="${VPS_PORT:-22}"
VPS_DIR="${VPS_DIR:-/home/stackops/xbus-management}"
VPS_TARGET="${VPS_USER}@${VPS_HOST}"
VPS_SSH_KEY="${VPS_SSH_KEY:-}"
SSH=(
  ssh
  -p "${VPS_PORT}"
  -o ConnectTimeout=10
  -o ControlMaster=auto
  -o ControlPersist=10m
  -o ControlPath=/tmp/xbus-deploy-%C
)
SCP=(
  scp
  -P "${VPS_PORT}"
  -o ConnectTimeout=10
  -o ControlMaster=auto
  -o ControlPersist=10m
  -o ControlPath=/tmp/xbus-deploy-%C
)
if [[ -n "${VPS_SSH_KEY}" ]]; then
  SSH+=(-i "${VPS_SSH_KEY}" -o IdentitiesOnly=yes)
  SCP+=(-i "${VPS_SSH_KEY}" -o IdentitiesOnly=yes)
fi
SKIP_BUILD="${SKIP_BUILD:-false}"

echo "🔐 [0/7] Kiểm tra SSH tới ${VPS_TARGET}:${VPS_PORT}"
if ! "${SSH[@]}" "${VPS_TARGET}" true; then
  cat >&2 <<EOF
Không thể SSH tới VPS. Hãy tạo ${SCRIPT_DIR}/.deploy.env theo mẫu
.deploy.env.example với đúng Host, Port và SSH key đang dùng trong Termius.
EOF
  exit 1
fi

if [[ "${SKIP_BUILD}" == "true" ]]; then
  echo "⏭️  [1-2/7] Dùng image đã push: ${IMAGE_NAME}"
else
  echo "🚀 [1/7] Build image local cho linux/amd64: ${IMAGE_NAME}"
  docker build \
    --platform linux/amd64 \
    --build-arg "NEXT_PUBLIC_APP_URL=${PUBLIC_APP_URL}" \
    --tag "${IMAGE_NAME}" \
    .

  echo "📤 [2/7] Push image lên Docker Hub"
  docker push "${IMAGE_NAME}"
fi

echo "🧹 [3/7] Dọn các image rác ở local"
docker image prune --force

echo "📥 [4/7] Đồng bộ Docker Compose lên VPS"
"${SSH[@]}" "${VPS_TARGET}" "mkdir -p '${VPS_DIR}'"
"${SCP[@]}" "${SCRIPT_DIR}/docker-compose.yml" "${VPS_TARGET}:${VPS_DIR}/docker-compose.yml"

echo "🔄 [5/7] Pull image và restart container trên VPS (không build lại)"
"${SSH[@]}" "${VPS_TARGET}" bash -s -- "${VPS_DIR}" "${IMAGE_NAME}" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

VPS_DIR="$1"
IMAGE_NAME="$2"
cd "${VPS_DIR}"

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  echo "Không tìm thấy Docker Compose trên VPS" >&2
  exit 1
fi

export XBUS_IMAGE="${IMAGE_NAME}"
$DOCKER_COMPOSE pull xbus-office
$DOCKER_COMPOSE up --detach --no-build --force-recreate xbus-office
$DOCKER_COMPOSE ps
docker image prune --force
REMOTE_SCRIPT

echo "🗃️  [6/7] Áp dụng migration cơ sở dữ liệu"
"${SSH[@]}" "${VPS_TARGET}" bash -s -- "${VPS_DIR}" <<'MIGRATION_SCRIPT'
set -Eeuo pipefail

VPS_DIR="$1"
cd "${VPS_DIR}"

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  echo "Không tìm thấy Docker Compose trên VPS" >&2
  exit 1
fi

$DOCKER_COMPOSE exec -T xbus-office npm run db:migrate
MIGRATION_SCRIPT

echo "🩺 [7/7] Kiểm tra ứng dụng trên VPS"
"${SSH[@]}" "${VPS_TARGET}" bash -s <<'HEALTHCHECK_SCRIPT'
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
