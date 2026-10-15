#!/usr/bin/env python3
"""Holt Cudys Zwischenfirmware aus deren Google-Drive-Ablage und legt sie
unter brauchbaren Namen ab.

Warum es das gibt: Cudy veroeffentlicht die signierten OpenWrt-Images, die
ein Router ab Werk ueberhaupt annimmt, in einem oeffentlichen Drive-Ordner.
Die Benennung dort ist uneinheitlich und aendert sich. Fuer denselben
Router stand dort schon "WR3000+V1_without_recovery_TFTP" und spaeter
"WR3000 V1.0.zip", der M1800 liegt doppelt als "M1800 V2.zip" und
"M1800+V2.zip", und die Dateien im ZIP heissen mal
"openwrt-22.03.2-ramips-mt7621-cudy_m1800v2-squashfs-flash.bin", mal
"cudy_wr3000h-v1-sysupgrade_20251119.bin".

Das Skript macht daraus zweierlei:

  roh/               1:1-Kopie der Ablage unter Cudys eigenen Namen.
                     Das ist der Beleg, was wir wann von dort geholt haben.
  zwischenfirmware/  je unterstuetztem Modell eine Datei unter dem
                     Gluon-Geraetenamen, also cudy-wr3000h.bin statt
                     cudy_wr3000h-v1-sysupgrade_20251119.bin.

Die Zuordnung steht in cudy-zwischenfirmware.tsv daneben, nicht im Code.
Was dort fehlt, wird trotzdem gespiegelt, nur ohne eigenen Namen.

DAS WICHTIGSTE AM SKRIPT IST DER BERICHT. Es meldet, was sich gegenueber
der Zuordnungstabelle verschoben hat: neue Eintraege, verschwundene,
mehrere Eintraege fuer dasselbe Geraet. Stillschweigend den falschen
Router zu benennen waere hier der teure Fehler, nicht ein fehlender
Download.

Aufruf:
    cudy-zwischenfirmware-spiegeln.py                  # nur ansehen
    cudy-zwischenfirmware-spiegeln.py --holen          # wirklich holen
    cudy-zwischenfirmware-spiegeln.py --holen --ziel /pfad

Braucht genau ein Fremdpaket: gdown. Das Distributionspaket heisst
ebenso, liegt aber nur in Debian ab 13 und Ubuntu ab 26.04; Ubuntu 24.04
und Debian 12 haben es nicht (am 15.10.2026 gegen die Archiv-Indizes geprueft). Dort:

    sudo apt install -y pipx
    sudo PIPX_HOME=/opt/pipx PIPX_BIN_DIR=/usr/local/bin pipx install gdown

Der Startlink MUSS in einem Verzeichnis des System-Pfades landen, nicht in
~/.local/bin: dieses Skript ruft schlicht "gdown" auf, und bei
"ssh host befehl" liest die Shell kein .profile.

Alles Uebrige ist Bordmittel; die Ordnerliste wird ohne API-Schluessel aus
der Drive-Seite gelesen.
"""

import argparse
import codecs
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from datetime import date
from pathlib import Path

HIER = Path(__file__).resolve().parent
TABELLE = HIER / "cudy-zwischenfirmware.tsv"

# Von hier nennt Cudy den Drive-Ordner. Wird die Seite umgebaut, faellt das
# auf, statt dass wir still einen veralteten Ordner weiterspiegeln.
CUDY_SEITE = "https://www.cudy.com/de-de/blogs/faq/openwrt-software-download"
ORDNER_NOTFALL = "1BKVarlwlNxf7uJUtRhuMGUqeCa5KpMnj"

UA = "Mozilla/5.0 (X11; Linux x86_64)"

# In der Ablage liegt neben den Firmwares auch Cudys Formular fuer die
# EAEU-Konformitaet samt Antwortordner. Das gehoert nicht in den Spiegel.
NICHT_SPIEGELN = ("file upload form",)


def holen_text(url):
    anfrage = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(anfrage, timeout=30) as a:
        return a.read().decode("utf-8", "replace")


def norm(s):
    """Cudys Schreibweisen auf einen gemeinsamen Nenner bringen."""
    s = re.sub(r"\.zip$", "", s.strip(), flags=re.I).lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def ordner_id_suchen():
    try:
        seite = holen_text(CUDY_SEITE)
    except Exception as e:
        print("WARNUNG: Cudy-Seite nicht erreichbar (%s), nehme bekannten Ordner" % e,
              file=sys.stderr)
        return ORDNER_NOTFALL, False
    treffer = re.findall(r"https://drive\.google\.com/drive/folders/([A-Za-z0-9_-]+)", seite)
    if not treffer:
        print("WARNUNG: kein Drive-Link auf der Cudy-Seite, nehme bekannten Ordner",
              file=sys.stderr)
        return ORDNER_NOTFALL, False
    return treffer[0], treffer[0] != ORDNER_NOTFALL


def ordner_lesen(ordner_id):
    """Eintraege eines oeffentlichen Drive-Ordners, ohne API-Schluessel.

    Die Ordnerseite traegt die Kindliste als JSON in window['_DRIVE_ivd'].
    Das ist nicht zugesichert, aber seit Jahren stabil, und die Alternative
    waere ein API-Schluessel, den wir nicht haben wollen.
    """
    seite = holen_text("https://drive.google.com/drive/folders/" + ordner_id)
    m = re.search(r"_DRIVE_ivd'\]\s*=\s*'([^']*)'", seite)
    if not m:
        raise SystemExit("FEHLER: Dateiliste in der Drive-Seite nicht gefunden. "
                         "Google hat vermutlich die Seite umgebaut.")
    daten = json.loads(codecs.decode(m.group(1), "unicode_escape"))
    eintraege = []
    for k in daten[0]:
        kid, name, mime = k[0], k[2], (k[3] or "")
        if "apps.form" in mime or "apps.document" in mime or "apps.spreadsheet" in mime:
            continue
        if any(w in name.lower() for w in NICHT_SPIEGELN):
            continue
        eintraege.append({"id": kid, "name": name, "mime": mime,
                          "ordner": "apps.folder" in mime})
    return eintraege


def tabelle_lesen():
    zuordnung, bemerkung = {}, {}
    for zeile in TABELLE.read_text(encoding="utf-8").splitlines():
        if not zeile.strip() or zeile.lstrip().startswith("#"):
            continue
        teile = zeile.split(None, 2)
        if len(teile) < 2:
            continue
        zuordnung[teile[0]] = teile[1]
        bemerkung[teile[0]] = teile[2].strip() if len(teile) > 2 else ""
    return zuordnung, bemerkung


# Beide Aufrufe uebergeben die VOLLSTAENDIGE URL, nicht die blanke ID mit
# "--id". Diese Option war in gdown 5 als veraltet markiert und ist in
# gdown 6 weg: "unrecognized arguments: --id", und zwar erst beim ersten
# Download, nicht beim Start. Debian 13 liefert 5.2.0, Ubuntu 26.04 5.2.1,
# pipx holt 6.x -- in einem Werkzeug, das auf fremden Maschinen laeuft,
# gehoert also die Form hierher, die alle drei verstehen.

def schon_da(pfad):
    """Liegt da schon etwas Brauchbares?

    Nicht einfach exists(): ein abgebrochener Lauf hinterlaesst eine leere
    Datei oder ein leeres Verzeichnis -- gdown_ordner legt das Verzeichnis
    sogar vor dem Download an. Mit exists() als Mass wuerde so ein Rest
    beim naechsten Lauf stillschweigend als "vorhanden" durchgehen, und
    das Geraet fehlte dauerhaft im Spiegel, ohne eine einzige Meldung.
    """
    if pfad.is_dir():
        return any(pfad.iterdir())
    return pfad.is_file() and pfad.stat().st_size > 0


def gdown_datei(kid, ziel):
    subprocess.run(["gdown", "https://drive.google.com/uc?id=" + kid,
                    "-O", str(ziel), "--quiet"], check=True)


def gdown_ordner(kid, ziel):
    ziel.mkdir(parents=True, exist_ok=True)
    # --remaining-ok: ohne das bricht gdown bei Ordnern mit mehr als 50
    # Dateien ab. Cudys Unterordner sind klein, aber das soll kein
    # stiller Abbruch werden, wenn sich das aendert.
    subprocess.run(["gdown", "--folder", "--remaining-ok",
                    "https://drive.google.com/drive/folders/" + kid,
                    "-O", str(ziel), "--quiet"], check=True)


def md5(pfad):
    h = hashlib.md5()
    with open(pfad, "rb") as f:
        for brocken in iter(lambda: f.read(1 << 20), b""):
            h.update(brocken)
    return h.hexdigest()


def bin_aus(quelle, tiefe=0):
    """Die eine .bin-Datei finden: in einem Verzeichnis oder in einer ZIP.

    Cudy packt beim WR3000 V1 eine ZIP IN die ZIP: aussen
    "WR3000 V1.0.zip", darin "openwrt-...-sysupgrade.zip", und erst darin
    liegt die .bin. Deshalb eine Ebene tiefer nachsehen, aber nicht
    beliebig tief, damit eine verschachtelte Ablage das Skript nicht
    beschaeftigt.
    """
    if quelle.is_dir():
        gefunden = [(k.name, k.read_bytes()) for k in sorted(quelle.rglob("*.bin"))]
        if gefunden or tiefe >= 2:
            return gefunden
        for z in sorted(quelle.rglob("*.zip")):
            gefunden += bin_aus(z, tiefe + 1)
        return gefunden
    if zipfile.is_zipfile(quelle):
        with zipfile.ZipFile(quelle) as z:
            namen = [n for n in z.namelist() if n.lower().endswith(".bin")]
            if namen:
                return [(Path(n).name, z.read(n)) for n in namen]
            if tiefe >= 2:
                return []
            gefunden = []
            for innen in [n for n in z.namelist() if n.lower().endswith(".zip")]:
                with tempfile.TemporaryDirectory() as tmp:
                    pfad = Path(tmp) / Path(innen).name
                    pfad.write_bytes(z.read(innen))
                    gefunden += bin_aus(pfad, tiefe + 1)
            return gefunden
    if quelle.suffix.lower() == ".bin":
        return [(quelle.name, quelle.read_bytes())]
    return []


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--holen", action="store_true",
                   help="wirklich herunterladen (ohne dies nur Bericht)")
    p.add_argument("--ziel", default=None,
                   help="Zielverzeichnis (Vorgabe: ./cudy-spiegel-<datum>)")
    p.add_argument("--nur", default=None,
                   help="nur Eintraege, deren Name dieses Stueck enthaelt. "
                        "Zum Pruefen und zum Nachziehen eines einzelnen Modells.")
    a = p.parse_args()

    zuordnung, bemerkung = tabelle_lesen()
    ordner_id, gewechselt = ordner_id_suchen()
    if gewechselt:
        print("### ACHTUNG: Cudy nennt jetzt einen ANDEREN Drive-Ordner:")
        print("###   bisher %s" % ORDNER_NOTFALL)
        print("###   jetzt  %s" % ordner_id)
        print("### Bitte pruefen, bevor der Spiegel ersetzt wird.\n")

    eintraege = ordner_lesen(ordner_id)
    print("### %d Eintraege in Cudys Ablage (%s)\n" % (len(eintraege), ordner_id))

    # Zuordnen und dabei Kollisionen sammeln
    je_schluessel = {}
    for e in eintraege:
        e["schluessel"] = norm(e["name"])
        e["gluon"] = zuordnung.get(e["schluessel"])
        je_schluessel.setdefault(e["schluessel"], []).append(e)

    kollisionen = {k: v for k, v in je_schluessel.items() if len(v) > 1}
    unbekannt = [e for e in eintraege if not e["gluon"]]
    fehlend = [k for k in zuordnung if k not in je_schluessel]

    print("%-44s %-10s %s" % ("EINTRAG BEI CUDY", "ART", "UNSER NAME"))
    for e in sorted(eintraege, key=lambda x: x["name"].lower()):
        art = "Ordner" if e["ordner"] else "Datei"
        print("%-44s %-10s %s" % (e["name"][:44], art, e["gluon"] or "-"))

    print()
    if kollisionen:
        print("### MEHRERE EINTRAEGE FUER DASSELBE GERAET, bitte entscheiden:")
        for k, v in kollisionen.items():
            print("    %s  ->  %s" % (zuordnung.get(k, k), ", ".join(x["name"] for x in v)))
        print()
    if fehlend:
        print("### IN DER TABELLE, ABER NICHT MEHR IN DER ABLAGE:")
        for k in fehlend:
            print("    %-44s (%s)" % (k, zuordnung[k]))
        print("    Cudy hat umbenannt oder entfernt. Tabelle nachziehen.")
        print()
    if unbekannt:
        print("### NICHT ZUGEORDNET (%d), werden unter Cudys Namen gespiegelt:" % len(unbekannt))
        for e in unbekannt:
            print("    %s" % e["name"])
        print()

    if not a.holen:
        print("### Nur Bericht. Mit --holen wird wirklich geladen.")
        return 0

    # Erst hier einschraenken: die Berichte oben muessen die VOLLSTAENDIGE
    # Ablage sehen, sonst meldet --nur alles Uebrige als verschwunden.
    if a.nur:
        eintraege = [e for e in eintraege if a.nur.lower() in e["name"].lower()]
        print("### auf %d Eintraege eingeschraenkt durch --nur %s\n"
              % (len(eintraege), a.nur))

    ziel = Path(a.ziel or ("cudy-spiegel-" + date.today().strftime("%Y%m%d"))).resolve()
    roh = ziel / "roh"
    fertig = ziel / "zwischenfirmware"
    roh.mkdir(parents=True, exist_ok=True)
    fertig.mkdir(parents=True, exist_ok=True)

    uebersicht = []
    for e in sorted(eintraege, key=lambda x: x["name"].lower()):
        rohziel = roh / e["name"]
        try:
            if schon_da(rohziel):
                print("vorhanden: %s" % e["name"])
            elif e["ordner"]:
                # Rest eines abgebrochenen Laufs, sonst stolpert gdown.
                if rohziel.exists():
                    shutil.rmtree(rohziel, ignore_errors=True)
                print("hole Ordner: %s" % e["name"])
                gdown_ordner(e["id"], rohziel)
            else:
                if rohziel.exists():
                    rohziel.unlink()
                print("hole Datei: %s" % e["name"])
                gdown_datei(e["id"], rohziel)
        except subprocess.CalledProcessError as f:
            print("  FEHLER beim Holen von %s: %s" % (e["name"], f), file=sys.stderr)
            continue

        if not e["gluon"]:
            continue
        dateien = bin_aus(rohziel)
        if len(dateien) != 1:
            print("  WARNUNG: %d .bin in %s, keine eindeutige Zuordnung"
                  % (len(dateien), e["name"]), file=sys.stderr)
            continue
        urname, inhalt = dateien[0]
        zielbin = fertig / (e["gluon"] + ".bin")
        zielbin.write_bytes(inhalt)
        summe = md5(zielbin)
        (fertig / (e["gluon"] + ".md5")).write_text(
            "%s  %s\n" % (summe, zielbin.name), encoding="utf-8")
        uebersicht.append({"gluon_name": e["gluon"], "datei": zielbin.name,
                           "groesse": zielbin.stat().st_size, "md5": summe,
                           "cudy_eintrag": e["name"], "cudy_dateiname": urname,
                           "bemerkung": bemerkung.get(e["schluessel"], "")})

    (ziel / "uebersicht.json").write_text(
        json.dumps(uebersicht, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    with open(ziel / "uebersicht.tsv", "w", encoding="utf-8") as f:
        f.write("# Gluon-Name\tDatei\tGroesse\tMD5\tCudy-Eintrag\tDateiname bei Cudy\n")
        for u in uebersicht:
            f.write("%s\t%s\t%d\t%s\t%s\t%s\n" % (
                u["gluon_name"], u["datei"], u["groesse"], u["md5"],
                u["cudy_eintrag"], u["cudy_dateiname"]))
    (ziel / "herkunft.txt").write_text(
        "Cudys Drive-Ordner %s\n"
        "verlinkt von %s\n"
        "geholt am %s\n" % (ordner_id, CUDY_SEITE, date.today().isoformat()),
        encoding="utf-8")

    print()
    print("### %d Geraete benannt, Uebersicht in %s" % (len(uebersicht), ziel))
    print("### Hochladen von Hand, zum Beispiel:")
    # Ohne "root@": auf unseren Maschinen ist kein root-Login per ssh
    # moeglich. Wer schon als root auf dem Server sitzt, laesst den
    # ssh-Teil ganz weg.
    print("###   rsync -a --delete --rsync-path='sudo rsync' \\")
    print("###     %s/ benutzer@<firmware-server>:/var/www/.../other/%s/"
          % (ziel, ziel.name))
    return 0


if __name__ == "__main__":
    sys.exit(main())
