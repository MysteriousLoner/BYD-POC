const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'byd-feedback-'));
Object.assign(process.env, { DB_PATH:path.join(dir,'preview.sqlite'), UPLOAD_DIR:path.join(dir,'uploads'), ADMIN_USERNAME:'feedback-editor', ADMIN_PASSWORD:'feedback-test-password-123', PUBLIC_ORIGIN:'http://localhost' });
const store = require('../server/database');
const update = require('../server/apply-client-feedback');
const { publicBranch, validateSocialLinks } = require('../server/public-dealership');
let server, origin, headers;
before(async () => {
  server = require('../server/index').createApp().listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve)); origin = 'http://127.0.0.1:' + server.address().port;
  const login = await fetch(origin+'/api/admin/login',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify({username:'feedback-editor',password:'feedback-test-password-123'})});
  assert.equal(login.status,200); headers = { Origin:'http://localhost', Cookie:login.headers.get('set-cookie').split(';')[0], 'X-CSRF-Token':(await login.json()).csrf, 'Content-Type':'application/json' };
});
after(async () => { await new Promise(resolve => server.close(resolve)); store.db.close(); fs.rmSync(dir,{recursive:true,force:true}); });
const html = async route => (await fetch(origin+route)).text();
test('fresh homepage has no hero wrapper, blank stage or embedded video; future published slides still work', async () => {
  assert.equal(store.list('hero_slides').length,0);
  const home = await html('/');
  assert.doesNotMatch(home,/class="wp-home-slider"|data-id="f058ff5"|youtube-nocookie|<video\b/);
  assert.match(home,/78b641ebdd0feb54.webp/); assert.match(home,/wp-home-faq/);
  const slide = {id:'future',headline:'Future campaign',mediaUrl:'/assets/placeholder.svg',published:true,buttons:[]};
  store.save('hero_slides',slide); assert.match(await html('/'),/class="wp-home-slider"/); store.remove('hero_slides',slide.id);
});
test('Contact and branch API share only published managed records and valid directions; About preserves the agreed sequence', async () => {
  const original = store.list('branches')[0];
  store.save('branches',{...original,name:'Managed branch & showroom',address:'Address <script>alert(1)</script>',published:true,privateNote:'Do not publish'});
  try {
    const branches = await (await fetch(origin+'/api/content/branches')).json(), branch = branches.find(item => item.id === original.id);
    assert.equal(branch.privateNote,undefined); assert.equal(branch.email,original.email);
    assert.equal(new URL(branch.mapUrl).searchParams.get('api'),'1'); assert(new URL(branch.wazeUrl).searchParams.get('q').includes(branch.address));
    const contact = await html('/contact'); assert.match(contact,/Managed branch &amp; showroom/); assert.match(contact,/&lt;script&gt;/); assert.match(contact,/id="enquiryForm"/); assert.equal((contact.match(/class="wp-branch-card"/g)||[]).length,4); assert.doesNotMatch(contact,/Do not publish|COMING SOO/);
    store.save('branches',{...original,published:false}); assert(!(await html('/contact')).includes('id="branch-'+original.id+'"')); assert(!(await (await fetch(origin+'/api/content/branches')).json()).some(branch => branch.id === original.id));
  } finally { store.save('branches',original); }
  const about = await html('/about'); const sections = ['Your one-stop automotive destination','Beyond expectations','Our vision','Our mission','Our values','Discover BYD the Autobeyond way.'];
  assert(sections.every((section,i) => about.indexOf(section)>0 && (!i || about.indexOf(section)>about.indexOf(sections[i-1]))));
  assert.doesNotMatch(about,/4070d465b2df47ab.webp/);
});
test('branch edits preserve existing metadata and reject unsafe URLs', async () => {
  const branch = store.list('branches')[0]; store.save('branches',{...branch,customField:'Preserve existing metadata'});
  try {
    for (const change of [{wazeUrl:'javascript:alert(1)'},{mapUrl:'https://user:password@example.test'},{image:'data:text/html,x'},{email:'invalid'}]) {
      assert.equal((await fetch(origin+'/api/admin/branches/'+branch.id,{method:'PUT',headers,body:JSON.stringify(change)})).status,400);
    }
    const response = await fetch(origin+'/api/admin/branches/'+branch.id,{method:'PUT',headers,body:JSON.stringify({phone:'012-1234567',wazeUrl:'https://waze.com/ul?q=showroom'})});
    assert.equal(response.status,200); const saved = await response.json(); assert.equal(saved.customField,'Preserve existing metadata'); assert.equal(saved.image,branch.image); assert.equal(saved.published,true);
  } finally { store.save('branches',branch); }
});
test('social links require authentication and CSRF, validate safely, and appear across public pages only when configured', async () => {
  assert.equal((await fetch(origin+'/api/admin/social-links')).status,401);
  assert.equal((await fetch(origin+'/api/admin/social-links',{method:'PUT',headers:{...headers,'X-CSRF-Token':''},body:'{}'})).status,403);
  for (const value of ['javascript:alert(1)','//example.test','https://example.test\\@evil.test','https://user:secret@example.test']) assert.throws(()=>validateSocialLinks({tiktokUrl:value}));
  assert.equal((await fetch(origin+'/api/admin/social-links',{method:'PUT',headers,body:JSON.stringify({tiktokUrl:'javascript:alert(1)'})})).status,400);
  assert.doesNotMatch(await html('/contact'),/data-social=/);
  const links = { tiktokUrl:'https://www.tiktok.com/@fixture',xhsUrl:'https://www.xiaohongshu.com/user/profile/fixture',googleReviewUrl:'https://g.page/r/fixture/review' };
  assert.equal((await fetch(origin+'/api/admin/social-links',{method:'PUT',headers,body:JSON.stringify(links)})).status,200);
  assert.deepEqual(await (await fetch(origin+'/api/admin/social-links',{headers})).json(),links);
  for (const route of ['/','/contact','/about','/events','/models','/stories/byd-year-end-carnival-2026']) assert.equal(((await html(route)).match(/data-social=/g)||[]).length,3,route);
  await fetch(origin+'/api/admin/social-links',{method:'PUT',headers,body:'{}'}); assert.doesNotMatch(await html('/'),/data-social=/);
});
test('explicit content update verifies identity, rejects stale plans, backs up, and never re-hides later staff changes', async () => {
  const originalNews = store.readJson('news.json'), originalBranches = store.list('branches');
  const legacy = require('./fixtures/legacy-seed/news.json');
  store.writeJson('news.json',[...originalNews,...legacy]);
  store.save('hero_slides',{id:'old-video',headline:'Old video',mediaType:'video',mediaUrl:'https://www.youtube.com/watch?v=abcdefghijk',published:true});
  const branch = originalBranches[0]; store.save('branches',{...branch,phone:'Staff phone',image:''});
  try {
    const reviewed = update.plan(store); assert.deepEqual(reviewed.slidesToUnpublish,['old-video']); assert.equal(reviewed.storyToUnpublish,'2');
    store.save('branches',{...store.list('branches')[0],hours:'Staff hours'}); assert.throws(()=>update.apply(store,reviewed.currentFingerprint),/changed since preview/); assert.equal(store.list('hero_slides')[0].published,true);
    const cli = ['server/apply-client-feedback.js'];
    const preview = spawnSync(process.execPath,cli,{cwd:path.resolve(__dirname,'..'),env:process.env,encoding:'utf8'}); assert.equal(preview.status,0,preview.stderr);
    const plan = JSON.parse(preview.stdout); const applied = spawnSync(process.execPath,[...cli,'--apply','--expected',plan.currentFingerprint],{cwd:path.resolve(__dirname,'..'),env:process.env,encoding:'utf8'}); assert.equal(applied.status,0,applied.stderr);
    const result = JSON.parse(applied.stdout); assert.equal(fs.statSync(result.backupPath).mode & 0o777,0o600);
    assert.equal(store.list('hero_slides')[0].published,false); const hidden = store.readJson('news.json').find(item=>item.id==='2'); assert.equal(hidden.published,false);
    assert.equal((await fetch(origin+'/stories/2')).status,404); assert(!(await html('/events/press')).includes('/stories/2"')); assert(!(await (await fetch(origin+'/api/content/news')).json()).some(item=>item.id==='2'));
    assert.deepEqual(store.readJson('news.json').filter(item=>item.id!=='2'),[...originalNews,...legacy].filter(item=>item.id!=='2'));
    const updatedBranch = store.list('branches').find(item=>item.id===branch.id); assert.equal(updatedBranch.phone,'Staff phone'); assert.equal(updatedBranch.hours,'Staff hours'); assert.equal(updatedBranch.image,branch.image);
    store.save('hero_slides',{id:'future-staff',headline:'Fresh content',published:true});
    assert.equal(update.apply(store,update.plan(store).currentFingerprint).applied,false); assert.equal(store.list('hero_slides').find(item=>item.id==='future-staff').published,true);
    store.db.prepare('DELETE FROM documents WHERE name=?').run(update.MARKER); store.writeJson('news.json',[{...legacy[1],title:'Different staff story'}]); assert.throws(()=>update.plan(store),/does not match/);
  } finally {
    for (const slide of store.list('hero_slides')) store.remove('hero_slides',slide.id);
    store.writeJson('news.json',originalNews); originalBranches.forEach(branch=>store.save('branches',branch)); store.db.prepare('DELETE FROM documents WHERE name=?').run(update.MARKER);
  }
});
