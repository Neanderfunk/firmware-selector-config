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

Braucht nichts weiter als Python: Ordnerliste und Download gehen ohne
API-Schluessel und ohne Fremdpaket. gdown wird nur als Rueckfallebene
versucht, wenn der direkte Weg misslingt, und darf fehlen.
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

# Dorthin gehoert der fertige Spiegel auf dem Firmware-Server. Steht hier
# nur fuer den Hinweis am Ende; verschoben wird von Hand, weil der Spiegel
# erst durchgesehen gehoert.
AUSLIEFERN = "/var/www/download.ffnef.de/other"

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


# gdown ist hier nur noch die Rueckfallebene, nicht mehr der Weg.
#
# Erfahrungen aus einem einzigen Nachmittag: --id in 5 veraltet und in 6
# entfernt, --remaining-ok in 6 entfernt, --folder legte bei 6.4.2
# stillschweigend nichts ab, und beim Einzeldownload antwortete 6.4.2 auf
# dieselbe oeffentliche Datei, die 5.2.1 anstandslos holt, mit "Cannot
# retrieve the public link of the file". Jede dieser Ueberraschungen kam
# erst beim Download, nicht beim Start: der Bericht lief durch, dann
# scheiterte jeder Eintrag einzeln.
#
# Der Download selbst ist dagegen eine einzige HTTPS-Anfrage, siehe
# drive_holen(). Deshalb macht das Skript sie selbst und ruft gdown nur
# noch, wenn das misslingt -- fuer den Fall, dass Google eines Tages mehr
# verlangt als diese eine Anfrage.
DRIVE_DIREKT = ("https://drive.usercontent.google.com/download"
                "?id=%s&export=download&confirm=t")


def drive_holen(kid, ziel):
    """Eine oeffentliche Drive-Datei direkt holen.

    Geschrieben wird in eine Datei mit Endung ".teil" und erst am Ende
    umbenannt. Ohne das wuerde ein Abbruch auf halber Strecke eine Datei
    mit Inhalt hinterlassen, und schon_da() haelte sie beim naechsten Lauf
    fuer fertig.
    """
    anfrage = urllib.request.Request(DRIVE_DIREKT % kid,
                                     headers={"User-Agent": UA})
    halb = ziel.with_name(ziel.name + ".teil")
    with urllib.request.urlopen(anfrage, timeout=120) as a:
        art = (a.headers.get("Content-Type") or "").lower()
        if "text/html" in art:
            # Google will mehr als diese Anfrage: Einverstaendnisseite,
            # Zugriffsgrenze oder nicht mehr oeffentlich.
            raise RuntimeError("Google liefert HTML statt der Datei")
        with open(halb, "wb") as f:
            shutil.copyfileobj(a, f, 1 << 20)
    halb.replace(ziel)

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
    """Erst selbst, dann gdown. Die Meldung nennt beide Gruende."""
    try:
        drive_holen(kid, ziel)
        return
    except Exception as fehler:
        print("  direkt nicht bekommen (%s), versuche gdown" % fehler)
    try:
        subprocess.run(["gdown", "https://drive.google.com/uc?id=" + kid,
                        "-O", str(ziel), "--quiet"], check=True)
    except FileNotFoundError:
        raise RuntimeError("gdown ist nicht installiert, und direkt ging es "
                           "auch nicht")


def gdown_ordner(kid, ziel, tiefe=0):
    """Einen Drive-Ordner holen, Datei fuer Datei.

    Absichtlich NICHT "gdown --folder": dieser Modus hat sich zwischen
    gdown 5 und 6 zweimal geaendert (--remaining-ok entfallen) und brachte
    bei 6.4.2 keine Datei an, ohne dass die Ursache aus der Meldung
    hervorgegangen waere. Die Kindliste lesen wir sowieso selbst, fuer die
    oberste Ebene der Ablage. Damit bleibt von gdown nur der
    Einzeldatei-Download uebrig, und der verhaelt sich in allen Fassungen
    gleich.
    """
    ziel.mkdir(parents=True, exist_ok=True)
    kinder = ordner_lesen(kid)
    if not kinder:
        raise RuntimeError("Drive-Ordner %s ist leer" % kid)
    for k in kinder:
        unterziel = ziel / k["name"]
        if k["ordner"]:
            if tiefe >= 2:
                print("  (%s uebergangen, zu tief verschachtelt)" % k["name"])
                continue
            gdown_ordner(k["id"], unterziel, tiefe + 1)
        else:
            gdown_datei(k["id"], unterziel)


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


# Cudy legt in manche Archive neben der Zwischenfirmware ein
# TFTP-Recovery-Image, beim X6 V2 und beim M1800 aus 2023 als
# "Recover/recovery.bin". Das ist NICHT die Datei, die wir brauchen: es
# ist das Bild fuer den Notfallweg per TFTP, und es ist auch nicht das,
# was ein Router ueber die Weboberflaeche annimmt.
RECOVERY = re.compile(r"recover", re.I)


def firmware_waehlen(dateien):
    """Aus mehreren .bin die Zwischenfirmware heraussuchen.

    Gibt (Auswahl, Verworfenes) zurueck. Bleibt nach dem Aussortieren
    nichts uebrig, bleibt alles stehen: dann ist das Recovery-Image
    offenbar das einzige Angebot, und das soll der Mensch sehen und
    nicht das Skript entscheiden.
    """
    ohne = [d for d in dateien if not RECOVERY.search(d[0])]
    if not ohne:
        return dateien, []
    return ohne, [d[0] for d in dateien if RECOVERY.search(d[0])]


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--holen", action="store_true",
                   help="wirklich herunterladen (ohne dies nur Bericht)")
    p.add_argument("--ziel", default=None,
                   help="Zielverzeichnis (Vorgabe: ./cudy-mirror-<datum>)")
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

    ziel = Path(a.ziel or ("cudy-mirror-" + date.today().strftime("%Y%m%d"))).resolve()
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
        dateien, verworfen = firmware_waehlen(bin_aus(rohziel))
        for v in verworfen:
            print("  (%s uebergangen, Recovery-Image)" % v)
        if len(dateien) != 1:
            print("  WARNUNG: %d .bin in %s, keine eindeutige Zuordnung: %s"
                  % (len(dateien), e["name"],
                     ", ".join(d[0] for d in dateien) or "keine"),
                  file=sys.stderr)
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
    print("### Einreihen von Hand, nach dem Durchsehen:")
    if str(ziel.parent) == AUSLIEFERN:
        print("###   liegt schon am richtigen Platz")
    elif Path(AUSLIEFERN).is_dir():
        print("###   mv %s %s/" % (ziel, AUSLIEFERN))
    else:
        # Ohne "root@": auf unseren Maschinen ist kein root-Login per ssh
        # moeglich. Wer schon als root auf dem Server sitzt, laesst den
        # ssh-Teil ganz weg.
        print("###   rsync -a --delete --rsync-path='sudo rsync' \\")
        print("###     %s/ benutzer@firmware6.ffnef.de:%s/%s/"
              % (ziel, AUSLIEFERN, ziel.name))
    return 0


if __name__ == "__main__":
    sys.exit(main())
