(function () {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
    var map = {};
    links.forEach(function (a) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) { map[a.getAttribute('href').slice(1)] = a; }
    });
    var ids = Object.keys(map);
    if (!ids.length || !('IntersectionObserver' in window)) { return; }

    function setCurrent(id) {
      links.forEach(function (a) { a.removeAttribute('aria-current'); });
      if (map[id]) { map[id].setAttribute('aria-current', 'true'); }
    }
    setCurrent(ids[0]);

    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      for (var i = 0; i < ids.length; i++) {
        if (visible[ids[i]]) { setCurrent(ids[i]); return; }
      }
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

    ids.forEach(function (id) { io.observe(document.getElementById(id)); });
  })();

(function () {
    var figs = Array.prototype.slice.call(document.querySelectorAll('.gallery figure, figure.band, .find-img'));
    if (!figs.length) { return; }

    var lb = document.getElementById('lb');
    var img = document.getElementById('lb-img');
    var cap = document.getElementById('lb-cap');
    var count = document.getElementById('lb-count');
    var prevBtn = document.getElementById('lb-prev');
    var nextBtn = document.getElementById('lb-next');
    var closeBtn = document.getElementById('lb-close');
    var i = 0, lastFocus = null;

    var items = figs.map(function (f) {
      var im = f.querySelector('img');
      var fc = f.querySelector('figcaption');
      return { src: im.getAttribute('src'), alt: im.getAttribute('alt') || '', cap: fc ? fc.textContent.trim() : '' };
    });

    function show(n) {
      i = (n + items.length) % items.length;
      var it = items[i];
      img.src = it.src;
      img.alt = it.alt;
      cap.textContent = it.cap;
      count.textContent = (i + 1) + ' / ' + items.length;
    }

    function open(n) {
      lastFocus = document.activeElement;
      show(n);
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    }

    function close() {
      lb.hidden = true;
      img.removeAttribute('src');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    }

    figs.forEach(function (f, n) {
      var im = f.querySelector('img');
      if (im.closest('a')) { return; } // image is itself a link out — let it navigate, skip the lightbox
      im.setAttribute('tabindex', '0');
      im.setAttribute('role', 'button');
      im.addEventListener('click', function () { open(n); });
      im.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(n); }
      });
    });

    closeBtn.addEventListener('click', close);
    img.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { show(i - 1); });
    nextBtn.addEventListener('click', function () { show(i + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) { close(); } });

    document.addEventListener('keydown', function (e) {
      if (lb.hidden) { return; }
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'ArrowLeft') { show(i - 1); }
      else if (e.key === 'ArrowRight') { show(i + 1); }
      else if (e.key === 'Tab') {
        var f = [closeBtn, prevBtn, nextBtn];
        var at = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });

    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) { return; }
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) { show(i + (dx < 0 ? 1 : -1)); }
      x0 = null;
    }, { passive: true });
  })();

(function () {
    var bar = document.querySelector('#progress span');
    if (!bar) { return; }
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var max = (h.scrollHeight - h.clientHeight) || 1;
      var pct = Math.min(100, Math.max(0, (h.scrollTop || window.pageYOffset) / max * 100));
      bar.style.width = pct.toFixed(2) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  })();

/* ---- enquiry form: send without leaving the page ---- */
(function () {
    var form = document.querySelector('.enq-form');
    if (!form || !window.fetch) { return; }   // without JS the plain POST still works
    var btn = form.querySelector('button[type="submit"]');
    var status = form.querySelector('.enq-status');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      btn.disabled = true;
      status.removeAttribute('data-state');
      status.textContent = 'Sending…';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (r) {
        if (!r.ok) { throw new Error('bad status'); }
        var thanks = document.createElement('p');
        thanks.className = 'enq-thanks';
        thanks.textContent = 'Thank you — that reached me. I read everything myself, and I answer most things.';
        thanks.setAttribute('tabindex', '-1');
        form.parentNode.replaceChild(thanks, form);
        thanks.focus();
      }).catch(function () {
        btn.disabled = false;
        status.setAttribute('data-state', 'err');
        status.textContent = 'Didn’t send — try LinkedIn instead';
      });
    });
  })();

/* ---- photo tower: one flipping wall of photos, used in Seen and Made ---- */
var pdrumZoomOpen = false;
var pdrumLastFocus = null;

function openPdrumZoom(im, drum) {
  var overlay = document.getElementById('pdrumZoom');
  if (!overlay) { return; }
  var img = document.getElementById('pdrumZoomImg');
  var cap = document.getElementById('pdrumZoomCap');
  pdrumLastFocus = document.activeElement;
  img.src = im.src; img.alt = im.title; cap.textContent = im.title;
  overlay.hidden = false;
  pdrumZoomOpen = true;
  requestAnimationFrame(function () { overlay.classList.add('show'); });
  document.getElementById('pdrumZoomClose').focus();
}
function closePdrumZoom() {
  var overlay = document.getElementById('pdrumZoom');
  if (!overlay) { return; }
  overlay.classList.remove('show');
  pdrumZoomOpen = false;
  setTimeout(function () {
    overlay.hidden = true;
    document.getElementById('pdrumZoomImg').removeAttribute('src');
  }, 220);
  if (pdrumLastFocus && pdrumLastFocus.focus) { pdrumLastFocus.focus(); }
}
(function () {
  var overlay = document.getElementById('pdrumZoom');
  if (!overlay) { return; }
  var closeBtn = document.getElementById('pdrumZoomClose');
  overlay.addEventListener('click', function (e) { if (e.target === overlay) { closePdrumZoom(); } });
  if (closeBtn) { closeBtn.addEventListener('click', closePdrumZoom); }
  document.addEventListener('keydown', function (e) {
    if (!overlay.hidden && e.key === 'Escape') { closePdrumZoom(); }
  });
})();

/* the treatment a photo gets each time it comes back around — 1st appearance is
   plain, then it cycles through these. label is appended to the caption; className
   is added to the <figure> so CSS (and, for a couple of them, the SVG filters
   defined in index.html) can style the <img> and lay any overlay on top of it. */
var PD_STYLES = [
  { key: 'original', className: '', label: '' },
  { key: 'impressionist', className: 'pd-style-impressionist', label: 'impressionist pass' },
  { key: 'pointillist', className: 'pd-style-pointillist', label: 'pointillist pass' },
  { key: 'fauvist', className: 'pd-style-fauvist', label: 'fauvist pass' },
  { key: 'woodblock', className: 'pd-style-woodblock', label: 'woodblock pass' },
  { key: 'manga', className: 'pd-style-manga', label: 'manga pass' }
];

/* builds ONE gigantic tower: containerId is an empty .pdrum-frame element,
   images is [{src, title, portrait}] — meant to be the combined Seen + Made
   collection, all in one structure. direction -1 turns right-to-left, 1 turns
   left-to-right.

   A real 3D cylinder — columns of photographs mounted around a drum, like a
   Rolodex or a lazy Susan — not a flat grid pretending to rotate. Rotation is
   driven from JS (a plain rAF loop advancing an angle) rather than a CSS
   @keyframes animation, for one reason: it lets this function always know
   exactly which column is currently on the FAR side of the drum, facing
   away from the viewer. Every so often it quietly re-deals that one hidden
   column with its next batch of photographs — each one stepped forward to
   its next style treatment — so by the time it swings back into view it's
   showing something different. The swap itself is never visible; only the
   result of it, arriving a few seconds later, is. */
window.buildPhotoDrum = function (containerId, images, direction) {
  var container = document.getElementById(containerId);
  if (!container || !images || !images.length) { return; }

  var scene = document.createElement('div');
  scene.className = 'tower-scene';
  var drum = document.createElement('div');
  drum.className = 'tower-drum';
  scene.appendChild(drum);
  container.appendChild(scene);

  /* every photo gets its own starting point in the style cycle, staggered by
     its position in the list, so simultaneous tiles don't all land on the
     same treatment at the same time */
  images.forEach(function (im, idx) { im._pdOffset = idx % PD_STYLES.length; });

  /* FACES/radius match the reference tower exactly (9 faces, radius 234) --
     that's what gives it two columns facing you at once and the spacing Mark
     prefers, rather than the single dominant wedge a bigger radius produces.
     ROWS_PER_FACE is doubled from the reference's 5 to make this one
     substantially taller, without stretching individual tiles. */
  var FACES = 9, ROWS_PER_FACE = 10;
  var FACE_BUDGET = ROWS_PER_FACE;
  var radius = 234;

  var queue = images.slice();
  function refillQueue() { queue = queue.concat(images); }
  function takeNext(budget) {
    if (!queue.length) { refillQueue(); }
    var idx = -1;
    for (var k = 0; k < queue.length; k++) {
      if ((queue[k].portrait ? 3 : 1) <= budget) { idx = k; break; }
    }
    if (idx === -1) { refillQueue(); idx = 0; }
    return queue.splice(idx, 1)[0];
  }
  function makeTile(im, styleDef) {
    var fig = document.createElement('figure');
    fig.className = 'pdrum-tile' + (styleDef.className ? ' ' + styleDef.className : '');
    var img = document.createElement('img');
    img.src = im.src; img.alt = im.title; img.loading = 'lazy';
    var cap = document.createElement('figcaption');
    cap.textContent = im.title;
    if (styleDef.label) {
      var tag = document.createElement('span');
      tag.className = 'pd-style-tag';
      tag.textContent = ' — ' + styleDef.label;
      cap.appendChild(tag);
    }
    fig.appendChild(img); fig.appendChild(cap);
    fig.setAttribute('tabindex', '0');
    fig.setAttribute('role', 'button');
    fig.addEventListener('click', function () { openPdrumZoom(im, drum); });
    fig.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPdrumZoom(im, drum); }
    });
    return fig;
  }
  function fillFace(col) {
    while (col.firstChild) { col.removeChild(col.firstChild); }
    var budget = FACE_BUDGET;
    while (budget > 0) {
      var im = takeNext(budget);
      var span = im.portrait ? 3 : 1;
      /* each photo remembers how many times it's been dealt, across the whole
         life of this tower, so its own Nth appearance picks the Nth style in
         the cycle — offset by its own staggered starting point */
      im._pdPass = (im._pdPass || 0) + 1;
      var styleDef = PD_STYLES[(im._pdPass - 1 + im._pdOffset) % PD_STYLES.length];
      var t = makeTile(im, styleDef);
      t.style.gridRow = 'span ' + span;
      col.appendChild(t);
      budget -= span;
    }
  }

  var cols = [];
  for (var i = 0; i < FACES; i++) {
    var col = document.createElement('div');
    col.className = 'tower-col';
    col.style.transform = 'rotateY(' + (i * 360 / FACES) + 'deg) translateZ(' + radius + 'px)';
    col._faceAngle = i * 360 / FACES;
    fillFace(col);
    drum.appendChild(col);
    cols.push(col);
  }

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var paused = false;

  drum.addEventListener('pointerover', function (e) {
    if (!e.target.closest('.pdrum-tile')) { return; }
    paused = true;
  });
  drum.addEventListener('pointerleave', function () { paused = false; });
  drum.addEventListener('focusin', function (e) {
    if (!e.target.closest('.pdrum-tile')) { return; }
    paused = true;
  });
  drum.addEventListener('focusout', function () { paused = false; });

  if (reducedMotion) { return; } /* static build above is enough */

  /* ---- JS-driven turn, 46s per revolution (same speed as the reference),
     turning the same direction it does (rotateY decreasing), plus the quiet
     re-deal of whichever single face is currently hidden on the far side ---- */
  var PERIOD_MS = 46000;
  var degPerMs = (360 / PERIOD_MS) * (direction < 0 ? -1 : 1);
  var rotation = 0, lastT = null, nextFaceToRefill = 0, lastRefillCheck = 0;

  function normalize(a) { a = a % 360; return a < 0 ? a + 360 : a; }

  function maybeRefillHiddenFace(now) {
    if (now - lastRefillCheck < 400) { return; }
    lastRefillCheck = now;
    var col = cols[nextFaceToRefill];
    var effective = normalize(col._faceAngle + rotation);
    /* the drum's far side — safely out of view behind the near faces */
    if (effective > 150 && effective < 210) {
      fillFace(col);
      nextFaceToRefill = (nextFaceToRefill + 1) % FACES;
    }
  }

  function tick(t) {
    if (lastT === null) { lastT = t; }
    var dt = t - lastT;
    lastT = t;
    if (!paused && !pdrumZoomOpen) {
      rotation += degPerMs * dt;
      drum.style.transform = 'rotateY(' + rotation + 'deg)';
      maybeRefillHiddenFace(t);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
};



/* ---- scroll spine: two parallel lines start apart near the top, converge to
   a point, then run down the page as one line — tracing a small mark beside
   each quote as it passes (a full double-ruled box when the quote already
   sits close to the margin, or just a short flag poking OUTWARD into the
   margin when it doesn't — so the line is never forced to sweep across
   unrelated text to reach it), switching from one side of the page to the
   other after every quote, then ending in a small flourish at the bottom.
   ("Two parallel lines" — the 20th Parallel — that's the joke.) Desktop-only
   — below the breakpoint where .main gets its own column there's no margin
   left for it to run through. ---- */
(function () {
  var MIN_WIDTH = 1024; /* matches the 64rem breakpoint where .main gets its own column */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var SPLIT = 3.5; /* gap between the two strokes wherever the line splits */
  var PAD = 10; /* breathing room traced around each quote's own box */
  var NEAR_CAP = 70; /* if a quote's near edge is within this of the track, the
    jog over to it — and the trace around its own top/bottom edge once there —
    can't cross anything else to get there, so it's safe to box fully */
  var TICK_NEAR = 8, TICK_FAR = 16; /* a quote too deep in the column for that
    gets a small flag instead, reaching only this far, and always OUTWARD
    away from the content, so it can never cross anything no matter where
    the quote actually sits */
  var wrap = null, svg = null, pathA = null, pathB = null, arrow = null, signoff = null;
  var lenA = 0, lenB = 0, samples = [];
  var resizeTimer = null;

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function supported() {
    return window.innerWidth >= MIN_WIDTH && !reducedMotion();
  }

  function ensureDom() {
    if (wrap) { return; }
    wrap = document.createElement('div');
    wrap.id = 'scrollLineWrap';
    wrap.setAttribute('aria-hidden', 'true');

    svg = document.createElementNS(SVGNS, 'svg');
    svg.id = 'scrollLineSvg';

    pathA = document.createElementNS(SVGNS, 'path');
    pathA.setAttribute('class', 'scroll-line-stroke');
    pathB = document.createElementNS(SVGNS, 'path');
    pathB.setAttribute('class', 'scroll-line-stroke');

    arrow = document.createElementNS(SVGNS, 'path');
    arrow.id = 'scrollLineArrow';
    arrow.setAttribute('d', 'M -6 -4.5 L 7 0 L -6 4.5 Z');

    /* a cursive sign-off the line "arrives at" once you reach the very
       bottom — a plain fade rather than a letter-by-letter write-on, since
       there's no reliable way to trace the length of rendered text the way
       getTotalLength() does for a path */
    signoff = document.createElementNS(SVGNS, 'text');
    signoff.id = 'scrollLineSignoff';
    signoff.setAttribute('text-anchor', 'end'); /* grows leftward from the
      track, away from the page edge, so it can't run off the right side */
    signoff.textContent = 'Thanks for stopping by!';

    svg.appendChild(pathA);
    svg.appendChild(pathB);
    svg.appendChild(arrow);
    svg.appendChild(signoff);
    wrap.appendChild(svg);
    document.body.appendChild(wrap);
  }

  function f(n) { return n.toFixed(1); }

  function buildPath() {
    if (!supported()) { return; }
    ensureDom();
    wrap.hidden = false;

    var main = document.querySelector('.main');
    if (!main) { return; }

    var mainRect = main.getBoundingClientRect();
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    var scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    var mainLeft = mainRect.left + scrollX;
    var mainRight = mainRect.right + scrollX;
    var docHeight = document.documentElement.scrollHeight;
    var viewportWidth = document.documentElement.clientWidth;
    var trackOffset = 16;
    var trackX = { right: mainRight + trackOffset, left: mainLeft - trackOffset };

    /* ---- two lines start apart, side by side, and converge to a single
       point near the top right, where they carry on as one ---- */
    var convergeY = Math.max(30, mainRect.top + scrollY + 18);
    var dA = 'M ' + f(mainLeft) + ' ' + f(convergeY - SPLIT);
    var dB = 'M ' + f(mainLeft) + ' ' + f(convergeY + SPLIT);
    dA += ' L ' + f(trackX.right) + ' ' + f(convergeY - SPLIT);
    dB += ' L ' + f(trackX.right) + ' ' + f(convergeY + SPLIT);
    dA += ' L ' + f(trackX.right) + ' ' + f(convergeY);
    dB += ' L ' + f(trackX.right) + ' ' + f(convergeY);
    /* merged from here down */

    var side = 'right';

    function mergedTo(x, y) {
      var seg = ' L ' + f(x) + ' ' + f(y);
      dA += seg; dB += seg;
    }
    function boxEdge(y, fromX, toX) {
      dA += ' L ' + f(fromX) + ' ' + f(y - SPLIT) + ' L ' + f(toX) + ' ' + f(y - SPLIT);
      dB += ' L ' + f(fromX) + ' ' + f(y + SPLIT) + ' L ' + f(toX) + ' ' + f(y + SPLIT);
      dA += ' L ' + f(toX) + ' ' + f(y);
      dB += ' L ' + f(toX) + ' ' + f(y);
    }

    var quotes = Array.prototype.slice.call(document.querySelectorAll('blockquote.marg'));

    quotes.forEach(function (q) {
      var r = q.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) { return; } /* not rendered */
      var top = r.top + scrollY - PAD;
      var bottom = r.bottom + scrollY + PAD;
      var left = r.left + scrollX - PAD;
      var right = r.right + scrollX + PAD;
      var trackHere = trackX[side];
      var nearX = side === 'right' ? right : left;
      var farX = side === 'right' ? left : right;
      var nearDist = Math.abs(trackHere - nearX);

      var enterX, otherX;
      if (nearDist <= NEAR_CAP) {
        /* close enough to the margin that reaching it, and tracing around
           its own edges once there, can't sweep across anything else */
        enterX = nearX;
        otherX = farX;
      } else {
        /* too deep in the column to reach safely — flag it instead with a
           short bracket poking OUT into the margin, never in toward the
           text, so it's structurally unable to cross anything */
        enterX = trackHere + (side === 'right' ? TICK_NEAR : -TICK_NEAR);
        otherX = trackHere + (side === 'right' ? TICK_FAR : -TICK_FAR);
      }

      mergedTo(trackHere, top);
      mergedTo(enterX, top);
      boxEdge(top, enterX, otherX);
      mergedTo(otherX, bottom);
      boxEdge(bottom, otherX, enterX);
      mergedTo(trackHere, bottom);

      /* switch to the other side of the page and carry on from there */
      var newSide = side === 'right' ? 'left' : 'right';
      mergedTo(trackX[newSide], bottom);
      side = newSide;
    });

    mergedTo(trackX[side], docHeight);

    /* ---- a small hand-drawn-ish flourish once it reaches the very bottom,
       so the line visibly comes to an end rather than just trailing off ---- */
    var fx = trackX[side], fy = docHeight;
    var flourish =
      ' C ' + f(fx - 2) + ' ' + f(fy + 22) + ' ' + f(fx - 34) + ' ' + f(fy + 18) + ' ' + f(fx - 30) + ' ' + f(fy + 42) +
      ' C ' + f(fx - 27) + ' ' + f(fy + 60) + ' ' + f(fx - 2) + ' ' + f(fy + 60) + ' ' + f(fx - 8) + ' ' + f(fy + 40) +
      ' C ' + f(fx - 12) + ' ' + f(fy + 26) + ' ' + f(fx - 24) + ' ' + f(fy + 30) + ' ' + f(fx - 22) + ' ' + f(fy + 44);
    dA += flourish;
    dB += flourish;

    signoff.setAttribute('x', f(fx - 4));
    signoff.setAttribute('y', f(fy + 104));

    pathA.setAttribute('d', dA);
    pathB.setAttribute('d', dB);
    var svgHeight = docHeight + 150;
    svg.setAttribute('width', viewportWidth);
    svg.setAttribute('height', svgHeight);
    wrap.style.height = svgHeight + 'px';

    lenA = pathA.getTotalLength();
    lenB = pathB.getTotalLength();
    pathA.style.strokeDasharray = lenA;
    pathB.style.strokeDasharray = lenB;

    /* sample line A so "how much to reveal" can be driven by actual document
       position rather than a raw length fraction — the split sections add
       length without adding much vertical ground, and a plain length
       fraction would drift further and further behind scroll position with
       every quote it's passed. A running max of y keeps it monotonic
       through the brief backtracks in each box/flag. */
    samples = [];
    var sampleStep = Math.max(8, lenA / 800);
    var runningMaxY = 0;
    for (var len = 0; len <= lenA; len += sampleStep) {
      var pt = pathA.getPointAtLength(len);
      runningMaxY = Math.max(runningMaxY, pt.y);
      samples.push({ len: len, y: runningMaxY });
    }
    var lastPt = pathA.getPointAtLength(lenA);
    runningMaxY = Math.max(runningMaxY, lastPt.y);
    samples.push({ len: lenA, y: runningMaxY });

    updateProgress();
  }

  function lengthForY(targetY) {
    if (!samples.length) { return 0; }
    var lo = 0, hi = samples.length - 1;
    if (targetY <= samples[0].y) { return samples[0].len; }
    if (targetY >= samples[hi].y) { return samples[hi].len; }
    while (lo < hi - 1) {
      var mid = (lo + hi) >> 1;
      if (samples[mid].y < targetY) { lo = mid; } else { hi = mid; }
    }
    var a = samples[lo], b = samples[hi];
    var t = (b.y - a.y) !== 0 ? (targetY - a.y) / (b.y - a.y) : 0;
    return a.len + t * (b.len - a.len);
  }

  function updateProgress() {
    if (!pathA || !lenA || !samples.length) { return; }
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    var h = document.documentElement;
    var atBottom = (scrollY + window.innerHeight) >= (h.scrollHeight - 2);
    var targetY = atBottom ? Infinity : scrollY + window.innerHeight * 0.35;
    var revealA = Math.min(lenA, lengthForY(targetY));
    var fracDone = lenA ? revealA / lenA : 0;
    var revealB = lenB * fracDone;

    pathA.style.strokeDashoffset = Math.max(0, lenA - revealA);
    pathB.style.strokeDashoffset = Math.max(0, lenB - revealB);

    /* the sign-off only ever shows once the line has actually drawn all the
       way down to the flourish — not just whenever you're near the bottom */
    if (signoff) {
      signoff.classList.toggle('show', atBottom && fracDone >= 0.999);
    }

    if (arrow && revealA > 0) {
      var tipLen = Math.min(lenA, revealA);
      var p2 = pathA.getPointAtLength(tipLen);
      var p1 = pathA.getPointAtLength(Math.max(0, tipLen - 2));
      var angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
      arrow.setAttribute('transform', 'translate(' + f(p2.x) + ',' + f(p2.y) + ') rotate(' + f(angle) + ')');
      arrow.style.opacity = '1';
    } else if (arrow) {
      arrow.style.opacity = '0';
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking || !supported()) { return; }
    ticking = true;
    requestAnimationFrame(function () { updateProgress(); ticking = false; });
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (supported()) { buildPath(); }
      else if (wrap) { wrap.hidden = true; }
    }, 150);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  /* build right away — the content is already in the DOM by the time this
     script runs, even if images are still landing — rather than waiting on
     window 'load', which can fire later than expected */
  buildPath();
  window.addEventListener('load', buildPath);
  /* a fixed delay can't know when the page is actually done growing — a page
     this image-heavy (two photo towers, lazy-loaded galleries further down)
     can still be gaining height well after 'load', and the SVG's own height
     gets measured too early, clipping everything below that point (the
     flourish included, and every quote below the cutoff). Watch the page's
     actual height and rebuild whenever it changes, instead of guessing how
     long to wait. */
  var lastHeight = document.documentElement.scrollHeight;
  function rebuildIfTaller() {
    var h = document.documentElement.scrollHeight;
    if (Math.abs(h - lastHeight) > 2) {
      lastHeight = h;
      buildPath();
    }
  }
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(rebuildIfTaller);
    ro.observe(document.body);
    ro.observe(document.documentElement);
  }
  /* belt and suspenders: the observers above can miss a height change when
     lazy images already reserve their final space via width/height attributes
     (no box resize to observe) — poll for a few seconds after load too, since
     a page this image-heavy can keep settling after 'load' fires. Stops
     itself once the height has held steady for a couple of checks. */
  var stableChecks = 0;
  var poll = setInterval(function () {
    var before = lastHeight;
    rebuildIfTaller();
    stableChecks = (lastHeight === before) ? stableChecks + 1 : 0;
    if (stableChecks >= 3) { clearInterval(poll); }
  }, 1000);
  setTimeout(function () { clearInterval(poll); }, 20000);
})();
