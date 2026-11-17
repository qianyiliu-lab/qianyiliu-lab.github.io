(() => {
  const terrain = document.querySelector('.intro-terrain');
  if (!terrain) return;

  const enabled = matchMedia('(min-width: 700px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const paths = Array.from(terrain.querySelectorAll('.terrain-contour'));
  const outline = paths[0].getAttribute('d');
  let rings;
  let frame = 0;
  let strength = 0;
  let targetStrength = 0;
  let x = 0, y = 0, targetX = 0, targetY = 0;

  // All elevations share a silhouette. Sample it once in its native coordinates.
  function sampleRings() {
    const length = paths[0].getTotalLength();
    const points = Array.from({length: 100}, (_, i) => paths[0].getPointAtLength(length * i / 100));
    return paths.map(path => {
      const matrix = path.parentNode.transform.baseVal.consolidate().matrix;
      return {
        path,
        scale: matrix.d,
        points: points.map(p => ({local: p, projected: p.matrixTransform(matrix)}))
      };
    });
  }

  function reset() {
    cancelAnimationFrame(frame);
    frame = strength = targetStrength = 0;
    if (rings) paths.forEach(path => path.setAttribute('d', outline));
  }

  function draw() {
    frame = 0;
    x += (targetX - x) * 0.28;
    y += (targetY - y) * 0.28;
    strength += (targetStrength - strength) * 0.2;
    if (!targetStrength && strength < 0.006) return reset();

    for (const ring of rings) {
      const points = ring.points.map(({local, projected}) => {
        const dx = projected.x - x, dy = projected.y - y;
        const lift = 23 * strength * Math.exp(-(dx * dx + dy * dy) / 1800);
        return local.x.toFixed(2) + ',' + (local.y - lift / ring.scale).toFixed(2);
      });
      ring.path.setAttribute('d', 'M' + points.join(' ') + 'Z');
    }
    if (Math.abs(strength - targetStrength) > 0.004 || Math.abs(targetX - x) + Math.abs(targetY - y) > 0.15) {
      frame = requestAnimationFrame(draw);
    }
  }

  terrain.addEventListener('pointermove', event => {
    if (!enabled.matches || event.pointerType !== 'mouse') return;
    const matrix = terrain.getScreenCTM();
    if (!matrix) return;
    if (!rings) rings = sampleRings();
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    targetX = point.x;
    targetY = point.y;
    if (!strength) { x = targetX; y = targetY; }
    targetStrength = 1;
    if (!frame) frame = requestAnimationFrame(draw);
  });
  terrain.addEventListener('pointerleave', () => {
    targetStrength = 0;
    if (strength && !frame) frame = requestAnimationFrame(draw);
  });
  enabled.addEventListener('change', reset);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
})();
