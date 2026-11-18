(() => {
  const hero = document.querySelector('.estuary'), controls = hero?.querySelector('.view-switch');
  if (!controls) return;
  const map = hero.querySelector('.relief-image'), photo = hero.querySelector('picture');
  const status = hero.querySelector('[data-view-status]');
  const scale = hero.querySelector('.view-scale');
  const coord = hero.querySelector('[data-coordinate]'), originalText = coord.textContent, originalTitle = coord.title;
  const bounds = JSON.parse(map.dataset.bounds);
  let selection = 0;
  function position(fx,fy,label) {
    const lat = bounds.north - fy*(bounds.north-bounds.south);
    const lon = bounds.west + fx*(bounds.east-bounds.west);
    const text = label+'  '+lat.toFixed(3)+'\u00b0 N  '+Math.abs(lon).toFixed(3)+'\u00b0 W';
    if (coord.textContent !== text) coord.textContent = text;
    coord.title = 'Approximate NAD83 map coordinate';
  }
  function sample(event) {
    if (map.hidden || event.target.closest('a,button,.view-strip') || event.pointerType==='touch' && event.type==='pointermove') return;
    const r = map.getBoundingClientRect(), k = Math.max(r.width/map.naturalWidth,r.height/map.naturalHeight);
    const w = k*map.naturalWidth, h = k*map.naturalHeight;
    const [px,py] = getComputedStyle(map).objectPosition.split(' ').map(s=>parseFloat(s)/100);
    position((event.clientX-r.left-(r.width-w)*px)/w,(event.clientY-r.top-(r.height-h)*py)/h,'Point');
  }
  function updateScale() {
    if (map.hidden) return;
    const r = map.getBoundingClientRect();
    // The projected raster grid has ten metres per source pixel.
    const length = 100 * Math.max(r.width/map.naturalWidth,r.height/map.naturalHeight);
    scale.style.setProperty('--km',length.toFixed(2)+'px');
  }
  new ResizeObserver(updateScale).observe(hero);
  hero.addEventListener('pointermove', sample, {passive:true});
  hero.addEventListener('pointerup', sample, {passive:true});
  hero.addEventListener('pointerleave', () => { if (!map.hidden) position(.5,.5,'Centre'); });
  controls.hidden = false;
  controls.addEventListener('click', async event => {
    const button = event.target.closest('button[data-view]');
    if (!button) return;
    const current = ++selection, terrain = button.dataset.view === 'terrain';
    if (terrain && map.hidden) {
      status.textContent = 'Loading terrain.';
      if (!map.hasAttribute('src')) map.src = map.dataset.src;
      try { await map.decode(); }
      catch {
        if (selection === current) {
          map.removeAttribute('src');
          status.textContent = 'Terrain unavailable. The photograph is still visible.';
        }
        return;
      }
    }
    if (selection !== current) return;
    map.hidden = !terrain; photo.hidden = terrain; scale.hidden = !terrain;
    hero.dataset.view = button.dataset.view;
    updateScale();
    if (terrain) position(.5,.5,'Centre');
    else { coord.textContent = originalText; coord.title = originalTitle; }
    for (const b of controls.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b === button));
    for (const a of hero.querySelectorAll('[data-credit]')) a.hidden = a.dataset.credit !== button.dataset.view;
    status.textContent = terrain ? 'Terrain shown. North up, 100 metre contours.' : 'Photograph shown.';
    hero.dispatchEvent(new Event('landscapechange'));
  });
})();
