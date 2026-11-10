/* Orvaluna — motor astrológico (tropical, geocéntrico, casas Placidus) */
(function (root) {
  'use strict';
  var A = root.Astronomy || (typeof require !== 'undefined' ? require('astronomy-engine') : null);
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function norm(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function sind(x) { return Math.sin(x * D2R); }
  function cosd(x) { return Math.cos(x * D2R); }
  function tand(x) { return Math.tan(x * D2R); }
  function atan2d(y, x) { return Math.atan2(y, x) * R2D; }

  var SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  var ELEMENT = ['fire', 'earth', 'air', 'water'];
  var MODE = ['cardinal', 'fixed', 'mutable'];
  var PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node'];
  var BODY = { mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto' };
  var RULER = { aries: 'mars', taurus: 'venus', gemini: 'mercury', cancer: 'moon', leo: 'sun', virgo: 'mercury', libra: 'venus', scorpio: 'pluto', sagittarius: 'jupiter', capricorn: 'saturn', aquarius: 'uranus', pisces: 'neptune' };

  function signOf(lon) { var i = Math.floor(norm(lon) / 30); return { index: i, key: SIGNS[i], deg: norm(lon) - i * 30 }; }

  function lonOf(key, date) {
    if (key === 'sun') return A.SunPosition(date).elon;
    if (key === 'moon') return A.EclipticGeoMoon(date).lon;
    if (key === 'node') {
      // nodo norte medio (Meeus)
      var t = A.MakeTime(date);
      var T = t.tt / 36525;
      return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441);
    }
    var v = A.GeoVector(A.Body[BODY[key]], date, true);
    return A.Ecliptic(v).elon;
  }

  function planetPos(key, date) {
    var lon = norm(lonOf(key, date));
    var retro = false, speed = 0;
    if (key === 'node') { retro = true; speed = -0.053; }
    else {
      var d1 = new Date(date.getTime() - 43200000), d2 = new Date(date.getTime() + 43200000);
      var a = lonOf(key, d1), b = lonOf(key, d2);
      speed = ((b - a + 540) % 360) - 180;
      retro = speed < 0;
    }
    var s = signOf(lon);
    return { key: key, lon: lon, sign: s.key, signIndex: s.index, deg: s.deg, retro: retro, speed: speed };
  }

  // Ascendente, MC y casas Placidus (Porphyry como respaldo en latitudes extremas)
  function angles(date, lat, lon) {
    var t = A.MakeTime(date);
    var eps = A.e_tilt(t).tobl;
    var gast = A.SiderealTime(date); // horas
    var ramc = norm(gast * 15 + lon);
    var mc = norm(atan2d(sind(ramc), cosd(ramc) * cosd(eps)));
    var asc = norm(atan2d(cosd(ramc), -(sind(ramc) * cosd(eps) + tand(lat) * sind(eps))));
    // asegurar que el MC quede sobre el horizonte correcto
    if (Math.abs(((mc - ramc + 540) % 360) - 180) > 90) mc = norm(mc + 180);
    return { ramc: ramc, eps: eps, mc: mc, asc: asc };
  }

  function raToLon(ra, eps) { return norm(atan2d(sind(ra), cosd(ra) * cosd(eps))); }

  function placidusCusp(ramc, eps, lat, f, above) {
    var lonG = raToLon(ramc + (above ? f * 90 : 180 - f * 90), eps);
    for (var i = 0; i < 40; i++) {
      var dec = Math.asin(sind(eps) * sind(lonG)) * R2D;
      var x = tand(lat) * tand(dec);
      if (Math.abs(x) >= 1) return null;
      var ad = Math.asin(x) * R2D;
      var ra = above ? ramc + f * (90 + ad) : ramc + 180 - f * (90 - ad);
      var nl = raToLon(ra, eps);
      if (Math.abs(((nl - lonG + 540) % 360) - 180) < 1e-7) { lonG = nl; break; }
      lonG = nl;
    }
    return lonG;
  }

  function houses(date, lat, lon) {
    var an = angles(date, lat, lon);
    var c = new Array(12);
    c[0] = an.asc; c[9] = an.mc; c[3] = norm(an.mc + 180); c[6] = norm(an.asc + 180);
    var system = 'placidus';
    var h11 = placidusCusp(an.ramc, an.eps, lat, 1 / 3, true),
      h12 = placidusCusp(an.ramc, an.eps, lat, 2 / 3, true),
      h2 = placidusCusp(an.ramc, an.eps, lat, 2 / 3, false),
      h3 = placidusCusp(an.ramc, an.eps, lat, 1 / 3, false);
    if (h11 === null || h12 === null || h2 === null || h3 === null || Math.abs(lat) > 66) {
      system = 'porphyry';
      var q1 = (an.asc - an.mc + 360) % 360; // MC -> ASC
      var q2 = (norm(an.mc + 180) - an.asc + 360) % 360; // ASC -> IC
      h11 = norm(an.mc + q1 / 3); h12 = norm(an.mc + 2 * q1 / 3);
      h2 = norm(an.asc + q2 / 3); h3 = norm(an.asc + 2 * q2 / 3);
    }
    c[10] = h11; c[11] = h12; c[1] = h2; c[2] = h3;
    c[4] = norm(h11 + 180); c[5] = norm(h12 + 180); c[7] = norm(h2 + 180); c[8] = norm(h3 + 180);
    return { cusps: c, asc: an.asc, mc: an.mc, system: system };
  }

  function houseOf(lon, cusps) {
    for (var i = 0; i < 12; i++) {
      var a = cusps[i], b = cusps[(i + 1) % 12];
      var span = (b - a + 360) % 360, d = (lon - a + 360) % 360;
      if (d < span) return i + 1;
    }
    return 1;
  }

  var ASPECTS = [
    { key: 'conjunction', angle: 0, orb: 8, sym: '☌' },
    { key: 'sextile', angle: 60, orb: 5, sym: '⚹' },
    { key: 'square', angle: 90, orb: 7, sym: '□' },
    { key: 'trine', angle: 120, orb: 7, sym: '△' },
    { key: 'opposition', angle: 180, orb: 8, sym: '☍' }
  ];

  function aspects(points) {
    var out = [];
    for (var i = 0; i < points.length; i++) for (var j = i + 1; j < points.length; j++) {
      var p = points[i], q = points[j];
      if ((p.key === 'node' && q.key !== 'sun' && q.key !== 'moon' && q.key !== 'asc') && false) continue;
      var d = Math.abs(((p.lon - q.lon + 540) % 360) - 180);
      for (var k = 0; k < ASPECTS.length; k++) {
        var as = ASPECTS[k];
        var orb = as.orb;
        if (p.key === 'sun' || p.key === 'moon' || q.key === 'sun' || q.key === 'moon') orb += 1;
        if (p.key === 'node' || q.key === 'node' || p.key === 'asc' || q.key === 'asc' || p.key === 'mc' || q.key === 'mc') orb -= 2;
        var diff = Math.abs(d - as.angle);
        if (diff <= orb) { out.push({ a: p.key, b: q.key, type: as.key, sym: as.sym, orb: diff, exact: d }); break; }
      }
    }
    out.sort(function (x, y) { return x.orb - y.orb; });
    return out;
  }

  function computeChart(utcDate, lat, lon, timeKnown) {
    var planets = PLANETS.map(function (k) { return planetPos(k, utcDate); });
    var h = houses(utcDate, lat, lon);
    var asc = signOf(h.asc), mc = signOf(h.mc);
    planets.forEach(function (p) { p.house = houseOf(p.lon, h.cusps); });
    var points = planets.slice();
    if (timeKnown) {
      points.push({ key: 'asc', lon: h.asc });
      points.push({ key: 'mc', lon: h.mc });
    }
    var asp = aspects(points.filter(function (p) { return timeKnown || p.key !== 'moon' || true; }));
    // balance de elementos y modalidades (ponderado)
    var W = { sun: 3, moon: 3, mercury: 2, venus: 2, mars: 2, jupiter: 1.5, saturn: 1.5, uranus: 1, neptune: 1, pluto: 1 };
    var el = { fire: 0, earth: 0, air: 0, water: 0 }, mo = { cardinal: 0, fixed: 0, mutable: 0 };
    planets.forEach(function (p) {
      if (!W[p.key]) return;
      el[ELEMENT[p.signIndex % 4]] += W[p.key]; mo[MODE[p.signIndex % 3]] += W[p.key];
    });
    if (timeKnown) { el[ELEMENT[asc.index % 4]] += 3; mo[MODE[asc.index % 3]] += 3; }
    var hem = { upper: 0, lower: 0, east: 0, west: 0 };
    planets.forEach(function (p) {
      if (p.key === 'node') return;
      if (p.house >= 7) hem.upper++; else hem.lower++; // casas 7-12 sobre el horizonte
      if (p.house >= 10 || p.house <= 3) hem.east++; else hem.west++;
    });
    var domEl = Object.keys(el).sort(function (a, b) { return el[b] - el[a]; });
    var domMo = Object.keys(mo).sort(function (a, b) { return mo[b] - mo[a]; });
    var cuspSigns = h.cusps.map(function (c) { var s = signOf(c); return { lon: c, sign: s.key, deg: s.deg }; });
    return {
      planets: planets, asc: { lon: h.asc, sign: asc.key, deg: asc.deg, signIndex: asc.index },
      mc: { lon: h.mc, sign: mc.key, deg: mc.deg, signIndex: mc.index },
      houses: cuspSigns, houseSystem: h.system, aspects: asp,
      elements: el, modes: mo, dominantElement: domEl[0], weakElement: domEl[3],
      dominantMode: domMo[0], hemispheres: hem, chartRuler: RULER[asc.key], timeKnown: !!timeKnown
    };
  }

  // Conversión hora local (zona IANA) -> UTC usando Intl (incluye historial de horarios)
  function tzOffsetMinutes(tz, utcMs) {
    var f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var parts = {}; f.formatToParts(new Date(utcMs)).forEach(function (p) { parts[p.type] = p.value; });
    var asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
    return Math.round((asUTC - utcMs) / 60000);
  }
  function localToUTC(y, m, d, hh, mm, tz, manualOffsetMin) {
    var local = Date.UTC(y, m - 1, d, hh, mm, 0);
    if (typeof manualOffsetMin === 'number' && !isNaN(manualOffsetMin)) return { date: new Date(local - manualOffsetMin * 60000), offset: manualOffsetMin };
    var off = 0;
    try {
      off = tzOffsetMinutes(tz, local);
      off = tzOffsetMinutes(tz, local - off * 60000);
    } catch (e) { off = 0; }
    return { date: new Date(local - off * 60000), offset: off };
  }

  root.OrvAstro = { computeChart: computeChart, localToUTC: localToUTC, signOf: signOf, SIGNS: SIGNS, ELEMENT: ELEMENT, MODE: MODE, PLANETS: PLANETS, RULER: RULER, norm: norm };
  if (typeof module !== 'undefined') module.exports = root.OrvAstro;
})(typeof window !== 'undefined' ? window : globalThis);
