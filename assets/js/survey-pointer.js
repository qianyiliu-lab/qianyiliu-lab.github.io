(() => {
  const marker = document.querySelector('.survey-pointer');
  if (!marker || !window.PointerEvent) return;

  const enabled = matchMedia('screen and (any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)');
  const svg = name => document.createElementNS('http://www.w3.org/2000/svg', name);
  const trace = svg('svg');
  const ink = svg('path');
  const contour = svg('path');
  const reach = 112; // CSS pixels of traveled distance, including nib clearance
  const radius = reach + 8;
  const lifetime = 210; // milliseconds of pointer history
  trace.setAttribute('class', 'ink-pointer');
  trace.setAttribute('viewBox', '0 0 ' + radius * 2 + ' ' + radius * 2);
  trace.setAttribute('width', radius * 2);
  trace.setAttribute('height', radius * 2);
  trace.setAttribute('display', 'none');
  trace.setAttribute('aria-hidden', 'true');
  trace.setAttribute('focusable', 'false');
  ink.setAttribute('class', 'ink-pointer__stroke');
  contour.setAttribute('class', 'ink-pointer__contour');
  trace.append(ink, contour);
  marker.replaceWith(trace);

  const history = [];
  let frame = 0;
  let clearance = 7;

  function reset() {
    history.length = 0;
    cancelAnimationFrame(frame);
    frame = 0;
    trace.classList.remove('is-tracing');
  }

  // Walk back along the actual gesture, clipping both ends between samples.
  function spine(now, head) {
    const points = [];
    let traveled = 0;
    for (let i = history.length - 1; i > 0; i--) {
      const a = history[i], b = history[i - 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      if (!length) continue;
      const start = Math.max(0, (clearance - traveled) / length);
      let end = Math.min(1, (reach - traveled) / length);
      if (b.time < now - lifetime) {
        end = Math.min(end, (a.time - now + lifetime) / (a.time - b.time || 1));
      }
      const point = t => ({
        x: radius + a.x - head.x + dx * t,
        y: radius + a.y - head.y + dy * t,
        distance: traveled + length * t - clearance
      });
      if (end > start) {
        if (!points.length) points.push(point(start));
        points.push(point(end));
      }
      traveled += length;
      if (end < 1 || traveled >= reach) break;
    }
    return points;
  }

  const xy = p => p.x.toFixed(2) + ' ' + p.y.toFixed(2);
  function edge(points) {
    let d = 'L' + xy(points[0]);
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      d += 'Q' + xy(a) + ' ' + xy({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});
    }
    return d + 'L' + xy(points[points.length - 1]);
  }

  // Two filled, tapered ribbons share a centerline normal. Their separation
  // peaks mid-stroke, so the fine contour peels away and rejoins at the tip.
  function ribbons(points, length) {
    const left = [], right = [], outer = [], inner = [];
    const scale = Math.min(1, length / 20);
    points.forEach((p, i) => {
      const a = points[Math.max(0, i - 1)];
      const b = points[Math.min(points.length - 1, i + 1)];
      const norm = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = (a.y - b.y) / norm, ny = (b.x - a.x) / norm;
      const t = Math.min(1, Math.max(0, p.distance / length));
      const taper = Math.pow(1 - t, .75) * scale;
      const offset = (2.3 + 3 * Math.sin(Math.PI * t)) * taper;
      const at = n => ({x: p.x + nx * n, y: p.y + ny * n});
      left.push(at(1.6 * taper));
      right.push(at(-1.6 * taper));
      outer.push(at(offset + .6 * taper));
      inner.push(at(offset - .6 * taper));
    });
    const ribbon = (a, b) => edge(a).replace('L', 'M') + edge(b.reverse()) + 'Z';
    ink.setAttribute('d', ribbon(left, right));
    contour.setAttribute('d', ribbon(outer, inner));
  }

  function paint(now) {
    frame = 0;
    const head = history[history.length - 1];
    const age = Math.max(0, now - head.time);
    if (age >= lifetime) return reset();
    const points = spine(now, head);
    const length = points.length ? points[points.length - 1].distance : 0;
    if (length < 1) {
      trace.classList.remove('is-tracing');
      return;
    }
    ribbons(points, length);
    trace.style.transform = 'translate3d(' + (head.x - radius) + 'px,' + (head.y - radius) + 'px,0)';
    trace.style.opacity = Math.min(1, (lifetime - age) / 150, length / 8);
    trace.classList.add('is-tracing');
    frame = requestAnimationFrame(paint);
  }

  function move(event) {
    if (event.pointerType !== 'mouse' || event.buttons || document.hidden) return reset();
    const target = event.target;
    if (target instanceof Element && (target.isContentEditable || target.closest('input, textarea, select, iframe'))) return reset();
    clearance = target instanceof Element && target.closest('a, button, summary, [role="button"]') ? 12 : 7;
    const x = event.clientX, y = event.clientY, time = performance.now();
    const last = history[history.length - 1];
    if (last && (time - last.time >= lifetime || Math.hypot(x - last.x, y - last.y) > reach * 2)) reset();
    else if (last && Math.hypot(x - last.x, y - last.y) < 1) return;
    // Keep high-polling mice from flooding the curve with sub-frame samples.
    if (history.length > 1 && time - history[history.length - 2].time < 7) history.pop();
    history.push({x, y, time});
    if (history.length > 36) history.shift();
    if (!frame) frame = requestAnimationFrame(paint);
  }

  function sync() {
    reset();
    if (enabled.matches) document.addEventListener('pointermove', move, {passive: true});
    else document.removeEventListener('pointermove', move);
  }
  enabled.addEventListener('change', sync);
  sync();
  document.documentElement.addEventListener('pointerleave', reset);
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget || event.relatedTarget.nodeName === 'IFRAME') reset();
  });
  for (const type of ['pointerdown', 'pointercancel', 'dragstart', 'keydown', 'visibilitychange']) {
    document.addEventListener(type, reset, {capture: true, passive: true});
  }
  window.addEventListener('blur', reset);
  window.addEventListener('pagehide', reset);
})();
