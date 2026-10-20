# Fehler melden

Unter den Gerätedaten (routersoftware.ffnef.de und routerwahl.ffnef.de) steht
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

## Einrichtung auf dem Firmware-Server (einmalig, als root)

1. Benutzer anlegen, Dienst eintragen und starten:
   `ln -s /var/www/selector-config/dienst/fehlermeldung.sysusers /etc/sysusers.d/fehlermeldung.conf`
   und `systemd-sysusers`, dann
   `ln -s /var/www/selector-config/dienst/fehlermeldung.service /etc/systemd/system/`,
   dann `systemctl daemon-reload` und `systemctl enable --now fehlermeldung`.
2. In die server-Blöcke von routerwahl.ffnef.de und routersoftware.ffnef.de
   `include /var/www/selector-config/dienst/fehlermeldung-nginx.conf;`
   eintragen, `nginx -t`, `systemctl reload nginx`.
3. Prüfen: `curl -s -X POST https://routerwahl.ffnef.de/fehler-melden -d 'image=x&text=y&quiz=falsch'`
   muss `{"ok": false, "fehler": "Das stimmt nicht ganz. Tipp: Es ist ein Wort."}` liefern.

Testen ohne Mail: `FEHLERMELDUNG_TROCKEN=1 FEHLERMELDUNG_ADRESSE=127.0.0.1:18471 python3 -I dienst/fehlermeldung.py`
gibt die Mail auf stderr aus.

Nach Änderungen an `fehlermeldung.py`: `deploy.sh` wie gewohnt, dann
`systemctl restart fehlermeldung`.
