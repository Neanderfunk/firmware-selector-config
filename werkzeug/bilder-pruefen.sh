#!/bin/sh
# Prueft die eigenen Zeichnungen auf Wohlgeformtheit.
#
# Anlass: eine Zeichnung wurde im Browser gar nicht angezeigt, weil im
# Dateikopf die vtracer-Aufrufparameter standen - und "--mode" enthaelt zwei
# aufeinanderfolgende Bindestriche, die XML in Kommentaren verbietet. Die
# Datei wird dann ausgeliefert (HTTP 200, richtiger Content-Type) und
# trotzdem nicht dargestellt. Von aussen sieht das aus wie ein fehlendes Bild.
#
# Aufruf: werkzeug/bilder-pruefen.sh
set -eu
HIER=$(dirname "$(dirname "$0")")
fehler=0
for f in "$HIER"/ffnef/bilder/*.svg; do
  [ -e "$f" ] || continue
  if python3 -c "import xml.etree.ElementTree as E,sys; E.parse(sys.argv[1])" "$f" 2>/dev/null; then
    echo "  ok      $(basename "$f")"
  else
    echo "  FEHLER  $(basename "$f")"
    python3 -c "import xml.etree.ElementTree as E,sys
try: E.parse(sys.argv[1])
except Exception as e: print('          ', e)" "$f"
    fehler=1
  fi
done
exit $fehler
