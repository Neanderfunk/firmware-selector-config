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

## Wie es auf den Server kommt

Ein Klon von Hand, den Rest macht das Skript. Als root auf dem
Firmware-Server:

    cd /var/www
    git clone https://github.com/Neanderfunk/firmware-selector-config.git selector-config
    sh selector-config/deploy.sh

Das Skript klont dann den Upstream daneben, aktualisiert den schon
vorhandenen Konfigurations-Klon und setzt die Symlinks. Ab da genügt für jede
Aktualisierung:

    sh /var/www/selector-config/deploy.sh

**Voraussetzungen:** `git` auf dem Server und ausgehendes HTTPS zu
`github.com`. **Zugangsdaten braucht es nicht** -- beide Repos sind
öffentlich, lesender Zugriff geht ohne Konto. Geschrieben wird von dort nie.

**Wenn der Server nicht ins Internet darf**, dann die beiden Klone woanders
anlegen (zum Beispiel auf dem Jumphost) und als Ganzes übertragen:

    rsync -a --delete selector-upstream selector-config root@server:/var/www/
    ssh root@server sh /var/www/selector-config/deploy.sh

Die `.git`-Verzeichnisse kommen dabei mit, `git pull` funktioniert also später
auch dort, sobald der Weg frei ist.

## Ausliefern: zwei Klone, der Webroot ist nur Symlinks

`deploy.sh` baut den Webroot aus **zwei Git-Klonen**:

    /var/www/selector-upstream/        Klon 1, Code (Zweig main)
    /var/www/selector-config/          Klon 2, dieses Repo
    /var/www/routersoftware.ffnef.de/  Symlinks + images/

Der Webroot enthält danach **keine Datei mehr, nur Symlinks** -- und
`images/`. Der Sinn: in beiden Klonen läuft `git pull` ohne Konflikt, weil
keine ausgelieferte Datei im Arbeitsbaum überschrieben wird. Gearbeitet wird
nur im Repo, nie im Webroot.

    sh deploy.sh                       # Vorgabe /var/www/routersoftware.ffnef.de
    sh deploy.sh /pfad/zum/webroot

Das Skript ist mehrfach aufrufbar: vorhandene Klone werden aktualisiert, die
Symlinks neu gesetzt.

**`images/` fasst das Skript bewusst nicht an** -- weder anlegen noch löschen.
Dort liegen die Firmware-Dateien beziehungsweise die Symlinks darauf. Fehlt
das Verzeichnis, warnt das Skript und macht sonst nichts.

**Voraussetzung in nginx:** `disable_symlinks` darf nicht gesetzt sein, sonst
liefert der Server 403 statt der Dateien.

## Was von uns tatsächlich abweicht -- weniger, als der Diff nahelegt

Beim Vergleich mit dem aktuellen Upstream sah es nach viel aus: 11 Zeilen in
`app.js`, 58 in `app.css`, 20 in `index.html`. **Das meiste davon ist kein
eigener Wunsch, sondern Rückstand** -- der ausgelieferte Stand ist alter
Upstream.

| Datei | Ergebnis |
| --- | --- |
| `app.js` | **gar keine eigene Änderung.** Das Label `Recovery-Image`, das wir für unsere Ergänzung hielten, steht im Upstream längst drin, nur an anderer Stelle. Übrig blieben Rückstände: uns fehlten die Dateiendung `.itb` und die Existenzprüfung auf `config.experimental_branches`. Beides gewinnen wir, indem wir Upstream nehmen. |
| `app.css` | **eine einzige Regel** ist unsere: `#currentVersions { display: none }`. Sie steht jetzt in `ffnef/ffnef.css`, einer eigenen Datei. `app.css` bleibt damit unverändert und nachziehbar -- und wir bekommen den Dark Mode, den Upstream inzwischen hat und der uns fehlte. |
| `index.html` | **zwei Textänderungen** behalten wir: der Hinweis, dass ein fehlendes Erstinstallationsimage bedeutet, dass das Upgrade-File passt, und Schritt 3 als Domain- statt Kanal-Auswahl. **Zwei Änderungen haben wir verworfen**, weil sie Verschlechterungen waren: das `alt="Logo"` am Logo war entfernt, und `<div id="typeselect">` war durch `<radiogroup>` ersetzt -- ein Element, das es in HTML nicht gibt. |
| `config.js`, `devices.js` | unsere Dateien, Upstream hat nur `config_template.js`. |

## Gerätebilder: SVG statt Fotos

Seit dem 06.10.2026 zeigt der Downloader die **Zeichnungen aus
`freifunk/device-pictures`** statt der 276 Fotos aus dem Upstream-Verzeichnis.
`deploy.sh` klont das Bildrepo als dritten Klon daneben.

Der Grund für alles-oder-nichts: `app.js` setzt Bildpfade aus **einer global**
gesetzten Endung zusammen (`preview_pictures_ext`). Mischen geht nicht. Die
Zeichnungen decken 262 unserer Namen ab statt 276, dafür stehen insgesamt 385
bereit -- Geräte, die wir später aufnehmen, haben dann schon ein Bild.

`pictures/` im Webroot ist deshalb ein **echtes Verzeichnis voller Symlinks**
und kein Symlink auf ein Verzeichnis: nur so lassen sich fremde Zeichnungen
und eigene Dateien zusammenlegen, ohne eine der Quellen anzufassen. Reihenfolge
beim Bauen: erst alle Zeichnungen, dann die Namenszuordnung, zuletzt unsere
eigenen Dateien -- die gewinnen also immer.

### Drei Sonderfälle

**Fünf Namensabweichungen** stehen in `ffnef/bilder.zuordnung` und werden als
zusätzlicher Symlink aufgelöst, ohne eine Datei zu kopieren. Zwei davon sind
reine Schreibweise: wir schreiben `gl.inet-` mit Punkt, das Bildrepo
`gl-inet-` mit Bindestrich. Drei sind Varianten-Suffixe (`-rev`, `-ti`,
`-16m`) für dasselbe Gerät.

**Die drei Raspberry Pis** haben als einzige keine Zeichnung. Sie liegen in
`ffnef/bilder/`, nachgezeichnet mit `vtracer` aus den bisherigen Fotos
(Vorlage auf 512 px vergrößert, Modus `polygon`, `color_precision 7`,
`filter_speckle 4`), rund 300 Pfade je Bild und vom Original kaum zu
unterscheiden. Zwei Wege davor sind gescheitert und sollen niemand sonst Zeit
kosten: Inkscapes Aktion `org.inkscape.color.trace` ist ein **Farbfilter** und
zeichnet gar nicht nach -- sie liefert das JPG in einer SVG-Hülle, was
täuschend echt aussieht. Und `potrace` allein kann nur schwarzweiß, aus einem
Produktfoto wird eine Silhouette.

**Der Rückfall** `no_picture_available.svg` ist im Bildrepo vorhanden. Ohne
ihn wäre die Umstellung der stille Totalausfall für jedes Gerät ohne Bild
gewesen.

### Lizenz der Bilder

`freifunk/device-pictures` steht unter **CC-BY-NC-SA 4.0** -- laut eigener
README aber *"with exceptions"*, und die Ausnahme steht **in der Datei
selbst** (`cc:License`-Tag im SVG). Pauschal auszeichnen wäre also falsch.
Geprüft für die 20 Dateien, die unsere Lücken schließen: acht tragen
ausdrücklich BY-NC-SA, neun gar kein Tag, und **drei stehen unter BY-SA 4.0**,
also ohne die NonCommercial-Klausel: `enterasys-ws-ap3715i`,
`extreme-networks-ws-ap3825i`, `zyxel-wsm20`. Die Fußzeile des Downloaders
weist beides aus.

Die neu gebaute `index.html` liegt in `ffnef/` und ist der **aktuelle
Upstream plus genau diese zwei Textänderungen**, nicht mehr die alte Datei.

## Was hier liegt

`stand-live-http/` ist eine **Momentaufnahme über HTTP**, am 06.10.2026 von
`routersoftware.ffnef.de` geladen.

**Gegengeprüft am 06.10.2026:** `devices.js` und `config.js` von der Platte
sind **byte-identisch** mit dem, was nginx ausliefert (adorfer hat beide
Dateien von der Maschine geholt). Für diese zwei ist die Momentaufnahme damit
der maßgebliche Stand und kein Behelf mehr.

**Noch nicht gegengeprüft** sind `app.js`, `app.css`, `index.html` und
`router.png` -- die liegen hier weiterhin nur in der HTTP-Fassung.

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

**`devices.js` hat im Cudy-Block den Schlüssel `TR3000` doppelt**, Zeile 81
und Zeile 90, beide Male mit demselben Wert `cudy-tr3000`. In JavaScript
gewinnt der letzte, hier also wirklich folgenlos -- aber beim nächsten
Bearbeiten ändert jemand die eine Zeile und wundert sich.

**Der Changelog-Link in `config.js` zeigt auf ein Repo, das so nicht mehr
heißt:** `github.com/Neanderfunk/firmware/...`. Das Repo heißt seit dem
27.09.2026 `FirmwareConfigs`. Der Link funktioniert heute nur, weil GitHub
nach einer Umbenennung weiterleitet (geprüft: 200 nach Redirect). Diese
Weiterleitung **fällt weg**, sobald jemand ein neues Repo namens `firmware`
anlegt. Beim nächsten Anfassen gerade ziehen.

## `images/stable`: der richtige Name, und was dafür korrigiert wurde

Auf dem Server war der Symlink in `images/` in **beidem** falsch (adorfer,
06.10.2026): er hiess `stable.2023-2-x` und zeigte auf ein
**Release-Verzeichnis**, `…/firmware/stable.2023.2.6-26091920sta/`.

Richtig ist:

    stable  ->  /var/www/download.ffnef.de/firmware/stable/

Beide Hälften haben einen Grund. Der **Name** `stable`, weil dort später die
**zusammengeführten Verzeichnisse** liegen -- die Sackgassen-Images für
4/32-Geräte im Upgrade-Baum. Und das **Ziel** `/firmware/stable/`, weil das
der feste Name auf dem Download-vhost ist: beim Release wird dort umgehängt,
und **hier ändert sich nichts** -- weder dieser Symlink noch `config.js`. Mit
dem alten, versionsbehafteten Ziel wäre jedes Release eine Handänderung auf
dem Server gewesen.

Daraus folgte eine Korrektur in `config.js`. Sie enthielt **172**
Verzeichniseinträge: jede Domäne doppelt, einmal unter `./images/stable/…`
und einmal unter `./images/stable.2023-2-x/…`. Die zweite Hälfte gehörte zum
falschen Namen und ist **entfernt**: 86 Zeilen raus, 86 bleiben, alle **43
Domänen** weiterhin vollständig vertreten, die Datei parst sauber.

Das war nicht nur Kosmetik. `app.js` lädt jedes Verzeichnis aus `directories`
und wartet, bis alle beisammen sind:

    if (directoryLoadCount == Object.keys(config.directories).length)

Vorher wartete die Seite bei **jedem** Aufruf auf 86 Fehlschläge, denn
`./images/stable/` gab es nicht (live geprüft: 404). Jetzt existiert genau der
Pfad, auf den die Einträge zeigen, und es gibt keine toten mehr.

Zu wissen, wenn die Zusammenführung kommt: `app.js` bildet die Auswahlliste
aus den **Beschriftungen**, nicht aus den Pfaden, und entfernt dabei Doppelte
(`ObjectValues(config.directories).filter(…)`). Zwei Pfade mit derselben
Beschriftung ergeben also einen Eintrag in der Oberfläche, und die Dateien
beider Pfade landen darunter zusammen -- aber jede Datei, die in beiden Bäumen
liegt, erscheint dann auch zweimal in der Liste.

## Beim Bearbeiten von `config.js`: beide Zeilen einer Domäne

Jede Domäne steht in `directories` **zweimal** -- einmal für `sysupgrade`,
einmal für `factory`:

    './images/stable/18_nefuk/sysupgrade/': 'Neanderfunk Unterkünfte',
    './images/stable/18_nefuk/factory/':    'Neanderfunk Unterkünfte',

**Die Beschriftung muss in beiden Zeilen zeichengenau gleich lauten.**
`app.js` baut die Auswahlliste aus den Beschriftungen und entfernt dabei
Doppelte -- nicht über den Pfad, sondern über den Text:

    var branches = ObjectValues(config.directories).filter(…)

Weichen die beiden Zeilen voneinander ab, erscheint die Domäne deshalb
**zweimal** in der Auswahl, und eine der beiden Hälften kennt dann nur
Upgrade- oder nur Erstinstallationsimages. Ein Tippfehler in einer Zeile ist
also kein Schönheitsfehler, sondern ein sichtbarer Doppeleintrag.

Dasselbe gilt für die Domänenkennung in der Anzeige: was in den Knöpfen in
Klammern steht, kommt aus `prettyPrintVersionRegex` und nicht aus der
Beschriftung.

## Nächste Schritte

1. ~~Maßgeblichen Stand von der Maschine übernehmen.~~ Erledigt, siehe oben.
2. ~~Unsere Änderungen auf den aktuellen Upstream setzen.~~ Erledigt: es blieb
   eine CSS-Regel und zwei Textstellen übrig.
3. Neue 2025.1-Geräte eintragen, **erst wenn die Images gebaut sind**. Fertige
   Einträge liegen in `freifunk-content`,
   `vorschlaege/firmware-selector-neue-geraete-2025.1.md` (50bbcaa), samt
   Sonderregel für den Cudy M3000 v1/v2 mit YT8821.
4. Zum Prüfen in `config.js` `listMissingImages: true` setzen: die
   Browser-Konsole zeigt dann jede Datei ohne Regel.

## Lizenz

Der Upstream steht unter **AGPL-3.0**, und `config.js` wie `devices.js` leiten
sich von dessen Vorlagen ab. Deshalb liegt die `LICENSE` hier unverändert bei.
