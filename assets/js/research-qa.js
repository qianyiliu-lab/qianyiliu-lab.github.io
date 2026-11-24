(() => {
  const dialog = document.getElementById('research-qa');
  const launcher = document.querySelector('.ask-launch');
  if (!dialog || !launcher || typeof dialog.showModal !== 'function') return;
  const find = s => dialog.querySelector(s);
  const mode = find('.qa-mode'), log = find('.qa-transcript'), form = find('.qa-form');
  const suggestions = find('.qa-suggestions');
  const source = find('.qa-source'), privacy = find('#qa-privacy');
  const body = find('.qa-body');
  const question = find('textarea'), send = find('.qa-send'), close = find('.qa-close');
  const desktopInput = window.matchMedia('(min-width: 601px) and (hover: hover) and (pointer: fine)');
  const paperInfo = find('.qa-paper'), paperLink = find('.qa-paper-title'), venue = find('.qa-paper-venue');
  const copyStatus = find('.qa-copy-status'), manualCopy = find('.qa-manual-copy');
  let paper = null;
  const topics = { research: 'Research directions', publications: 'Publications', projects: 'Projects',
    'awards-news': 'News and awards', teaching: 'Teaching', cv: 'Curriculum vitae', contact: 'Contact' };
  let origin, request, busy = false, available = false, live = false, edited = false, history = [];
  const preview = ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
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
  function reveal(el) {
    const viewport = body.getBoundingClientRect(), box = el.getBoundingClientRect();
    if (box.height > body.clientHeight || box.top < viewport.top) body.scrollTop += box.top - viewport.top;
    else if (box.bottom > viewport.bottom) body.scrollTop += box.bottom - viewport.bottom;
  }
  function beginConversation() {
    suggestions.open = false;
    paperInfo.open = false;
    if (body.nextElementSibling === form) return;
    const focus = form.contains(document.activeElement) ? document.activeElement : null;
    body.after(form);
    if (focus) focus.focus({preventScroll:true});
  }
  function controls() { send.disabled = busy || !question.value.trim(); source.disabled = busy; }
  function setSource(useAI = false) {
    live = available && useAI;
    source.hidden = !available; mode.hidden = available;
    source.value = live ? 'ai' : 'local';
    privacy.textContent = live
      ? 'Messages and any selected paper reference go to OpenAI and may be retained for abuse monitoring. Please omit personal information.'
      : 'Searches this homepage on your device. No AI request is sent.';
    question.placeholder = live ? (paper ? 'Ask about this paper...' : 'Ask about a paper, method, or project...')
      : (paper ? 'Search this paper\'s record...' : 'Search papers, projects, or topics...');
    controls();
  }
  source.addEventListener('change', () => { history = []; setSource(source.value === 'ai'); });
  // Search the public records already rendered by Jekyll, not a second copy of the CV.
  const content = (el, selector) => el?.querySelector(selector)?.textContent.trim() || '';
  let catalogue;
  function entries() {
    if (catalogue) return catalogue;
    const list = [], add = (anchor,title,summary,tags='') => {
      if (anchor && title && summary) list.push({anchor,title,summary,tags});
    };
    for (const el of document.querySelectorAll('.paper[id]')) {
      add(el.id, content(el,'h4'), content(el,'.paper-takeaway') || content(el,'.journal'),
        'paper publication article doi authors '+content(el,'.authors')+' '+content(el,'.journal')+' '+(el.querySelector('h4 a')?.href || ''));
    }
    for (const el of document.querySelectorAll('#projects .project, #research article')) {
      const project = el.classList.contains('project');
      add(el.id || 'research',content(el,'h3'),content(el,project?'div > p':'p'),
        project ? 'project '+content(el,'.meta')+' '+content(el,'details') : 'research directions');
    }
    const section = (id, title, selector, tags) => add(id,title,content(document.getElementById(id),selector),tags);
    section('biography','Research overview','.bio-lead','research study studies hazards geohazards background');
    section('contact','Contact','.email','contact email reach touch address collaboration');
    for (const news of document.querySelectorAll('.news li')) {
      const summary = Array.from(news.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim();
      add('awards-news','News and awards',summary,'news');
    }
    for (const course of document.querySelectorAll('#teaching .course')) {
      add('teaching',content(course,'h3'),content(course,'p'),'teaching assistant courses TA');
    }
    section('cv','Curriculum vitae','p','resume CV education degree');
    return catalogue = list;
  }
  const aliases = [
    [/滑坡/g,' landslide '],[/洪水|洪涝/g,' flood '],[/火灾/g,' fire '],[/遥感/g,' remote sensing '],
    [/研究/g,' research '],[/论文/g,' paper '],[/项目/g,' project '],[/作者/g,' authors '],
    [/联系|邮箱/g,' contact '],[/奖项|获奖|海报/g,' awards poster '],[/教学|助教/g,' teaching '],[/简历/g,' cv ']
  ];
  const skip = new Set('a an and are about by can could describe did do does for from how i in is it liu me my of on or qianyi tell that the their there these this to uses was what where which who with would you your'.split(' '));
  const words = s => (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(w=>!skip.has(w))
    .map(w=>w.length>4 && w.endsWith('s') ? w.slice(0,-1) : w);
  function localAnswer(el,text) {
    const para = str => { const p=document.createElement('p'); p.textContent=str; el.append(p); };
    const link = item => { const a=document.createElement('a'); a.href='#'+item.anchor; a.textContent=item.title; el.append(a); };
    const query = aliases.reduce((s,[pattern,word])=>s.replace(pattern,word),text.toLowerCase());
    const keys = [...new Set(words(query))];
    const ranked = entries().filter(item=>!paper || item.anchor===paper.id).map(item=>{
      const title = new Set(words(item.title)), tags = new Set(words(item.tags)), bodyText = new Set(words(item.summary));
      const score=keys.reduce((n,k)=>n+(title.has(k)?4:0)+(tags.has(k)?2:0)+(bodyText.has(k)?1:0),0);
      return {item,score};
    }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score);
    const authors = /\b(authors?|wrote|written|coauthors?)\b/.test(query);
    const record = paper && entries().find(item=>item.anchor===paper.id);
    if (record && (authors || ranked.length || /\b(summary|summarize|results?|findings?|subject|year|venue|published)\b|摘要|总结|结论|发表/.test(query))) {
      para(authors ? paper.authors : /\b(year|venue|published)\b|发表/.test(query) ? paper.venue : record.summary);
      link(record);
    } else if (ranked.length) {
      for (const {item} of ranked.slice(0,2)) {
        para((authors && content(document.getElementById(item.anchor),'.authors')) || item.summary); link(item);
      }
    } else {
      para(paper ? 'No matching detail in this paper\'s homepage record.' : 'No matching homepage entry. Try a topic such as landslides, remote sensing, or teaching.');
      if (record) link(record);
    }
  }
  async function checkService() {
    if (!origin || preview) {
      privacy.textContent = preview ? 'Local preview: questions search this homepage on your device.' : 'Live AI is unavailable. Questions search this homepage on your device.';
      return;
    }
    const op = request = new AbortController();
    const timer = setTimeout(() => op.abort(), 5000);
    try {
      const res = await fetch(origin + '/status', {signal:op.signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
      if (res.ok && (await res.json()).available === true && dialog.open && op === request) {
        available = true;
        // A slow status check must not silently change the destination of a local draft.
        setSource(!edited && !log.childElementCount && !question.value);
      }
    } catch (_) { /* Source questions stay available without a service. */ }
    finally {
      clearTimeout(timer);
      if (request === op) {
        request = null;
        if (!available && dialog.open) privacy.textContent = 'Live AI is unavailable. Questions search this homepage on your device.';
      }
    }
  }
  function openPanel(record) {
    paper = record;
    available = edited = false; setSource(); paperInfo.hidden = !paper; paperInfo.open = Boolean(paper);
    suggestions.hidden = Boolean(paper); suggestions.open = !paper;
    find('#qa-title').textContent = paper ? 'Paper Q&A' : 'Research Q&A';
    if (paper) {
      paperLink.textContent = paper.title; paperLink.href = paper.doi;
      venue.textContent = paper.venue; find('.qa-paper-authors').textContent = paper.authors;
      find('.qa-record').href = '#' + paper.id;
    }
    dialog.showModal();
    if (desktopInput.matches) question.focus({preventScroll:true});
    checkService();
  }
  launcher.hidden = false;
  launcher.addEventListener('click', () => openPanel(null));
  for (const trigger of document.querySelectorAll('.paper-ask')) {
    const article = trigger.closest('.paper'), title = article?.querySelector('h4 a');
    if (!article?.id || !title || !title.href.startsWith('https://doi.org/')) continue;
    const record = {id:article.id, title:title.textContent.trim(), doi:title.href,
      authors:article.querySelector('.authors').textContent.trim(), venue:article.querySelector('.journal').textContent.trim()};
    trigger.hidden = false;
    trigger.addEventListener('click', () => openPanel(record));
  }
  find('.qa-copy').addEventListener('click', async () => {
    const record = paper;
    if (!record) return;
    const citation = [record.authors, record.title, record.venue.replace(/\s*\u00b7\s*/, ', ')].map(s=>s.replace(/[.]$/, '')+'.').join(' ')+' '+record.doi;
    try {
      await navigator.clipboard.writeText(citation);
      if (dialog.open && paper === record) copyStatus.textContent = 'Citation copied.';
    } catch {
      if (!dialog.open || paper !== record) return;
      manualCopy.value = citation; manualCopy.hidden = false; manualCopy.select();
      copyStatus.textContent = 'Citation selected for copying.';
    }
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    request?.abort(); request = null; busy = false; history = [];
    log.replaceChildren(); question.value = ''; available = edited = false; setSource();
    body.before(form); body.scrollTop = 0;
    paper = null; copyStatus.textContent = ''; manualCopy.hidden = true; manualCopy.value = '';
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
      beginConversation();
      suggestions.querySelector('summary').focus({preventScroll:true});
      turn(true, option.querySelector('.qa-prompt').textContent);
      const answer = turn(false);
      answer.append(template.content.cloneNode(true)); reveal(answer);
    }
    const source = event.target.closest('a[href^="#"]');
    if (source) {
      const dest = document.getElementById(source.hash.slice(1));
      if (dest) {
        dialog.close();
        const heading = dest.querySelector('h1,h2,h3,h4') || dest;
        heading.tabIndex = -1;
        requestAnimationFrame(() => heading.focus({preventScroll:true}));
      }
    }
  });
  question.addEventListener('input', () => { edited = true; controls(); });
  question.addEventListener('compositionstart', () => { edited = true; });
  question.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = question.value.trim();
    if (!dialog.open || busy || !text || text.length > 480) return;
    beginConversation();
    busy = true; question.value = ''; controls();
    turn(true, text);
    if (!live) {
      const result = turn(false);
      localAnswer(result, text);
      busy = false; controls(); reveal(result);
      return;
    }
    const response = turn(false, 'Reading the research profile...'); reveal(response);
    const op = request = new AbortController();
    const timer = setTimeout(() => op.abort(), 35000);
    try {
      const context = paper ? [{role:'user',content:'Selected homepage publication: '+paper.title+' ('+paper.venue+'). DOI: '+paper.doi}] : [];
      const res = await fetch(origin + '/ask', {method:'POST',headers:{'Content-Type':'application/json'},
        credentials:'omit',referrerPolicy:'no-referrer',signal:op.signal,
        body:JSON.stringify({question:text,history:context.concat(history.slice(-4))})});
      if (!res.ok) throw new Error(res.status === 429 || res.status === 503 ? 'unavailable' : 'request');
      const data = await res.json();
      if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('empty');
      if (op !== request || !dialog.open) return;
      response.firstChild.textContent = data.answer;
      const sources = document.createElement('div'); sources.className = 'qa-sources';
      for (const key of new Set(Array.isArray(data.sources) ? data.sources : [])) {
        if (!Object.hasOwn(topics,key)) continue;
        const a = document.createElement('a'); a.href = '#' + key; a.textContent = topics[key]; sources.append(a);
      }
      if (sources.childElementCount) {
        const label = document.createElement('span'); label.textContent = 'Sources';
        sources.prepend(label); response.append(sources);
      }
      history = history.concat({role:'user',content:text},{role:'assistant',content:data.answer.slice(0,480)}).slice(-4);
    } catch (err) {
      if (op !== request || !dialog.open) return;
      response.firstChild.textContent = 'No AI answer is available right now. Results from this homepage:';
      available = false; history = []; setSource(); localAnswer(response, text);
    } finally {
      clearTimeout(timer);
      if (request === op) { request = null; busy = false; controls(); reveal(response); }
    }
  });
})();
