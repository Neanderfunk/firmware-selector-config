/* Geraetesuche (finder.html): Merkmale anklicken wie bei einer
   Preissuchmaschine, die Liste zeigt die passenden Geraete.

   Daten: geraete/facetten.json aus Neanderfunk/geraetedaten
   (werkzeug/selector-ansicht.py), Level/Risiko/Status frisch aus
   anleitungen/index.json, Hersteller/Modell/Version fuer den Link in den
   Selector aus devices.js (config.vendormodels).

   Regeln: Innerhalb einer Gruppe gilt "oder" (Wand oder Decke), zwischen
   Gruppen "und". Bei "mindestens"-Gruppen ist genau eine Stufe waehlbar.
   Ein Geraet ohne Angabe zu einem gewaehlten Merkmal faellt heraus, ausser
   "auch Geraete mit fehlenden Angaben zeigen" ist an; dann bleibt es drin
   und traegt den Hinweis, was fehlt. */
(function () {
  'use strict';

  var SEP = '⁣';
  var LEVEL_REIHE = ['L0', 'L0.1', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'];
  var LEVEL = {
    'L0': 'Einfach hochladen', 'L0.1': 'Hochladen, richtige Datei wählen',
    'L1': 'Zwei Schritte im Browser', 'L2': 'Taste beim Einschalten',
    'L3': 'Feste Adresse am Rechner', 'L4': 'Netzwerkwerkzeuge',
    'L5': 'Besondere Programme', 'L6': 'Serielles Kabel',
    'L7': 'Gehäuse öffnen', 'L8': 'Löten und Programmer'
  };

  /* typ: menge = Wert ist eine Liste, Treffer wenn eine gewaehlte drin ist;
          eins  = Wert ist ein Text, Treffer wenn er gewaehlt ist;
          alle  = jede gewaehlte Option muss in der Liste sein;
          min/max = Zahl, genau eine Stufe;
          ja/nein = Schalter. */
  var GRUPPEN = [
    { titel: 'Einsatz', filter: [
      { id: 'einsatz', titel: 'Einsatzort', typ: 'menge', werte: [['innen', 'innen'], ['außen', 'außen']] },
      { id: 'montage', titel: 'Montage', typ: 'menge',
        werte: [['Tisch', 'Tisch'], ['Wand', 'Wand'], ['Decke', 'Decke'], ['Mast', 'Mast']] },
      { id: 'ip', titel: 'Schutzart', typ: 'min', werte: [['54', 'ab IP54'], ['65', 'ab IP65']] }
    ] },
    { titel: 'Strom', filter: [
      { id: 'poe', titel: 'PoE-Eingang', typ: 'menge',
        werte: [['af', '802.3af'], ['at', '802.3at'], ['bt', '802.3bt'], ['passiv', 'passives PoE'], ['nein', 'kein PoE']] },
      { id: 'netzteil', titel: 'Netzteil liegt bei', typ: 'ja' }
    ] },
    { titel: 'WLAN', filter: [
      { id: 'wlan', titel: 'Generation', typ: 'min',
        werte: [['4', 'ab WLAN 4'], ['5', 'ab WLAN 5'], ['6', 'ab WLAN 6'], ['7', 'ab WLAN 7']] },
      { id: 'baender', titel: 'Bänder', typ: 'alle', werte: [['2.4', '2.4 GHz'], ['5', '5 GHz'], ['6', '6 GHz']] },
      { id: 'streams', titel: 'Streams', typ: 'min', werte: [['2', 'ab 2×2'], ['3', 'ab 3×3'], ['4', 'ab 4×4']] },
      { id: 'antennen', titel: 'Antennen', typ: 'eins',
        werte: [['intern', 'intern'], ['extern', 'extern, fest'], ['abnehmbar', 'abnehmbar']] }
    ] },
    { titel: 'Anschlüsse', filter: [
      { id: 'port_mbit', titel: 'Netzwerk', typ: 'min', werte: [['1000', 'ab 1 Gbit/s'], ['2500', 'ab 2.5 Gbit/s']] },
      { id: 'ports', titel: 'Netzwerkbuchsen', typ: 'min', werte: [['2', 'ab 2'], ['4', 'ab 4']] },
      { id: 'usb', titel: 'USB', typ: 'ja' },
      { id: 'sfp', titel: 'SFP', typ: 'ja' }
    ] },
    { titel: 'Leistung', filter: [
      { id: 'ram', titel: 'RAM', typ: 'min', werte: [['128', 'ab 128 MB'], ['256', 'ab 256 MB'], ['512', 'ab 512 MB']] },
      { id: 'flash', titel: 'Flash', typ: 'min', werte: [['16', 'ab 16 MB'], ['128', 'ab 128 MB']] },
      { id: 'speicher', titel: 'Speicher für Updates', typ: 'eins',
        werte: [['reicht', 'reicht'], ['knapp', 'knapp'], ['zu wenig', 'zu wenig']] },
      { id: 'kerne', titel: 'Prozessor', typ: 'min', werte: [['2', 'ab 2 Kerne'], ['4', 'ab 4 Kerne']] },
      { id: 'leistung', titel: 'Leistungsaufnahme', typ: 'max', werte: [['10', 'bis 10 W'], ['15', 'bis 15 W']] },
      { id: 'luefter', titel: 'ohne Lüfter', typ: 'nein' }
    ] },
    { titel: 'Installation', filter: [
      { id: 'level', titel: 'Schwierigkeit', typ: 'max',
        werte: [['L1', 'bis L1 (im Browser)'], ['L3', 'bis L3 (feste Adresse)'], ['L6', 'bis L6 (serielles Kabel)']] },
      { id: 'erprobt', titel: 'am Gerät erprobt', typ: 'ja' },
      { id: 'ohne_bootloader', titel: 'ohne Bootloader-Risiko', typ: 'ja' }
    ] }
  ];
  var ALLE = [];
  GRUPPEN.forEach(function (g) { g.filter.forEach(function (f) { ALLE.push(f); }); });

  var geraete = [];      // [{image, modell, ...facetten, level, ...}]
  var wahl = {};         // id -> [werte]
  var mitUnbekannt = false;
  var sortierung = 'einfach';

  function $(w, wo) { return (wo || document).querySelector(w); }
  function el(art, klasse, text) {
    var k = document.createElement(art);
    if (klasse) k.className = klasse;
    if (text !== undefined && text !== null) k.textContent = text;
    return k;
  }

  function holen(url, fertig) {
    var r = new XMLHttpRequest();
    r.open('GET', url, true);
    r.onload = function () {
      var d = null;
      if (r.status >= 200 && r.status < 300) { try { d = JSON.parse(r.responseText); } catch (e) { d = null; } }
      fertig(d);
    };
    r.onerror = function () { fertig(null); };
    r.send();
  }

  /* Image-Name -> Hersteller, Modell, Version fuer ?q= im Selector. */
  function selectorOrt(image) {
    var vm = (window.config && window.config.vendormodels) || {};
    for (var kat in vm) for (var v in vm[kat]) for (var m in vm[kat][v]) {
      var x = vm[kat][v][m];
      if (typeof x === 'string') {
        if (image === x) return { vendor: v, model: m, rev: '', basis: x };
        if (image.indexOf(x + '-') === 0) return { vendor: v, model: m, rev: image.slice(x.length + 1), basis: x };
      } else {
        for (var img in x) {
          if (image === img) return { vendor: v, model: m, rev: x[img] || '', basis: img };
          if (image.indexOf(img + '-') === 0) return { vendor: v, model: m, rev: image.slice(img.length + 1), basis: img };
        }
      }
    }
    return null;
  }

  function q(o) {
    var t = function (s) { return String(s).replace(/ /g, ' '); };
    return '?q=' + encodeURIComponent(t(o.vendor) + SEP + t(o.model) + SEP + (o.rev ? t(o.rev) + SEP : ''));
  }

  /* Trifft Geraet g den Filter f mit den gewaehlten Werten w?
     Rueckgabe: true, false oder null (Angabe fehlt). */
  function trifft(g, f, w) {
    if (!w || !w.length) return true;
    var v = g[f.id];
    if (f.id === 'erprobt') return g.status ? g.status === 'erprobt' : null;
    if (f.id === 'ohne_bootloader') return g.risiko ? g.risiko !== 'bootloader' : null;
    if (f.id === 'level') {
      if (!g.level) return null;
      return LEVEL_REIHE.indexOf(g.level) <= LEVEL_REIHE.indexOf(w[0]);
    }
    if (v === null || v === undefined) return null;
    switch (f.typ) {
      case 'menge': return w.some(function (x) { return v.indexOf(x) > -1; });
      case 'alle': return w.every(function (x) { return v.indexOf(x) > -1; });
      case 'eins': return w.indexOf(v) > -1;
      case 'min':
        if (f.id === 'ip') return v[0] >= +w[0].charAt(0) && v[1] >= +w[0].charAt(1);
        return v >= +w[0];
      case 'max': return v <= +w[0];
      case 'ja': return v === true;
      case 'nein': return v === false;
    }
    return true;
  }

  /* Alle Filter ausser "ohne" anwenden; Rueckgabe: Geraete mit Liste fehlender Angaben. */
  function filtern(ohne, ersatz) {
    var aus = [];
    geraete.forEach(function (g) {
      var fehlt = [];
      for (var i = 0; i < ALLE.length; i++) {
        var f = ALLE[i];
        var w = (ohne && f.id === ohne) ? ersatz : wahl[f.id];
        var r = trifft(g, f, w);
        if (r === false) return;
        if (r === null) {
          if (!mitUnbekannt) return;
          fehlt.push(f.titel);
        }
      }
      aus.push({ g: g, fehlt: fehlt });
    });
    return aus;
  }

  function zaehle(f, wert) {
    var w;
    if (f.typ === 'menge' || f.typ === 'eins') w = [wert];
    else if (f.typ === 'alle') w = (wahl[f.id] || []).concat([wert]);
    else if (f.typ === 'ja' || f.typ === 'nein') w = [true];
    else w = [wert];
    return filtern(f.id, w).length;
  }

  function filterZeichnen() {
    var ziel = $('#finder-filter');
    ziel.textContent = '';
    GRUPPEN.forEach(function (gr) {
      var fs = el('fieldset', 'finder-gruppe');
      fs.appendChild(el('legend', null, gr.titel));
      gr.filter.forEach(function (f) {
        var block = el('div', 'finder-block');
        var bekannt = geraete.filter(function (g) {
          if (f.id === 'erprobt' || f.id === 'level') return !!g.level || !!g.status;
          if (f.id === 'ohne_bootloader') return !!g.risiko;
          return g[f.id] !== null && g[f.id] !== undefined;
        }).length;
        var kopf = el('div', 'finder-titel', f.titel);
        kopf.appendChild(el('span', 'finder-abdeckung', ' Angaben für ' + bekannt + ' von ' + geraete.length));
        block.appendChild(kopf);
        var gewaehlt = wahl[f.id] || [];
        if (f.typ === 'ja' || f.typ === 'nein') {
          block.appendChild(option(f, 'checkbox', true, 'ja', gewaehlt.length > 0, zaehle(f, true)));
        } else {
          var art = (f.typ === 'min' || f.typ === 'max') ? 'radio' : 'checkbox';
          f.werte.forEach(function (wv) {
            block.appendChild(option(f, art, wv[0], wv[1], gewaehlt.indexOf(wv[0]) > -1, zaehle(f, wv[0])));
          });
          if (art === 'radio' && gewaehlt.length) {
            var weg = el('button', 'finder-weg', 'egal');
            weg.type = 'button';
            weg.addEventListener('click', function () { delete wahl[f.id]; neu(); });
            block.appendChild(weg);
          }
        }
        fs.appendChild(block);
      });
      ziel.appendChild(fs);
    });
  }

  function option(f, art, wert, text, an, zahl) {
    var lab = el('label', 'finder-option' + (zahl === 0 && !an ? ' finder-leer' : ''));
    var inp = document.createElement('input');
    inp.type = art;
    inp.name = 'f-' + f.id;
    inp.checked = an;
    inp.addEventListener('change', function () {
      var w = wahl[f.id] || [];
      if (art === 'radio') w = [wert];
      else if (f.typ === 'ja' || f.typ === 'nein') w = inp.checked ? [true] : [];
      else if (inp.checked) w = w.concat([wert]);
      else w = w.filter(function (x) { return x !== wert; });
      if (w.length) wahl[f.id] = w; else delete wahl[f.id];
      neu();
    });
    lab.appendChild(inp);
    lab.appendChild(document.createTextNode(' ' + text + ' '));
    lab.appendChild(el('span', 'finder-zahl', '(' + zahl + ')'));
    return lab;
  }

  function chips(g) {
    var c = [];
    if (g.wlan) c.push('WLAN ' + g.wlan);
    if (g.streams) c.push(g.streams + '×' + g.streams);
    if (g.ram) c.push(g.ram + ' MB RAM');
    if (g.flash) c.push(g.flash + ' MB Flash');
    if (g.einsatz) c.push(g.einsatz.join(' und '));
    if (g.montage) c.push(g.montage.join(', '));
    if (g.poe && g.poe.indexOf('nein') < 0) c.push('PoE ' + g.poe.map(function (p) {
      return p === 'passiv' ? 'passiv' : '802.3' + p; }).join('/'));
    if (g.port_mbit) c.push(g.port_mbit >= 1000 ? (g.port_mbit / 1000) + ' Gbit/s' : g.port_mbit + ' Mbit/s');
    if (g.ports) c.push(g.ports === 1 ? '1 Buchse' : g.ports + ' Buchsen');
    if (g.usb) c.push('USB');
    if (g.leistung) c.push('bis ' + g.leistung + ' W');
    return c;
  }

  function sortieren(liste) {
    var lv = function (g) { var i = LEVEL_REIHE.indexOf(g.level); return i < 0 ? 99 : i; };
    var cmp = {
      einfach: function (a, b) { return lv(a.g) - lv(b.g) || (b.g.status === 'erprobt') - (a.g.status === 'erprobt'); },
      ram: function (a, b) { return (b.g.ram || 0) - (a.g.ram || 0); },
      wlan: function (a, b) { return (b.g.wlan || 0) - (a.g.wlan || 0) || (b.g.streams || 0) - (a.g.streams || 0); },
      leistung: function (a, b) { return (a.g.leistung || 999) - (b.g.leistung || 999); },
      name: function () { return 0; }
    }[sortierung];
    return liste.sort(function (a, b) {
      return cmp(a, b) || a.g.modell.localeCompare(b.g.modell, 'de');
    });
  }

  function listeZeichnen() {
    var treffer = sortieren(filtern(null));
    $('#finder-anzahl').textContent = treffer.length === 1 ? '1 Gerät' : treffer.length + ' Geräte';
    var ziel = $('#finder-liste');
    ziel.textContent = '';
    if (!treffer.length) {
      ziel.appendChild(el('p', 'finder-nichts',
        'Kein Gerät hat alle gewählten Merkmale. Nimm ein Merkmal heraus; die Zahlen links zeigen, welches am meisten bringt.'));
      return;
    }
    treffer.forEach(function (t) {
      var g = t.g;
      var k = el('article', 'finder-karte');
      var ort = selectorOrt(g.image);
      if (ort) {
        var bild = document.createElement('img');
        bild.className = 'finder-bild';
        bild.alt = '';
        bild.loading = 'lazy';
        bild.src = 'pictures/' + ort.basis + '.svg';
        bild.onerror = function () { bild.style.visibility = 'hidden'; };
        k.appendChild(bild);
      }
      var rumpf = el('div', 'finder-rumpf');
      rumpf.appendChild(el('h2', null, g.modell));
      if (g.speicher) {
        var sp = el('p', 'finder-speicher');
        var stufe = g.speicher === 'zu wenig' ? 'sackgasse' : g.speicher;
        sp.appendChild(el('span', 'ffnef-stufe ffnef-stufe-' + stufe, g.speicher));
        sp.appendChild(document.createTextNode(' Speicher für Updates'));
        rumpf.appendChild(sp);
      }
      if (g.level) {
        rumpf.appendChild(el('p', 'finder-level', g.level + ' ' + (LEVEL[g.level] || '') +
          (g.status === 'erprobt' ? ', am Gerät erprobt' : '')));
      }
      var ul = el('ul', 'finder-chips');
      chips(g).forEach(function (c) { ul.appendChild(el('li', null, c)); });
      rumpf.appendChild(ul);
      if (t.fehlt.length) rumpf.appendChild(el('p', 'finder-fehlt', 'Nicht bekannt: ' + t.fehlt.join(', ')));
      if (g.unsicher) rumpf.appendChild(el('p', 'finder-unsicher',
        'Quellen widersprechen sich bei: ' + g.unsicher.join(', ').replace(/_/g, ' ')));
      var knoepfe = el('p', 'finder-knoepfe');
      if (ort) {
        var a = el('a', 'finder-knopf', 'Firmware');
        a.href = './index.html' + q(ort);
        knoepfe.appendChild(a);
      }
      if (g.url) {
        var b = el('a', 'finder-knopf finder-knopf-zwei', 'Anleitung');
        b.href = g.url;
        knoepfe.appendChild(b);
      }
      var c = el('a', 'finder-daten', 'alle Daten mit Quellen');
      c.href = 'https://github.com/Neanderfunk/geraetedaten/blob/main/daten/' + g.image + '.json';
      c.rel = 'noopener';
      knoepfe.appendChild(c);
      rumpf.appendChild(knoepfe);
      k.appendChild(rumpf);
      ziel.appendChild(k);
    });
  }

  function zustandSchreiben() {
    var teile = [];
    Object.keys(wahl).forEach(function (k) {
      teile.push(encodeURIComponent(k) + '=' + wahl[k].map(function (x) { return encodeURIComponent(String(x)); }).join(','));
    });
    if (mitUnbekannt) teile.push('unbekannt=1');
    if (sortierung !== 'einfach') teile.push('sort=' + sortierung);
    history.replaceState(null, '', teile.length ? '?' + teile.join('&') : location.pathname);
  }

  function zustandLesen() {
    location.search.substring(1).split('&').forEach(function (p) {
      if (!p) return;
      var kv = p.split('=');
      var k = decodeURIComponent(kv[0]), v = decodeURIComponent(kv[1] || '');
      if (k === 'unbekannt') { mitUnbekannt = v === '1'; return; }
      if (k === 'sort') { sortierung = v; return; }
      var f = ALLE.filter(function (x) { return x.id === k; })[0];
      if (!f) return;
      wahl[k] = (f.typ === 'ja' || f.typ === 'nein') ? [true] : v.split(',');
    });
    $('#finder-unbekannt').checked = mitUnbekannt;
    $('#finder-sortierung').value = sortierung;
  }

  function neu() {
    zustandSchreiben();
    filterZeichnen();
    listeZeichnen();
  }

  function los() {
    holen('geraete/facetten.json', function (d) {
      if (!d || !d.geraete) {
        $('#finder-liste').appendChild(el('p', 'finder-nichts', 'Die Gerätedaten ließen sich nicht laden.'));
        return;
      }
      holen('anleitungen/index.json', function (anl) {
        var a = {};
        (anl || []).forEach(function (e) { a[e.gluon_name] = e; });
        Object.keys(d.geraete).forEach(function (img) {
          var g = d.geraete[img];
          g.image = img;
          var x = a[img];
          if (x) { g.level = x.level; g.risiko = x.risiko; g.status = x.status; g.url = x.url; }
          geraete.push(g);
        });
        zustandLesen();
        $('#finder-unbekannt').addEventListener('change', function (e) { mitUnbekannt = e.target.checked; neu(); });
        $('#finder-sortierung').addEventListener('change', function (e) { sortierung = e.target.value; neu(); });
        $('#finder-leeren').addEventListener('click', function () { wahl = {}; neu(); });
        neu();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los);
  else los();
})();
