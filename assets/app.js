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

/* builds one tower: containerId is an empty .pdrum-frame element, images is
   [{src, title, portrait}], direction -1 flips right-to-left, 1 flips left-to-right.
   Only ONE set of photos (2 wide x 5 tall) is ever in the DOM at a time — every few
   seconds it flips over, face-down, and comes back up showing the next set. That
   keeps it to a single column of pictures with no second column ever able to bleed
   into it, and the photos sit flat (no ongoing 3D tilt) so their edges stay crisp. */
window.buildPhotoDrum = function (containerId, images, direction) {
  var container = document.getElementById(containerId);
  if (!container || !images || !images.length) { return; }

  var scene = document.createElement('div');
  scene.className = 'pdrum-scene';
  var drum = document.createElement('div');
  drum.className = 'pdrum' + (direction < 0 ? ' pdrum--r2l' : '');
  scene.appendChild(drum);
  container.appendChild(scene);

  /* every photo gets its own starting point in the style cycle, staggered by
     its position in the list. Without this, every photo refills in the same
     order on every pass, so their pass-counters stay locked in step and the
     *entire* tower periodically lands on the same treatment at once — a wall
     of photos all going impressionist (or all going grayscale-ish manga)
     together, instead of each one showing something different. */
  images.forEach(function (im, idx) { im._pdOffset = idx % PD_STYLES.length; });

  var ROWS = 5, COLS = 2;
  var BUDGET = ROWS * COLS;

  var queue = images.slice();
  function refillQueue() { queue = queue.concat(images); }
  function takeNext(budget) {
    if (!queue.length) { refillQueue(); }
    var idx = -1;
    for (var k = 0; k < queue.length; k++) {
      if ((queue[k].portrait ? 2 : 1) <= budget) { idx = k; break; }
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
  function fillBatch() {
    var budget = BUDGET;
    while (budget > 0) {
      var im = takeNext(budget);
      var span = im.portrait ? 2 : 1;
      /* each photo remembers how many times it's been dealt, across the whole life
         of this tower, so its own Nth appearance picks the Nth style in the cycle —
         offset by its own staggered starting point, so simultaneous tiles differ */
      im._pdPass = (im._pdPass || 0) + 1;
      var styleDef = PD_STYLES[(im._pdPass - 1 + im._pdOffset) % PD_STYLES.length];
      var t = makeTile(im, styleDef);
      t.style.gridRow = 'span ' + span;
      drum.appendChild(t);
      budget -= span;
    }
  }
  fillBatch();

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var paused = false, timer = null, flipping = false;

  function scheduleFlip() {
    if (reducedMotion) { return; }
    clearTimeout(timer);
    timer = setTimeout(flip, 4600);
  }
  function flip() {
    if (paused || pdrumZoomOpen || flipping) { scheduleFlip(); return; }
    flipping = true;
    drum.classList.add('pdrum-flip');
    setTimeout(function () {
      while (drum.firstChild) { drum.removeChild(drum.firstChild); }
      fillBatch();
      drum.classList.add('pdrum-no-anim');
      drum.classList.remove('pdrum-flip');
      void drum.offsetWidth; /* force reflow so the next class change transitions */
      drum.classList.remove('pdrum-no-anim');
      flipping = false;
      scheduleFlip();
    }, 620);
  }
  scheduleFlip();

  drum.addEventListener('pointerover', function (e) {
    if (!e.target.closest('.pdrum-tile')) { return; }
    paused = true;
    drum.classList.add('pd-hovering');
  });
  drum.addEventListener('pointerleave', function () {
    paused = false;
    drum.classList.remove('pd-hovering');
  });
  drum.addEventListener('focusin', function (e) {
    if (!e.target.closest('.pdrum-tile')) { return; }
    paused = true;
    drum.classList.add('pd-hovering');
  });
  drum.addEventListener('focusout', function () {
    paused = false;
    drum.classList.remove('pd-hovering');
  });
};



/* ---- scroll spine: two parallel lines start apart near the top, converge to
   a point, then run straight down the right margin as one line as you scroll
   — ending in a small flourish once you reach the bottom. Deliberately simple:
   an earlier version tried to split the line around every quote and ended up
   cutting across body text instead. Desktop-only — below the breakpoint where
   .main gets its own column there's no margin left for it to run through. ---- */
(function () {
  var MIN_WIDTH = 1024; /* matches the 64rem breakpoint where .main gets its own column */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var SPLIT = 3.5; /* gap between the two strokes where the line starts, before it converges */
  var wrap = null, svg = null, pathA = null, pathB = null, arrow = null;
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

    svg.appendChild(pathA);
    svg.appendChild(pathB);
    svg.appendChild(arrow);
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
    var mainLeft = mainRect.left + scrollY;
    var mainRight = mainRect.right + scrollY;
    var docHeight = document.documentElement.scrollHeight;
    var trackOffset = 16;
    var trackX = mainRight + trackOffset;

    /* ---- two lines start apart, side by side, and converge to a single
       point near the top right, where they carry on as one, straight down
       the right margin, all the way to the bottom ---- */
    var convergeY = Math.max(30, mainRect.top + scrollY + 18);
    var dA = 'M ' + f(mainLeft) + ' ' + f(convergeY - SPLIT);
    var dB = 'M ' + f(mainLeft) + ' ' + f(convergeY + SPLIT);
    dA += ' L ' + f(trackX) + ' ' + f(convergeY - SPLIT);
    dB += ' L ' + f(trackX) + ' ' + f(convergeY + SPLIT);
    dA += ' L ' + f(trackX) + ' ' + f(convergeY);
    dB += ' L ' + f(trackX) + ' ' + f(convergeY);
    /* merged from here: straight down, nothing to detour around */
    dA += ' L ' + f(trackX) + ' ' + f(docHeight);
    dB += ' L ' + f(trackX) + ' ' + f(docHeight);

    /* ---- a small hand-drawn-ish flourish once it reaches the very bottom,
       so the line visibly comes to an end rather than just trailing off ---- */
    var fx = trackX, fy = docHeight;
    var flourish =
      ' C ' + f(fx - 2) + ' ' + f(fy + 22) + ' ' + f(fx - 34) + ' ' + f(fy + 18) + ' ' + f(fx - 30) + ' ' + f(fy + 42) +
      ' C ' + f(fx - 27) + ' ' + f(fy + 60) + ' ' + f(fx - 2) + ' ' + f(fy + 60) + ' ' + f(fx - 8) + ' ' + f(fy + 40) +
      ' C ' + f(fx - 12) + ' ' + f(fy + 26) + ' ' + f(fx - 24) + ' ' + f(fy + 30) + ' ' + f(fx - 22) + ' ' + f(fy + 44);
    dA += flourish;
    dB += flourish;

    pathA.setAttribute('d', dA);
    pathB.setAttribute('d', dB);
    var svgHeight = docHeight + 70;
    svg.setAttribute('width', document.documentElement.clientWidth);
    svg.setAttribute('height', svgHeight);
    wrap.style.height = svgHeight + 'px';

    lenA = pathA.getTotalLength();
    lenB = pathB.getTotalLength();
    pathA.style.strokeDasharray = lenA;
    pathB.style.strokeDasharray = lenB;

    /* sample line A so "how much to reveal" can be driven by actual document
       position rather than a raw length fraction */
    samples = [];
    var sampleStep = Math.max(8, lenA / 400);
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
  /* photos and web fonts can still land late and nudge the page height —
     redraw a couple more times to catch that without polling forever */
  setTimeout(buildPath, 800);
  setTimeout(buildPath, 2200);
})();
