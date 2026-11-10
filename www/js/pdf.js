/* Orvaluna — exportación del estudio completo a PDF (jsPDF) */
(function () {
  'use strict';
  var loaded = null;
  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('load ' + src)); }; document.head.appendChild(s); });
  }
  function ensureLibs() {
    if (!loaded) loaded = Promise.all([window.jspdf ? 0 : loadScript('lib/jspdf.min.js'), window.ORV_PDF_FONTS ? 0 : loadScript('lib/pdf-fonts.js')]);
    return loaded;
  }

  var C = { cream: [251, 244, 232], wine: [90, 26, 20], ember: [200, 67, 31], gold: [196, 140, 30], text: [52, 38, 30], muted: [122, 101, 88], night: [26, 12, 9], night2: [58, 20, 16], line: [226, 205, 170] };

  function build(data) {
    return ensureLibs().then(function () {
      var fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('20px NotoSym', '♈☽'), document.fonts.load('500 12px Jost')]) : Promise.resolve();
      return fontsReady.then(function () { return make(data); });
    });
  }

  function make(data) {
    var App = window.OrvApp, D = App.D(), T = App.T, fmt = App.fmt, deg = App.deg;
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    var F = window.ORV_PDF_FONTS;
    doc.addFileToVFS('Cinzel.ttf', F.Cinzel); doc.addFont('Cinzel.ttf', 'Cinzel', 'normal');
    doc.addFileToVFS('Jost.ttf', F.Jost); doc.addFont('Jost.ttf', 'Jost', 'normal');
    doc.addFileToVFS('JostM.ttf', F.JostMedium); doc.addFont('JostM.ttf', 'JostM', 'normal');

    var PW = 210, PH = 297, M = 18, CW = PW - 2 * M, y = 0, page = 1;
    var c = data.chart, n = data.num, p = data.p, x = App.ctx();
    var NN = D.num.n;
    function col(a) { doc.setTextColor(a[0], a[1], a[2]); }
    function fill(a) { doc.setFillColor(a[0], a[1], a[2]); }
    function draw(a) { doc.setDrawColor(a[0], a[1], a[2]); }
    function signName(k) { return D.signs[k].name; }
    function strip(s) { return String(s).replace(/[☀-➿︎️]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/℞/g, 'R').trim(); }

    function header() {
      fill(C.cream); doc.rect(0, 0, PW, PH, 'F');
      draw(C.gold); doc.setLineWidth(0.3); doc.line(M, 12, PW - M, 12);
      doc.setFont('Cinzel', 'normal'); doc.setFontSize(8.5); col(C.gold);
      doc.text('ORVALUNA', M, 9.5);
      doc.setFont('Jost', 'normal'); col(C.muted); doc.text(strip(p.name), PW - M, 9.5, { align: 'right' });
      doc.setFontSize(8.5); doc.text(T('pdfPage') + ' ' + page, PW / 2, PH - 8, { align: 'center' });
      draw(C.line); doc.line(M, PH - 13, PW - M, PH - 13);
      y = 22;
    }
    function newPage() { doc.addPage(); page++; header(); }
    function ensure(h) { if (y + h > PH - 18) newPage(); }
    function lh(size) { return size * 0.3528 * 1.42; }
    function h1(t) {
      ensure(24);
      if (y > 30) y += 4;
      doc.setFont('Cinzel', 'normal'); doc.setFontSize(19); col(C.wine);
      doc.text(strip(t), M, y + 6); y += 10;
      draw(C.gold); doc.setLineWidth(0.6); doc.line(M, y, M + 40, y); doc.setLineWidth(0.2); doc.line(M + 42, y, PW - M, y);
      y += 7;
    }
    function h2(t, size) {
      size = size || 12.5;
      ensure(lh(size) + 12);
      y += 2.5;
      doc.setFont('JostM', 'normal'); doc.setFontSize(size); col(C.ember);
      var lines = doc.splitTextToSize(strip(t), CW);
      doc.text(lines, M, y + 4); y += lines.length * lh(size) + 1.5;
    }
    function kicker(t) {
      ensure(8);
      doc.setFont('JostM', 'normal'); doc.setFontSize(8.5); col(C.gold);
      doc.text(strip(t).toUpperCase(), M, y + 3, { charSpace: 0.6 }); y += 5.5;
    }
    function para(t, opt) {
      opt = opt || {};
      var size = opt.size || 10.5, w = opt.w || CW, xx = opt.x || M;
      doc.setFont(opt.bold ? 'JostM' : 'Jost', 'normal'); doc.setFontSize(size); col(opt.color || C.text);
      var lines = doc.splitTextToSize(strip(t), w), l = lh(size);
      for (var i = 0; i < lines.length; i++) {
        ensure(l + 1);
        doc.text(lines[i], xx, y + l * 0.75); y += l;
      }
      y += opt.after == null ? 2.5 : opt.after;
    }
    function boxStart() { return { y: y, page: page }; }
    function numBadge(v, label, title) {
      ensure(22);
      fill(C.wine); doc.roundedRect(M, y, 16, 16, 3, 3, 'F');
      doc.setFont('Cinzel', 'normal'); doc.setFontSize(v > 9 ? 14 : 17); col([247, 207, 110]);
      doc.text(String(v), M + 8, y + 10.8, { align: 'center' });
      doc.setFont('JostM', 'normal'); doc.setFontSize(8.5); col(C.gold); doc.text(strip(label).toUpperCase(), M + 21, y + 4.5, { charSpace: 0.5 });
      doc.setFont('JostM', 'normal'); doc.setFontSize(12.5); col(C.wine);
      var tl = doc.splitTextToSize(strip(title), CW - 22);
      doc.text(tl[0], M + 21, y + 10.5);
      y += 19;
    }
    function table(rows, widths, headRow) {
      var size = 9.5, rh = 6.6;
      var draws = function (r, head, i) {
        ensure(rh);
        if (head) { fill(C.wine); doc.rect(M, y, CW, rh, 'F'); col([251, 230, 190]); doc.setFont('JostM', 'normal'); }
        else { if (i % 2 === 0) { fill([244, 233, 214]); doc.rect(M, y, CW, rh, 'F'); } col(C.text); doc.setFont('Jost', 'normal'); }
        doc.setFontSize(size);
        var xx = M + 2.5;
        r.forEach(function (cell, j) { doc.text(strip(cell), xx, y + 4.5); xx += widths[j]; });
        y += rh;
      };
      if (headRow) draws(headRow, true, 0);
      rows.forEach(function (r, i) { draws(r, false, i); });
      y += 4;
    }

    /* ----- PORTADA ----- */
    fill(C.night); doc.rect(0, 0, PW, PH, 'F');
    // degradado simulado
    for (var i = 0; i < 40; i++) { var t = i / 40; doc.setFillColor(26 + 60 * (1 - t) * 0.6 | 0, 12 + 16 * (1 - t) * 0.6 | 0, 9 + 8 * (1 - t) * 0.6 | 0); doc.rect(0, i * 3.2, PW, 3.3, 'F'); }
    draw(C.gold); doc.setLineWidth(0.5); doc.rect(9, 9, PW - 18, PH - 18); doc.setLineWidth(0.2); doc.rect(11.5, 11.5, PW - 23, PH - 23);
    doc.setFont('Cinzel', 'normal'); doc.setFontSize(30); col([247, 207, 110]);
    doc.text('ORVALUNA', PW / 2, 34, { align: 'center', charSpace: 3 });
    doc.setFont('Jost', 'normal'); doc.setFontSize(10); col([200, 170, 150]);
    doc.text(strip(T('tagline')).toUpperCase(), PW / 2, 41, { align: 'center', charSpace: 1.2 });
    doc.setFont('JostM', 'normal'); doc.setFontSize(12); col([224, 120, 80]);
    doc.text(strip(T('pdfTitle')).toUpperCase(), PW / 2, 55, { align: 'center', charSpace: 0.8 });
    doc.setFont('JostM', 'normal'); doc.setFontSize(24); col([243, 231, 218]);
    var nm = doc.splitTextToSize(strip(p.name), CW); doc.text(nm, PW / 2, 67, { align: 'center' });
    var yy = 67 + (nm.length - 1) * 10;
    var cv = document.createElement('canvas');
    window.OrvWheel.draw(cv, c, { size: 900, dpr: 1, centerLabel: T('triad') });
    var img = cv.toDataURL('image/png');
    var ws = 138; doc.addImage(img, 'PNG', (PW - ws) / 2, yy + 10, ws, ws);
    var by = yy + 10 + ws + 10;
    doc.setFont('JostM', 'normal'); doc.setFontSize(12.5); col([247, 207, 110]);
    var triad = T('sun') + ' ' + D.signs[c.planets[0].sign].in + '  ·  ' + T('moon') + ' ' + D.signs[c.planets[1].sign].in + (c.timeKnown ? '  ·  ' + T('ascFull') + ' ' + D.signs[c.asc.sign].in : '');
    doc.text(doc.splitTextToSize(strip(triad), CW), PW / 2, by, { align: 'center' });
    doc.setFont('Jost', 'normal'); doc.setFontSize(11); col([220, 200, 185]);
    doc.text(strip(T('lifePath') + ' ' + n.birth.lifePath.value + ' · ' + NN[n.birth.lifePath.value].title), PW / 2, by + 8, { align: 'center' });
    var dateStr;
    try { dateStr = new Intl.DateTimeFormat(App.lang(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(p.y, p.m - 1, p.d))); } catch (e) { dateStr = p.d + '/' + p.m + '/' + p.y; }
    var pad = function (v) { return (v < 10 ? '0' : '') + v; };
    doc.setFontSize(10); col([180, 155, 140]);
    doc.text(strip(dateStr + (p.timeKnown ? ' · ' + pad(p.hh) + ':' + pad(p.mm) : '') + ' · ' + p.place.label), PW / 2, by + 15, { align: 'center', maxWidth: CW });
    var gen;
    try { gen = new Intl.DateTimeFormat(App.lang(), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); } catch (e) { gen = new Date().toISOString().slice(0, 10); }
    doc.setFontSize(8.5); col([150, 125, 110]);
    doc.text(strip(T('pdfGenerated') + ' ' + gen), PW / 2, PH - 18, { align: 'center' });

    /* ----- CARTA NATAL ----- */
    newPage();
    h1(T('pdfChartSection'));
    kicker(T('pdfPositions'));
    var rows = c.planets.map(function (pl) { return [D.planets[pl.key].name + (pl.retro && pl.key !== 'node' ? ' (R)' : ''), signName(pl.sign), deg(pl.deg), c.timeKnown ? String(pl.house) : '—']; });
    if (c.timeKnown) { rows.push([T('ascFull'), signName(c.asc.sign), deg(c.asc.deg), '1']); rows.push([T('mc'), signName(c.mc.sign), deg(c.mc.deg), '10']); }
    table(rows, [52, 52, 40, 30], [T('planet'), T('sign'), T('degree'), T('house')]);
    if (!c.timeKnown) para(T('noTimeNote'), { size: 9, color: C.muted });

    h2(T('triad'));
    var sun = c.planets[0], moon = c.planets[1];
    kicker(T('solarSign') + ' — ' + signName(sun.sign) + ' ' + deg(sun.deg)); para(D.signs[sun.sign].sun);
    kicker(T('lunarSign') + ' — ' + signName(moon.sign) + ' ' + deg(moon.deg)); para(D.signs[moon.sign].moon);
    if (c.timeKnown) { kicker(T('ascSign') + ' — ' + signName(c.asc.sign) + ' ' + deg(c.asc.deg)); para(D.signs[c.asc.sign].asc); }

    h2(T('elementBalance') + ' & ' + T('modeBalance'));
    var tot = 0; Object.keys(c.elements).forEach(function (k) { tot += c.elements[k]; });
    var mt = 0; Object.keys(c.modes).forEach(function (k) { mt += c.modes[k]; });
    ensure(30);
    var by2 = y;
    ['fire', 'earth', 'air', 'water'].forEach(function (k, i) {
      var pc = c.elements[k] / tot, cols = { fire: [224, 85, 43], earth: [110, 155, 78], air: [222, 168, 50], water: [79, 127, 200] };
      doc.setFont('Jost', 'normal'); doc.setFontSize(9.5); col(C.text); doc.text(D.elements[k].name, M, by2 + 4 + i * 7);
      fill([236, 222, 198]); doc.roundedRect(M + 24, by2 + 1.3 + i * 7, 55, 3.6, 1.8, 1.8, 'F');
      fill(cols[k]); doc.roundedRect(M + 24, by2 + 1.3 + i * 7, Math.max(2, 55 * pc), 3.6, 1.8, 1.8, 'F');
      col(C.muted); doc.text(Math.round(pc * 100) + '%', M + 82, by2 + 4 + i * 7);
    });
    ['cardinal', 'fixed', 'mutable'].forEach(function (k, i) {
      var pc = c.modes[k] / mt, xx = M + 100;
      doc.setFont('Jost', 'normal'); doc.setFontSize(9.5); col(C.text); doc.text(D.modes[k].name, xx, by2 + 4 + i * 7);
      fill([236, 222, 198]); doc.roundedRect(xx + 24, by2 + 1.3 + i * 7, 38, 3.6, 1.8, 1.8, 'F');
      fill(C.ember); doc.roundedRect(xx + 24, by2 + 1.3 + i * 7, Math.max(2, 38 * pc), 3.6, 1.8, 1.8, 'F');
      col(C.muted); doc.text(Math.round(pc * 100) + '%', xx + 65, by2 + 4 + i * 7);
    });
    y = by2 + 31;
    para(D.elements[c.dominantElement].dom); para(D.elements[c.weakElement].lack); para(D.modes[c.dominantMode].dom);
    if (c.timeKnown) {
      var hem = c.hemispheres;
      para(hem.upper >= hem.lower ? D.hemis.upper : D.hemis.lower); para(hem.east >= hem.west ? D.hemis.east : D.hemis.west);
      var ruler = c.planets.filter(function (q) { return q.key === c.chartRuler; })[0];
      kicker(T('chartRuler')); para(fmt(D.ascRulerTxt, { planet: D.planets[ruler.key].name, sign: D.signs[ruler.sign].in, house: ruler.house }));
      kicker(T('mc') + ' — ' + signName(c.mc.sign)); para(fmt(D.mcTxt, { sign: D.signs[c.mc.sign].in, style: D.signs[c.mc.sign].style }));
    }

    h2(T('planets'));
    c.planets.forEach(function (pl) {
      kicker(D.planets[pl.key].name + ' — ' + signName(pl.sign) + ' ' + deg(pl.deg) + (c.timeKnown ? ' · ' + T('house') + ' ' + pl.house : '') + (pl.retro && pl.key !== 'node' ? ' · ' + T('retro') : ''));
      para(App.planetText(pl));
    });

    if (c.timeKnown) {
      h2(T('houses'));
      c.houses.forEach(function (h, i) {
        var inside = c.planets.filter(function (q) { return q.house === i + 1; }).map(function (q) { return D.planets[q.key].name; });
        kicker(D.houses[i].name + ' — ' + signName(h.sign) + ' ' + deg(h.deg) + (inside.length ? ' · ' + inside.join(', ') : ''));
        para(App.houseText(i));
      });
      para(T('houseSystemNote') + ': ' + T(c.houseSystem), { size: 9, color: C.muted });
    }

    h2(T('aspects'));
    c.aspects.slice(0, 24).forEach(function (a) {
      var as = D.aspects[a.type];
      kicker(D.planets[a.a].name + ' ' + as.verb + ' ' + D.planets[a.b].name + ' · ' + as.name + ' (' + T('orb') + ' ' + a.orb.toFixed(1) + '°)');
      para(as.text.charAt(0).toUpperCase() + as.text.slice(1));
    });

    /* ----- NUMEROLOGÍA ----- */
    newPage();
    h1(T('pdfNumSection'));
    var lp = n.birth.lifePath.value;
    numBadge(lp, T('lifePath') + (lp > 9 ? ' · ' + T('masterNumber') : '') + (n.birth.lifePath.karmic ? ' · ' + T('karmicDebtTag') + ' ' + n.birth.lifePath.karmic : ''), NN[lp].title);
    kicker(T('purpose')); para(NN[lp].essence);
    kicker(T('shadowAspect')); para(NN[lp].shadow);
    kicker(T('love')); para(NN[lp].love);
    kicker(T('vocation')); para(NN[lp].career);

    h2(T('coreNumbers'));
    ['expression', 'soul', 'personality', 'birthday', 'maturity', 'attitude'].forEach(function (k) {
      var d = App.numDetail(k);
      numBadge(d.v, d.label + (d.karmic ? ' · ' + T('karmicDebtTag') + ' ' + d.karmic : ''), d.title);
      para(T(k + 'Sub') + '. ' + d.txt);
    });
    h2(T('cycles'));
    ['personalYear', 'personalMonth', 'universalYear'].forEach(function (k) {
      var d = App.numDetail(k);
      numBadge(d.v, d.label, d.title);
      para(d.txt);
    });

    h2(T('pinnacles') + ' & ' + T('challenges'));
    para(T('pinnaclesSub') + '.', { size: 9.5, color: C.muted });
    n.birth.pinnacles.forEach(function (pi, i) {
      var ages = pi.to === null ? T('fromAge') + ' ' + pi.from + ' ' + T('onwards') : pi.from + ' – ' + pi.to + ' ' + T('years');
      kicker((i + 1) + '. ' + T('pinnacles').replace(/s$/, '') + ' ' + pi.value + ' · ' + ages + (i === n.currentPinnacle ? ' · ' + T('current') : ''));
      para(NN[pi.value].title + ': ' + NN[pi.value].pinnacle);
      para(D.num.challenges[n.birth.challenges[i]], { color: C.muted, size: 10 });
    });
    h2(T('lifeCycles'));
    n.birth.cycles.forEach(function (cy, i) {
      var ages = cy.to === null ? T('fromAge') + ' ' + cy.from + ' ' + T('onwards') : cy.from + ' – ' + cy.to + ' ' + T('years');
      para(T('cyclesNames')[i] + ' (' + ages + '): ' + cy.value + ' — ' + NN[cy.value].kw + '.');
    });

    h2(T('karma'));
    kicker(T('karmicDebts'));
    if (n.karmicDebts.length) n.karmicDebts.forEach(function (k) { para(D.num.debts[k]); }); else para(T('noDebts'));
    kicker(T('karmicLessons'));
    if (n.name.karmicLessons.length) n.name.karmicLessons.forEach(function (k) { para(D.num.lessons[k]); }); else para(T('noLessons'));

    h2(T('nameMap'));
    kicker(T('inclusion'));
    ensure(18);
    var inc = n.name.inclusion, cw = CW / 9;
    inc.forEach(function (cnt, i) {
      var xx = M + i * cw;
      fill(cnt === 0 ? [248, 220, 205] : [244, 233, 214]); doc.roundedRect(xx + 0.8, y, cw - 1.6, 14, 2, 2, 'F');
      doc.setFont('Cinzel', 'normal'); doc.setFontSize(12); col(cnt === 0 ? C.ember : C.wine); doc.text(String(i + 1), xx + cw / 2, y + 6, { align: 'center' });
      doc.setFont('Jost', 'normal'); doc.setFontSize(8.5); col(C.muted); doc.text('x ' + cnt, xx + cw / 2, y + 11.3, { align: 'center' });
    });
    y += 18;
    var lv = window.OrvNum.letterValue;
    para(T('hiddenPassion') + ': ' + n.name.hiddenPassion.join(', ') + ' — ' + n.name.hiddenPassion.map(function (v) { return NN[v].kw; }).join(' / '));
    para(T('balance') + ': ' + n.name.balance + ' — ' + D.num.balance[n.name.balance]);
    if (n.name.cornerstone) para(T('cornerstone') + ' (' + n.name.cornerstone + '): ' + fmt(T('cornerstoneTxt'), { n: lv(n.name.cornerstone), kw: NN[lv(n.name.cornerstone)].kw }));
    if (n.name.capstone) para(T('capstone') + ' (' + n.name.capstone + '): ' + fmt(T('capstoneTxt'), { n: lv(n.name.capstone), kw: NN[lv(n.name.capstone)].kw }));
    if (n.name.firstVowel) para(T('firstVowel') + ' (' + n.name.firstVowel + '): ' + fmt(T('firstVowelTxt'), { n: lv(n.name.firstVowel), kw: NN[lv(n.name.firstVowel)].kw }));
    var sub = n.name.subconscious, lvl = T('lvl')[sub <= 5 ? 0 : sub <= 6 ? 1 : sub <= 8 ? 2 : 3];
    para(T('subconscious') + ' ' + sub + ': ' + fmt(T('subconsciousTxt'), { n: sub, lvl: lvl }));
    para(T('rational') + ' ' + n.rationalThought + ': ' + fmt(T('rationalTxt'), { n: n.rationalThought, kw: NN[n.rationalThought].kw }));

    /* ----- SÍNTESIS ----- */
    newPage();
    h1(T('pdfSynthSection'));
    kicker(T('fusionKicker')); h2(T('fusion'));
    x.fusion.forEach(function (s) { para(s, { size: 11 }); });
    h2(T('powerMap'));
    kicker(T('motor')); para(x.motor, { size: 11 });
    kicker(T('compass')); para(x.compass, { size: 11 });
    kicker(T('mandate') + ' (' + lp + ')'); para(x.mandate, { size: 11 });
    kicker(T('moment')); para(x.moment, { size: 11 });
    kicker(T('gifts')); para(x.gifts, { size: 11 });
    kicker(T('growth')); para(x.growth, { size: 11 });


    var cr = App.careers();
    h2(T('careersTitle'));
    para(cr.lead, { size: 11 });
    kicker(T('careersTop')); para(cr.top.join('  ·  '), { size: 11.5, bold: true, color: C.wine });
    cr.groups.forEach(function (g) { kicker(g.label); para(g.items.join(' · '), { size: 10.5 }); });
    kicker(T('idealEnv')); para(cr.env, { size: 11 });
    // decreto en recuadro
    doc.setFont('Jost', 'normal'); doc.setFontSize(12.5);
    var dl = doc.splitTextToSize('"' + strip(x.decree) + '"', CW - 24);
    var bh = dl.length * lh(12.5) + 28;
    ensure(bh + 6); y += 4;
    fill([58, 20, 16]); doc.roundedRect(M, y, CW, bh, 5, 5, 'F');
    draw(C.gold); doc.setLineWidth(0.4); doc.roundedRect(M + 2, y + 2, CW - 4, bh - 4, 4, 4);
    doc.setFont('JostM', 'normal'); doc.setFontSize(9); col([247, 207, 110]);
    doc.text(strip(T('decree')).toUpperCase(), PW / 2, y + 10, { align: 'center', charSpace: 0.8 });
    doc.setFont('Jost', 'normal'); doc.setFontSize(12.5); col([243, 231, 218]);
    doc.text(dl, PW / 2, y + 18, { align: 'center' });
    doc.setFontSize(9); col([190, 160, 140]);
    doc.text(strip(T('decreeSign')), PW / 2, y + bh - 6, { align: 'center' });
    y += bh + 8;
    para(T('aboutTxt'), { size: 8.5, color: C.muted });

    var safe = window.OrvNum.clean(p.name).replace(/\s+/g, '_') || 'Estudio';
    return { doc: doc, fileName: 'Orvaluna_' + safe + '_' + p.y + pad(p.m) + pad(p.d) + '.pdf' };
  }

  window.OrvPDF = { build: build };
})();
