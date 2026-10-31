(() => {
  'use strict';
  const main = document.querySelector('.admin-main'), nav = document.querySelector('.sidebar nav');
  const section = document.createElement('section'); section.className = 'page submissions-page'; section.id = 'submissionsPage'; main.append(section);
  const names = { enquiries: 'Enquiries', careers: 'Job applications' };
  const state = { enquiries: { search: '', page: 1 }, careers: { search: '', page: 1 } };
  const node = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
  const button = (label, action, cls = 'secondary') => { const el = node('button', label, cls); el.type = 'button'; el.onclick = action; return el; };
  let generation = 0;
  function date(value) {
    if (!value) return 'Date unavailable';
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(parsed);
  }
  async function api(url) {
    const response = await fetch('/api/admin/submissions/' + url);
    const data = await response.json(); if (!response.ok) throw Error(data.error || 'Submissions couldn’t load. Please retry.'); return data;
  }
  function activate(kind) {
    document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el === section));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.submissions === kind));
    document.getElementById('pageTitle').textContent = names[kind];
    document.getElementById('pageSubtitle').textContent = 'Review submitted details. Dates are shown in Malaysia time.';
    document.getElementById('topAction').hidden = true;
  }
  async function open(kind, focusId) {
    activate(kind); const current = ++generation, saved = state[kind];
    section.replaceChildren();
    const filters = node('form', undefined, 'submission-search');
    const label = node('label', kind === 'enquiries' ? 'Search name, contact details, model or branch' : 'Search name, email, position or branch');
    const input = node('input'); input.type = 'search'; input.name = 'search'; input.value = saved.search; input.maxLength = 500; label.append(input);
    const search = node('button', 'Search', 'primary'); search.type = 'submit';
    filters.append(label, search, button('Clear', () => { saved.search = ''; saved.page = 1; open(kind); })); section.append(filters);
    const results = node('div', undefined, 'submission-results'); results.setAttribute('aria-live', 'polite'); section.append(results);
    filters.onsubmit = event => { event.preventDefault(); saved.search = input.value.trim(); saved.page = 1; open(kind); };
    results.append(node('p', 'Loading submissions…', 'empty-state'));
    try {
      const data = await api(kind + '?' + new URLSearchParams({ search: saved.search, page: saved.page }));
      if (current !== generation) return;
      saved.page = data.page; results.replaceChildren(node('p', `${data.total} ${kind === 'enquiries' ? (data.total === 1 ? 'enquiry' : 'enquiries') : (data.total === 1 ? 'application' : 'applications')}`, 'submission-count'));
      if (!data.items.length) results.append(node('p', saved.search ? 'No submissions match your search. Try a name, email or branch, or clear the search.' : `No ${names[kind].toLowerCase()} yet. Submitted forms will appear here.`, 'empty-state'));
      const list = node('div', undefined, 'submission-list'); results.append(list);
      for (const record of data.items) {
        const row = button('', () => detail(kind, record.id), 'submission-row'); row.dataset.submissionId = record.id;
        const who = node('div', undefined, 'submission-person'); who.append(node('strong', record.name || 'Name not provided'), node('span', record.email || record.phone || 'Contact not provided'));
        const context = node('div', undefined, 'submission-context'); context.append(node('span', (kind === 'enquiries' ? record.model : record.position) || 'Not provided'), node('small', record.branchName || 'Branch not provided'));
        const when = node('time', date(record.createdAt)); if (record.createdAt && !Number.isNaN(Date.parse(record.createdAt))) when.dateTime = record.createdAt;
        const action = node('span', 'View details', 'submission-open'); row.append(who, context, when, action); list.append(row);
        if (record.id === focusId) row.focus();
      }
      if (data.total) {
        const pager = node('nav', undefined, 'submission-pagination'); pager.setAttribute('aria-label', names[kind] + ' pages');
        const prev = button('Previous', () => { saved.page--; open(kind); }), next = button('Next', () => { saved.page++; open(kind); });
        prev.disabled = data.page <= 1; next.disabled = data.page * data.limit >= data.total;
        pager.append(prev, node('span', `Page ${data.page} of ${Math.ceil(data.total / data.limit)}`), next); results.append(pager);
      }
    } catch (error) {
      if (current !== generation) return;
      results.replaceChildren(node('p', error.message, 'form-message error'), button('Retry submissions', () => open(kind)));
    }
  }
  async function detail(kind, id) {
    const current = ++generation;
    section.replaceChildren(button('Back to results', () => open(kind, id)), node('p', 'Loading submitted details…', 'empty-state'));
    try {
      const record = await api(kind + '/' + encodeURIComponent(id)); if (current !== generation) return;
      const heading = node('h2', record.name || 'Submitted details'); heading.tabIndex = -1;
      const header = node('div', undefined, 'submission-detail-heading'); header.append(heading, node('p', `Received ${date(record.createdAt)}`));
      const fields = node('dl', undefined, 'submission-fields');
      const labels = { name: 'Full name', email: 'Email address', phone: 'Phone number', model: 'Model', position: 'Position of interest', branchName: 'Preferred branch', message: 'Message', testDrive: 'Test drive requested', consentMarketing: 'Marketing consent', consentPrivacy: 'Privacy acknowledgement' };
      const keys = [...new Set([...Object.keys(labels), ...Object.keys(record)])];
      for (const key of keys) {
        if (['id','createdAt','branch','branchId','hasResume','resumeDownloadUrl'].includes(key) || (key === 'position' && kind !== 'careers') || (['phone','model'].includes(key) && kind === 'careers' && !record[key])) continue;
        const label = labels[key] || key.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ');
        const row = node('div'); row.append(node('dt', label), node('dd', typeof record[key] === 'object' && record[key] !== null ? JSON.stringify(record[key]) : typeof record[key] === 'boolean' ? (record[key] ? 'Yes' : 'No') : String(record[key] || 'Not provided'))); fields.append(row);
      }
      section.replaceChildren(button('Back to results', () => open(kind, id)), header, fields);
      if (kind === 'careers') {
        const resume = node('div', undefined, 'submission-resume'); resume.append(node('h3', 'Résumé'));
        if (record.hasResume) {
          const download = node('button', 'Download résumé', 'primary'); download.type = 'button';
          const feedback = node('p', '', 'form-message'); feedback.setAttribute('role', 'status');
          download.onclick = async () => {
            download.disabled = true; feedback.textContent = 'Preparing download…';
            try {
              const response = await fetch(record.resumeDownloadUrl);
              if (!response.ok) { const error = await response.json(); throw Error(error.error || 'The résumé could not be downloaded. Please retry.'); }
              const url = URL.createObjectURL(await response.blob()), link = node('a'); link.href = url; link.download = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || 'resume'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); feedback.textContent = 'Résumé downloaded.';
            } catch (error) { feedback.textContent = error.message; }
            finally { download.disabled = false; }
          };
          resume.append(download, feedback);
        } else resume.append(node('p', 'No résumé is attached to this saved application.'));
        section.append(resume);
      }
      window.scrollTo(0, 0); heading.focus({ preventScroll: true });
    } catch (error) { if (current === generation) section.replaceChildren(button('Back to results', () => open(kind)), node('p', error.message, 'form-message error'), button('Retry details', () => detail(kind, id))); }
  }
  const group = node('span', 'Submissions', 'nav-group-label'); nav.append(group);
  for (const [kind, title] of Object.entries(names)) {
    const item = button('', () => open(kind), 'nav-item'); item.dataset.submissions = kind;
    const icon = node('span', undefined, 'nav-icon'); icon.innerHTML = BYDIcons[kind === 'enquiries' ? 'mail' : 'document'];
    item.append(icon, node('span', title, 'nav-label')); item.title = title; nav.append(item);
    document.querySelectorAll(`[data-open-submissions="${kind}"]`).forEach(el => el.onclick = () => open(kind));
  }
  nav.addEventListener('click', event => { if (event.target.closest('button') && !event.target.closest('[data-submissions]')) { generation++; } });
})();
