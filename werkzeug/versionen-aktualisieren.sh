#!/bin/sh
# Bringt die Versionsangaben auf Stand. Das ist der Aufruf fuer "refresh".
#
#   1. versionen-holen.py     holt die Hardware-Versionen von OpenWrt und die
#                             Liste unserer gebauten Images vom eigenen Server
#   2. versionen-anzeige.py   baut daraus die Datei, die die Webseite liest
#   3. ffnef-js-pruefen.js    rechnet die Textlogik gegen das Ergebnis durch
#
# Danach die Aenderungen ansehen und committen; anschliessend deploy.sh auf
# der Firmware-Maschine. Was keine Quelle hergibt - Versionen, die es gibt und
# die niemand unterstuetzt -, gehoert von Hand nach
# ffnef/versionen-handpflege.json. Die gewinnt immer.
set -e
HIER=$(cd "$(dirname "$0")/.." && pwd)
cd "$HIER"

echo "1/3 Versionen holen"
python3 werkzeug/versionen-holen.py "$@"

echo "2/3 Anzeigedatei bauen"
python3 werkzeug/versionen-anzeige.py

echo "3/3 Textlogik pruefen"
if command -v node >/dev/null 2>&1; then
  node werkzeug/ffnef-js-pruefen.js
else
  echo "  node fehlt, Pruefung uebersprungen"
fi

echo
echo "Aenderungen:"
git -C "$HIER" status --short ffnef/versionen.json ffnef/versionen-anzeige.json
