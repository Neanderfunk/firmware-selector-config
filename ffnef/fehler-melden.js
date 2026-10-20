/* "Fehler melden" unter den Geraetedaten, fuer routersoftware.ffnef.de und
   routerwahl.ffnef.de. Schickt per POST an /fehler-melden derselben Seite;
   dahinter steht dienst/fehlermeldung.py, der die Mail verschickt.

   Aufruf: ffnefFehlerMelden(elternelement, {image, modell, zeilen: [...]})
   "zeilen" sind die Titel der angezeigten Datenzeilen fuer die Auswahl
   "Betrifft". Kein E-Mail-Pflichtfeld; Spamschutz wie beim
   Stoerungsformular auf neanderfunk.de (Quizfrage) plus verstecktes Feld. */
(function () {
  'use strict';

  var STIL = '' +
    '.ffm{margin:.6em 0}' +
    '.ffm-knopf{font:inherit;cursor:pointer;padding:.25em .7em;border:1px solid currentColor;border-radius:4px;background:transparent;color:inherit;opacity:.85}' +
    '.ffm-knopf:hover,.ffm-knopf:focus-visible{opacity:1}' +
    '.ffm-form{display:none;margin-top:.6em;max-width:36em}' +
    '.ffm-offen .ffm-form{display:grid;gap:.5em}' +
    '.ffm-form label{display:grid;gap:.2em}' +
    '.ffm-form textarea,.ffm-form input,.ffm-form select{font:inherit;padding:.3em;max-width:100%;box-sizing:border-box}' +
    '.ffm-form textarea{min-height:5em}' +
    '.ffm-weg{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '.ffm-hinweis{font-size:.9em;opacity:.8;margin:0}' +
    '.ffm-ergebnis{margin:.3em 0 0}' +
    '.ffm-ergebnis.ffm-gut{font-weight:bold}' +
    '.ffm-ergebnis.ffm-schlecht{color:#b00020}' +
    '@media (prefers-color-scheme:dark){.ffm-ergebnis.ffm-schlecht{color:#ff8a80}}';

  function stilEinmal() {
    if (document.getElementById('ffm-stil')) return;
    var s = document.createElement('style');
    s.id = 'ffm-stil';
    s.textContent = STIL;
    document.head.appendChild(s);
  }

  function el(art, klasse, text) {
    var e = document.createElement(art);
    if (klasse) e.className = klasse;
    if (text) e.textContent = text;
    return e;
  }

  var zaehler = 0;

  window.ffnefFehlerMelden = function (ziel, info) {
    stilEinmal();
    var n = ++zaehler;
    var box = el('div', 'ffm');
    var knopf = el('button', 'ffm-knopf', 'Fehler melden');
    knopf.type = 'button';
    knopf.setAttribute('aria-expanded', 'false');
    knopf.setAttribute('aria-controls', 'ffm-form-' + n);
    box.appendChild(knopf);

    var form = el('form', 'ffm-form');
    form.id = 'ffm-form-' + n;
    form.noValidate = true;

    form.appendChild(el('p', 'ffm-hinweis',
      'Stimmt bei ' + (info.modell || 'diesem Gerät') + ' etwas nicht? Schreib uns kurz, was. ' +
      'Die Meldung geht an das Neanderfunk-Team.'));

    var betrifft = null;
    if (info.zeilen && info.zeilen.length) {
      var lb = el('label', null, 'Betrifft');
      betrifft = el('select');
      betrifft.name = 'zeile';
      [''].concat(info.zeilen, ['Etwas anderes']).forEach(function (t) {
        var o = el('option', null, t || 'bitte wählen (freiwillig)');
        o.value = t;
        betrifft.appendChild(o);
      });
      lb.appendChild(betrifft);
      form.appendChild(lb);
    }

    var lt = el('label', null, 'Was stimmt nicht?');
    var text = el('textarea');
    text.name = 'text';
    text.maxLength = 1500;
    text.required = true;
    lt.appendChild(text);
    form.appendChild(lt);

    var lq = el('label', null, 'Wie heißt das offene WLAN unserer Router?');
    var quiz = el('input');
    quiz.name = 'quiz';
    quiz.maxLength = 30;
    quiz.required = true;
    quiz.autocomplete = 'off';
    lq.appendChild(quiz);
    form.appendChild(lq);

    /* Verstecktes Feld: Menschen sehen es nicht und lassen es leer. */
    var weg = el('label', 'ffm-weg', 'Bitte leer lassen');
    var website = el('input');
    website.name = 'website';
    website.tabIndex = -1;
    website.autocomplete = 'off';
    weg.appendChild(website);
    form.appendChild(weg);

    var mehr = el('details');
    mehr.appendChild(el('summary', null, 'Ich möchte eine Antwort'));
    var lk = el('label', null, 'E-Mail-Adresse oder andere Kontaktmöglichkeit (freiwillig)');
    var kontakt = el('input');
    kontakt.name = 'kontakt';
    kontakt.maxLength = 200;
    lk.appendChild(kontakt);
    mehr.appendChild(lk);
    form.appendChild(mehr);

    var senden = el('button', 'ffm-knopf', 'Meldung senden');
    senden.type = 'submit';
    form.appendChild(senden);
    var ergebnis = el('p', 'ffm-ergebnis');
    ergebnis.setAttribute('role', 'status');
    form.appendChild(ergebnis);
    box.appendChild(form);

    knopf.addEventListener('click', function () {
      var offen = box.classList.toggle('ffm-offen');
      knopf.setAttribute('aria-expanded', offen ? 'true' : 'false');
      if (offen) text.focus();
    });

    function zeige(t, gut) {
      ergebnis.textContent = t;
      ergebnis.className = 'ffm-ergebnis ' + (gut ? 'ffm-gut' : 'ffm-schlecht');
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!text.value.trim()) { zeige('Bitte beschreib kurz, was nicht stimmt.'); text.focus(); return; }
      if (!quiz.value.trim()) { zeige('Bitte beantworte die Frage zum WLAN-Namen.'); quiz.focus(); return; }
      senden.disabled = true;
      zeige('Wird gesendet …', true);
      var daten = {
        image: info.image, modell: info.modell || '',
        zeile: betrifft ? betrifft.value : '',
        text: text.value, kontakt: kontakt.value, quiz: quiz.value,
        website: website.value, seite: location.href
      };
      var r = new XMLHttpRequest();
      r.open('POST', '/fehler-melden');
      r.setRequestHeader('Content-Type', 'application/json');
      r.timeout = 45000;
      r.onload = function () {
        var a = null;
        try { a = JSON.parse(r.responseText); } catch (e) { /* unten */ }
        if (a && a.ok) {
          zeige('Danke! Deine Meldung ist angekommen.', true);
          text.value = ''; kontakt.value = '';
          senden.disabled = true;
          return;
        }
        senden.disabled = false;
        zeige((a && a.fehler) || 'Das hat nicht geklappt. Schreib uns bitte an projekt@neanderfunk.de.');
      };
      r.onerror = r.ontimeout = function () {
        senden.disabled = false;
        zeige('Das hat nicht geklappt. Schreib uns bitte an projekt@neanderfunk.de.');
      };
      r.send(JSON.stringify(daten));
    });

    ziel.appendChild(box);
    return box;
  };
})();
