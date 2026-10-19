/* Geraetedaten in Schritt 1: Nach der Wahl von Geraet und Hardware-Version
   zeigt diese Datei unter dem Geraetebild, was fuer die Installation zaehlt,
   aus der Neanderfunk-Geraetedatenbank (github.com/Neanderfunk/geraetedaten).
   Den Rest und den Vergleich zeigt routerwahl.ffnef.de.

   Wie ffnef.js nur lesend: app.js bleibt unveraendert. Die Daten liegen je
   Geraet in geraete/<image>.json und werden erst geladen, wenn das Geraet
   gewaehlt ist. Level und Risiko kommen frisch aus anleitungen/index.json,
   damit sie nie hinter der Anleitung herhinken.

   Welches Image gemeint ist, ergibt sich aus devices.js (config.vendormodels):
   dort steht zu Hersteller und Modell der Image-Name, entweder als Text (dann
   haengt die Version hinten dran, z. B. cudy-wr3000 + v1) oder als Liste
   {image: Versionsbezeichnung}. */
(function () {
  'use strict';

  var VERZ = 'geraete/';
  var bestand = null;        // geraete/index.json
  var anleitungen = {};      // gluon_name -> {level, risiko, status, url}
  var cache = {};
  var zuletzt = null;

  function $(wahl, wo) { return (wo || document).querySelector(wahl); }

  function el(art, klasse, text) {
    var k = document.createElement(art);
    if (klasse) k.className = klasse;
    if (text) k.textContent = text;
    return k;
  }

  function holen(url, fertig) {
    var r = new XMLHttpRequest();
    r.open('GET', url, true);
    r.onload = function () {
      var d = null;
      if (r.status >= 200 && r.status < 300) {
        try { d = JSON.parse(r.responseText); } catch (e) { d = null; }
      }
      fertig(d);
    };
    r.onerror = function () { fertig(null); };
    r.send();
  }

  /* Hersteller + Modell + gewaehlte Version -> moegliche Image-Namen. */
  function kandidaten(vendor, model, rev) {
    var vm = (window.config && window.config.vendormodels) || {};
    var aus = [];
    var r = String(rev || '').trim().toLowerCase();
    for (var kat in vm) {
      var m = vm[kat] && vm[kat][vendor] && vm[kat][vendor][model];
      if (!m) continue;
      if (typeof m === 'string') {
        if (r) {
          aus.push(m + '-' + r);
          aus.push(m + '-' + r.split('-')[0]);      // Region abtrennen (v2-eu)
        }
        aus.push(m);
      } else {
        var schl = Object.keys(m);
        schl.forEach(function (img) {
          var bez = String(m[img] || '').trim().toLowerCase();
          if (bez === '--ignore--') return;
          if (!r || bez === r || schl.length === 1) aus.push(img);
          if (r) aus.push(img + '-' + r);
        });
      }
    }
    return aus;
  }

  function finde(vendor, model, rev) {
    if (!bestand || !bestand.geraete) return null;
    var k = kandidaten(vendor, model, rev);
    for (var i = 0; i < k.length; i++) if (bestand.geraete[k[i]]) return k[i];
    return null;
  }

  /* Texte: Content, 19.10.2026 (freifunk-content vorschlaege/
     selector-geraetedaten-texte.md). */
  var LEVEL = {
    'L0': 'Einfach hochladen', 'L0.1': 'Hochladen, richtige Datei wählen',
    'L1': 'Zwei Schritte im Browser', 'L2': 'Taste beim Einschalten',
    'L3': 'Feste Adresse am Rechner', 'L4': 'Netzwerkwerkzeuge',
    'L5': 'Besondere Programme', 'L6': 'Serielles Kabel',
    'L7': 'Gehäuse öffnen', 'L8': 'Löten und Programmer'
  };
  var STATUS = { 'erprobt': 'am Gerät erprobt', 'ungeprüft': 'noch nicht am Gerät erprobt' };
  var BOOTLOADER = 'Hier wird der Bootloader verändert. Geht dabei etwas schief, gibt es ohne ' +
                   'Flash-Programmer meist kein Zurück.';
  /* Quellen-Kuerzel sind frei vergeben; die erste passende Regel gilt. */
  var QUELLEN = [
    [/^(openwrt_forum|forum|instanton_community)/, 'Forum'],
    [/^(toh|openwrt_wiki)/, 'OpenWrt'],
    [/^(openwrt_|gh_pr_)/, 'OpenWrt-Quelltext'],
    [/^deviwiki/, 'DeviWiki'],
    [/^wikidevi/, 'WikiDevi'],
    [/^fcc/, 'FCC-Unterlagen'],
    [/^anatel/, 'Anatel'],
    [/^(hersteller|datenblatt|tplink_|avm_|dlink_|tpcdb)/, 'Hersteller'],
    [/^(haendler|markt)/, 'Händler'],
    [/^(blog|true_systems)/, 'Bericht'],
    [/^gluon/, 'Gluon'],
    [/^werkstatt/, 'eigener Test'],
    [/^anleitung/i, 'Anleitung']
  ];

  function quellName(k) {
    k = String(k || '');
    for (var i = 0; i < QUELLEN.length; i++) if (QUELLEN[i][0].test(k)) return QUELLEN[i][1];
    return 'Quelle';
  }

  function datum(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? m[3] + '.' + m[2] + '.' + m[1] : (iso || '');
  }

  function quellenZeile(belege) {
    var p = el('span', 'ffnef-geraet-quellen');
    var gesehen = {};
    var n = 0;
    var rest = 0;
    (belege || []).forEach(function (b) {
      /* Gleiche Klartextnamen nur einmal: "Hersteller Hersteller" hilft niemandem. */
      var name = quellName(b.quelle);
      if (!b.url || gesehen[b.url] || gesehen['n:' + name]) return;
      gesehen[b.url] = true;
      gesehen['n:' + name] = true;
      if (n >= 3) { rest++; return; }      /* drei reichen, der Rest steht in der Datei */
      if (n++) p.appendChild(document.createTextNode(' '));
      var a = el('a', null, quellName(b.quelle));
      a.href = b.url;
      a.rel = 'noopener';
      a.target = '_blank';
      a.title = (b.quelle || '') + (b.stand ? ', Stand ' + b.stand : '');
      p.appendChild(a);
    });
    if (rest) p.appendChild(document.createTextNode(' +' + rest));
    return n ? p : null;
  }

  function zeilen(liste, mitWeiteren) {
    var dl = el('dl', 'ffnef-geraet-liste');
    (liste || []).forEach(function (z) {
      dl.appendChild(el('dt', null, z.titel));
      var dd = el('dd');
      if (z.kennwort) {
        dd.appendChild(el('span', 'ffnef-stufe ffnef-stufe-' + z.stufe, z.kennwort + ':'));
        dd.appendChild(document.createTextNode(' '));
      }
      dd.appendChild(el('span', 'ffnef-wert', z.wert));
      if (z.erklaerung) dd.appendChild(el('span', 'ffnef-geraet-erkl', ' (' + z.erklaerung + ')'));
      if (z.warnung) dd.appendChild(el('p', 'ffnef-geraet-warnung', z.warnung));
      (z.abweichend || []).forEach(function (a) {
        var p = el('p', 'ffnef-geraet-abweichend', 'Andere Angabe: ' + a.wert + ' ');
        var q = quellenZeile(a.belege);
        if (q) p.appendChild(q);
        dd.appendChild(p);
      });
      var q = quellenZeile(z.belege);
      if (q) dd.appendChild(q);
      if (mitWeiteren && z.weitere && z.weitere.length) {
        var det = el('details', 'ffnef-geraet-weitere');
        det.appendChild(el('summary', null, 'weitere Angaben'));
        var ul = el('ul');
        z.weitere.forEach(function (a) {
          var li = el('li', null, a.wert + ' ');
          var q2 = quellenZeile(a.belege);
          if (q2) li.appendChild(q2);
          ul.appendChild(li);
        });
        det.appendChild(ul);
        dd.appendChild(det);
      }
      dl.appendChild(dd);
    });
    return dl;
  }

  /* Im Selector hat man das Geraet schon. Gezeigt wird deshalb nur, was
     beim Installieren schiefgehen kann (Content, 19.10.2026); alles andere
     steht auf routerwahl.ffnef.de. */
  function zeileMit(liste, titel) {
    for (var i = 0; i < (liste || []).length; i++) if (liste[i].titel === titel) return liste[i];
    return null;
  }

  function kasten(d) {
    var box = el('div', 'ffnef-geraet');
    box.appendChild(el('h2', null, 'Gerätedaten: ' + d.modell));
    var zeilenListe = [];

    var hw = zeileMit(d.oben, 'Hardware-Version erkennen');
    if (hw) zeilenListe.push(hw);

    var a = anleitungen[d.image];
    if (a) {
      var lv = a.level || '';
      var zeileI = {
        titel: 'Installation',
        wert: (lv ? lv + ' ' + (LEVEL[lv] || '') : '').trim() +
              (STATUS[a.status] ? ', ' + STATUS[a.status] : ''),
        belege: [{ quelle: 'anleitung', url: a.url }]
      };
      if (a.risiko === 'bootloader') zeileI.warnung = BOOTLOADER;
      zeilenListe.push(zeileI);
    }
    box.appendChild(zeilen(zeilenListe, false));

    /* Warnsaetze nur, wenn sie zutreffen */
    [zeileMit(d.oben, 'Stromversorgung'), zeileMit(d.mitte, 'Anschlüsse')].forEach(function (z) {
      if (z && z.warnung) box.appendChild(el('p', 'ffnef-geraet-warnung', z.warnung));
    });

    var sp = zeileMit(d.oben, 'Speicher für Updates');
    if (sp && sp.stufe && sp.stufe !== 'reicht' && sp.stufe !== 'reichlich') {
      var p = el('p', 'ffnef-geraet-speicher');
      p.appendChild(el('span', 'ffnef-stufe ffnef-stufe-' + sp.stufe, sp.kennwort + ':'));
      p.appendChild(document.createTextNode(' Künftige Updates passen vielleicht nicht mehr.'));
      if (sp.erklaerung) p.appendChild(el('span', 'ffnef-geraet-erkl', ' (' + sp.erklaerung + ')'));
      box.appendChild(p);
    }

    var fuss = el('p', 'ffnef-geraet-fuss');
    var rw = el('a', null, 'Alle Daten und Vergleich auf routerwahl.ffnef.de');
    rw.href = 'https://routerwahl.ffnef.de/?geraet=' + encodeURIComponent(d.image);
    fuss.appendChild(rw);
    box.appendChild(fuss);
    var liz = el('p', 'ffnef-geraet-lizenz',
      'Zusammengetragen aus öffentlichen Quellen, ohne Gewähr.' +
      (d.stand ? ' Stand: ' + datum(d.stand) + '.' : '') +
      ' Lizenz: CC BY-SA 4.0. Fehler gefunden? Schreib uns an ');
    var mail = el('a', null, 'projekt@neanderfunk.de');
    mail.href = 'mailto:projekt@neanderfunk.de?subject=' + encodeURIComponent('Gerätedaten ' + d.modell);
    liz.appendChild(mail);
    liz.appendChild(document.createTextNode('.'));
    box.appendChild(liz);
    return box;
  }

  function zeichnen() {
    var previews = $('.imagePreview');
    if (!previews) return;
    var bild = $('.preview.selected', previews);
    var select = $('#revisionselect');
    var rev = select && select.selectedIndex > 0
      ? select.options[select.selectedIndex].textContent : '';
    var img = bild ? finde(bild.getAttribute('data-vendor'), bild.getAttribute('data-model'), rev) : null;

    var alt = $('.ffnef-geraet', previews);
    if (img === zuletzt && (alt || !img)) return;
    zuletzt = img;
    if (alt) alt.parentNode.removeChild(alt);
    if (!img) return;

    var zeigen = function (d) {
      if (!d || zuletzt !== img) return;
      var noch = $('.ffnef-geraet', previews);
      if (noch) noch.parentNode.removeChild(noch);
      previews.appendChild(kasten(d));
    };
    if (cache[img]) zeigen(cache[img]);
    else holen(VERZ + img + '.json', function (d) { cache[img] = d; zeigen(d); });
  }

  function beobachten() {
    var plan = function () { window.requestAnimationFrame(zeichnen); };
    var previews = $('.imagePreview');
    if (previews) {
      /* Die Auswahl eines Geraets setzt die Klasse "selected" an einer
         Bildkachel; ffnef.js haengt seinen Versionskasten ein. Auf beides
         reagieren wir, auf unseren eigenen Kasten nicht. */
      new MutationObserver(function (aend) {
        for (var i = 0; i < aend.length; i++) {
          var t = aend[i].target;
          if (t.closest && t.closest('.ffnef-geraet')) continue;
          plan();
          return;
        }
      }).observe(previews, { childList: true, subtree: true, attributes: true,
                             attributeFilter: ['class'] });
    }
    var select = $('#revisionselect');
    if (select) select.addEventListener('change', plan);
    plan();
  }

  function los() {
    holen(VERZ + 'index.json', function (d) {
      bestand = d;
      if (!bestand) return;          // ohne Daten bleibt der Selector wie er war
      holen('anleitungen/index.json', function (liste) {
        (liste || []).forEach(function (e) { anleitungen[e.gluon_name] = e; });
        beobachten();
      });
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { kandidaten: kandidaten };
    return;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', los);
  } else {
    los();
  }
})();
