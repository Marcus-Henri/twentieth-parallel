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

/* ---- photo drum: rotating 3D photo tower, used in Seen and Made ---- */
var pdrumZoomOpen = false;
var pdrumZoomDrum = null;
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
  pdrumZoomDrum = drum || null;
  if (pdrumZoomDrum) { pdrumZoomDrum.classList.add('is-paused'); }
  requestAnimationFrame(function () { overlay.classList.add('show'); });
  document.getElementById('pdrumZoomClose').focus();
}
function closePdrumZoom() {
  var overlay = document.getElementById('pdrumZoom');
  if (!overlay) { return; }
  overlay.classList.remove('show');
  pdrumZoomOpen = false;
  if (pdrumZoomDrum) { pdrumZoomDrum.classList.remove('is-paused'); pdrumZoomDrum = null; }
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

/* builds one drum: containerId is an empty .pdrum-frame element, images is
   [{src, title, portrait}], direction -1 turns right-to-left, 1 turns left-to-right */
window.buildPhotoDrum = function (containerId, images, direction) {
  var container = document.getElementById(containerId);
  if (!container || !images || !images.length) { return; }

  var scene = document.createElement('div');
  scene.className = 'pdrum-scene';
  var drum = document.createElement('div');
  drum.className = 'pdrum' + (direction < 0 ? ' pdrum--r2l' : '');
  scene.appendChild(drum);
  container.appendChild(scene);

  var ROWS = 5;
  var totalUnits = images.reduce(function (sum, im) { return sum + (im.portrait ? 2 : 1); }, 0);
  var FACES = Math.max(8, Math.ceil(totalUnits / ROWS) + 1);
  /* radius scaled from the approved 9-face/234px drum, so more faces (more photos)
     push the cylinder wider instead of crowding the same circle and overlapping */
  var radius = Math.round(234 * FACES / 9);

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
    return fig;
  }

  for (var i = 0; i < FACES; i++) {
    var col = document.createElement('div');
    col.className = 'pdrum-col';
    col.style.transform = 'rotateY(' + (i * 360 / FACES) + 'deg) translateZ(' + radius + 'px)';
    var budget = ROWS;
    while (budget > 0) {
      var im = takeNext(budget);
      var span = im.portrait ? 2 : 1;
      var t = makeTile(im);
      t.style.gridRow = 'span ' + span;
      t.setAttribute('tabindex', '0');
      t.setAttribute('role', 'button');
      t.addEventListener('click', (function (im) { return function () { openPdrumZoom(im, drum); }; })(im));
      t.addEventListener('keydown', (function (im) {
        return function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPdrumZoom(im, drum); } };
      })(im));
      col.appendChild(t);
      budget -= span;
    }
    drum.appendChild(col);
  }

  drum.addEventListener('pointerover', function (e) {
    if (e.target.closest('.pdrum-tile')) { drum.classList.add('is-paused'); }
  });
  drum.addEventListener('pointerleave', function () {
    if (pdrumZoomOpen) { return; }
    drum.classList.remove('is-paused');
  });
};
