(() => {
  'use strict';
  const form = document.getElementById('vehicleForm');
  const specs = document.getElementById('specificationRows'), colours = document.getElementById('colourRows');
  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
  const button = (title, action) => { const node = el('button', title, 'secondary'); node.type = 'button'; node.onclick = action; return node; };
  const field = (row, label, name, value = '', type = 'text') => { const wrap = el('label', label), input = el(type === 'textarea' ? 'textarea' : 'input'); if (type !== 'textarea') input.type = type; input.value = value; input.dataset.field = name; if (type === 'text') input.maxLength = name === 'value' ? 1000 : 100; wrap.append(input); row.append(wrap); return input; };
  function movement(row) {
    const actions = el('div', undefined, 'row-actions');
    actions.append(button('Move up', () => { if (row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling); }), button('Move down', () => { if (row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row); }), button('Remove', () => row.remove())); row.append(actions);
  }
  function addSpecification(spec = {}) {
    const row = el('div', undefined, 'spec-editor-row');
    const label = field(row, 'Label', 'label', spec.label); label.required = true;
    const key = field(row, 'Stable key', 'key', spec.key); key.required = true; key.pattern = '[a-z0-9]+(?:-[a-z0-9]+)*'; key.setAttribute('list','specificationKeys');
    label.oninput = () => { if (!key.value || key.dataset.generated === 'true') { key.value = CatalogueData.key(label.value); key.dataset.generated = 'true'; } };
    key.oninput = () => delete key.dataset.generated;
    field(row, 'Value', 'value', spec.value);
    field(row, 'Unit (optional)', 'unit', spec.unit).maxLength = 50;
    field(row, 'Group (optional)', 'group', spec.group);
    movement(row); specs.append(row);
  }
  function addColour(colour = {}) {
    const row = el('div', undefined, 'colour-editor-row'); row.dataset.id = colour.id || 'colour-' + crypto.randomUUID();
    const name = field(row, 'Colour name', 'name', colour.name); name.required = true;
    field(row, 'Swatch', 'swatch', colour.swatch || '#668cae', 'color');
    const urls = field(row, 'Image URLs (one per line)', 'images', (colour.images || []).join('\n'), 'textarea');
    const wrap = el('label', 'Upload colour photos'), upload = el('input'); upload.type = 'file'; upload.accept = 'image/jpeg,image/png,image/webp'; upload.multiple = true; upload.name = 'colourImage_' + row.dataset.id; wrap.append(upload); row.append(wrap);
    const preview = el('div', undefined, 'colour-photos'); row.append(preview);
    let objectUrls = [];
    const render = () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url)); objectUrls = [...upload.files].map(file => URL.createObjectURL(file)); preview.replaceChildren();
      [...urls.value.split('\n').filter(Boolean), ...objectUrls].forEach(url => { const image = el('img'); image.src = url; image.alt = name.value || 'Colour image preview'; preview.append(image); });
    };
    urls.oninput = render;
    upload.onchange = () => { upload.setCustomValidity(upload.files.length > 8 || [...upload.files].some(f => f.size > 8 * 1024 * 1024) ? 'Choose up to 8 images, each at most 8 MB.' : ''); render(); };
    movement(row); colours.append(row); render();
  }
  document.getElementById('addSpecification').onclick = () => { if (specs.children.length < 80) { addSpecification(); specs.lastElementChild.querySelector('input').focus(); } };
  document.getElementById('addColour').onclick = () => { if (colours.children.length < 12) { addColour(); colours.lastElementChild.querySelector('input').focus(); } };
  form.addEventListener('formdata', event => {
    const data = event.formData;
    data.set('specificationsJson', JSON.stringify([...specs.children].map(row => Object.fromEntries([...row.querySelectorAll('[data-field]')].map(input => [input.dataset.field, input.value.trim()])))));
    data.set('coloursJson', JSON.stringify([...colours.children].map(row => ({ id: row.dataset.id, name: row.querySelector('[data-field=name]').value.trim(), swatch: row.querySelector('[data-field=swatch]').value, images: row.querySelector('[data-field=images]').value.split('\n').map(url => url.trim()).filter(Boolean) }))));
  });
  window.VehicleEditor = { load(model) {
    specs.replaceChildren(); colours.replaceChildren();
    const normalized = CatalogueData.normalize(model || {});
    normalized.specifications.forEach(addSpecification); normalized.colours.forEach(addColour);
    const datalist = document.getElementById('specificationKeys'); datalist.replaceChildren();
    const choices = new Map([['range','Driving range'],['acceleration','0–100 km/h'],['power','Power'],['battery','Battery']]);
    if (typeof state !== 'undefined') state.models.forEach(item => CatalogueData.normalize(item).specifications.forEach(spec => choices.set(spec.key,spec.label)));
    for (const [key,label] of choices) { const option = el('option', label); option.value = key; datalist.append(option); }
    if (!model) addSpecification();
  } };
})();
