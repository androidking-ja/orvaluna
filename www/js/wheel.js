/* Orvaluna — rueda zodiacal en canvas (pantalla y PDF) */
(function (root) {
  'use strict';
  var GLYPH = { aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓' };
  var PGLYPH = { sun: '', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇', node: '☊' };
  var ELCOL = { fire: '#E0552B', earth: '#6E9B4E', air: '#E9B53F', water: '#4F7FC8' };
  var EL = ['fire', 'earth', 'air', 'water'];
  var SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  var ASPCOL = { conjunction: '#F2B33D', sextile: '#5FB3A8', trine: '#5B8FD6', square: '#D9483B', opposition: '#C2413A' };

  function draw(canvas, chart, opts) {
    opts = opts || {};
    var size = opts.size || canvas.clientWidth || 340;
    var dpr = opts.dpr || Math.min(root.devicePixelRatio || 1, 3);
    canvas.width = size * dpr; canvas.height = size * dpr;
    var c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, size, size);
    var cx = size / 2, cy = size / 2, R = size / 2 - 4;
    var asc = chart.timeKnown ? chart.asc.lon : 0;
    var sym = '"NotoSym", "Noto Sans Symbols", "Noto Sans Symbols 2", serif';
    function pt(lon, r) { var th = Math.PI + (lon - asc) * Math.PI / 180; return [cx + r * Math.cos(th), cy - r * Math.sin(th)]; }

    // fondo
    var g = c.createRadialGradient(cx, cy * 0.9, R * 0.1, cx, cy, R);
    g.addColorStop(0, '#3B1A12'); g.addColorStop(0.6, '#22100C'); g.addColorStop(1, '#170A08');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();

    var rOut = R, rSign = R * 0.83, rHouse = R * 0.66, rPlan = R * 0.57, rAsp = R * 0.42;
    // anillo zodiacal
    c.lineWidth = 1;
    for (var i = 0; i < 12; i++) {
      var a0 = i * 30;
      var p0 = pt(a0, rSign), p1 = pt(a0, rOut);
      c.strokeStyle = 'rgba(242,179,61,0.28)'; c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
      // ticks cada 5°
      for (var k = 1; k < 6; k++) {
        var q0 = pt(a0 + k * 5, rSign), q1 = pt(a0 + k * 5, rSign + (k === 3 ? 6 : 3.5));
        c.strokeStyle = 'rgba(242,179,61,0.25)'; c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.stroke();
      }
      var mid = pt(a0 + 15, (rSign + rOut) / 2), col = ELCOL[EL[i % 4]];
      var br = (rOut - rSign) * 0.36;
      c.fillStyle = col; c.globalAlpha = 0.85; c.beginPath(); c.arc(mid[0], mid[1], br, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      c.fillStyle = '#1A0C08'; c.font = Math.round(br * 1.25) + 'px ' + sym; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(GLYPH[SIGNS[i]] + '︎', mid[0], mid[1] + br * 0.05);
    }
    c.strokeStyle = '#E9B53F'; c.lineWidth = 1.6; c.beginPath(); c.arc(cx, cy, rOut - 0.8, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1; c.strokeStyle = 'rgba(242,179,61,0.45)'; c.beginPath(); c.arc(cx, cy, rSign, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(242,179,61,0.18)'; c.beginPath(); c.arc(cx, cy, rHouse, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(224,85,43,0.35)'; c.beginPath(); c.arc(cx, cy, rAsp, 0, Math.PI * 2); c.stroke();

    // casas
    if (chart.timeKnown) {
      chart.houses.forEach(function (h, idx) {
        var axis = idx === 0 || idx === 3 || idx === 6 || idx === 9;
        var a = pt(h.lon, rAsp), b = pt(h.lon, rSign);
        c.strokeStyle = axis ? 'rgba(242,179,61,0.85)' : 'rgba(242,179,61,0.22)';
        c.lineWidth = axis ? 1.4 : 1; c.setLineDash(axis ? [4, 3] : []);
        c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.setLineDash([]);
        var next = chart.houses[(idx + 1) % 12].lon, span = (next - h.lon + 360) % 360;
        var np = pt(h.lon + span / 2, rAsp + (rHouse - rAsp) * 0.18);
        c.fillStyle = 'rgba(243,231,218,0.45)'; c.font = '500 ' + Math.round(R * 0.045) + 'px Jost, sans-serif';
        c.fillText(String(idx + 1), np[0], np[1]);
      });
      // marcas AC / MC
      [['AC', chart.asc.lon], ['MC', chart.mc.lon]].forEach(function (m) {
        var p = pt(m[1], rSign - R * 0.02);
        var rr = R * 0.065;
        c.fillStyle = '#C8431F'; c.beginPath(); c.arc(p[0], p[1], rr, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#FFF3E0'; c.font = '600 ' + Math.round(rr * 0.85) + 'px Jost, sans-serif'; c.fillText(m[0], p[0], p[1] + 0.5);
      });
    }

    // aspectos
    var byKey = {}; chart.planets.forEach(function (p) { byKey[p.key] = p; });
    byKey.asc = { lon: chart.asc.lon }; byKey.mc = { lon: chart.mc.lon };
    chart.aspects.forEach(function (as) {
      if (as.type === 'conjunction') return;
      if (as.a === 'node' || as.b === 'node') return;
      var A = byKey[as.a], B = byKey[as.b]; if (!A || !B) return;
      var p = pt(A.lon, rAsp), q = pt(B.lon, rAsp);
      c.strokeStyle = ASPCOL[as.type]; c.globalAlpha = Math.max(0.25, 0.85 - as.orb / 10);
      c.lineWidth = as.orb < 2 ? 1.6 : 1;
      if (as.type === 'sextile') c.setLineDash([3, 3]);
      c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    });

    // planetas con separación anti-colisión
    var list = chart.planets.map(function (p) { return { key: p.key, lon: p.lon, show: p.lon, retro: p.retro }; })
      .sort(function (a, b) { return a.lon - b.lon; });
    var minSep = 9.5;
    for (var it = 0; it < 30; it++) {
      var moved = false;
      for (var j = 0; j < list.length; j++) {
        var a1 = list[j], b1 = list[(j + 1) % list.length];
        var d = (b1.show - a1.show + 360) % 360;
        if (d < minSep && list.length > 1) { var push = (minSep - d) / 2; a1.show -= push; b1.show += push; moved = true; }
      }
      if (!moved) break;
    }
    list.forEach(function (p) {
      var real = pt(p.lon, rSign), tick = pt(p.lon, rSign - R * 0.035);
      c.strokeStyle = 'rgba(242,179,61,0.8)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(real[0], real[1]); c.lineTo(tick[0], tick[1]); c.stroke();
      var pos = pt(p.show, rPlan + (rHouse - rPlan) * 0.7);
      var r = R * 0.058;
      var isLum = p.key === 'sun' || p.key === 'moon';
      var gg = c.createRadialGradient(pos[0], pos[1], 1, pos[0], pos[1], r * 1.6);
      gg.addColorStop(0, isLum ? 'rgba(255,196,80,0.55)' : 'rgba(242,179,61,0.25)'); gg.addColorStop(1, 'rgba(242,179,61,0)');
      c.fillStyle = gg; c.beginPath(); c.arc(pos[0], pos[1], r * 1.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = p.key === 'sun' ? '#F5A623' : p.key === 'moon' ? '#F8EBC8' : '#2A140E';
      c.strokeStyle = '#E9B53F'; c.lineWidth = 1.1;
      c.beginPath(); c.arc(pos[0], pos[1], r, 0, Math.PI * 2); c.fill(); c.stroke();
      if (p.key === 'sun') {
        c.strokeStyle = '#5A2208'; c.lineWidth = 1.3; c.beginPath(); c.arc(pos[0], pos[1], r * 0.55, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#5A2208'; c.beginPath(); c.arc(pos[0], pos[1], r * 0.14, 0, Math.PI * 2); c.fill();
      } else {
        c.fillStyle = p.key === 'moon' ? '#5A3A10' : '#F5C451';
        c.font = Math.round(r * 1.25) + 'px ' + sym;
        c.fillText(PGLYPH[p.key] + '︎', pos[0], pos[1] + r * 0.06);
      }
      if (p.retro && p.key !== 'node') {
        c.fillStyle = '#E0552B'; c.font = '600 ' + Math.round(r * 0.7) + 'px Jost, sans-serif';
        c.fillText('R', pos[0] + r * 0.95, pos[1] + r * 0.85);
      }
    });

    // centro
    var cr = R * 0.2;
    var cg = c.createRadialGradient(cx, cy, 1, cx, cy, cr);
    cg.addColorStop(0, '#4A2014'); cg.addColorStop(1, '#2A120D');
    c.fillStyle = cg; c.beginPath(); c.arc(cx, cy, cr, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(242,179,61,0.4)'; c.beginPath(); c.arc(cx, cy, cr, 0, Math.PI * 2); c.stroke();
    var triad = [chart.planets[0].sign, chart.planets[1].sign]; if (chart.timeKnown) triad.push(chart.asc.sign);
    var tr = cr * 0.24, sx = cx - (triad.length - 1) * tr * 1.25;
    triad.forEach(function (s, i) {
      var x = sx + i * tr * 2.5, y = cy - cr * 0.22;
      c.fillStyle = ELCOL[EL[SIGNS.indexOf(s) % 4]]; c.beginPath(); c.arc(x, y, tr, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1A0C08'; c.font = Math.round(tr * 1.3) + 'px ' + sym; c.fillText(GLYPH[s] + '︎', x, y + tr * 0.05);
    });
    c.fillStyle = 'rgba(243,231,218,0.75)'; c.font = '500 ' + Math.round(cr * 0.2) + 'px Jost, sans-serif';
    if (c.letterSpacing !== undefined) c.letterSpacing = '2px';
    c.fillText((opts.centerLabel || 'TRÍADA').toUpperCase(), cx, cy + cr * 0.32);
    if (c.letterSpacing !== undefined) c.letterSpacing = '0px';
    return canvas;
  }

  root.OrvWheel = { draw: draw, GLYPH: GLYPH, PGLYPH: PGLYPH, ELCOL: ELCOL };
})(window);
