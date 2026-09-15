#!/usr/bin/env bash
set -Eeuo pipefail

# Chạy tại thư mục gốc của repo trên VPS:
#   bash scripts/setup-mysql-vps.sh
# Ứng dụng vẫn dùng JSON; script chỉ tạo MySQL và import bản sao để đối soát.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose chưa sẵn sàng." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Thiếu file .env. Hãy tạo .env từ cấu hình production trước khi chạy." >&2
  exit 1
fi

set_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '\n%s=%s\n' "$key" "$value" >> .env
  fi
}

get_env() {
  grep -m1 "^$1=" .env | cut -d= -f2- || true
}

# Theo cấu hình dự án hiện tại. Khi thay đổi mật khẩu, cập nhật cả 2 giá trị
# này rồi chạy lại script; script sẽ đồng bộ chúng vào file .env.
MYSQL_PASSWORD="462004"
MYSQL_ROOT_PASSWORD="462004"

set_env MYSQL_PASSWORD "$MYSQL_PASSWORD"
set_env MYSQL_ROOT_PASSWORD "$MYSQL_ROOT_PASSWORD"
set_env DATABASE_URL "mysql://xbus:${MYSQL_PASSWORD}@mysql:3306/xbus"
set_env DATA_SOURCE json

if ! grep -q '"db:import-json"' package.json || ! grep -q '"db:migrate"' package.json; then
  echo "Code hiện tại chưa có các script MySQL. Hãy checkout đúng nhánh đã triển khai MySQL." >&2
  exit 1
fi

echo "[1/5] Khởi động MySQL..."
docker compose up -d --force-recreate mysql

echo "[2/5] Chờ MySQL sẵn sàng..."
for attempt in {1..30}; do
  if docker compose exec -T mysql mysqladmin ping -h localhost -uroot -p"$MYSQL_ROOT_PASSWORD" --silent >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    docker compose logs --tail=100 mysql >&2
    echo "MySQL không khởi động được." >&2
    exit 1
  fi
  sleep 2
done

echo "[3/5] Build và khởi động ứng dụng..."
docker compose build xbus-office
docker compose up -d xbus-office

echo "[4/5] Áp dụng migration MySQL..."
docker compose exec -T xbus-office npm run db:migrate

echo "[5/5] Import JSON sang MySQL..."
docker compose exec -T xbus-office npm run db:import-json

echo "Đối soát dữ liệu:"
docker compose exec -T mysql mysql -uxbus -p"$MYSQL_PASSWORD" xbus -e '
SELECT VERSION() AS mysql_version;
SELECT
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM fund_periods) AS fund_periods,
  (SELECT COUNT(*) FROM fund_member_payments) AS payments,
  (SELECT COUNT(*) FROM fund_transactions) AS transactions,
  (SELECT COUNT(*) FROM asset_transactions) AS assets,
  (SELECT COUNT(*) FROM water_schedules) AS schedules,
  (SELECT COUNT(*) FROM audit_logs) AS audit_logs;
'

echo "Hoàn tất. Ứng dụng vẫn đang dùng DATA_SOURCE=json."
