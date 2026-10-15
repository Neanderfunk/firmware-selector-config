#!/usr/bin/env python3
"""Erzeugt den devices_info-Block fuer config.js aus der index.json der
Installationsanleitungen.

Hintergrund: der Selector schlaegt Anleitungen NICHT ueber den gluon_name
nach, sondern ueber Hersteller, Modell und Revision (findDeviceInfo in
app.js). Dieses Werkzeug stellt die Verbindung her, damit die Eintraege
nicht von Hand getippt werden.

DIE REVISION BERECHNET ES SO, WIE APP.JS SIE BERECHNET. Das ist der Kern:
devices.js fuehrt viele Modelle mit EINEM Eintrag fuer alle Revisionen
("CPE210": "tp-link-cpe210"), die Revision liest der Selector erst aus
dem Dateinamen des Images (tp-link-cpe210-v2-sysupgrade.bin -> "v2").
Die Anleitungen heissen wie die Images, also laesst sich derselbe Schluessel
aus ihrem gluon_name ableiten:

  1. Den laengsten Eintrag aus devices.js suchen, der Praefix des
     gluon_name ist.
  2. Hat devices.js dort ein Revisionslabel, gilt das (app.js nimmt
     device.revision vor dem Dateinamen).
  3. Sonst muss der Rest GENAU eine Revision sein ("-v2", "-a1", "-v1.0"),
     wahlweise mit Region ("-v2-eu"), oder leer ("alle").

Alles andere wird NICHT zugeordnet, sondern gemeldet. Ein frueherer Ansatz
hat Segmente vom Ende abgeschnitten, bis etwas passte; der machte aus
"cudy-ap3000-wall-v1" den AP3000 und haette fuer CPE210 v2 und v3 die
Anleitung der v1 verlinkt.

Aufruf:
    werkzeug/anleitungen-verdrahten.py                      # alle Seiten
    werkzeug/anleitungen-verdrahten.py --nur-erprobt        # nur "erprobt"
    werkzeug/anleitungen-verdrahten.py --index <datei|url>

Vorgabe ist ALLE Seiten zu verdrahten, auch die ungeprueften (adorfer,
15.10.2026). Die Kennzeichnung steht auf der Seite selbst: ein Kasten
"Noch nicht am Geraet erprobt" mit der Einstufung, wie sicher die Angaben
sind. Gerade bei Geraeten mit bekannter Brick-Gefahr ist der Link
wichtiger als die Pruefung.

Vorgabe ist die index.json auf dem Server. Die Ausgabe wird NICHT in
config.js geschrieben, sondern ausgegeben, zum Pruefen und Einsetzen.
"""

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

VORGABE_INDEX = "https://routersoftware.ffnef.de/anleitungen/index.json"
HIER = Path(__file__).resolve().parent.parent

TABELLEN = [
    "devices_recommended", "devices_ath10k_lowmem", "devices_legacy_target",
    "devices_small_kernel_part", "devices_4_32", "devices_8_32", "devices_16_32",
]

# Wie findRevision und findRegion in app.js, aber verankert: der Rest des
# Namens muss GANZ aus Revision und optionaler Region bestehen.
REST = re.compile(r"^-([a-z][0-9]+(?:\.[0-9]+)?)(?:-(cn|de|en|eu|il|jp|us))?$")


def tabelle_lesen(roh, name):
    """Eine var-Tabelle aus devices.js als Python-Struktur."""
    anfang = roh.index("var %s = {" % name)
    anfang += roh[anfang:].index("{")
    ende = roh.index("\n}", anfang) + 2
    s = roh[anfang:ende]
    s = re.sub(r"//[^\n]*", "", s)        # Zeilenkommentare
    s = re.sub(r",\s*([}\]])", r"\1", s)  # haengende Kommata
    return json.loads(s)


def eintraege_lesen(devices_js):
    """Liste von (match, hersteller, modell, label) wie in devices.js.

    label ist None bei einem modellweiten String, sonst das Revisionslabel
    aus dem Objekt, auch wenn es leer ist.
    """
    roh = devices_js.read_text(encoding="utf-8")
    liste, gesehen = [], set()
    for t in TABELLEN:
        for hersteller, modelle in tabelle_lesen(roh, t).items():
            for modell, wert in modelle.items():
                paare = [(wert, None)] if isinstance(wert, str) else wert.items()
                for match, label in paare:
                    if match == "--ignore--" or label == "--ignore--":
                        continue
                    if match in gesehen:
                        continue
                    gesehen.add(match)
                    liste.append((match, hersteller, modell, label))
    # Laengster Praefix zuerst
    liste.sort(key=lambda e: -len(e[0]))
    return liste


def zuordnen(eintraege, gluon_name):
    """(hersteller, modell, revisionsschluessel) oder None."""
    for match, hersteller, modell, label in eintraege:
        if not gluon_name.startswith(match):
            continue
        rest = gluon_name[len(match):]
        if label:
            # app.js: device.revision gewinnt vor dem Dateinamen
            if rest == "" or REST.match(rest):
                return hersteller, modell, label
            continue
        if rest == "":
            return hersteller, modell, "alle"
        m = REST.match(rest)
        if m:
            rev = m.group(1) + ("-" + m.group(2) if m.group(2) else "")
            return hersteller, modell, rev
    return None


def index_holen(quelle):
    if quelle.startswith(("http://", "https://")):
        with urllib.request.urlopen(quelle, timeout=20) as a:
            return json.loads(a.read().decode("utf-8"))
    return json.loads(Path(quelle).read_text(encoding="utf-8"))


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--index", default=VORGABE_INDEX, help="Datei oder URL")
    p.add_argument("--nur-erprobt", action="store_true",
                   help='nur Seiten mit status "erprobt" verdrahten')
    p.add_argument("--devices", default=str(HIER / "ffnef" / "devices.js"))
    a = p.parse_args()

    eintraege = eintraege_lesen(Path(a.devices))
    seiten = index_holen(a.index)

    # hersteller -> modell -> revisionsschluessel -> url
    baum = {}
    uebersprungen, ungeklaert, kollision = [], [], []

    for e in sorted(seiten, key=lambda x: x.get("gluon_name", "")):
        gname = e.get("gluon_name", "")
        status = e.get("status", "")
        if a.nur_erprobt and status != "erprobt":
            uebersprungen.append((gname, status))
            continue
        treffer = zuordnen(eintraege, gname)
        if not treffer:
            ungeklaert.append(gname)
            continue
        hersteller, modell, rev = treffer
        revs = baum.setdefault(hersteller, {}).setdefault(modell, {})
        if rev in revs:
            kollision.append((gname, hersteller, modell, rev))
            continue
        revs[rev] = e["url"]

    def melde(*t):
        print(*t, file=sys.stderr)

    melde("### %d Seiten gelesen aus %s" % (len(seiten), a.index))
    if uebersprungen:
        melde("### %d uebersprungen, weil nicht erprobt (--nur-erprobt):"
              % len(uebersprungen))
        for g, s in uebersprungen:
            melde("    %-34s %s" % (g, s))
    if kollision:
        melde("### %d NICHT verdrahtet, Modell und Revision schon belegt:"
              % len(kollision))
        for g, h, m, r in kollision:
            melde("    %-38s %s / %s / %s" % (g, h, m, r))
    if ungeklaert:
        melde("### %d NICHT zugeordnet, bitte ansehen "
              "(nicht in devices.js, oder der Rest ist keine Revision):"
              % len(ungeklaert))
        for g in ungeklaert:
            melde("    %s" % g)
    anzahl = sum(len(r) for m in baum.values() for r in m.values())
    melde("### %d Anleitungen verdrahtet, an %d Modellen"
          % (anzahl, sum(len(m) for m in baum.values())))
    melde("")

    if not baum:
        melde("Nichts zu verdrahten.")
        return 0

    # Ausgabe im Stil von config.js: zwei Leerzeichen Einrueckung.
    # Ein Modell, das nur "alle" hat, bekommt einen String: der gilt in
    # app.js fuer jede Revision. Sonst ein Objekt je Revision -- app.js kennt
    # dort keinen Rueckfall, eine nicht genannte Revision bleibt ohne Link.
    print("  // Erzeugt von werkzeug/anleitungen-verdrahten.py aus")
    print("  // %s" % a.index)
    print("  // Nicht von Hand pflegen, sondern das Werkzeug neu laufen lassen.")
    print("  devices_info: {")
    for hersteller in sorted(baum):
        print('    "%s": {' % hersteller)
        for modell in sorted(baum[hersteller]):
            revs = baum[hersteller][modell]
            if list(revs) == ["alle"]:
                print('      "%s": "%s",' % (modell, revs["alle"]))
            else:
                innen = ", ".join('"%s": "%s"' % (r, u) for r, u in sorted(revs.items()))
                print('      "%s": {%s},' % (modell, innen))
        print("    },")
    print("  },")
    return 0


if __name__ == "__main__":
    sys.exit(main())
