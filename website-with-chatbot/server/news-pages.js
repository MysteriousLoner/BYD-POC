const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const archives = {
  'events-archive': { title: 'EVENTS', category: 'Event', route: '/events/events', columns: 4 },
  'press-archive': { title: 'PRESS', category: 'News', route: '/events/press', columns: 3 },
  'articles-archive': { title: 'ARTICLES', category: 'Article', route: '/events/articles', columns: 3 }
};
function publishedStories(records, category) {
  return records.filter(record => record.published !== false && (!category || record.category === category)).sort((a,b) => String(b.date).localeCompare(String(a.date)));
}
function storyCard(record, columns = 4) {
  const url = '/stories/' + encodeURIComponent(record.id);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(record.date) ? new Date(record.date + 'T12:00:00+08:00').toLocaleDateString('en-MY', { day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Kuala_Lumpur' }) : record.date;
  const summary = String(record.summary || '');
  const excerpt = summary.length > 180 ? summary.slice(0,180).replace(/\s+\S*$/, '') + '…' : summary;
  return `<div class="col-lg-${columns} col-md-6"><article class="elementskit-post-image-card"><div class="elementskit-entry-header"><a href="${url}" class="elementskit-entry-thumb"><img src="${escape(record.image || '/assets/placeholder.svg')}" alt="${escape(record.title)}" loading="lazy" decoding="async" width="800" height="450"></a></div><div class="elementskit-post-body"><div class="post-meta-list"><span class="meta-date"><span class="meta-date-text">${escape(date)}</span></span></div><h2 class="entry-title"><a href="${url}">${escape(record.title)}</a></h2>${record.category === 'Article' ? `<p class="elementskit-post-excerpt">${escape(excerpt)}</p>` : ''}<div class="btn-wraper"><a class="elementskit-btn whitespace--normal" href="${url}">Read more</a></div></div></article></div>`;
}
function newsPage(name, records) {
  const hub = name === 'events';
  if (!hub && !archives[name]) return null;
  const published = publishedStories(records);
  function section(config, index) {
    const entries = published.filter(record => record.category === config.category);
    const visible = hub ? entries.slice(0,3) : entries;
    const heading = hub ? `<div class="wp-news-section-heading"><h2 id="news-section-${index}">${config.title}</h2><a class="wp-action" href="${config.route}">VIEW ALL<span class="screen-reader-text"> ${config.title.toLowerCase()}</span></a></div>` : '';
    const cards = visible.map(record => storyCard(record, hub ? 4 : 12 / config.columns)).join('');
    const scrollable = hub && visible.length > 1;
    const hint = scrollable ? `<p class="wp-news-scroll-hint" id="news-scroll-${index}">Swipe to browse ${config.title.toLowerCase()}</p>` : '';
    return `<section class="wp-news-section"${hub ? ` aria-labelledby="news-section-${index}"` : ''}>${heading}${hint}<div class="post-items wp-news-grid" style="--wp-news-columns:${hub ? 3 : config.columns}"${scrollable ? ` tabindex="0" role="region" aria-label="${config.title.toLowerCase()} stories" aria-describedby="news-scroll-${index}"` : ''}>${cards || '<p class="wp-empty">No stories here yet. Please check back soon.</p>'}</div></section>`;
  }
  const heading = hub
    ? '<section class="wp-news-hero"><img src="/assets/wordpress/3b0e72b663ed5c2f.webp" alt="" width="1600" height="550" decoding="async"><div class="wp-news-hero-copy"><h1>NEWS &amp; EVENTS</h1></div></section>'
    : `<header class="wp-news-archive-heading"><a class="wp-news-back" href="/events">News &amp; events</a><h1>${archives[name].title}</h1></header>`;
  return `<main id="main" class="site-main clr wp-news-page${hub ? ' wp-news-hub' : ''}">${heading}${(hub ? Object.values(archives) : [archives[name]]).map(section).join('')}</main>`;
}
module.exports = { newsPage, storyCard, publishedStories };
