(() => {
  const find = selector => document.querySelector(selector);
  const hero = find('#about-me'), cover = hero?.querySelector('picture img');
  const toggle = find('.survey-toggle'), lens = find('.survey-lens'), locator = find('.survey-locator');
  if (!cover || !toggle || !lens || !locator || !window.PointerEvent) return;
  const surface = lens.querySelector('.survey-lens__surface');
  hero.append(lens);

  const eligible = matchMedia('screen and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)');
  const key = 'survey-pointer', zoom = 2;
  let wanted = true, point, bounds, sample, follower, frame = 0;
  try { wanted = localStorage.getItem(key) !== 'off'; } catch (_) {}
  const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
  const translate = (x, y) => 'translate3d(' + x + 'px,' + y + 'px,0)';
  const overlap = (x, y, w, h, r, gap = 0) =>
    x < r.right + gap && x + w > r.left - gap && y < r.bottom + gap && y + h > r.top - gap;
  function reset() {
    cancelAnimationFrame(frame); frame = 0; point = follower = null;
    lens.hidden = locator.hidden = true;
  }
  function queue() { if (point && !frame) frame = requestAnimationFrame(paint); }
  function invalidate() { bounds = null; queue(); }

  // Measure ink, not full-width heading/paragraph boxes. Include the full hit
  // areas of controls, even when their labels occupy only a small part.
  function measure() {
    const box = cover.getBoundingClientRect(), host = hero.getBoundingClientRect();
    const blocked = Array.from(hero.querySelectorAll('a, button, summary'), el => el.getBoundingClientRect());
    const walk = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT), range = document.createRange();
    while (walk.nextNode()) {
      const text = walk.currentNode;
      if (!text.textContent.trim() || lens.contains(text)) continue;
      range.selectNodeContents(text); blocked.push(...range.getClientRects());
    }
    const style = getComputedStyle(cover), w = cover.naturalWidth, h = cover.naturalHeight;
    const contain = Math.min(box.width / w, box.height / h);
    const scale = {cover: Math.max(box.width / w, box.height / h), contain, none: 1,
      'scale-down': Math.min(1, contain)}[style.objectFit];
    let photo = box;
    if (scale && (w*scale < box.width-.01 || h*scale < box.height-.01)) {
      // Resolve the native CSS position against the spare space. On a
      // letterboxed cover only the painted image should activate the lens.
      const probe = document.createElement('span');
      Object.assign(probe.style, {position:'absolute', visibility:'hidden', pointerEvents:'none',
        width:Math.max(0,box.width-w*scale)+'px', height:Math.max(0,box.height-h*scale)+'px',
        perspectiveOrigin:style.objectPosition});
      hero.append(probe);
      const [dx,dy] = getComputedStyle(probe).perspectiveOrigin.split(' ').map(parseFloat);
      probe.remove();
      const left = box.left+(w*scale<box.width ? dx : 0), top = box.top+(h*scale<box.height ? dy : 0);
      photo = {left,top,right:left+w*scale,bottom:top+h*scale};
    }
    surface.style.width = box.width + 'px'; surface.style.height = box.height + 'px';
    surface.style.backgroundSize = scale === undefined ? '100% 100%' : (w * scale) + 'px ' + (h * scale) + 'px';
    surface.style.backgroundPosition = style.objectPosition;
    const mast = find('.mast')?.getBoundingClientRect();
    return {box, photo, host, blocked, left: Math.max(0, box.left, host.left) + 5,
      right: Math.min(document.documentElement.clientWidth, box.right, host.right) - 5,
      top: Math.max(0, mast?.bottom || 0, box.top, host.top) + 5,
      bottom: Math.min(innerHeight, box.bottom, host.bottom) - 5};
  }

  // A narrow <source> can be a different cut of the panorama. Never use the
  // desktop master for that cut unless the source explicitly selects it.
  function updateSource() {
    const preview = cover.currentSrc || cover.src;
    const source = Array.from(cover.parentNode.querySelectorAll('source[media]')).find(el => matchMedia(el.media).matches);
    const url = (source ? source.dataset.lensSrc : cover.dataset.lensSrc || cover.src) || preview;
    if (sample?.url === url && sample.preview === preview) return;
    const current = sample = {url, preview};
    const use = value => { surface.style.backgroundImage = 'url(' + JSON.stringify(value) + ')'; };
    use(preview);
    if (new URL(url, document.baseURI).href === preview) return;
    const detail = new Image();
    detail.onload = () => { if (sample === current) use(detail.src); };
    detail.src = url;
  }

  function showLens(x, y) {
    if (!cover.complete || !cover.naturalWidth) return false;
    const b = bounds || (bounds = measure());
    if (!overlap(x, y, 0, 0, b.photo) || b.blocked.some(r => overlap(x,y,0,0,r,2))) return false;
    lens.hidden = false;
    const w = lens.offsetWidth, h = lens.offsetHeight, gap = 18;
    if (!w || b.right - b.left < w || b.bottom - b.top < h) return false;
    const right = x + gap, left = x - gap - w, up = y - gap - h, down = y + gap;
    const choices = [[right,y-h/2],[left,y-h/2],[x-w/2,up],[x-w/2,down],
      [right,up],[left,up],[right,down],[left,down]];
    for (const choice of choices) {
      const a = clamp(choice[0], b.left, b.right - w), c = clamp(choice[1], b.top, b.bottom - h);
      if ((x >= a-4 && x <= a+w+4 && y >= c-4 && y <= c+h+4) ||
          b.blocked.some(r => overlap(a,c,w,h,r,6))) continue;
      if (!b.ready) { updateSource(); b.ready = true; }
      lens.style.transform = translate(a-b.host.left, c-b.host.top);
      // The original-size background positioning area lets the browser resolve
      // percentages, edge offsets and calc() exactly as on the cover. Padding
      // exposes available source pixels just beyond the displayed crop.
      const bleed = Math.ceil(Math.max(w,h) / (2*zoom));
      surface.style.padding = bleed + 'px';
      surface.style.zoom = zoom;
      surface.style.transform = translate(lens.clientWidth/(2*zoom) - (x-b.box.left+bleed),
        lens.clientHeight/(2*zoom) - (y-b.box.top+bleed));
      locator.hidden = true; follower = null;
      return true;
    }
    return false;
  }

  function paint(now) {
    frame = 0;
    const {x,y} = point, hit = document.elementFromPoint(x,y);
    if (!hit || hit.closest('input, textarea, select, iframe') || hit.isContentEditable) return reset();
    if (hero.contains(hit) && showLens(x,y)) return;
    lens.hidden = true;
    const destX = clamp(x+12, 2, document.documentElement.clientWidth-11), destY = clamp(y+11, 2, innerHeight-11);
    if (!follower) follower = {x:destX, y:destY, time:now};
    const alpha = 1 - Math.exp(-(now-follower.time)/42);
    follower.x += (destX-follower.x)*alpha; follower.y += (destY-follower.y)*alpha; follower.time = now;
    locator.toggleAttribute('data-link', Boolean(hit.closest('a[href]')));
    locator.style.transform = translate(Math.round(follower.x), Math.round(follower.y));
    locator.hidden = false;
    if (Math.hypot(destX-follower.x, destY-follower.y) > .2) queue();
  }

  function move(event) {
    if (event.pointerType !== 'mouse' || event.buttons || document.hidden) return reset();
    point = {x:event.clientX, y:event.clientY}; queue();
  }
  function sync() {
    reset(); bounds = null;
    toggle.hidden = !eligible.matches;
    toggle.setAttribute('aria-pressed', String(wanted && eligible.matches));
    toggle.title = wanted ? 'Turn survey pointer off' : 'Turn survey pointer on';
    document.removeEventListener('pointermove', move);
    if (eligible.matches && wanted) document.addEventListener('pointermove', move, {passive:true});
  }
  toggle.addEventListener('click', () => {
    wanted = !wanted;
    try { localStorage.setItem(key, wanted ? 'on' : 'off'); } catch (_) {}
    sync();
  });
  window.addEventListener('storage', e => { if (e.key === key || e.key === null) { wanted = e.newValue !== 'off'; sync(); } });
  eligible.addEventListener('change', sync);
  cover.addEventListener('load', invalidate);
  document.fonts?.ready.then(invalidate);
  new ResizeObserver(invalidate).observe(hero);
  window.addEventListener('resize', invalidate);
  window.addEventListener('scroll', invalidate, {capture:true, passive:true});
  document.addEventListener('pointerout', e => { if (!e.relatedTarget || e.relatedTarget.nodeName === 'IFRAME') reset(); });
  for (const type of ['pointerdown', 'pointercancel', 'dragstart', 'keydown', 'visibilitychange']) {
    document.addEventListener(type, reset, {capture:true, passive:true});
  }
  window.addEventListener('blur', reset);
  window.addEventListener('pagehide', reset);
  sync();
})();
