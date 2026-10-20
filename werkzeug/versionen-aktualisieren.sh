#!/bin/sh
# Bringt die Versionsangaben auf Stand. Das ist der Aufruf fuer "refresh".
#
#   1. versionen-holen.py     holt die Hardware-Versionen von OpenWrt und die
#                             Liste unserer gebauten Images vom eigenen Server
#   2. versionen-toh.py       (mit HERSTELLER=1 vorher versionen-hersteller.py)
#                             Versionen, die es laut OpenWrt-ToH gibt und die wir
#                             nicht bauen, mit Grund (braucht ToH-Dump und
#                             Image-Liste aus Neanderfunk/geraetedaten, quellen/)
#   3. versionen-anzeige.py   baut daraus die Datei, die die Webseite liest
#   4. ffnef-js-pruefen.js    rechnet die Textlogik gegen das Ergebnis durch
#
# Danach die Aenderungen ansehen und committen; anschliessend deploy.sh auf
# der Firmware-Maschine. Was keine Quelle hergibt - Versionen, die es gibt und
# die niemand unterstuetzt -, gehoert von Hand nach
# ffnef/versionen-handpflege.json. Die gewinnt immer.
set -e
HIER=$(cd "$(dirname "$0")/.." && pwd)
cd "$HIER"

echo "1/4 Versionen holen"
python3 werkzeug/versionen-holen.py "$@"

echo "2/4 Nicht unterstuetzte Versionen aus ToH und von den Hersteller-Downloadseiten"
GD=${GERAETEDATEN:-$HOME/projekte/freifunk/geraetedaten}
TOH=$(ls "$GD"/quellen/quellen-toh-*.tsv.gz 2>/dev/null | sort | tail -1)
IMG=$(ls "$GD"/quellen/images-testing-*.txt 2>/dev/null | sort | tail -1)
# Hersteller-Seiten (TP-Link, Mercusys) nur mit HERSTELLER=1, dauert einige Minuten
if [ "${HERSTELLER:-0}" = 1 ] && [ -n "$IMG" ]; then
  python3 werkzeug/versionen-hersteller.py "$IMG"
fi
if [ -n "$TOH" ] && [ -n "$IMG" ]; then
  python3 werkzeug/versionen-toh.py "$TOH" "$IMG"
else
  echo "  geraetedaten nicht gefunden ($GD), versionen-toh.json bleibt wie es ist"
fi

echo "3/4 Anzeigedatei bauen"
python3 werkzeug/versionen-anzeige.py

echo "4/4 Textlogik pruefen"
if command -v node >/dev/null 2>&1; then
  node werkzeug/ffnef-js-pruefen.js
else
  echo "  node fehlt, Pruefung uebersprungen"
fi

echo
echo "Aenderungen:"
git -C "$HIER" status --short ffnef/versionen.json ffnef/versionen-toh.json ffnef/versionen-anzeige.json
