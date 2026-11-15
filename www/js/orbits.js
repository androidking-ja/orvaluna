/* Orvaluna — mapa planetario del nacimiento (vista heliocéntrica, canvas) */
(function (root) {
  'use strict';
  var ORDER = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  var COL = {
    mercury: '#B9A99A', venus: '#F2D49B', earth: '#5B9BD5', mars: '#E0552B', jupiter: '#E3A869',
    saturn: '#E9C77B', uranus: '#8FD3D6', neptune: '#5B7FD6', pluto: '#B88A78'
  };
  var SIZE = { mercury: 0.020, venus: 0.027, earth: 0.029, mars: 0.023, jupiter: 0.045, saturn: 0.040, uranus: 0.032, neptune: 0.032, pluto: 0.017 };
  var GLYPH = { aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏', sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓' };
  var SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  var ELCOL = ['#E0552B', '#6E9B4E', '#E9B53F', '#4F7FC8'];

  /* opts: size, dpr, names {key: nombre}, earthLabel, moonLon (geocéntrica) */
  function draw(canvas, chart, opts) {
    opts = opts || {};
    var size = opts.size || canvas.clientWidth || 340;
    var dpr = opts.dpr || Math.min(root.devicePixelRatio || 1, 3);
    canvas.width = size * dpr; canvas.height = size * dpr;
    var c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, size, size);
    var cx = size / 2, cy = size / 2, R = size / 2 - 4;
    var sym = '"NotoSym", "Noto Sans Symbols", serif';
    var names = opts.names || {};
    // 0° Aries a la derecha; las longitudes crecen en sentido antihorario (convención astronómica)
    function pt(lon, r) { var th = lon * Math.PI / 180; return [cx + r * Math.cos(th), cy - r * Math.sin(th)]; }

    // fondo: espacio profundo
    var g = c.createRadialGradient(cx, cy, R * 0.05, cx, cy, R);
    g.addColorStop(0, '#2C130D'); g.addColorStop(0.55, '#170B09'); g.addColorStop(1, '#0E0706');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
    // estrellas fijas (deterministas)
    var seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var s = 0; s < 140; s++) {
      var a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * R * 0.86;
      c.fillStyle = 'rgba(255,236,210,' + (0.15 + rnd() * 0.45) + ')';
      c.beginPath(); c.arc(cx + rr * Math.cos(a), cy + rr * Math.sin(a), rnd() * 0.9 + 0.2, 0, Math.PI * 2); c.fill();
    }

    // anillo zodiacal exterior
    var rIn = R * 0.875;
    for (var i = 0; i < 12; i++) {
      var p0 = pt(i * 30, rIn), p1 = pt(i * 30, R);
      c.strokeStyle = 'rgba(242,179,61,0.30)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
      var m = pt(i * 30 + 15, (rIn + R) / 2), br = (R - rIn) * 0.34;
      c.fillStyle = ELCOL[i % 4]; c.globalAlpha = 0.85;
      c.beginPath(); c.arc(m[0], m[1], br, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      c.fillStyle = '#1A0C08'; c.font = Math.round(br * 1.25) + 'px ' + sym; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(GLYPH[SIGNS[i]] + '︎', m[0], m[1] + br * 0.05);
    }
    c.strokeStyle = '#E9B53F'; c.lineWidth = 1.6; c.beginPath(); c.arc(cx, cy, R - 0.8, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 1; c.strokeStyle = 'rgba(242,179,61,0.45)'; c.beginPath(); c.arc(cx, cy, rIn, 0, Math.PI * 2); c.stroke();

    // órbitas: espaciado uniforme (no a escala) para que se lean todas
    var r0 = R * 0.15, r1 = R * 0.80, step = (r1 - r0) / (ORDER.length - 1);
    var orbitR = {}; ORDER.forEach(function (k, idx) { orbitR[k] = r0 + idx * step; });
    ORDER.forEach(function (k) {
      c.strokeStyle = k === 'earth' ? 'rgba(91,155,213,0.55)' : 'rgba(242,179,61,0.16)';
      c.lineWidth = k === 'earth' ? 1.3 : 1;
      c.setLineDash(k === 'pluto' ? [3, 4] : []);
      c.beginPath(); c.arc(cx, cy, orbitR[k], 0, Math.PI * 2); c.stroke();
    });
    c.setLineDash([]);

    var H = {}; (chart.helio || []).forEach(function (h) { H[h.key] = h; });

    // línea Tierra → Sol → signo solar
    if (H.earth) {
      var e = pt(H.earth.lon, orbitR.earth), sunTo = pt(H.earth.lon + 180, rIn);
      var lg = c.createLinearGradient(e[0], e[1], sunTo[0], sunTo[1]);
      lg.addColorStop(0, 'rgba(91,155,213,0.9)'); lg.addColorStop(1, 'rgba(242,179,61,0.95)');
      c.strokeStyle = lg; c.lineWidth = 1.6; c.setLineDash([5, 4]);
      c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(sunTo[0], sunTo[1]); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#F5A623'; c.beginPath(); c.arc(sunTo[0], sunTo[1], 3.2, 0, Math.PI * 2); c.fill();
    }

    // Sol
    var sr = R * 0.07;
    var sg = c.createRadialGradient(cx, cy, 1, cx, cy, sr * 2.6);
    sg.addColorStop(0, 'rgba(255,214,110,0.95)'); sg.addColorStop(0.4, 'rgba(245,166,35,0.55)'); sg.addColorStop(1, 'rgba(245,166,35,0)');
    c.fillStyle = sg; c.beginPath(); c.arc(cx, cy, sr * 2.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#F5A623'; c.beginPath(); c.arc(cx, cy, sr, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#5A2208'; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, sr * 0.5, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#5A2208'; c.beginPath(); c.arc(cx, cy, sr * 0.12, 0, Math.PI * 2); c.fill();

    // planetas
    var fs = Math.max(9, Math.round(R * 0.052)), placed = [{ x0: cx - R * 0.11, x1: cx + R * 0.11, y0: cy - R * 0.11, y1: cy + R * 0.11 }];
    ORDER.forEach(function (k) {
      var h = H[k]; if (!h) return;
      var pos = pt(h.lon, orbitR[k]), pr = Math.max(3, R * SIZE[k]);
      var gl = c.createRadialGradient(pos[0], pos[1], 1, pos[0], pos[1], pr * 2.4);
      gl.addColorStop(0, k === 'earth' ? 'rgba(91,155,213,0.55)' : 'rgba(242,179,61,0.28)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gl; c.beginPath(); c.arc(pos[0], pos[1], pr * 2.4, 0, Math.PI * 2); c.fill();
      if (k === 'saturn') {
        c.strokeStyle = 'rgba(233,199,123,0.85)'; c.lineWidth = 1.2;
        c.beginPath(); c.ellipse(pos[0], pos[1], pr * 1.75, pr * 0.6, -0.4, 0, Math.PI * 2); c.stroke();
      }
      c.fillStyle = COL[k]; c.beginPath(); c.arc(pos[0], pos[1], pr, 0, Math.PI * 2); c.fill();
      if (k === 'earth') {
        c.strokeStyle = '#FFFFFF'; c.lineWidth = 1.4; c.beginPath(); c.arc(pos[0], pos[1], pr + 2.2, 0, Math.PI * 2); c.stroke();
        if (typeof opts.moonLon === 'number') {
          var mp = [pos[0] + (pr + 7) * Math.cos(opts.moonLon * Math.PI / 180), pos[1] - (pr + 7) * Math.sin(opts.moonLon * Math.PI / 180)];
          c.fillStyle = '#F8EBC8'; c.beginPath(); c.arc(mp[0], mp[1], Math.max(1.8, pr * 0.42), 0, Math.PI * 2); c.fill();
        }
      }
      // etiqueta: hacia fuera, girada según el cuadrante para no pisar la órbita
      var label = k === 'earth' ? (opts.earthLabel || names.earth || 'Earth') : (names[k] || k);
      var lp = pt(h.lon, orbitR[k] + pr + fs * 0.95);
      var right = Math.cos(h.lon * Math.PI / 180) >= 0;
      c.font = (k === 'earth' ? '600 ' : '500 ') + fs + 'px Jost, sans-serif';
      c.textAlign = right ? 'left' : 'right'; c.textBaseline = 'middle';
      var lx = lp[0] + (right ? -fs * 0.4 : fs * 0.4), ly = lp[1];
      var tw = c.measureText(label).width, box = function () { return { x0: right ? lx : lx - tw, x1: right ? lx + tw : lx, y0: ly - fs * 0.6, y1: ly + fs * 0.6 }; };
      var hit = function (b) { return placed.some(function (q) { return b.x0 < q.x1 + 2 && b.x1 > q.x0 - 2 && b.y0 < q.y1 && b.y1 > q.y0; }); };
      for (var tries = 0, dir = (ly < cy ? -1 : 1); tries < 6 && hit(box()); tries++) ly += dir * fs * 0.75;
      placed.push(box());
      lp = [lp[0], ly];
      c.lineWidth = 3; c.strokeStyle = 'rgba(14,7,6,0.85)'; c.strokeText(label, lx, ly);
      c.fillStyle = k === 'earth' ? '#BFE0FF' : '#F3E7DA'; c.fillText(label, lx, ly);
    });

    // marca 0° Aries
    var a0 = pt(0, rIn - fs * 0.9);
    c.font = '500 ' + Math.round(fs * 0.85) + 'px Jost, sans-serif'; c.textAlign = 'right'; c.fillStyle = 'rgba(243,231,218,0.55)';
    c.fillText('0°', a0[0], a0[1]);
    return canvas;
  }

  root.OrvOrbits = { draw: draw, COL: COL, ORDER: ORDER };
})(window);
