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
#   /var/www/selector-pictures/        Klon 3, freifunk/device-pictures
#   /var/www/selector-anleitungen/     Klon 4, gluon-rampe-installer
#   /var/www/selector-geraetedaten/    Klon 5, Neanderfunk/geraetedaten
#   /var/www/routersoftware.ffnef.de/  Symlinks + images/
#
# Ausserdem werden die Skripte aus werkzeug/ nach /usr/local/sbin
# verknuepft. Sie liefern nichts aus, sie laufen auf DIESER Maschine:
# Versionsstaende holen, Manifestluecken suchen, Cudys Zwischenfirmware
# spiegeln. Mit WERKZEUGBIN= (leer) bleibt das aus.
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
BILD="$BASIS/selector-pictures"
ANL="$BASIS/selector-anleitungen"
GD="$BASIS/selector-geraetedaten"

# Absichtlich ${VAR-...} und nicht ${VAR:-...}: ein leer gesetztes
# WERKZEUGBIN schaltet die Verknuepfung ab, ein nicht gesetztes nicht.
WERKZEUGBIN="${WERKZEUGBIN-/usr/local/sbin}"

UP_URL="https://github.com/Neanderfunk/gluon-firmware-selector.git"
CFG_URL="https://github.com/Neanderfunk/firmware-selector-config.git"
BILD_URL="https://github.com/freifunk/device-pictures.git"
ANL_URL="https://github.com/Neanderfunk/gluon-rampe-installer.git"
GD_URL="https://github.com/Neanderfunk/geraetedaten.git"

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
holen "$BILD" "$BILD_URL" main
holen "$ANL"  "$ANL_URL"  main
holen "$GD"   "$GD_URL"   main

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

# --- Geraetebilder --------------------------------------------------------
# pictures/ ist ein ECHTES Verzeichnis voller Symlinks, kein Symlink auf ein
# Verzeichnis: nur so lassen sich die Zeichnungen aus device-pictures und
# unsere eigenen Dateien in einem Verzeichnis zusammenlegen, ohne eine der
# beiden Quellen zu veraendern.
rm -rf "$WURZEL/pictures"
mkdir -p "$WURZEL/pictures"
anz=0
for f in "$BILD"/pictures-svg/*.svg; do
  [ -e "$f" ] || continue
  ln -sfn "$f" "$WURZEL/pictures/$(basename "$f")"
  anz=$((anz+1))
done
sage "$anz Zeichnungen aus device-pictures verknuepft"

# Namensabweichungen: zusaetzlicher Zeiger unter unserem Namen
if [ -r "$CFG/ffnef/bilder.zuordnung" ]; then
  z=0
  while read -r unser ihr rest; do
    case "${unser:-#}" in ''|\#*) continue ;; esac
    if [ -e "$BILD/pictures-svg/$ihr.svg" ]; then
      ln -sfn "$BILD/pictures-svg/$ihr.svg" "$WURZEL/pictures/$unser.svg"
      z=$((z+1))
    else
      sage "WARNUNG: Zuordnung zeigt ins Leere: $unser -> $ihr"
    fi
  done < "$CFG/ffnef/bilder.zuordnung"
  sage "$z Namensabweichungen zugeordnet"
fi

# Eigene Bilder zuletzt: sie ueberschreiben alles Vorherige
e=0
for f in "$CFG"/ffnef/bilder/*.svg; do
  [ -e "$f" ] || continue
  ln -sfn "$f" "$WURZEL/pictures/$(basename "$f")"
  e=$((e+1))
done
sage "$e eigene Bilder eingehaengt"

# Unsere Dateien: ueberschreiben den Upstream dort, wo wir abweichen
setze "$CFG/ffnef/index.html" index.html
setze "$CFG/ffnef/ffnef.css"  ffnef.css
setze "$CFG/ffnef/ffnef.js"   ffnef.js
setze "$CFG/ffnef/ffnef-geraete.js" ffnef-geraete.js
setze "$CFG/ffnef/fehler-melden.js" fehler-melden.js
setze "$CFG/ffnef/versionen-anzeige.json" versionen-anzeige.json
setze "$CFG/ffnef/config.js"  config.js
setze "$CFG/ffnef/devices.js" devices.js
# Vorschaubild fuer Links in Chats und sozialen Netzen (og:image in index.html)
setze "$CFG/ffnef/vorschau.png" vorschau.png

# --- Fremde Anleitungen ---------------------------------------------------
# OpenWrt-Anleitungen fuer Xiaomi-Geraete, die adorfer am 27.10.2026
# geliefert hat und die wir ungeprueft ausliefern. config.js verweist aus
# ffnef_ohne_anleitung darauf.
setze "$CFG/ffnef/xiaomi" xiaomi

# --- Installationsanleitungen je Geraet -----------------------------------
# Fertig erzeugte Seiten aus gluon-rampe-installer, bewusst kein Bauschritt
# auf dem Webserver: kein Python, keine Abhaengigkeiten, und der Weg ueber
# rsync fuer Server ohne Internetzugang funktioniert unveraendert.
#
# Der Symlink zeigt auf anleitungen/html, NICHT auf anleitungen: die
# Basis-URL https://routersoftware.neanderfunk.de/anleitungen muss auf das
# html-Verzeichnis zeigen, sonst laufen die Verweise in der index.json ins
# Leere.
setze "$ANL/anleitungen/html" anleitungen

# --- Geraetedaten ---------------------------------------------------------
# Fertig erzeugte Ansicht aus Neanderfunk/geraetedaten (werkzeug/
# selector-ansicht.py), je Geraet eine JSON-Datei plus index.json.
# ffnef-geraete.js laedt sie erst, wenn ein Geraet gewaehlt ist. Fehlt das
# Verzeichnis, zeigt der Selector schlicht keine Geraetedaten.
if [ -d "$GD/ausgabe/selector" ]; then
  setze "$GD/ausgabe/selector" geraete
else
  sage "WARNUNG: $GD/ausgabe/selector fehlt, keine Geraetedaten"
fi

# --- router.neanderfunk.de (Webroot heisst noch routerwahl.ffnef.de) ------
# Zweite Seite fuer Leute, die noch einen Router suchen (Filtersuche). Sie
# liegt im Repo geraetedaten unter web/ und nutzt Bilder, Anleitungen und
# devices.js von hier mit, damit beide Seiten denselben Stand zeigen.
# Eigener vhost; WAHL= (leer) schaltet das ab.
WAHL="${WAHL-$BASIS/routerwahl.ffnef.de}"
if [ -n "$WAHL" ] && [ -d "$GD/web" ]; then
  mkdir -p "$WAHL"
  for d in index.html routerwahl.js routerwahl.css vorschau.png; do
    ln -sfn "$GD/web/$d" "$WAHL/$d"
  done
  ln -sfn "$UP/router.png" "$WAHL/router.png"
  ln -sfn "$GD/ausgabe/selector" "$WAHL/geraete"
  ln -sfn "$ANL/anleitungen/html" "$WAHL/anleitungen"
  ln -sfn "$WURZEL/pictures" "$WAHL/pictures"
  ln -sfn "$CFG/ffnef/devices.js" "$WAHL/devices.js"
  ln -sfn "$CFG/ffnef/config.js" "$WAHL/config.js"
  ln -sfn "$CFG/ffnef/fehler-melden.js" "$WAHL/fehler-melden.js"
  sage "routerwahl: $WAHL verknuepft"
fi

# --- nginx-vhosts ---------------------------------------------------------
# Die vhosts fuer router.neanderfunk.de und routersoftware.neanderfunk.de
# samt 301 von den alten Namen stehen in dienst/nginx/ (adorfer 05.11.2026:
# die vhosts gehoeren hierher). Die frueheren Handdateien wuerden dieselben
# server_name doppelt belegen; sie kommen einmalig nach sites-available
# (Endung .vor-deploy). Scheitert "nginx -t", kommen sie zurueck und die in
# diesem Lauf neu gesetzten Zeiger fallen wieder weg.
# NGINXSITES= (leer) schaltet das ab, z. B. auf einem Testrechner.
NGINXSITES="${NGINXSITES-/etc/nginx/sites-enabled}"
if [ -n "$NGINXSITES" ] && [ -d "$NGINXSITES" ] && command -v nginx >/dev/null; then
  ablage="$(dirname "$NGINXSITES")/sites-available"
  beiseite=""
  for alt in routerwahl.ffnef.de.conf routerwahl.ffnef.de.conf~ \
             routersoftware.ffnef.de.conf routersoftware.ffnef.de.conf~; do
    [ -f "$NGINXSITES/$alt" ] && [ ! -L "$NGINXSITES/$alt" ] || continue
    mkdir -p "$ablage"
    mv "$NGINXSITES/$alt" "$ablage/$alt.vor-deploy"
    beiseite="$beiseite $alt"
    sage "nginx: $NGINXSITES/$alt nach $ablage beiseitegelegt"
  done
  neu=""
  for f in "$CFG"/dienst/nginx/*.conf; do
    [ -e "$f" ] || continue
    z="$NGINXSITES/$(basename "$f")"
    [ -e "$z" ] || neu="$neu $z"
    ln -sfn "$f" "$z"
  done
  if nginx -t 2>/dev/null; then
    systemctl reload nginx
    sage "nginx: vhosts aus dienst/nginx aktiv, neu geladen"
  else
    for z in $neu; do rm -f "$z"; done
    for b in $beiseite; do mv "$ablage/$b.vor-deploy" "$NGINXSITES/$b"; done
    sage "FEHLER: nginx -t scheitert, alter Stand zurueck:"
    nginx -t || true
    exit 1
  fi
fi

# --- Werkzeuge auf den Pfad legen -----------------------------------------
# Diese Skripte werden von Hand aufgerufen, meist als
# "ssh firmware6 cudy-zwischenfirmware-spiegeln.py". Eine solche Shell ist
# keine Login-Shell und liest kein .profile, deshalb muss der Zeiger in
# einem Verzeichnis des System-Pfades liegen und nicht in ~/.local/bin.
#
# Der Dateiname bleibt samt Endung, damit ein .sh und ein gleichnamiges .py
# nicht uebereinander verknuepft werden koennen.
if [ -n "$WERKZEUGBIN" ]; then
  if [ -d "$WERKZEUGBIN" ] && [ -w "$WERKZEUGBIN" ]; then
    # Erst aufraeumen: Zeiger, die in unser werkzeug/ gehen und ins Leere
    # laufen, stammen von einer umbenannten oder entfernten Datei. Fremde
    # Zeiger und echte Dateien bleiben unberuehrt -- hier liegen auch die
    # Werkzeuge anderer Leute.
    for zeiger in "$WERKZEUGBIN"/*; do
      [ -L "$zeiger" ] || continue
      case "$(readlink "$zeiger")" in
        "$CFG"/werkzeug/*)
          [ -e "$zeiger" ] || { rm -f "$zeiger"; sage "veralteten Zeiger entfernt: $zeiger"; }
          ;;
      esac
    done
    w=0
    for f in "$CFG"/werkzeug/*; do
      [ -f "$f" ] && [ -x "$f" ] || continue
      ln -sfn "$f" "$WERKZEUGBIN/$(basename "$f")"
      w=$((w+1))
    done
    sage "$w Werkzeuge in $WERKZEUGBIN verknuepft"
  else
    sage "WARNUNG: $WERKZEUGBIN fehlt oder ist nicht schreibbar"
    sage "         Werkzeuge nicht verknuepft, Aufruf nur mit vollem Pfad."
  fi
fi

# --- Dienst "Fehler melden" -----------------------------------------------
# Unit und Systembenutzer sind Zeiger in diesen Klon. Aendert ein Pull die
# Unit, braucht systemd ein daemon-reload, und fehlermeldung.py laeuft erst
# nach einem Neustart in der neuen Fassung. Fehlt der Benutzer, startet der
# Dienst mit status=217/USER nicht (so bis 07.11.2026, "Fehler melden" gab
# 502). Deshalb hier jedes Mal: Zeiger setzen, Benutzer anlegen (idempotent),
# daemon-reload, Dienst einschalten und neu starten (adorfer 07.11.2026).
# DIENST= (leer) schaltet das ab, z. B. auf einem Testrechner.
DIENST="${DIENST-fehlermeldung}"
if [ -n "$DIENST" ] && command -v systemctl >/dev/null && [ -d /run/systemd/system ]; then
  mkdir -p /etc/sysusers.d
  ln -sfn "$CFG/dienst/$DIENST.sysusers" "/etc/sysusers.d/$DIENST.conf"
  systemd-sysusers
  ln -sfn "$CFG/dienst/$DIENST.service" "/etc/systemd/system/$DIENST.service"
  systemctl daemon-reload
  systemctl enable --quiet "$DIENST"
  systemctl restart "$DIENST"
  sleep 1
  if systemctl is-active --quiet "$DIENST"; then
    sage "$DIENST: neu gestartet, laeuft"
  else
    sage "FEHLER: $DIENST laeuft nicht:"
    systemctl status "$DIENST" --no-pager -n 5 || true
  fi
fi

sage "fertig. Inhalt von $WURZEL:"
ls -la "$WURZEL"
