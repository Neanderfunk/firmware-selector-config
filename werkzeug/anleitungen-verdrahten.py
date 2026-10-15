#!/usr/bin/env python3
"""Erzeugt den devices_info-Block fuer config.js aus der index.json der
Installationsanleitungen.

Hintergrund: der Selector schlaegt Anleitungen NICHT ueber den gluon_name
nach, sondern ueber Hersteller, Modell und Revision, so wie sie in
devices.js stehen (findDeviceInfo in app.js). Dieses Werkzeug stellt die
Verbindung her, damit die Eintraege nicht von Hand getippt werden.

Eine Eigenheit, die Handarbeit besonders fehleranfaellig machen wuerde:
die Anleitungen tragen die Hardware-Revision im Namen, unsere devices.js
meist nicht. Aus "d-link-aquila-pro-ai-m60-a1" wird deshalb schrittweise
das letzte Segment abgeschnitten, bis ein Eintrag passt. Jede solche
Verkuerzung wird gemeldet, damit niemand sie uebersieht.

Aufruf:
    werkzeug/anleitungen-verdrahten.py                      # nur "erprobt"
    werkzeug/anleitungen-verdrahten.py --alle               # auch "ungeprueft"
    werkzeug/anleitungen-verdrahten.py --index <datei|url>

Vorgabe ist die index.json auf dem Server. Die Ausgabe wird NICHT in
config.js geschrieben, sondern ausgegeben: der Block gehoert von Hand
geprueft und eingesetzt, dafuer ist er kurz genug.
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


def tabelle_lesen(roh, name):
    """Eine var-Tabelle aus devices.js als Python-Struktur."""
    anfang = roh.index("var %s = {" % name)
    anfang += roh[anfang:].index("{")
    ende = roh.index("\n}", anfang) + 2
    s = roh[anfang:ende]
    s = re.sub(r"//[^\n]*", "", s)        # Zeilenkommentare
    s = re.sub(r",\s*([}\]])", r"\1", s)  # haengende Kommata
    return json.loads(s)


def rueckabbildung(devices_js):
    """gluon_name -> (hersteller, modell, revisionslabel oder None)"""
    roh = devices_js.read_text(encoding="utf-8")
    abb = {}
    for t in TABELLEN:
        for hersteller, modelle in tabelle_lesen(roh, t).items():
            for modell, wert in modelle.items():
                if isinstance(wert, str):
                    abb.setdefault(wert, (hersteller, modell, None))
                else:
                    for gname, rev in wert.items():
                        abb.setdefault(gname, (hersteller, modell, rev or None))
    return abb


def suchen(abb, gluon_name):
    """Exakt, sonst schrittweise ohne das letzte Segment."""
    if gluon_name in abb:
        return abb[gluon_name], None
    teile = gluon_name.split("-")
    while len(teile) > 2:
        teile = teile[:-1]
        kurz = "-".join(teile)
        if kurz in abb:
            return abb[kurz], kurz
    return None, None


def index_holen(quelle):
    if quelle.startswith(("http://", "https://")):
        with urllib.request.urlopen(quelle, timeout=20) as a:
            return json.loads(a.read().decode("utf-8"))
    return json.loads(Path(quelle).read_text(encoding="utf-8"))


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--index", default=VORGABE_INDEX, help="Datei oder URL")
    p.add_argument("--alle", action="store_true",
                   help='auch Seiten mit status "ungeprueft" verdrahten')
    p.add_argument("--devices", default=str(HIER / "ffnef" / "devices.js"))
    a = p.parse_args()

    abb = rueckabbildung(Path(a.devices))
    eintraege = index_holen(a.index)

    baum = {}
    uebersprungen, ungeklaert, verkuerzt = [], [], []

    for e in sorted(eintraege, key=lambda x: x.get("gluon_name", "")):
        gname = e.get("gluon_name", "")
        status = e.get("status", "")
        if not a.alle and status != "erprobt":
            uebersprungen.append((gname, status))
            continue
        treffer, kurz = suchen(abb, gname)
        if not treffer:
            ungeklaert.append(gname)
            continue
        if kurz:
            verkuerzt.append((gname, kurz))
        hersteller, modell, rev = treffer
        if rev:
            baum.setdefault(hersteller, {}).setdefault(modell, {})[rev] = e["url"]
        else:
            baum.setdefault(hersteller, {})[modell] = e["url"]

    def melde(*t):
        print(*t, file=sys.stderr)

    melde("### %d Eintraege gelesen aus %s" % (len(eintraege), a.index))
    if verkuerzt:
        melde("### %d ueber den verkuerzten Namen zugeordnet:" % len(verkuerzt))
        for g, k in verkuerzt:
            melde("    %s  ->  %s" % (g, k))
    if uebersprungen:
        melde("### %d uebersprungen, weil nicht erprobt (mit --alle einschliessen):"
              % len(uebersprungen))
        for g, s in uebersprungen:
            melde("    %-34s %s" % (g, s))
    if ungeklaert:
        melde("### %d NICHT in devices.js gefunden, bitte ansehen:" % len(ungeklaert))
        for g in ungeklaert:
            melde("    %s" % g)
    melde("### %d Geraete verdrahtet" % sum(
        len(v) for v in baum.values()))
    melde("")

    if not baum:
        melde("Nichts zu verdrahten.")
        return 0

    # Ausgabe im Stil von config.js: zwei Leerzeichen Einrueckung.
    print("  // Erzeugt von werkzeug/anleitungen-verdrahten.py aus")
    print("  // %s" % a.index)
    print("  // Nicht von Hand pflegen, sondern das Werkzeug neu laufen lassen.")
    print("  devices_info: {")
    for hersteller in sorted(baum):
        print('    "%s": {' % hersteller)
        for modell in sorted(baum[hersteller]):
            wert = baum[hersteller][modell]
            if isinstance(wert, dict):
                innen = ", ".join('"%s": "%s"' % (r, u) for r, u in sorted(wert.items()))
                print('      "%s": {%s},' % (modell, innen))
            else:
                print('      "%s": "%s",' % (modell, wert))
        print("    },")
    print("  },")
    return 0


if __name__ == "__main__":
    sys.exit(main())
