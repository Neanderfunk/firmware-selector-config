/* Prueft die Textlogik von ffnef/ffnef.js gegen die echten Daten aus
   ffnef/versionen-anzeige.json, ohne Browser.

   Was hier NICHT geprueft wird: Darstellung, CSS, und ob die Vorauswahl der
   einzigen Version im Browser wirklich greift. Das geht nur am laufenden
   Server. Geprueft wird die Rechnung dahinter, und das ist der Teil, der
   stillschweigend falsch sein kann.

   Aufruf:  node werkzeug/ffnef-js-pruefen.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const wurzel = path.dirname(__dirname);

const ffnef = require(path.join(wurzel, 'ffnef', 'ffnef.js'));
const daten = JSON.parse(fs.readFileSync(
  path.join(wurzel, 'ffnef', 'versionen-anzeige.json'), 'utf8')).geraete;

let fehler = 0;
function pruefe(was, ist, soll) {
  const gleich = JSON.stringify(ist) === JSON.stringify(soll);
  if (!gleich) fehler++;
  console.log('  %s %s\n      ist:  %s\n      soll: %s',
    gleich ? 'ok    ' : 'FEHLER', was, JSON.stringify(ist), JSON.stringify(soll));
}

console.log('Faelle:');

// Nur eine Version, nichts weiter bekannt: kein Kasten.
pruefe('unbekanntes Geraet, eine Version -> kein Kasten',
  ffnef.aussagen(null, ['v1'], 'v1'), null);

// Wir bieten v1, es gibt belegt auch v2: Kasten mit Beleg.
const wr3000 = ffnef.aussagen(daten['Cudy|WR3000'], ['v1'], 'v1');
pruefe('Cudy WR3000: nicht fuer v2', wr3000 && wr3000.andere, ['v2']);
pruefe('Cudy WR3000: Beleg vorhanden', !!(wr3000 && wr3000.belege.length), true);
// Der schlichte WR3000 steht NICHT in der Flashchip-Warnliste, der WR3000 E
// schon. Das ist der Datenstand, nicht unbedingt die Wahrheit: die Liste
// nennt cudy-ap3000-wall und cudy-wr3000p, die wir gar nicht anbieten, und
// laesst cudy-wr3000 und cudy-tr3000-256mb aus, die wir anbieten. Siehe
// ffnef/versionen-handpflege.json.
pruefe('Cudy WR3000: keine Flashchip-Warnung (so steht es in der Liste)',
  !!(wr3000 && wr3000.warnungen.length), false);

// WR3000 E: OpenWrt kennt v1 gar nicht als Variante, die Handliste nur v2.
const wr3000e = ffnef.aussagen(daten['Cudy|WR3000 E'], ['v1'], 'v1');
pruefe('Cudy WR3000 E: nicht fuer v2', wr3000e && wr3000e.andere, ['v2']);
// Die Flashchip-Warnung ist am 08.10.2026 entfernt worden: Sie sagte nur,
// man solle der Anleitung folgen. Siehe zweck in versionen-handpflege.json.
pruefe('Cudy WR3000 E: keine Flashchip-Warnung mehr',
  !!(wr3000e && wr3000e.warnungen.length), false);

// Mehrere eigene Versionen: die uebrigen eigenen gehoeren mit in die Liste.
const c7 = ffnef.aussagen(daten['TP-Link|Archer C7'], ['v2', 'v4'], 'v2');
pruefe('Archer C7, v2 gewaehlt', c7 && c7.andere, ['v1', 'v4', 'v5']);

// Dieselbe Rechnung mit der anderen Auswahl.
const c7b = ffnef.aussagen(daten['TP-Link|Archer C7'], ['v2', 'v4'], 'v4');
pruefe('Archer C7, v4 gewaehlt', c7b && c7b.andere, ['v1', 'v2', 'v5']);

// v10 gehoert hinter v9, nicht zwischen v1 und v2.
pruefe('Sortierung zaehlt die Zahl, nicht den Text',
  ffnef.nachVersion(['v10', 'v2', 'v1', 'c1/c2', 'v9']),
  ['v1', 'v2', 'v9', 'v10', 'c1/c2']);

// Gross- und Kleinschreibung darf keinen Unterschied machen.
pruefe('V1 und v1 sind dasselbe',
  ffnef.aussagen({ bekannt: ['v1'] }, ['V1'], 'V1'), null);

pruefe('Aufzaehlung mit drei Gliedern',
  ffnef.aufzaehlung(['v1', 'v3', 'v4']), 'v1, v3 und v4');
pruefe('Aufzaehlung mit einem Glied', ffnef.aufzaehlung(['v2']), 'v2');

// Ueberblick ueber den ganzen Bestand: wie viele Geraete bekommen ueberhaupt
// einen Kasten, wenn wir annehmen, dass wir genau die erste bekannte Version
// anbieten? Das ist keine Zusicherung, sondern eine Hausnummer.
let mitKasten = 0;
for (const k of Object.keys(daten)) {
  const e = daten[k];
  const unsere = e.bekannt.length ? [e.bekannt[0]] : ['v1'];
  if (ffnef.aussagen(e, unsere, unsere[0])) mitKasten++;
}
console.log('\nGeraete in versionen-anzeige.json: %d, davon mit Kasten: %d',
  Object.keys(daten).length, mitKasten);

console.log(fehler ? `\n${fehler} Fehler` : '\nalles gruen');
process.exit(fehler ? 1 : 0);
