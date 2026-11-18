(() => {
  const papers = document.querySelector('#publications'), viewer = papers?.querySelector('.figure-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;
  const stage = viewer.querySelector('.figure-canvas'), img = stage.querySelector('img');
  const zoom = viewer.querySelector('[data-zoom]'), close = viewer.querySelector('[data-close]');
  const caption = viewer.querySelector('[data-figure-caption]');
  caption.setAttribute('aria-live', 'polite');
  let opener, figureCaption;

  function size(actual, x = .5, y = .5) {
    stage.classList.toggle('actual', actual);
    zoom.setAttribute('aria-pressed', String(actual));
    zoom.title = actual ? 'Fit to window' : 'Show actual size';
    zoom.setAttribute('aria-label', zoom.title);
    // Measure after switching sizes so scrollbars are included; the browser clamps at the edges.
    stage.scrollTo(actual ? x * img.clientWidth - stage.clientWidth / 2 : 0,
                   actual ? y * img.clientHeight - stage.clientHeight / 2 : 0);
  }
  img.addEventListener('load', () => {
    if (viewer.open && img.complete && img.naturalWidth) zoom.disabled = false;
  });
  img.addEventListener('error', () => {
    if (!viewer.open || !img.complete || img.naturalWidth) return;
    zoom.disabled = true;
    stage.hidden = true;
    caption.textContent = ('The original image could not be loaded. ' + figureCaption).trim();
  });
  for (const link of papers.querySelectorAll('.paper-original')) {
    link.setAttribute('aria-haspopup','dialog');
    link.setAttribute('aria-controls',viewer.id);
  }
  papers.addEventListener('click',e => {
    const link = e.target.closest('.paper-original');
    if (!link || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const figure = link.closest('figure'), record = link.closest('article');
    const thumbnail = link.querySelector('img');
    e.preventDefault();
    opener?.removeAttribute('data-inspected');
    opener = link;
    opener.setAttribute('data-inspected', '');
    viewer.querySelector('#figure-heading').textContent = link.querySelector('strong')?.textContent || 'Publication figure';
    viewer.querySelector('[data-figure-venue]').textContent = record.querySelector('.journal').textContent;
    figureCaption = figure.querySelector('figcaption p')?.textContent || '';
    caption.textContent = figureCaption;
    viewer.querySelector('[data-figure-file]').href = link.href;
    stage.hidden = false;
    zoom.disabled = true;
    size(false);
    img.alt = thumbnail.alt;
    viewer.showModal();
    img.src = link.href;
  });
  img.addEventListener('click', e => {
    if (zoom.disabled) return;
    const box = img.getBoundingClientRect();
    size(!stage.classList.contains('actual'), (e.clientX - box.left) / box.width,
         (e.clientY - box.top) / box.height);
    stage.focus({preventScroll: true});
  });
  zoom.addEventListener('click', () => {
    size(!stage.classList.contains('actual'));
    stage.focus({preventScroll: true});
  });
  close.addEventListener('click',() => viewer.close());
  viewer.addEventListener('click',e => { if (e.target === viewer) viewer.close(); });
  viewer.addEventListener('close', () => {
    if (viewer.open) return;
    img.removeAttribute('src');
    opener?.focus({preventScroll: true});
  });
})();
