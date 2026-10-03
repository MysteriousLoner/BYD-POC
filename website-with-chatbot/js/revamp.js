document.addEventListener('DOMContentLoaded', () => {
  const modelsGrid = document.getElementById('modelsGrid');
  const newsGrid = document.getElementById('newsGrid');
  const modelSelect = document.getElementById('enquiryModel');
  let models = [];

  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const getYouTubeId = url => String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)?.[1] || '';
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-visible', entry.isIntersecting));
  }, { threshold: 0.12, rootMargin: '-4% 0px -8% 0px' });

  function observeReveal(elements, direction = '') {
    [...elements].forEach((element, index) => {
      element.classList.add('scroll-reveal');
      if (direction) element.classList.add(direction);
      element.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 90}ms`);
      revealObserver.observe(element);
    });
  }

  observeReveal(document.querySelectorAll('.video-showcase .section-header, .technology .section-header, .cta-content'));
  observeReveal(document.querySelectorAll('.video-card, .tech-card, .stat-item'));
  observeReveal(document.querySelectorAll('.about-copy'), 'reveal-left');
  observeReveal(document.querySelectorAll('.about-panel'), 'reveal-right');
  observeReveal(document.querySelectorAll('.forms-section .section-header, .lead-form'));

  async function loadSiteSettings() {
    try {
      const response = await fetch('/api/content/settings');
      const { hero = {} } = await response.json();
      const heroMedia = document.querySelector('.hero-static-bg');
      const eyebrow = document.querySelector('.hero-eyebrow');
      const title = document.querySelector('.hero-title');
      const description = document.querySelector('.hero-description');
      if (eyebrow && hero.eyebrow) eyebrow.textContent = hero.eyebrow;
      if (title && hero.headline) title.innerHTML = hero.headline.trim().split(/\s+/).map((part, index, all) => index === Math.ceil(all.length / 2) ? `<br>${escapeHtml(part)}` : escapeHtml(part)).join(' ');
      if (description && hero.description) description.textContent = hero.description;
      if (!heroMedia || !hero.mediaUrl) return;
      if (hero.mediaType === 'video') {
        heroMedia.className = 'hero-static-bg has-video';
        const youtubeId = getYouTubeId(hero.mediaUrl);
        heroMedia.innerHTML = youtubeId
          ? `<iframe id="managedHeroYouTube" class="hero-managed-youtube" src="https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&rel=0&modestbranding=1&playsinline=1&cc_load_policy=0&iv_load_policy=3&disablekb=1&enablejsapi=1" allow="autoplay; encrypted-media" title="Homepage background video"></iframe>`
          : `<video class="hero-managed-video" autoplay muted loop playsinline preload="metadata"><source src="${escapeHtml(hero.mediaUrl)}"></video>`;
        const youtubeFrame = document.getElementById('managedHeroYouTube');
        if (youtubeFrame) {
          const disableCaptions = () => {
            youtubeFrame.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'unloadModule', args: ['captions'] }), '*');
            youtubeFrame.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setOption', args: ['captions', 'track', {}] }), '*');
          };
          youtubeFrame.addEventListener('load', () => { disableCaptions(); setTimeout(disableCaptions, 1200); setTimeout(disableCaptions, 3500); });
        }
      } else {
        heroMedia.className = 'hero-static-bg managed-image';
        heroMedia.style.setProperty('--managed-hero-image', `url("${String(hero.mediaUrl).replace(/["\\]/g, '')}")`);
      }
    } catch (error) { console.warn('Using default hero content'); }
  }

  async function loadContent() {
    try {
      const [modelsResponse, newsResponse] = await Promise.all([fetch('/api/content/models'), fetch('/api/content/news')]);
      models = (await modelsResponse.json()).filter(model => model.published !== false);
      const news = (await newsResponse.json()).slice(0, 3);
      modelsGrid.innerHTML = models.map(model => `
        <article class="model-card" data-model="${escapeHtml(model.id)}">
          <div class="model-card-image"><img src="${escapeHtml(model.image)}" alt="${escapeHtml(model.name)}" loading="lazy">${model.badge ? `<div class="model-card-badge">${escapeHtml(model.badge)}</div>` : ''}</div>
          <div class="model-card-content"><h3 class="model-name">${escapeHtml(model.name)}</h3><p class="model-type">${escapeHtml(model.type)}</p>
          <div class="model-specs"><span class="model-spec"><i class="fa-solid fa-bolt"></i> ${escapeHtml(model.range)}</span><span class="model-spec"><i class="fa-solid fa-gauge-high"></i> ${escapeHtml(model.acceleration)}</span></div>
          <p class="model-description">${escapeHtml(model.description)}</p><div class="model-price">${escapeHtml(model.price)}</div><button class="model-link" type="button">View Full Details <i class="fa-solid fa-arrow-right"></i></button></div>
        </article>`).join('');
      modelSelect.insertAdjacentHTML('beforeend', models.map(model => `<option value="${escapeHtml(model.name)}">${escapeHtml(model.name)}</option>`).join(''));
      newsGrid.innerHTML = news.map(item => `<article class="news-card"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy"><div class="news-card-body"><span class="news-meta">${escapeHtml(item.category)} · ${escapeHtml(item.date)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p></div></article>`).join('');
      modelsGrid.querySelectorAll('.model-card').forEach(card => card.addEventListener('click', () => openModel(card.dataset.model)));
      observeReveal(document.querySelectorAll('.news-section .section-header, .models .section-header'));
      observeReveal(newsGrid.querySelectorAll('.news-card'));
      observeReveal(modelsGrid.querySelectorAll('.model-card'));
    } catch (error) {
      modelsGrid.innerHTML = '<p class="content-loading">Model information is temporarily unavailable.</p>';
      newsGrid.innerHTML = '<p class="content-loading">News is temporarily unavailable.</p>';
    }
  }

  function openModel(id) {
    const model = models.find(item => item.id === id); if (!model) return;
    const images = [...new Set((Array.isArray(model.images) && model.images.length ? model.images : [model.image]).filter(Boolean))];
    let activeImage = 0;
    const modal = document.createElement('div'); modal.className = 'model-detail-modal';
    modal.innerHTML = `<article class="model-detail-card"><button class="modal-close" aria-label="Close">×</button><div class="model-gallery ${images.length > 1 ? 'has-gallery' : 'single-image'}" style="--gallery-images:${images.length}"><div class="model-gallery-stage"><img src="${escapeHtml(images[0])}" alt="${escapeHtml(model.name)}" class="gallery-main">${images.length > 1 ? '<button class="gallery-arrow previous" aria-label="Previous image">‹</button><button class="gallery-arrow next" aria-label="Next image">›</button>' : ''}<span class="gallery-count">1 / ${images.length}</span></div><div class="gallery-thumbs">${images.map((image,index)=>`<button class="gallery-thumb ${index===0?'active':''}" data-index="${index}" aria-label="View image ${index+1}"><img src="${escapeHtml(image)}" alt="${escapeHtml(model.name)} view ${index+1}" loading="eager" decoding="async"></button>`).join('')}</div></div><div class="model-detail-copy"><p class="section-eyebrow">${escapeHtml(model.type)}</p><h2>${escapeHtml(model.name)}</h2><p>${escapeHtml(model.description)}</p><div class="detail-specs"><div><small>Range</small>${escapeHtml(model.range)}</div><div><small>Acceleration</small>${escapeHtml(model.acceleration)}</div><div><small>Power</small>${escapeHtml(model.power)}</div><div><small>Battery</small>${escapeHtml(model.battery)}</div></div><h3>${escapeHtml(model.price)}</h3><div class="detail-actions"><a href="#careers" class="btn btn-primary detail-enquire">Enquire Now</a>${model.videoUrl ? `<a href="${escapeHtml(model.videoUrl)}" target="_blank" rel="noopener" class="btn btn-outline-light">Watch Video</a>` : ''}</div></div></article>`;
    document.body.appendChild(modal); document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modal.classList.add('open'));
    const showImage = index => { activeImage = (index + images.length) % images.length; const main = modal.querySelector('.gallery-main'); main.classList.add('changing'); setTimeout(() => { main.src = images[activeImage]; main.classList.remove('changing'); }, 130); const count=modal.querySelector('.gallery-count'); if(count)count.textContent = `${activeImage + 1} / ${images.length}`; modal.querySelectorAll('.gallery-thumb').forEach((thumb,i)=>thumb.classList.toggle('active',i===activeImage)); };
    const close = () => { modal.classList.add('closing'); modal.classList.remove('open'); document.removeEventListener('keydown', onKey); setTimeout(() => modal.remove(), 260); document.body.style.overflow = ''; };
    const onKey = event => { if(event.key==='Escape')close(); if(event.key==='ArrowLeft'&&images.length>1)showImage(activeImage-1); if(event.key==='ArrowRight'&&images.length>1)showImage(activeImage+1); };
    document.addEventListener('keydown', onKey);
    modal.querySelector('.modal-close').onclick = close;
    modal.querySelector('.previous')?.addEventListener('click',()=>showImage(activeImage-1));
    modal.querySelector('.next')?.addEventListener('click',()=>showImage(activeImage+1));
    modal.querySelectorAll('.gallery-thumb').forEach(thumb=>thumb.addEventListener('click',()=>showImage(Number(thumb.dataset.index))));
    modal.querySelector('.detail-enquire').addEventListener('click',close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
  }

  async function submitForm(form, endpoint) {
    const status = form.querySelector('.form-status'); const button = form.querySelector('button[type="submit"]');
    status.className = 'form-status'; status.textContent = 'Sending...'; button.disabled = true;
    try {
      const isMultipart = form.enctype === 'multipart/form-data'; const payload = isMultipart ? new FormData(form) : Object.fromEntries(new FormData(form));
      const response = await fetch(endpoint, { method: 'POST', headers: isMultipart ? {} : {'Content-Type':'application/json'}, body: isMultipart ? payload : JSON.stringify(payload) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to submit');
      form.reset(); status.className = 'form-status success'; status.textContent = 'Received - thank you!';
    } catch (error) { status.className = 'form-status error'; status.textContent = error.message; }
    finally { button.disabled = false; }
  }
  document.getElementById('enquiryForm').addEventListener('submit', event => { event.preventDefault(); submitForm(event.currentTarget, '/api/content/enquiries'); });
  document.getElementById('careerForm').addEventListener('submit', event => { event.preventDefault(); submitForm(event.currentTarget, '/api/content/careers'); });
  loadSiteSettings();
  loadContent();
});

window.addEventListener('load', () => setTimeout(() => document.getElementById('brandLoader')?.classList.add('hidden'), 2800));
