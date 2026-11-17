const { test } = require('node:test');
const assert = require('node:assert/strict');
const { newsPage } = require('../server/news-pages');
test('news pages retain publication, date ordering, categories and sparse empty states', () => {
  const records = [
    { id:'old', title:'Older event', category:'Event', date:'2026-01-01', published:true },
    { id:'hidden', title:'Hidden event', category:'Event', date:'2026-12-01', published:false },
    { id:'new', title:'Newer <event>', category:'Event', date:'2026-11-01', published:true },
    { id:'press', title:'Press story', category:'News', date:'2026-11-02', published:true }
  ];
  const before = JSON.stringify(records), html = newsPage('events', records);
  assert(html.indexOf('/stories/new') < html.indexOf('/stories/old'));
  assert(!html.includes('/stories/hidden'));
  assert(html.includes('Newer &lt;event&gt;'));
  assert(html.includes('No stories here yet. Please check back soon.'));
  assert(newsPage('events-archive', records).includes('/stories/new'));
  assert(!newsPage('events-archive', records).includes('/stories/press'));
  assert(newsPage('press-archive', records).includes('/stories/press'));
  assert.equal(newsPage('unrelated', records), null);
  assert.equal(JSON.stringify(records), before);
});
