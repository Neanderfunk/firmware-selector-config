# Firmware-Selector: unsere Konfiguration

Die lokale Konfiguration des Community-Downloaders
**https://routersoftware.ffnef.de** (gluon-firmware-selector).

Der Upstream-Code liegt getrennt davon in
[Neanderfunk/gluon-firmware-selector](https://github.com/Neanderfunk/gluon-firmware-selector),
dort steht der Zweig `main` seit dem 06.10.2026 auf dem aktuellen Upstream.
Diese Trennung ist der Zweck der beiden Repos: Upstream bleibt unberührt und
nachziehbar, unsere Anpassungen leben hier.

## Warum es dieses Repo gibt

**Der ausgelieferte Stand lag in keinem Zweig irgendeines Repos.** Jede
Änderung am Server war damit unwiederbringlich. Das war der dringende Teil
einer Übergabe der Content-Session vom 01.10.2026 und ist mit dem ersten
Commit hier erledigt.

## Was hier liegt

`stand-live-http/` ist eine **Momentaufnahme über HTTP**, am 06.10.2026 von
`routersoftware.ffnef.de` geladen. Sie ist ein Sicherungsnetz, **nicht** die
Wahrheit: ausgeliefert wird, was nginx zeigt, und das kann vom Stand auf der
Platte abweichen. Der maßgebliche Stand wird nachgereicht und kommt als
eigener Commit; der Unterschied zwischen beiden ist dann selbst ein Befund.

| Datei | Last-Modified am Server | gegenüber Upstream |
| --- | --- | --- |
| `config.js` | 22.09.2026 15:43 | eigene Datei, Upstream hat nur `config_template.js` |
| `devices.js` | 19.12.2025 23:24 | 204 geänderte Zeilen |
| `app.js` | | 11 geänderte Zeilen |
| `app.css` | | 58 geänderte Zeilen |
| `index.html` | | 20 geänderte Zeilen |
| `router.png` | | binär abweichend |

## Was dabei aufgefallen ist

**`app.js` ist nicht nur angepasst, sondern teilweise veraltet.** Einige
Unterschiede sind unsere Eingriffe (ein Label `Recovery-Image`, die Reihenfolge
im Dateinamen-Muster, ein fest verdrahteter Pfad für das Ersatzbild), andere
sind Upstream-Verbesserungen, die uns **fehlen**: Upstream kennt inzwischen die
Dateiendung `.itb` und prüft `config.experimental_branches` auf Existenz, bevor
er darauf zugreift. Beim Zusammenführen ist das die eigentliche Arbeit --
unsere Änderungen einzeln auf den neuen Upstream setzen, statt die alte Datei
weiterzuschleppen.

**`devices.js` hat im Cudy-Block den Schlüssel `TR3000` doppelt.** In
JavaScript gewinnt der letzte, also folgenlos, aber unsauber.

## Nächste Schritte

1. Maßgeblichen Stand von der Maschine übernehmen (kommt nachgereicht).
2. Unsere Änderungen als **einzelne** Commits auf den aktuellen Upstream
   setzen, nicht die alte Datei kopieren.
3. Neue 2025.1-Geräte eintragen, **erst wenn die Images gebaut sind**. Fertige
   Einträge liegen in `freifunk-content`,
   `vorschlaege/firmware-selector-neue-geraete-2025.1.md` (50bbcaa), samt
   Sonderregel für den Cudy M3000 v1/v2 mit YT8821.
4. Zum Prüfen in `config.js` `listMissingImages: true` setzen: die
   Browser-Konsole zeigt dann jede Datei ohne Regel.

## Lizenz

Der Upstream steht unter **AGPL-3.0**, und `config.js` wie `devices.js` leiten
sich von dessen Vorlagen ab. Deshalb liegt die `LICENSE` hier unverändert bei.
