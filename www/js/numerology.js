/* Orvaluna — motor numerológico pitagórico */
(function (root) {
  'use strict';
  var MASTERS = [11, 22, 33];
  var KARMIC = [13, 14, 16, 19];

  function clean(name) {
    return (name || '').replace(/ß/g, 'SS').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toUpperCase().replace(/[^A-Z\s'-]/g, '').replace(/[\s'-]+/g, ' ').trim();
  }
  function letterValue(ch) { var c = ch.charCodeAt(0) - 64; return c >= 1 && c <= 26 ? ((c - 1) % 9) + 1 : 0; }
  function digitSum(n) { return String(n).split('').reduce(function (a, b) { return a + (+b); }, 0); }
  function reduce(n, keepMaster) {
    if (keepMaster === undefined) keepMaster = true;
    while (n > 9 && !(keepMaster && MASTERS.indexOf(n) >= 0)) n = digitSum(n);
    return n;
  }
  function chain(n) { var c = [n]; while (n > 9 && MASTERS.indexOf(n) < 0) { n = digitSum(n); c.push(n); } return c; }
  function karmicIn(seq) { for (var i = 0; i < seq.length; i++) if (KARMIC.indexOf(seq[i]) >= 0) return seq[i]; return null; }
  function single(n) { return reduce(n, false); }

  var VOWELS = 'AEIOU';
  function isVowel(word, i) {
    var ch = word[i];
    if (VOWELS.indexOf(ch) >= 0) return true;
    if (ch === 'Y') {
      var prev = word[i - 1], next = word[i + 1];
      var pv = prev && VOWELS.indexOf(prev) >= 0, nv = next && VOWELS.indexOf(next) >= 0;
      return !pv && !nv;
    }
    return false;
  }

  function nameNumbers(full) {
    var words = clean(full).split(' ').filter(Boolean);
    var tot = 0, vow = 0, con = 0, partsE = [], partsV = [], partsC = [];
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var firstVowel = null;
    words.forEach(function (w) {
      var e = 0, v = 0, c = 0;
      for (var i = 0; i < w.length; i++) {
        var val = letterValue(w[i]); if (!val) continue;
        counts[val]++;
        e += val;
        if (isVowel(w, i)) { v += val; if (firstVowel === null) firstVowel = w[i]; } else c += val;
      }
      partsE.push(e); partsV.push(v); partsC.push(c); tot += e; vow += v; con += c;
    });
    function byParts(parts) {
      var s = parts.reduce(function (a, p) { return a + reduce(p); }, 0);
      return { value: reduce(s), raw: s, karmic: karmicIn(chain(s).concat(parts)) };
    }
    var expression = byParts(partsE), soul = byParts(partsV), persona = byParts(partsC);
    var missing = [], max = 0;
    for (var d = 1; d <= 9; d++) { if (!counts[d]) missing.push(d); if (counts[d] > max) max = counts[d]; }
    var passions = []; for (d = 1; d <= 9; d++) if (counts[d] === max && max > 0) passions.push(d);
    var initials = words.map(function (w) { return letterValue(w[0]); });
    var first = words[0] || '';
    return {
      words: words, expression: expression, soul: soul, personality: persona,
      inclusion: counts.slice(1), karmicLessons: missing, hiddenPassion: passions,
      balance: reduce(initials.reduce(function (a, b) { return a + b; }, 0), false),
      cornerstone: first[0] || '', capstone: first[first.length - 1] || '', firstVowel: firstVowel,
      firstNameNumber: reduce(partsE[0] || 0),
      subconscious: 9 - missing.length, letters: words.join('').length
    };
  }

  function birthNumbers(y, m, d, currentYear, currentMonth) {
    var rm = reduce(m), rd = reduce(d), ry = reduce(digitSum(y));
    var lpRaw = rm + rd + ry;
    var lp = reduce(lpRaw);
    var lpKarmic = karmicIn(chain(lpRaw).concat([d, digitSum(y)]));
    var lpSingle = single(lp);
    var sm = single(m), sd = single(d), sy = single(digitSum(y));
    var p1 = reduce(sm + sd), p2 = reduce(sd + sy), p3 = reduce(single(p1) + single(p2)), p4 = reduce(sm + sy);
    var end1 = 36 - lpSingle;
    var c1 = Math.abs(sm - sd), c2 = Math.abs(sd - sy), c3 = Math.abs(c1 - c2), c4 = Math.abs(sm - sy);
    var py = reduce(single(m) + single(d) + single(digitSum(currentYear)), false);
    var pm = reduce(py + currentMonth, false);
    return {
      lifePath: { value: lp, raw: lpRaw, karmic: lpKarmic },
      birthday: { value: reduce(d), karmic: KARMIC.indexOf(d) >= 0 ? d : null },
      attitude: reduce(m + d),
      personalYear: py, personalMonth: pm, universalYear: reduce(digitSum(currentYear), false),
      pinnacles: [
        { value: p1, from: 0, to: end1 }, { value: p2, from: end1 + 1, to: end1 + 9 },
        { value: p3, from: end1 + 10, to: end1 + 18 }, { value: p4, from: end1 + 19, to: null }
      ],
      challenges: [c1, c2, c3, c4],
      cycles: [
        { value: reduce(m), from: 0, to: end1 }, { value: reduce(d), from: end1 + 1, to: end1 + 27 }, { value: reduce(digitSum(y)), from: end1 + 28, to: null }
      ]
    };
  }

  function compute(fullName, y, m, d, now) {
    now = now || new Date();
    var n = nameNumbers(fullName), b = birthNumbers(y, m, d, now.getFullYear(), now.getMonth() + 1);
    var maturity = reduce(single(b.lifePath.value) + single(n.expression.value));
    maturity = reduce(b.lifePath.value + n.expression.value);
    var debts = [];
    [b.lifePath.karmic, n.expression.karmic, n.soul.karmic, n.personality.karmic, b.birthday.karmic].forEach(function (k) { if (k && debts.indexOf(k) < 0) debts.push(k); });
    var age = now.getFullYear() - y - ((now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) ? 1 : 0);
    var curPin = 0; for (var i = 0; i < 4; i++) { var p = b.pinnacles[i]; if (age >= p.from && (p.to === null || age <= p.to)) curPin = i; }
    return {
      name: n, birth: b, maturity: maturity, karmicDebts: debts, age: age, currentPinnacle: curPin,
      rationalThought: reduce(n.firstNameNumber + reduce(d)), year: now.getFullYear(), month: now.getMonth() + 1
    };
  }

  root.OrvNum = { compute: compute, reduce: reduce, clean: clean, letterValue: letterValue };
  if (typeof module !== 'undefined') module.exports = root.OrvNum;
})(typeof window !== 'undefined' ? window : globalThis);
