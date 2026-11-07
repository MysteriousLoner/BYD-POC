/* The two discovery pages share factual catalogue data, not a second selection store. */
(() => {
  'use strict';
  const {normalize, comparison} = window.CatalogueData;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const arrows = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  const plus = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg>';
  const check = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
  const modelLink = model => '/models/' + encodeURIComponent(model.id);
  const enquiryLink = model => '/contact?model=' + encodeURIComponent(model.id) + '#register-section';
  const colours = model => model.colours.filter(colour => colour && Array.isArray(colour.images) && colour.images[0]);
  const photograph = model => colours(model)[0]?.images[0] || model.images[0] || '';
  const fieldValue = field => [field.value, field.unit].filter(Boolean).join(' ');
  const announce = text => { const live = document.getElementById('discoveryLive'); if (live) live.textContent = text; };

  async function loadModels() {
    const response = await fetch('/api/content/models', {signal: AbortSignal.timeout(20000)});
    if (!response.ok) throw Error('The models couldn’t load. Please try again.');
    const data = await response.json();
    if (!Array.isArray(data)) throw Error('The models couldn’t load. Please try again.');
    return data.map(normalize);
  }
  function mount() {
    const content = document.getElementById('wpFeatureContent');
    document.body.classList.add('byd-discovery-page');
    content.closest('.wp-feature').classList.add('byd-discovery');
    content.setAttribute('aria-busy', 'true');
    content.innerHTML = '<p class="ds-loading" role="status">Loading the BYD line-up…</p>';
    return content;
  }
  function finish(content) {
    content.removeAttribute('role');
    content.removeAttribute('aria-busy');
    if (!document.getElementById('discoveryLive')) content.closest('.wp-feature').insertAdjacentHTML('beforeend', '<p class="ds-sr-only" id="discoveryLive" role="status" aria-live="polite"></p>');
    hydrateImages(content);
  }
  function image(model, extra = '') {
    return `<figure class="ds-photo ${extra}"><img src="${escape(photograph(model) || '/assets/placeholder.svg')}" alt="${escape(model.name)}" width="960" height="540" decoding="async" loading="lazy"><figcaption class="ds-photo-fallback" hidden>Image unavailable</figcaption></figure>`;
  }
  function hydrateImages(root) {
    root.querySelectorAll('img').forEach(img => {
      const fail = () => {
        img.hidden = true;
        const caption = img.closest('.ds-photo')?.querySelector('.ds-photo-fallback');
        if (caption) caption.hidden = false;
      };
      img.onerror = fail;
      img.onload = () => {img.hidden = false; const caption = img.closest('.ds-photo')?.querySelector('.ds-photo-fallback'); if (caption) caption.hidden = true;};
      if (img.complete && !img.naturalWidth) fail();
    });
  }
  function error(content, retry) {
    content.removeAttribute('aria-busy');
    content.removeAttribute('role');
    content.innerHTML = '<div class="ds-empty"><h2>Let’s try that again.</h2><p>The models couldn’t load. Your saved comparison is still available when the connection returns.</p><button type="button" class="ds-button">Retry models</button></div>';
    content.querySelector('button').onclick = retry;
  }
  function swatches(model, selected) {
    const options = colours(model);
    if (!options.length) return '<p class="ds-colour-name">Vehicle gallery</p>';
    return `<div class="ds-paint"><div class="ds-swatches" role="group" aria-label="${escape(model.name)} colours">${options.map((colour, index) => `<button type="button" class="ds-swatch" data-colour="${index}" style="--paint:${/^#[a-f0-9]{6}$/i.test(colour.swatch) ? colour.swatch : '#b9c5cb'}" aria-label="${escape(colour.name)}" aria-pressed="${index === selected}"><span></span></button>`).join('')}</div><p class="ds-colour-name">${escape(options[selected].name)}</p></div>`;
  }
  function bindSwatches(card, model, memory) {
    card.querySelectorAll('[data-colour]').forEach(button => {
      button.onclick = () => {
        const index = Number(button.dataset.colour), colour = colours(model)[index];
        memory.set(model.id, index);
        card.querySelectorAll('[data-colour]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
        const img = card.querySelector('.ds-photo img');
        img.src = colour.images[0]; img.alt = model.name + ' in ' + colour.name;
        card.querySelector('.ds-colour-name').textContent = colour.name;
        if (!reduced()) img.animate([{opacity: .35}, {opacity: 1}], {duration: 240, easing: 'ease-out'});
        announce(model.name + ': ' + colour.name + ' selected.');
      };
      button.onkeydown = event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        event.preventDefault();
        const options = [...card.querySelectorAll('[data-colour]')], index = options.indexOf(button);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) % options.length;
        options[next].focus(); options[next].click();
      };
    });
  }
  function highlights(model) {
    const priority = ['range','acceleration','power','battery','seating'];
    const fields = model.specifications.filter(field => String(field.value ?? '').trim());
    const selected = [...fields].sort((a, b) => {
      const rank = field => priority.includes(field.key) ? priority.indexOf(field.key) : priority.length;
      return rank(a) - rank(b);
    }).slice(0, 3);
    if (!selected.length) return '<p class="ds-card-guidance">Explore this model or ask our team for specifications.</p>';
    return `<dl class="ds-highlights">${selected.map(field => `<div><dt>${escape(field.label)}</dt><dd>${escape(fieldValue(field))}</dd></div>`).join('')}</dl>`;
  }
  async function catalogue() {
    const content = mount();
    try {
      const models = await loadModels(), paint = new Map();
      let active = '';
      const types = [...new Set(models.map(model => model.type).filter(Boolean))];
      content.innerHTML = `<div class="ds-introduction"><p>Find your colour. Get to know your BYD.</p><a class="ds-button" href="/compare">Compare models ${arrows}</a></div>
        <div class="ds-filter-bar"><div class="ds-filters" role="group" aria-label="Filter models by type"><button type="button" data-filter="" aria-pressed="true">All models <span>${models.length}</span></button>${types.map(type => `<button type="button" data-filter="${escape(type)}" aria-pressed="false">${escape(type)} <span>${models.filter(model => model.type === type).length}</span></button>`).join('')}</div><p class="ds-result-count" role="status" aria-live="polite"></p></div>
        <div class="ds-model-grid wp-model-grid">${models.map(model => `<article class="ds-model-card wp-model-card" data-car="${escape(model.id)}"><a class="ds-model-photo-link" href="${modelLink(model)}" aria-label="Explore ${escape(model.name)}">${image(model)}</a><div class="ds-card-copy"><div class="ds-model-heading"><div><p class="ds-model-type">${escape(model.type)}</p><h2>${escape(model.name)}</h2></div><p class="ds-price">${escape(model.price)}</p></div>${swatches(model, 0)}${highlights(model)}<a class="ds-card-action" href="${modelLink(model)}">Explore model ${arrows}</a></div></article>`).join('')}</div>
        ${models.length ? '' : '<div class="ds-empty"><h2>The line-up is being updated.</h2><p>Please contact our team for current availability.</p><a class="ds-button" href="/contact">Contact our team</a></div>'}`;
      models.forEach(model => bindSwatches([...content.querySelectorAll('[data-car]')].find(card => card.dataset.car === model.id), model, paint));
      const cards = [...content.querySelectorAll('[data-car]')];
      function filter(type) {
        const positions = new Map(cards.filter(card => !card.hidden).map(card => [card, card.getBoundingClientRect()]));
        active = type;
        content.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === active)));
        cards.forEach((card, index) => { card.hidden = Boolean(active && models[index].type !== active); });
        const visible = cards.filter(card => !card.hidden);
        content.querySelector('.ds-result-count').textContent = `Showing ${visible.length} of ${models.length} models`;
        if (!reduced()) visible.forEach(card => {
          const before = positions.get(card), after = card.getBoundingClientRect();
          card.animate(before ? [{transform: `translate(${before.x - after.x}px,${before.y - after.y}px)`}, {transform: 'translate(0,0)'}] : [{opacity: .3}, {opacity: 1}], {duration: 300, easing: 'cubic-bezier(.16,1,.3,1)'});
        });
      }
      content.querySelectorAll('[data-filter]').forEach(button => {button.onclick = () => filter(button.dataset.filter);});
      filter(''); finish(content);
    } catch (_) { error(content, catalogue); }
  }

  function readSelection(models) {
    let saved = [];
    try { const value = JSON.parse(localStorage.getItem('byd-comparison') || '[]'); if (Array.isArray(value)) saved = value; } catch (_) {}
    const query = new URLSearchParams(location.search);
    const requested = (query.has('models') ? query.get('models').split(',') : saved).filter(id => typeof id === 'string' && id);
    const ids = [...new Set(requested.filter(id => models.some(model => model.id === id)))].slice(0, 2);
    return {slots: [ids[0] || '', ids[1] || ''], removed: requested.some(id => !models.some(model => model.id === id))};
  }
  function persist(slots) {
    const ids = slots.filter(Boolean);
    try {localStorage.setItem('byd-comparison', JSON.stringify(ids));} catch (_) {}
    const url = new URL(location.href);
    if (ids.length) url.searchParams.set('models', ids.join(',')); else url.searchParams.delete('models');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  function qualifier(label) { return (String(label || '').match(/\([^)]*\)/g) || []).join(' '); }
  function compareRows(chosen) {
    return comparison(chosen).map(row => {
      const fields = chosen.map(model => model.specifications.find(field => field.key === row.key));
      const label = row.label.replace(/\s*\([^)]*\)/g, '').trim() || row.label;
      const notes = fields.map(field => {
        if (!field) return '';
        const base = field.label.replace(/\s*\([^)]*\)/g, '').trim();
        return base !== label ? field.label : qualifier(field.label);
      });
      const comparable = row.values.map((value, index) => value.trim().toLowerCase().replace(/\s+/g,' ') + (value === 'Not specified' ? '' : notes[index].toLowerCase()));
      return {...row, label, notes, different: comparable[0] !== comparable[1]};
    });
  }
  function selectionFlight(source, destination, src) {
    if (reduced() || !source || !destination || !src) return;
    const target = destination.getBoundingClientRect();
    if (source.bottom < 0 || target.bottom < 0 || source.top > innerHeight || target.top > innerHeight) return;
    const img = document.createElement('img');
    img.src = src; img.alt = ''; img.setAttribute('aria-hidden','true'); img.className = 'ds-selection-flight';
    Object.assign(img.style, {left: source.x + 'px', top: source.y + 'px', width: source.width + 'px', height: source.height + 'px'});
    document.body.append(img);
    img.animate([{transform: 'translate(0,0) scale(1)', opacity: .9}, {transform: `translate(${target.x-source.x}px,${target.y-source.y}px) scale(${target.width/source.width},${target.height/source.height})`, opacity: .2}], {duration: 360, easing:'cubic-bezier(.16,1,.3,1)'}).finished.catch(() => {}).finally(() => img.remove());
  }
  async function compare() {
    const content = mount();
    try {
      const models = await loadModels(), initial = readSelection(models);
      let slots = initial.slots, mode = slots.every(Boolean) ? 'results' : 'picker', activeSlot = slots[0] ? 1 : 0, differences = false;
      const getModel = index => models.find(model => model.id === slots[index]);
      const notice = () => initial.removed ? '<p class="ds-notice wp-feedback" role="status">An unavailable model was removed. Choose another model below.</p>' : '';
      function render() {
        persist(slots);
        if (mode === 'results' && slots.every(Boolean)) renderResults(); else renderPicker();
        finish(content);
      }
      function renderPicker() {
        const count = slots.filter(Boolean).length;
        content.innerHTML = `<div class="ds-introduction"><p>Choose two BYDs. Explore what makes each one yours.</p><a class="ds-text-link" href="/models">Explore all models ${arrows}</a></div>${notice()}
          <div class="ds-picker-stage"><div class="ds-picker-heading"><h2>${count === 2 ? 'Your pair is ready.' : 'Start with your two favourites.'}</h2><p>${count} of 2 selected</p></div><div class="ds-choice-slots">${[0,1].map(index => {
            const model = getModel(index);
            return `<article class="ds-choice-slot" data-choice-slot="${index}"><button type="button" data-slot="${index}" class="ds-slot-target" aria-pressed="${activeSlot === index}" aria-label="Choose vehicle ${index+1}${model ? ': '+escape(model.name) : ''}"><span class="ds-slot-label">Vehicle ${index+1}</span>${model ? `${image(model)}<strong>${escape(model.name)}</strong><span class="ds-slot-price">${escape(model.price)}</span>` : `<span class="ds-add-icon">${plus}</span><strong>Choose ${index ? 'second' : 'first'} model</strong>`}</button>${model ? `<button class="ds-remove" type="button" data-remove="${index}" aria-label="Remove ${escape(model.name)} from vehicle ${index+1}">Remove vehicle</button>` : ''}</article>`;
          }).join('')}</div><div class="ds-picker-footer"><p>${count === 2 ? 'Explore their specifications side by side.' : `Select a model below for vehicle ${activeSlot+1}.`}</p><button type="button" class="ds-button" id="showComparison" ${count !== 2 ? 'disabled' : ''}>Compare models ${arrows}</button></div></div>
          <section class="ds-picker-gallery" aria-labelledby="pickModelHeading"><div class="ds-gallery-heading"><h2 id="pickModelHeading">${count === 2 ? 'Change your selection' : 'Choose your '+(activeSlot ? 'second' : 'first')+' BYD'}</h2><p>${models.length} published models</p></div><div class="ds-model-picker-grid">${models.map(model => {
            const selectedAt = slots.indexOf(model.id), unavailable = selectedAt !== -1 && selectedAt !== activeSlot;
            return `<button type="button" class="ds-picker-model" data-choose="${escape(model.id)}" aria-pressed="${selectedAt === activeSlot}" aria-label="Choose ${escape(model.name)} as vehicle ${activeSlot+1}" ${unavailable ? 'disabled' : ''}>${image(model)}<span class="ds-picker-model-copy"><span class="ds-model-type">${escape(model.type)}</span><strong>${escape(model.name)}</strong><span>${escape(model.price)}</span><span class="ds-picker-choice">${selectedAt >= 0 ? `${check} Vehicle ${selectedAt+1}` : `Select model ${plus}`}</span></span></button>`;
          }).join('')}</div></section>${models.length < 2 ? '<div class="ds-empty wp-comparison-rows"><h2>More choice is on its way.</h2><p>Two published models are needed for a comparison. Please contact our team for available options.</p><a class="ds-button" href="/contact">Contact our team</a></div>' : ''}`;
        content.querySelectorAll('[data-slot]').forEach(button => {button.onclick = () => {activeSlot = Number(button.dataset.slot); render(); content.querySelector(`[data-slot="${activeSlot}"]`).focus({preventScroll:true});};});
        bindRemoval();
        content.querySelectorAll('[data-choose]').forEach(button => {
          button.onclick = () => {
            const id = button.dataset.choose;
            if (slots.includes(id)) return;
            const index = activeSlot, source = button.querySelector('img').getBoundingClientRect(), src = button.querySelector('img').src;
            slots[index] = id; activeSlot = slots[1-index] ? index : 1-index;
            render();
            const destination = content.querySelector(`[data-choice-slot="${index}"] img`);
            selectionFlight(source, destination, src);
            const next = slots.every(Boolean) ? content.querySelector('#showComparison') : content.querySelector(`[data-slot="${activeSlot}"]`);
            next.focus({preventScroll:true});
            announce(`${getModel(index).name} selected as vehicle ${index+1}. ${slots.every(Boolean) ? 'Your comparison is ready.' : 'Choose your second model.'}`);
          };
        });
        content.querySelector('#showComparison').onclick = () => {mode = 'results'; render(); const heading = content.closest('.wp-feature').querySelector('h1'); heading.tabIndex = -1; heading.focus({preventScroll:true}); window.scrollTo({top:0, behavior:reduced() ? 'auto' : 'smooth'}); announce('Your model comparison is ready.');};
      }
      function bindRemoval() {
        content.querySelectorAll('[data-remove]').forEach(button => {button.onclick = () => {
          const index = Number(button.dataset.remove), name = getModel(index)?.name;
          slots[index] = ''; activeSlot = index; mode = 'picker'; render();
          content.querySelector(`[data-slot="${index}"]`).focus({preventScroll:true}); announce(name + ' removed. Choose another model.');
        };});
      }
      function renderResults() {
        const chosen = [getModel(0), getModel(1)];
        content.innerHTML = `<div class="ds-introduction"><p>Two BYDs. A closer look at the details that matter to you.</p><a class="ds-text-link" href="/models">Explore all models ${arrows}</a></div>${notice()}<div class="ds-selected-vehicles">${chosen.map((model,index) => `<article class="ds-vehicle-panel"><div class="ds-vehicle-label"><span>Vehicle ${index+1}</span><button type="button" data-edit="${index}">Change model</button></div>${image(model)}<div class="ds-vehicle-copy"><p class="ds-model-type">${escape(model.type)}</p><h2>${escape(model.name)}</h2><p class="ds-price">${escape(model.price)}</p><div class="ds-vehicle-actions"><a class="ds-text-link" href="${modelLink(model)}">Explore model ${arrows}</a><button type="button" class="ds-remove" data-remove="${index}" aria-label="Remove ${escape(model.name)} from vehicle ${index+1}">Remove</button></div></div></article>`).join('')}</div>
          <div class="ds-compare-controls"><div><h2>Look at the details.</h2><p>Values follow the specifications provided for each model.</p></div><label class="ds-differences"><input type="checkbox" id="showDifferences" ${differences ? 'checked' : ''}><span>Show differences only</span></label></div>
          <div class="ds-sticky-identity" aria-label="Comparing models">${chosen.map((model,index) => `<div><span>Vehicle ${index+1}</span><strong>${escape(model.name)}</strong></div>`).join('')}</div><div class="ds-specification-groups wp-comparison-rows"></div>
          <div class="ds-enquiry-pair">${chosen.map(model => `<div><p>Interested in ${escape(model.name)}?</p><a class="ds-button" href="${enquiryLink(model)}">Enquire about this model ${arrows}</a></div>`).join('')}</div>`;
        content.querySelectorAll('[data-edit]').forEach(button => {button.onclick = () => {activeSlot = Number(button.dataset.edit); mode = 'picker'; render(); content.querySelector(`[data-slot="${activeSlot}"]`).focus({preventScroll:true}); announce('Choose a replacement for vehicle ' + (activeSlot+1) + '.');};});
        bindRemoval();
        const toggle = content.querySelector('#showDifferences');
        toggle.onchange = () => {differences = toggle.checked; renderSpecifications(chosen);};
        renderSpecifications(chosen);
      }
      function renderSpecifications(chosen) {
        const allRows = compareRows(chosen), rows = allRows.filter(row => !differences || row.different), groups = new Map();
        rows.forEach(row => { const group = row.group || 'Specifications'; if (!groups.has(group)) groups.set(group, []); groups.get(group).push(row); });
        const area = content.querySelector('.ds-specification-groups');
        area.innerHTML = [...groups].map(([group, fields]) => `<section class="ds-specification-group"><h2>${escape(group)}</h2>${fields.map(row => `<div class="ds-spec-row wp-comparison-row ${row.different ? 'is-different' : ''}"><h3>${escape(row.label)}${row.different ? '<span class="ds-difference-label">Different values</span>' : ''}</h3><div class="ds-spec-values wp-comparison-values">${row.values.map((value,index) => `<div><span class="ds-cell-value ${value === 'Not specified' ? 'is-missing' : ''}">${escape(value)}</span>${row.notes[index] ? `<small>${escape(row.notes[index])}</small>` : ''}</div>`).join('')}</div></div>`).join('')}</section>`).join('') || `<div class="ds-empty"><h3>${allRows.length ? 'No differences in the specified values.' : 'Specifications are being updated.'}</h3><p>${allRows.length ? 'You can still explore every available specification.' : 'Explore each model or ask our team for more details.'}</p>${allRows.length ? '<button type="button" class="ds-button" id="showAllSpecifications">Show all specifications</button>' : ''}</div>`;
        const all = area.querySelector('#showAllSpecifications');
        if (all) all.onclick = () => {differences = false; content.querySelector('#showDifferences').checked = false; renderSpecifications(chosen); content.querySelector('#showDifferences').focus({preventScroll:true});};
        announce(`${rows.length} specification rows shown${differences ? ', differences only' : ''}.`);
      }
      render();
      addEventListener('popstate', () => {const next = readSelection(models); slots = next.slots; initial.removed = next.removed; mode = slots.every(Boolean) ? 'results' : 'picker'; activeSlot = slots[0] ? 1 : 0; render();});
    } catch (_) { error(content, compare); }
  }
  window.BYDShowroom = {catalogue, compare};
})();
