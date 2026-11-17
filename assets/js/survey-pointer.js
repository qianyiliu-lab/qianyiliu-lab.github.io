(() => {
  const marker = document.querySelector('.survey-pointer');
  if (!marker) return;

  const enabled = matchMedia('(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference)');
  let x, y, targetX, targetY;
  let frame = 0;
  let idleTimer;
  let lastTime = 0;

  function hide() {
    clearTimeout(idleTimer);
    cancelAnimationFrame(frame);
    marker.classList.remove('is-visible', 'is-over-link');
    frame = 0;
    lastTime = 0;
    x = undefined;
  }

  function paint(now) {
    // A short, refresh-rate-independent lag, capped even on large pointer jumps.
    const decay = lastTime ? Math.exp(-(now - lastTime) / 42) : 0;
    const dx = x - targetX, dy = y - targetY;
    const distance = Math.hypot(dx, dy);
    const lag = distance ? Math.min(decay, 24 / distance) : 0;
    x = targetX + dx * lag;
    y = targetY + dy * lag;
    marker.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    marker.classList.add('is-visible');
    lastTime = now;
    frame = distance * lag > .18 ? requestAnimationFrame(paint) : 0;
  }

  function move(event) {
    if (event.pointerType !== 'mouse' || event.buttons) return hide();
    targetX = event.clientX;
    targetY = event.clientY;
    if (x === undefined) { x = targetX; y = targetY; }
    const overLink = event.target instanceof Element && event.target.closest('a, button, summary');
    marker.classList.toggle('is-over-link', Boolean(overLink));
    if (!frame) frame = requestAnimationFrame(paint);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(hide, 950);
  }

  function syncPreference() {
    hide();
    if (enabled.matches) document.addEventListener('pointermove', move, {passive:true});
    else document.removeEventListener('pointermove', move);
  }
  enabled.addEventListener('change', syncPreference);
  syncPreference();
  document.documentElement.addEventListener('pointerleave', hide);
  document.addEventListener('pointerdown', hide, {passive:true});
  document.addEventListener('keydown', hide);
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
})();
