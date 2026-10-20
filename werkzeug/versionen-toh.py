#!/usr/bin/env python3
"""Erzeugt ffnef/versionen-toh.json: Hardware-Versionen, die es gibt, fuer die
wir aber keine Firmware haben, je mit kurzem Grund.

    werkzeug/versionen-toh.py <ToH-Dump.tsv.gz> <images-liste.txt>

ToH-Dump und Image-Liste (was wir bauen) liegen im Repo Neanderfunk/geraetedaten
unter quellen/. Dazu kommt ffnef/versionen.json (versionen-holen.py): welche
Versionen in den aktuellen OpenWrt-Releases stecken.
Schluessel ist der Grundname (z. B. "cudy-wr1300"), genau wie dort und in
versionen-handpflege.json. werkzeug/versionen-anzeige.py nimmt diese Datei
NACH der Handpflege: was dort von Hand steht, gewinnt.

Aufgenommen werden nur Modelle, die wir in mindestens einer Version bauen.

Gruende, in dieser Reihenfolge (abgeleitet, nicht gemessen):
  zu wenig Speicher                 4 MB Flash oder 32 MB RAM oder weniger
  kein brauchbarer Treiber fuer     ToH fuehrt WLAN (ohne "partly") unter
  das 5-GHz-WLAN                    unsupported_functions
  noch nicht in unserer Freifunk-Firmware, OpenWrt kann es schon
                                    Version steckt in einem aktuellen
                                    OpenWrt-Release (versionen.json)
  aktuelles OpenWrt passt nicht     ToH kennt eine Release mit Unterstuetzung,
  mehr in den Speicher              aktuell nicht mehr; 8 MB Flash oder 64 MB
                                    RAM oder weniger, sonst "wird von OpenWrt
                                    nicht mehr unterstuetzt"
  wird von OpenWrt noch nicht       weder ToH noch aktuelle Releases; auch
  unterstuetzt                      Versionen, die nur die Download-Seite des
                                    Herstellers nennt (versionen-hersteller.json)
Wortlaut mit Content abgestimmt (20.10.2026): wer im Selector steht, kennt den
Unterschied zwischen OpenWrt und Gluon meist nicht.

Die ToH hinkt bei neuen Versionen oft hinterher; deshalb entscheidet ueber
"in OpenWrt" die Release-Liste, nicht die ToH-Spalte supportedcurrentrel.

Hardware-Versionen: Es zaehlt nur die Hauptversion (bei TP-Link und Mercusys
ist v1.1 = v1, nur Firmware/Bootloader), Ausnahme TP-Link CPE210 v1.1.
"""
import csv, datetime, gzip, io, json, os, re, sys

HIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VER = os.path.join(HIER, "ffnef", "versionen.json")
# werkzeug/versionen-hersteller.py: Versionen laut Download-Seite des Herstellers
HERST = os.path.join(HIER, "ffnef", "versionen-hersteller.json")
ZIEL = os.path.join(HIER, "ffnef", "versionen-toh.json")


def norm(t):
    t = t.lower().replace("!", "").replace("+", "plus")
    return re.sub(r"[^a-z0-9.]+", "-", t).strip("-")


def ohne_strich(t):
    """"Open-Mesh OM2P" und "openmesh-om2p" sollen gleich aussehen."""
    return t.replace("-", "").replace(".", "")


def hauptversion(v, grund):
    v = v.lower()
    if grund.startswith("tp-link-cpe210") and v.startswith("v1."):
        return v   # nur CPE210 v1.1 (signierter Bootloader EU/US) ist eigene Hardware-Version
    return re.sub(r"^(v\d+)\.\d+$", r"\1", v)


def mb(t):
    """"2,128NAND" -> 128: bei mehreren Angaben zaehlt die groesste."""
    zahlen = [int(z) for z in re.findall(r"\d+", t or "")]
    return max(zahlen) if zahlen else None


def wlan_fehlt(uf):
    """Baender, fuer die ToH WLAN als nicht unterstuetzt fuehrt ("partly" zaehlt nicht)."""
    baender = []
    for teil in (uf or "").split(","):
        t = teil.strip().lower().replace(" ", "")
        if re.search(r"wi-?fi|wlan|wireless", t) and "partly" not in t and "led" not in t:
            baender.append("5 GHz" if "5ghz" in t else "2.4 GHz" if "2.4ghz" in t else "WLAN")
    return sorted(set(baender))


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    images = {z.strip() for z in open(sys.argv[2]) if z.strip()}
    rows = list(csv.DictReader(io.TextIOWrapper(gzip.open(sys.argv[1]), encoding="utf-8",
                                                errors="replace"), delimiter="\t"))
    stand = re.search(r"(\d{4}-\d{2}-\d{2})", os.path.basename(sys.argv[1]))
    stand = stand.group(1) if stand else datetime.date.today().isoformat()
    ver = json.load(open(VER, encoding="utf-8"))
    profile = ver["geraete"]
    releases = ", ".join(re.search(r"releases/([^/]+)/", u).group(1)
                         for u in ver.get("quellen", {}).get("openwrt", []))

    herst = {}
    if os.path.exists(HERST):
        herst = json.load(open(HERST, encoding="utf-8")).get("geraete", {})

    gruppen = {}
    for r in rows:
        gruppen.setdefault(ohne_strich(norm(r["brand"] + " " + r["model"])), []).append(r)

    aus = {}
    for g in sorted(profile):
        e = profile[g]
        # Was wir bauen, steht in der Image-Liste ("wir" in versionen.json
        # hinkt hinterher). Ohne Versionsangabe ("netgear-wndr3700") ist es v1;
        # "netgear-ex6150v2" schreibt Gluon ohne Bindestrich.
        unsere = set()
        for i in images:
            if i == g:
                unsere.add("v1")
            m = re.match(re.escape(g) + r"-?(v\d+(?:\.\d+)?)(?:-|$)", i)
            if m:
                unsere.add(hauptversion(m.group(1), g))
        if not unsere:
            continue
        # "v2 (eu/ru/jp)" -> v2
        in_openwrt = {hauptversion(m.group(0), g) for m in
                      (re.match(r"v\d+(\.\d+)?", v) for v in e.get("openwrt", [])) if m}
        # "TL-WR841N/ND" fuehrt die ToH fuer die alten Versionen getrennt von "TL-WR841N"
        treffer = []
        for k in dict.fromkeys([ohne_strich(g), ohne_strich(norm(e.get("hersteller", "") + " " + e.get("modell", "")))]):
            for kk in (k, k + "nd"):
                treffer += [r for r in gruppen.get(kk, []) if r not in treffer]

        # je Version die ToH-Zeile; mehrere Zeilen zu einer Version: die erste
        toh = {}
        for r in treffer:
            for v in re.findall(r"\bv\d+(?:\.\d+)?\b", r["version"], re.I):
                toh.setdefault(hauptversion(v, g), r)
        h = herst.get(g, {})
        beim_hersteller = {hauptversion(v, g) for v in h.get("versionen", [])}
        eintraege = []
        for v in sorted(set(toh) | in_openwrt | beim_hersteller,
                        key=lambda x: [int(n) for n in re.findall(r"\d+", x)]):
            if v in unsere:
                continue
            r = toh.get(v, {})
            fl, ra = mb(r.get("flashmb")), mb(r.get("rammb"))
            wl = wlan_fehlt(r.get("unsupported_functions"))
            if (fl and fl <= 4) or (ra and ra <= 32):
                art = "zu wenig Speicher"
            elif wl:
                art = "kein brauchbarer Treiber für das %s" % (
                    "WLAN" if wl == ["WLAN"] else "2.4- und 5-GHz-WLAN" if len(wl) > 1
                    else wl[0].replace(" ", "-") + "-WLAN")
            elif v in in_openwrt:
                art = "noch nicht in unserer Freifunk-Firmware, OpenWrt kann es schon"
            elif re.search(r"\d+\.\d+", r.get("supportedsincerel") or ""):
                art = ("aktuelles OpenWrt passt nicht mehr in den Speicher"
                       if (fl and fl <= 8) or (ra and ra <= 64)
                       else "wird von OpenWrt nicht mehr unterstützt")
            elif not r and v in beim_hersteller:
                # nur der Hersteller nennt sie; ob OpenWrt sie je bekommt, ist offen
                art = "wird von OpenWrt nicht unterstützt"
            else:
                art = "wird von OpenWrt noch nicht unterstützt"
            seite = r.get("page", "")
            belegt = []
            if r:
                belegt.append("OpenWrt-ToH, Dump vom %s" % stand)
            if v in in_openwrt:
                belegt.append("OpenWrt-Releases " + releases)
            if v in beim_hersteller:
                belegt.append("Download-Seite des Herstellers, abgerufen %s" % h.get("abgerufen", ""))
            eintraege.append({
                "nicht_unterstuetzt": [v],
                "art": art,
                "grund": "Grund: %s." % art,
                # ganzer Satz, ohne Einleitung angezeigt (anders als erkennbar_an).
                # "Ver: 2.0" schreiben TP-Link und Mercusys; andere nicht verlaesslich
                "erkennung": "Die Version steht auf dem Typenschild unter dem Gerät" + (
                    ", etwa „Ver: %s.0“." % v.lstrip("v").split(".")[0]
                    if g.startswith(("tp-link-", "mercusys-")) else "."),
                "quelle": ("https://openwrt.org/" + seite.replace(":", "/")) if seite
                          else h.get("quelle") if v in beim_hersteller and v not in in_openwrt
                          else "https://firmware-selector.openwrt.org/",
                "geprueft": "; ".join(belegt),
            })
        if eintraege:
            aus[g] = eintraege

    with open(ZIEL, "w", encoding="utf-8") as f:
        json.dump({"erzeugt": datetime.date.today().isoformat(),
                   "erzeugt_von": "werkzeug/versionen-toh.py",
                   "quelle": "OpenWrt-ToH-Dump %s, ffnef/versionen.json, ffnef/versionen-hersteller.json" % stand,
                   "geraete": aus}, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    print("geschrieben:", ZIEL, len(aus), "Grundnamen,", sum(len(v) for v in aus.values()), "Versionen")


if __name__ == "__main__":
    main()
