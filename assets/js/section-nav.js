(() => {
  const nav = document.querySelector('.nav-row'), menu = nav?.querySelector('.mobile-nav');
  if (!menu) return;
  const summary = menu.querySelector('summary');
  document.addEventListener('click', event => {
    if (menu.open && (!menu.contains(event.target) || event.target.closest('a'))) menu.open = false;
  });
  menu.addEventListener('focusout', event => {
    if (event.relatedTarget && !menu.contains(event.relatedTarget)) menu.open = false;
  });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) { menu.open = false; summary.focus(); }
  });
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const entries = [...new Set(links.map(a => a.hash.slice(1)))].map(id => document.getElementById(id)).filter(Boolean);
  let current, points = [], frame = 0;
  function update() {
    frame = 0;
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const y = scrollY + pad + 2, end = document.documentElement.scrollHeight - innerHeight;
    const hash = document.getElementById(location.hash.slice(1));
    let best = points[0];
    for (const p of points) {
      // The biography/news and teaching/CV pairs can start on the same row.
      if (p.y <= y && p.y > best.y + 1) best = p;
    }
    if (scrollY >= end-2 && end>0) best = points[points.length-1];
    if (hash) {
      const target = points.find(p=>p.el.contains(hash));
      const targetY = hash.getBoundingClientRect().top + scrollY;
      if (target && Math.abs(scrollY-Math.min(end,Math.max(0,targetY-pad)))<4) best = target;
    }
    if (!best || current===best.el.id) return;
    current = best.el.id;
    for (const a of links) {
      if (a.hash === '#'+current) a.setAttribute('aria-current','location');
      else a.removeAttribute('aria-current');
    }
  }
  function queue() { if (!frame) frame = requestAnimationFrame(update); }
  function measure() {
    points = entries.map(el=>({el,y:Math.round(el.getBoundingClientRect().top+scrollY)})).sort((a,b)=>a.y-b.y);
    queue();
  }
  measure();
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.querySelector('main'));
  window.addEventListener('resize',() => { if (!summary.getClientRects().length) menu.open = false; measure(); });
  window.addEventListener('scroll',queue,{passive:true});
  window.addEventListener('hashchange',queue);
  window.addEventListener('pageshow',measure);
})();
