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
  function makeTile(im) {
    var fig = document.createElement('figure');
    fig.className = 'pdrum-tile';
    var img = document.createElement('img');
    img.src = im.src; img.alt = im.title; img.loading = 'lazy';
    var cap = document.createElement('figcaption');
    cap.textContent = im.title;
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
      var t = makeTile(im);
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
