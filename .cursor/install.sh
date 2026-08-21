#!/usr/bin/env bash
#
# Kineticare — Cloud Agent install (repó-bootstrap a checkout után).
#
# Idempotens: biztosítja a két hiányzó RENDSZERfüggőséget (Node 24 +
# PostgreSQL) az alap image tetején, majd telepíti az npm-függőségeket a
# lockfile szerint.
#
# A PostgreSQL szándékosan a disztribúció META-csomagja, nem `postgresql-16`:
# így egy alap image-frissítés után is a disztróhoz illő verzió települ,
# pinelési karbantartás nélkül. A start.sh EZÉRT nem éget be verziószámot,
# hanem a `pg_lsclusters` kimenetéből olvassa ki a clustert.
#
# Miért itt és nem külön Dockerfile-ban: (1) a repó minden infrastruktúra-
# konfigot VERZIÓZVA tart (vö. railway.*.json), így a fejlesztői környezet is
# a repóban éljen; (2) a Cloud Agent ALAP image adja a fejlesztői/desktop
# eszközkészletet (Chrome, VNC a computer-use-hoz) — egy saját, minimál alapú
# Dockerfile ezt elveszítené. Ezért a két hiányzó csomagot itt, futásidőben,
# idempotensen telepítjük az alap image-re. A parancs terminál, nem hagy hátra
# futó folyamatot; a szolgáltatások indítása a start.sh dolga.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# A Cloud Agent /exec-daemon/node shime (Node 22) PATH-előnyt élvez és
# elárnyékolná a rendszer Node-ját; a /usr/bin előre helyezésével a NodeSource
# Node 24 (/usr/bin/node) lesz aktív minden itteni parancsra.
export PATH="/usr/bin:$PATH"

apt_updated=0
apt_update_once() {
  if [ "$apt_updated" = "0" ]; then
    sudo apt-get update -qq
    apt_updated=1
  fi
}

# --- PostgreSQL (a Payload adatbázisa) — idempotens ------------------------
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  echo '[install.sh] PostgreSQL telepítése…'
  apt_update_once
  sudo apt-get install -y --no-install-recommends postgresql postgresql-contrib
fi

# --- openssl (a start.sh a dev-értékeket ezzel generálja) ------------------
if ! command -v openssl >/dev/null 2>&1; then
  apt_update_once
  sudo apt-get install -y --no-install-recommends openssl
fi

# --- Node 24 (engines/.nvmrc) — a rendszerszintű /usr/bin/node legyen 24 ----
if [ "$(/usr/bin/node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/')" != "24" ]; then
  echo '[install.sh] Node 24 telepítése (NodeSource)…'
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "[install.sh] Node: $(/usr/bin/node -v), npm: $(/usr/bin/npm -v)"

# --- npm-függőségek a lockfile szerint -------------------------------------
# A repó .npmrc-je legacy-peer-deps=true-t állít (lásd a fájl fejkommentjét),
# így a sima npm ci a helyes, reprodukálható telepítés.
cd "$(dirname "${BASH_SOURCE[0]}")/.."
echo '[install.sh] npm ci…'
npm ci
echo '[install.sh] Kész.'
