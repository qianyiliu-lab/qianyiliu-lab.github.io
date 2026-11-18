(() => {
  const papers = document.querySelector('#publications'), viewer = papers?.querySelector('.figure-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;
  const stage = viewer.querySelector('.figure-canvas'), img = stage.querySelector('img');
  const zoom = viewer.querySelector('[data-zoom]'), close = viewer.querySelector('[data-close]');
  let opener;

  function size(actual) {
    stage.classList.toggle('actual',actual);
    zoom.setAttribute('aria-pressed',String(actual));
    zoom.title = actual ? 'Fit to window' : 'Show actual size';
    zoom.setAttribute('aria-label',zoom.title);
    stage.scrollTo(0,0);
  }
  for (const link of papers.querySelectorAll('.paper-original')) link.setAttribute('aria-haspopup','dialog');
  papers.addEventListener('click',e => {
    const link = e.target.closest('.paper-original');
    if (!link || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const figure = link.closest('figure'), record = link.closest('article');
    const thumbnail = link.querySelector('img');
    e.preventDefault(); opener = link;
    viewer.querySelector('#figure-heading').textContent = link.querySelector('strong')?.textContent || 'Publication figure';
    viewer.querySelector('[data-figure-venue]').textContent = record.querySelector('.journal').textContent;
    viewer.querySelector('[data-figure-caption]').textContent = figure.querySelector('figcaption p')?.textContent || '';
    viewer.querySelector('[data-figure-file]').href = link.href;
    img.alt = thumbnail.alt; img.src = link.href; size(false);
    viewer.showModal();
  });
  zoom.addEventListener('click',() => { size(!stage.classList.contains('actual')); stage.focus(); });
  close.addEventListener('click',() => viewer.close());
  viewer.addEventListener('click',e => { if (e.target === viewer) viewer.close(); });
  viewer.addEventListener('close',() => { img.removeAttribute('src'); opener?.focus({preventScroll:true}); });
})();
