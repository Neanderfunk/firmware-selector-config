# Fehler melden

Unter den Gerätedaten (routersoftware.neanderfunk.de und router.neanderfunk.de) steht
ein Knopf „Fehler melden“ (`ffnef/fehler-melden.js`). Er schickt die Meldung
per POST an `/fehler-melden` derselben Seite. Dort nimmt sie
`fehlermeldung.py` an und verschickt eine Mail an projekt@neanderfunk.de über
den lokalen Mailer (`/usr/sbin/sendmail`, auf dem Firmware-Server nullmailer).

- Kein E-Mail-Pflichtfeld, Kontakt nur freiwillig (wird `Reply-To`, wenn es
  eine Adresse ist).
- Spamschutz wie beim Störungsformular auf neanderfunk.de: Quizfrage
  „Wie heißt das offene WLAN unserer Router?“ (Antwort „Freifunk“), dazu ein
  verstecktes Feld, kurze Felder, höchstens zwei Links, höchstens 5 Meldungen
  je IP und Stunde und 40 je Tag. IP-Adressen nur im Arbeitsspeicher.
- Nur Python-Standardbibliothek.

## Einrichtung auf dem Firmware-Server

Macht seit 07.11.2026 `deploy.sh` bei jedem Lauf (Abschnitt „Dienst Fehler
melden“, abschaltbar mit `DIENST=`): Zeiger nach `/etc/sysusers.d/` und
`/etc/systemd/system/`, `systemd-sysusers`, `systemctl daemon-reload`,
`enable` und `restart`. Die nginx-Einbindung steht in den vhosts unter
`dienst/nginx/`, die `deploy.sh` ebenfalls setzt und neu lädt.

Prüfen: `curl -s -X POST https://router.neanderfunk.de/fehler-melden -d 'image=x&text=y&quiz=falsch'`
muss `{"ok": false, "fehler": "Das stimmt nicht ganz. Tipp: Es ist ein Wort."}` liefern.

Testen ohne Mail: `FEHLERMELDUNG_TROCKEN=1 FEHLERMELDUNG_ADRESSE=127.0.0.1:18471 python3 -I dienst/fehlermeldung.py`
gibt die Mail auf stderr aus.

Nach Änderungen an `fehlermeldung.py` genügt `deploy.sh`, es startet den
Dienst neu.

Startet der Dienst mit `status=217/USER` nicht, fehlt der Benutzer
`fehlermeldung` (sysusers nicht gelaufen; `deploy.sh` holt das inzwischen
selbst nach). So war es
nach 5613098 bis 07.11.2026, „Fehler melden“ gab bis dahin 502.
