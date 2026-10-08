#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# Ghi cả stdout/stderr và giữ nguyên exit code; mỗi lần chạy thay log cũ.
if [[ "${XBUS_DEPLOY_LOG_CAPTURED:-0}" != 1 && "${1:-}" != --help && "${1:-}" != -h ]]; then
  mkdir -p "${SCRIPT_DIR}/logs"
  DEPLOY_LOG="${SCRIPT_DIR}/logs/deploy-latest.log"
  (umask 077; : > "${DEPLOY_LOG}")
  chmod 600 "${DEPLOY_LOG}"
  set +e
  XBUS_DEPLOY_LOG_CAPTURED=1 bash "${BASH_SOURCE[0]}" "$@" 2>&1 | tee "${DEPLOY_LOG}"
  DEPLOY_STATUSES=("${PIPESTATUS[@]}")
  DEPLOY_STATUS="${DEPLOY_STATUSES[0]}"
  if [[ "${DEPLOY_STATUS}" == 0 ]]; then DEPLOY_STATUS="${DEPLOY_STATUSES[1]}"; fi
  printf 'Kết thúc: %s | exit code: %s\n' "$(date '+%Y-%m-%d %H:%M:%S %z')" "${DEPLOY_STATUS}" | tee -a "${DEPLOY_LOG}"
  echo "Log lần gần nhất: ${DEPLOY_LOG}"
  exit "${DEPLOY_STATUS}"
fi
echo "Bắt đầu: $(date '+%Y-%m-%d %H:%M:%S %z') | chế độ: ${1:-deploy VPS}"
case "${1:-}" in
  --build-only)
    if [[ $# -ne 1 ]]; then
      echo "Cách dùng: bash deploy.sh [--build-only]" >&2
      exit 2
    fi
    exec bash "${SCRIPT_DIR}/scripts/build-office-plane.sh"
    ;;
  --help|-h)
    echo "bash deploy.sh               Build Plane + XBus Office trên VPS và deploy"
    echo "bash deploy.sh --build-only  Build cả hai tại local, không SSH/restart/migrate"
    exit 0
    ;;
  "") ;;
  *) echo "Cách dùng: bash deploy.sh [--build-only]" >&2; exit 2 ;;
esac
if [[ -f "${SCRIPT_DIR}/.deploy.env" ]]; then
  set -a
  source "${SCRIPT_DIR}/.deploy.env"
  set +a
fi

PUBLIC_APP_URL="${PUBLIC_APP_URL:-https://xbus-office.xmobility.vn}"
PUBLIC_PLANE_URL="${PUBLIC_PLANE_URL:-${PUBLIC_APP_URL}}"
VPS_USER="${VPS_USER:-stackops}"
VPS_HOST="${VPS_HOST:-42.1.126.80}"
VPS_PORT="${VPS_PORT:-22}"
VPS_DIR="${VPS_DIR:-/home/stackops/xbus-management}"
VPS_TARGET="${VPS_USER}@${VPS_HOST}"
VPS_SSH_KEY="${VPS_SSH_KEY:-}"
LOCAL_IMAGE_NAME="${LOCAL_IMAGE_NAME:-xbus-office:local}"
SSH=(
  ssh
  -p "${VPS_PORT}"
  -o ConnectTimeout=10
  -o ControlMaster=auto
  -o ControlPersist=10m
  -o ControlPath=/tmp/xbus-deploy-%C
)
if [[ -n "${VPS_SSH_KEY}" ]]; then
  SSH+=(-i "${VPS_SSH_KEY}" -o IdentitiesOnly=yes)
fi

echo "🔐 [0/5] Kiểm tra SSH tới ${VPS_TARGET}:${VPS_PORT}"
if ! "${SSH[@]}" "${VPS_TARGET}" true; then
  cat >&2 <<EOF
Không thể SSH tới VPS. Hãy tạo ${SCRIPT_DIR}/.deploy.env theo mẫu
.deploy.env.example với đúng Host, Port và SSH key đang dùng trong Termius.
EOF
  exit 1
fi

echo "📦 [1/5] Đồng bộ source lên VPS (giữ nguyên các file môi trường trên VPS)"
"${SSH[@]}" "${VPS_TARGET}" "mkdir -p '${VPS_DIR}'"
# macOS tar otherwise stores extended attributes in PAX/AppleDouble metadata.
TAR_METADATA_OPTIONS=()
if [[ "$(uname -s)" == "Darwin" ]]; then
  TAR_METADATA_OPTIONS=(--no-xattrs --no-mac-metadata)
fi
COPYFILE_DISABLE=1 tar "${TAR_METADATA_OPTIONS[@]}" \
  --exclude='._*' \
  --exclude='.DS_Store' \
  --exclude='.deploy.env' \
  --exclude='.git' \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='plane.env' \
  --exclude='logs' \
  --exclude='src/data/json' \
  --exclude='public/uploads' \
  --exclude='public/images/avatars' \
  --exclude='public/images/afternoon-tea' \
  -C "${SCRIPT_DIR}" -czf - . | "${SSH[@]}" "${VPS_TARGET}" "tar -xzf - -C '${VPS_DIR}'"

echo "🏗️  [2/5] Build Plane + XBus Office trên VPS, sau đó restart container"
"${SSH[@]}" "${VPS_TARGET}" bash -s -- \
  "${VPS_DIR}" "${LOCAL_IMAGE_NAME}" "${PUBLIC_APP_URL}" "${PUBLIC_PLANE_URL}" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

VPS_DIR="$1"
LOCAL_IMAGE_NAME="$2"
PUBLIC_APP_URL="$3"
PUBLIC_PLANE_URL="$4"
cd "${VPS_DIR}"

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
else
  echo "Cần Docker Compose v2 trên VPS để build Plane với additional_contexts." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Thiếu ${VPS_DIR}/.env trên VPS; dừng deploy để không chạy sai cấu hình." >&2
  exit 1
fi
if [[ ! -f plane.env ]]; then
  echo "Thiếu ${VPS_DIR}/plane.env trên VPS; dừng deploy để không chạy sai cấu hình." >&2
  exit 1
fi

upsert_env() {
  local file="$1" key="$2" value="$3"
  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

upsert_env .env PLANE_INTERNAL_URL http://host.docker.internal:3100
upsert_env .env NEXT_PUBLIC_PLANE_URL "${PUBLIC_PLANE_URL}"
upsert_env .env PLANE_PUBLIC_URL "${PUBLIC_PLANE_URL}"
upsert_env plane.env WEB_URL "${PUBLIC_PLANE_URL}"
upsert_env plane.env CORS_ALLOWED_ORIGINS "${PUBLIC_PLANE_URL},${PUBLIC_APP_URL}"
upsert_env plane.env XBUS_FRAME_ANCESTORS "${PUBLIC_APP_URL}"

# Earlier macOS uploads may have left AppleDouble files in the source tree.
# These are metadata, not translation/source files.
find services/plane -type f -name '._*' -delete

PLANE_COMPOSE="$DOCKER_COMPOSE --project-directory . --env-file plane.env -p xbus-plane -f services/plane/deployments/cli/community/docker-compose.yml -f docker-compose.plane.override.yml"

export XBUS_IMAGE="${LOCAL_IMAGE_NAME}"
export NEXT_PUBLIC_APP_URL="${PUBLIC_APP_URL}"
export NEXT_PUBLIC_PLANE_URL="${PUBLIC_PLANE_URL}"
bash scripts/build-office-plane.sh

# Chỉ thay container sau khi cả ba image đã build thành công.
$PLANE_COMPOSE up --detach plane-db plane-redis plane-mq plane-minio
$PLANE_COMPOSE run --rm --no-deps migrator
$PLANE_COMPOSE up --detach --no-build --pull never --force-recreate api worker beat-worker web
$PLANE_COMPOSE up --detach --no-build --pull never

for service in api web; do
  container_id="$($PLANE_COMPOSE ps -q "$service")"
  image_name="$(docker inspect --format '{{.Config.Image}}' "$container_id")"
  running_image="$(docker inspect --format '{{.Image}}' "$container_id")"
  built_image="$(docker image inspect --format '{{.Id}}' "$image_name")"
  if [[ "$running_image" != "$built_image" ]]; then
    echo "Plane ${service} vẫn chạy image cũ; dừng deploy." >&2
    exit 1
  fi
  echo "Plane ${service}: container đã dùng image mới ${running_image}."
done

APP_HOST="${PUBLIC_APP_URL#*://}"
APP_HOST="${APP_HOST%%/*}"
APP_HOST="${APP_HOST%%:*}"
bash scripts/install-plane-nginx.sh "${APP_HOST}"

# Image XBus được build trực tiếp tại VPS, không push/pull qua Docker Hub.
$DOCKER_COMPOSE up --detach minio redis
$DOCKER_COMPOSE up --detach --no-build --force-recreate xbus-office gallery-worker
$DOCKER_COMPOSE ps
docker image prune --force
REMOTE_SCRIPT

echo "🗃️  [3/5] Áp dụng migration cơ sở dữ liệu"
"${SSH[@]}" "${VPS_TARGET}" bash -s -- "${VPS_DIR}" "${LOCAL_IMAGE_NAME}" <<'MIGRATION_SCRIPT'
set -Eeuo pipefail

VPS_DIR="$1"
LOCAL_IMAGE_NAME="$2"
cd "${VPS_DIR}"

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
else
  DOCKER_COMPOSE="docker-compose"
fi

export XBUS_IMAGE="${LOCAL_IMAGE_NAME}"
$DOCKER_COMPOSE exec -T xbus-office npm run db:migrate
MIGRATION_SCRIPT

echo "🩺 [4/5] Kiểm tra ứng dụng trên VPS"
"${SSH[@]}" "${VPS_TARGET}" bash -s -- "${PUBLIC_PLANE_URL}" <<'HEALTHCHECK_SCRIPT'
set -Eeuo pipefail
PUBLIC_PLANE_URL="$1"

for attempt in $(seq 1 30); do
  if curl --fail --silent --max-time 5 http://127.0.0.1:3000/login >/dev/null; then
    break
  fi
  sleep 2
done

curl --fail --silent --max-time 5 http://127.0.0.1:3000/login >/dev/null || {
  echo "XBus chưa sẵn sàng." >&2
  exit 1
}

for attempt in $(seq 1 120); do
  if curl --fail --silent --max-time 5 http://127.0.0.1:3100/api/instances/ >/dev/null; then
    break
  fi
  sleep 5
done
curl --fail --silent --max-time 5 http://127.0.0.1:3100/api/instances/ >/dev/null || {
  echo "Plane API chưa sẵn sàng; kiểm tra log api/migrator." >&2
  exit 1
}
docker exec xbus-office npm run plane:sync-personnel
curl --fail --silent --show-error --max-time 30 "${PUBLIC_PLANE_URL}/api/instances/" >/dev/null || {
  echo "Plane hoạt động nội bộ nhưng URL công khai không truy cập được: ${PUBLIC_PLANE_URL}. Kiểm tra NAT/firewall/reverse proxy." >&2
  exit 1
}
echo "XBus, Plane API, đồng bộ nhân sự và URL công khai đã sẵn sàng."
HEALTHCHECK_SCRIPT

echo "✅ [5/5] Deploy image local ${LOCAL_IMAGE_NAME} lên ${VPS_TARGET} hoàn tất"
