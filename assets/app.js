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

/* ---- scroll spine: a single line that grows as the page is scrolled, drawing a
   box around each marginal quote as it passes, then switching to the other side
   of the page and continuing. Desktop-only — below the breakpoint where .main
   gets its own column there's no margin left for it to run through. ---- */
(function () {
  var MIN_WIDTH = 1024; /* matches the 64rem breakpoint where .main gets its own column */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var wrap = null, svg = null, path = null, grad = null, pathLen = 0;
  var samples = []; /* {len, y} — maps distance along the path to how far down the
    page it reaches, using a running max so the box each quote gets traced in
    (which briefly doubles back on itself) still reads as forward progress */
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

    var defs = document.createElementNS(SVGNS, 'defs');
    grad = document.createElementNS(SVGNS, 'linearGradient');
    grad.id = 'scrollLineGrad';
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('x1', '0'); grad.setAttribute('x2', '0');
    grad.setAttribute('y1', '0'); grad.setAttribute('y2', '1');
    ['var(--celadon)', 'var(--brass)', 'var(--seal)'].forEach(function (c, idx) {
      var stop = document.createElementNS(SVGNS, 'stop');
      stop.setAttribute('offset', (idx / 2 * 100) + '%');
      stop.setAttribute('stop-color', c);
      grad.appendChild(stop);
    });
    defs.appendChild(grad);
    svg.appendChild(defs);

    path = document.createElementNS(SVGNS, 'path');
    path.id = 'scrollLinePath';
    path.setAttribute('stroke', 'url(#scrollLineGrad)');
    svg.appendChild(path);

    wrap.appendChild(svg);
    document.body.appendChild(wrap);
  }

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
    var viewportWidth = document.documentElement.clientWidth;
    var trackOffset = 16;
    var trackX = { right: mainRight + trackOffset, left: mainLeft - trackOffset };
    var pad = 10;

    var quotes = Array.prototype.slice.call(document.querySelectorAll('blockquote.marg'));
    var side = 'right';
    var d = 'M ' + trackX[side].toFixed(1) + ' 0';

    quotes.forEach(function (q) {
      var r = q.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) { return; } /* not rendered */
      var top = r.top + scrollY - pad;
      var bottom = r.bottom + scrollY + pad;
      var left = r.left + scrollY - pad;
      var right = r.right + scrollY + pad;
      var enterX = side === 'right' ? right : left;

      /* run down the track to the quote, jog in, trace all four sides of the box */
      d += ' L ' + trackX[side].toFixed(1) + ' ' + top.toFixed(1);
      d += ' L ' + enterX.toFixed(1) + ' ' + top.toFixed(1);
      d += ' L ' + right.toFixed(1) + ' ' + top.toFixed(1);
      d += ' L ' + right.toFixed(1) + ' ' + bottom.toFixed(1);
      d += ' L ' + left.toFixed(1) + ' ' + bottom.toFixed(1);
      d += ' L ' + left.toFixed(1) + ' ' + top.toFixed(1);
      d += ' L ' + enterX.toFixed(1) + ' ' + top.toFixed(1);

      /* exit on the opposite side and pick that track back up */
      var newSide = side === 'right' ? 'left' : 'right';
      var exitX = newSide === 'right' ? right : left;
      d += ' L ' + exitX.toFixed(1) + ' ' + bottom.toFixed(1);
      d += ' L ' + trackX[newSide].toFixed(1) + ' ' + bottom.toFixed(1);
      side = newSide;
    });

    d += ' L ' + trackX[side].toFixed(1) + ' ' + docHeight;

    path.setAttribute('d', d);
    svg.setAttribute('width', viewportWidth);
    svg.setAttribute('height', docHeight);
    wrap.style.height = docHeight + 'px';
    grad.setAttribute('y2', docHeight);

    pathLen = path.getTotalLength();
    path.style.strokeDasharray = pathLen;

    /* sample the path so "how much to reveal" can be driven by actual document
       position rather than a raw length fraction — the box detours around each
       quote add length without adding much vertical ground, so a plain
       length-based fraction falls further and further behind scroll position
       the more quotes it's passed. A running max of y keeps it monotonic
       through those detours (a box briefly backtracks upward mid-trace). */
    samples = [];
    var sampleStep = Math.max(8, pathLen / 800);
    var runningMaxY = 0;
    for (var len = 0; len <= pathLen; len += sampleStep) {
      var pt = path.getPointAtLength(len);
      runningMaxY = Math.max(runningMaxY, pt.y);
      samples.push({ len: len, y: runningMaxY });
    }
    var lastPt = path.getPointAtLength(pathLen);
    runningMaxY = Math.max(runningMaxY, lastPt.y);
    samples.push({ len: pathLen, y: runningMaxY });

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
    if (!path || !pathLen || !samples.length) { return; }
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    /* reveal a bit ahead of the very top of the viewport, so a quote's box is
       finished tracing around the time it's actually being read, not only
       once it's scrolled fully past */
    var targetY = scrollY + window.innerHeight * 0.35;
    var len = lengthForY(targetY);
    path.style.strokeDashoffset = Math.max(0, pathLen - len);
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
  window.addEventListener('load', function () {
    buildPath();
    /* photos and web fonts can still land late and nudge quote positions —
       redraw a couple more times to catch that without polling forever */
    setTimeout(buildPath, 800);
    setTimeout(buildPath, 2200);
  });
})();
