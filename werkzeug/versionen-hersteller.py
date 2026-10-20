#!/usr/bin/env python3
"""Erzeugt ffnef/versionen-hersteller.json: welche Hardware-Versionen der
Hersteller selbst fuer ein Modell fuehrt, auch nie unterstuetzte.

    werkzeug/versionen-hersteller.py <images-liste.txt>

Quelle sind die Download-Seiten von TP-Link und Mercusys; dort steht jede
Hardware-Version zur Auswahl (Archer C50: V1, V2, V3, V4, V6). OpenWrt-ToH und
OpenWrt-Releases kennen nur, was irgendwann unterstuetzt wurde, so dass z. B.
die Archer C50 V2 sonst fehlt. Abgefragt werden nur Modelle aus
ffnef/versionen.json, die wir in mindestens einer Version bauen (Image-Liste
aus Neanderfunk/geraetedaten, quellen/). Hauptversion zaehlt (V6.20 = v6),
Ausnahme TP-Link CPE210.

Langsam: 5 s zwischen zwei Abrufen. werkzeug/versionen-toh.py liest die
Datei mit und fuehrt Versionen, die nur der Hersteller nennt, als "wird von
OpenWrt noch nicht unterstuetzt".
"""
import datetime, json, os, re, sys, time, urllib.error, urllib.request

HIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VER = os.path.join(HIER, "ffnef", "versionen.json")
ZIEL = os.path.join(HIER, "ffnef", "versionen-hersteller.json")
UA = "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0"
SEITEN = {
    "tp-link": ["https://www.tp-link.com/de/support/download/{}/", "https://www.tp-link.com/en/support/download/{}/"],
    "mercusys": ["https://www.mercusys.com/de/download/{}/", "https://www.mercusys.com/en/download/{}/"],
}


def hauptversion(v, grund):
    v = v.lower()
    if grund.startswith("tp-link-cpe210") and v.startswith("v1."):
        return v   # nur CPE210 v1.1 (signierter Bootloader EU/US) ist eigene Hardware-Version
    return re.sub(r"^(v\d+)\.\d+$", r"\1", v)


def laden(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.geturl(), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return None, "HTTP %d" % e.code
    except Exception as e:
        return None, str(e)


def kandidaten(grund, modell, praefix):
    s = re.sub(r"[^a-z0-9]+", "-", modell.lower()).strip("-")
    aus = [s, grund[len(praefix) + 1:] if grund.startswith(praefix + "-") else grund,
           s.replace("-nd", "nd"), re.sub(r"-nd$", "", s)]
    return list(dict.fromkeys(x for x in aus if x))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    images = [z.strip() for z in open(sys.argv[1]) if z.strip()]
    profile = json.load(open(VER, encoding="utf-8"))["geraete"]
    alt = {}
    if os.path.exists(ZIEL):
        alt = json.load(open(ZIEL, encoding="utf-8")).get("geraete", {})
    aus = {}
    for g in sorted(profile):
        e = profile[g]
        hst = e.get("hersteller", "").lower()
        if hst not in SEITEN:
            continue
        if not any(i == g or re.match(re.escape(g) + r"-?v\d", i) for i in images):
            continue
        treffer = None
        for slug in kandidaten(g, e.get("modell", ""), hst):
            for muster in SEITEN[hst]:
                url = muster.format(slug)
                ende, text = laden(url)
                time.sleep(5)
                if not ende:
                    continue
                vs = re.findall(r"download/%s/(v\d+(?:\.\d+)?)/?[\"'#?]" % re.escape(slug), text, re.I)
                if vs:
                    treffer = (url, sorted({hauptversion(v, g) for v in vs},
                                           key=lambda x: [int(n) for n in re.findall(r"\d+", x)]))
                    break
            if treffer:
                break
        if treffer:
            aus[g] = {"versionen": treffer[1], "quelle": treffer[0], "abgerufen": datetime.date.today().isoformat()}
            print("%-34s %s" % (g, " ".join(treffer[1])), flush=True)
        elif g in alt:
            aus[g] = alt[g]   # heute nicht erreichbar: alten Stand behalten
            print("%-34s nicht gefunden, alter Stand bleibt" % g, flush=True)
        else:
            print("%-34s nicht gefunden" % g, flush=True)
    with open(ZIEL, "w", encoding="utf-8") as f:
        json.dump({"erzeugt": datetime.date.today().isoformat(),
                   "erzeugt_von": "werkzeug/versionen-hersteller.py",
                   "hinweis": "Hardware-Versionen laut Download-Seite des Herstellers (Hauptversion).",
                   "geraete": aus}, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    print("geschrieben:", ZIEL, len(aus), "Modelle")


if __name__ == "__main__":
    main()
