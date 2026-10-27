(() => {
  'use strict';
  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
  const button = (label, action, cls = 'secondary') => { const node = el('button', label, cls); node.type = 'button'; node.onclick = action; return node; };
  const nav = document.querySelector('.sidebar nav'), section = el('section', undefined, 'page manager-page');
  section.id = 'eventsPage'; document.querySelector('.admin-main').append(section);
  const navButton = button('News & Events', openPage, 'nav-item'); navButton.dataset.editor = 'events'; nav.append(navButton);
  let records = [], editing = '', objectUrl, previewGeneration = 0, loadGeneration = 0;
  async function api(url = '', options = {}) {
    const response = await fetch('/api/content/news' + url, options), data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(data?.error || 'Unable to save. Please try again.'); return data;
  }
  async function openPage() {
    const generation = ++loadGeneration;
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active')); section.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(node => node.classList.toggle('active', node === navButton));
    document.getElementById('pageTitle').textContent = 'News & Events'; document.getElementById('pageSubtitle').textContent = 'Publish stories and preview how event images will appear.'; document.getElementById('topAction').hidden = true;
    section.replaceChildren(el('p', 'Loading stories…'));
    try { records = await api(); if (generation !== loadGeneration) return; render(); }
    catch (error) { section.replaceChildren(el('p',error.message,'form-message error'), button('Retry',openPage)); }
  }
  function render() {
    section.replaceChildren();
    const toolbar = el('div', undefined, 'manager-toolbar'); toolbar.append(el('h2','Stories & events'),button('Add story',() => reset({}, true),'primary')); section.append(toolbar);
    const layout = el('div', undefined, 'event-manager-layout'), list = el('div', undefined, 'event-admin-list'), form = el('form', undefined, 'manager-form');
    form.id = 'eventForm'; form.enctype = 'multipart/form-data'; layout.append(list,form); section.append(layout);
    for (const record of records) {
      const row = el('article', undefined, 'event-admin-row'), image = el('img'); image.src = record.image; image.alt = record.title;
      row.append(image,el('h3',record.title),el('small',`${record.date} · ${record.category} · ${record.published === false ? 'Hidden' : 'Published'}`));
      const actions = el('div', undefined, 'manager-actions'); actions.append(button('Edit',() => reset(record)),button('Delete',async () => {
        if (!confirm(`Delete “${record.title}”?`)) return;
        try { await api('/'+encodeURIComponent(record.id),{method:'DELETE'}); toast('Story deleted'); await openPage(); }
        catch (error) { toast(error.message,true); }
      },'secondary danger')); row.append(actions); list.append(row);
    }
    if (!records.length) list.append(el('p','No stories yet. Add your first news item or event.','empty-state'));
    const title = el('h3','Add story'); title.id = 'eventFormTitle'; form.append(title);
    function field(name,label,type='text') { const wrap = el('label',label), input = el(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input'); input.name = name; if (!['textarea','select'].includes(type)) input.type = type; wrap.append(input); form.append(wrap); return input; }
    field('title','Story title').required = true; form.elements.title.maxLength = 200;
    const category = field('category','Category','select'); ['Event','News','Article'].forEach(value => category.append(el('option',value)));
    field('date','Date','date').required = true;
    field('summary','Summary','textarea').required = true; form.elements.summary.maxLength = 5000;
    field('image','Image URL').inputMode = 'url';
    const upload = field('imageFile','Upload event image','file'); upload.accept = 'image/jpeg,image/png,image/webp';
    form.append(el('small','JPG, PNG or WEBP · maximum 8 MB. Landscape images work best.'));
    const preview = el('div', undefined, 'event-image-preview'), img = el('img'); img.alt = 'Event image in the recommended 16:9 frame'; preview.append(img); preview.hidden = true; form.append(preview);
    const dimensions = el('p','','image-dimensions'); dimensions.id = 'eventImageDimensions'; dimensions.setAttribute('role','status');
    const warning = el('p','','orientation-warning'); warning.id = 'eventOrientationWarning'; warning.setAttribute('role','status'); warning.hidden = true; form.append(dimensions,warning);
    const published = field('published','Published','checkbox'); published.checked = true;
    const submit = el('button','Save story','primary'); submit.type = 'submit'; const message = el('p','','form-message'); message.setAttribute('role','status'); form.append(submit,message);
    async function updatePreview() {
      const generation = ++previewGeneration; warning.hidden = true; warning.textContent = ''; dimensions.textContent = ''; preview.hidden = true;
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
      const file = upload.files[0];
      upload.setCustomValidity(file?.size > 8*1024*1024 ? 'Choose an image smaller than 8 MB.' : '');
      if (!upload.checkValidity()) { dimensions.textContent = 'This image is larger than 8 MB. Choose a smaller image.'; return; }
      const url = file ? (objectUrl = URL.createObjectURL(file)) : form.elements.image.value.trim();
      if (!url) return;
      const probe = new Image(); probe.src = url;
      try {
        await probe.decode(); if (generation !== previewGeneration) return;
        img.src = url; preview.hidden = false;
        const width = probe.naturalWidth, height = probe.naturalHeight;
        dimensions.textContent = `${width} × ${height} px · Preview uses a 16:9 frame. Your original is preserved.`;
        if (width <= height) { warning.hidden = false; warning.textContent = `This image is ${width === height ? 'square' : 'portrait'}. A landscape image is recommended for event cards. You can still save this image; parts may be cropped in the preview.`; }
      } catch { if (generation === previewGeneration) dimensions.textContent = 'This image couldn’t be previewed. Check the URL or choose another file.'; }
    }
    upload.onchange = updatePreview; form.elements.image.oninput = updatePreview;
    form.onsubmit = async event => {
      event.preventDefault(); submit.disabled = true; message.textContent = 'Saving…'; message.className = 'form-message';
      const data = new FormData(form); data.set('published',String(published.checked));
      try {
        await api(editing ? '/'+encodeURIComponent(editing) : '',{method:editing?'PUT':'POST',body:data}); toast('Story saved'); await openPage();
      } catch (error) { message.className = 'form-message error'; message.textContent = error.message; }
      finally { submit.disabled = false; }
    };
    function reset(record = {}, reveal = false) {
      editing = record.id || ''; form.reset(); form.elements.title.value = record.title || ''; form.elements.category.value = record.category || 'Event'; form.elements.date.value = record.date || new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); form.elements.summary.value = record.summary || ''; form.elements.image.value = record.image || ''; published.checked = record.published !== false; title.textContent = editing ? 'Edit story' : 'Add story'; message.textContent = ''; updatePreview();
      if (record.id || reveal) { form.scrollIntoView({behavior:'smooth',block:'start'}); form.elements.title.focus({preventScroll:true}); }
    }
    reset();
  }
})();
