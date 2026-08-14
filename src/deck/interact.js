/* =====================================================================
   BXD web deck — interaction layer.

   The generated markup has no notion of "a row" or "a card": a pptx list
   entry is several independent shapes (an icon block, a numbered ring, a
   text box) that merely happen to sit next to each other. This layer
   rebuilds those into UNITS and gives each unit one hover, the way the
   hand-built deck did.

   Deliberately NOT everything is interactive. A shape only becomes a unit
   if it is part of a repeated set (>= 2 similar entries) -- which is what
   a list, a card grid or a logo wall is. Titles, header bars, panel
   backgrounds, axis labels, footers and one-off decorations are left
   alone.

   Three hard rules, all learned the hard way:

   1. Never animate `transform`. Shapes carry their own
      `transform: rotate()/scale()` from the renderer; animating it
      replaces theirs. Motion uses the standalone `translate`/`scale`
      properties, which compose with it.
   2. Never rely on `:hover`. Shapes paint in pptx z-order, so badges and
      icons routinely cover the rows you want to hover. Hover is resolved
      by hit-testing the pointer against unit boxes in stage coordinates.
   3. The reveal animation must be torn down once it has played, otherwise
      its `forwards` fill keeps overriding hover motion.
   ===================================================================== */
export function initInteract() {
  'use strict';

  var STAGE_W = 1280, STAGE_H = 720;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LOGONAME = {
    7: 'Raiffeisen Bank', 8: 'Julius Bär', 9: 'BCV', 10: 'Luzerner Kantonalbank',
    11: 'Marex', 12: 'Société Générale', 13: 'BNP Paribas', 14: 'Goldman Sachs',
    15: 'UBS', 16: 'Vontobel', 17: 'Leonteq', 18: 'Zürcher Kantonalbank',
    19: 'GenTwo', 20: 'Saxo', 21: 'Indosuez', 22: 'Swissquote',
    23: 'Interactive Brokers', 24: 'Pictet', 25: 'PostFinance', 26: 'Maverix',
    27: 'Lombard Odier'
  };

  var slides = [].slice.call(document.querySelectorAll('#deck .slide'));
  if (!slides.length) return;

  /* ------------------------------------------------------------ helpers */
  function num(el, p) { return parseFloat(el.style[p]) || 0; }
  function boxOf(el) {
    return { x: num(el, 'left'), y: num(el, 'top'), w: num(el, 'width'), h: num(el, 'height') };
  }
  function txt(el) {
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function norm(s) {
    return (s || '').replace(/­/g, '').replace(/\s+/g, ' ')
      .replace(/-\s/g, '').trim().toLowerCase();
  }
  function union(a, b) {
    var x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return { x: x, y: y, w: Math.max(a.x + a.w, b.x + b.w) - x,
             h: Math.max(a.y + a.h, b.y + b.h) - y };
  }
  function hexRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16),
            parseInt(h.slice(4, 6), 16)];
  }
  function dist(a, b) {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) +
                     Math.pow(a[2] - b[2], 2));
  }
  /* Every colour a shape paints with. The browser serialises an inline
     `background:#6432FA` back as `rgb(100, 50, 250)`, and gradient fills keep
     their colour in an svg <linearGradient> stop, so cover all three forms. */
  function colorsOf(el) {
    var s = (el.style.background || '') + ' ' + (el.style.backgroundColor || '');
    [].slice.call(el.querySelectorAll('svg.sg path[fill]')).forEach(function (p) {
      s += ' ' + p.getAttribute('fill');
    });
    [].slice.call(el.querySelectorAll('svg.sg stop')).forEach(function (t) {
      s += ' ' + (t.getAttribute('stop-color') || '');
    });
    var out = [];
    (s.match(/#[0-9a-fA-F]{6}/g) || []).forEach(function (h) { out.push(hexRgb(h)); });
    var re = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g, m;
    while ((m = re.exec(s))) out.push([+m[1], +m[2], +m[3]]);
    return out;
  }
  function isFilled(el) {
    if (el.tagName === 'IMG' || el.querySelector('img')) return false;
    return !!(el.style.background || el.style.backgroundColor ||
      el.querySelector('svg.sg path[fill]:not([fill="none"])'));
  }
  function isFramed(el) {
    if (el.style.border || el.style.borderColor) return true;
    return !!el.querySelector('svg.sg path[stroke]:not([stroke="none"])');
  }
  function isRound(el) {
    var c = [el].concat([].slice.call(el.querySelectorAll('.sp')).slice(0, 3));
    for (var i = 0; i < c.length; i++) {
      if (c[i].style && c[i].style.borderRadius === '50%') return true;
      var p = c[i].querySelector ? c[i].querySelector('svg.sg path') : null;
      if (p && /^M0 [\d.]+ A/.test(p.getAttribute('d') || '')) return true;
    }
    return false;
  }
  /* A numbered ring that is light-filled can carry the hover itself: it
     inverts to violet with a glow and its number turns white, instead of a
     tint plate appearing behind the whole entry. The test is "is there
     anywhere to invert TO" -- a ring already painted a solid colour (slide 3's
     grey insight badges, white numerals on rgb(100,100,100)) has none, so
     those entries keep the plate and nothing about them changes. */
  function isLightFilled(el) {
    var cs = colorsOf(el);
    if (!cs.length) return false;
    return cs.every(function (c) {
      return c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114 > 200;
    });
  }
  /* A fill the colour of the sheet is invisible until something is painted
     behind it -- and the tint plate is painted behind it. Slide 5's four
     revenue streams are a white panel on a white page, so the hover tint
     reached only the 5px the plate stands proud of the entry and the 16px gap
     between the panel and its icon: a lavender smear around the edge of a row
     that did not itself react. Such a panel steps aside while the entry is
     hovered, which changes nothing about how the slide looks at rest.
     (Lifting it instead, the way a real card lifts, is worse: an invisible
     white rectangle with a shadow under it reads as a patch of missing page.) */
  function isSheetFilled(el) {
    var cs = colorsOf(el);
    if (!cs.length) return false;
    return cs.every(function (c) {
      return c[0] > 246 && c[1] > 246 && c[2] > 246;
    });
  }
  function ringOf(u) {
    for (var i = 0; i < u.members.length; i++) {
      var m = u.members[i];
      if (!m.round || Math.abs(m.b.w - m.b.h) > 8) continue;
      if (!/^\d{1,3}$/.test(m.t)) continue;          // a numeral, not a label
      if (!isLightFilled(m.el)) continue;
      return m;
    }
    return null;
  }
  /* The deck's "focus" device: a gold dashed outline drawn around the one row,
     box or bubble the slide is about, plus the matching key in the legend.
     It is a conclusion, so it lands after the content it points at rather than
     in its position band. The other dashed strokes on these slides are grey
     (#7F7F7F / #646464) or white separators, all far enough away in colour. */
  var GOLD = hexRgb('#FFD700');
  function isFocusMarker(el) {
    return [].slice.call(el.querySelectorAll('svg.sg path[stroke-dasharray]'))
      .some(function (p) {
        var s = p.getAttribute('stroke') || '';
        return /^#[0-9a-f]{6}$/i.test(s) && dist(hexRgb(s), GOLD) < 60;
      });
  }
  function logoOf(el) {
    var im = el.tagName === 'IMG' ? el : el.querySelector('img');
    if (!im) return null;
    var m = /image(\d+)\.(png|jpe?g)$/i.exec(im.getAttribute('src') || '');
    return m ? (LOGONAME[+m[1]] || null) : null;
  }

  /* --------------------------------------------------------------- tooltip */
  var tip = document.getElementById('tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'tip';
    document.body.appendChild(tip);
  }
  var tipText = null;
  function showTip(text, e) {
    if (!text) { hideTip(); return; }
    if (text !== tipText) { tipText = text; tip.textContent = text; }
    tip.classList.add('show');
    var x = e.clientX + 14, y = e.clientY + 16;
    var r = tip.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - 12;
    if (y + r.height > window.innerHeight - 8) y = e.clientY - r.height - 12;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() { tipText = null; tip.classList.remove('show'); }

  /* =========================== shape inventory ========================= */
  function inventory(slide) {
    function usable(b) {
      if (b.w < 6 || b.h < 6) return false;                   // rules, ticks
      if (b.w >= 1100 || b.h >= 600) return false;            // backgrounds
      if (b.y >= STAGE_H - 80) return false;                  // footer band
      if (b.y + b.h <= 100 && b.w > 480) return false;        // title band
      return true;
    }
    /* A group child's inline left/top are in the GROUP's coordinate space, not
       the slide's, so they have to be measured rather than read. */
    var sr = slide.getBoundingClientRect();
    var scale = sr.width / STAGE_W || 1;
    function measured(el) {
      var r = el.getBoundingClientRect();
      return { x: (r.left - sr.left) / scale, y: (r.top - sr.top) / scale,
               w: r.width / scale, h: r.height / scale };
    }
    function item(el, b) {
      return { el: el, b: b, t: txt(el), fill: isFilled(el),
               logo: logoOf(el), frac: el.getAttribute('data-frac'),
               round: isRound(el) };
    }

    var out = [];
    [].slice.call(slide.querySelectorAll(':scope > .sp, :scope > .gp, :scope > img.sp'))
      .forEach(function (el) {
        var b = boxOf(el);
        if (usable(b)) { out.push(item(el, b)); return; }
        /* A pptx group is only a container, and a group can be far too big to
           be a unit while everything worth hovering sits inside it: slide 11
           wraps all five step cards in one 1209x305 group, so the slide had
           nothing interactive at all. When a GROUP is rejected for its size,
           look one level in and consider its children instead. Rejected for
           any other reason (footer, title band) it stays rejected. */
        if (!el.classList.contains('gp')) return;
        if (b.w < 1100 && b.h < 600) return;
        [].slice.call(el.querySelectorAll(':scope > .gpi > .sp, :scope > .gpi > .gp'))
          .forEach(function (ch) {
            var cb = measured(ch);
            if (usable(cb)) out.push(item(ch, cb));
          });
      });
    return out;
  }

  /* ============================ unit building ==========================
     A pptx list entry is several unrelated shapes side by side. Rebuild the
     entries by anchoring on the TEXT shapes (they are what defines a row),
     joining neighbouring text on the same line, then absorbing the small
     decorations that belong to it (icon block, numbered ring).

     Text anchors only -- letting large decorative shapes (an S-curve, a
     bracket, a panel) define or extend a band chains every row together and
     the whole slide collapses into one useless unit.                       */
  function buildUnits(items) {
    var used = new Set();
    var units = [];

    function textOf(list) {
      return list.map(function (i) { return i.t; }).join(' ').trim();
    }
    function inside(a, b, tol) {           /* a inside b */
      tol = tol || 3;
      return a.x >= b.x - tol && a.y >= b.y - tol &&
        a.x + a.w <= b.x + b.w + tol && a.y + a.h <= b.y + b.h + tol;
    }

    /* ---- pass 1: card frames.
       A card is a filled or outlined rectangle that CONTAINS its own label,
       icon and body text (slide 10's four pitch boxes are built this way).
       The frame owns the hover and everything inside rides along.          */
    var frames = items.filter(function (it) {
      if (it.frac || it.logo || it.t.length > 0 && it.round) return false;
      if (it.b.w < 140 || it.b.w > 480 || it.b.h < 50 || it.b.h > 340) return false;
      if (!it.fill && !isFramed(it.el)) return false;
      var holdsLabel = items.some(function (o) {
        return o !== it && o.t && o.t.length > 3 && inside(o.b, it.b);
      });
      /* ...or the frame IS the card: slide 11's step cards are a single filled
         shape carrying the body copy, with only a numbered badge on top of it.
         Requiring someone else's text inside left that slide with no units. */
      var holdsBadge = it.t.length >= 4 && items.some(function (o) {
        return o !== it && inside(o.b, it.b);
      });
      return holdsLabel || holdsBadge;
    }).sort(function (a, b) { return (b.b.w * b.b.h) - (a.b.w * a.b.h); });

    frames.forEach(function (f) {
      if (used.has(f.el)) return;
      var members = [f];
      used.add(f.el);
      items.forEach(function (o) {
        if (used.has(o.el) || o === f) return;
        if (!inside(o.b, f.b)) return;
        members.push(o);
        used.add(o.el);
      });
      /* Decorations that ride ON the frame without sitting inside it: slide
         11's coloured tab hooks around the card's left edge, so it is mostly
         over the card but not contained by it. The unit's box stays the
         frame's, so the hover plate still traces the card and not the tab. */
      items.forEach(function (o) {
        if (used.has(o.el) || o === f) return;
        if (o.b.w > f.b.w || o.b.h > f.b.h * 1.2) return;
        var ox = Math.min(o.b.x + o.b.w, f.b.x + f.b.w) - Math.max(o.b.x, f.b.x);
        var oy = Math.min(o.b.y + o.b.h, f.b.y + f.b.h) - Math.max(o.b.y, f.b.y);
        if (ox <= 0 || oy <= 0) return;
        if (ox * oy < 0.55 * o.b.w * o.b.h) return;
        members.push(o);
        used.add(o.el);
      });
      if (members.length < 2) { used.delete(f.el); return; }
      units.push({ members: members, b: f.b, frame: true });
    });

    /* ---- pass 2: list rows.
       Anchor on the TEXT shapes -- they are what defines a row -- then join
       neighbouring text on the same line and absorb the small decorations
       that belong to it (icon block, numbered ring).

       Anchoring on text matters: if large decorative shapes (an S-curve, a
       bracket, a panel) may define a band, every row chains together and the
       slide collapses into one useless unit.                                */
    var anchors = items.filter(function (it) {
      if (used.has(it.el) || it.frac || it.logo) return false;
      if (it.round && it.t && it.t.length > 2) return false;   // labelled bubble
      return it.t && it.t.length > 3 && it.b.h <= 150 && it.b.w <= 620;
    }).sort(function (a, b) { return (a.b.y - b.b.y) || (a.b.x - b.b.x); });

    var rows = [];
    anchors.forEach(function (it) {
      if (used.has(it.el)) return;
      var u = { members: [it], b: it.b };
      used.add(it.el);
      anchors.forEach(function (other) {
        if (used.has(other.el)) return;
        var lo = Math.max(u.b.y, other.b.y);
        var hi = Math.min(u.b.y + u.b.h, other.b.y + other.b.h);
        if (hi - lo < 0.55 * Math.min(u.b.h, other.b.h)) return;
        var gap = Math.max(u.b.x - (other.b.x + other.b.w), other.b.x - (u.b.x + u.b.w));
        if (gap > 42) return;
        u.members.push(other);
        u.b = union(u.b, other.b);
        used.add(other.el);
      });
      rows.push(u);
    });

    /* Absorb the leading decoration of each row -- the icon block or numbered
       ring. Only shapes to the LEFT of the text count: a badge that sits to
       the right belongs to the next column, and swallowing it stretches the
       row across the whole slide (which silently killed every unit on the
       exec-summary slide). It also has to be a real part of the row, not a
       stray 20px marker, hence the size test. */
    var deco = items.filter(function (it) {
      if (used.has(it.el) || it.frac) return false;
      if (it.round && it.t && it.t.length > 2) return false;
      if (it.b.w > 140 || it.b.h > 140) return false;   // not a curve or panel
      return it.fill || it.logo || (it.t && it.t.length <= 3);
    });
    rows.forEach(function (u) {
      var text = u.b;
      deco.forEach(function (d) {
        if (used.has(d.el)) return;
        var dcy = d.b.y + d.b.h / 2;
        if (dcy < text.y || dcy > text.y + text.h) return;      // same line only
        /* a numbered badge always counts; an unlabelled block has to be
           substantial, or stray 20px markers get pulled in */
        if (!(d.t && d.t.length) && d.b.h < 0.4 * text.h) return;
        /* ...and it must not be TALLER than the row it decorates. The icon or
           numbered ring of a list entry is at most the height of the entry;
           anything taller is scenery that merely passes by -- the exec
           summary's S-curve runs between the rings, and one of its fragments
           was inflating that entry's tint plate past its siblings'. */
        if (d.b.h > 1.2 * text.h) return;
        var right = d.b.x + d.b.w;
        if (right > text.x + 8) return;                         // must lead the text
        if (text.x - right > 46) return;                        // and be adjacent
        u.members.push(d);
        u.b = union(u.b, d.b);
        used.add(d.el);
      });
    });

    /* a row has to look like a list entry, not a header bar or a chart label */
    rows = rows.filter(function (u) {
      var t = textOf(u.members);
      if (!/[A-Za-zÀ-ÿ]{3}/.test(t)) return false;        // pure numbers: chart labels
      if (t.length < 10) return false;
      if (u.b.w < 90 || u.b.w > 620 || u.b.h > 170) return false;
      /* a lone filled block with a short caption is a section header */
      if (u.members.length === 1 && u.members[0].fill && t.length < 34) return false;
      return true;
    });
    units = units.concat(rows);

    /* ---- keep only entries that repeat: a list, a card grid, a legend.
       Compare units pairwise rather than rounding x/w into fixed buckets:
       the exec summary's right-hand column (04 / 05) has entries whose left
       edge and width differ by 20px, which a bucket splits into two sets of
       one and drops the whole column. Same kind + near-equal left edge +
       near-equal width is what "another entry of the same list" means.
       Height is ignored for a column: list entries routinely differ in line
       count. A list can also run ACROSS the slide -- slide 11's five step
       cards share a top edge and a size and differ in x by 243px -- so a
       shared row counts as repetition too, and there height matters instead. */
    units.forEach(function (u) {
      u.key = (u.frame ? 'f' : 'r') + Math.round(u.b.x / 28) + ':' +
        Math.round(u.b.w / 48);
      u.keep = units.some(function (o) {
        if (o === u || !!o.frame !== !!u.frame) return false;
        if (Math.abs(o.b.w - u.b.w) > 64) return false;
        var column = Math.abs(o.b.x - u.b.x) <= 40;
        /* Only a CARD grid may repeat sideways. Letting plain rows do it pairs
           any two similar text blocks that happen to sit at the same height:
           on slides 8 and 9 it married the subtitle to the legend caption,
           which are 250x20 each and 950px apart. */
        var row = !!u.frame && Math.abs(o.b.y - u.b.y) <= 24 &&
          Math.abs(o.b.h - u.b.h) <= 40;
        return column || row;
      });
    });
    return units;
  }

  /* ============================== linking ============================== */
  /* Match an insight row to the bubbles it talks about.

     Plain substring matching fails badly here: the row says "bei MMF,
     Commodities, Crypto-Based Assets" while the bubbles are labelled "Funds
     (MMF)" and "Commo-dities & Precious Metals". So compare word tokens, and
     let a bubble match when either every one of its tokens appears in the row
     or a token unique to that bubble does. Finally drop a bubble whose tokens
     are a subset of another match, so "Non-Native Equities" does not also
     light "Native Equities". */
  function tokens(str) {
    return (String(str).match(/[a-zà-ÿ]{3,}/g) || []).filter(function (t, i, a) {
      return a.indexOf(t) === i;
    });
  }
  function linkUnitsToBubbles(units, bubbles) {
    if (bubbles.length < 3) return;
    /* Two token views per label. A label broken across lines ("Crypto-" /
       "Based") rejoins to "cryptobased", which never appears in prose, so also
       keep the loosely split form ("crypto", "based"). */
    bubbles.forEach(function (bu) {
      bu.tok = tokens(bu.label);
      bu.loose = tokens(bu.raw.replace(/[^a-zà-ÿ]+/gi, ' ').toLowerCase());
      bu.all = bu.tok.concat(bu.loose.filter(function (t) {
        return bu.tok.indexOf(t) < 0;
      }));
    });
    var freq = {};
    bubbles.forEach(function (bu) {
      bu.all.forEach(function (t) { freq[t] = (freq[t] || 0) + 1; });
    });

    units.forEach(function (u) {
      if (u.b.x < 760) return;                    // insight panels sit right
      var hay = ' ' + norm(u.text).replace(/[^a-zà-ÿ]+/g, ' ') + ' ';
      /* the deck abbreviates Structured Products as "SPs" in prose */
      hay = hay.replace(/ sps? /g, ' structured products ');
      /* Exact substring only. Stemming looked helpful but "Alter-natives"
         yields the loose token "natives", whose stem matches the unrelated
         word "Native" and lit the wrong bubble. The two token views already
         cover the line-broken labels. */
      var has = function (t) { return hay.indexOf(t) >= 0; };
      var hits = [];
      bubbles.forEach(function (bu) {
        if (!bu.all.length) return;
        var matched = bu.all.filter(has);
        if (!matched.length) return;
        var full = bu.tok.every(has) || (bu.loose.length && bu.loose.every(has));
        var unique = matched.some(function (t) { return freq[t] === 1; });
        if (full || unique) hits.push({ bu: bu, full: full });
      });
      /* drop a label whose words are contained in another match, so
         "Non-Native Equities" does not also light "Native Equities" */
      hits = hits.filter(function (h) {
        return !hits.some(function (o) {
          return o !== h && o.full && h.bu.loose.length < o.bu.loose.length &&
            h.bu.loose.every(function (t) { return o.bu.loose.indexOf(t) >= 0; });
        });
      });
      if (!hits.length) return;
      u.lit = hits.map(function (h) { return h.bu.el; });
      u.litLabels = hits.map(function (h) { return h.bu.label; });
      u.tip = hits.length + ' related asset class' + (hits.length > 1 ? 'es' : '') +
        ' in the matrix';
      hits.forEach(function (h) {
        h.bu.rows = (h.bu.rows || []).concat([u]);
      });
    });

    /* The matrix is an illustration, not a control. Once the insight rows
       drive it, the bubbles stop responding to their own hover: they light up
       only when the row that names them is hovered, so there is exactly one
       thing to point at. They keep their `.ix-bub` class (that is what the lit
       state styles); `passive` only removes them from hit-testing. */
    if (bubbles.some(function (bu) { return bu.rows && bu.rows.length; })) {
      bubbles.forEach(function (bu) { if (bu.zone) bu.zone.passive = true; });
    }
  }

  function linkUnitsToChart(slide, units) {
    var bars = [].slice.call(slide.querySelectorAll('.chart rect.bar'));
    if (!bars.length) return;
    var byColor = {};
    bars.forEach(function (r) {
      var c = (r.getAttribute('fill') || '').toUpperCase();
      (byColor[c] = byColor[c] || []).push(r);
    });
    var keys = Object.keys(byColor);
    units.forEach(function (u) {
      if (u.b.x > 420) return;                    // the stream legend is on the left
      var best = null, bestD = 1e9;
      u.members.forEach(function (m) {
        if (!m.fill) return;
        colorsOf(m.el).forEach(function (c) {
          keys.forEach(function (k) {
            var d = dist(c, hexRgb(k));
            if (d < bestD) { bestD = d; best = k; }
          });
        });
      });
      if (!best || bestD > 60) return;
      u.bars = byColor[best];
      /* The stream's own colour, so the hover can be tinted with it. A single
         violet glow for every series says "something is highlighted"; the
         series colour says WHICH, and it is the same colour the row's swatch
         and the segments already carry, so it needs no new furniture. */
      u.color = best;
      /* no tooltip on the stream rows or their segments: the share bubble
         ("Issuance Fee -- 77% of 2029") sat over the row and read as clutter */
    });
  }

  /* "Settlement Fee -- 15% of 2029". The share is measured off the rendered
     bar geometry (this series' height in the last column over the whole
     column), never off the printed data labels: on this deck those labels are
     separate pptx text shapes that sit beside the thin segments rather than
     inside them, so matching them to a series guesses, and a guessed number in
     a tooltip is worse than no number. The column's name comes from the axis
     label underneath it, and is simply left out when there is none. */
  function barX(r) { return parseFloat(r.getAttribute('x')) || 0; }
  function barH(r) { return parseFloat(r.getAttribute('data-h')) || 0; }
  function columnName(slide, cxStage) {
    var best = null, bestD = 60;
    [].slice.call(slide.querySelectorAll(':scope > .sp')).forEach(function (el) {
      var t = txt(el);
      if (!/^(19|20)\d{2}$/.test(t)) return;              // a year, not a value
      var b = boxOf(el), d = Math.abs(b.x + b.w / 2 - cxStage);
      if (d < bestD) { bestD = d; best = t; }
    });
    return best;
  }
  function shareTip(slide, bars, u) {
    var name = (u.text || '').replace(/\s+/g, ' ').trim();
    if (!name) return null;
    var chart = slide.querySelector('.chart');
    if (!chart) return name;
    var lastX = bars.reduce(function (m, r) { return Math.max(m, barX(r)); }, -1e9);
    var inLast = bars.filter(function (r) { return Math.abs(barX(r) - lastX) < 1; });
    var total = inLast.reduce(function (s, r) { return s + barH(r); }, 0);
    var mine = u.bars.reduce(function (s, r) {
      return Math.abs(barX(r) - lastX) < 1 ? s + barH(r) : s;
    }, 0);
    if (!(total > 0) || !(mine > 0)) return name;
    var w = inLast.length ? parseFloat(inLast[0].getAttribute('width')) || 0 : 0;
    var col = columnName(slide, num(chart, 'left') + lastX + w / 2);
    return name + ' — ' + Math.round(mine / total * 100) + '% of' +
      (col ? ' ' + col : ' the final column');
  }

  /* ------------------------------------------------------- chart bars
     The chart grows in once, as a whole. It is a STACKED chart, so a single
     series cannot be animated on its own: every segment above it is placed at
     an absolute y and would hang in mid-air while the one below it moved. That
     is what hovering a revenue stream used to do -- it replayed just that
     stream, which tore the column apart and left the printed values, which are
     separate pptx text shapes at fixed positions, floating over the gaps.

     So hovering isolates instead of replaying: nothing moves, the stream keeps
     its colour and takes a glow, and every other segment drops back. */
  function setBar(r, h, y) { r.setAttribute('height', h); r.setAttribute('y', y); }
  function growBars(bars, stagger) {
    bars.forEach(function (r, i) {
      var h = r.getAttribute('data-h'), y = r.getAttribute('data-y');
      if (reduced) { setBar(r, h, y); return; }
      r.style.transition = 'none';
      setBar(r, 0, r.getAttribute('data-base'));
      /* force a reflow so the browser starts from the collapsed state */
      void r.getBoundingClientRect().height;
      var d = (stagger || 0) * i;
      r.style.transition = 'y .8s cubic-bezier(.16,1,.3,1) ' + d + 'ms,' +
        ' height .8s cubic-bezier(.16,1,.3,1) ' + d + 'ms';
      setBar(r, h, y);
    });
  }
  /* PowerPoint's data labels are separate pptx shapes, not part of the chart
     svg -- so the ones painted in a series' own colour were the single thing on
     the slide that did not react. While the columns receded, four bright violet
     and cyan chips stayed at full strength and floated over a greyed chart,
     which is what made the isolation read as broken rather than as focus.

     A chip cannot be matched to a series by position (that is the same guess
     the tooltip refuses to make), but it can be matched by the fill it is
     painted in, which is knowable and exact. The plain labels printed ON the
     bars carry no fill, belong to no series, and are left alone. */
  function tagChartChips(slide, bars) {
    var keys = {};
    bars.forEach(function (r) {
      keys[(r.getAttribute('fill') || '').toUpperCase()] = 1;
    });
    [].slice.call(slide.querySelectorAll(':scope > .sp')).forEach(function (el) {
      /* an inline fill, so this is a label box rather than a drawn shape */
      if (!(el.style.background || el.style.backgroundColor)) return;
      var b = boxOf(el);
      if (b.w > 90 || b.h > 40) return;            // a chip, not a panel
      var cs = colorsOf(el);
      if (!cs.length) return;
      Object.keys(keys).forEach(function (k) {
        var rgb = hexRgb(k);
        /* every colour it paints with is this series' -- one flat fill, which
           the CSSOM reports twice (shorthand and longhand), not a gradient */
        if (!cs.every(function (c) { return dist(c, rgb) <= 20; })) return;
        el.classList.add('ix-chip');
        el.setAttribute('data-series', k);
      });
    });
  }
  function isolateBars(slide, bars, on, color) {
    if (!bars || !bars.length) return;
    var mine = bars.reduce(function (s, r) { s.add(r); return s; }, new Set());
    [].slice.call(slide.querySelectorAll('.chart rect.bar')).forEach(function (r) {
      r.classList.toggle('ix-hot', on && mine.has(r));
      r.classList.toggle('ix-dim', on && !mine.has(r));
    });
    /* a value chip recedes with the segments it is painted to match */
    [].slice.call(slide.querySelectorAll('.ix-chip')).forEach(function (el) {
      var mineToo = el.getAttribute('data-series') === color;
      el.classList.toggle('ix-hot', on && mineToo);
      el.classList.toggle('ix-dim', on && !mineToo);
    });
    /* the printed values go back with the bars they sit on */
    [].slice.call(slide.querySelectorAll('.chart')).forEach(function (c) {
      c.classList.toggle('ix-iso', !!on);
      /* the lift under the isolated segments is that series' own colour, so
         pointing at the cyan stream does not answer in violet */
      if (on && color) c.style.setProperty('--ix-accent', hexRgb(color).join(','));
      else c.style.removeProperty('--ix-accent');
    });
  }

  /* ================================ wiring ============================= */
  function wire(slide, index) {
    /* slides 10, 11 and 14 are fully static: no hover of any kind */
    if (index === 9 || index === 10 || index === 13) return;
    var items = inventory(slide);

    /* --- standalone interactive shapes ----------------------------- */
    var bubbles = [], zones = [];
    items.forEach(function (it) {
      var b = it.b;
      if (it.logo && b.w < 200 && b.h < 90) {
        /* slide 9's logos are fully inert: no scale hover, no name tooltip */
        if (index === 8) return;
        zones.push({ els: [it.el], b: b, kind: 'logo', tip: it.logo, area: b.w * b.h });
        return;
      }
      if (it.frac && !it.t && b.w <= 46 && b.h <= 46) {
        zones.push({ els: [it.el], b: b, kind: 'pie', area: b.w * b.h,
                     tip: Math.round(parseFloat(it.frac) * 100) + '%' });
        return;
      }
      if (it.round && it.t && it.t.length > 2 && it.t.length <= 34 &&
          b.w > 60 && b.w <= 240 && b.h <= 120) {
        /* slide 5's "+31% p.a." oval and slide 6's "-90%" oval are annotations
           on their charts' arrows, not controls: they link to no row and stay
           still */
        if (index === 4 || index === 5) return;
        /* kind doubles as the css class suffix: .ix-bub */
        var bz = { els: [it.el], b: b, kind: 'bub', area: b.w * b.h };
        bubbles.push({ el: it.el, label: norm(it.t), raw: it.t, zone: bz });
        zones.push(bz);
      }
    });

    /* --- repeated list / card units -------------------------------- */
    var allUnits = buildUnits(items);
    var units = allUnits.filter(function (u) { return u.keep; });
    allUnits.forEach(function (u) {
      u.text = u.members.map(function (m) { return m.t; }).join(' ').trim();
    });
    units.forEach(function (u) {
      u.text = u.members.map(function (m) { return m.t; }).join(' ');
      /* A card lifts; a row tints. Only a fill that actually BACKS the whole
         entry makes it a card -- measured by coverage, not absolute size: the
         exec summary's 05 entry absorbs a 133x123 fragment of the decorative
         S-curve, which is "big" but backs nothing, and made that one entry
         lift while its four siblings tinted. */
      u.card = !!u.frame || u.members.some(function (m) {
        return m.fill && m.b.w >= 0.7 * u.b.w && m.b.h >= 0.6 * u.b.h;
      });
      u.ring = ringOf(u);
    });
    linkUnitsToBubbles(units, bubbles);
    linkUnitsToChart(slide, units);

    /* one tint plate per unit, painted behind every shape */
    units.forEach(function (u) {
      var pad = u.card ? 0 : 5;
      var plate = document.createElement('div');
      plate.className = 'ix-plate' + (u.card ? ' card' : '') +
        (u.ring ? ' accent' : '');
      plate.style.cssText = 'left:' + (u.b.x - pad) + 'px;top:' + (u.b.y - pad) +
        'px;width:' + (u.b.w + pad * 2) + 'px;height:' + (u.b.h + pad * 2) + 'px';
      /* a unit that owns a chart series lifts on a shadow in that series'
         colour, rather than on the same neutral one for all four */
      if (u.color) plate.style.setProperty('--ix-accent', hexRgb(u.color).join(','));
      slide.insertBefore(plate, slide.firstChild);
      u.plate = plate;
      /* an accented entry carries its own hover: the ring inverts, the rest of
         the entry darkens, and the plate behind it stays invisible. The exec
         summary (slide 2) is the exception: its numbered rings stay still, so
         the ring member is left unclassed there and only the text reacts. */
      if (u.ring) {
        u.members.forEach(function (m) {
          if (m === u.ring) {
            if (index !== 1) m.el.classList.add('ix-ring');
          } else {
            m.el.classList.add('ix-txt');
          }
        });
      }
      /* A panel painted the colour of the sheet hides the plate behind it, so
         it goes transparent while the entry is hovered and lets the tint
         through. Two conditions, both necessary: it has to be big enough to be
         what is hiding the plate, and it has to be ON the sheet -- the same
         white panel sitting on a coloured backdrop would go from invisible to
         a hole punched in the backdrop. */
      if (!u.card) {
        u.members.forEach(function (m) {
          if (!m.fill || !isSheetFilled(m.el)) return;
          if (m.b.w * m.b.h < 0.45 * u.b.w * u.b.h) return;
          var backed = items.some(function (o) {
            return o !== m && o.fill && !isSheetFilled(o.el) &&
              o.b.x <= m.b.x && o.b.y <= m.b.y &&
              o.b.x + o.b.w >= m.b.x + m.b.w &&
              o.b.y + o.b.h >= m.b.y + m.b.h;
          });
          if (!backed) m.el.classList.add('ix-sheer');
        });
      }
      u.els = u.members.map(function (m) { return m.el; });
      u.area = u.b.w * u.b.h;
      u.kind = u.card ? 'card' : 'row';
      zones.push(u);
    });

    /* The chart is the subject of slide 5, not an illustration of it (that is
       what makes it different from slide 3's matrix), so its segments are live
       too: each one is a second way to point at the stream it belongs to, and
       hovering it does exactly what hovering the stream's row does. Slivers
       are skipped -- a 3px tall segment is not a pointing target. */
    var chart = slide.querySelector('.chart');
    if (chart) {
      var cx = num(chart, 'left'), cy = num(chart, 'top');
      tagChartChips(slide, [].slice.call(chart.querySelectorAll('rect.bar')));
      units.forEach(function (u) {
        if (!u.bars || !u.bars.length) return;
        u.bars.forEach(function (r) {
          var w = parseFloat(r.getAttribute('width')) || 0, h = barH(r);
          if (h < 8 || w < 8) return;
          zones.push({ els: u.els, plate: u.plate, bars: u.bars, tip: u.tip,
                       kind: u.kind, area: w * h, color: u.color,
                       b: { x: cx + barX(r), y: cy + (parseFloat(r.getAttribute('data-y')) || 0),
                            w: w, h: h } });
        });
      });
    }

    (window.__IX = window.__IX || []).push({
      slide: slides.indexOf(slide) + 1,
      bubbles: bubbles.map(function (b) { return b.label; }),
      dropped: allUnits.filter(function (u) { return !u.keep; }).map(function (u) {
        return { key: u.key, box: [Math.round(u.b.x), Math.round(u.b.y),
                                   Math.round(u.b.w), Math.round(u.b.h)],
                 text: (u.text || '').slice(0, 40) };
      }),
      units: units.map(function (u) {
        return { box: [Math.round(u.b.x), Math.round(u.b.y),
                       Math.round(u.b.w), Math.round(u.b.h)],
                 n: u.members.length, card: !!u.card,
                 bars: (u.bars || []).length, lit: (u.lit || []).length,
                 litLabels: u.litLabels || [],
                 text: u.text.slice(0, 46) };
      })
    });

    zones.forEach(function (z) {
      z.els.forEach(function (e) {
        e.classList.add('ix-' + z.kind);
        /* a row that answers with a tooltip should say so: `.ix-row` is
           cursor:default, which reads as "nothing here" over an entry that in
           fact carries this stream's share of the final column */
        if (z.tip) e.classList.add('ix-hint');
      });
    });
    /* drop passive zones from hit-testing after the classes are on: a passive
       shape is still a target for a linked row, it just cannot be hovered */
    zones = zones.filter(function (z) { return !z.passive; });
    if (!zones.length) return;
    /* smallest wins, so a logo inside a card row is still reachable */
    zones.sort(function (a, b) { return a.area - b.area; });

    function set(z, on) {
      z.els.forEach(function (e) { e.classList.toggle('ix-on', on); });
      if (z.plate) z.plate.classList.toggle('on', on);
      (z.lit || []).forEach(function (e) { e.classList.toggle('ix-lit', on); });
      /* the stream stands out and the rest of the column drops back */
      if (z.bars) isolateBars(slide, z.bars, on, z.color);
    }

    var hot = null, pin = null;
    function point(e) {
      var r = slide.getBoundingClientRect();
      var s = r.width / STAGE_W || 1;
      return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
    }
    function at(p) {
      for (var i = 0; i < zones.length; i++) {
        var b = zones[i].b;
        if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return zones[i];
      }
      return null;
    }

    slide.addEventListener('mousemove', function (e) {
      var z = at(point(e));
      if (z !== hot) {
        if (hot && hot !== pin) set(hot, false);
        hot = z;
        if (hot) set(hot, true);
      }
      showTip(z && z.tip, e);
    }, { passive: true });

    slide.addEventListener('mouseleave', function () {
      if (hot && hot !== pin) set(hot, false);
      hot = null;
      hideTip();
    });

    slide.addEventListener('click', function (e) {
      var z = at(point(e));
      if (!z || !z.lit) return;
      if (pin && pin !== z) { set(pin, false); }
      if (pin === z) { pin = null; set(z, z === hot); }
      else { pin = z; set(z, true); }
    });
  }

  /* ------------------------------------------------ table interactions */
  function wireTables(slide, index) {
    [].slice.call(slide.querySelectorAll('.tbl table')).forEach(function (table) {
      var rows = [].slice.call(table.rows);
      rows.slice(1).forEach(function (r) { r.classList.add('ix-trow'); });

      /* slide 7 stays a plain table: its groups do not fold */
      if (index === 6) return;

      rows.forEach(function (row, ri) {
        var cell = row.cells[0];
        if (!cell || cell.rowSpan < 2) return;
        var span = Math.min(cell.rowSpan, rows.length - ri);
        var body = rows.slice(ri + 1, ri + span);
        if (!body.length || !txt(cell)) return;

        cell.classList.add('acc-head');
        var chev = document.createElement('span');
        chev.className = 'acc-chev';
        chev.textContent = '▾';
        cell.appendChild(chev);
        cell.setAttribute('role', 'button');
        cell.tabIndex = 0;
        var lo = ri + 1, hi = ri + span - 1, saved = null;

        function toggle() {
          var folded = cell.classList.toggle('folded');
          if (folded) {
            /* a rowspan reaching into the hidden rows must give them back, or
               the surviving cells slide into the wrong columns */
            saved = [];
            for (var r = 0; r <= ri; r++) {
              [].slice.call(rows[r].cells).forEach(function (c) {
                var end = r + c.rowSpan - 1;
                if (end < lo) return;
                var overlap = Math.min(end, hi) - lo + 1;
                if (overlap <= 0) return;
                saved.push({ cell: c, was: c.rowSpan });
                c.rowSpan = c.rowSpan - overlap;
              });
            }
            body.forEach(function (r) { r.style.display = 'none'; });
          } else {
            body.forEach(function (r) { r.style.display = ''; });
            (saved || []).forEach(function (s) { s.cell.rowSpan = s.was; });
            saved = null;
          }
          chev.textContent = folded ? '▸' : '▾';
        }
        cell.addEventListener('click', toggle);
        cell.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
      });
    });
  }

  /* --------------------------------------------------- pulsing chevron */
  function wirePulse(slide) {
    var cyan = hexRgb('#46E6E6');
    [].slice.call(slide.querySelectorAll(':scope > .sp, :scope > .gp')).forEach(function (el) {
      var b = boxOf(el);
      if (Math.abs(b.w - b.h) > 12 || b.w < 40 || b.w > 130) return;
      if (!colorsOf(el).some(function (c) { return dist(c, cyan) < 30; })) return;
      el.classList.add('ix-pulse');
      el.classList.remove('ix-row', 'ix-card');
    });
  }

  /* --------------------------------------------- drawing the focus marker
     The marker is a DASHED outline, so the usual trick -- animate the path's
     own stroke-dashoffset -- does not draw it, it makes the dashes crawl round
     the shape. Instead the real path is masked by a copy of itself stroked
     solid, thick enough to cover the dashes, whose dash pattern is one segment
     as long as the path: retracting that segment's offset sweeps the mask from
     the first point to the last and uncovers the gold dashes on the way.

     The mask is torn down once it has played, so what is left on the slide is
     exactly the path the renderer emitted. */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var drawSeq = 0;

  function drawFocus(slide) {
    if (reduced) return;
    [].slice.call(slide.querySelectorAll('.ix-focus')).forEach(function (host) {
      [].slice.call(host.querySelectorAll('svg.sg path[stroke-dasharray]'))
        .forEach(function (path) {
          var col = path.getAttribute('stroke') || '';
          if (!/^#[0-9a-f]{6}$/i.test(col) || dist(hexRgb(col), GOLD) >= 60) return;
          if (path.getAttribute('data-drawn')) return;
          var svg = path.ownerSVGElement;
          if (!svg || !path.getTotalLength) return;
          var len = 0;
          try { len = path.getTotalLength(); } catch (e) { return; }
          if (!(len > 1)) return;
          path.setAttribute('data-drawn', '1');

          var sw = parseFloat(path.getAttribute('stroke-width')) || 2;
          var vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
          var w = vb[2] || parseFloat(svg.getAttribute('width')) || 0;
          var h = vb[3] || parseFloat(svg.getAttribute('height')) || 0;

          var id = 'fdraw' + (++drawSeq);
          var defs = document.createElementNS(SVGNS, 'defs');
          var mask = document.createElementNS(SVGNS, 'mask');
          mask.setAttribute('id', id);
          /* user space, and roomy: the pen is wider than the dashes it covers */
          mask.setAttribute('maskUnits', 'userSpaceOnUse');
          mask.setAttribute('x', -sw * 2);
          mask.setAttribute('y', -sw * 2);
          mask.setAttribute('width', w + sw * 4);
          mask.setAttribute('height', h + sw * 4);

          var pen = path.cloneNode(false);
          pen.removeAttribute('mask');
          pen.removeAttribute('data-drawn');
          pen.setAttribute('fill', 'none');
          pen.setAttribute('stroke', '#fff');
          pen.setAttribute('stroke-width', sw + 4);
          pen.setAttribute('stroke-linecap', 'round');
          pen.setAttribute('stroke-dasharray', len + ' ' + len);
          pen.style.strokeDashoffset = len + 'px';
          mask.appendChild(pen);
          defs.appendChild(mask);
          svg.insertBefore(defs, svg.firstChild);
          path.setAttribute('mask', 'url(#' + id + ')');

          /* long outlines should not take proportionally longer to trace */
          var dur = Math.max(620, Math.min(1500, len * 0.55));
          requestAnimationFrame(function () {
            pen.style.transition = 'stroke-dashoffset ' + dur +
              'ms cubic-bezier(.45,.05,.35,1)';
            pen.style.strokeDashoffset = '0px';
          });
          setTimeout(function () {
            path.removeAttribute('mask');
            if (defs.parentNode) defs.parentNode.removeChild(defs);
          }, dur + 160);
        });
    });
  }

  /* ------------------------------------------------------------- reveal */
  /* How long the whole thing takes. It used to run in 6 bands of 80ms on top
     of a half-second rise, which finished so quickly that a slide was most of
     the way in before you had registered the page at all. */
  var MAXROWS = 8;       // content rows that get their own beat
  var STEP = 170;        // ms between beats
  var SUBSTEP = 65;      // ms between columns inside one beat
  var LEAD = 240;        // ms before anything moves, so the page settles first
  var RISE = 850;        // must match the transition duration in deck.css

  /* The largest type inside a shape, which is what tells a title from a label
     when the markup itself carries no notion of heading level. */
  function maxFont(el) {
    var big = 0;
    var st = (el.getAttribute('style') || '');
    [].slice.call(el.querySelectorAll('p, span')).forEach(function (n) {
      var m = /font-size:\s*([\d.]+)px/.exec(n.getAttribute('style') || '');
      if (m && +m[1] > big) big = +m[1];
    });
    if (!big) {
      var m2 = /font-size:\s*([\d.]+)px/.exec(st);
      if (m2) big = +m2[1];
    }
    return big;
  }

  /* How these slides are actually built, and therefore how they should arrive.
     Every one of them is a stack of horizontal BANDS -- a table row, a list
     entry, a row of cards -- between 3 and 19 per slide. A row's parts (its
     ring, its label, its timeline) belong to each other and must land together;
     what should be staggered is one row after the next, down the slide, the way
     it is read. Sorting every shape into global tiers cannot express that: it
     scatters one row's pieces across four different beats.

     So the sequence is: the sheet, the headline, the structure that holds the
     content, then the content itself row by row, then the gold conclusion.  */
  /* What should arrive one after another.

     Two kinds of shape hide a whole slide's content from a plain child scan,
     and both have to be opened -- exactly as the unit inventory opens an
     oversized group:

       - A `grpSp` is only a container. Slide 11 wraps all five step cards in
         one 1209x305 group, so a child scan sees ONE shape, calls it a
         backdrop for its size, and fades the entire slide in before the
         headline that introduces it.
       - A table is one shape carrying 5 to 17 rows. Slides 7, 8 and 15 are
         mostly table, and the same thing happened there: slide 7 IS its table,
         so the whole slide used to appear in the sheet's beat.

     In both cases the container itself paints nothing, so it is HELD -- shown
     immediately, with no motion of its own -- and its parts carry the reveal. */
  function revealItems(slide) {
    var sr = slide.getBoundingClientRect();
    var sc = sr.width / STAGE_W || 1;
    /* a part's inline left/top is in its container's coordinate space, not the
       slide's, so it has to be measured rather than read */
    function measured(el) {
      var r = el.getBoundingClientRect();
      return { x: (r.left - sr.left) / sc, y: (r.top - sr.top) / sc,
               w: r.width / sc, h: r.height / sc };
    }
    var out = [], hold = [];
    function part(el, cell) {
      out.push({ el: el, b: measured(el), t: txt(el), nested: true, cell: !!cell });
    }
    [].slice.call(slide.children).forEach(function (el) {
      if (!el.classList) return;
      if (!(el.classList.contains('sp') || el.classList.contains('gp'))) return;
      var b = boxOf(el);

      /* CELLS, not rows. Under `border-collapse:collapse` -- which every table
         in this deck uses, because that is how PowerPoint draws them -- a
         `<tr>` cannot be animated at all: Blink ignores both `opacity` and
         `translate` on it, because the row is painted by the table rather than
         by itself. A `<td>` honours both. Cells also give a table row the same
         left-to-right sweep every other band gets, so it flows label -> number
         -> text -> timeline. Nothing is wrapped or re-nested: a table cell that
         had to be rebuilt to animate would put the deck's geometry at risk. */
      var cells = el.classList.contains('tbl')
        ? [].slice.call(el.querySelectorAll('table td')) : [];
      if (cells.length >= 2) {
        hold.push(el);
        cells.forEach(function (td) { part(td, true); });
        return;
      }
      /* Only a group too big to be content is opened. A small group is one
         thing -- an icon, a ring and its numeral -- and its parts belong
         together, so opening it would scatter them across separate beats. */
      var kids = el.classList.contains('gp') && (b.w >= 1000 || b.h >= 480)
        ? [].slice.call(el.querySelectorAll(':scope > .gpi > .sp, :scope > .gpi > .gp'))
        : [];
      if (kids.length >= 3 && kids.some(function (k) { return txt(k); })) {
        hold.push(el);
        kids.forEach(function (k) { part(k); });
        return;
      }
      out.push({ el: el, b: b, t: txt(el), nested: false });
    });
    /* The container still has to wait its turn. It cannot FADE -- its opacity
       would multiply its parts' own -- but a table's grid lines and fills are
       painted by the table itself, so without this the frame of slide 7 stood
       on the page before the title that introduces it. It is held back with
       `visibility` instead, which its parts override, and it lands with the
       structure: the frame the content sits in, before the content. */
    hold.forEach(function (el) {
      el.classList.add('rv-hold');
      out.push({ el: el, b: boxOf(el), t: '', hold: true });
    });
    out.forEach(function (m) { m.cy = m.b.y + m.b.h / 2; });
    return out;
  }

  function planReveal(meta) {
    var canvas = [], header = [], structure = [], content = [];

    meta.forEach(function (m) {
      var b = m.b;
      /* an opened container is the frame its parts sit in */
      if (m.hold) { structure.push(m); return; }
      /* A thin extent is a rule or a connector whatever its length, never a
         backdrop -- slide 17's two column rules are 525px tall and 0px wide,
         and the sheet test below used to swallow them and fade them in.
         A rule that runs the height of the slide is the frame the content sits
         in, so it is drawn with the structure; a rule that separates two rows
         belongs to its row and draws as that row lands (slide 4's ten dotted
         rules, slide 2's connectors). */
      if ((b.w <= 6 || b.h <= 6) && (b.w >= 20 || b.h >= 20)) {
        (b.h >= 380 ? structure : content).push(m); return;
      }
      /* The headline band, title and slide-number chip together. This has to be
         tested BEFORE the sheet rule: a title is 1209px wide, so the sheet test
         would otherwise swallow it and it would arrive with the wordmark
         instead of announcing the slide. The second clause catches the kicker
         line some slides hang just under the title (slide 6). */
      if (b.y + b.h <= 118 || (b.y <= 104 && b.h <= 70 && b.w >= 300)) {
        header.push(m); return;
      }
      /* the furniture that is on every slide and is never part of the story:
         the wordmark bottom-left, the page number bottom-right. Judged by the
         CORNERS, not by the footer band -- slide 4's last table row runs to
         y=656 and is content, not furniture. */
      if (!m.nested && b.y >= 650 && b.h <= 60 && (b.x <= 250 || b.x >= 1140)) {
        canvas.push(m); return;
      }
      /* The sheet itself: full-bleed art and side panels. A shape that SAYS
         something is never the sheet, however big it is -- slide 1's headline
         is 1028px wide and slide 14's conclusion band is 1209x69, and both used
         to fade in with the background. On slide 14 that meant the slide opened
         with its own conclusion. Nor is a part of an opened container ever the
         sheet: slide 8's tables are 1066px wide, so their blank cells qualified
         on size and arrived a full beat before the rest of their own row. */
      if (!m.nested && !m.t && (b.w >= 1000 || b.h >= 480)) { canvas.push(m); return; }
      content.push(m);
    });

    /* a shape that holds two or more others is the frame they sit in, so it
       has to be there before they arrive */
    content = content.filter(function (m) {
      var holds = 0;
      content.forEach(function (o) {
        if (o === m) return;
        if (o.b.x >= m.b.x - 2 && o.b.y >= m.b.y - 2 &&
            o.b.x + o.b.w <= m.b.x + m.b.w + 2 &&
            o.b.y + o.b.h <= m.b.y + m.b.h + 2) holds++;
      });
      if (holds >= 2 && !m.t) { structure.push(m); return false; }
      return true;
    });

    /* --- cut a set of shapes into bands by vertical centre */
    function cutBands(list) {
      var items = list.slice().sort(function (a, b) { return a.cy - b.cy; });
      var hs = items.map(function (m) { return m.b.h; }).sort(function (a, b) { return a - b; });
      var med = hs[Math.floor(hs.length / 2)] || 20;
      var gap = Math.max(14, med * 0.55);
      var out = [], cur = null;
      items.forEach(function (m) {
        if (!cur || m.cy - cur.cy > gap) { cur = { cy: m.cy, items: [] }; out.push(cur); }
        cur.cy = m.cy;
        cur.items.push(m);
      });
      return out;
    }
    /* too many bands would drag: merge neighbours until it fits */
    function mergeTo(bands, cap) {
      while (bands.length > cap) {
        var merged = [];
        for (var i = 0; i < bands.length; i += 2) {
          if (i + 1 < bands.length) {
            merged.push({ cy: bands[i + 1].cy,
                          items: bands[i].items.concat(bands[i + 1].items) });
          } else merged.push(bands[i]);
        }
        bands = merged;
      }
      return bands;
    }

    /* --- Is this slide a stack of bands, or several panels side by side?

       Cutting by y is right for a table: its columns are one entry read across,
       and a row's label, number and timeline must land together. It is wrong
       for a slide built as panels -- slide 2 is 01/02/03 down the left and
       04/05 down the right, slide 3 is a matrix beside an insight list, slide 5
       is a stream list, a chart and a reasons list. Banding those by y
       interleaves them, so the slide arrives 01, 04, 02, 05, 03 and the eye is
       thrown left and right across the page instead of reading one thing.

       The two cases are told apart by whether the regions share a band
       structure: columns of one table have the same number of bands at the same
       heights, panels do not. */
    function regionsOf(items) {
      var regs = [];
      items.slice().sort(function (a, b) { return a.b.x - b.b.x; }).forEach(function (m) {
        var lo = m.b.x, hi = m.b.x + m.b.w, hit = null;
        for (var i = 0; i < regs.length; i++) {
          if (lo < regs[i].hi - 10 && hi > regs[i].lo + 10) { hit = regs[i]; break; }
        }
        if (hit) {
          hit.lo = Math.min(hit.lo, lo); hit.hi = Math.max(hit.hi, hi);
          hit.items.push(m);
        } else regs.push({ lo: lo, hi: hi, items: [m] });
      });
      /* growing a region can make it overlap the next one, so coalesce */
      for (var again = true; again;) {
        again = false;
        for (var i = 0; i < regs.length && !again; i++) {
          for (var j = i + 1; j < regs.length && !again; j++) {
            if (regs[i].lo < regs[j].hi - 10 && regs[i].hi > regs[j].lo + 10) {
              regs[i].lo = Math.min(regs[i].lo, regs[j].lo);
              regs[i].hi = Math.max(regs[i].hi, regs[j].hi);
              regs[i].items = regs[i].items.concat(regs[j].items);
              regs.splice(j, 1);
              again = true;
            }
          }
        }
      }
      return regs.sort(function (a, b) { return a.lo - b.lo; });
    }
    function alignedAcross(bandsPerRegion) {
      var n = bandsPerRegion[0].length;
      if (bandsPerRegion.some(function (b) { return b.length !== n; })) return false;
      for (var i = 0; i < n; i++) {
        var cys = bandsPerRegion.map(function (b) { return b[i].cy; });
        if (Math.max.apply(null, cys) - Math.min.apply(null, cys) > 26) return false;
      }
      return true;
    }

    var rows = null;
    var regs = regionsOf(content);
    if (regs.length >= 2 && regs.length <= 4 &&
        regs.every(function (r) { return r.items.length >= 3; })) {
      var per = regs.map(function (r) { return cutBands(r.items); });
      if (!alignedAcross(per)) {
        /* panel after panel, left to right, each read down its own length */
        var cap = Math.max(2, Math.round(12 / regs.length));
        rows = [];
        per.forEach(function (bands) { rows = rows.concat(mergeTo(bands, cap)); });
      }
    }
    if (!rows) rows = mergeTo(cutBands(content), MAXROWS);
    return { canvas: canvas, header: header, structure: structure, rows: rows };
  }

  function stageReveal(slide) {
    var meta = revealItems(slide);
    if (!meta.length) return 0;
    var plan = planReveal(meta);
    var beat = 0, last = 0;

    /* A dense slide must not take proportionally longer than a sparse one.
       At a flat 130ms the last band of slide 9 started 1.7s in and the slide
       was not finished for 3.2s, which is long enough to scroll past. The step
       closes up as the band count grows, so every slide lands in roughly the
       same time whether it holds three bands or nineteen. */
    var nb = plan.rows.length;
    var step = nb > 5 ? Math.max(120, Math.round(STEP * 6 / nb)) : STEP;
    var sub = Math.min(SUBSTEP, Math.round(step * 0.42));

    /* What kind of motion suits this shape. A hairline connector is a LINE:
       it should be drawn along itself, not slid upward. A round mark is a dot,
       so it arrives in place. A big panel opens. The sheet and the footer
       furniture only fade. Everything else rises. */
    function motion(m, isCanvas) {
      var b = m.b;
      if (isCanvas) return 'rv-fade';
      /* A collapsed border is painted by the table, not by the cell, so a cell
         that RISES pulls its fill and its text away from grid lines that stay
         put. It materialises in place instead: the grid is structure, standing
         from the start, and the content lands in it row by row. */
      if (m.cell) return 'rv-fade';
      if (b.h <= 6 && b.w >= 30) return 'rv-wipe';        // horizontal rule
      if (b.w <= 6 && b.h >= 30) return 'rv-down';        // vertical rule
      /* A ring or a harvey ball sliding 18px upward reads as a bubble coming
         loose. Scaling it up in place is what a dot does. */
      if (m.el.getAttribute && (m.el.getAttribute('data-frac') ||
          (Math.abs(b.w - b.h) <= 10 && b.w <= 80 && isRound(m.el)))) return 'rv-pop';
      if (!m.t && b.w >= 260 && b.h >= 150) return 'rv-down';   // panel opens
      return '';
    }

    function place(list, at, sweep, isCanvas) {
      /* Inside a CONTENT beat, sweep left to right when the band really is a
         row of separate things -- the five step cards on slide 11, or a table
         row's label / number / text / timeline. Parts of one entry sit within a
         few px of each other, share a column, and so still land together.

         The sheet, the headline and the structure do not sweep: a background is
         simply there, and a title that assembles itself left to right reads as
         a glitch rather than as an entrance. */
      /* Columns are clustered by LEFT EDGE, not by the gap to the previous
         shape's right edge. Measuring the gap chains a band together whenever
         two entries sit close: slide 11's five step cards are 243px apart but
         only 13px of clear air lies between them, so every card joined the
         first card's column and the whole row landed in one beat -- the
         opposite of the 1..5 arrival it is supposed to have. Parts of one entry
         start within a few px of each other and still share a column. */
      var cols = list.slice().sort(function (a, b) { return a.b.x - b.b.x; });
      var col = -1, colX = -1e9;
      cols.forEach(function (m) {
        if (m.b.x - colX > 40) { col++; colX = m.b.x; }
        var d = at + (sweep ? Math.min(col, 4) * sub : 0);
        m.el.style.setProperty('--d', d + 'ms');
        /* a part of an opened container animates in place, so it needs the
           rule that reaches past the slide's own children */
        if (m.nested) m.el.classList.add('rv-i');
        var kind = motion(m, isCanvas);
        if (kind) m.el.classList.add(kind);
        /* the bars belong to the chart box and must not grow behind it */
        if (m.el.classList.contains('chart')) m.el.dataset.revealAt = d;
        if (d > last) last = d;
      });
    }

    if (plan.canvas.length) { place(plan.canvas, LEAD + beat * step, false, true); beat++; }
    if (plan.header.length) { place(plan.header, LEAD + beat * step, false); beat++; }
    if (plan.structure.length) { place(plan.structure, LEAD + beat * step, false); beat++; }
    plan.rows.forEach(function (row) {
      place(row.items, LEAD + beat * step, true);
      beat++;
    });
    var settled = last + RISE;                            // the last one has landed

    /* the focus outline waits for the content to settle, then draws itself */
    var focus = meta.map(function (m) { return m.el; }).filter(isFocusMarker);
    if (!focus.length) return settled;
    focus.forEach(function (el) {
      el.classList.add('ix-focus');
      el.style.setProperty('--d', (settled + 120) + 'ms');
    });
    /* the moment the fade starts is the moment the pen starts moving */
    slide.setAttribute('data-focus-at', settled + 120);
    return settled + 120 + 620;
  }

  /* ------------------------------------------------------------- apply */
  var revealMs = {};
  slides.forEach(function (slide, i) {
    revealMs[i] = stageReveal(slide);
    wire(slide, i);
    wirePulse(slide);
    wireTables(slide, i);
    if (!reduced) {
      [].slice.call(slide.querySelectorAll('.chart rect.bar')).forEach(function (r) {
        setBar(r, 0, r.getAttribute('data-base'));
      });
      [].slice.call(slide.querySelectorAll('.chart text')).forEach(function (t) {
        t.style.opacity = 0;
      });
    }
  });

  /* Every delay on this slide is measured from the moment deck.js adds `.seen`,
     because that is when the transitions start. So the pen that draws the focus
     marker and the teardown that follows it have to hang off the SAME moment.
     They used to hang off a second IntersectionObserver with its own threshold
     (0.15 against deck.js's 0.25): on a slow scroll the marker began drawing
     before it had faded in, and on a fast one the teardown could cut the last
     band short by jumping it to its final opacity. */
  function onSeen(slide, fn) {
    if (slide.classList.contains('seen')) { fn(); return; }
    var mo = new MutationObserver(function () {
      if (!slide.classList.contains('seen')) return;
      mo.disconnect();
      fn();
    });
    mo.observe(slide, { attributes: true, attributeFilter: ['class'] });
  }

  slides.forEach(function (slide, i) {
    onSeen(slide, function () {
      var at = parseFloat(slide.getAttribute('data-focus-at'));
      if (at >= 0) setTimeout(function () { drawFocus(slide); }, at);

      /* Chart bars grow with their chart box rather than with the slide: they
         used to start the moment the slide came into view, which on slide 5
         spent the whole 700ms grow-in behind a box that was still fading, so
         the chart was simply finished by the time you could see it. */
      var chart = slide.querySelector('.chart');
      if (chart && chart.querySelector('rect.bar')) {
        var wait = Math.min(parseFloat(chart.dataset.revealAt) || 0, 700);
        setTimeout(function () {
          growBars([].slice.call(slide.querySelectorAll('.chart rect.bar')), 90);
          /* the printed values sit at fixed positions, so they belong on top of
             bars that have finished growing, not on top of moving ones */
          [].slice.call(slide.querySelectorAll('.chart text')).forEach(function (t, k) {
            if (reduced) { t.style.opacity = 1; return; }
            setTimeout(function () {
              t.style.transition = 'opacity .55s';
              t.style.opacity = 1;
            }, 850 + k * 60);
          });
        }, wait);
      }

      /* Once the reveal has played, tear it down: a `forwards` fill keeps
         winning over hover motion for as long as it is applied. */
      setTimeout(function () {
        slide.classList.remove('anim', 'seen');
        slide.classList.add('shown');
        [].slice.call(slide.children)
          .concat([].slice.call(slide.querySelectorAll('.rv-i')))
          .forEach(function (el) { el.style.removeProperty('--d'); });
      }, (revealMs[i] || 900) + 120);
    });
  });
}
