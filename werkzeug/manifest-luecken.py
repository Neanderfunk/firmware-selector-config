#!/usr/bin/env python3
"""Welche Geraete bauen wir, ohne sie im Downloader anzubieten?

Grundlage ist das Manifest einer Domaene. Es ist dafuer besser geeignet als
das Verzeichnislisting, weil es je Modellkennung eine Zeile hat -- auch dann,
wenn sich mehrere Kennungen EIN Image teilen.

  <modellkennung> <version> <sha256> <groesse> <dateiname>

**Aliase erkennt man an der Pruefsumme.** Teilen sich mehrere Kennungen
denselben sha256, ist es dasselbe Image unter mehreren Namen. Im
Downloadverzeichnis liegt dann nur eine Datei, benannt nach einer der
Kennungen -- die uebrigen sind dort unsichtbar. Deshalb wird hier nach
Pruefsumme gruppiert und je Gruppe gefragt, ob WENIGSTENS EIN Name in
devices.js vorkommt.

Zwei Arten von Luecken, die sehr unterschiedlich wiegen:

  ganz_fehlend    Kein Name der Gruppe steht in devices.js. Das Geraet ist
                  im Downloader nicht zu finden, obwohl wir es bauen.
  nur_alias       Mindestens ein Name ist gedeckt. Wer das Geraet sucht,
                  findet es; nur die Zweitbezeichnung fehlt. Meist harmlos.

Aufruf:  werkzeug/manifest-luecken.py [Domaene]     (Vorgabe 02_met)
"""
import re, sys, json, collections, urllib.request, os, datetime

HIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMAENE = sys.argv[1] if len(sys.argv) > 1 else "02_met"
URL = f"https://download.ffnef.de/firmware/stable/{DOMAENE}/sysupgrade/stable.manifest"
ZIEL = os.path.join(HIER, "ffnef", "manifest-luecken.json")


def bekannte_namen(pfad):
    """Alle Bildnamen aus devices.js -- beide Schreibweisen.

    Flach:          "Archer C6":  "tp-link-archer-c6"
    Verschachtelt:  "WR1000":    {"cudy-wr1000": "v2"}
    Die verschachtelte Form hatte ich beim ersten Anlauf uebersehen; sie
    stellt rund die Haelfte aller Eintraege.
    """
    d = open(pfad, encoding="utf-8").read().split("var vendormodels")[0]
    namen = set(re.findall(r'"[^"]+"\s*:\s*"([a-z0-9][a-z0-9._+-]*)"', d))
    for blk in re.findall(r'"[^"]+"\s*:\s*\{([^{}]*)\}', d):
        namen |= set(re.findall(r'"([a-z0-9][a-z0-9._+-]*)"\s*:\s*"', blk))
    return namen


def gedeckt(name, bekannt):
    if name in bekannt:
        return True
    m = re.match(r"^(.*?)-(v\d+(?:\.\d+)?|[a-z]\d+)$", name)   # Revision wie im Selector
    return bool(m and m.group(1) in bekannt)


def main():
    bekannt = bekannte_namen(os.path.join(HIER, "ffnef", "devices.js"))
    with urllib.request.urlopen(URL, timeout=60) as r:
        zeilen = r.read().decode("utf-8", "replace").splitlines()

    gruppen = collections.defaultdict(list)
    for z in zeilen:
        t = z.split()
        if len(t) == 5 and len(t[2]) == 64:
            gruppen[t[2]].append(t[0])

    ganz, alias = [], []
    for namen in gruppen.values():
        offen = sorted(n for n in namen if not gedeckt(n, bekannt))
        if not offen:
            continue
        eintrag = {"fehlt": offen, "alle_namen": sorted(namen)}
        if len(offen) == len(namen):
            ganz.append(eintrag)
        else:
            eintrag["gedeckt_als"] = sorted(set(namen) - set(offen))
            alias.append(eintrag)

    aus = {
        "erzeugt": datetime.date.today().isoformat(),
        "erzeugt_von": "werkzeug/manifest-luecken.py",
        "quelle": URL,
        "zahlen": {"modellkennungen": sum(len(v) for v in gruppen.values()),
                   "verschiedene_images": len(gruppen),
                   "devices_js_kennt": len(bekannt)},
        "ganz_fehlend": sorted(ganz, key=lambda e: e["fehlt"][0]),
        "nur_alias": sorted(alias, key=lambda e: e["fehlt"][0]),
    }
    with open(ZIEL, "w", encoding="utf-8") as f:
        json.dump(aus, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(f"  {aus['zahlen']['modellkennungen']} Modellkennungen in "
          f"{aus['zahlen']['verschiedene_images']} Images")
    print(f"  ganz fehlend: {len(ganz)}   nur Alias: {len(alias)}")
    print(f"  geschrieben: {ZIEL}")
    for e in aus["ganz_fehlend"]:
        rest = f"  (Alias: {', '.join(e['alle_namen'][1:])})" if len(e["alle_namen"]) > 1 else ""
        print(f"    {e['fehlt'][0]}{rest}")


if __name__ == "__main__":
    main()
