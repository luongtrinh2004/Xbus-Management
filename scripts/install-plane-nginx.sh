#!/usr/bin/env bash
set -Eeuo pipefail

# Run on the VPS from the repository root. Reuse XBus's existing certificate,
# hostname and ports; this installs no second virtual host or public port.
APP_HOST="${1:?Pass the XBus hostname}"
[[ "$APP_HOST" =~ ^[a-zA-Z0-9.-]+$ ]] || exit 1
SITE="$(readlink -f "/etc/nginx/sites-enabled/${APP_HOST}")"
[[ -f "$SITE" ]] || { echo "Missing Nginx site: ${APP_HOST}" >&2; exit 1; }
SNIPPET=/etc/nginx/snippets/xbus-plane-module.conf
BACKUP="${SITE}.before-plane-module.$(date +%s)"
sudo cp -p "$SITE" "$BACKUP"
sudo install -m 644 services/plane-xbus/nginx.module.conf "$SNIPPET"
if ! sudo grep -Fq "include ${SNIPPET};" "$SITE"; then
  sudo sed -i '/^[[:space:]]*server_name /a\    include /etc/nginx/snippets/xbus-plane-module.conf;' "$SITE"
fi
if ! sudo nginx -t; then
  sudo cp -p "$BACKUP" "$SITE"
  echo "Invalid Nginx configuration; restored ${BACKUP}." >&2
  exit 1
fi
sudo systemctl reload nginx
# Retire the old port-based integration only after same-origin config passes.
if [[ -f /etc/nginx/conf.d/xbus-plane-8443.conf ]]; then
  sudo mv /etc/nginx/conf.d/xbus-plane-8443.conf /etc/nginx/conf.d/xbus-plane-8443.conf.disabled
  sudo nginx -t
  sudo systemctl reload nginx
fi
echo "Plane module now uses the existing ${APP_HOST} server. Backup: ${BACKUP}"
