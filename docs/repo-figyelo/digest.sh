#!/usr/bin/env bash
#
# Repo-figyelő digest — mi történt az utoljára feldolgozott állapot óta.
#
# Használat:
#   bash docs/repo-figyelo/digest.sh [ref]
#
# A [ref] alapértelmezése origin/main. A kiinduló SHA az utolso-ellenorzes.txt
# fájlból jön. A script csak olvas: semmit nem módosít és nem commitol.

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
state_file="${script_dir}/utolso-ellenorzes.txt"
ref="${1:-origin/main}"

if [[ ! -f "${state_file}" ]]; then
  echo "Hiányzik az állapotfájl: ${state_file}" >&2
  exit 1
fi

from_sha="$(sed -n 's/^sha=//p' "${state_file}" | head -1)"
from_date="$(sed -n 's/^datum=//p' "${state_file}" | head -1)"

if [[ -z "${from_sha}" ]]; then
  echo "Az állapotfájlban nincs 'sha=' sor: ${state_file}" >&2
  exit 1
fi

if ! git cat-file -e "${from_sha}^{commit}" 2>/dev/null; then
  echo "A feljegyzett commit nem található a repóban: ${from_sha}" >&2
  echo "Futtass 'git fetch origin' parancsot, vagy javítsd az állapotfájlt." >&2
  exit 1
fi

if ! git rev-parse --verify "${ref}^{commit}" >/dev/null 2>&1; then
  echo "Ismeretlen ref: ${ref}" >&2
  exit 1
fi

to_sha="$(git rev-parse "${ref}")"
range="${from_sha}..${to_sha}"
count="$(git rev-list --count "${range}")"

echo "=== Repo-figyelő digest ==============================================="
echo "Kiindulás : ${from_sha:0:7} (${from_date:-ismeretlen dátum})"
echo "Cél       : ${to_sha:0:7} (${ref})"
echo "Új commit : ${count}"
echo

if [[ "${count}" -eq 0 ]]; then
  echo "Nincs új commit — nem szükséges naplóbejegyzés."
  exit 0
fi

echo "--- Commitok ----------------------------------------------------------"
git log --date=short --pretty=format:'%ad %h %an — %s' "${range}"
echo
echo

echo "--- Érintett fájlok ---------------------------------------------------"
git diff --stat "${range}"
echo

changed_files="$(git diff --name-only "${range}")"

report_paths() {
  local cim="$1" minta="$2" talalat
  talalat="$(printf '%s\n' "${changed_files}" | grep -E "${minta}" || true)"
  if [[ -n "${talalat}" ]]; then
    echo "--- ${cim} ---"
    printf '%s\n' "${talalat}"
    echo
  fi
}

echo "--- Kiemelt területek -------------------------------------------------"
report_paths "Függőségek (emberi figyelem: pinnelt @payloadcms/*)" '^package(-lock)?\.json$'
report_paths "Migrációk (kézi szerkesztés TILOS)" '^src/migrations/'
report_paths "Access-control (emberi review kötelező)" '^src/(access/|collections/)|^src/plugins/ecommerce\.ts$'
report_paths "Fizetési lánc" '^src/lib/(barion|checkout|payments)/'
report_paths "Környezeti változók" '^\.env'
report_paths "CI / workflow" '^\.github/'

echo "--- Tiltott zóna: gyanújelek a hozzáadott sorokban --------------------"
added_lines="$(git diff --unified=0 "${range}" -- 'src' '*.ts' '*.tsx' '*.mjs' '*.json' \
  | grep -E '^\+[^+]' || true)"

flag() {
  local cim="$1" minta="$2" talalat
  talalat="$(printf '%s\n' "${added_lines}" | grep -nE "${minta}" || true)"
  if [[ -n "${talalat}" ]]; then
    echo "[!] ${cim}"
    printf '%s\n' "${talalat}" | head -20
    echo
  fi
}

flag "confirmOrder előfordulás" 'confirmOrder'
flag "'any' típus" ':[[:space:]]*any\b|<any>|as any\b'
flag "console.log (logger helyett)" 'console\.(log|error|warn)\('
flag "caret-verzió a @payloadcms/payload csomagokon" '"(payload|@payloadcms/[^"]+)":[[:space:]]*"\^'

if ! printf '%s\n' "${added_lines}" | grep -qE 'confirmOrder|:[[:space:]]*any\b|<any>|as any\b|console\.(log|error|warn)\(|"(payload|@payloadcms/[^"]+)":[[:space:]]*"\^'; then
  echo "Nincs gyanújel."
  echo
fi

echo "======================================================================="
echo "Következő lépés: naplóbejegyzés a docs/repo-figyelo/naplo.md tetejére,"
echo "majd az utolso-ellenorzes.txt frissítése erre: sha=${to_sha}"
