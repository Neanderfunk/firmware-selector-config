#!/usr/bin/env python3
"""Erzeugt ffnef/versionen.json: welche Hardware-Versionen es je Geraet gibt.

Zwei Quellen, beide maschinenlesbar, beide ohne Zugangsdaten:

  1. OpenWrt .overview.json je Release. Liefert zu jedem Profil vendor,
     model und (wo vorhanden) variant -- also die Versionen, die OpenWrt
     unterstuetzt. Das ist die belastbare Haelfte.
  2. Unser eigener Firmware-Server. Liefert die Versionen, fuer die wir
     tatsaechlich bauen.

Was KEINE der beiden Quellen hergibt: Versionen, die es in der Welt gibt,
die aber niemand unterstuetzt. Dafuer gibt es zwei Behelfe:

  - Luecken in der Zaehlung. Kennt OpenWrt v1, v2, v4 und v5, dann hat v3
    sehr wahrscheinlich existiert und wird nicht unterstuetzt. Das Skript
    traegt solche Faelle als "luecke_vermutet" ein -- ausdruecklich als
    Vermutung, nicht als Tatsache.
  - Die Handliste ffnef/versionen-handpflege.json. Wer im OpenWrt-Wiki oder
    bei deviwiki nachgesehen hat, traegt das Ergebnis dort mit Quelle ein.
    Sie gewinnt immer gegen die automatische Vermutung.

Aufruf:  werkzeug/versionen-holen.py [--offline]
Erneut aufrufbar; das Ergebnis ist stabil sortiert, damit git nur echte
Aenderungen zeigt.
"""
import json, os, re, sys, urllib.request, collections, datetime

HIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIEL = os.path.join(HIER, "ffnef", "versionen.json")
HAND = os.path.join(HIER, "ffnef", "versionen-handpflege.json")

# Die OpenWrt-Staende, auf denen unsere Gluon-Zweige aufsetzen.
RELEASES = ["23.05.5", "24.10.0"]
OW = "https://downloads.openwrt.org/releases/{}/.overview.json"
# Eine Domaene genuegt: alle Domaenen bauen dieselbe Geraeteliste.
UNSER = "https://download.ffnef.de/firmware/stable/02_met/sysupgrade/"


def laden(url, roh=False):
    with urllib.request.urlopen(url, timeout=60) as r:
        b = r.read()
    return b.decode("utf-8", "replace") if roh else json.loads(b)


def schluessel(vendor, model):
    """Bildname wie in devices.js: klein, alles Fremde zu Bindestrich."""
    s = f"{vendor}-{model}".lower()
    s = re.sub(r"[^a-z0-9.]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


def luecken(versionen):
    """v1, v2, v4 -> v3 fehlt.

    Nur fuer Reihen, die AUSSCHLIESSLICH aus vN bestehen. Viele Geraete
    benutzen das variant-Feld fuer etwas ganz anderes: Flashgroesse ("16m",
    "32m"), Bootloader ("brn", "nor"), Region ("cn/ru"). Dort ist jede
    Luecke bedeutungslos, und eine Zahl wie "16m" als Version zu lesen
    erfindet v17 bis v31.
    """
    if not all(re.fullmatch(r"v\d+", v) for v in versionen):
        return []
    n = sorted(int(v[1:]) for v in versionen)
    if len(n) < 2:
        return []
    return [f"v{i}" for i in range(n[0], n[-1]) if i not in n]


def main():
    offline = "--offline" in sys.argv
    geraete = collections.defaultdict(lambda: {
        "hersteller": "", "modell": "", "openwrt": set(), "wir": set()})

    for rel in RELEASES:
        try:
            d = laden(OW.format(rel))
        except Exception as e:
            print(f"  OpenWrt {rel}: nicht erreichbar ({e})", file=sys.stderr)
            continue
        n = 0
        for p in d.get("profiles", []):
            for t in p.get("titles", []):
                if "model" not in t:
                    continue
                k = schluessel(t.get("vendor", ""), t["model"])
                g = geraete[k]
                g["hersteller"] = g["hersteller"] or t.get("vendor", "")
                g["modell"] = g["modell"] or t["model"]
                if t.get("variant"):
                    g["openwrt"].add(t["variant"].lower())
                n += 1
        print(f"  OpenWrt {rel}: {n} Eintraege", file=sys.stderr)

    if not offline:
        try:
            html = laden(UNSER, roh=True)
            namen = set(re.findall(r"-[0-9]{8}[a-z]+-([a-z0-9.+-]+?)-sysupgrade\.bin", html))
            for n in namen:
                m = re.match(r"^(.*?)-(v\d+(?:\.\d+)?|[a-z]\d+)$", n)
                basis, var = (m.group(1), m.group(2)) if m else (n, None)
                if basis in geraete and var:
                    geraete[basis]["wir"].add(var)
                elif basis in geraete:
                    geraete[basis]["wir"].add("-")
            print(f"  eigener Server: {len(namen)} Firmware-Dateien", file=sys.stderr)
        except Exception as e:
            print(f"  eigener Server nicht erreichbar ({e})", file=sys.stderr)

    hand = {}
    if os.path.exists(HAND):
        hand = json.load(open(HAND, encoding="utf-8")).get("geraete", {})

    aus = {}
    for k, g in sorted(geraete.items()):
        ow = sorted(g["openwrt"])
        if not ow and not hand.get(k):
            continue                      # Geraete ohne Versionsangabe ueberspringen
        e = {"hersteller": g["hersteller"], "modell": g["modell"],
             "openwrt": ow, "wir": sorted(g["wir"])}
        verm = luecken(ow)
        if verm:
            e["luecke_vermutet"] = verm
        if k in hand:
            e["handpflege"] = hand[k]
        aus[k] = e

    ergebnis = {
        "erzeugt": datetime.date.today().isoformat(),
        "erzeugt_von": "werkzeug/versionen-holen.py",
        "quellen": {"openwrt": [OW.format(r) for r in RELEASES], "eigener_server": UNSER},
        "hinweis": ("luecke_vermutet ist eine VERMUTUNG aus der Zaehlung, keine "
                    "belegte Tatsache. Belegtes gehoert nach versionen-handpflege.json."),
        "geraete": aus,
    }
    with open(ZIEL, "w", encoding="utf-8") as f:
        json.dump(ergebnis, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    mehr = sum(1 for e in aus.values() if len(e["openwrt"]) > 1)
    lk = sum(1 for e in aus.values() if e.get("luecke_vermutet"))
    print(f"  geschrieben: {ZIEL}\n  Geraete: {len(aus)}, davon mit mehreren Versionen: {mehr}, mit vermuteter Luecke: {lk}")


if __name__ == "__main__":
    main()
