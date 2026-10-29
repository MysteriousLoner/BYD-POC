(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const { normalize, comparison } = CatalogueData;
  const storageKey = 'byd-comparison';
  let models = [], selected = [], announcementTimer;
  try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (Array.isArray(saved)) selected = [...new Set(saved.filter(v => typeof v === 'string'))].slice(0, 2); } catch {}
  async function api(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Please try again in a moment.');
    return data;
  }
  function announce(message) { $('#siteAnnouncement').textContent = message; clearTimeout(announcementTimer); announcementTimer = setTimeout(() => $('#siteAnnouncement').textContent = '', 5000); }
  function saveSelection() {
    try { localStorage.setItem(storageKey, JSON.stringify(selected)); } catch {}
  }
  function swatches(model) {
    return model.colours.length ? `<div class="model-colours" role="group" aria-label="${escape(model.name)} exterior colour">${model.colours.map((colour, index) => `<button type="button" class="swatch" style="--swatch:${/^#[0-9a-f]{6}$/i.test(colour.swatch) ? colour.swatch : '#cccccc'}" data-colour="${index}" aria-label="${escape(colour.name)}" aria-pressed="${index === 0}"></button>`).join('')}<span class="colour-label">${escape(model.colours[0].name)}</span></div>` : '';
  }
  function imageFor(model) { return model.colours[0]?.images[0] || model.images[0] || '/assets/placeholder.svg'; }
  function modelCard(model) {
    const facts = model.specifications.filter(spec => spec.value).slice(0, 2);
    return `<article class="model-card" data-car="${escape(model.id)}"><a class="car-photo" href="/models/${encodeURIComponent(model.id)}" aria-label="Explore ${escape(model.name)}"><img src="${escape(imageFor(model))}" alt="${escape(model.name + (model.colours[0] ? ' in ' + model.colours[0].name : ''))}" width="720" height="400" loading="lazy">${model.badge ? `<span class="model-badge">${escape(model.badge)}</span>` : ''}</a><div class="model-card-content"><div class="model-card-top"><div><h3><a href="/models/${encodeURIComponent(model.id)}">${escape(model.name)}</a></h3><p class="model-type">${escape(model.type)}</p></div><p class="model-price">${escape(model.price)}</p></div>${swatches(model)}${facts.length ? `<div class="model-facts">${facts.map(spec => `<div><small>${escape(spec.label)}</small>${escape([spec.value, spec.unit].filter(Boolean).join(' '))}</div>`).join('')}</div>` : '<p class="model-type">Explore this vehicle’s details.</p>'}<div class="model-actions"><a class="text-link" href="/models/${encodeURIComponent(model.id)}">Explore model <span aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a></div></div></article>`;
  }
  function bindColours(container, model, change) {
    container.querySelectorAll('[data-colour]').forEach(button => button.onclick = () => {
      const colour = model.colours[Number(button.dataset.colour)];
      container.querySelectorAll('[data-colour]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      container.querySelector('.colour-label').textContent = colour.name;
      change(colour);
    });
  }
  function bindImages(container) {
    container.querySelectorAll('img').forEach(img => {
      const fallback = () => { img.onerror = null; img.src = '/assets/placeholder.svg'; img.classList.add('image-unavailable'); img.alt = 'Image unavailable. Vehicle information is still available below.'; };
      img.onerror = fallback;
      if (img.complete && !img.naturalWidth) fallback();
    });
  }
  async function loadModels() {
    models = (await api('/api/content/models')).map(normalize);
    selected = selected.filter(id => models.some(model => model.id === id)); saveSelection();
    return models;
  }
  function showroomPhoto(model) {
    return model.images[0] || model.colours[0]?.images[0] || '';
  }
  function renderHome(entries) {
    const featured = $('#featuredGrid');
    if (!featured) return;
    const model = entries[0];
    if (model) {
      const about = $('.about-photo');
      const aboutSrc = showroomPhoto(model);
      if (about && aboutSrc) { const photo = document.createElement('img'); photo.src = aboutSrc; photo.alt = model.name; photo.loading = 'lazy'; photo.onerror = () => { about.hidden = true; }; about.append(photo); about.hidden = false; }
    }
    featured.innerHTML = entries.slice(0,3).map(item => `<a class="featured-card" href="/models/${encodeURIComponent(item.id)}"><img src="${escape(showroomPhoto(item) || '/assets/placeholder.svg')}" alt="" loading="lazy"><span class="featured-card-title">${escape(item.name)}<span aria-hidden="true">→</span></span></a>`).join('');
    if (!entries.length) featured.innerHTML = '<p class="empty-state">Our line-up is being updated. Please contact our team for current availability.</p>';
    bindImages(featured);
  }
  async function catalogue() {
    try {
      await loadModels();
      if (location.pathname === '/' || location.pathname === '/index.html') { renderHome(models); return; }
      $('#modelsGrid').classList.toggle('single-model', models.length === 1); $('#modelsGrid').classList.toggle('two-models', models.length === 2);
      $('#modelsGrid').innerHTML = models.length ? models.slice(0, location.pathname === '/' ? 3 : models.length).map(modelCard).join('') : '<p class="empty-state">Our line-up is being updated. Please contact our team for current availability.</p>';
      $('#modelsGrid').querySelectorAll('[data-car]').forEach(card => {
        const model = models.find(m => m.id === card.dataset.car);
        bindColours(card, model, colour => { const img = card.querySelector('img'); img.src = colour.images[0]; img.alt = `${model.name} in ${colour.name}`; });
      });
      bindImages($('#modelsGrid'));
      const select = $('#enquiryModel');
      if (!select) return;
      select.innerHTML = '<option value="">Choose a model</option>' + models.map(model => `<option value="${escape(model.name)}">${escape(model.name)}</option>`).join('');
      const requested = new URLSearchParams(location.search).get('model'), model = models.find(m => m.id === requested);
      if (model) select.value = model.name;
    } catch {
      const grid = $('#modelsGrid') || $('#featuredGrid');
      grid.innerHTML = '<div class="empty-state"><p>We couldn’t load the models. Please try again.</p><button class="button secondary" id="retryModels">Reload models</button></div>';
      $('#retryModels').onclick = catalogue;
    }
  }
  function scrollMotion() {
    const stage = $('.showroom-hero'), background = $('#heroBackground');
    if (!stage || !background || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let pending = false;
    function update() { pending = false; const rect = stage.getBoundingClientRect(); const distance = Math.max(0, Math.min(rect.height, -rect.top)); background.style.setProperty('--hero-shift', `${Math.round(Math.min(16, distance * .025))}px`); }
    window.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, {passive:true});
    update();
  }
  function eventCard(item) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? new Date(item.date + 'T12:00:00+08:00').toLocaleDateString('en-MY', { day:'numeric', month:'short', year:'numeric', timeZone:'Asia/Kuala_Lumpur' }) : item.date;
    return `<article class="event-card"><img src="${escape(item.image || '/assets/placeholder.svg')}" alt="${escape(item.title)}" loading="lazy" width="640" height="360"><div class="event-copy"><div class="event-meta"><span>${escape(item.category)}</span><time datetime="${escape(item.date)}">${escape(date)}</time></div><h3>${escape(item.title)}</h3><p>${escape(item.summary)}</p></div></article>`;
  }
  async function news(isPage = false) {
    const grid = $('#newsGrid');
    try {
      const items = (await api('/api/content/news')).sort((a,b) => String(b.date).localeCompare(String(a.date)));
      const render = category => { const filtered = items.filter(item => !category || item.category === category); grid.innerHTML = (isPage ? filtered : filtered.slice(0,3)).map(eventCard).join('') || '<p class="empty-state">No stories here yet. Check back soon.</p>'; bindImages(grid); };
      render('');
      if (isPage) document.querySelectorAll('[data-category]').forEach(button => button.onclick = () => { document.querySelectorAll('[data-category]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); render(button.dataset.category); });
    } catch { grid.innerHTML = '<div class="empty-state"><p>News & events couldn’t load. Please try again.</p><button class="button secondary" id="retryNews">Reload stories</button></div>'; $('#retryNews').onclick = () => news(isPage); }
  }
  async function branches() {
    const selects = [...document.querySelectorAll('.branch-select')], previous = selects.map(select => select.value);
    try {
      const entries = await api('/api/content/branches');
      selects.forEach((select, index) => {
        select.innerHTML = `<option value="">${entries.length ? 'Choose a branch' : 'No branches available'}</option>` + entries.map(branch => `<option value="${escape(branch.id)}">${escape(branch.name)}</option>`).join('');
        select.disabled = !entries.length;
        if (entries.some(b => b.id === previous[index])) select.value = previous[index];
        select.closest('form').querySelector('button[type=submit]').disabled = !entries.length;
        if (!entries.length) select.closest('form').querySelector('.form-status').textContent = 'Our branches are being updated. Please check back soon.';
      });
    } catch {
      selects.forEach(select => {
        select.disabled = true; select.innerHTML = '<option value="">Branches unavailable</option>';
        select.closest('form').querySelector('button[type=submit]').disabled = true;
        const status = select.closest('form').querySelector('.form-status');
        status.innerHTML = 'We couldn’t load branches. <button type="button" class="text-link retry-branches">Retry branches</button>';
        status.querySelector('button').onclick = () => { status.textContent = ''; branches(); };
      });
    }
  }
  function forms() {
    document.querySelectorAll('.public-form').forEach(form => form.onsubmit = async event => {
      event.preventDefault();
      const status = form.querySelector('.form-status'), button = form.querySelector('button[type=submit]'), multipart = form.enctype === 'multipart/form-data';
      const file = form.elements.resume?.files[0];
      if (file && file.size > 8 * 1024 * 1024) { status.textContent = 'Your résumé is larger than 8 MB. Please choose a smaller file.'; status.className = 'form-status error'; return; }
      button.disabled = true; status.textContent = 'Sending…'; status.className = 'form-status';
      try {
        const formData = new FormData(form), response = await fetch('/api/content/' + (multipart ? 'careers' : 'enquiries'), { method:'POST', headers: multipart ? {} : { 'Content-Type':'application/json' }, body:multipart ? formData : JSON.stringify(Object.fromEntries(formData)), signal:AbortSignal.timeout(20000) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'We couldn’t submit this. Please try again.');
        form.reset(); status.className = 'form-status success'; status.textContent = multipart ? 'Application received. Thank you for your interest in joining our team.' : 'Enquiry received. Your preferred branch will be in touch.';
      } catch (error) {
        status.className = 'form-status error'; status.textContent = error.name === 'TimeoutError' ? 'The request timed out. Your details are still here; please try again.' : error.message;
        if (multipart && /branch/i.test(error.message)) branches();
      } finally { button.disabled = form.querySelector('.branch-select').disabled; }
    });
    branches();
  }
  function youtube(url) {
    try { const parsed = new URL(url); if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).match(/^[\w-]{11}$/)?.[0]; if (['youtube.com','www.youtube.com'].includes(parsed.hostname)) return (parsed.searchParams.get('v') || parsed.pathname.split('/').pop()).match(/^[\w-]{11}$/)?.[0]; } catch {} return '';
  }
  function routeHref(href) {
    const destinations = { models:'/models', contact:'/contact', careers:'/careers', news:'/events', technology:'/models', about:'/#about' };
    try { const url = new URL(href, location.origin); if (url.origin === location.origin && ['/', '/index.html'].includes(url.pathname) && destinations[url.hash.slice(1)]) return destinations[url.hash.slice(1)] + (url.search || ''); } catch {}
    return href;
  }
  async function campaignHero() {
    const stage = $('.showroom-hero'), media = $('#heroBackground'), controls = $('#heroControls'), status = $('#heroMediaStatus');
    const title = $('#heroTitle'), description = $('#heroDescription'), action = $('#heroAction');
    let slides = [], index = 0, timer, paused = matchMedia('(prefers-reduced-motion:reduce)').matches, focused = false, hovering = false, onscreen = true;
    const resizeCopy = () => stage.style.setProperty('--hero-copy-space', `${Math.ceil($('.hero-content').getBoundingClientRect().height) + 112}px`);
    if ('ResizeObserver' in window) new ResizeObserver(resizeCopy).observe($('.hero-content'));
    function schedule() {
      clearTimeout(timer);
      if (!paused && !focused && !hovering && onscreen && !document.hidden && slides.length > 1) timer = setTimeout(() => render((index + 1) % slides.length), Math.max(3000, Math.min(30000, Number(slides[index].duration) || 7000)));
    }
    function renderControls() {
      controls.hidden = slides.length < 2;
      controls.innerHTML = `<div class="slide-dots" role="group" aria-label="Choose a homepage slide">${slides.map((slide,i) => `<button class="slide-dot" type="button" data-hero-slide="${i}" aria-label="Show slide ${i+1}: ${escape(slide.headline)}" aria-pressed="${i === index}"><span></span></button>`).join('')}</div><button class="slide-pause" type="button" id="pauseHero" aria-label="${paused ? 'Resume' : 'Pause'} homepage slideshow" aria-pressed="${paused}">${paused ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>'}</button>`;
      controls.querySelectorAll('[data-hero-slide]').forEach(button => button.onclick = () => { const i = Number(button.dataset.heroSlide); render(i); controls.querySelector(`[data-hero-slide="${i}"]`).focus(); });
      $('#pauseHero').onclick = () => { paused = !paused; renderControls(); $('#pauseHero').focus(); schedule(); };
    }
    function unavailable() { media.replaceChildren(); status.textContent = 'This slide’s media is unavailable. You can still follow its link or choose another slide.'; }
    function pauseForVideo() { paused = true; renderControls(); schedule(); }
    function render(next) {
      clearTimeout(timer); index = next;
      const slide = slides[index], buttons = (slide.buttons || []).filter(button => button.label && button.href);
      title.textContent = slide.headline; description.textContent = slide.description || slide.eyebrow || ''; description.hidden = !description.textContent;
      action.textContent = buttons[0]?.label || 'Discover more'; action.href = routeHref(buttons[0]?.href || '/events');
      let extras = $('#heroExtraActions'); if (!extras) { extras = document.createElement('div'); extras.id = 'heroExtraActions'; extras.className = 'hero-extra-actions'; action.after(extras); }
      extras.innerHTML = buttons.slice(1).map(button => `<a href="${escape(routeHref(button.href))}" class="hero-secondary-action">${escape(button.label)}</a>`).join('');
      status.textContent = ''; media.replaceChildren();
      const id = youtube(slide.mediaUrl);
      if (slide.mediaType === 'video' && id) {
        const play = document.createElement('button'); play.type = 'button'; play.className = 'hero-video-poster'; play.setAttribute('aria-label', 'Play ' + slide.headline);
        play.innerHTML = `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt=""><span>Play video ${BYDIcons.right}</span>`;
        play.querySelector('img').onerror = event => event.target.remove();
        play.onclick = () => { pauseForVideo(); const iframe = document.createElement('iframe'); iframe.title = slide.headline; iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`; iframe.allow = 'autoplay; encrypted-media; picture-in-picture'; iframe.allowFullscreen = true; media.replaceChildren(iframe); iframe.focus(); };
        media.append(play);
      } else if (slide.mediaType === 'video') {
        const video = document.createElement('video'); video.src = slide.mediaUrl; video.controls = true; video.playsInline = true; video.preload = 'metadata'; video.setAttribute('aria-label', slide.headline); video.onplay = pauseForVideo; video.onerror = () => { if (media.contains(video)) unavailable(); }; media.append(video);
      } else if (slide.mediaUrl) {
        const img = document.createElement('img'); img.alt = ''; img.src = slide.mediaUrl; img.fetchPriority = index === 0 ? 'high' : 'auto'; img.onerror = () => { if (media.contains(img)) unavailable(); }; media.append(img);
      } else unavailable();
      renderControls(); resizeCopy(); schedule();
    }
    function fallback(error) {
      media.replaceChildren(); controls.hidden = true;
      description.hidden = false; title.textContent = 'Discover your next BYD.'; description.textContent = 'Explore the BYD line-up at Millennium Motors.'; action.href = '/models'; action.textContent = 'Explore and compare models';
      if (error) { status.textContent = 'Homepage slides couldn’t load. '; const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Retry slides'; retry.onclick = load; status.append(retry); }
      else status.textContent = '';
      resizeCopy();
    }
    async function load() {
      try { const settings = await api('/api/content/settings'); slides = (settings.heroSlides || []).filter(slide => slide.published === true).sort((a,b) => Number(a.priority) - Number(b.priority)); if (slides.length) render(0); else fallback(false); }
      catch { fallback(true); }
    }
    stage.addEventListener('focusin', () => { focused = true; schedule(); }); stage.addEventListener('focusout', event => { if (!stage.contains(event.relatedTarget)) { focused = false; schedule(); } });
    if (matchMedia('(hover:hover)').matches) { stage.addEventListener('mouseenter', () => { hovering = true; schedule(); }); stage.addEventListener('mouseleave', () => { hovering = false; schedule(); }); }
    document.addEventListener('visibilitychange', schedule);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { onscreen = entries[0].isIntersecting; schedule(); }, {threshold:0.05}).observe(stage);
    await load();
  }
  async function detail() {
    const main = $('#main'), id = decodeURIComponent(location.pathname.split('/').pop());
    try {
      const [model] = await Promise.all([api('/api/content/models/' + encodeURIComponent(id)).then(normalize), loadModels()]);
      document.title = `${model.name} | BYD Millennium Motors`;
      main.innerHTML = `<section class="section detail-section"><div class="breadcrumb"><a href="/models">Our models</a><span aria-hidden="true">/</span><span>${escape(model.name)}</span></div><div class="detail-header"><div><h1>${escape(model.name)}</h1><p>${escape(model.type)}</p></div><strong class="detail-price">${escape(model.price)}</strong></div><div class="detail-layout"><div class="vehicle-gallery"><div class="gallery-stage"><img id="detailImage" src="${escape(imageFor(model))}" alt="${escape(model.name)}" width="960" height="600" fetchpriority="high"></div><div class="gallery-thumbs" role="group" aria-label="Vehicle gallery"></div></div><div class="detail-copy"><p>${escape(model.description)}</p>${model.colours.length ? '<h2>Choose your colour.</h2>' : ''}${swatches(model)}<a class="button primary" href="/contact?model=${encodeURIComponent(model.id)}">Enquire about this model <span aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a>${model.videoUrl ? `<a class="button secondary" href="${escape(model.videoUrl)}" target="_blank" rel="noopener">Watch model video <span aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a>` : ''}</div></div></section><section class="section specification-section"><h2>Every detail, considered.</h2><div id="detailSpecs"></div></section>`;
      const groups = new Map();
      model.specifications.forEach(spec => { const group = spec.group || 'Specifications'; if (!groups.has(group)) groups.set(group, []); groups.get(group).push(spec); });
      $('#detailSpecs').innerHTML = [...groups].map(([group, specs]) => `<section class="spec-group"><h3>${escape(group)}</h3><dl>${specs.map(spec => `<div class="spec-row"><dt>${escape(spec.label)}</dt><dd>${escape([spec.value, spec.unit].filter(Boolean).join(' ') || 'Not specified')}</dd></div>`).join('')}</dl></section>`).join('') || '<p class="empty-state">More specifications are on their way. Ask our team for details.</p>';
      function gallery(images, colourName = '') {
        $('#detailImage').src = images[0] || '/assets/placeholder.svg'; $('#detailImage').alt = `${model.name}${colourName ? ' in ' + colourName : ''}`;
        $('.gallery-thumbs').innerHTML = images.length > 1 ? images.map((src,index) => `<button class="gallery-thumb" type="button" data-gallery="${index}" aria-label="View ${escape(model.name)} image ${index+1}" aria-pressed="${index === 0}"><img src="${escape(src)}" alt="" loading="lazy"></button>`).join('') : '';
        document.querySelectorAll('[data-gallery]').forEach(button => button.onclick = () => { $('#detailImage').src = images[Number(button.dataset.gallery)]; document.querySelectorAll('[data-gallery]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); });
        bindImages(main);
      }
      gallery(model.colours[0]?.images || model.images, model.colours[0]?.name);
      bindColours($('.detail-copy'), model, colour => gallery(colour.images, colour.name)); bindImages(main);
    } catch (error) { main.innerHTML = `<div class="section empty-state"><h1>Model unavailable.</h1><p>${escape(error.message)}</p><a class="button primary" href="/models">Explore current models</a></div>`; }
  }
  async function comparePage() {
    const main = $('#main');
    try {
      await loadModels();
      const params = new URLSearchParams(location.search), requested = params.has('models') ? params.get('models').split(',') : selected;
      let slots = [...new Set(requested.filter(id => models.some(m => m.id === id)))].slice(0, 2);
      const unavailable = requested.filter(Boolean).some(id => !models.some(m => m.id === id));
      function render() {
        selected = slots.filter(Boolean); saveSelection();
        const ids = selected.map(encodeURIComponent).join(','); history.replaceState(null, '', '/compare' + (ids ? '?models=' + ids : ''));
        document.title = 'Compare models | BYD Millennium Motors';
        main.innerHTML = `<section class="section"><div class="breadcrumb"><a href="/models">Our models</a><span aria-hidden="true">/</span><span>Compare</span></div><div class="compare-heading"><h1>Find your fit.</h1><p>Select two BYD vehicles. See the details, side by side.</p>${unavailable ? '<p class="error-state">An unavailable model was removed. Choose a current model below.</p>' : ''}</div><div class="compare-picker">${[0,1].map(index => {
          const model = models.find(m => m.id === slots[index]);
          return `<article class="compare-slot"><label>Vehicle ${index+1}<select data-slot="${index}" aria-label="Vehicle ${index+1}"><option value="">Choose a model</option>${models.map(m => `<option value="${escape(m.id)}" ${slots[index] === m.id ? 'selected' : ''} ${slots[1-index] === m.id ? 'disabled' : ''}>${escape(m.name)}</option>`).join('')}</select></label>${model ? `<img src="${escape(imageFor(model))}" alt="${escape(model.name)}"><h2>${escape(model.name)}</h2><p>${escape(model.price)}</p><a class="text-link" href="/models/${encodeURIComponent(model.id)}">View model <span aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a>` : '<p class="empty-state">Choose a vehicle to see its specifications.</p>'}</article>`;
        }).join('')}</div><div class="compare-rows">${selected.length === 2 ? renderRows(selected.map(id => models.find(m => m.id === id))) : `<p class="empty-state">${models.length < 2 ? 'Two published models are needed for comparison.' : 'Choose ' + (selected.length ? 'a second vehicle' : 'two vehicles') + ' to compare specifications.'}</p>`}</div></section>`;
        document.querySelectorAll('[data-slot]').forEach(select => select.onchange = () => { const index = Number(select.dataset.slot); if (select.value && select.value === slots[1-index]) { announce('Choose two different models.'); return; } slots[index] = select.value; render(); document.querySelector(`[data-slot="${index}"]`).focus(); });
        bindImages(main);
      }
      function renderRows(entries) {
        const rows = [{ label:'Price', values:entries.map(m => m.price || 'Not specified'), group:'Overview' }, { label:'Vehicle type', values:entries.map(m => m.type || 'Not specified'), group:'Overview' }, ...comparison(entries)];
        const groups = new Map(); rows.forEach(row => { const group = row.group || 'Specifications'; if (!groups.has(group)) groups.set(group, []); groups.get(group).push(row); });
        return [...groups].map(([group,items]) => `<section aria-label="${escape(group)}"><h2 class="comparison-group">${escape(group)}</h2>${items.map(row => `<div class="comparison-row"><h3 class="comparison-label">${escape(row.label)}</h3><div class="comparison-values">${row.values.map((value,index) => `<span><span class="sr-only">${escape(entries[index].name)}: </span>${escape(value)}</span>`).join('')}</div></div>`).join('')}</section>`).join('');
      }
      render();
    } catch { main.innerHTML = '<div class="section empty-state"><h1>Comparison couldn’t load.</h1><p>Please try again in a moment.</p><a class="button secondary" href="/compare">Reload comparison</a></div>'; }
  }
  const toggle = $('.menu-toggle'), nav = $('#mainNav');
  nav.append($('#chatbotWidget'));
  document.body.classList.toggle('home-page', ['/', '/index.html'].includes(location.pathname));
  $('#closeChat').onclick = () => { $('#chatbotToggle').click(); $('#chatbotToggle').focus(); };
  $('#chatbotToggle').setAttribute('aria-controls','chatbotPanel');
  toggle.onclick = () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); };
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (nav.classList.contains('open')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); toggle.focus(); } if ($('#chatbotWidget').classList.contains('open')) $('#chatbotToggle').click(); } });
  const legacy = { '#models':'/models', '#contact':'/contact', '#careers':'/careers', '#news':'/events', '#technology':'/models' };
  if (['/', '/index.html'].includes(location.pathname) && legacy[location.hash]) { location.replace(legacy[location.hash] + location.search); return; }
  window.addEventListener('hashchange', () => { if (legacy[location.hash]) location.assign(legacy[location.hash] + location.search); });
  nav.querySelectorAll('a').forEach(link => { if (new URL(link.href).pathname === location.pathname) link.setAttribute('aria-current','page'); });
  if (location.pathname === '/models') {
    document.title = 'Our models | BYD Millennium Motors';
    $('#main').innerHTML = '<section class="section"><div class="page-intro"><h1>Electric, your way.</h1><p>Get closer to your next BYD. Explore colours, details and specifications.</p><a class="text-link" href="/compare">Compare models <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a></div><div id="modelsGrid" class="model-grid" aria-live="polite"><p class="empty-state">Loading models…</p></div></section>';
    catalogue();
  } else if (['/contact','/careers'].includes(location.pathname)) {
    const career = location.pathname === '/careers';
    document.title = (career ? 'Careers' : 'Contact us') + ' | BYD Millennium Motors';
    $('#main').innerHTML = `<section class="section form-page"><div class="form-intro"><h1>${career ? 'Move forward <br>with us.' : 'Let’s take <br>the next step.'}</h1><p>${career ? 'Bring your experience and ambition to Millennium Motors. Tell us where you’d like to work.' : 'Choose your model and preferred branch. Our team will help with your questions or next test drive.'}</p><div class="form-note">${career ? 'Your résumé is shared only with our hiring team.' : 'Your details go to our team so we can respond to your enquiry.'}</div></div><div class="form-panel"><h2>${career ? 'Your application' : 'Your enquiry'}</h2>${BYDForms[career ? 'careers' : 'contact']}</div></section>`;
    forms();
    loadModels().then(() => { const select = $('#enquiryModel'); if (!select) return; select.innerHTML = '<option value="">Choose a model</option>' + models.map(m => `<option value="${escape(m.name)}">${escape(m.name)}</option>`).join(''); const requested = new URLSearchParams(location.search).get('model'); const model = models.find(m => m.id === requested || m.name === requested); if (model) select.value = model.name; }).catch(() => { if ($('#enquiryModel')) { $('#enquiryModel').outerHTML = '<input name="model" id="enquiryModel" required placeholder="Enter the model you’re interested in">'; } });
  } else if (location.pathname.startsWith('/models/')) detail();
  else if (location.pathname === '/compare') comparePage();
  else if (location.pathname === '/events') {
    document.title = 'News & events | BYD Millennium Motors';
    $('#main').innerHTML = '<section class="section"><div class="breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>News & events</span></div><div class="compare-heading"><h1>Life in motion.</h1><p>News, events and experiences from Millennium Motors.</p></div><div class="event-filters" role="group" aria-label="Filter stories"><button data-category="" aria-pressed="true">All stories</button><button data-category="Event" aria-pressed="false">Events</button><button data-category="News" aria-pressed="false">News</button><button data-category="Article" aria-pressed="false">Articles</button></div><div class="event-grid" id="newsGrid" aria-live="polite"><p class="empty-state">Loading stories…</p></div></section>';
    news(true); loadModels().catch(() => {});
  } else { catalogue(); campaignHero(); scrollMotion(); }
})();
