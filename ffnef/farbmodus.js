/* Hell/Dunkel fuer routersoftware.neanderfunk.de und router.neanderfunk.de,
   im Verhalten gleich wie auf neanderfunk.de (Vorlage: freifunk-content
   seiten/wordpress/kopf/farbmodus.js, BSD-3-Clause; Auftrag adorfer
   12.11.2026).

   Ohne Zutun folgt die Seite der Einstellung von Browser bzw. System (CSS,
   prefers-color-scheme). Ein Knopf oben rechts schaltet um. Gespeichert
   wird nur, wenn jemand ausdruecklich umschaltet und dabei von der
   Systemeinstellung abweicht: localStorage "nf-farbe" mit "hell" oder
   "dunkel", keine Cookies, sonst nichts (§ 25 Abs. 2 Nr. 2 TDDDG,
   ausdruecklich gewuenschter Dienst). Schaltet jemand zurueck auf das, was
   das System ohnehin will, wird der Eintrag geloescht.

   Das CSS kennt html[data-farbe="hell"|"dunkel"]; fehlt das Attribut, gilt
   die Systemeinstellung. Diese Datei wird synchron im <head> geladen, vor
   den Stylesheets: so steht das Attribut, bevor etwas gezeichnet wird, und
   nichts blitzt auf. Den Knopf setzt sie erst, wenn der Body da ist. */
(function () {
  'use strict';
  var SCHLUESSEL = 'nf-farbe', wurzel = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  function lesen() { try { return localStorage.getItem(SCHLUESSEL); } catch (e) { return null; } }
  function schreiben(w) { try { if (w) localStorage.setItem(SCHLUESSEL, w); else localStorage.removeItem(SCHLUESSEL); } catch (e) { } }
  var g = lesen();
  if (g === 'hell' || g === 'dunkel') wurzel.setAttribute('data-farbe', g);
  function system() { return mq.matches ? 'dunkel' : 'hell'; }
  function aktuell() { return wurzel.getAttribute('data-farbe') || system(); }

  function knopfSetzen() {
    if (document.getElementById('nf-farbknopf')) return;
    var knopf = document.createElement('button'), text = document.createElement('span');
    knopf.type = 'button';
    knopf.id = 'nf-farbknopf';
    knopf.appendChild(text);
    document.body.insertBefore(knopf, document.body.firstChild);
    function beschriften() {
      var dunkel = aktuell() === 'dunkel';
      text.textContent = dunkel ? 'Hell' : 'Dunkel';
      knopf.title = dunkel ? 'Helle Darstellung' : 'Dunkle Darstellung';
      knopf.setAttribute('aria-label', knopf.title);
      knopf.className = 'farbknopf ' + (dunkel ? 'zu-hell' : 'zu-dunkel');
    }
    knopf.addEventListener('click', function () {
      var neu = aktuell() === 'dunkel' ? 'hell' : 'dunkel';
      if (neu === system()) { wurzel.removeAttribute('data-farbe'); schreiben(null); }
      else { wurzel.setAttribute('data-farbe', neu); schreiben(neu); }
      beschriften();
    });
    if (mq.addEventListener) mq.addEventListener('change', beschriften);
    else if (mq.addListener) mq.addListener(beschriften);
    beschriften();
  }

  if (document.body) knopfSetzen();
  else document.addEventListener('DOMContentLoaded', knopfSetzen);
})();
