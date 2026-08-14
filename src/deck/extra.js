/* =====================================================================
   BXD web deck — hand-authored extra slide(s), appended after the
   generated deck.

   `slides.js` is a build artifact: tools/render.py overwrites it from
   ref.pptx, so a hand-made slide cannot live there. Anything in this file
   is authored by hand and survives a regeneration. deck.js mounts
   `EXTRA_SLIDES` after `SLIDES` and takes their titles for the rail, the
   menu and the navbar.

   The one slide here is a re-cut of slide 8 (the GTM pipeline). Slide 8
   itself is untouched: it prints 21 partner houses and 24 contacts as one
   8pt wall of text across two tables, which is accurate but unreadable on
   screen. This version carries EXACTLY the same data -- every name, house
   and role string is copied verbatim out of the generated markup, not
   retyped -- and makes it legible by disclosing it progressively:

     - filter chips per pipeline stage,
     - a search box over house / person / role,
     - one accordion row per partner: the role text is hidden until asked
       for, and only one row is open at a time so the columns cannot grow
       past the slide.

   Its CSS lives in this file rather than in index.html: both builds load
   the same extra.js byte for byte, so the slide and its styling cannot
   drift apart the way two copies in two index.html files would.
   ===================================================================== */
import { HTW } from './htw.js';

  /* ------------------------------------------------------------ data
     Copied verbatim from slide 8's tables (tools dumped the cells and the
     logo that falls inside each one). Line breaks inside a cell are joined
     with a space; nothing else is edited -- including "Sylvine Besson)",
     which carries a stray bracket in the source deck, and the "XXX"
     placeholders the deck itself still has. */
  var STAGES = [
    { id: 'Identified', label: 'Identified', color: '#6432FA' },
    { id: 'Initial Discussions', label: 'Initial Discussions', color: '#C83CFF' },
    { id: 'Solution Development', label: 'Solution Development', color: '#0096D7' },
    { id: 'Contracting & Implementation', label: 'Contracting & Impl.', color: '#46E6E6' },
    { id: 'Won', label: 'Won', color: '#8B5CF6' }
  ];

  var PARTNERS = [
    /* ---- Issuers ---- */
    { g: 'Issuers', s: 'Identified', co: 'Raiffeisen Bank', logo: 'image7.png', pitch: true,
      p: [['Willi Bucher', 'Bereichsleiter Strukturierte Produkte & FX Advisory Raiffeisen Schweiz Board Member SSPA']] },
    { g: 'Issuers', s: 'Identified', co: 'Julius Bär', logo: 'image8.png',
      p: [['Patric Rippstein', 'XXX']] },
    { g: 'Issuers', s: 'Identified', co: 'BCV', logo: 'image9.png',
      p: [['Vincenzo Bochicchio', 'Head of Trading at BCV']] },
    { g: 'Issuers', s: 'Identified', co: 'Luzerner Kantonalbank', logo: 'image10.png',
      p: [['Claudio Topatigh', 'Leiter Kompetenzzentrum Strukturierte Produkte bei Luzerner Kantonalbank AG']] },
    { g: 'Issuers', s: 'Identified', co: 'Marex', logo: 'image11.png',
      p: [['Karim Meddah', 'Investment Solutions chez Marex Solutions']] },
    { g: 'Issuers', s: 'Identified', co: 'Société Générale', logo: 'image12.png',
      p: [['Dominique Böhler', 'Head Public Distribution Switzerland & Ireland at Societe Generale Corporate and Investment Banking - SGCIB']] },
    { g: 'Issuers', s: 'Identified', co: 'BNP Paribas', logo: 'image13.png',
      p: [['Irene Brunner', 'Head of Sales and Marketing Exchange Traded Solutions Switzerland at BNP Paribas']] },
    { g: 'Issuers', s: 'Identified', co: 'Goldman Sachs', logo: 'image14.png',
      p: [['TBD', '']] },
    { g: 'Issuers', s: 'Initial Discussions', co: 'UBS', logo: 'image15.png',
      p: [['Thomas Wicki', 'Global Markets - Derivatives'],
          ['Anna-Naomi Lang', 'Digital Assets - Structuring - Attorney-at-Law']] },
    { g: 'Issuers', s: 'Initial Discussions', co: 'Vontobel', logo: 'image16.png',
      p: [['Georg von Wattenwil', 'XXX']] },
    { g: 'Issuers', s: 'Initial Discussions', co: 'Leonteq', logo: 'image17.png',
      p: [['Manuel Dürr', 'MD - Head of Sales Switzerland at Leonteq']] },
    { g: 'Issuers', s: 'Initial Discussions', co: 'Zürcher Kantonalbank', logo: 'image18.png',
      p: [['Curdin Summermatter', 'Head of Structured Products Sales'],
          ['(Sebastian Gerigk)', 'XXX']] },
    { g: 'Issuers', s: 'Initial Discussions', co: 'GenTwo', logo: 'image19.png',
      p: [['Florian Marty', 'Managing Director Gentwo Digital']] },
    { g: 'Issuers', s: 'Solution Development', co: 'Maverix', logo: 'image26.png',
      p: [['David Schmid', 'Co-CEO and Co-Founder of Maverix Securities AG']] },
    /* ---- Custodians ---- */
    { g: 'Custodians', s: 'Identified', co: 'Pictet', logo: 'image24.png', pitch: true,
      p: [['Nicolas Liégeois', 'Head of Agency Trading Derivatives & Structured Products @ Pictet Group | CFA, CMT']] },
    { g: 'Custodians', s: 'Identified', co: 'Lombard Odier', logo: 'image27.png',
      p: [['Stephen Grady', 'XXX']] },
    { g: 'Custodians', s: 'Identified', co: 'Saxo', logo: 'image20.png',
      p: [['David Rey', 'XXX']] },
    { g: 'Custodians', s: 'Identified', co: 'Indosuez', logo: 'image21.png',
      p: [['Sylvine Besson)', 'XXX']] },
    { g: 'Custodians', s: 'Initial Discussions', co: 'Swissquote', logo: 'image22.png',
      p: [['Carl-Johan Munch-Jensen', 'Head of Trading at Swissquote']] },
    { g: 'Custodians', s: 'Initial Discussions', co: 'Interactive Brokers', logo: 'image23.png',
      p: [['Kevin Rohrbach', 'Senior Project Manager / Portfolio Manager | Capital Markets Infrastructure & Trading Venues | PMO Governance | Strategic Initiatives | PMP®']] },
    { g: 'Custodians', s: 'Initial Discussions', co: 'PostFinance', logo: 'image25.png',
      p: [['Alex Thoma', 'Head of Digital Assets at PostFinance AG'],
          ['Philipp Merkt', 'Chief Investment Officer bei PostFinance | Gestaltet kundenorientierte Lösungen entlang der finanziellen Bedürfnisse von Privatkunden']] }
  ];

  /* --------------------------------------------------------------- css */
/* the CSS for these two slides lives in
     src/styles/deck.css -- see the note there */

  /* ------------------------------------------------------------ helpers */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function stageOf(id) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return STAGES[i];
    return { id: id, label: id, color: '#9a97ab' };
  }
  function countStage(id) {
    return PARTNERS.filter(function (p) { return p.s === id; }).length;
  }
  function countGroup(g) {
    return PARTNERS.filter(function (p) { return p.g === g; }).length;
  }
  function people(p) {
    return p.p.reduce(function (n) { return n + 1; }, 0);
  }

  /* --------------------------------------------------------------- html */
  function rowHtml(p) {
    var st = stageOf(p.s);
    var first = p.p[0];
    var extra = p.p.length > 1 ? '<span class="gtm-more">+' + (p.p.length - 1) + '</span>' : '';
    /* everything the search box looks at, lower-cased once at build time */
    var hay = (p.co + ' ' + p.g + ' ' + p.s + ' ' + p.p.map(function (q) {
      return q[0] + ' ' + q[1];
    }).join(' ')).toLowerCase();

    var detail = p.p.map(function (q) {
      if (!q[1]) return '<p><b>' + esc(q[0]) + '</b> <span class="none">— noch offen</span></p>';
      return '<p><b>' + esc(q[0]) + '</b> — ' + esc(q[1]) + '</p>';
    }).join('');
    if (p.pitch) {
      detail += '<p class="none">Pitch One-Pager auf Folgeseiten</p>';
    }

    return '<div class="gtm-row' + (p.pitch ? ' pitch' : '') + '" role="button" tabindex="0"' +
      ' aria-expanded="false" data-stage="' + esc(p.s) + '" data-find="' + esc(hay) + '">' +
      '<div class="gtm-line">' +
        '<span class="gtm-logo"><img src="assets/' + p.logo + '" alt="' + esc(p.co) + '"></span>' +
        '<span class="gtm-co">' + esc(p.co) + '</span>' +
        '<span class="gtm-who">' + esc(first[0]) + '</span>' + extra +
        '<span class="gtm-tag"><span class="d" style="background:' + st.color + '"></span>' +
          esc(st.label) + '</span>' +
        '<span class="gtm-chev">▾</span>' +
      '</div>' +
      '<div class="gtm-detail"><div class="in">' + detail + '</div></div>' +
    '</div>';
  }

  function sectionHtml(group, cls, note) {
    var rows = PARTNERS.filter(function (p) { return p.g === group; }).map(rowHtml).join('');
    return '<section class="gtm-sec ' + cls + '">' +
      '<header class="gtm-sech"><span class="nm">' + esc(group) + note + '</span>' +
        '<span class="n">' + countGroup(group) + '</span>' +
        '<span class="hint">Zeile anklicken für die Rolle</span></header>' +
      '<div class="gtm-list">' + rows + '</div>' +
      '<div class="gtm-empty">Keine Treffer in dieser Auswahl.</div>' +
    '</section>';
  }

  function glanceHtml() {
    var total = PARTNERS.length;
    var bar = STAGES.map(function (s) {
      var n = countStage(s.id);
      if (!n) return '';
      return '<span style="flex:' + n + ';background:' + s.color + '"></span>';
    }).join('');
    var leg = STAGES.map(function (s) {
      var n = countStage(s.id);
      return '<i><span class="d" style="background:' + (n ? s.color : '#d6d3e0') + '"></span>' +
        esc(s.label) + ' <b>' + n + '</b></i>';
    }).join('');
    return '<div class="gtm-glance">' +
      '<div class="h">Pipeline · ' + total + ' Häuser</div>' +
      '<div class="gtm-meter">' + bar + '</div>' +
      '<div class="gtm-leg">' + leg + '</div>' +
    '</div>';
  }

  function chipsHtml() {
    var out = ['<button class="gtm-chip on" data-stage="*">Alle <b>' +
      PARTNERS.length + '</b></button>'];
    STAGES.forEach(function (s) {
      var n = countStage(s.id);
      out.push('<button class="gtm-chip' + (n ? '' : ' empty') + '" data-stage="' + esc(s.id) +
        '"' + (n ? '' : ' disabled') + '>' +
        '<span class="d" style="background:' + (n ? s.color : '#d6d3e0') + '"></span>' +
        esc(s.label) + ' <b>' + n + '</b></button>');
    });
    out.push('<input class="gtm-find" type="search" placeholder="Haus, Name oder Rolle suchen…"' +
      ' aria-label="Partner suchen">');
    return out.join('');
  }

  function slideHtml() {
    var contacts = PARTNERS.reduce(function (n, p) { return n + people(p); }, 0);
    return '<div class="gtm" data-nokeys>' +
      '<div class="gtm-hd">' +
        '<div class="gtm-t">GTM Pipeline — Partner im Detail</div>' +
        '<div class="gtm-s">Dieselben Daten wie Seite 8: ' + PARTNERS.length + ' Häuser, ' +
          contacts + ' Kontakte. Nach Stage filtern, suchen, Zeile aufklappen.</div>' +
        '<div class="gtm-key"><span class="gtm-keybox"></span>Pitch One-Pager auf Folgeseiten</div>' +
      '</div>' +
      '<div class="gtm-bar">' + chipsHtml() + '</div>' +
      '<div class="gtm-cols">' +
        sectionHtml('Issuers', 'issuers', '') +
        '<div class="gtm-sec custodians">' +
          sectionHtml('Custodians', 'inner', '<sup>1</sup>') +
          glanceHtml() +
        '</div>' +
      '</div>' +
      '<div class="gtm-foot">1. Exkl. die schon unter Issuers gelistet</div>' +
      '<img class="gtm-mark" src="assets/image2.png" alt="Boerse Stuttgart Group">' +
      '<div class="gtm-pg"></div>' +
    '</div>';
  }

  /* =====================================================================
     Slide 2 of this file: "How to win", slides 16 + 17 re-cut.

     Those two slides are one table -- four asset classes down the side,
     Issuers / Trading Platforms / Distribution / Key Offering across -- printed
     at 8pt with ~120 brand logos wedged between the words. The text alone does
     not carry it either: "Banks:" is followed by four LOGOS, not by a list.

     The content is NOT retyped here. tools/extract_htw.py reads it back out of
     the generated markup (so, out of the OOXML) into webppt/htw.js, including
     which logos sit on which line. Re-run render.py, re-run the extractor, and
     this slide follows the source deck.
     ===================================================================== */


  var HTW_COLORS = ['#6432FA', '#0096D7', '#C83CFF', '#1FA8B4'];

  function htwLinesHtml(groups) {
    var out = [];
    groups.forEach(function (g) {
      g.lines.forEach(function (ln) {
        var t = ln.text || '';
        if (t) {
          /* a bold line that is not a bullet is a heading inside the cell --
             "Key Asset Managers US", "Financial Institutions:" */
          var bullet = /^\s*[•·]/.test(t);
          var head = ln.bold && !bullet && !/^\s*-/.test(t);
          out.push('<div class="htw-ln' + (ln.bold ? ' b' : '') +
            (head ? ' head' : '') + (bullet ? ' bul' : '') +
            '">' + esc(t) + '</div>');
        }
        if (ln.logos && ln.logos.length) {
          out.push('<div class="htw-logos">' + ln.logos.map(function (src) {
            return '<img src="assets/' + esc(src) + '" alt="" loading="lazy">';
          }).join('') + '</div>');
        }
      });
    });
    return out.join('') || '<div class="htw-ln" style="color:#a5a2b8">—</div>';
  }

  function htwBrands(r) {
    var set = {};
    r.cells.forEach(function (c) {
      c.forEach(function (g) {
        g.lines.forEach(function (l) {
          (l.logos || []).forEach(function (s) { set[s] = 1; });
        });
      });
    });
    return Object.keys(set).length;
  }

  function htwSlideHtml() {
    if (!HTW || !HTW.rows) {
      return '<div class="htw"><div class="htw-hd"><div class="htw-t">How to win</div>' +
        '<div class="htw-s">htw.js fehlt — python tools/extract_htw.py ausführen.</div>' +
        '</div></div>';
    }
    var KO = HTW.columns.indexOf('Key Offering');
    var CHAIN = HTW.columns.map(function (c, i) { return i; })
      .filter(function (i) { return i !== KO; });

    var tabs = HTW.rows.map(function (r, i) {
      return '<button class="htw-tab' + (i === 0 ? ' on' : '') + '" data-i="' + i + '"' +
        ' style="border-top-color:' + (i === 0 ? HTW_COLORS[i] : '#e5e1f2') + '">' +
        '<span class="nm">' + esc(r.asset) + '</span>' +
        '<span class="ct">' + htwBrands(r) + ' Marken</span></button>';
    }).join('');

    var secs = HTW.rows.map(function (r, i) {
      var cols = [];
      CHAIN.forEach(function (ci, k) {
        if (k) cols.push('<div class="htw-arrow">›</div>');
        cols.push('<section class="htw-col" data-col="' + ci + '">' +
          '<div class="htw-ch">' +
            '<span class="no" style="background:' + HTW_COLORS[i] + '">' + (k + 1) + '</span>' +
            esc(HTW.columns[ci]) + '</div>' +
          '<div class="htw-lines">' + htwLinesHtml(r.cells[ci] || []) + '</div>' +
        '</section>');
      });
      var notes = (r.notes || []).map(function (n) {
        return '<div class="htw-note">' + esc(n) + '</div>';
      }).join('');
      return '<div class="htw-sec' + (i === 0 ? ' open' : '') + '" data-i="' + i + '">' +
        '<div class="htw-flow">' + cols.join('') + '</div>' +
        '<div class="htw-col ko" data-col="' + KO + '">' +
          '<div class="htw-ko">' +
            '<div class="htw-ch" style="border:0;background:none;padding:0">' +
              '<span class="lbl">' + esc(HTW.columns[KO]) + '</span></div>' +
            '<div class="htw-lines txt" style="overflow:visible;padding:0">' +
              htwLinesHtml(r.cells[KO] || []) + '</div>' +
          '</div>' +
        '</div>' + notes +
      '</div>';
    }).join('');

    return '<div class="htw" data-nokeys>' +
      '<div class="htw-hd">' +
        '<div class="htw-t">How to win — Wertschöpfungskette je Assetklasse</div>' +
        '<div class="htw-s">Dieselben Daten wie Seiten 16 und 17 — eine Assetklasse ' +
          'auf einmal, entlang der Wertschöpfungskette gelesen.</div>' +
      '</div>' +
      '<div class="htw-tabs">' + tabs + '</div>' +
      secs +
      '<div class="htw-foot">' +
        '<img class="htw-mark" src="assets/image2.png" alt="Boerse Stuttgart Group">' +
        '<span class="htw-src">Quelle: Seiten 16 &amp; 17 (unverändert im Deck)</span>' +
        '<span class="htw-pg"></span>' +
      '</div>' +
    '</div>';
  }

  export const EXTRA_SLIDES = [{
    title: 'GTM pipeline — partner detail (interactive)',
    html: slideHtml()
  }, {
    title: 'How to win — value chain by asset class (interactive)',
    html: htwSlideHtml()
  }];

  /* --------------------------------------------------------------- wiring */
  /* the slide-number field the generated slides carry, for a hand-made slide */
  function stampPageNo(root, sel) {
    var el = root.querySelector(sel);
    if (!el) return;
    var wrap = root.closest('.slidewrap');
    var all = [].slice.call(document.querySelectorAll('#deck .slidewrap'));
    el.textContent = String(all.indexOf(wrap) + 1);
  }

  function wireHtw() {
    var root = document.querySelector('#deck .htw');
    if (!root) return;
    stampPageNo(root, '.htw-pg');

    var secs = [].slice.call(root.querySelectorAll('.htw-sec'));
    var tabs = [].slice.call(root.querySelectorAll('.htw-tab'));

    /* Exactly one asset class on screen. Four at once is what makes the source
       slides unreadable -- it is the reason the type here can be 12.5px rather
       than the 8pt of the original. */
    function show(i) {
      secs.forEach(function (s, k) { s.classList.toggle('open', k === i); });
      tabs.forEach(function (t, k) {
        t.classList.toggle('on', k === i);
        t.setAttribute('aria-selected', k === i ? 'true' : 'false');
        t.style.borderTopColor = k === i ? HTW_COLORS[k] : '#e5e1f2';
      });
    }
    tabs.forEach(function (t, i) {
      t.setAttribute('role', 'tab');
      t.addEventListener('click', function () { show(i); });
    });
    show(0);
    /* The tabs are the only control on this slide. The stage headings used to
       be clickable too (each could take the full width); two ways to change
       the layout on one slide is one too many, and everything already fits
       three-up, so they are plain labels now. */

    /* Tabs and columns rise in once, the first time the slide is scrolled to
       -- the same treatment the GTM slide's rows get. This slide has no `.sp`
       shapes for the main interact.js reveal to find (it is one hand-built
       div, not generated markup), so without this it used to appear with no
       entrance at all. Delays are scoped per section rather than globally, so
       whichever asset class a tab switches to plays the same short rise. */
    tabs.forEach(function (t, i) { t.style.animationDelay = i * 45 + 'ms'; });
    secs.forEach(function (sec) {
      [].slice.call(sec.querySelectorAll('.htw-col')).forEach(function (c, i) {
        c.style.animationDelay = 150 + Math.min(i, 3) * 90 + 'ms';
      });
    });
    var slide = root.closest('.slide');
    if (slide && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        root.classList.add('in');
      }, { threshold: 0.2 });
      io.observe(slide);
    }
  }

  function wire() {
    wireHtw();
    var root = document.querySelector('#deck .gtm');
    if (!root) return;

    stampPageNo(root, '.gtm-pg');

    var rows = [].slice.call(root.querySelectorAll('.gtm-row'));
    var chips = [].slice.call(root.querySelectorAll('.gtm-chip'));
    var find = root.querySelector('.gtm-find');
    var stage = '*', term = '';

    function matches(row) {
      if (stage !== '*' && row.getAttribute('data-stage') !== stage) return false;
      if (term && row.getAttribute('data-find').indexOf(term) < 0) return false;
      return true;
    }
    function apply() {
      rows.forEach(function (r) {
        var ok = matches(r);
        r.style.display = ok ? '' : 'none';
        if (!ok) open(r, false);            // never leave a hidden row expanded
      });
      /* an empty section says so instead of showing a blank column */
      [].slice.call(root.querySelectorAll('.gtm-sec')).forEach(function (sec) {
        var list = sec.querySelector('.gtm-list'), note = sec.querySelector('.gtm-empty');
        if (!list || !note) return;
        var vis = [].slice.call(list.querySelectorAll('.gtm-row')).filter(function (r) {
          return r.style.display !== 'none';
        }).length;
        note.classList.toggle('on', vis === 0);
      });
    }
    function open(row, on) {
      row.classList.toggle('open', on);
      row.setAttribute('aria-expanded', on ? 'true' : 'false');
    }
    /* one row open at a time: the columns are sized for the collapsed list
       plus a single expansion, so letting every row open would run the
       Issuers column off the bottom of the slide */
    function toggle(row) {
      var was = row.classList.contains('open');
      rows.forEach(function (r) { open(r, false); });
      open(row, !was);
    }

    rows.forEach(function (r) {
      r.addEventListener('click', function () { toggle(r); });
      r.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); toggle(r); }
      });
    });
    chips.forEach(function (c) {
      if (c.disabled) return;
      c.addEventListener('click', function () {
        stage = c.getAttribute('data-stage');
        chips.forEach(function (o) { o.classList.toggle('on', o === c); });
        apply();
      });
    });
    if (find) {
      find.addEventListener('input', function () {
        term = find.value.trim().toLowerCase();
        apply();
      });
      /* Esc clears rather than bubbling up to the deck's menu handler */
      find.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); find.value = ''; term = ''; apply(); }
      });
    }

    /* rows rise in once, the first time the slide is scrolled to */
    var slide = root.closest('.slide');
    if (slide && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        rows.forEach(function (r, i) {
          r.style.animationDelay = Math.min(i, 14) * 26 + 'ms';
        });
        root.classList.add('in');
      }, { threshold: 0.2 });
      io.observe(slide);
    }
  }

/* Mounting is React's job now: <Deck> calls this once the slides are in
   the DOM, in place of the old DOMContentLoaded hook. */
export { wire as wireExtra };
