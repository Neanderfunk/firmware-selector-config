/* Geraetedaten in Schritt 1: Nach der Wahl von Geraet und Hardware-Version
   zeigt diese Datei unter dem Geraetebild die wichtigsten Daten aus der
   Neanderfunk-Geraetedatenbank (github.com/Neanderfunk/geraetedaten).

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

  function quellenZeile(belege) {
    var p = el('span', 'ffnef-geraet-quellen');
    var gesehen = {};
    var n = 0;
    var rest = 0;
    (belege || []).forEach(function (b) {
      if (!b.url || gesehen[b.url]) return;
      gesehen[b.url] = true;
      if (n >= 3) { rest++; return; }      /* drei reichen, der Rest steht in der Datei */
      if (n++) p.appendChild(document.createTextNode(' '));
      var a = el('a', null, b.quelle || 'Quelle');
      a.href = b.url;
      a.rel = 'noopener';
      a.target = '_blank';
      if (b.stand) a.title = 'Stand: ' + b.stand;
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
      var w = el('span', z.stufe ? 'ffnef-stufe ffnef-stufe-' + z.stufe : 'ffnef-wert', z.wert);
      dd.appendChild(w);
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

  function kasten(d) {
    var box = el('div', 'ffnef-geraet');
    box.appendChild(el('h2', null, 'Gerätedaten: ' + d.modell));

    var oben = (d.oben || []).slice();
    var a = anleitungen[d.image];
    if (a) {
      oben = oben.filter(function (z) { return z.titel !== 'Installation'; });
      oben.splice(1, 0, {
        titel: 'Installation',
        wert: 'Level ' + (a.level || '?') + ', Risiko ' + (a.risiko || '?') +
              (a.status ? ', ' + a.status : ''),
        belege: [{ quelle: 'Anleitung', url: a.url }]
      });
    }
    box.appendChild(zeilen(oben, false));
    if (d.mitte && d.mitte.length) box.appendChild(zeilen(d.mitte, false));

    if (d.technik && d.technik.length) {
      var det = el('details', 'ffnef-geraet-technik');
      det.appendChild(el('summary', null, 'Technische Daten'));
      det.appendChild(zeilen(d.technik, true));
      box.appendChild(det);
    }

    var fuss = el('p', 'ffnef-geraet-fuss');
    (d.links || []).forEach(function (l, i) {
      if (i) fuss.appendChild(document.createTextNode(' · '));
      var x = el('a', null, l.name);
      x.href = l.url;
      x.rel = 'noopener';
      x.target = '_blank';
      fuss.appendChild(x);
    });
    box.appendChild(fuss);
    box.appendChild(el('p', 'ffnef-geraet-lizenz',
      'Zusammengetragen aus öffentlichen Quellen, ohne Gewähr' +
      (d.stand ? ', Stand ' + d.stand : '') + '. Lizenz CC BY-SA 4.0.'));
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
