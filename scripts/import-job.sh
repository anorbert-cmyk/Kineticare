#!/bin/sh
# ---------------------------------------------------------------------------
# Vevő-import indítója a dedikált Railway import-job szolgáltatáshoz.
#
# MIÉRT KÜLÖN FÁJL: a start-parancs a railway.import-job.json-ban él, ott
# viszont a beágyazott idézőjelek olvashatatlanná és hibára hajlamossá tennék
# a szkriptet. Így a config egyetlen sor, a logika pedig itt, verziózva.
#
# MIÉRT TÖMÖRÍTVE ÉRKEZIK A LISTA: a 274 soros CSV base64-ként ~34 KB, ami egy
# környezeti változóba kényelmetlenül nagy. Gzip után ~8,6 KB. A script a
# `IMPORT_CUSTOMERS_CSV_GZ_B64` értékét bontja ki abba az alakba, amit az
# import vár (`IMPORT_CUSTOMERS_CSV_BASE64`). A kibontás node-dal történik,
# mert a node biztosan jelen van; a `gunzip` megléte image-függő volna.
#
# BIZTONSÁG: a script SOSEM írja ki a lista tartalmát — sem a tömörítettet,
# sem a kibontottat. A naplóba csak a hossz kerül, hogy a hibakeresés ne
# igényelje személyes adat kiírását.
# ---------------------------------------------------------------------------
set -e

echo "IMPORT_JOB_START"

if [ -z "$IMPORT_CUSTOMERS_CSV_GZ_B64" ]; then
  echo "IMPORT_JOB_HIBA: az IMPORT_CUSTOMERS_CSV_GZ_B64 valtozo ures vagy hianyzik."
  echo "IMPORT_JOB_DONE"
  sleep 2147483647
fi

IMPORT_CUSTOMERS_CSV_BASE64=$(node -e '
  const zlib = require("zlib")
  const nyers = process.env.IMPORT_CUSTOMERS_CSV_GZ_B64 || ""
  const csv = zlib.gunzipSync(Buffer.from(nyers, "base64"))
  process.stdout.write(csv.toString("base64"))
')
export IMPORT_CUSTOMERS_CSV_BASE64

echo "IMPORT_JOB_CSV_KIBONTVA: $(printf %s "$IMPORT_CUSTOMERS_CSV_BASE64" | wc -c) bajt base64"

# Alapertelmezes a PROBAFUTAS. Elesbe csak akkor valt, ha az IMPORT_MODE
# erteke pontosan "eles" — igy egy veletlen deploy nem ir az adatbazisba.
if [ "$IMPORT_MODE" = "eles" ]; then
  MOD=""
  echo "IMPORT_JOB_MOD=ELES"
else
  MOD="--dry-run"
  echo "IMPORT_JOB_MOD=PROBAFUTAS"
fi

# LEVELKULDES NINCS: a --send-invites szandekosan hianyzik, tehat egyetlen
# level sem megy ki a 274 vevonek. Az aktivalo levelek kuldese kulon lepes.
npx tsx src/scripts/import-customers.ts $MOD \
  --map "SOS KézRelax vásárló=SOS Kézrelax villámkurzus" \
  --map "Otthoni KézRehab vásárló=Otthoni KézRehab Program" \
  && echo "IMPORT_JOB_OK"

echo "IMPORT_JOB_DONE"

# A konteneet eletben tartjuk, hogy a naplo lekerdezheto maradjon; a
# szolgaltatas a futas utan torlendo.
sleep 2147483647
