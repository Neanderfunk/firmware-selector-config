/* Eigene Ergaenzungen zum Upstream-app.js. Bewusst eine eigene Datei und
   bewusst nur lesend: app.js bleibt unveraendert und laesst sich damit ohne
   Konflikt nachziehen. Genau wie ffnef.css.

   Zwei Dinge tut diese Datei:

   1. Hat ein Geraet nur eine Hardware-Version, waehlt sie die von selbst aus.
      Vorher musste man sie trotzdem aus einem Auswahlfeld mit genau einem
      Eintrag heraussuchen, was niemandem half.

   2. Sie schreibt neben das Geraetebild, fuer welche Version die Firmware
      gilt und fuer welche nicht.

   Woher die Angaben kommen: welche Versionen WIR anbieten, steht im
   Auswahlfeld, das app.js aus den Dateinamen der Images fuellt. Das ist die
   genaueste Quelle, die es gibt, und sie ist immer aktuell. Welche Versionen
   es darueber hinaus in der Welt gibt, steht in versionen-anzeige.json, die
   werkzeug/versionen-anzeige.py aus dem OpenWrt-Verzeichnis und aus unserer
   Handliste erzeugt. */
(function () {
  'use strict';

  var DATEI = 'versionen-anzeige.json';
  var daten = null;
  var zuletztVersucht = null;

  function $(wahl, wo) { return (wo || document).querySelector(wahl); }

  function gleich(a, b) {
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }

  function enthaelt(liste, wert) {
    for (var i = 0; i < liste.length; i++) if (gleich(liste[i], wert)) return true;
    return false;
  }

  function aufzaehlung(liste) {
    if (liste.length === 1) return liste[0];
    return liste.slice(0, -1).join(', ') + ' und ' + liste[liste.length - 1];
  }

  function el(art, klasse, text) {
    var k = document.createElement(art);
    if (klasse) k.className = klasse;
    if (text) k.textContent = text;
    return k;
  }

  /* Was im Auswahlfeld steht: der erste Eintrag ist die Aufforderung
     ("-- Bitte Hardwarerevision waehlen --"), danach kommen die Versionen.
     Der sichtbare Text ist die Version, der value eine Suchanfrage. */
  function ausAuswahl(select) {
    var alle = [];
    for (var i = 1; i < select.options.length; i++) {
      alle.push(select.options[i].textContent);
    }
    return {
      alle: alle,
      gewaehlt: select.selectedIndex > 0
        ? select.options[select.selectedIndex].textContent : null
    };
  }

  /* Gibt es nur eine Version, waehlen wir sie selbst aus. Der Merker
     verhindert eine Schleife, falls die Auswahl wider Erwarten nicht
     greift: dann bleibt es bei einem Versuch je Geraet. */
  function einzigeVersionWaehlen(select) {
    if (select.options.length !== 2 || select.selectedIndex > 0) return false;
    var ziel = select.options[1].value;
    if (zuletztVersucht === ziel) return false;
    zuletztVersucht = ziel;
    firmwarewizard.setSearchQuery(ziel);
    return true;
  }

  function quelle(url) {
    var a = el('a', null, 'Quelle');
    a.href = url;
    a.rel = 'noopener';
    a.target = '_blank';
    return a;
  }

  function hinweisBlock(h) {
    var block = el('div', 'ffnef-beleg');
    if (h.erkennbar_an) {
      block.appendChild(el('p', 'ffnef-erkennbar',
        'Woran du deine Version erkennst: ' + h.erkennbar_an));
    }
    if (h.grund) block.appendChild(el('p', 'ffnef-grund', h.grund));
    if (h.quelle) {
      var p = el('p', 'ffnef-quelle');
      p.appendChild(quelle(h.quelle));
      block.appendChild(p);
    }
    return block;
  }

  /* Die reine Rechnung, ohne DOM: was gilt, was gilt nicht, was ist zu
     beachten. Getrennt gehalten, damit sie sich ohne Browser pruefen laesst;
     werkzeug/ffnef-js-pruefen.js tut genau das. */
  function aussagen(e, unsere, gewaehlt) {
    var bekannt = (e && e.bekannt) || [];

    /* Alles, was nicht die gewaehlte Version ist: unsere uebrigen Versionen
       und die, die wir gar nicht anbieten. */
    var andere = [];
    unsere.forEach(function (v) {
      if (gewaehlt && !gleich(v, gewaehlt) && !enthaelt(andere, v)) andere.push(v);
    });
    bekannt.forEach(function (v) {
      if (!enthaelt(unsere, v) && !enthaelt(andere, v)) andere.push(v);
    });
    ((e && e.nicht_unterstuetzt) || []).forEach(function (v) {
      if (!enthaelt(unsere, v) && !enthaelt(andere, v)) andere.push(v);
    });

    var belege = ((e && e.belege) || []).filter(function (b) {
      return b.nicht_unterstuetzt && b.nicht_unterstuetzt.length;
    });
    var warnungen = (e && e.warnungen) || [];

    /* Eine Version, nichts weiter bekannt, keine Warnung: dann gibt es nichts
       zu sagen, und ein Kasten mit einer Selbstverstaendlichkeit darin waere
       nur Laerm. */
    if (andere.length === 0 && belege.length === 0 && warnungen.length === 0) {
      return null;
    }
    return { gewaehlt: gewaehlt, andere: andere, belege: belege, warnungen: warnungen };
  }

  function kasten(vendor, model, unsere, gewaehlt) {
    var e = daten && daten.geraete ? daten.geraete[vendor + '|' + model] : null;
    var a = aussagen(e, unsere, gewaehlt);
    if (!a) return null;
    var andere = a.andere, belege = a.belege, warnungen = a.warnungen;

    var box = el('div', 'ffnef-versionen');
    box.appendChild(el('h2', null, 'Hardware-Version'));

    if (gewaehlt) {
      box.appendChild(el('p', 'ffnef-gilt', 'Diese Firmware ist für ' + gewaehlt + '.'));
    }
    if (andere.length) {
      box.appendChild(el('p', 'ffnef-gilt-nicht',
        'Nicht für ' + aufzaehlung(andere) + '.'));
    }

    belege.forEach(function (b) {
      var t = el('p', 'ffnef-belegt',
        aufzaehlung(b.nicht_unterstuetzt) + ' wird nicht unterstützt.');
      box.appendChild(t);
      box.appendChild(hinweisBlock(b));
    });

    if (warnungen.length) {
      box.appendChild(el('h2', null, 'Außerdem zu beachten'));
      warnungen.forEach(function (w) { box.appendChild(hinweisBlock(w)); });
    }
    return box;
  }

  function neuZeichnen() {
    var select = $('#revisionselect');
    var previews = $('.imagePreview');
    if (!select || !previews) return;

    var alt = $('.ffnef-versionen', previews);
    if (alt) alt.parentNode.removeChild(alt);

    var gewaehltesBild = $('.preview.selected', previews);
    if (!gewaehltesBild) return;

    if (einzigeVersionWaehlen(select)) return;   // zeichnet gleich erneut

    var stand = ausAuswahl(select);
    if (!stand.gewaehlt) return;                 // noch nichts ausgewaehlt

    var box = kasten(gewaehltesBild.getAttribute('data-vendor'),
                     gewaehltesBild.getAttribute('data-model'),
                     stand.alle, stand.gewaehlt);
    if (box) previews.appendChild(box);
  }

  function beobachten() {
    var select = $('#revisionselect');
    if (!select) return;
    /* app.js baut das Auswahlfeld bei jeder Aenderung neu auf. Das ist
       deshalb ein zuverlaessiges Zeichen dafuer, dass sich etwas getan hat,
       und wir muessen nicht den halben Baum beobachten. */
    new MutationObserver(function () {
      window.requestAnimationFrame(neuZeichnen);
    }).observe(select, { childList: true });
    select.addEventListener('change', function () {
      zuletztVersucht = null;
      window.requestAnimationFrame(neuZeichnen);
    });
    neuZeichnen();
  }

  function los() {
    var anfrage = new XMLHttpRequest();
    anfrage.open('GET', DATEI, true);
    anfrage.onload = function () {
      if (anfrage.status >= 200 && anfrage.status < 300) {
        try { daten = JSON.parse(anfrage.responseText); } catch (e) { daten = null; }
      }
      beobachten();
    };
    /* Faellt die Datei aus, bleibt wenigstens die Vorauswahl der einzigen
       Version erhalten. Besser als eine Seite, die gar nichts mehr tut. */
    anfrage.onerror = beobachten;
    anfrage.send();
  }

  /* Nur fuer die Pruefung ohne Browser. Im Browser gibt es kein module. */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { aussagen: aussagen, aufzaehlung: aufzaehlung };
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', los);
  } else {
    los();
  }
})();
