(() => {
  const dialog = document.getElementById('research-qa');
  const launcher = document.querySelector('.ask-launch');
  if (!dialog || !launcher || typeof dialog.showModal !== 'function') return;
  const find = s => dialog.querySelector(s);
  const mode = find('.qa-mode'), log = find('.qa-transcript'), form = find('.qa-form');
  const question = find('textarea'), send = find('.qa-send');
  const topics = { research: 'Research directions', publications: 'Publications', projects: 'Projects',
    'awards-news': 'News and awards', teaching: 'Teaching', cv: 'Curriculum vitae', contact: 'Contact' };
  let origin, request, busy = false, history = [];
  if (dialog.dataset.origin) {
    try {
      const u = new URL(dialog.dataset.origin);
      if (u.protocol === 'https:' && u.href === u.origin + '/') origin = u.origin;
    } catch (_) {}
  }
  function turn(visitor, text) {
    const el = document.createElement('div');
    el.className = 'qa-turn' + (visitor ? ' qa-user' : '');
    if (text) { const p = document.createElement('p'); p.textContent = text; el.append(p); }
    log.append(el);
    while (log.childElementCount > 12) log.firstElementChild.remove();
    return el;
  }
  function reveal(el) { el.scrollIntoView({block:'nearest'}); }
  function controls() { send.disabled = busy || !question.value.trim(); }
  function guide(message = 'Homepage guide') { mode.textContent = message; form.hidden = true; }
  async function checkService() {
    if (!origin) return;
    const op = request = new AbortController();
    const timer = setTimeout(() => op.abort(), 5000);
    try {
      const res = await fetch(origin + '/status', {signal:op.signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
      if (res.ok && (await res.json()).available === true && dialog.open && op === request) {
        mode.textContent = 'GPT research assistant'; form.hidden = false; controls();
      }
    } catch (_) { /* Source questions stay available without a service. */ }
    finally { clearTimeout(timer); if (request === op) request = null; }
  }
  launcher.hidden = false;
  launcher.addEventListener('click', () => { guide(); dialog.showModal(); checkService(); });
  find('.qa-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    request?.abort(); request = null; busy = false; history = [];
    log.replaceChildren(); question.value = ''; guide(); controls();
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const b = dialog.getBoundingClientRect();
      if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) dialog.close();
    }
    const option = event.target.closest('button[data-topic]');
    if (option) {
      const template = find('template[data-answer="' + option.dataset.topic + '"]');
      if (!template) return;
      turn(true, option.textContent);
      const answer = turn(false);
      answer.append(template.content.cloneNode(true)); reveal(answer);
    }
    const source = event.target.closest('a[href^="#"]');
    if (source) {
      const dest = document.getElementById(source.hash.slice(1));
      if (dest) {
        dialog.close();
        const heading = dest.querySelector('h1,h2') || dest;
        heading.tabIndex = -1;
        requestAnimationFrame(() => heading.focus({preventScroll:true}));
      }
    }
  });
  question.addEventListener('input', controls);
  question.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = question.value.trim();
    if (!dialog.open || form.hidden || busy || !origin || !text || text.length > 480) return;
    busy = true; question.value = ''; controls();
    turn(true, text);
    const response = turn(false, 'Reading the research profile...'); reveal(response);
    const op = request = new AbortController();
    const timer = setTimeout(() => op.abort(), 35000);
    try {
      const res = await fetch(origin + '/ask', {method:'POST',headers:{'Content-Type':'application/json'},
        credentials:'omit',referrerPolicy:'no-referrer',signal:op.signal,
        body:JSON.stringify({question:text,history:history.slice(-4)})});
      if (!res.ok) throw new Error(res.status === 429 || res.status === 503 ? 'unavailable' : 'request');
      const data = await res.json();
      if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('empty');
      if (op !== request || !dialog.open) return;
      response.firstChild.textContent = data.answer;
      for (const key of new Set(Array.isArray(data.sources) ? data.sources : [])) {
        if (!Object.hasOwn(topics,key)) continue;
        const a = document.createElement('a'); a.href = '#' + key; a.textContent = topics[key]; response.append(a);
      }
      history = history.concat({role:'user',content:text},{role:'assistant',content:data.answer.slice(0,480)}).slice(-4);
    } catch (err) {
      if (op !== request || !dialog.open) return;
      response.firstChild.textContent = 'No AI answer is available. The questions below link to the research profile.';
      if (err.message === 'unavailable') guide('Homepage guide');
    } finally {
      clearTimeout(timer);
      if (request === op) { request = null; busy = false; controls(); reveal(response); }
    }
  });
})();
