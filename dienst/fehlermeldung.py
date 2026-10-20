#!/usr/bin/env python3
"""Nimmt "Fehler melden" von routerwahl.ffnef.de und routersoftware.ffnef.de
an und schickt daraus eine Mail an projekt@neanderfunk.de.

Laeuft als kleiner Dienst auf localhost; nginx reicht POST /fehler-melden
durch (dienst/fehlermeldung-nginx.conf). Nur Python-Standardbibliothek.
Die Mail geht per /usr/sbin/sendmail an den lokalen Mailer (nullmailer).

Spamschutz wie beim Stoerungsformular auf neanderfunk.de: eine Quizfrage
("Wie heisst das offene WLAN unserer Router?" - "Freifunk"), dazu ein
verstecktes Feld, das Menschen leer lassen, kurze Felder, hoechstens zwei
Links im Text, und eine Obergrenze je Absender-IP und je Tag. IP-Adressen
stehen nur im Arbeitsspeicher, nicht in der Mail und nicht im Log.

Umgebung:
  FEHLERMELDUNG_ADRESSE   Lauschadresse, Vorgabe 127.0.0.1:8471
  FEHLERMELDUNG_AN        Empfaenger, Vorgabe projekt@neanderfunk.de
  FEHLERMELDUNG_VON       Absender, Vorgabe "Neanderfunk Geraetedaten <kontakt@neanderfunk.de>"
  FEHLERMELDUNG_TROCKEN   1 = Mail nur ausgeben, nicht senden (zum Testen)
"""
import json, os, re, subprocess, sys, threading, time
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs

ADRESSE = os.environ.get("FEHLERMELDUNG_ADRESSE", "127.0.0.1:8471")
AN = os.environ.get("FEHLERMELDUNG_AN", "projekt@neanderfunk.de")
VON = os.environ.get("FEHLERMELDUNG_VON", "Neanderfunk Gerätedaten <kontakt@neanderfunk.de>")
TROCKEN = os.environ.get("FEHLERMELDUNG_TROCKEN") == "1"

SEITEN = ("https://routerwahl.ffnef.de", "https://routersoftware.ffnef.de")
JE_IP_STUNDE = 5
JE_TAG = 40
GROESSE = 8192

# Feld: (Pflicht, hoechste Laenge)
FELDER = {
    "image": (True, 80),
    "modell": (False, 120),
    "zeile": (False, 60),
    "text": (True, 1500),
    "kontakt": (False, 200),
    "seite": (False, 300),
    "quiz": (True, 30),
    "website": (False, 200),   # verstecktes Feld, muss leer bleiben
}

_sperre = threading.Lock()
_je_ip = {}       # ip -> [zeitpunkte]
_heute = [None, 0]  # [tag, anzahl]


def zulassen(ip):
    """Obergrenzen pruefen und zaehlen. Liefert Fehlertext oder None."""
    jetzt = time.time()
    tag = time.strftime("%Y-%m-%d")
    with _sperre:
        if _heute[0] != tag:
            _heute[0], _heute[1] = tag, 0
            _je_ip.clear()
        if _heute[1] >= JE_TAG:
            return "Heute sind schon sehr viele Meldungen eingegangen. Bitte versuch es morgen noch einmal."
        liste = [t for t in _je_ip.get(ip, []) if jetzt - t < 3600]
        if len(liste) >= JE_IP_STUNDE:
            _je_ip[ip] = liste
            return "Du hast in der letzten Stunde schon mehrere Meldungen geschickt. Bitte versuch es später noch einmal."
        liste.append(jetzt)
        _je_ip[ip] = liste
        _heute[1] += 1
    return None


def pruefen(f):
    """Felder saeubern und pruefen. Liefert (felder, fehlertext)."""
    aus = {}
    for name, (pflicht, laenge) in FELDER.items():
        wert = f.get(name, "")
        if isinstance(wert, list):
            wert = wert[0] if wert else ""
        wert = str(wert).replace("\r\n", "\n").strip()
        wert = "".join(c for c in wert if c == "\n" or c >= " ")
        if pflicht and not wert:
            return None, {"text": "Bitte beschreib kurz, was nicht stimmt.",
                          "quiz": "Bitte beantworte die Frage zum WLAN-Namen.",
                          "image": "Es fehlt die Angabe, um welches Gerät es geht."}[name]
        if len(wert) > laenge:
            return None, "Der Text ist zu lang (höchstens %d Zeichen)." % laenge
        aus[name] = wert
    if aus["website"]:
        return None, "Die Meldung konnte nicht angenommen werden."
    if aus["quiz"].strip().lower() != "freifunk":
        return None, "Das stimmt nicht ganz. Tipp: Es ist ein Wort."
    if not re.fullmatch(r"[A-Za-z0-9.+%_-]{1,80}", aus["image"]):
        return None, "Es fehlt die Angabe, um welches Gerät es geht."
    if len(re.findall(r"https?://|www\.", aus["text"] + " " + aus["kontakt"], re.I)) > 2:
        return None, "Bitte höchstens zwei Links in die Meldung schreiben."
    if aus["seite"] and not aus["seite"].startswith(SEITEN):
        aus["seite"] = ""
    return aus, None


def mail(a):
    m = EmailMessage()
    m["From"] = VON
    m["To"] = AN
    m["Subject"] = "Gerätedaten-Fehler: %s%s" % (a["modell"] or a["image"],
                                                  " (%s)" % a["zeile"] if a["zeile"] else "")
    m["Date"] = formatdate(localtime=True)
    m["Message-ID"] = make_msgid(domain="ffnef.de")
    if re.fullmatch(r"[^@\s<>,;]+@[^@\s<>,;]+\.[A-Za-z]{2,}", a["kontakt"]):
        m["Reply-To"] = a["kontakt"]
    zeilen = [
        "Gerät: %s" % (a["modell"] or "-"),
        "Image: %s" % a["image"],
    ]
    if a["zeile"]:
        zeilen.append("Betrifft: %s" % a["zeile"])
    if a["seite"]:
        zeilen.append("Seite: %s" % a["seite"])
    zeilen += ["", a["text"], ""]
    if a["kontakt"]:
        zeilen.append("Kontakt (freiwillig angegeben): %s" % a["kontakt"])
    herkunft = re.match(r"https://([^/?#]+)", a["seite"])
    zeilen += ["", "Gesendet über „Fehler melden“ auf %s" % (herkunft.group(1) if herkunft else "den Gerätedaten-Seiten"),
               "Datensatz: https://github.com/Neanderfunk/geraetedaten/blob/main/daten/%s.json" % a["image"]]
    m.set_content("\n".join(zeilen))
    return m


def senden(m):
    if TROCKEN:
        print(m.as_string(), file=sys.stderr, flush=True)
        return True
    p = subprocess.run(["/usr/sbin/sendmail", "-t", "-i"], input=m.as_bytes(),
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
    if p.returncode:
        print("sendmail fehlgeschlagen (%d): %s" % (p.returncode, p.stderr.decode(errors="replace")[:300]),
              file=sys.stderr, flush=True)
    return p.returncode == 0


class Annahme(BaseHTTPRequestHandler):
    server_version = "fehlermeldung"
    sys_version = ""

    def antwort(self, code, daten):
        b = json.dumps(daten, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        self.antwort(405, {"ok": False, "fehler": "Nur POST."})

    def do_POST(self):
        if self.path.split("?")[0] != "/fehler-melden":
            return self.antwort(404, {"ok": False, "fehler": "Unbekannt."})
        laenge = int(self.headers.get("Content-Length") or 0)
        if laenge <= 0 or laenge > GROESSE:
            return self.antwort(413, {"ok": False, "fehler": "Die Meldung ist zu groß."})
        roh = self.rfile.read(laenge).decode("utf-8", "replace")
        art = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        try:
            f = json.loads(roh) if art == "application/json" else parse_qs(roh, keep_blank_values=True)
            if not isinstance(f, dict):
                raise ValueError
        except ValueError:
            return self.antwort(400, {"ok": False, "fehler": "Die Meldung ließ sich nicht lesen."})
        a, fehler = pruefen(f)
        if fehler:
            return self.antwort(400, {"ok": False, "fehler": fehler})
        ip = self.headers.get("X-Real-IP") or self.client_address[0]
        fehler = zulassen(ip)
        if fehler:
            return self.antwort(429, {"ok": False, "fehler": fehler})
        if not senden(mail(a)):
            return self.antwort(502, {"ok": False, "fehler":
                                      "Die Meldung konnte gerade nicht verschickt werden. Schreib uns bitte an projekt@neanderfunk.de."})
        print("Meldung angenommen: %s (%s)" % (a["image"], a["zeile"] or "-"), file=sys.stderr, flush=True)
        self.antwort(200, {"ok": True})

    def log_message(self, form, *args):
        pass   # keine IPs ins Log


def main():
    host, port = ADRESSE.rsplit(":", 1)
    s = ThreadingHTTPServer((host, int(port)), Annahme)
    print("fehlermeldung lauscht auf %s%s" % (ADRESSE, " (trocken)" if TROCKEN else ""), file=sys.stderr, flush=True)
    s.serve_forever()


if __name__ == "__main__":
    main()
