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
var pdrumZoomIm = null, pdrumZoomOpen = false;
var pdrumLastFocus = null;
var pdrumCloseHooks = []; /* callbacks to run once the zoom view is closed */

/* a stand-alone copy of a styled tile, for the zoom view and for the fly-away.
   The few values a tile only gets from its position in its column are carried
   across by hand so the copy looks the same outside it. */
function pdCloneTile(tile) {
  var c = tile.cloneNode(true);
  var cs = window.getComputedStyle(tile);
  c.style.setProperty('--bq-ground', cs.getPropertyValue('--bq-ground'));
  c.style.setProperty('--bq-hue', cs.getPropertyValue('--bq-hue'));
  c.removeAttribute('tabindex'); c.removeAttribute('role');
  c.style.flex = ''; c.style.transform = 'none'; c.style.visibility = 'visible';
  c.classList.remove('pd-flown'); c.classList.remove('pd-flyer');
  c.style.position = 'relative'; c.style.left = ''; c.style.top = ''; c.style.zIndex = ''; c.style.pointerEvents = ''; c.style.cursor = ''; c.style.margin = '';
  return c;
}
function openPdrumZoom(im, drum, tile) {
  var overlay = document.getElementById('pdrumZoom');
  if (!overlay) { return; }
  var img = document.getElementById('pdrumZoomImg');
  var cap = document.getElementById('pdrumZoomCap');
  var card = overlay.querySelector('.pdrum-zoom-card');
  pdrumLastFocus = document.activeElement; pdrumZoomIm = im;
  var oldStage = overlay.querySelector('.pdrum-zoom-styled');
  if (oldStage) { oldStage.parentNode.removeChild(oldStage); }
  img.src = im.src; img.alt = im.title; cap.textContent = im.title;
  img.style.display = '';
  /* if the picture has been given an art treatment, show it as it looks in the
     tower, enlarged, rather than the untouched original */
  if (tile && /pd-style-/.test(tile.className) && tile.offsetWidth > 0 && card) {
    var w = tile.offsetWidth, h = tile.offsetHeight;
    var stage = document.createElement('div');
    stage.className = 'pdrum-zoom-styled';
    stage.style.aspectRatio = w + ' / ' + h;
    stage.style.width = 'min(100%, ' + (74 * w / h).toFixed(1) + 'vh)';
    var copy = pdCloneTile(tile);
    copy.style.width = '100%'; copy.style.height = '100%';
    stage.appendChild(copy);
    card.insertBefore(stage, img);
    img.style.display = 'none';
    var tg = tile.querySelector('.pd-style-tag');
    if (tg) { cap.textContent = im.title + tg.textContent; }
  }
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
  pdrumCloseHooks.splice(0).forEach(function (fn) { try { fn(); } catch (e) {} });
  setTimeout(function () {
    overlay.hidden = true;
    document.getElementById('pdrumZoomImg').removeAttribute('src');
    var st = overlay.querySelector('.pdrum-zoom-styled');
    if (st) { st.parentNode.removeChild(st); }
  }, 220);
  if (pdrumLastFocus && pdrumLastFocus.focus) { pdrumLastFocus.focus(); }
}(function () {
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
  { key: 'cubist', className: 'pd-style-cubist', label: 'cubist pass, after Picasso' },
  { key: 'vangogh', className: 'pd-style-vangogh', label: 'after van Gogh' },
  { key: 'fauvist', className: 'pd-style-fauvist', label: 'fauvist pass' },
  { key: 'pointillist', className: 'pd-style-pointillist', label: 'pointillist pass' },
  { key: 'basquiat', className: 'pd-style-basquiat', label: 'basquiat pass, for laughs' },
    { key: 'ukiyo', className: 'pd-style-ukiyo', label: 'woodblock pass, ukiyo-e' },
    { key: 'warhol', className: 'pd-style-warhol', label: 'pop-art pass, after Warhol' },
    { key: 'klimt', className: 'pd-style-klimt', label: 'gold-leaf pass, after Klimt' },
    { key: 'mondrian', className: 'pd-style-mondrian', label: 'grid pass, after Mondrian' },
    { key: 'comic', className: 'pd-style-comic', label: 'comic pass, after Lichtenstein' }
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
  window.pdImageSrcs = images.map(function (i) { return i.src; });
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
  images.forEach(function (im, idx) { im._pdOffset = idx % (PD_STYLES.length - 1); });

  /* 9 faces at radius 234 match the reference tower exactly -- two columns
     facing you at once, with the spacing Mark prefers. Each face is filled
     with photographs sized to their OWN proportions: a tile's share of the
     face's height is that picture's height-to-width ratio, so nothing sits in
     a box that doesn't fit it and there are no wide white bars around it. */
  var FACES = 9;
  var radius = 234;
  var GAP = 3; /* px between tiles in a face */
  var revolved = false; /* styles only begin once the tower has turned once */

  var queue = images.slice();
  function refillQueue() { queue = queue.concat(images); }
  /* a picture's height, in units of its face's width */
  function hOf(im) {
    var ar = im.ar > 0 ? im.ar : (im.portrait ? 0.67 : 1.5);
    return Math.max(0.25, Math.min(2.4, 1 / ar));
  }
  /* the next picture that fits what's left of the face; earlier in the queue
     wins, unless taking it would strand a sliver nothing else could fill */
  function takeNext(rem, used) {
    if (queue.length < 24) { refillQueue(); }
    var best = -1, bestScore = 1e9;
    for (var k = 0; k < queue.length && k < 18; k++) {
      if (used[queue[k].src]) { continue; }
      var left = rem - hOf(queue[k]);
      if (left < -0.12) { continue; }
      var sliver = left > 0.12 && left < 0.3;
      var score = sliver ? 5 + Math.abs(left) : k * 0.01;
      if (score < bestScore) { bestScore = score; best = k; }
    }
    return best === -1 ? null : queue.splice(best, 1)[0];
  }
  /* the first revolution shows every picture as it really is; after that each
     return of a picture steps it on to its next treatment */
  function styleFor(im) {
    if (!revolved) { return PD_STYLES[0]; }
    im._pdStep = (im._pdStep == null) ? im._pdOffset : im._pdStep + 1;
    return PD_STYLES[1 + (im._pdStep % (PD_STYLES.length - 1))];
  }
  var pvLast = {};
  /* each treatment has six looks; pick one at random, never the same twice running */
  function variantFor(key) {
    var v, n = 0;
    do { v = Math.floor(Math.random() * 6); } while (v === pvLast[key] && n++ < 8);
    pvLast[key] = v; return v;
  }
  function makeTile(im, styleDef) {
    var fig = document.createElement('figure');
    fig.className = 'pdrum-tile' + (styleDef.className ? ' ' + styleDef.className : '');
    if (styleDef.className) { fig.className += ' pv-' + variantFor(styleDef.key); }
    try { fig.style.setProperty('--pd-src', 'url("' + new URL(im.src, document.baseURI).href + '")'); } catch (e) {}
    var img = document.createElement('img');
    img.src = im.src; img.alt = im.title; img.loading = 'lazy';
    var cap = document.createElement('figcaption');
    cap.textContent = im.title;
    if (styleDef.label) {
      var tag = document.createElement('span');
      tag.className = 'pd-style-tag';
      tag.textContent = ' \u2014 ' + styleDef.label;
      cap.appendChild(tag);
    }
    var ov = document.createElement('i'); ov.className = 'pd-ov'; ov.setAttribute('aria-hidden', 'true');
    fig.appendChild(img); fig.appendChild(ov); fig.appendChild(cap);
    fig._im = im;
    fig.setAttribute('tabindex', '0');
    fig.setAttribute('role', 'button');
    fig.addEventListener('click', function () { openPdrumZoom(im, drum, fig); });
    fig.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPdrumZoom(im, drum, fig); }
    });
    return fig;
  }
  function fillFace(col) {
    while (col.firstChild) { col.removeChild(col.firstChild); }
    var w = col.offsetWidth || 162, hgt = col.offsetHeight || 998;
    var rem = (hgt + GAP) / w, used = {}, guard = 0;
    while (rem > 0.12 && guard++ < 14) {
      var im = takeNext(rem, used);
      if (!im) { break; }
      used[im.src] = true;
      var t = makeTile(im, styleFor(im));
      var hh = hOf(im);
      t.style.flex = hh + ' 1 0';
      col.appendChild(t);
      rem -= hh + GAP / w;
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
  var userPaused = false; /* the visible Pause storm / Resume control */

  drum.addEventListener('pointerover', function (e) {
    if (!e.target.closest('.pdrum-tile')) { return; }
    if (stormOn || resetAt || assembling) { return; } /* once the storm is on, a resting mouse must not freeze it */
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

  /* ---- speed-up and storm: the drum starts 15% faster than the reference, and
     every full turn it makes it is a further 5% faster. Once it passes
     FLY_AT times the base speed the pictures begin to tear loose, one at a
     time, and are carried off in the direction of the wind. When the last
     one has gone the drum rests a moment, then fills again and starts over. ---- */
  var BOOST = 1.69, STEP = 1.15, FLY_AT = 3.0, MAX_MUL = 5, assembling = false, returnBtn = null,
      caught = 0, caughtSrcs = [], nextShareAt = 5, spinTarget = 0, gestured = false, barClock = null, barStorm = null;
  var stormOn = false, nextFling = 0, flingGap = 1600, resetAt = 0;
  var spinTurns = 0; /* full turns made since the last reset, fractions included */
  /* the speed grows continuously, never in steps: it is 30% over base to start,
     and exactly 15% higher again after each full turn, so there is no jolt
     at any point on the way up */
  function speedMul() { return BOOST * Math.pow(STEP, spinTurns); }
  function flyAway(tile) {
    var r = tile.getBoundingClientRect();
    if (r.width < 6 || r.height < 6 || !tile.animate || !tile._im) { return false; }
    var c = pdCloneTile(tile);
    c.classList.add('pd-flyer');
    c._im = tile._im;
    c.style.position = 'fixed'; c.style.left = r.left + 'px'; c.style.top = r.top + 'px';
    c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
    c.style.margin = '0'; c.style.zIndex = '60'; c.style.cursor = 'pointer';
    document.body.appendChild(c);
    tile.classList.add('pd-flown'); tile.style.visibility = 'hidden';
    var dir = direction < 0 ? -1 : 1, W = window.innerWidth, H = window.innerHeight;
    var sx = dir * (W * 0.35 + Math.random() * W * 0.45);
    var up = -(H * 0.3 + Math.random() * H * 0.55);
    var spin = dir * (360 + Math.random() * 900);
    var wob = 30 + Math.random() * 60;
    var dur = (1700 + Math.random() * 1100) * 1.3;
    var anim = c.animate([
      { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
      { transform: 'translate(' + (sx * 0.2) + 'px,' + (-wob) + 'px) rotate(' + (spin * 0.2) + 'deg) scale(1.1)', opacity: 1, offset: 0.2 },
      { transform: 'translate(' + (sx * 0.55) + 'px,' + (up * 0.35 + wob) + 'px) rotate(' + (spin * 0.55) + 'deg) scale(0.85)', opacity: 1, offset: 0.55 },
      { transform: 'translate(' + sx + 'px,' + up + 'px) rotate(' + spin + 'deg) scale(0.2)', opacity: 0 }
    ], { duration: dur, easing: 'cubic-bezier(.45,0,.85,.55)', fill: 'forwards' });
    function drop() { clearTimeout(c._to); if (c.parentNode) { c.parentNode.removeChild(c); } }
    function arm() { clearTimeout(c._to); c._to = setTimeout(function () { if (!c._held) { drop(); } }, dur + 2500); }
    anim.onfinish = drop; arm();
    /* click a flying tile to catch it: it freezes in mid-air and opens as its
       new-genre picture, and carries on its way once the picture is closed */
    c.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (c._held) { return; }
      c._held = true; anim.pause();
      if (!c._counted) { c._counted = true; caught++; paintBar(); if (c._im && c._im.src) { caughtSrcs.push(c._im.src); } }
      pdrumCloseHooks.push(function () {
        c._held = false; anim.play(); arm();
        if (caught >= nextShareAt && window.pdShare) { window.pdShare.show('tiles', caught, caughtSrcs.slice()); nextShareAt = caught + 5; }
      });
      openPdrumZoom(c._im, drum, c);
    });
    return true;
  }  function flingOne() {
    var pool = [];
    for (var i = 0; i < cols.length; i++) {
      var eff = normalize(cols[i]._faceAngle + rotation);
      if (eff < 70 || eff > 290) {
        var ts = cols[i].querySelectorAll('.pdrum-tile:not(.pd-flown)');
        for (var k = 0; k < ts.length; k++) { pool.push(ts[k]); }
      }
    }
    if (!pool.length) { return false; }
    return flyAway(pool[Math.floor(Math.random() * pool.length)]);
  }
  /* "bring back the tower": shown the moment the last picture has gone */
  function showReturn(on) {
    if (!returnBtn) {
      returnBtn = document.createElement('button');
      returnBtn.type = 'button'; returnBtn.className = 'pd-return';
      returnBtn.innerHTML = 'Bring back the tower<span>click, or just wait a moment</span>';
      returnBtn.addEventListener('click', function () { if (resetAt) { resetAt = 1; } });
      scene.appendChild(returnBtn);
    }
    returnBtn.classList.toggle('show', !!on);
  }
  /* the reverse of the storm: every picture on the near side of the drum flies
     back in from a random direction and lands exactly where it belongs. The
     drum holds still while they arrive, then starts its climb again. */
  function calmAfterStorm() {
    stormOn = false; resetAt = 0; flingGap = 1600; assembling = true;
    showReturn(false);
    rotation = rotation % 360; spinTurns = 0; revolved = false;
    images.forEach(function (im) { im._pdStep = null; });
    queue = images.slice(); paused = false; /* a fresh queue, so no picture lands twice side by side */
    for (var i = 0; i < cols.length; i++) { fillFace(cols[i]); }
    var W = window.innerWidth, H = window.innerHeight, maxEnd = 0, landing = [], copies = [];
    for (var ci = 0; ci < cols.length; ci++) {
      var eff = normalize(cols[ci]._faceAngle + rotation);
      if (!(eff < 70 || eff > 290)) { continue; }
      var ts = cols[ci].querySelectorAll('.pdrum-tile');
      for (var k = 0; k < ts.length; k++) { landing.push(ts[k]); }
    }
    landing.forEach(function (tile) {
      var r = tile.getBoundingClientRect();
      if (r.width < 6 || r.height < 6 || !tile.animate) { return; }
      var c = pdCloneTile(tile);
      c.classList.add('pd-flyer');
      c.style.position = 'fixed'; c.style.left = r.left + 'px'; c.style.top = r.top + 'px';
      c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
      c.style.margin = '0'; c.style.zIndex = '60'; c.style.pointerEvents = 'none';
      tile.style.visibility = 'hidden';
      document.body.appendChild(c); copies.push(c);
      var a = Math.random() * Math.PI * 2, R = Math.max(W, H) * (0.55 + Math.random() * 0.5);
      var sx = Math.cos(a) * R, sy = Math.sin(a) * R;
      var spin = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720);
      var delay = Math.random() * 2200, dur = 1500 + Math.random() * 900;
      maxEnd = Math.max(maxEnd, delay + dur);
      var an = c.animate([
        { transform: 'translate(' + sx + 'px,' + sy + 'px) rotate(' + spin + 'deg) scale(0.2)', opacity: 0 },
        { opacity: 1, offset: 0.35 },
        { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 }
      ], { duration: dur, delay: delay, easing: 'cubic-bezier(.15,.6,.3,1)', fill: 'both' });
      an.onfinish = function () { tile.style.visibility = ''; if (c.parentNode) { c.parentNode.removeChild(c); } };
    });
    /* safety net, in case a browser never finished the animations */
    setTimeout(function () {
      landing.forEach(function (t2) { t2.style.visibility = ''; });
      copies.forEach(function (c2) { if (c2.parentNode) { c2.parentNode.removeChild(c2); } });
      assembling = false;
    }, maxEnd + 400);
  }  function runStorm(t) {
    if (!stormOn && !resetAt && Math.min(speedMul(), MAX_MUL) >= FLY_AT) { stormOn = true; paused = false; nextFling = t + 1200; nextBolt = t + 900; }
    if (stormOn && !resetAt && t >= nextFling) {
      var ok = flingOne();
      nextFling = t + (ok ? flingGap : 120);
      if (ok) { flingGap = Math.max(260, flingGap * 0.93); }
      if (!drum.querySelector('.pdrum-tile:not(.pd-flown)')) { resetAt = t + 3500; showReturn(true); }
    }
    if (resetAt && t >= resetAt) { calmAfterStorm(); }
  }

  /* ---- under the tower: storm countdown, a "make it storm" button, and the
     shared sound switch (which also controls the wind) ---- */
  var snd = window.tpSound;
  var bar = document.createElement('div'); bar.className = 'pd-bar';
  barClock = document.createElement('span'); barClock.className = 'pd-clock';
  barStorm = document.createElement('button'); barStorm.type = 'button'; barStorm.className = 'arcade-tool pd-storm'; barStorm.textContent = 'Make it storm';
  var barSound = document.createElement('button'); barSound.type = 'button'; barSound.className = 'arcade-tool';
  var barPause = document.createElement('button'); barPause.type = 'button'; barPause.className = 'arcade-tool pd-pausebtn';
  barPause.setAttribute('aria-pressed', 'false'); barPause.textContent = 'Pause motion';
  barPause.setAttribute('aria-label', 'Pause the spinning tower and storm');
  barPause.addEventListener('click', function () {
    userPaused = !userPaused;
    barPause.textContent = userPaused ? 'Resume motion' : 'Pause motion';
    barPause.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
    try {
      document.getAnimations().forEach(function (a) {
        var tg = a.effect && a.effect.target;
        if (tg && tg.classList && tg.classList.contains('pd-flyer') && !tg._held) { if (userPaused) { a.pause(); } else { a.play(); } }
      });
    } catch (e) {}
  });
  bar.appendChild(barClock); bar.appendChild(barStorm); bar.appendChild(barPause); bar.appendChild(barSound);
  container.appendChild(bar);
  function stormTurns() { return FLY_AT > BOOST ? Math.log(FLY_AT / BOOST) / Math.log(STEP) : 0; }
  function secsToStorm() {
    var T = stormTurns();
    if (spinTurns >= T) { return 0; }
    return (PERIOD_MS / 1000) / BOOST * (Math.pow(STEP, -spinTurns) - Math.pow(STEP, -T)) / Math.log(STEP);
  }
  function paintBar() {
    if (assembling || resetAt) { barClock.textContent = ''; barStorm.hidden = true; }
    else if (stormOn) { barClock.textContent = 'Click a flying tile to catch it \u00b7 caught ' + caught; barStorm.hidden = true; }
    else {
      var s = Math.ceil(secsToStorm());
      barClock.textContent = 'Storm in ' + Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
      barStorm.hidden = false;
    }
  }
  function paintSoundBtn() {
    if (!snd) { barSound.hidden = true; return; }
    barSound.textContent = snd.isOn() ? 'Sound on' : 'Sound off';
    barSound.setAttribute('aria-pressed', snd.isOn() ? 'true' : 'false');
  }
  setInterval(paintBar, 500); paintBar(); paintSoundBtn();
  barStorm.addEventListener('click', function () { spinTarget = stormTurns() + 0.01; if (snd) { snd.unlock(); } });
  barSound.addEventListener('click', function () { if (snd) { snd.toggle(); } });
  if (snd) { snd.onChange(paintSoundBtn); }


  /* ---- two comic-book speed buttons at the tower's edges: +15% or -15% for ten seconds, eased in and out,
     with a pop-up word, a funny noise and (on phones) a little buzz so the press always feels like something ---- */
  var nudgeCur = 1, nudgeTarget = 1, nudgeEnd = 0, NUDGE_MS = 10000;
  var POW_FAST = ['ZOOM!', 'VROOM!', 'WHEEE!', 'FASTER!', 'ZIP!'], POW_SLOW = ['WHOA…', 'EASY!', 'WOAH.', 'HOLD ON…', 'PHEW!'];
  function nudgeSound(fast) {
    if (!snd) { return; }
    if (fast) {   /* a cartoon rocket: rising whoop, then a quick bright run of blips */
      snd.tone(160, 0.38, 'sawtooth', 0.05, 0, 1100);
      snd.tone(320, 0.3, 'square', 0.03, 0.02, 1500);
      [523, 659, 784, 1047, 1319].forEach(function (f, i) { snd.tone(f, 0.07, 'square', 0.045, 0.3 + i * 0.05); });
    } else {      /* slide-whistle down, a sad trombone wobble, and a soft bonk */
      snd.tone(1000, 0.5, 'sine', 0.11, 0, 180);
      [311, 294, 277].forEach(function (f, i) { snd.tone(f, 0.22, 'triangle', 0.09, 0.45 + i * 0.22); });
      snd.tone(233, 0.7, 'triangle', 0.09, 1.1, 190);
      snd.tone(110, 0.12, 'sine', 0.14, 0.02, 55);
    }
  }
  function nudgePow(b, fast) {
    var p = document.createElement('span'), list = fast ? POW_FAST : POW_SLOW;
    p.className = 'pd-pow ' + (fast ? 'pd-pow--fast' : 'pd-pow--slow'); p.setAttribute('aria-hidden', 'true');
    p.textContent = list[Math.floor(Math.random() * list.length)];
    b.appendChild(p); setTimeout(function () { if (p.parentNode) { p.parentNode.removeChild(p); } }, 1000);
    b.classList.remove('pd-squish'); void b.offsetWidth; b.classList.add('pd-squish');
  }
  /* each button says its own line out loud, on hover (once the visitor has touched the page, so never autoplay)
     or on click; it obeys the Sound on/off switch and won't talk over itself */
  function nudgeVoice(b) {
    if (!snd || !snd.isOn()) { return; }
    if (!b._voice) { b._voice = new Audio(b._voiceSrc); b._voice.volume = 0.9; }
    var v = b._voice;
    if (!v.paused && !v.ended) { return; }
    try { v.currentTime = 0; var p = v.play(); if (p && p.catch) { p.catch(function () {}); } } catch (er) {}
  }
  function mkNudge(cls, label, factor, voiceSrc) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'pd-nudge ' + cls;
    b.innerHTML = '<span class="pd-nudge-t">' + label + '</span><span class="pd-nudge-s"></span>';
    b._voiceSrc = voiceSrc;
    b.addEventListener('mouseenter', function () {
      var ua = navigator.userActivation;
      if (gestured || (ua && ua.hasBeenActive)) { nudgeVoice(b); }
    });
    b.addEventListener('click', function () {
      if (snd) { snd.unlock(); }
      nudgeVoice(b);
      nudgeTarget = factor; nudgeEnd = performance.now() + NUDGE_MS; paintNudges();
      nudgeSound(factor > 1); nudgePow(b, factor > 1);
      try { if (navigator.vibrate) { navigator.vibrate(factor > 1 ? [25, 30, 25] : [70]); } } catch (er) {}
    });
    container.appendChild(b); b._f = factor; return b;
  }
  var nudgeFast = mkNudge('pd-nudge--fast', 'Faster, faster, don’t stop!', 1.15, 'assets/audio/faster-faster.mp3');
  var nudgeSlow = mkNudge('pd-nudge--slow', 'Whoa, whoa, cowboy, slow down.', 0.85, 'assets/audio/easy-cowboy.mp3');
  function paintNudges() {
    var left = Math.max(0, Math.ceil((nudgeEnd - performance.now()) / 1000)), on = left > 0 && nudgeTarget !== 1;
    [nudgeFast, nudgeSlow].forEach(function (b) {
      var active = on && b._f === nudgeTarget;
      b.classList.toggle('is-on', active);
      b.querySelector('.pd-nudge-s').textContent = active ? (b._f > 1 ? '+15%' : '\u221215%') + ' \u00b7 ' + left + 's' : '';
    });
  }
  setInterval(paintNudges, 500);

  /* ---- a faint wind that rises with the drum's speed and howls in the storm.
     Synthesised in the browser, so there is nothing to download; it stays silent
     until the visitor has touched the page, and whenever the tower is off screen. ---- */
  var wind = { ctx: null, gain: null, filt: null, inView: true, last: 0 };
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, function () { gestured = true; }, { passive: true });
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { wind.inView = es[0].isIntersecting; }).observe(container);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && wind.gain) { wind.gain.gain.setTargetAtTime(0, wind.ctx.currentTime, 0.05); }
  });
  function windInit() {
    var c = snd && snd.context ? snd.context() : null;
    if (!c) { return; }
    var len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0), lastv = 0;
    for (var i = 0; i < len; i++) { lastv = (lastv + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = lastv * 3.5; }
    var src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    var filt = c.createBiquadFilter(); filt.type = 'bandpass'; filt.Q.value = 0.8; filt.frequency.value = 400;
    var g = c.createGain(); g.gain.value = 0;
    src.connect(filt); filt.connect(g); g.connect(c.destination); src.start();
    wind.ctx = c; wind.gain = g; wind.filt = filt;
  }
  /* wind: a light breeze from the very first turn, building steadily to a gale as the storm breaks */
  function windTick(t) {
    if (!gestured || !snd || t - wind.last < 120) { return; }
    wind.last = t;
    if (!wind.gain) { windInit(); if (!wind.gain) { return; } }
    var level = 0;
    if (snd.isOn() && wind.inView && !document.hidden && !assembling && !resetAt && !userPaused) {
      var prog = Math.max(0, Math.min(1, (Math.min(speedMul(), MAX_MUL) - BOOST) / (FLY_AT - BOOST)));
      level = stormOn ? 1 : 0.1 + 0.8 * prog * prog;
    }
    var gust = 0.8 + 0.2 * Math.sin(t / 650) + 0.1 * Math.sin(t / 230) + 0.08 * level * Math.sin(t / 97);
    var now = wind.ctx.currentTime;
    wind.gain.gain.setTargetAtTime(0.5 * level * level * gust + 0.03 * level, now, 0.25);
    wind.filt.frequency.setTargetAtTime(260 + 1100 * level + 160 * level * Math.sin(t / 430), now, 0.2);
    wind.filt.Q.setTargetAtTime(0.6 + 2.2 * level, now, 0.3);
  }

  /* lightning, Lichtenstein style: one flat comic flash (halftone dots, a black-outlined yellow bolt,
     a "KRAK-A-BOOM" burst), faded out in under a second, with a rolling thunder just behind it */
  var nextBolt = 0, BOOMS = ['KRAK-A-BOOM!', 'WHAAM!', 'KA-RRAKK!', 'BRRRATOOM!', 'ZAP!', 'MARCUS HENRI!'];
  function thunder() {
    var c = snd && snd.isOn() && gestured && wind.inView && !document.hidden && snd.context ? snd.context() : null;
    if (!c) { return; }
    var t0 = c.currentTime + 0.25 + Math.random() * 0.35, len = c.sampleRate * 3.2;
    var buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0), v = 0;
    for (var i = 0; i < len; i++) { v = (v + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = v * 4; }
    var src = c.createBufferSource(); src.buffer = buf;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t0); lp.frequency.exponentialRampToValueAtTime(70, t0 + 3);
    var g = c.createGain(), gg = g.gain;
    gg.setValueAtTime(0.0001, t0); gg.exponentialRampToValueAtTime(0.9, t0 + 0.04);
    gg.exponentialRampToValueAtTime(0.35, t0 + 0.5); gg.linearRampToValueAtTime(0.6, t0 + 0.75); /* the second roll */
    gg.exponentialRampToValueAtTime(0.0001, t0 + 3.1);
    src.connect(lp); lp.connect(g); g.connect(c.destination); src.start(t0); src.stop(t0 + 3.2);
  }
  function bolt() {
    var el = document.createElement('div'), x = 12 + Math.random() * 70, flip = Math.random() < 0.5;
    el.className = 'pd-bolt'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<i class="pd-bolt-dots"></i>' +
      '<svg class="pd-bolt-zag" style="left:' + x + '%' + (flip ? ';transform:scaleX(-1)' : '') + '" viewBox="0 0 120 400" preserveAspectRatio="none">' +
      '<polygon points="70,0 18,190 58,190 30,400 106,150 66,150 100,0" fill="#ffe21f" stroke="#111" stroke-width="7" stroke-linejoin="round"/></svg>' +
      '<span class="pd-boom" style="left:' + Math.max(8, Math.min(60, x - 12)) + '%">' + BOOMS[Math.floor(Math.random() * BOOMS.length)] + '</span>';
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, 1100);
  }
  function stormFx(t) {
    if (!stormOn || resetAt || assembling || t < nextBolt) { return; }
    nextBolt = t + 6000 + Math.random() * 5000;
    if (wind.inView && !document.hidden) { bolt(); thunder(); }
  }

  function tick(t) {    if (lastT === null) { lastT = t; }
    var dt = Math.min(t - lastT, 100);
    lastT = t;
    if (!paused && !userPaused && !pdrumZoomOpen && !assembling) {
      if (nudgeTarget !== 1 && t > nudgeEnd) { nudgeTarget = 1; }
      nudgeCur += (nudgeTarget - nudgeCur) * Math.min(1, dt / 350);
      var step = degPerMs * Math.min(speedMul(), MAX_MUL) * nudgeCur * dt;
      rotation += step; spinTurns += Math.abs(step) / 360;
      if (spinTarget > spinTurns) { spinTurns = Math.min(spinTarget, spinTurns + dt / 1000 * 1.2); } /* 'make it storm': a smooth ramp, never a jump */
      if (!revolved && Math.abs(rotation) >= 360) { revolved = true; }
      drum.style.transform = 'rotateY(' + rotation + 'deg)';
      if (!stormOn) { maybeRefillHiddenFace(t); }
      runStorm(t);
    }
    if (userPaused) { lastT = t; }
    windTick(t); if (!userPaused) { stormFx(t); }
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

/* ---- shared sound for the two arcade toys: tiny WebAudio blips. Nothing
   plays until a visitor starts a game (browsers require a gesture first), and
   the mute choice is remembered on this device. ---- */
window.tpSound = (function () {
  var KEY = 'tp_sound_v1', ctx = null, on = true, subs = [];
  try { on = window.localStorage.getItem(KEY) !== 'off'; } catch (e) {}
  function ac () {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }
  function tone (freq, dur, type, vol, delay, slideTo) {
    if (!on) return;
    var c = ac(); if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    var v = (vol == null ? 0.06 : vol);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function seq (notes, step, type, vol) {
    notes.forEach(function (f, i) { tone(f, step * 1.5, type, vol, i * step); });
  }
  var api = {
    isOn: function () { return on; },
    set: function (v) {
      on = !!v;
      try { window.localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
      subs.forEach(function (fn) { fn(on); });
    },
    toggle: function () { api.set(!on); ac(); if (on) tone(660, 0.07, 'square', 0.05); },
    unlock: ac, context: ac, tone: tone, seq: seq,
    onChange: function (fn) { subs.push(fn); }
  };
  return api;
})();

/* ---- share panel: offered after a Pong win, a new Tetris best, or five caught
   tiles. Everything here is a plain link or the browser's own share sheet, so
   it works with no accounts and no tracking. ---- */
window.pdShare = (function () {
  var SITE = 'https://marcus-henri.github.io/twentieth-parallel/';
  var panel = null, timer = null, blobUrl = null;
  var FONT = 'Impact, "Arial Black", "Helvetica Neue", sans-serif';
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) { e.className = cls; } if (text) { e.textContent = text; } return e; }
  function hide() { if (panel) { panel.hidden = true; } clearTimeout(timer); }

  /* a one-off comic-book "trophy card" painted on a canvas: Ben-Day dots, a starburst, the score and,
     for caught tiles, the very pictures that were caught. Nothing leaves the browser. */
  function burst(c, cx, cy, r1, r2, spikes, rot) {
    c.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
      var a = rot + Math.PI * i / spikes, r = i % 2 ? r1 : r2;
      c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    c.closePath();
  }
  function dots(c, x, y, w, h, step, rad, col) {
    c.fillStyle = col;
    for (var yy = 0, row = 0; yy < h + step; yy += step * 0.866, row++) {
      for (var xx = (row % 2 ? step / 2 : 0); xx < w + step; xx += step) {
        c.beginPath(); c.arc(x + xx, y + yy, rad, 0, 6.2832); c.fill();
      }
    }
  }
  function shout(c, txt, x, y, size, fill, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.font = '900 ' + size + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = size * 0.16; c.strokeStyle = '#111'; c.strokeText(txt, size * 0.05, size * 0.05);
    c.lineWidth = size * 0.12; c.strokeText(txt, 0, 0); c.fillStyle = fill; c.fillText(txt, 0, 0); c.restore();
  }
  function cfgFor(kind, n, og, title) {
    if (og) {
      return kind === 'tiles' ? { a: 'CATCH THE', big: 'TILES!', b: 'IF YOU CAN' }
           : kind === 'tetris' ? { a: 'BEAT MY', big: 'TETRIS', b: 'SCORE!' }
           : kind === 'pong' ? { a: 'BEAT THE', big: 'HOUSE', b: 'AT PONG!' }
           : kind === 'art' ? { a: 'MARCUS HENRI', big: 'ART!', b: '(AND CHAOS)' }
           : { a: 'A WEBSITE WITH', big: 'A STORM', b: 'INSIDE IT!' };
    }
    return kind === 'tiles' ? { a: 'I CAUGHT', big: String(n), b: n === 1 ? 'FLYING TILE!' : 'FLYING TILES!' }
         : kind === 'tetris' ? { a: 'I SCORED', big: String(n), b: 'AT TETRIS!' }
         : kind === 'pong' ? { a: 'I BEAT THE HOUSE', big: '11\u2013' + n, b: 'AT PONG!' }
         : kind === 'art' ? { a: 'FOUND THIS', big: 'ART!', b: 'MARCUS HENRI' }
         : { a: 'A WEBSITE WITH', big: 'A STORM', b: 'INSIDE IT!' };
  }
  function paint(kind, n, srcs, done, og) {
    var cv = document.createElement('canvas'); cv.width = 1200; cv.height = 630;
    var c = cv.getContext('2d'); if (!c) { done(null); return; }
    var cfg = cfgFor(kind, n, og);
    c.fillStyle = '#ffd92e'; c.fillRect(0, 0, 1200, 630);
    dots(c, 0, 0, 1200, 630, 26, 7.5, '#f0452c');
    /* photos (only the tile card): tilted, white-bordered, outlined like comic panels */
    var imgs = [], pending = 0;
    function drawRest() {
      var i;
      if (kind === 'art' && imgs.length === 1) {
        var ia = imgs[0], aw = 400, ah = 400 * (ia.naturalHeight / ia.naturalWidth || 0.75);
        if (ah > 400) { ah = 400; aw = 400 * (ia.naturalWidth / ia.naturalHeight); }
        c.save(); c.translate(900, 300); c.rotate(0.05);
        c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(-aw / 2 + 11, -ah / 2 + 11, aw + 28, ah + 28);
        c.fillStyle = '#fff'; c.fillRect(-aw / 2 - 14, -ah / 2 - 14, aw + 28, ah + 28);
        c.lineWidth = 6; c.strokeStyle = '#111'; c.strokeRect(-aw / 2 - 14, -ah / 2 - 14, aw + 28, ah + 28);
        c.drawImage(ia, -aw / 2, -ah / 2, aw, ah); c.restore();
      } else if (imgs.length) {
        var spots = [[860, 150, 8], [1000, 300, -7], [820, 360, -4], [1010, 500, 6], [700, 215, 5]];
        for (i = 0; i < imgs.length && i < 5; i++) {
          var im = imgs[i], w = 230, h = 230 * (im.naturalHeight / im.naturalWidth || 0.75), sp = spots[i];
          if (h > 300) { h = 300; w = 300 * (im.naturalWidth / im.naturalHeight); }
          c.save(); c.translate(sp[0], sp[1]); c.rotate(sp[2] * Math.PI / 180);
          c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(-w / 2 + 9, -h / 2 + 9, w + 20, h + 20);
          c.fillStyle = '#fff'; c.fillRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20);
          c.lineWidth = 5; c.strokeStyle = '#111'; c.strokeRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20);
          c.drawImage(im, -w / 2, -h / 2, w, h); c.restore();
        }
      } else if (kind === 'tetris') {
        var cols = ['#e8312f', '#1f5fbf', '#ffd92e', '#fff'], pcs = [[0, 0], [1, 0], [2, 0], [1, 1]];
        c.save(); c.translate(860, 190); c.rotate(-0.2);
        pcs.forEach(function (p, k) { c.fillStyle = cols[k % 3]; c.fillRect(p[0] * 90, p[1] * 90, 86, 86); c.lineWidth = 6; c.strokeStyle = '#111'; c.strokeRect(p[0] * 90, p[1] * 90, 86, 86); });
        c.restore();
        c.save(); c.translate(920, 410); c.rotate(0.15); [[0, 0], [0, 1], [1, 1], [0, 2]].forEach(function (p, k) { c.fillStyle = ['#1f5fbf', '#e8312f', '#fff'][k % 3]; c.fillRect(p[0] * 80, p[1] * 80, 76, 76); c.lineWidth = 6; c.strokeStyle = '#111'; c.strokeRect(p[0] * 80, p[1] * 80, 76, 76); }); c.restore();
      } else if (kind === 'pong') {
        c.fillStyle = '#fff'; c.lineWidth = 6; c.strokeStyle = '#111';
        c.fillRect(780, 150, 28, 170); c.strokeRect(780, 150, 28, 170); c.fillRect(1090, 250, 28, 170); c.strokeRect(1090, 250, 28, 170);
        c.beginPath(); c.arc(940, 330, 30, 0, 6.2832); c.fillStyle = '#e8312f'; c.fill(); c.stroke();
      }
      /* the starburst */
      c.save(); burst(c, 330, 310, 200, 250, 14, 0.1); c.translate(14, 14); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill(); c.restore();
      burst(c, 330, 310, 200, 250, 14, 0.1); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 9; c.strokeStyle = '#111'; c.lineJoin = 'round'; c.stroke();
      c.save(); burst(c, 330, 310, 200, 250, 14, 0.1); c.clip(); dots(c, 60, 15, 560, 560, 20, 5.5, '#4a8fe0'); c.restore();
      burst(c, 330, 310, 200, 250, 14, 0.1); c.lineWidth = 9; c.stroke();
      shout(c, cfg.a, 330, 192, kind === 'pong' ? 50 : 72, '#e8312f', -0.05);
      shout(c, cfg.big, 330, 312, String(cfg.big).length > 3 ? 120 : 175, '#ffd92e', -0.05);
      shout(c, cfg.b, 330, 425, 58, '#1f5fbf', -0.05);
      /* speech bubble */
      c.save(); c.translate(0, 0);
      c.beginPath(); c.moveTo(560, 470); c.lineTo(520, 440); c.lineTo(560, 450);
      var bx = 520, by = 480, bw = 540, bh = 84, rr = 26;
      c.fillStyle = '#fff'; c.lineWidth = 6; c.strokeStyle = '#111';
      c.beginPath(); c.moveTo(bx + rr, by); c.lineTo(bx + bw - rr, by); c.quadraticCurveTo(bx + bw, by, bx + bw, by + rr); c.lineTo(bx + bw, by + bh - rr); c.quadraticCurveTo(bx + bw, by + bh, bx + bw - rr, by + bh);
      c.lineTo(bx + 120, by + bh); c.lineTo(bx + 70, by + bh + 32); c.lineTo(bx + 80, by + bh); c.lineTo(bx + rr, by + bh); c.quadraticCurveTo(bx, by + bh, bx, by + bh - rr); c.lineTo(bx, by + rr); c.quadraticCurveTo(bx, by, bx + rr, by); c.closePath();
      c.fill(); c.stroke(); c.restore();
      c.font = '900 46px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#111'; c.fillText(kind === 'art' || kind === 'site' ? 'GO ON, HAVE A LOOK!' : 'CAN YOU BEAT THAT?', 790, 524);
      /* brand caption box, top-left, like a comic's opening panel */
      c.save(); c.translate(36, 30); c.rotate(-0.03); c.fillStyle = '#111'; c.fillRect(6, 6, 340, 62); c.fillStyle = '#fff'; c.fillRect(0, 0, 340, 62); c.lineWidth = 5; c.strokeStyle = '#111'; c.strokeRect(0, 0, 340, 62);
      c.font = '900 30px ' + FONT; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#e8312f'; c.fillText('MARCUS HENRI', 16, 24);
      c.font = '700 16px "Courier New", monospace'; c.fillStyle = '#111'; c.fillText('PRESENTS: THE 20TH PARALLEL', 16, 48); c.restore();
      /* footer strip */
      c.fillStyle = '#111'; c.fillRect(0, 580, 1200, 50);
      c.font = '700 24px "Courier New", monospace'; c.fillStyle = '#ffd92e'; c.textAlign = 'center';
      c.fillText('MARCUS HENRI  ·  THE 20TH PARALLEL  ·  marcus-henri.github.io/twentieth-parallel', 600, 606);
      c.lineWidth = 10; c.strokeStyle = '#111'; c.strokeRect(5, 5, 1190, 620);
      done(cv);
    }
    (srcs || []).slice(-5).forEach(function (s) {
      pending++;
      var im = new Image(); im.onload = function () { imgs.push(im); if (!--pending) { drawRest(); } };
      im.onerror = function () { if (!--pending) { drawRest(); } };
      try { im.src = new URL(s, document.baseURI).href; } catch (e) { pending--; }
    });
    if (!pending) { drawRest(); }
  }

  var COPY = {
    tiles:  function (n) { return { head: 'POW! ' + n + ' runaway tiles caught!', ask: 'Dare a friend', text: 'I just caught ' + n + ' of Marcus Henri’s runaway tiles at The 20th Parallel 💥 Bet you can’t beat that:' }; },
    tetris: function (n) { return { head: 'KA-BLAM! New best: ' + n, ask: 'Dare a friend', text: 'I scored ' + n + ' at Tetris on Marcus Henri’s 20th Parallel 🧱 Your move:' }; },
    pong:   function (n) { return { head: 'WHAAM! You beat the house!', ask: 'Dare a friend', text: 'I beat the house at Pong, 11–' + n + ', on Marcus Henri’s 20th Parallel 🏓 Can you?' }; },
    art:    function ()  { return { head: 'Good one. Send it on!', ask: 'Send it to a friend', text: 'Look at this, from Marcus Henri’s 20th Parallel 🎨 The site has a tornado of tiles, too:' }; },
    site:   function ()  { return { head: 'Know someone who’d love this?', ask: 'Send it to a friend', text: 'Marcus Henri built a website with a tornado, Tetris, Pong and an art tower that spins out of control 💥 Try to catch a tile:' }; }
  };
  function linkFor(kind, n) { return SITE + 's/' + kind + '.html' + (n && (kind === 'tiles' || kind === 'tetris' || kind === 'pong') ? '?beat=' + encodeURIComponent(n) : ''); }
  function show(kind, n, srcs, opts) {
    var cp0 = (COPY[kind] || COPY.site)(n), text = cp0.text, link = linkFor(kind, n), full = text + ' ' + link, e = encodeURIComponent, blob = null;
    if (!srcs || !srcs.length) { srcs = (window.pdImageSrcs || []).slice().sort(function () { return Math.random() - 0.5; }).slice(0, 5); }
    if (!panel) {
      panel = mk('div', 'pd-share'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Pass it on');
      document.body.appendChild(panel);
    }
    panel.innerHTML = '';
    var x = mk('button', 'pd-share-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.addEventListener('click', hide);
    var holder = mk('div', 'pd-share-card');
    var ask = mk('button', 'pd-share-main'); ask.type = 'button';
    ask.innerHTML = '<span class="pd-share-ask">' + cp0.ask + '</span><span class="pd-share-sub">one tap, link included</span>';
    panel.appendChild(holder); panel.appendChild(mk('p', 'pd-share-head', cp0.head)); panel.appendChild(ask); panel.appendChild(x);
    function fileOf() { return blob ? new File([blob], 'twentieth-parallel-' + kind + '.png', { type: 'image/png' }) : null; }
    function nativeShare() {
      var f = fileOf();
      if (f && navigator.canShare && navigator.canShare({ files: [f] })) { return navigator.share({ files: [f], title: 'The 20th Parallel', text: full }); }
      if (navigator.share) { return navigator.share({ title: 'The 20th Parallel', text: text, url: link }); }
      return null;
    }
    ask.addEventListener('click', function () {
      var p = null; try { p = nativeShare(); } catch (er) {}
      if (p && p.catch) { p.catch(function () {}); }
      else if (!p) { window.open('https://wa.me/?text=' + e(full), '_blank', 'noopener'); }
      try { if (navigator.vibrate) { navigator.vibrate(20); } } catch (er) {}
    });
    var row = mk('div', 'pd-share-icons');
    function ico(label, glyph, cls, href) { var a = mk('a', 'pd-ico ' + cls); a.href = href; a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label', 'Share on ' + label); a.title = label; a.innerHTML = '<b>' + glyph + '</b><i>' + label + '</i>'; row.appendChild(a); }
    ico('WhatsApp', '💬', 'pd-ico-wa', 'https://wa.me/?text=' + e(full));
    ico('X', '𝕏', 'pd-ico-x', 'https://twitter.com/intent/tweet?text=' + e(text) + '&url=' + e(link));
    ico('Facebook', 'f', 'pd-ico-fb', 'https://www.facebook.com/sharer/sharer.php?u=' + e(link) + '&quote=' + e(text));
    ico('LinkedIn', 'in', 'pd-ico-li', 'https://www.linkedin.com/sharing/share-offsite/?url=' + e(link));
    ico('Email', '✉', 'pd-ico-em', 'mailto:?subject=' + e('You have to see this') + '&body=' + e(full));
    panel.appendChild(row);
    var more = mk('div', 'pd-share-more');
    var save = mk('button', '', '💾 Save the card'); save.type = 'button'; save.hidden = true;
    save.addEventListener('click', function () {
      if (!blob) { return; }
      if (blobUrl) { URL.revokeObjectURL(blobUrl); }
      blobUrl = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = blobUrl; a.download = 'twentieth-parallel-' + kind + '.png'; document.body.appendChild(a); a.click(); a.remove();
    });
    var cp = mk('button', '', '📋 Copy link'); cp.type = 'button';
    cp.addEventListener('click', function () {
      var done = function () { cp.textContent = '✅ Copied!'; setTimeout(function () { cp.textContent = '📋 Copy link'; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(full).then(done, function () { window.prompt('Copy this:', full); }); }
      else { window.prompt('Copy this:', full); }
    });
    more.appendChild(save); more.appendChild(cp); panel.appendChild(more);
    panel.hidden = false; panel.classList.remove('pd-pop'); void panel.offsetWidth; panel.classList.add('pd-pop');
    try { if (window.tpSound) { window.tpSound.tone(392, 0.09, 'square', 0.06); window.tpSound.tone(523, 0.09, 'square', 0.06, 0.09); window.tpSound.tone(784, 0.2, 'square', 0.07, 0.18); } } catch (er) {}
    paint(kind, n, srcs, function (cv) {
      if (!cv) { return; }
      cv.className = 'pd-share-canvas'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', text);
      holder.appendChild(cv);
      try { cv.toBlob(function (b) { blob = b; if (b) { save.hidden = false; } }, 'image/png'); } catch (er) {}
    }, false);
    clearTimeout(timer); timer = setTimeout(hide, 90000);
  }
  return { show: show, hide: hide, paint: paint, panelOpen: function () { return !!panel && !panel.hidden; } };
})();

/* ---- a friend's challenge: arriving via a shared link with ?beat=N shows a playful banner and a button
   that drops you straight into the game, so a shared score becomes a dare ---- */
(function () {
  var q; try { q = new URLSearchParams(window.location.search); } catch (e) { return; }
  var ref = q.get('ref'), beat = parseInt(q.get('beat'), 10);
  if (!ref || !beat || !/^(tiles|tetris|pong)$/.test(ref)) { return; }
  var msg = ref === 'tiles' ? 'A friend caught ' + beat + ' of the flying tiles. Can you beat that?'
          : ref === 'tetris' ? 'A friend scored ' + beat + ' at Tetris here. Can you beat that?'
          : 'A friend beat the house at Pong, 11–' + beat + '. Think you can?';
  var bar = document.createElement('div'); bar.className = 'pd-dare'; bar.setAttribute('role', 'status');
  bar.innerHTML = '<span class="pd-dare-t"></span><button type="button" class="pd-dare-go">Take the dare</button><button type="button" class="pd-dare-x" aria-label="Dismiss">×</button>';
  bar.firstChild.textContent = '💥 ' + msg;
  function put() { document.body.appendChild(bar); }
  if (document.body) { put(); } else { document.addEventListener('DOMContentLoaded', put); }
  bar.querySelector('.pd-dare-x').addEventListener('click', function () { bar.remove(); });
  bar.querySelector('.pd-dare-go').addEventListener('click', function () {
    bar.remove();
    var t = document.getElementById(ref === 'tiles' ? 'photoTower' : ref === 'tetris' ? 'tetris' : 'pongPanel');
    if (t && t.scrollIntoView) { t.scrollIntoView({ behavior: 'smooth', block: ref === 'tetris' ? 'start' : 'center' }); }
    if (ref === 'tiles') { setTimeout(function () { var b = document.querySelector('.pd-storm'); if (b && !b.hidden) { b.click(); } }, 700); }
    if (window.tpSound && window.tpSound.unlock) { window.tpSound.unlock(); }
  });
})();

/* ---- a small "pass it on" sticker that appears once someone has spent a little while here ---- */
(function () {
  var seen = false; try { seen = window.sessionStorage.getItem('tp_pass_v1') === '1'; } catch (e) {}
  setTimeout(function () {
    if (!window.pdShare) { return; }
    var b = document.createElement('button'); b.type = 'button'; b.className = 'pd-pass'; b.innerHTML = '<span>📣</span> Pass it on';
    b.addEventListener('click', function () { window.pdShare.show(window.__pdShareKind || 'site', 0); try { window.sessionStorage.setItem('tp_pass_v1', '1'); } catch (e) {} });
    document.body.appendChild(b);
    if (!seen) { b.classList.add('pd-pass-wiggle'); }
  }, 25000);
})();

/* ---- a mini Pong table, tucked into the Axion/HotPlay entry: human vs a
   beatable house AI, served with arrow keys, W/S, or a drag on the table.
   High scores are kept per browser via localStorage — there's no backend
   behind this site, so this board is "this device", not every visitor.
   All motion is in game-units per SECOND, advanced by real elapsed time, so
   it plays the same on a 60 Hz and a 144 Hz screen. ---- */
(function () {
  var panel  = document.getElementById('pongPanel');
  var canvas = document.getElementById('pongCanvas');
  if (!panel || !canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var W = 700, H = 400; // logical game units; canvas is scaled to fit via CSS
  var STORE_KEY = 'tp_pong_scores_v1';
  var SPEED_KEY = 'tp_pong_speed_v1';
  var WIN_SCORE = 11;

  /* tuning knobs (units per second at "normal") */
  var BALL_START = 231, BALL_MAX = 476, PLAYER_SPEED = 280, CPU_SPEED = 165;
  var SPEEDS = [ { name: 'easy', k: 0.7 }, { name: 'normal', k: 1 }, { name: 'quick', k: 1.5 } ];
  var speedIdx = 1;
  try {
    var saved = parseInt(window.localStorage.getItem(SPEED_KEY), 10);
    if (saved >= 0 && saved < SPEEDS.length) speedIdx = saved;
  } catch (e) {}
  function kk () { return SPEEDS[speedIdx].k; }

  var msg          = document.getElementById('pongMsg');
  var youScoreEl   = document.getElementById('pongScoreYou');
  var cpuScoreEl   = document.getElementById('pongScoreCpu');
  var winOverlay   = document.getElementById('pongWin');
  var winText      = document.getElementById('pongWinText');
  var initialsInput= document.getElementById('pongInitials');
  var saveBtn      = document.getElementById('pongSave');
  var skipBtn      = document.getElementById('pongSkip');
  var boardEl      = document.getElementById('pongBoard');
  var soundBtn     = document.getElementById('pongSound');
  var speedBtn     = document.getElementById('pongSpeed');

  var IDLE_MSG = 'Click the table to serve · move with ↑ ↓ or W S, or drag.';

  var state = {
    started: false, running: false, hold: 0,
    youY: H / 2, cpuY: H / 2, noise: 0, noiseT: 0,
    ballX: W / 2, ballY: H / 2, ballVX: 0, ballVY: 0,
    youScore: 0, cpuScore: 0,
    paddleH: 72, paddleW: 11, ballR: 7.5, padX: 22,
    keys: {}, dragY: null
  };

  /* sound effects (all no-ops while muted) */
  var snd = window.tpSound;
  var sfx = {
    wall:  function () { snd && snd.tone(220, 0.04, 'square', 0.035); },
    you:   function () { snd && snd.tone(520, 0.06, 'square', 0.05); },
    cpu:   function () { snd && snd.tone(380, 0.06, 'square', 0.05); },
    point: function () { snd && snd.seq([523, 659, 784], 0.07, 'triangle', 0.06); },
    miss:  function () { snd && snd.tone(200, 0.28, 'sawtooth', 0.045, 0, 90); },
    win:   function () { snd && snd.seq([523, 659, 784, 1047], 0.11, 'square', 0.05); },
    lose:  function () { snd && snd.tone(330, 0.6, 'sawtooth', 0.05, 0, 70); },
    serve: function () { snd && snd.tone(440, 0.05, 'triangle', 0.04); }
  };

  /* crisper strokes: size the backing store to the displayed size x DPR,
     without changing the game's own W/H coordinate system */
  function fit () {
    var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    var cssW = canvas.clientWidth || W;
    var s = Math.min(3, Math.max(1, cssW / W * dpr));
    var pw = Math.round(W * s), ph = Math.round(H * s);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    ctx.setTransform(pw / W, 0, 0, ph / H, 0, 0);
  }
  window.addEventListener('resize', function () { if (!panel.hidden) { fit(); draw(); } });

  function loadScores () {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function saveScores (list) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function renderBoard () {
    var list = loadScores();
    boardEl.innerHTML = '';
    if (!list.length) {
      var empty = document.createElement('li');
      empty.className = 'arcade-empty';
      empty.textContent = 'No winners yet. Be the first.';
      boardEl.appendChild(empty);
      return;
    }
    list.slice(0, 10).forEach(function (row) {
      var li = document.createElement('li');
      var name = document.createElement('span');
      name.textContent = row.initials;
      var score = document.createElement('span');
      score.textContent = WIN_SCORE + '–' + row.lost;
      li.appendChild(name); li.appendChild(score);
      boardEl.appendChild(li);
    });
  }
  function addScore (initials, lost) {
    var list = loadScores();
    list.push({ initials: initials, lost: lost, t: Date.now() });
    /* ranked by fewest points conceded in an 11-point win; earlier of a tie
       keeps its place */
    list.sort(function (a, b) { return a.lost - b.lost || a.t - b.t; });
    saveScores(list.slice(0, 10));
    renderBoard();
  }

  function resetBall (dir) {
    state.ballX = W / 2; state.ballY = H / 2;
    var angle = Math.random() * 0.6 - 0.3;
    var speed = BALL_START * kk();
    state.ballVX = Math.cos(angle) * speed * (dir || (Math.random() < 0.5 ? 1 : -1));
    state.ballVY = Math.sin(angle) * speed;
    state.hold = 0.7; /* a beat to find the ball before it moves */
  }
  function clampY (y) { return Math.max(state.paddleH / 2, Math.min(H - state.paddleH / 2, y)); }

  function resetMatch () {
    state.started = false; state.running = false;
    state.youScore = 0; state.cpuScore = 0;
    state.ballX = W / 2; state.ballY = H / 2;
    youScoreEl.textContent = '0'; cpuScoreEl.textContent = '0';
  }
  function serve () {
    state.started = true; state.running = true;
    if (snd) snd.unlock();
    resetBall();
    sfx.serve();
    msg.textContent = '';
  }
  function maybeServe () {
    if (!winOverlay.hidden) return;
    if (!state.started) serve();
  }
  function endGame (youWon) {
    state.running = false;
    if (youWon) {
      sfx.win(); state.lastLost = state.cpuScore;
      winText.textContent = 'You win, ' + WIN_SCORE + '–' + state.cpuScore + '. Enter your initials:';
      initialsInput.value = '';
      winOverlay.hidden = false;
      initialsInput.focus();
    } else {
      sfx.lose();
      msg.textContent = 'House wins, ' + WIN_SCORE + '–' + state.youScore + '. Click to try again.';
      resetMatch();
    }
  }

  saveBtn.addEventListener('click', function () {
    var val = (initialsInput.value || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'YOU';
    addScore(val, state.cpuScore);
    winOverlay.hidden = true;
    resetMatch();
    msg.textContent = IDLE_MSG;
    if (window.pdShare) { window.pdShare.show('pong', state.lastLost); }
  });
  skipBtn.addEventListener('click', function () {
    winOverlay.hidden = true;
    resetMatch();
    msg.textContent = IDLE_MSG;
    if (window.pdShare) { window.pdShare.show('pong', state.lastLost); }
  });
  initialsInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
  });

  function paintTools () {
    if (soundBtn && snd) {
      soundBtn.textContent = snd.isOn() ? 'Sound on' : 'Sound off';
      soundBtn.setAttribute('aria-pressed', snd.isOn() ? 'true' : 'false');
    }
    if (speedBtn) speedBtn.textContent = 'Speed: ' + SPEEDS[speedIdx].name;
  }
  if (soundBtn && snd) {
    soundBtn.addEventListener('click', function () { snd.toggle(); });
    snd.onChange(paintTools);
  }
  if (speedBtn) {
    speedBtn.addEventListener('click', function () {
      var old = kk();
      speedIdx = (speedIdx + 1) % SPEEDS.length;
      try { window.localStorage.setItem(SPEED_KEY, String(speedIdx)); } catch (e) {}
      var r = kk() / old; /* rescale the ball already in flight */
      state.ballVX *= r; state.ballVY *= r;
      paintTools();
    });
  }
  paintTools();

  /* pause while the table is scrolled out of view, so the house can't pile
     up points against nobody */
  var inView = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
    }, { threshold: 0.25 }).observe(canvas);
  }

  function update (dt) {
    var k = kk();
    if (state.keys.up) state.youY -= PLAYER_SPEED * dt;
    if (state.keys.down) state.youY += PLAYER_SPEED * dt;
    if (state.dragY != null) state.youY += (state.dragY - state.youY) * (1 - Math.pow(0.65, dt * 60));
    state.youY = clampY(state.youY);

    /* house paddle: capped speed plus a little aim noise (re-rolled a few
       times a second), so it's beatable rather than a wall */
    state.noiseT -= dt;
    if (state.noiseT <= 0) { state.noise = (Math.random() - 0.5) * 36; state.noiseT = 0.2; }
    var diff = state.ballY + state.noise - state.cpuY;
    var cs = CPU_SPEED * k * dt;
    state.cpuY = clampY(state.cpuY + Math.max(-cs, Math.min(cs, diff)));

    if (state.hold > 0) { state.hold -= dt; return; }

    state.ballX += state.ballVX * dt;
    state.ballY += state.ballVY * dt;

    if (state.ballY - state.ballR < 0) { state.ballY = state.ballR; state.ballVY = Math.abs(state.ballVY); sfx.wall(); }
    if (state.ballY + state.ballR > H) { state.ballY = H - state.ballR; state.ballVY = -Math.abs(state.ballVY); sfx.wall(); }

    var padXYou = state.padX, padXCpu = W - state.padX, hw = state.paddleW / 2;
    var top = BALL_MAX * k;
    if (state.ballVX < 0 &&
        state.ballX - state.ballR <= padXYou + hw &&
        state.ballX + state.ballR >= padXYou - hw &&
        Math.abs(state.ballY - state.youY) <= state.paddleH / 2 + state.ballR) {
      state.ballX = padXYou + hw + state.ballR;
      var rel = (state.ballY - state.youY) / (state.paddleH / 2);
      var spY = Math.min(top, Math.hypot(state.ballVX, state.ballVY) * 1.06);
      state.ballVX = Math.abs(spY * Math.cos(rel * 0.5));
      state.ballVY = spY * Math.sin(rel * 1.1);
      sfx.you();
    }
    if (state.ballVX > 0 &&
        state.ballX + state.ballR >= padXCpu - hw &&
        state.ballX - state.ballR <= padXCpu + hw &&
        Math.abs(state.ballY - state.cpuY) <= state.paddleH / 2 + state.ballR) {
      state.ballX = padXCpu - hw - state.ballR;
      var rel2 = (state.ballY - state.cpuY) / (state.paddleH / 2);
      var spC = Math.min(top, Math.hypot(state.ballVX, state.ballVY) * 1.06);
      state.ballVX = -Math.abs(spC * Math.cos(rel2 * 0.5));
      state.ballVY = spC * Math.sin(rel2 * 1.1);
      sfx.cpu();
    }

    if (state.ballX < -20) {
      state.cpuScore++; cpuScoreEl.textContent = state.cpuScore;
      if (state.cpuScore >= WIN_SCORE) { endGame(false); return; }
      sfx.miss();
      resetBall(1);
    } else if (state.ballX > W + 20) {
      state.youScore++; youScoreEl.textContent = state.youScore;
      if (state.youScore >= WIN_SCORE) { endGame(true); return; }
      sfx.point();
      resetBall(-1);
    }
  }

  var last = 0;
  function step (now) {
    requestAnimationFrame(step);
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    if (panel.hidden || !inView) return;
    if (state.running) update(dt);
    draw();
  }

  function draw () {
    ctx.clearRect(0, 0, W, H);
    var cs = getComputedStyle(document.body);
    var ground = (cs.getPropertyValue('--ground') || '#EFEFEB').trim();
    var accent = (cs.getPropertyValue('--accent') || '#9A6E28').trim();
    var rule   = (cs.getPropertyValue('--rule') || '#CDD1CA').trim();

    ctx.strokeStyle = rule;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 8]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = ground;
    ctx.fillRect(state.padX - state.paddleW / 2, state.youY - state.paddleH / 2, state.paddleW, state.paddleH);
    ctx.fillRect(W - state.padX - state.paddleW / 2, state.cpuY - state.paddleH / 2, state.paddleW, state.paddleH);

    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(state.ballX, state.ballY, state.ballR, 0, Math.PI * 2); ctx.fill();

    if (!state.started) {
      ctx.fillStyle = ground; ctx.globalAlpha = 0.55;
      ctx.font = '13px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('click the table to serve', W / 2, H / 2 - 26);
      ctx.globalAlpha = 1;
    }
  }

  /* keys only count while the table has focus (click it), so arrows and space
     still scroll the page the rest of the time */
  canvas.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var isUp = e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W';
    var isDown = e.key === 'ArrowDown' || e.key === 's' || e.key === 'S';
    if (isUp) { state.keys.up = true; state.dragY = null; }
    if (isDown) { state.keys.down = true; state.dragY = null; }
    if (isUp || isDown || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); maybeServe(); }
  });
  canvas.addEventListener('keyup', function (e) {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') state.keys.up = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') state.keys.down = false;
  });
  canvas.addEventListener('blur', function () { state.keys.up = false; state.keys.down = false; });

  function pointerY (clientY) {
    var rect = canvas.getBoundingClientRect();
    return (clientY - rect.top) / rect.height * H;
  }
  canvas.addEventListener('pointerdown', function (e) {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    try { canvas.focus({ preventScroll: true }); } catch (err) {}
    state.dragY = pointerY(e.clientY);
    if (snd) snd.unlock();
    maybeServe();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (e.buttons) state.dragY = pointerY(e.clientY);
  });
  /* release the paddle when the pointer lifts, so the keys take over again */
  ['pointerup', 'pointercancel'].forEach(function (ev) {
    canvas.addEventListener(ev, function () { state.dragY = null; });
  });

  fit(); draw();
  if (window.ResizeObserver) { new ResizeObserver(function () { fit(); }).observe(canvas); }
  window.addEventListener('load', function () { fit(); draw(); });
  renderBoard();
  requestAnimationFrame(step);
})();

/* ---- a mini Tetris, tucked under the section list in the left rail (wide
   screens only). Click the board to play: arrow keys move and turn, down is
   a soft drop, space drops the piece, P pauses. Keys only count while the
   board has focus, so the page scrolls normally the rest of the time. ---- */
(function () {
  var panel  = document.getElementById('tetPanel');
  var cv     = document.getElementById('tetCanvas');
  var nx     = document.getElementById('tetNext');
  if (!panel || !cv || !nx || !cv.getContext) return;

  var ctx = cv.getContext('2d'), nctx = nx.getContext('2d');
  var COLS = 10, ROWS = 20, CELL = 24; /* canvas is 240 x 480 */
  var BEST_KEY = 'tp_tetris_best_v1';
  var scoreEl = document.getElementById('tetScore');
  var linesEl = document.getElementById('tetLines');
  var levelEl = document.getElementById('tetLevel');
  var bestEl  = document.getElementById('tetBest');
  var soundBtn = document.getElementById('tetSound');
  var snd = window.tpSound;

  var SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[1,1],[1,1]],
    T: [[0,1,0],[1,1,1],[0,0,0]],
    S: [[0,1,1],[1,1,0],[0,0,0]],
    Z: [[1,1,0],[0,1,1],[0,0,0]],
    J: [[1,0,0],[1,1,1],[0,0,0]],
    L: [[0,0,1],[1,1,1],[0,0,0]]
  };
  var NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  var COLOR_VARS = { I: '--celadon', O: '--brass', T: '--plum', S: '--moss', Z: '--seal', J: '--indigo', L: '--clay' };
  var COLOR_FALLBACK = { I: '#6FA39A', O: '#B8893A', T: '#7A5A86', S: '#6B7D4A', Z: '#B4372A', J: '#4A5F8C', L: '#B4693F' };

  var board = emptyBoard(), cur = null, nextName = null, bag = [];
  var score = 0, lines = 0, level = 1, best = 0, acc = 0, last = 0;
  var mode = 'idle'; /* idle | playing | paused | over */
  try { best = parseInt(window.localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) {}

  var sfx = {
    move:  function () { snd && snd.tone(300, 0.02, 'square', 0.02); },
    turn:  function () { snd && snd.tone(440, 0.04, 'triangle', 0.045); },
    lock:  function () { snd && snd.tone(120, 0.09, 'sine', 0.08); },
    clear: function (n) {
      if (!snd) return;
      if (n >= 4) snd.seq([523, 659, 784, 1047, 1319], 0.06, 'square', 0.05);
      else snd.seq([523, 659, 784].slice(0, n + 1), 0.07, 'square', 0.045);
    },
    level: function () { snd && snd.seq([392, 523, 659], 0.08, 'triangle', 0.06); },
    start: function () { snd && snd.seq([392, 523], 0.08, 'triangle', 0.05); },
    over:  function () { snd && snd.tone(330, 0.6, 'sawtooth', 0.05, 0, 70); }
  };
  function paintSound () {
    if (!soundBtn || !snd) return;
    soundBtn.textContent = snd.isOn() ? 'Sound on' : 'Sound off';
    soundBtn.setAttribute('aria-pressed', snd.isOn() ? 'true' : 'false');
  }
  if (soundBtn && snd) {
    soundBtn.addEventListener('click', function () { snd.toggle(); });
    snd.onChange(paintSound);
  }
  paintSound();

  function emptyBoard () {
    var b = [];
    for (var y = 0; y < ROWS; y++) { var row = []; for (var x = 0; x < COLS; x++) row.push(0); b.push(row); }
    return b;
  }
  function rotate (m) {
    var n = m.length, r = [];
    for (var y = 0; y < n; y++) { r[y] = []; for (var x = 0; x < n; x++) r[y][x] = m[n - 1 - x][y]; }
    return r;
  }
  function nextFromBag () {
    if (!bag.length) {
      bag = NAMES.slice();
      for (var i = bag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), t = bag[i]; bag[i] = bag[j]; bag[j] = t;
      }
    }
    return bag.pop();
  }
  function collides (m, x, y) {
    for (var r = 0; r < m.length; r++) {
      for (var c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        var bx = x + c, by = y + r;
        if (bx < 0 || bx >= COLS || by >= ROWS) return true;
        if (by >= 0 && board[by][bx]) return true;
      }
    }
    return false;
  }
  function spawn () {
    var name = nextName || nextFromBag();
    nextName = nextFromBag();
    var m = SHAPES[name].map(function (r) { return r.slice(); });
    cur = { name: name, m: m, x: Math.floor((COLS - m.length) / 2), y: name === 'I' ? -1 : 0 };
    drawNext();
    if (collides(cur.m, cur.x, cur.y)) gameOver();
  }
  function move (dx, dy) {
    if (collides(cur.m, cur.x + dx, cur.y + dy)) return false;
    cur.x += dx; cur.y += dy; return true;
  }
  function turn () {
    var m = rotate(cur.m), kicks = [0, -1, 1, -2, 2];
    for (var i = 0; i < kicks.length; i++) {
      if (!collides(m, cur.x + kicks[i], cur.y)) { cur.m = m; cur.x += kicks[i]; sfx.turn(); return; }
    }
  }
  function interval () { return Math.max(64, 586 - (level - 1) * 49); }

  function lock () {
    for (var r = 0; r < cur.m.length; r++) {
      for (var c = 0; c < cur.m[r].length; c++) {
        if (!cur.m[r][c]) continue;
        var by = cur.y + r, bx = cur.x + c;
        if (by >= 0) board[by][bx] = cur.name;
      }
    }
    var n = 0;
    for (var y = ROWS - 1; y >= 0;) {
      var full = true;
      for (var x = 0; x < COLS; x++) { if (!board[y][x]) { full = false; break; } }
      if (full) { board.splice(y, 1); board.unshift(emptyBoard()[0]); n++; } else { y--; }
    }
    if (n) {
      score += [0, 100, 300, 500, 800][n] * level;
      lines += n;
      var lv = 1 + Math.floor(lines / 10);
      if (lv > level) { level = lv; sfx.clear(n); setTimeout(sfx.level, 260); } else { sfx.clear(n); }
    } else { sfx.lock(); }
    stats();
    spawn();
  }
  function hardDrop () {
    var d = 0;
    while (move(0, 1)) d++;
    score += d * 2;
    acc = 0;
    lock();
  }
  function gameOver () {
    mode = 'over';
    var wasBest = best;
    if (score > best) { best = score; try { window.localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} }
    sfx.over();
    if (score > wasBest && score >= 100 && window.pdShare) { var shared = score; setTimeout(function () { window.pdShare.show('tetris', shared); }, 900); }
    stats();
  }
  function stats () {
    scoreEl.textContent = score; linesEl.textContent = lines;
    levelEl.textContent = level; bestEl.textContent = Math.max(best, score);
  }
  function start () {
    board = emptyBoard(); bag = []; nextName = null;
    score = 0; lines = 0; level = 1; acc = 0;
    mode = 'playing';
    if (snd) snd.unlock();
    sfx.start();
    spawn(); stats(); draw();
  }
  function pause () { if (mode === 'playing') { mode = 'paused'; draw(); } }
  function resume () { if (mode === 'paused') { mode = 'playing'; last = 0; draw(); } }

  function colorOf (name, cs) {
    var v = (cs.getPropertyValue(COLOR_VARS[name]) || '').trim();
    return v || COLOR_FALLBACK[name];
  }
  function block (g, px, py, s, color, alpha) {
    var a = alpha == null ? 1 : alpha;
    g.globalAlpha = a; g.fillStyle = color; g.fillRect(px + 1, py + 1, s - 2, s - 2);
    g.globalAlpha = a * 0.35; g.fillStyle = '#fff'; g.fillRect(px + 1, py + 1, s - 2, Math.max(2, s * 0.14));
    g.globalAlpha = 1;
  }
  function drawNext () {
    nctx.clearRect(0, 0, 96, 96);
    if (!nextName) return;
    var cs = getComputedStyle(document.body), m = SHAPES[nextName], s = 20;
    var minR = 9, maxR = -1, minC = 9, maxC = -1, r, c;
    for (r = 0; r < m.length; r++) for (c = 0; c < m[r].length; c++) if (m[r][c]) {
      if (r < minR) minR = r; if (r > maxR) maxR = r; if (c < minC) minC = c; if (c > maxC) maxC = c;
    }
    var ox = (96 - (maxC - minC + 1) * s) / 2, oy = (96 - (maxR - minR + 1) * s) / 2;
    for (r = 0; r < m.length; r++) for (c = 0; c < m[r].length; c++) if (m[r][c]) {
      block(nctx, ox + (c - minC) * s, oy + (r - minR) * s, s, colorOf(nextName, cs));
    }
  }
  function banner (cs, ground, rows) {
    var ink = (cs.getPropertyValue('--ink') || '#1A1C1A').trim();
    ctx.globalAlpha = 0.8; ctx.fillStyle = ink; ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
    ctx.globalAlpha = 1; ctx.fillStyle = ground; ctx.textAlign = 'center';
    ctx.font = '500 24px "IBM Plex Mono", monospace';
    rows.forEach(function (t, i) { ctx.fillText(t, COLS * CELL / 2, ROWS * CELL / 2 + 8 + i * 34 - (rows.length - 1) * 17); });
  }
  function draw () {
    var cs = getComputedStyle(document.body);
    var ground = (cs.getPropertyValue('--ground') || '#EFEFEB').trim();
    ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);

    ctx.strokeStyle = ground; ctx.globalAlpha = 0.07; ctx.lineWidth = 1; ctx.beginPath();
    var i;
    for (i = 1; i < COLS; i++) { ctx.moveTo(i * CELL + 0.5, 0); ctx.lineTo(i * CELL + 0.5, ROWS * CELL); }
    for (i = 1; i < ROWS; i++) { ctx.moveTo(0, i * CELL + 0.5); ctx.lineTo(COLS * CELL, i * CELL + 0.5); }
    ctx.stroke(); ctx.globalAlpha = 1;

    var x, y, r, c;
    for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
      if (board[y][x]) block(ctx, x * CELL, y * CELL, CELL, colorOf(board[y][x], cs));
    }
    if (cur && mode !== 'idle') {
      var gy = cur.y;
      while (!collides(cur.m, cur.x, gy + 1)) gy++;
      for (r = 0; r < cur.m.length; r++) for (c = 0; c < cur.m[r].length; c++) {
        if (!cur.m[r][c]) continue;
        if (gy !== cur.y && gy + r >= 0) block(ctx, (cur.x + c) * CELL, (gy + r) * CELL, CELL, colorOf(cur.name, cs), 0.22);
      }
      for (r = 0; r < cur.m.length; r++) for (c = 0; c < cur.m[r].length; c++) {
        if (cur.m[r][c] && cur.y + r >= 0) block(ctx, (cur.x + c) * CELL, (cur.y + r) * CELL, CELL, colorOf(cur.name, cs));
      }
    }
    if (mode === 'idle') banner(cs, ground, ['TETRIS', 'click to play']);
    else if (mode === 'paused') banner(cs, ground, ['PAUSED', 'click or P']);
    else if (mode === 'over') banner(cs, ground, ['GAME OVER', 'click to retry']);
  }

  var tetInView = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { tetInView = es[0].isIntersecting; if (!tetInView) { last = 0; } }).observe(cv);
  }
  function frame (now) {
    requestAnimationFrame(frame);
    var dt = last ? Math.min(100, now - last) : 16;
    last = now;
    if (mode !== 'playing' || panel.hidden || !tetInView) return;
    acc += dt;
    var iv = interval();
    if (acc >= iv) {
      acc -= iv;
      if (!move(0, 1)) lock();
      draw();
    }
  }

  cv.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key, handled = true;
    if (mode === 'idle' || mode === 'over') {
      if (k === 'Enter' || k === ' ') start(); else handled = false;
    } else if (mode === 'paused') {
      if (k === 'p' || k === 'P' || k === 'Escape' || k === 'Enter' || k === ' ') resume(); else handled = false;
    } else {
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { if (move(-1, 0)) sfx.move(); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { if (move(1, 0)) sfx.move(); }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { if (move(0, 1)) { score += 1; acc = 0; stats(); } }
      else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'x' || k === 'X') { if (!e.repeat) turn(); }
      else if (k === ' ') { if (!e.repeat) hardDrop(); }
      else if (k === 'p' || k === 'P' || k === 'Escape') pause();
      else handled = false;
      if (handled) draw();
    }
    if (handled) e.preventDefault();
  });
  cv.addEventListener('blur', pause);
  cv.addEventListener('pointerdown', function () {
    cv.focus();
    if (mode === 'idle' || mode === 'over') start();
    else if (mode === 'paused') resume();
  });

  stats(); draw();
  requestAnimationFrame(frame);
})();


/* "Send to a friend" inside the enlarged picture: the moment someone is enjoying a piece is the moment to pass it on */
(function () {
  var b = document.getElementById('pdrumZoomShare');
  if (!b) { return; }
  b.addEventListener('click', function () { if (pdrumZoomIm && window.pdShare) { window.pdShare.show('art', 0, [pdrumZoomIm.src]); } });
})();
