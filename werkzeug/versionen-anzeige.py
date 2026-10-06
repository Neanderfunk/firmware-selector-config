#!/usr/bin/env python3
"""Erzeugt ffnef/versionen-anzeige.json: was rechts neben dem Bild steht.

versionen.json ist nach OpenWrt-Schluesseln sortiert, die Webseite kennt aber
nur Hersteller und Modell, wie sie in devices.js stehen. Diese Zuordnung hier
einmal zu bauen ist besser, als sie im Browser zu raten: sie ist nachlesbar,
sie laesst sich pruefen, und ffnef.js bleibt ein kurzes Stueck Anzeigecode.

Was hier NICHT hineingehoert: welche Versionen WIR anbieten. Das weiss die
Seite zur Laufzeit genauer als jede Datei, naemlich aus den Dateinamen der
Images. Hier steht nur Weltwissen: welche Hardware-Versionen es gibt und
welche davon belegt nicht gehen.

Aufruf:  werkzeug/versionen-anzeige.py
"""
import json, os, re, sys, datetime

HIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEV = os.path.join(HIER, "ffnef", "devices.js")
VER = os.path.join(HIER, "ffnef", "versionen.json")
HAND = os.path.join(HIER, "ffnef", "versionen-handpflege.json")
ZIEL = os.path.join(HIER, "ffnef", "versionen-anzeige.json")

# Nur echte Hardware-Versionen anzeigen. OpenWrts variant-Feld traegt auch
# Flashgroessen ("16m"), Bootloader ("brn", "nor") und Regionen ("cn").
# "nicht fuer nor" waere fuer Lesende blanker Unsinn.
VERSION = re.compile(r"^v\d+(\.\d+)?$")


def js_bloecke(text):
    """Die drei Geraetetabellen aus devices.js als Python-Objekte.

    devices.js ist JavaScript, kein JSON: es stehen Kommas vor schliessenden
    Klammern. Die entfernen wir, der Rest ist gueltiges JSON.
    """
    # Welche Tabellen es gibt, sagt devices.js selbst in vendormodels. Eine
    # feste Liste hier wuerde beim naechsten Zuwachs stillschweigend Geraete
    # verlieren; genau das ist mir beim ersten Anlauf passiert.
    namen = re.findall(r":\s*(devices_[a-z0-9_]+)\s*,?\s*[}\n]",
                       re.search(r"var\s+vendormodels\s*=\s*\{(.*?)\}",
                                 text, re.S).group(1)) if re.search(
        r"var\s+vendormodels\s*=", text) else []
    if not namen:
        namen = re.findall(r"var\s+(devices_[a-z0-9_]+)\s*=", text)

    aus = {}
    for name in namen:
        m = re.search(r"var\s+%s\s*=\s*(\{)" % name, text)
        if not m:
            continue
        i = m.start(1)
        tiefe, j = 0, i
        while j < len(text):
            if text[j] == "{":
                tiefe += 1
            elif text[j] == "}":
                tiefe -= 1
                if tiefe == 0:
                    break
            j += 1
        roh = text[i:j + 1]
        roh = re.sub(r",(\s*[}\]])", r"\1", roh)
        try:
            aus[name] = json.loads(roh)
        except Exception as e:
            print(f"  {name}: nicht lesbar ({e})", file=sys.stderr)
    return aus


def profile(wert):
    """Die Profilnamen eines Modells. devices.js kennt zwei Schreibweisen:
    flach ("Archer C6": "tp-link-archer-c6") und geschachtelt
    ("WR1000": {"cudy-wr1000": "v2"})."""
    if isinstance(wert, str):
        return [wert]
    if isinstance(wert, dict):
        return [k for k in wert if k != "--ignore--"]
    return []


def grundname(p):
    """tp-link-archer-c6-v2 -> tp-link-archer-c6 (Schluessel in versionen.json)"""
    return re.sub(r"-v\d+(\.\d+)?$", "", p)


def main():
    for pfad in (DEV, VER):
        if not os.path.exists(pfad):
            sys.exit(f"fehlt: {pfad}")

    versionen = json.load(open(VER, encoding="utf-8"))["geraete"]
    hand = {}
    if os.path.exists(HAND):
        hand = json.load(open(HAND, encoding="utf-8"))
    handgeraete = hand.get("geraete", {})
    warnungen = hand.get("warnungen", {})

    # Warnungen auf die betroffenen Profile umdrehen
    warn_je_profil = {}
    for name, w in warnungen.items():
        for p in w.get("betrifft", []):
            warn_je_profil.setdefault(p, []).append(
                {k: v for k, v in w.items() if k != "betrifft"})

    tabellen = js_bloecke(open(DEV, encoding="utf-8").read())
    aus, ohne = {}, 0

    for tabelle in tabellen.values():
        for hersteller, modelle in tabelle.items():
            if not isinstance(modelle, dict):
                continue
            for modell, wert in modelle.items():
                ps = profile(wert)
                if not ps:
                    continue
                bekannt, belege, warn = set(), [], []
                for p in ps:
                    g = grundname(p)
                    e = versionen.get(g)
                    if e:
                        bekannt.update(e["openwrt"])
                    h = handgeraete.get(g)
                    if h:
                        bekannt.update(h.get("nicht_unterstuetzt", []))
                        belege.append({"profil": g, **h})
                    for w in warn_je_profil.get(p, []) or warn_je_profil.get(g, []):
                        if w not in warn:
                            warn.append(w)

                # Nur echte Versionsreihen; alles andere stiftet Verwirrung.
                bekannt = sorted(v for v in bekannt if VERSION.match(v))
                if not bekannt and not belege and not warn:
                    ohne += 1
                    continue
                eintrag = {"bekannt": bekannt}
                if belege:
                    eintrag["nicht_unterstuetzt"] = sorted(
                        {v for b in belege for v in b.get("nicht_unterstuetzt", [])})
                    eintrag["belege"] = belege
                if warn:
                    eintrag["warnungen"] = warn
                aus[f"{hersteller}|{modell}"] = eintrag

    ergebnis = {
        "erzeugt": datetime.date.today().isoformat(),
        "erzeugt_von": "werkzeug/versionen-anzeige.py",
        "hinweis": ("Schluessel ist 'Hersteller|Modell', genau wie in devices.js. "
                    "'bekannt' sind die Hardware-Versionen, die es laut OpenWrt "
                    "oder laut Handliste gibt. Welche WIR anbieten, entscheidet "
                    "die Seite zur Laufzeit aus den Dateinamen."),
        "geraete": aus,
    }
    with open(ZIEL, "w", encoding="utf-8") as f:
        json.dump(ergebnis, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    mehr = sum(1 for e in aus.values() if len(e["bekannt"]) > 1)
    nu = sum(1 for e in aus.values() if e.get("nicht_unterstuetzt"))
    print(f"  geschrieben: {ZIEL}")
    print(f"  Geraete mit Versionsangabe: {len(aus)}, davon mehrere Versionen: {mehr}, "
          f"belegt nicht unterstuetzt: {nu}")
    print(f"  ohne jede Versionsangabe (nicht aufgenommen): {ohne}")


if __name__ == "__main__":
    main()
