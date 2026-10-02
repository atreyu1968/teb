#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/atreyu1968/teb.git"
APP_DIR="/opt/teb"
DATA_DIR="/var/lib/teb"
SERVICE="/etc/systemd/system/teb.service"

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Ejecuta este instalador con sudo o como root."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y git curl ca-certificates unzip coreutils

NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  MAJOR="$(node -p "process.versions.node.split('.')[0]")"
  if [[ "$MAJOR" -ge 22 ]]; then NEED_NODE=0; fi
fi
if [[ "$NEED_NODE" -eq 1 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! id teb >/dev/null 2>&1; then
  useradd --system --home "$DATA_DIR" --shell /usr/sbin/nologin teb
fi
mkdir -p "$DATA_DIR"
chown teb:teb "$DATA_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
  echo "Actualizando instalación existente..."
  git -C "$APP_DIR" fetch origin main
  git -C "$APP_DIR" reset --hard origin/main
else
  rm -rf "$APP_DIR"
  git clone "$REPO" "$APP_DIR"
fi

chmod +x "$APP_DIR/scripts/extract-scorms.sh"
"$APP_DIR/scripts/extract-scorms.sh"

if [[ ! -f "$APP_DIR/server/.env" ]]; then
  cp "$APP_DIR/server/.env.example" "$APP_DIR/server/.env"
fi
sed -i "s#^DATA_DIR=.*#DATA_DIR=$DATA_DIR#" "$APP_DIR/server/.env"
chown -R root:root "$APP_DIR"
chown teb:teb "$APP_DIR/server/.env"
chmod 640 "$APP_DIR/server/.env"

cp "$APP_DIR/server/teb.service.template" "$SERVICE"
systemctl daemon-reload
systemctl enable --now teb.service
systemctl restart teb.service

sleep 1
if systemctl is-active --quiet teb.service; then
  echo
  echo "TEB instalado correctamente."
  echo "MicroSCORM UD1 preparados en web/reutilizados/."
  echo "Acceso local: http://IP_DEL_SERVIDOR:8080"
  echo "Estado: systemctl status teb --no-pager"
  echo "Logs: journalctl -u teb -f"
else
  echo "El servicio no ha arrancado correctamente."
  systemctl status teb --no-pager || true
  exit 2
fi
