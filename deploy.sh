#!/bin/sh
# Baut den Webroot des Community-Downloaders aus zwei Git-Klonen.
#
# Der Webroot selbst enthaelt danach nur Symlinks und das Verzeichnis
# "images". Beide Klone bleiben dadurch sauber: "git pull" laeuft in jedem
# von beiden ohne Konflikt, weil keine ausgelieferte Datei im Arbeitsbaum
# ueberschrieben wird.
#
#   /var/www/selector-upstream/        Klon 1, Code (Zweig main)
#   /var/www/selector-config/          Klon 2, unsere Konfiguration
#   /var/www/routersoftware.ffnef.de/  Symlinks + images/
#
# Aufruf als root auf dem Firmware-Server:
#   sh deploy.sh [Webroot]
#
# Mehrfaches Aufrufen ist erlaubt: vorhandene Klone werden aktualisiert,
# die Symlinks neu gesetzt.
set -eu

WURZEL="${1:-/var/www/routersoftware.ffnef.de}"
BASIS="$(dirname "$WURZEL")"
UP="$BASIS/selector-upstream"
CFG="$BASIS/selector-config"

UP_URL="https://github.com/Neanderfunk/gluon-firmware-selector.git"
CFG_URL="https://github.com/Neanderfunk/firmware-selector-config.git"

sage() { echo "deploy: $*"; }

holen() {
  verzeichnis=$1; url=$2; zweig=$3
  if [ -d "$verzeichnis/.git" ]; then
    sage "aktualisiere $verzeichnis"
    git -C "$verzeichnis" fetch --quiet origin "$zweig"
    git -C "$verzeichnis" checkout --quiet "$zweig"
    git -C "$verzeichnis" merge --quiet --ff-only "origin/$zweig"
  else
    sage "klone $url nach $verzeichnis"
    git clone --quiet --branch "$zweig" "$url" "$verzeichnis"
  fi
}

holen "$UP"  "$UP_URL"  main
holen "$CFG" "$CFG_URL" main

# --- Webroot vorbereiten -----------------------------------------------
# "images" wird bewusst NICHT angefasst. Dort liegen die Firmware-Dateien
# beziehungsweise die Symlinks darauf; die gehoeren nicht nach Git und
# duerfen von diesem Skript weder angelegt noch geloescht werden.
mkdir -p "$WURZEL"

# images/ enthaelt ausschliesslich Zeiger auf den Firmware-Bestand des
# Downloader-vhosts. Die Zeiger sind in ffnef/images.links versioniert, der
# Bestand selbst nicht - er liegt ausserhalb und wird hier nie angefasst.
mkdir -p "$WURZEL/images"
if [ -r "$CFG/ffnef/images.links" ]; then
  while read -r name ziel rest; do
    case "${name:-#}" in ''|\#*) continue ;; esac
    if [ ! -e "$ziel" ]; then
      sage "WARNUNG: Ziel fehlt, Symlink wird trotzdem gesetzt: $ziel"
      sage "         Der Downloader zeigt fuer '$name' dann nichts an."
    fi
    ln -sfn "$ziel" "$WURZEL/images/$name"
    sage "images/$name -> $ziel"
  done < "$CFG/ffnef/images.links"
else
  sage "WARNUNG: $CFG/ffnef/images.links fehlt, images/ bleibt leer."
fi

setze() {
  ziel=$1; name=$2
  [ -e "$ziel" ] || { sage "FEHLER: $ziel fehlt"; exit 1; }
  ln -sfn "$ziel" "$WURZEL/$name"
}

# Code: unveraendert aus dem Upstream-Klon
setze "$UP/app.js"     app.js
setze "$UP/app.css"    app.css
setze "$UP/router.png" router.png
setze "$UP/pictures"   pictures

# Unsere Dateien: ueberschreiben den Upstream dort, wo wir abweichen
setze "$CFG/ffnef/index.html" index.html
setze "$CFG/ffnef/ffnef.css"  ffnef.css
setze "$CFG/ffnef/config.js"  config.js
setze "$CFG/ffnef/devices.js" devices.js

sage "fertig. Inhalt von $WURZEL:"
ls -la "$WURZEL"
