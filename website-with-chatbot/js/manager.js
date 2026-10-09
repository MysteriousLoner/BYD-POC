(() => {
  'use strict';
  const main = document.querySelector('.admin-main'), nav = document.querySelector('.sidebar nav');
  const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
  const button = (text, action, cls = 'secondary') => { const b = el('button', text, cls); b.type = 'button'; b.onclick = action; return b; };
  const section = el('section', undefined, 'page manager-page'); section.id = 'salesPage'; main.append(section);
  const warning = el('p', 'This admin connection uses HTTP. Passwords and conversations are not encrypted in transit.', 'transport-warning'); warning.hidden = location.protocol === 'https:'; main.prepend(warning);
  const logout = button('Sign out', async () => { await fetch('/api/admin/logout', { method: 'POST' }); location.assign('/admin/login'); });
  nav.parentElement.append(logout);
  const titles = { promotions: 'Promotions', knowledge: 'Sales Knowledge', branches: 'Branches', conversations: 'Conversations' };
  let active = '', generation = 0;
  async function api(url, options) {
    const response = await fetch('/api/admin/' + url, options);
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(data?.error || 'Request failed. Please retry.');
    return data;
  }
  function showError(error) { toast(error.message, true); }
  function field(form, name, label, type = 'text', value = '', options) {
    const wrapper = el('label', label), input = el(type === 'textarea' ? 'textarea' : type === 'select' ? 'select' : 'input');
    input.name = name;
    if (type === 'select') for (const [v, title] of options) { const o = el('option', title); o.value = v; input.append(o); }
    else if (type !== 'textarea') input.type = type;
    if (type === 'checkbox') input.checked = value !== false; else input.value = value ?? '';
    if (type === 'number') input.min = '0';
    if (['text', 'textarea'].includes(type)) input.maxLength = type === 'textarea' ? 5000 : 500;
    wrapper.append(input); form.append(wrapper); return input;
  }
  function formData(form) {
    const result = {};
    for (const input of form.elements) {
      if (!input.name) continue;
      const [key, sub] = input.name.split('.'), value = input.type === 'checkbox' ? input.checked : input.value;
      if (sub) (result[key] ||= {})[sub] = value; else result[key] = value;
    }
    return result;
  }
  async function openPage(kind) {
    const current = ++generation; active = kind;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); section.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.manager === kind));
    document.getElementById('pageTitle').textContent = titles[kind];
    document.getElementById('pageSubtitle').textContent = kind === 'conversations' ? 'Messages and visitor IPs are retained until you delete them.' : 'Published changes are available to the assistant immediately.';
    document.getElementById('topAction').hidden = true;
    section.replaceChildren(el('p', 'Loading…'));
    try {
      if (kind === 'conversations') return await conversations(current);
      const [records, vehicles] = await Promise.all([api(kind), kind === 'promotions' ? api('content/models') : Promise.resolve([])]);
      if (current !== generation) return;
      section.replaceChildren();
      const toolbar = el('div', undefined, 'manager-toolbar');
      toolbar.append(el('h2', titles[kind]), button('Add ' + (kind === 'knowledge' ? 'knowledge entry' : kind === 'promotions' ? 'promotion' : 'branch'), () => editRecord(kind, {}, vehicles), 'primary'));
      section.append(toolbar);
      const list = el('div', undefined, 'record-list'); section.append(list);
      if (!records.length) list.append(el('p', 'No records yet. Add your first entry to give the assistant verified information.', 'empty-state'));
      for (const record of records) {
        const row = el('article', undefined, 'record-row'), copy = el('div'), actions = el('div', undefined, 'manager-actions');
        copy.append(el('h3', record.name || record.title), el('p', kind === 'promotions' ? `${record.discount?.description || 'No discount'} · ${record.cashback?.description || 'No benefit'}` : record.answer || record.address));
        copy.append(el('small', `${record.published ? 'Published' : 'Hidden'}${kind === 'promotions' ? ` · ${record.starts_at || 'Any start'} to ${record.ends_at || 'No expiry'}` : ''}`));
        actions.append(button('Edit', () => editRecord(kind, record, vehicles)), button('Delete', async () => {
          if (!confirm('Permanently delete this record?')) return;
          try { await api(kind + '/' + encodeURIComponent(record.id), { method: 'DELETE' }); toast('Record deleted'); openPage(kind); } catch (e) { showError(e); }
        }, 'secondary danger'));
        row.append(copy, actions); list.append(row);
      }
    } catch (e) { section.replaceChildren(el('p', e.message, 'form-message error'), button('Retry', () => openPage(kind))); }
  }
  function editRecord(kind, record, vehicles) {
    section.replaceChildren();
    section.append(button('Back to ' + titles[kind], () => openPage(kind)), el('h2', (record.id ? 'Edit ' : 'Add ') + (record.name || record.title || titles[kind])));
    const form = el('form', undefined, 'manager-form');
    if (kind === 'promotions') {
      field(form, 'model', 'Vehicle', 'select', record.model || vehicles[0]?.id, vehicles.map(v => [v.id, v.name + (v.published ? '' : ' (hidden)')])).required = true;
      for (const key of ['discount', 'cashback']) {
        field(form, key + '.type', key === 'discount' ? 'Discount type' : 'Benefit type', 'select', record[key]?.type || 'none', ['none', 'cash', 'percentage', 'trade_in', 'service_credit', 'charging_credit', 'accessories'].map(v => [v, v.replaceAll('_', ' ')]));
        field(form, key + '.amount', key === 'discount' ? 'Discount amount (RM or %)' : 'Benefit value (RM)', 'number', record[key]?.amount || 0).step = '0.01';
        field(form, key + '.description', key === 'discount' ? 'Discount description' : 'Benefit description', 'textarea', record[key]?.description || '');
      }
      field(form, 'starts_at', 'Starts on (Malaysia date)', 'date', record.starts_at); field(form, 'ends_at', 'Ends on (Malaysia date)', 'date', record.ends_at);
      field(form, 'terms', 'Terms and conditions', 'textarea', record.terms);
    } else if (kind === 'branches') {
      for (const [name, label] of [['name', 'Branch name'], ['city', 'City'], ['state', 'State'], ['address', 'Address'], ['phone', 'Phone'], ['hours', 'Opening hours'], ['mapUrl', 'Map URL']]) field(form, name, label, name === 'address' ? 'textarea' : name === 'mapUrl' ? 'url' : 'text', record[name]).required = ['name', 'address'].includes(name);
    } else {
      field(form, 'category', 'Category', 'select', record.category || 'faq', [['faq', 'FAQ'], ['warranty', 'Warranty'], ['service', 'Service'], ['charging', 'Charging'], ['contact', 'Contact / fallback'], ['test_drive', 'Test drives']]);
      field(form, 'title', 'Question or title', 'text', record.title).required = true;
      field(form, 'answer', 'Authoritative answer (English)', 'textarea', record.answer).required = true;
      field(form, 'sort_order', 'Display order', 'number', record.sort_order || 0);
    }
    field(form, 'published', 'Published — available to website visitors and the assistant', 'checkbox', record.published);
    const submit = el('button', 'Save changes', 'primary'), message = el('p', undefined, 'form-message'); submit.type = 'submit'; message.setAttribute('role', 'status'); form.append(submit, message);
    form.onsubmit = async event => {
      event.preventDefault(); submit.disabled = true; message.textContent = 'Saving…';
      try { await api(kind + (record.id ? '/' + encodeURIComponent(record.id) : ''), { method: record.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData(form)) }); toast('Changes saved'); await openPage(kind); }
      catch (e) { message.textContent = e.message; }
      finally { submit.disabled = false; }
    };
    section.append(form); form.querySelector('input,select,textarea')?.focus();
  }
  async function conversations(current) {
    section.replaceChildren();
    const filters = el('form', undefined, 'conversation-filters');
    field(filters, 'search', 'Search messages'); field(filters, 'ip', 'Visitor IP');
    field(filters, 'from', 'From (UTC)', 'date'); field(filters, 'to', 'To (UTC)', 'date');
    field(filters, 'language', 'Language', 'select', '', [['', 'All'], ['en', 'English'], ['ms', 'Bahasa Malaysia'], ['zh', 'Chinese']]);
    field(filters, 'status', 'Status', 'select', '', [['', 'All'], ['completed', 'Completed'], ['error', 'Error'], ['pending', 'Pending']]);
    field(filters, 'fallback', 'Fallback answer', 'select', '', [['', 'All'], ['true', 'Yes'], ['false', 'No']]);
    const apply = el('button', 'Apply filters', 'primary'); apply.type = 'submit'; filters.append(apply);
    const actions = el('div', undefined, 'manager-actions'), listing = el('div'), detail = el('div', undefined, 'transcript');
    let page = 1; const selected = new Set();
    async function deleteSelected(all = false) {
      let confirmation;
      if (all) { confirmation = prompt('Permanently delete every conversation? Type DELETE ALL CONVERSATIONS to confirm.'); if (confirmation !== 'DELETE ALL CONVERSATIONS') return; }
      else if (!selected.size || !confirm(`Permanently delete ${selected.size} selected conversation(s)?`)) return;
      try { const result = await api('conversations/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(all ? { all, confirmation } : { ids: [...selected] }) }); toast(`${result.deleted} conversation(s) deleted. Backups expire within 30 days.`); selected.clear(); detail.replaceChildren(); await load(); } catch (e) { showError(e); }
    }
    actions.append(button('Delete selected', () => deleteSelected(), 'secondary danger'), button('Delete all conversations', () => deleteSelected(true), 'secondary danger'));
    section.append(filters, actions, listing, detail);
    async function transcript(id) {
      try {
        const conversation = await api('conversations/' + encodeURIComponent(id));
        if (active !== 'conversations') return;
        detail.replaceChildren(el('h2', 'Conversation'), el('p', `${conversation.ip} · ${conversation.id}`));
        detail.append(button('Delete this conversation', async () => {
          if (!confirm('Permanently delete this conversation and its messages?')) return;
          try { await api('conversations/' + encodeURIComponent(id), { method: 'DELETE' }); detail.replaceChildren(); toast('Conversation deleted'); await load(); } catch (e) { showError(e); }
        }, 'secondary danger'));
        for (const m of conversation.messages) {
          const entry = el('article', undefined, 'transcript-message');
          entry.append(el('h3', m.role === 'user' ? 'Visitor' : 'Assistant'), el('small', `${new Date(m.created_at).toLocaleString()} · ${m.language} · ${m.status}`), el('p', m.content));
          if (m.role === 'assistant') entry.append(el('small', `Model: ${m.model || '—'} · ${m.latency_ms ?? '—'} ms · Fallback: ${m.fallback ? 'Yes' : 'No'} · Tokens: ${m.usage?.total_tokens ?? '—'}`), el('p', 'Sources: ' + (m.sources.map(s => `${s.label} (${s.type}: ${s.id})`).join(', ') || 'None')));
          detail.append(entry);
        }
        detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) { showError(e); }
    }
    async function load() {
      listing.textContent = 'Loading conversations…';
      try {
        const params = new URLSearchParams(new FormData(filters)); params.set('page', page);
        const data = await api('conversations?' + params);
        if (current !== generation) return;
        listing.replaceChildren(el('p', `${data.total} conversation(s) · Page ${data.page} of ${Math.max(1, Math.ceil(data.total / data.limit))}`));
        if (!data.items.length) listing.append(el('p', 'No conversations match these filters.', 'empty-state'));
        for (const row of data.items) {
          const entry = el('div', undefined, 'conversation-row'), check = el('input'); check.type = 'checkbox'; check.checked = selected.has(row.id); check.setAttribute('aria-label', 'Select conversation ' + row.id); check.onchange = () => check.checked ? selected.add(row.id) : selected.delete(row.id);
          entry.append(check, button(`${row.ip} · ${new Date(row.updated_at).toLocaleString()} · ${row.language} · ${row.status} · ${row.message_count} messages`, () => transcript(row.id), 'conversation-open')); listing.append(entry);
        }
        const pager = el('div', undefined, 'manager-actions'), previous = button('Previous', () => { page--; load(); }), next = button('Next', () => { page++; load(); }); previous.disabled = page <= 1; next.disabled = page * data.limit >= data.total; pager.append(previous, next); listing.append(pager);
      } catch (e) { listing.replaceChildren(el('p', e.message), button('Retry', load)); }
    }
    filters.onsubmit = event => { event.preventDefault(); page = 1; selected.clear(); load(); };
    await load();
  }
  for (const [kind, title] of Object.entries(titles)) {
    const b = button(title, () => openPage(kind), 'nav-item'); b.dataset.manager = kind; nav.append(b);
  }
  document.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => { active = ''; generation++; document.getElementById('topAction').hidden = false; }));
})();
