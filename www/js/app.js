/* Orvaluna — aplicación */
(function () {
  'use strict';
  var I18N = window.ORV_I18N, A = window.OrvAstro, N = window.OrvNum, W = window.OrvWheel;
  var LANGS = ['es', 'en', 'de', 'pt'];
  var NATIVE = window.OrvalunaNative || null;
  var S = {
    lang: 'es', view: 'chart', chartTab: 'triad', coreSel: 'expression', cycleSel: 'birthday',
    profiles: [], activeId: null, data: null, editingId: null, place: null,
    music: true, vol: 45
  };
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- almacenamiento ---------- */
  function load(k, d) { try { var v = localStorage.getItem('orv.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('orv.' + k, JSON.stringify(v)); } catch (e) { } }

  /* ---------- i18n ---------- */
  function D() { return I18N[S.lang]; }
  function T(path) { var o = D().ui; path.split('.').forEach(function (p) { o = o == null ? o : o[p]; }); return o == null ? path : o; }
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cap(s) { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); }
  function firstKw(s) { return String(s).split(',')[0].trim(); }
  function applyStatic() {
    document.documentElement.lang = S.lang;
    document.querySelectorAll('[data-t]').forEach(function (el) { el.textContent = T(el.getAttribute('data-t')); });
    document.querySelectorAll('[data-tp]').forEach(function (el) { el.placeholder = T(el.getAttribute('data-tp')); });
    $('hdrBrand').textContent = 'Orvaluna';
    renderLangs();
  }
  function renderLangs() {
    ['formLangs', 'setLangs'].forEach(function (id) {
      $(id).innerHTML = LANGS.map(function (l) {
        return '<button data-lang="' + l + '" class="' + (l === S.lang ? 'active' : '') + '">' + (id === 'setLangs' ? I18N[l].ui.langName : l.toUpperCase()) + '</button>';
      }).join('');
    });
  }
  function setLang(l) {
    if (LANGS.indexOf(l) < 0) return;
    S.lang = l; save('lang', l); applyStatic(); renderAll();
  }

  /* ---------- utilidades ---------- */
  function deg(d) { var g = Math.floor(d), m = Math.floor((d - g) * 60); return g + '°' + (m < 10 ? '0' : '') + m + '′'; }
  function degShort(d) { return Math.floor(d) + '°'; }
  function signName(k) { return D().signs[k].name; }
  function signIn(k) { return D().signs[k].in; }
  function elementOf(k) { return A.ELEMENT[A.SIGNS.indexOf(k) % 4]; }
  function modeOf(k) { return A.MODE[A.SIGNS.indexOf(k) % 3]; }
  function symSpan(ch) { return '<span class="sym">' + ch + '︎</span>'; }
  function pGlyph(k) { return k === 'sun' ? '☉' : W.PGLYPH[k]; }
  function pBadge(k) { return '<div class="pg ' + k + '">' + (k === 'sun' ? '<span style="font-size:26px;line-height:1">☉</span>' : symSpan(W.PGLYPH[k])) + '</div>'; }
  function sBadge(k, top) {
    return '<div class="badge"><span class="b1">' + top + '</span><span class="b2 sym" style="background:' + W.ELCOL[elementOf(k)] + '">' + W.GLYPH[k] + '︎</span></div>';
  }
  function toast(msg, ms) {
    var t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.add('hidden'); }, ms || 2600);
  }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(p) {
    try { return new Intl.DateTimeFormat(S.lang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(p.y, p.m - 1, p.d))); }
    catch (e) { return p.d + '/' + p.m + '/' + p.y; }
  }
  function fmtOffset(min) { var s = min < 0 ? '−' : '+'; min = Math.abs(min); return 'UTC' + s + Math.floor(min / 60) + (min % 60 ? ':' + pad(min % 60) : ''); }

  /* ---------- cálculo ---------- */
  function computeProfile(p) {
    var hh = p.timeKnown ? p.hh : 12, mm = p.timeKnown ? p.mm : 0;
    var u = A.localToUTC(p.y, p.m, p.d, hh, mm, p.place.tz, (p.manualOffset === '' || p.manualOffset == null) ? undefined : Math.round(parseFloat(p.manualOffset) * 60));
    var chart = A.computeChart(u.date, p.place.lat, p.place.lon, p.timeKnown);
    var num = N.compute(p.name, p.y, p.m, p.d, new Date());
    return { p: p, chart: chart, num: num, utc: u.date, offset: u.offset };
  }
  window.OrvApp = { getData: function () { return S.data; }, D: D, T: T, fmt: fmt, deg: deg, lang: function () { return S.lang; }, toast: toast, ctx: function () { return ctx(); } };

  /* ---------- contexto de textos compartido (pantalla + PDF) ---------- */
  function ctx() {
    var d = S.data, L = D(), c = d.chart, n = d.num;
    var sun = c.planets[0], moon = c.planets[1];
    var lp = n.birth.lifePath.value, ex = n.name.expression.value, so = n.name.soul.value;
    var NN = L.num.n;
    var o = {
      sunIn: signIn(sun.sign), moonIn: signIn(moon.sign), sunName: signName(sun.sign), moonName: signName(moon.sign),
      ascName: c.timeKnown ? signName(c.asc.sign) : '', ascIn: c.timeKnown ? signIn(c.asc.sign) : '',
      lp: lp, exp: ex, soul: so, lpKw: NN[lp].kw, lpTitle: NN[lp].title.replace(/\s*\(.*\)$/, ''),
      sunKw: firstKw(L.signs[sun.sign].kw), moonKw: L.signs[moon.sign].kw, ascKw: c.timeKnown ? firstKw(L.signs[c.asc.sign].kw) : '',
      soulKw: NN[so].kw, element: L.elements[c.dominantElement].name
    };
    var py = n.birth.personalYear, pin = n.birth.pinnacles[n.currentPinnacle];
    o.py = py; o.pyTitle = NN[py].title.replace(/\s*\(.*\)$/, ''); o.pinNum = n.currentPinnacle + 1; o.pin = pin.value; o.pinTxt = NN[pin.value].pinnacle;
    o.gifts = [L.elements[c.dominantElement].name.toLowerCase(), firstKw(L.signs[sun.sign].kw), firstKw(NN[lp].kw), firstKw(NN[ex].kw)].join(', ');
    o.growth = L.signs[sun.sign].shadow + '; ' + L.signs[moon.sign].shadow;
    var S2 = L.synth;
    return {
      o: o,
      fusion: [fmt(S2.fusion1, o), fmt(S2.fusion2, o), fmt(S2.fusion3, o)],
      motor: c.timeKnown ? fmt(S2.motor, o) : fmt(S2.motorNoAsc, o),
      compass: fmt(S2.compass, o), mandate: fmt(S2.mandate, o), moment: fmt(S2.moment, o),
      gifts: fmt(S2.giftsTxt, o), growth: fmt(S2.growthTxt, o), decree: fmt(S2.decree, o)
    };
  }
  window.OrvApp.planetText = planetText;
  window.OrvApp.houseText = houseText;
  window.OrvApp.numDetail = numDetail;

  function planetText(p) {
    var L = D(), c = S.data.chart;
    var t = L.planets[p.key].fn + ' ' + L.signs[p.sign].style + '.';
    if (c.timeKnown) t += ' ' + fmt(L.inHouse, { house: L.houses[p.house - 1].name, area: L.houses[p.house - 1].area });
    if (p.retro && p.key !== 'node') t += ' ' + L.retroTxt;
    return t;
  }
  function houseText(i) {
    var L = D(), h = S.data.chart.houses[i];
    return fmt(L.houseCuspTxt, { sign: signIn(h.sign), style: L.signs[h.sign].style });
  }
  function numDetail(kind) {
    var n = S.data.num, NN = D().num.n, v, txt, label = T(kind);
    switch (kind) {
      case 'expression': v = n.name.expression.value; txt = NN[v].talent + ' ' + NN[v].career; break;
      case 'soul': v = n.name.soul.value; txt = NN[v].soul; break;
      case 'personality': v = n.name.personality.value; txt = NN[v].persona; break;
      case 'birthday': v = n.birth.birthday.value; txt = NN[v].talent; break;
      case 'maturity': v = n.maturity; txt = NN[v].essence; break;
      case 'attitude': v = n.birth.attitude; txt = NN[v].persona; break;
      case 'personalYear': v = n.birth.personalYear; txt = NN[v].year; label += ' ' + n.year; break;
      case 'personalMonth': v = n.birth.personalMonth; txt = NN[v].year; break;
      case 'universalYear': v = n.birth.universalYear; txt = NN[v].year; label += ' ' + n.year; break;
    }
    var karmic = null;
    if (kind === 'expression') karmic = n.name.expression.karmic; else if (kind === 'soul') karmic = n.name.soul.karmic; else if (kind === 'personality') karmic = n.name.personality.karmic; else if (kind === 'birthday') karmic = n.birth.birthday.karmic;
    return { v: v, label: label, title: NN[v].title, kw: NN[v].kw, txt: txt, karmic: karmic };
  }

  /* ---------- render: Carta ---------- */
  function renderChart() {
    var c = S.data.chart, L = D(), el = $('view-chart');
    var sun = c.planets[0], moon = c.planets[1];
    var chips = '<span class="chip">☀️ ' + T('sun') + ': ' + signName(sun.sign) + ' (' + degShort(sun.deg) + ')</span>' +
      '<span class="chip">🌙 ' + T('moon') + ': ' + signName(moon.sign) + ' (' + degShort(moon.deg) + ')</span>' +
      (c.timeKnown ? '<span class="chip">⬆️ ' + T('asc') + ': ' + signName(c.asc.sign) + ' (' + degShort(c.asc.deg) + ')</span>' : '');
    var tabs = ['triad', 'elements', 'planets', 'houses', 'aspects'].filter(function (k) { return c.timeKnown || k !== 'houses'; });
    var icons = { triad: '☀️', elements: '🔥', planets: '🪐', houses: '🏛️', aspects: '✴️' };
    if (tabs.indexOf(S.chartTab) < 0) S.chartTab = 'triad';
    var h = '<div class="card wheel-card"><div class="wheel-box"><canvas id="wheel"></canvas></div><div class="chips">' + chips + '</div>' +
      (c.timeKnown ? '' : '<div class="note">' + esc(T('noTimeNote')) + '</div>') + '</div>' +
      '<div class="tabs" id="chartTabs">' + tabs.map(function (k) { return '<button data-tab="' + k + '" class="' + (k === S.chartTab ? 'active' : '') + '">' + icons[k] + ' ' + T(k) + '</button>'; }).join('') + '</div>' +
      '<div id="chartBody">' + chartBody() + '</div>';
    el.innerHTML = h;
    drawWheel();
  }
  function drawWheel() {
    var cv = $('wheel'); if (!cv || !S.data) return;
    var go = function () { W.draw(cv, S.data.chart, { size: cv.parentNode.clientWidth || 340, centerLabel: T('triad') }); };
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('20px NotoSym', '♈☽'), document.fonts.load('500 12px Jost')]).then(go, go); else go();
  }
  function chartBody() {
    var c = S.data.chart, L = D(), t = S.chartTab;
    var sun = c.planets[0], moon = c.planets[1];
    if (t === 'triad') {
      var card = function (k, top, lbl, dg, sub, txt) {
        return '<div class="card sign-card">' + sBadge(k, top) + '<div class="info"><div class="lbl sm">' + esc(lbl) + '</div><h3 class="ttl">' + signName(k) + ' ' + (S.lang === 'en' ? 'at' : S.lang === 'de' ? 'auf' : 'a') + ' ' + degShort(dg) + '</h3><div class="meta">' + sub + '</div><p class="txt">' + esc(txt) + '</p></div></div>';
      };
      var sub = function (k) { return T('element') + ' ' + L.elements[elementOf(k)].name + ' • ' + L.modes[modeOf(k)].name; };
      var h = card(sun.sign, '☀️', T('solarSign'), sun.deg, sub(sun.sign), L.signs[sun.sign].sun) +
        card(moon.sign, '🌙', T('lunarSign'), moon.deg, sub(moon.sign), L.signs[moon.sign].moon);
      if (c.timeKnown) h += card(c.asc.sign, '⬆️', T('ascSign'), c.asc.deg, T('ruler') + ': ' + L.planets[A.RULER[c.asc.sign]].name, L.signs[c.asc.sign].asc);
      return h;
    }
    if (t === 'elements') {
      var tot = 0; Object.keys(c.elements).forEach(function (k) { tot += c.elements[k]; });
      var bars = ['fire', 'earth', 'air', 'water'].map(function (k) {
        var pc = Math.round(c.elements[k] / tot * 100);
        return '<div class="bar"><span class="bn">' + L.elements[k].name + '</span><span class="bt"><span class="bf" style="display:block;width:' + pc + '%;background:var(--' + k + ')"></span></span><span class="bv">' + pc + '%</span></div>';
      }).join('');
      var mt = 0; Object.keys(c.modes).forEach(function (k) { mt += c.modes[k]; });
      var mbars = ['cardinal', 'fixed', 'mutable'].map(function (k) {
        var pc = Math.round(c.modes[k] / mt * 100);
        return '<div class="bar"><span class="bn">' + L.modes[k].name + '</span><span class="bt"><span class="bf" style="display:block;width:' + pc + '%;background:linear-gradient(90deg,#E0552B,#F2B33D)"></span></span><span class="bv">' + pc + '%</span></div>';
      }).join('');
      var h2 = '<div class="card"><div class="lbl">' + T('elementBalance') + '</div><div class="bars">' + bars + '</div>' +
        '<div class="k">🔆 ' + T('dominant') + ': ' + L.elements[c.dominantElement].name + '</div><p class="txt">' + esc(L.elements[c.dominantElement].dom) + '</p>' +
        '<div class="k">🌑 ' + T('lacking') + ': ' + L.elements[c.weakElement].name + '</div><p class="txt">' + esc(L.elements[c.weakElement].lack) + '</p></div>' +
        '<div class="card"><div class="lbl">' + T('modeBalance') + '</div><div class="bars">' + mbars + '</div><p class="txt">' + esc(L.modes[c.dominantMode].dom) + '</p></div>';
      if (c.timeKnown) {
        var hem = c.hemispheres;
        var ruler = c.planets.filter(function (p) { return p.key === c.chartRuler; })[0];
        h2 += '<div class="card"><div class="lbl">' + T('hemispheres') + '</div><p class="txt">' + esc(hem.upper >= hem.lower ? L.hemis.upper : L.hemis.lower) + '</p><p class="txt">' + esc(hem.east >= hem.west ? L.hemis.east : L.hemis.west) + '</p>' +
          '<div class="k">👑 ' + T('chartRuler') + '</div><p class="txt">' + esc(fmt(L.ascRulerTxt, { planet: L.planets[ruler.key].name, sign: signIn(ruler.sign), house: ruler.house })) + '</p></div>';
      }
      return h2;
    }
    if (t === 'planets') {
      return '<div class="card">' + c.planets.map(function (p) {
        return '<div class="row expand">' + pBadge(p.key) + '<div class="rt"><b>' + L.planets[p.key].name + '</b>' + (p.retro && p.key !== 'node' ? '<span class="retro">℞</span>' : '') +
          '<div class="meta">' + signName(p.sign) + (c.timeKnown ? ' · ' + T('house') + ' ' + p.house : '') + '</div><p class="txt">' + esc(planetText(p)) + '</p></div><span class="deg">' + deg(p.deg) + '</span></div>';
      }).join('') + '</div>';
    }
    if (t === 'houses') {
      var mc = '<div class="card"><div class="lbl">' + T('mc') + ' · ' + signName(c.mc.sign) + ' ' + deg(c.mc.deg) + '</div><p class="txt">' + esc(fmt(L.mcTxt, { sign: signIn(c.mc.sign), style: L.signs[c.mc.sign].style })) + '</p>' +
        '<div class="note" style="text-align:left">' + T('houseSystemNote') + ': ' + T(c.houseSystem) + '</div></div>';
      return mc + '<div class="card">' + c.houses.map(function (h, i) {
        var inside = c.planets.filter(function (p) { return p.house === i + 1; }).map(function (p) { return L.planets[p.key].name; });
        return '<div class="row"><div class="pg" style="font-family:Cinzel;font-size:17px">' + (i + 1) + '</div><div class="rt"><b>' + esc(L.houses[i].name) + '</b><div class="meta">' + signName(h.sign) + ' ' + deg(h.deg) +
          (inside.length ? ' · ' + inside.join(', ') : '') + '</div><p class="txt">' + esc(houseText(i)) + '</p></div></div>';
      }).join('') + '</div>';
    }
    if (t === 'aspects') {
      var col = { conjunction: '#F2B33D', sextile: '#5FB3A8', trine: '#5B8FD6', square: '#D9483B', opposition: '#C2413A' };
      var nameOf = function (k) { return L.planets[k].name; };
      return '<div class="card">' + c.aspects.slice(0, 24).map(function (a) {
        var as = L.aspects[a.type];
        return '<div class="row"><div class="asp-sym sym" style="color:' + col[a.type] + '">' + a.sym + '</div><div class="rt"><b>' + nameOf(a.a) + ' ' + as.verb + ' ' + nameOf(a.b) + '</b><div class="meta">' + as.name + ' · ' + T('orb') + ' ' + a.orb.toFixed(1) + '°</div><p class="txt">' + esc(cap(as.text)) + '</p></div></div>';
      }).join('') + '</div>';
    }
    return '';
  }

  /* ---------- render: Numerología ---------- */
  function renderNum() {
    var n = S.data.num, NN = D().num.n, L = D(), el = $('view-num');
    var lp = n.birth.lifePath.value, master = lp > 9;
    var lpk = n.birth.lifePath.karmic;
    var h = '<div class="card glow num-hero"><div class="top"><div class="big-num">' + lp + '</div><div><div class="lbl">' + T('lifePath') + '</div>' +
      '<h3 class="ttl">' + T('lifePath') + ': ' + T('vibration') + ' ' + lp + '</h3></div></div>' +
      '<div class="subttl" style="margin-top:10px">' + esc(NN[lp].title) + '</div>' +
      (master ? '<span class="tag">✦ ' + T('masterNumber') + '</span> ' : '') + (lpk ? '<span class="tag k13">' + T('karmicDebtTag') + ' ' + lpk + '</span>' : '') +
      '<div class="k">🌟 ' + T('purpose') + '</div><p class="txt">' + esc(NN[lp].essence) + '</p>' +
      '<div class="k">🌑 ' + T('shadowAspect') + '</div><p class="txt">' + esc(NN[lp].shadow) + '</p>' +
      '<div class="k">💞 ' + T('love') + '</div><p class="txt">' + esc(NN[lp].love) + '</p>' +
      '<div class="k">🧭 ' + T('vocation') + '</div><p class="txt">' + esc(NN[lp].career) + '</p></div>';

    var mini = function (kind, group, sel) {
      var d = numDetail(kind);
      return '<div class="mini tap ' + (sel === kind ? 'sel' : '') + '" data-grp="' + group + '" data-kind="' + kind + '"><div class="n">' + d.v + '</div><div class="t">' + esc(d.label) + '</div><div class="s">' + esc(T(kind + 'Sub')) + '</div></div>';
    };
    var detail = function (kind) {
      var d = numDetail(kind);
      return '<div class="card detail"><div class="lbl sm">' + esc(d.label) + ' · ' + d.v + '</div><div class="subttl">' + esc(d.title) + '</div><div class="meta">' + esc(cap(d.kw)) + '</div>' +
        (d.karmic ? '<span class="tag k13">' + T('karmicDebtTag') + ' ' + d.karmic + '</span>' : '') + '<p class="txt">' + esc(d.txt) + '</p></div>';
    };
    h += '<div class="sec-title">' + T('coreNumbers') + '</div><div class="grid3">' + ['expression', 'soul', 'personality'].map(function (k) { return mini(k, 'core', S.coreSel); }).join('') + '</div>' +
      '<div id="coreDetail" style="margin-top:12px">' + detail(S.coreSel) + '</div>';
    h += '<div class="sec-title">' + T('cycles') + '</div><div class="grid3">' + ['birthday', 'personalYear', 'maturity', 'personalMonth', 'universalYear', 'attitude'].map(function (k) { return mini(k, 'cycle', S.cycleSel); }).join('') + '</div>' +
      '<div id="cycleDetail" style="margin-top:12px">' + detail(S.cycleSel) + '</div>';

    // pináculos y desafíos
    var ageTxt = function (from, to) { return to === null ? T('fromAge') + ' ' + from + ' ' + T('onwards') : (from === 0 ? '0' : from) + ' – ' + to + ' ' + T('years'); };
    h += '<div class="sec-title">' + T('pinnacles') + '</div><div class="card"><div class="meta">' + T('pinnaclesSub') + '</div><div class="timeline" style="margin-top:14px">' +
      n.birth.pinnacles.map(function (p, i) {
        var cur = i === n.currentPinnacle;
        return '<div class="tl-item ' + (cur ? 'cur' : '') + '"><div class="tl-h"><span class="tl-n">' + p.value + '</span><span class="tl-a">' + ageTxt(p.from, p.to) + '</span>' + (cur ? '<span class="cur-tag">' + T('current') + '</span>' : '') + '</div>' +
          '<div class="subttl" style="font-size:16px">' + esc(NN[p.value].title) + '</div><p class="txt" style="margin-top:2px">' + esc(NN[p.value].pinnacle) + '</p>' +
          '<p class="txt" style="margin-top:6px;color:var(--muted);font-size:15px">⚔️ ' + esc(L.num.challenges[n.birth.challenges[i]]) + '</p></div>';
      }).join('') + '</div></div>';

    h += '<div class="sec-title">' + T('lifeCycles') + '</div><div class="card">' + n.birth.cycles.map(function (cy, i) {
      return '<div class="row"><div class="pg" style="font-family:Cinzel">' + cy.value + '</div><div class="rt"><b>' + T('cyclesNames')[i] + '</b><div class="meta">' + ageTxt(cy.from, cy.to) + ' · ' + esc(NN[cy.value].title.replace(/\s*\(.*\)$/, '')) + '</div><p class="txt">' + esc(cap(NN[cy.value].kw)) + '.</p></div></div>';
    }).join('') + '</div>';

    // karma
    h += '<div class="sec-title">' + T('karma') + '</div><div class="card"><div class="lbl">' + T('karmicDebts') + '</div>' +
      (n.karmicDebts.length ? n.karmicDebts.map(function (k) { return '<p class="txt">⚖️ ' + esc(L.num.debts[k]) + '</p>'; }).join('') : '<p class="txt">' + esc(T('noDebts')) + '</p>') +
      '<div class="lbl" style="margin-top:20px">' + T('karmicLessons') + '</div>' +
      (n.name.karmicLessons.length ? n.name.karmicLessons.map(function (k) { return '<p class="txt">📜 ' + esc(L.num.lessons[k]) + '</p>'; }).join('') : '<p class="txt">' + esc(T('noLessons')) + '</p>') + '</div>';

    // mapa del nombre
    var inc = n.name.inclusion, mx = Math.max.apply(null, inc);
    var lv = function (ch) { return N.letterValue(ch); };
    var kwOf = function (v) { return NN[v].kw; };
    var sub = n.name.subconscious, lvl = T('lvl')[sub <= 5 ? 0 : sub <= 6 ? 1 : sub <= 8 ? 2 : 3];
    h += '<div class="sec-title">' + T('nameMap') + '</div><div class="card"><div class="lbl">' + T('inclusion') + '</div><div class="meta">' + T('inclusionSub') + '</div><div class="inc">' +
      inc.map(function (cnt, i) { return '<div class="' + (cnt === 0 ? 'zero' : cnt === mx ? 'max' : '') + '"><div class="d">' + (i + 1) + '</div><div class="c">× ' + cnt + '</div></div>'; }).join('') + '</div>' +
      '<div class="k">🔥 ' + T('hiddenPassion') + ': ' + n.name.hiddenPassion.join(', ') + '</div><p class="txt">' + esc(n.name.hiddenPassion.map(function (v) { return cap(kwOf(v)); }).join(' · ')) + '</p>' +
      '<div class="k">⚖️ ' + T('balance') + ': ' + n.name.balance + '</div><p class="txt">' + esc(L.num.balance[n.name.balance]) + '</p>' +
      (n.name.cornerstone ? '<div class="k">🗝️ ' + T('cornerstone') + ': ' + n.name.cornerstone + '</div><p class="txt">' + esc(fmt(T('cornerstoneTxt'), { n: lv(n.name.cornerstone), kw: kwOf(lv(n.name.cornerstone)) })) + '</p>' : '') +
      (n.name.capstone ? '<div class="k">🏛️ ' + T('capstone') + ': ' + n.name.capstone + '</div><p class="txt">' + esc(fmt(T('capstoneTxt'), { n: lv(n.name.capstone), kw: kwOf(lv(n.name.capstone)) })) + '</p>' : '') +
      (n.name.firstVowel ? '<div class="k">🔔 ' + T('firstVowel') + ': ' + n.name.firstVowel + '</div><p class="txt">' + esc(fmt(T('firstVowelTxt'), { n: lv(n.name.firstVowel), kw: kwOf(lv(n.name.firstVowel)) })) + '</p>' : '') +
      '<div class="k">🌊 ' + T('subconscious') + ': ' + sub + '</div><p class="txt">' + esc(fmt(T('subconsciousTxt'), { n: sub, lvl: lvl })) + '</p>' +
      '<div class="k">🧠 ' + T('rational') + ': ' + n.rationalThought + '</div><p class="txt">' + esc(fmt(T('rationalTxt'), { n: n.rationalThought, kw: kwOf(n.rationalThought) })) + '</p></div>';
    el.innerHTML = h;
  }


  /* ---------- profesiones compatibles ---------- */
  function careerList(str) { return String(str).replace(/\.\s*$/, '').split(',').map(function (x) { return cap(x.trim()); }).filter(Boolean); }
  function careers() {
    var d = S.data, L = D(), c = d.chart, n = d.num, NN = L.num.n;
    var lp = n.birth.lifePath.value, ex = n.name.expression.value, sun = c.planets[0];
    var groups = [];
    if (c.timeKnown) groups.push({ label: fmt(T('byMc'), { 'in': signIn(c.mc.sign) }), items: L.signs[c.mc.sign].careers.slice() });
    groups.push({ label: fmt(T('byLP'), { n: lp }), items: careerList(NN[lp].career) });
    if (ex !== lp) groups.push({ label: fmt(T('byExp'), { n: ex }), items: careerList(NN[ex].career) });
    if (!c.timeKnown || c.mc.sign !== sun.sign) groups.push({ label: fmt(T('bySun'), { 'in': signIn(sun.sign) }), items: L.signs[sun.sign].careers.slice() });
    var top = [], seen = {};
    for (var r = 0; r < 6 && top.length < 8; r++) groups.forEach(function (g) {
      var it = g.items[r]; if (!it || top.length >= 8) return;
      var k = norm(it); if (seen[k]) return; seen[k] = 1; top.push(it);
    });
    var lead = fmt(T('careersLead'), { lpTitle: NN[lp].title.replace(/\s*\(.*\)$/, ''), lp: lp, exp: ex,
      astro: c.timeKnown ? fmt(T('careersAstroMc'), { mcIn: signIn(c.mc.sign) }) : fmt(T('careersAstroSun'), { sunIn: signIn(sun.sign) }) });
    var env = fmt(T('envTxt'), { el: L.elements[c.dominantElement].name, env: L.elements[c.dominantElement].work });
    return { lead: lead, top: top, groups: groups, env: env };
  }
  window.OrvApp.careers = careers;

  /* ---------- render: Síntesis ---------- */
  function renderSynth() {
    var c = S.data.chart, n = S.data.num, x = ctx(), el = $('view-synth');
    var triad = T('sun') + ' ' + signIn(c.planets[0].sign) + ' • ' + T('moon') + ' ' + signIn(c.planets[1].sign) + (c.timeKnown ? ' • ' + T('ascFull') + ' ' + signIn(c.asc.sign) : '');
    var lp = n.birth.lifePath.value;
    var h = '<div class="card hero"><div class="lbl">' + T('synthTitle') + '</div><h2>' + esc(S.data.p.name) + '</h2><div class="triad">' + esc(triad) + '</div>' +
      '<div class="lp">' + T('lifePath') + ' ' + lp + ' (' + esc(D().num.n[lp].title) + ')</div></div>';
    var hl = function (s) {
      var o = x.o; s = esc(s);
      [o.sunName, o.moonName, o.ascName].filter(Boolean).forEach(function (w) { s = s.split(esc(w)).join('<span class="hl">' + esc(w) + '</span>'); });
      return s;
    };
    h += '<div class="card"><div class="ic-head"><span class="ic">🔮</span><div><div class="lbl sm">' + T('fusionKicker') + '</div><h3>' + T('fusion') + '</h3></div></div>' +
      x.fusion.map(function (p) { return '<p class="txt">' + hl(p) + '</p>'; }).join('') + '</div>';
    h += '<div class="card"><div class="lbl">' + T('powerMap') + '</div>' +
      '<div class="pm"><span class="ic">👑</span><div><h4>' + T('motor') + '</h4><p>' + esc(x.motor) + '</p></div></div>' +
      '<div class="pm"><span class="ic">🌊</span><div><h4>' + T('compass') + '</h4><p>' + esc(x.compass) + '</p></div></div>' +
      '<div class="pm"><span class="ic">📐</span><div><h4>' + T('mandate') + ' (' + lp + ')</h4><p>' + esc(x.mandate) + '</p></div></div>' +
      '<div class="pm"><span class="ic">⏳</span><div><h4>' + T('moment') + '</h4><p>' + esc(x.moment) + '</p></div></div>' +
      '<div class="pm"><span class="ic">💎</span><div><h4>' + T('gifts') + '</h4><p>' + esc(x.gifts) + '</p></div></div>' +
      '<div class="pm"><span class="ic">🌱</span><div><h4>' + T('growth') + '</h4><p>' + esc(x.growth) + '</p></div></div></div>';
    var cr = careers();
    h += '<div class="card"><div class="ic-head"><span class="ic">💼</span><div><div class="lbl sm">' + T('careersKicker') + '</div><h3>' + T('careersTitle') + '</h3></div></div>' +
      '<p class="txt">' + esc(cr.lead) + '</p><div class="k">⭐ ' + T('careersTop') + '</div><div class="jobs">' + cr.top.map(function (j) { return '<span class="job">' + esc(j) + '</span>'; }).join('') + '</div>' +
      cr.groups.map(function (g) { return '<div class="k">' + esc(g.label) + '</div><p class="txt">' + esc(g.items.join(' · ')) + '</p>'; }).join('') +
      '<div class="k">🏛️ ' + T('idealEnv') + '</div><p class="txt">' + esc(cr.env) + '</p></div>';
    h += '<div class="card decree"><div class="star">✨</div><div class="lbl">' + T('decree') + '</div><q>' + esc(x.decree) + '</q><div class="sig">' + T('decreeSign') + '</div></div>';
    h += exportButtons();
    el.innerHTML = h;
  }
  function exportButtons() {
    return '<div class="export"><button class="cta" data-pdf="open">📜 ' + T('exportPdf') + '</button>' + (NATIVE ? '<button class="cta sec" data-pdf="share">📤 ' + T('sharePdf') + '</button>' : '') + '</div>';
  }

  /* ---------- render: Mis datos ---------- */
  function renderMe() {
    var d = S.data, p = d.p, el = $('view-me');
    var h = '<div class="card"><div class="lbl">' + T('myData') + '</div>' +
      kv(T('fullName'), esc(p.name)) + kv(T('birthDate'), fmtDate(p)) + kv(T('birthTime'), p.timeKnown ? pad(p.hh) + ':' + pad(p.mm) : T('unknown')) +
      kv(T('birthPlace'), esc(p.place.label)) + kv(T('coords'), p.place.lat.toFixed(3) + '°, ' + p.place.lon.toFixed(3) + '°') +
      kv(T('timezone'), esc(p.place.tz || '—')) + kv(T('utcOffset'), fmtOffset(d.offset)) +
      kv(T('houseSystemNote'), d.chart.timeKnown ? T(d.chart.houseSystem) : '—') +
      '<button class="cta sec" style="margin-top:14px" id="btnEdit">✏️ ' + T('change') + '</button></div>';
    h += exportButtons();
    h += '<div class="sec-title">' + T('profiles') + '</div><div class="card">' + S.profiles.map(function (q) {
      var act = q.id === S.activeId;
      return '<div class="prof"><div class="av">' + esc((q.name || '?').trim().charAt(0).toUpperCase()) + '</div><div class="pi"><b>' + esc(q.name) + '</b><small>' + fmtDate(q) + ' · ' + esc(q.place.label.split(',')[0]) + '</small></div>' +
        (act ? '<span class="act">' + T('active') + '</span>' : '<button data-open="' + q.id + '">' + T('open') + '</button>') +
        '<button data-del="' + q.id + '" aria-label="delete">🗑️</button></div>';
    }).join('') + '</div><button class="cta" id="btnNew">✦ ' + T('newStudy') + '</button>';
    el.innerHTML = h;
  }
  function kv(k, v) { return '<div class="kv"><span>' + k + '</span><span>' + v + '</span></div>'; }

  function renderAll() {
    if (!S.data) return;
    $('hdrName').textContent = S.data.p.name;
    renderChart(); renderNum(); renderSynth(); renderMe();
  }
  function showView(v) {
    S.view = v;
    document.querySelectorAll('.view').forEach(function (s) { s.classList.toggle('active', s.id === 'view-' + v); });
    document.querySelectorAll('#nav button').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-view') === v); });
    window.scrollTo(0, 0);
    if (v === 'chart') drawWheel();
  }

  /* ---------- perfiles ---------- */
  function activate(id) {
    var p = S.profiles.filter(function (q) { return q.id === id; })[0];
    if (!p) return false;
    S.activeId = id; save('active', id);
    S.data = computeProfile(p);
    ['hdr', 'main', 'nav'].forEach(function (k) { $(k).classList.remove('hidden'); });
    renderAll(); showView(S.view || 'chart');
    return true;
  }

  /* ---------- formulario ---------- */
  function openForm(p) {
    S.editingId = p ? p.id : null;
    $('fName').value = p ? p.name : '';
    $('fDate').value = p ? p.y + '-' + pad(p.m) + '-' + pad(p.d) : '';
    $('fTime').value = p && p.timeKnown ? pad(p.hh) + ':' + pad(p.mm) : '12:00';
    $('fNoTime').checked = p ? !p.timeKnown : false;
    $('fTime').disabled = $('fNoTime').checked;
    $('fOffset').value = p && p.manualOffset != null ? p.manualOffset : '';
    S.place = p ? p.place : null;
    $('fPlace').value = p ? p.place.label : '';
    showChosen();
    $('formErr').classList.add('hidden');
    $('btnCancel').classList.toggle('hidden', !S.profiles.length);
    $('form').classList.remove('hidden'); $('form').scrollTop = 0;
  }
  function closeForm() { $('form').classList.add('hidden'); $('placeList').classList.add('hidden'); }
  function showChosen() {
    var c = $('placeChosen');
    if (S.place) { c.textContent = '📍 ' + S.place.label + ' · ' + S.place.lat.toFixed(2) + '°, ' + S.place.lon.toFixed(2) + '° · ' + (S.place.tz || ''); c.classList.remove('hidden'); }
    else c.classList.add('hidden');
  }
  var CITIES = (window.ORV_CITIES || []).map(function (r) { return { r: r, n: norm(r[0]) }; });
  function searchCities(q) {
    q = norm(q); if (q.length < 2) return [];
    var a = [], b = [];
    for (var i = 0; i < CITIES.length && a.length < 8; i++) {
      var c = CITIES[i];
      if (c.n.indexOf(q) === 0) a.push(c.r); else if (b.length < 8 && (c.n.indexOf(' ' + q) >= 0 || (q.length > 3 && c.n.indexOf(q) > 0))) b.push(c.r);
    }
    return a.concat(b).slice(0, 8);
  }
  var lastResults = [];
  function renderSuggest(list, q) {
    lastResults = list;
    var box = $('placeList');
    var h = list.map(function (r, i) {
      return '<div data-i="' + i + '">' + esc(r.label) + '<small>' + esc(r.sub) + '</small></div>';
    }).join('');
    if (q && q.length >= 3) h += '<div data-online="1" class="online">🌐 ' + esc(T('searchingOnline').replace('…', '')) + ': «' + esc(q) + '»</div>';
    box.innerHTML = h; box.classList.toggle('hidden', !h);
  }
  function onPlaceInput() {
    S.place = null; showChosen();
    var q = $('fPlace').value;
    var res = searchCities(q).map(function (r) {
      return { label: r[0] + (r[1] && r[1] !== r[0] ? ', ' + r[1] : '') + ', ' + r[3], sub: r[3] + ' · ' + r[6], lat: r[4], lon: r[5], tz: r[6] };
    });
    renderSuggest(res, q.trim());
  }
  function onlineSearch(q) {
    var box = $('placeList');
    box.innerHTML = '<div>' + esc(T('searchingOnline')) + '</div>'; box.classList.remove('hidden');
    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=7&addressdetails=0&accept-language=' + S.lang + '&q=' + encodeURIComponent(q);
    fetch(url, { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); }).then(function (js) {
      var res = (js || []).map(function (x) {
        var lat = parseFloat(x.lat), lon = parseFloat(x.lon), tz = '';
        try { tz = window.tzlookup(lat, lon); } catch (e) { }
        var parts = String(x.display_name).split(',').map(function (s) { return s.trim(); });
        var label = parts.length > 3 ? parts[0] + ', ' + parts[parts.length - 3] + ', ' + parts[parts.length - 1] : parts.join(', ');
        return { label: label, sub: x.display_name, lat: lat, lon: lon, tz: tz };
      });
      if (!res.length) { box.innerHTML = '<div>' + esc(T('noResults')) + '</div>'; lastResults = []; return; }
      renderSuggest(res, null);
    }).catch(function () { box.innerHTML = '<div>' + esc(T('noResults')) + '</div>'; });
  }
  function submitForm() {
    var name = $('fName').value.replace(/\s+/g, ' ').trim(), dv = $('fDate').value, tv = $('fTime').value, noTime = $('fNoTime').checked;
    var err = $('formErr');
    if (!name || !dv || !N.clean(name)) { err.textContent = T('missing'); err.classList.remove('hidden'); return; }
    if (!S.place) {
      // intento: tomar la primera coincidencia local
      var r = searchCities($('fPlace').value)[0];
      if (r) S.place = { label: r[0] + (r[1] && r[1] !== r[0] ? ', ' + r[1] : '') + ', ' + r[3], lat: r[4], lon: r[5], tz: r[6] };
    }
    if (!S.place) { err.textContent = T('pickPlace'); err.classList.remove('hidden'); return; }
    var dp = dv.split('-').map(Number), tp = (tv || '12:00').split(':').map(Number);
    var off = $('fOffset').value.replace(',', '.').trim();
    if (off !== '' && isNaN(parseFloat(off))) off = '';
    if (!S.place.tz) S.place.tz = 'UTC';
    var p = { id: S.editingId || ('p' + Date.now()), name: name, y: dp[0], m: dp[1], d: dp[2], hh: tp[0] || 0, mm: tp[1] || 0, timeKnown: !noTime, place: S.place, manualOffset: off === '' ? null : off };
    var idx = S.profiles.map(function (q) { return q.id; }).indexOf(p.id);
    if (idx >= 0) S.profiles[idx] = p; else S.profiles.unshift(p);
    save('profiles', S.profiles);
    closeForm();
    $('loading').classList.remove('hidden');
    startMusic();
    setTimeout(function () {
      try { S.view = 'chart'; S.chartTab = 'triad'; activate(p.id); }
      catch (e) { toast('Error: ' + e.message, 5000); }
      $('loading').classList.add('hidden');
    }, 1700);
  }

  /* ---------- música ---------- */
  var bgm;
  function setVolume(v) { S.vol = v; save('vol', v); if (bgm) bgm.volume = Math.max(0, Math.min(1, v / 100)); }
  function startMusic() {
    if (!S.music || !bgm) return;
    if (!bgm.paused) return;
    bgm.volume = 0;
    var pr = bgm.play();
    if (pr && pr.then) pr.then(fadeIn, function () { });
    else fadeIn();
  }
  function fadeIn() {
    var target = S.vol / 100, v = 0;
    clearInterval(fadeIn._i);
    fadeIn._i = setInterval(function () { v += 0.02; if (v >= target) { v = target; clearInterval(fadeIn._i); } bgm.volume = v; }, 80);
  }
  function stopMusic() { if (bgm) bgm.pause(); }
  function setMusic(on) {
    S.music = on; save('music', on);
    $('btnMusic').classList.toggle('muted', !on); $('setMusic').checked = on;
    if (on) startMusic(); else stopMusic();
  }

  /* ---------- fondo estrellado ---------- */
  var starRun = true;
  function stars() {
    var cv = $('stars'), c = cv.getContext('2d'), st = [], w, h, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() { w = window.innerWidth; h = window.innerHeight; cv.width = w * dpr; cv.height = h * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); window.addEventListener('resize', size);
    for (var i = 0; i < 110; i++) st.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, p: Math.random() * 6.28, s: 0.4 + Math.random() * 1.2, g: Math.random() < 0.18 });
    var last = 0;
    function frame(t) {
      requestAnimationFrame(frame);
      if (!starRun || t - last < 60) return; last = t;
      c.clearRect(0, 0, w, h);
      st.forEach(function (s) {
        var a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(s.p + t / 1000 * s.s));
        c.fillStyle = s.g ? 'rgba(247,207,110,' + a + ')' : 'rgba(255,236,220,' + a * 0.8 + ')';
        c.beginPath(); c.arc(s.x * w, s.y * h, s.r, 0, 6.283); c.fill();
      });
    }
    requestAnimationFrame(frame);
  }

  /* ---------- PDF ---------- */
  var pdfBusy = false;
  function exportPdf(share) {
    if (pdfBusy || !S.data) return;
    if (!window.OrvPDF) { toast(T('pdfError')); return; }
    pdfBusy = true; toast(T('generatingPdf'), 8000);
    setTimeout(function () {
      window.OrvPDF.build(S.data).then(function (res) {
        var b64 = res.doc.output('datauristring').split(',')[1];
        if (NATIVE && NATIVE.savePdf) NATIVE.savePdf(b64, res.fileName, !!share);
        else { res.doc.save(res.fileName); toast(T('pdfReady')); }
        pdfBusy = false;
      }).catch(function (e) { pdfBusy = false; toast(T('pdfError') + ': ' + (e && e.message || e), 5000); });
    }, 60);
  }
  window.__pdfSaved = function (ok) { toast(ok ? T('pdfReady') : T('pdfError')); };

  /* ---------- eventos ---------- */
  function bind() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('button, [data-i], [data-online], .mini.tap');
      if (!t) return;
      if (t.hasAttribute('data-lang')) { setLang(t.getAttribute('data-lang')); return; }
      if (t.hasAttribute('data-view')) { showView(t.getAttribute('data-view')); return; }
      if (t.hasAttribute('data-tab')) {
        S.chartTab = t.getAttribute('data-tab');
        document.querySelectorAll('#chartTabs button').forEach(function (b) { b.classList.toggle('active', b === t); });
        $('chartBody').innerHTML = chartBody(); return;
      }
      if (t.classList.contains('mini')) {
        var grp = t.getAttribute('data-grp'), kind = t.getAttribute('data-kind');
        if (grp === 'core') S.coreSel = kind; else S.cycleSel = kind;
        var y = window.scrollY; renderNum(); window.scrollTo(0, y); return;
      }
      if (t.hasAttribute('data-i')) {
        var r = lastResults[+t.getAttribute('data-i')];
        if (r) { S.place = { label: r.label, lat: r.lat, lon: r.lon, tz: r.tz }; $('fPlace').value = r.label; $('placeList').classList.add('hidden'); showChosen(); }
        return;
      }
      if (t.hasAttribute('data-online')) { onlineSearch($('fPlace').value.trim()); return; }
      if (t.hasAttribute('data-pdf')) { exportPdf(t.getAttribute('data-pdf') === 'share'); return; }
      if (t.hasAttribute('data-open')) { activate(t.getAttribute('data-open')); showView('chart'); return; }
      if (t.hasAttribute('data-del')) {
        var id = t.getAttribute('data-del');
        if (!confirm(T('confirmDelete'))) return;
        S.profiles = S.profiles.filter(function (q) { return q.id !== id; }); save('profiles', S.profiles);
        if (id === S.activeId) { if (S.profiles.length) activate(S.profiles[0].id); else { S.data = null; ['hdr', 'main', 'nav'].forEach(function (k) { $(k).classList.add('hidden'); }); openForm(null); } }
        else renderMe();
        return;
      }
      switch (t.id) {
        case 'btnCalc': submitForm(); break;
        case 'btnCancel': closeForm(); break;
        case 'btnChange': case 'btnNew': openForm(null); break;
        case 'btnEdit': openForm(S.data.p); break;
        case 'btnSettings': $('sheet').classList.remove('hidden'); break;
        case 'btnCloseSheet': $('sheet').classList.add('hidden'); break;
        case 'btnMusic': setMusic(!S.music); toast(S.music ? T('musicOn') : T('musicOff'), 1500); break;
      }
    });
    $('sheet').addEventListener('click', function (e) { if (e.target === $('sheet')) $('sheet').classList.add('hidden'); });
    $('fPlace').addEventListener('input', onPlaceInput);
    $('fPlace').addEventListener('focus', function () { if (!S.place && $('fPlace').value) onPlaceInput(); });
    $('fNoTime').addEventListener('change', function () { $('fTime').disabled = this.checked; });
    $('setMusic').addEventListener('change', function () { setMusic(this.checked); });
    $('setVol').addEventListener('input', function () { setVolume(+this.value); });
    document.addEventListener('pointerdown', function first() { startMusic(); }, { once: true });
    window.addEventListener('resize', function () { if (S.view === 'chart') drawWheel(); });
  }

  /* ---------- ciclo de vida nativo ---------- */
  window.__appPause = function () { starRun = false; if (bgm && !bgm.paused) { bgm.pause(); bgm._wasPlaying = true; } };
  window.__appResume = function () { starRun = true; if (S.music && bgm && bgm._wasPlaying) { bgm._wasPlaying = false; startMusic(); } };
  document.addEventListener('visibilitychange', function () { if (document.hidden) window.__appPause(); else window.__appResume(); });
  window.__appBack = function () {
    if (!$('sheet').classList.contains('hidden')) { $('sheet').classList.add('hidden'); return true; }
    if (!$('form').classList.contains('hidden') && S.data) { closeForm(); return true; }
    if (S.data && S.view !== 'chart') { showView('chart'); return true; }
    return false;
  };

  /* ---------- inicio ---------- */
  function detectLang() {
    var l = load('lang', null);
    if (l) return l;
    var sys = '';
    try { sys = NATIVE && NATIVE.getLanguage ? NATIVE.getLanguage() : navigator.language; } catch (e) { sys = navigator.language || 'es'; }
    sys = String(sys || 'es').slice(0, 2).toLowerCase();
    return LANGS.indexOf(sys) >= 0 ? sys : 'es';
  }
  function init() {
    bgm = $('bgm');
    S.lang = detectLang(); S.profiles = load('profiles', []); S.activeId = load('active', null);
    S.music = load('music', true); S.vol = load('vol', 45);
    $('setVol').value = S.vol; $('setMusic').checked = S.music; $('btnMusic').classList.toggle('muted', !S.music);
    applyStatic(); bind(); stars();
    var ok = S.activeId && activate(S.activeId);
    if (!ok && S.profiles.length) ok = activate(S.profiles[0].id);
    if (!ok) openForm(null);
    setTimeout(startMusic, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
