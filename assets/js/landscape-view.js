(() => {
  const hero = document.querySelector('.estuary'), controls = hero?.querySelector('.view-switch');
  if (!controls) return;
  const map = hero.querySelector('.relief-image'), photo = hero.querySelector('picture img');
  const status = hero.querySelector('[data-view-status]'), scale = hero.querySelector('.view-scale');
  const coord = hero.querySelector('[data-coordinate]'), play = controls.querySelector('.view-play');
  const bounds = JSON.parse(map.dataset.bounds), motion = matchMedia('(prefers-reduced-motion: reduce)');
  const dwell = 7000;
  let playing = !motion.matches && !navigator.connection?.saveData, visible = false, timer, selection = 0;

  function position(fx,fy) {
    const lat = bounds.north - fy * (bounds.north-bounds.south);
    const lon = bounds.west + fx * (bounds.east-bounds.west);
    const label = lat.toFixed(3)+'\u00b0 N  '+Math.abs(lon).toFixed(3)+'\u00b0 W';
    if (coord.textContent !== label) coord.textContent = label;
  }
  function dimensions() {
    // Both rasters share one 1920 x 1080 grid, 10 m per original pixel.
    const box = photo.getBoundingClientRect(), k = Math.max(box.width/1920,box.height/1080);
    return {box,k};
  }
  function sample(event) {
    if (event.target.closest('a,button,.view-strip') || (event.pointerType==='touch' && event.type==='pointermove')) return;
    const {box,k} = dimensions();
    position(.5+(event.clientX-box.left-box.width/2)/(1920*k), .5+(event.clientY-box.top-box.height/2)/(1080*k));
  }
  new ResizeObserver(() => scale.style.setProperty('--km',100*dimensions().k+'px')).observe(hero);
  hero.addEventListener('pointermove',sample,{passive:true});
  hero.addEventListener('pointerup',sample,{passive:true});
  hero.addEventListener('pointerleave',() => position(.5,.5));

  function playback() {
    const label = playing ? 'Pause layer comparison' : 'Play layer comparison';
    play.title = label; play.setAttribute('aria-label',label);
    play.querySelector('[data-play-icon]').hidden = playing;
    play.querySelector('[data-pause-icon]').hidden = !playing;
    play.hidden = motion.matches;
    clearTimeout(timer);
    if (playing && visible && !document.hidden) timer = setTimeout(async () => {
      if (!document.querySelector('dialog[open]')) {
        await select(hero.dataset.view === 'satellite' ? 'terrain' : 'satellite',false);
      }
      playback();
    },dwell);
  }
  async function select(view,announce) {
    const current = ++selection, terrain = view === 'terrain';
    if (terrain && map.hidden) {
      if (!map.hasAttribute('src')) map.src = map.dataset.src;
      try { await map.decode(); }
      catch {
        if (current === selection) {
          playing = false; playback(); map.removeAttribute('src');
          status.textContent = 'Terrain unavailable. The satellite image is still visible.';
        }
        return;
      }
      if (current !== selection || (!announce && (!playing || !visible || document.hidden))) return;
      map.hidden = false;
      map.getBoundingClientRect(); // Establish zero opacity before the first dissolve.
    }
    hero.dataset.view = view;
    photo.setAttribute('aria-hidden',String(terrain)); map.setAttribute('aria-hidden',String(!terrain));
    for (const b of controls.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed',String(b.dataset.view===view));
    for (const a of hero.querySelectorAll('[data-credit]')) a.hidden = a.dataset.credit !== view;
    if (announce) status.textContent = terrain ? 'Shaded relief with 100 metre contours.' : 'Sentinel-2 satellite image, 19 July 2024.';
    hero.dispatchEvent(new Event('landscapechange'));
  }
  controls.addEventListener('click',e => {
    const b = e.target.closest('button');
    if (!b) return;
    ++selection;
    if (b === play) { playing = !playing; playback(); return; }
    playing = false; playback(); select(b.dataset.view,true);
  });
  hero.addEventListener('focusin',e => {
    if (e.target !== play && e.target.matches(':focus-visible')) { playing = false; ++selection; playback(); }
  });
  motion.addEventListener('change',() => { playing = false; ++selection; playback(); });
  document.addEventListener('visibilitychange',playback);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; playback(); },
    {threshold:0.15}).observe(hero);
  scale.hidden = false; controls.hidden = false; playback();
})();
