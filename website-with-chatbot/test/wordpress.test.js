const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'byd-wordpress-'));
Object.assign(process.env,{DB_PATH:path.join(dir,'preview.sqlite'),UPLOAD_DIR:path.join(dir,'uploads'),ADMIN_USERNAME:'wordpress-test',ADMIN_PASSWORD:'wordpress-test-password-123',PUBLIC_ORIGIN:'http://localhost'});
const store=require('../server/database');const {createApp}=require('../server/index');let server,origin;
before(async()=>{server=createApp().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));origin='http://127.0.0.1:'+server.address().port});
after(async()=>{await new Promise(r=>server.close(r));store.db.close();fs.rmSync(dir,{recursive:true,force:true})});
const post=(url,body)=>fetch(origin+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('copied WordPress routes, local assets and public archives remain available without private source exposure',async()=>{
 for(const route of ['/','/models','/compare','/about','/contact','/careers','/events','/events/events','/events/press','/events/articles','/models/byd-sea-lion','/stories/byd-year-end-carnival-2026']){const response=await fetch(origin+route);assert.equal(response.status,200,route);assert.match(response.headers.get('x-robots-tag'),/noindex/);const html=await response.text();assert.match(html,/wordpress.css/);assert.doesNotMatch(html,/<script[^>]+src="https:\/\/millennium/)}
 const html=await(await fetch(origin+'/')).text();const url=html.match(/href="(\/assets\/wordpress\/[a-f0-9]+\.css)"/)[1];const asset=await fetch(origin+url);assert.equal(asset.status,200);assert.match(asset.headers.get('cache-control'),/immutable/);
 for(const route of ['/content/wordpress/home.html','/wordpress-source/home.json','/server/data/models.json','/.env'])assert.equal((await fetch(origin+route)).status,404);
 assert.equal((await fetch(origin+'/home/contact/',{redirect:'manual'})).headers.get('location'),'/contact');
 assert.equal(store.readJson('news.json').length,63);assert.equal(store.list('vehicles').length,6);assert.equal(store.readJson('submissions/enquiries.json').length,0);assert.equal(store.readJson('submissions/careers.json').length,0);
});
test('publication settings filter copied navigation, model pages, archives and direct article links',async()=>{
 const model=store.list('vehicles')[0],news=store.readJson('news.json')[0];store.save('vehicles',{...model,published:false});const stories=store.readJson('news.json');store.writeJson('news.json',stories.map(s=>s.id===news.id?{...s,published:false}:s));
 assert.equal((await fetch(origin+'/models/'+model.id)).status,404);const home=await(await fetch(origin+'/')).text();assert(!home.includes('data-managed-model="'+model.id+'"'));
 assert.equal((await fetch(origin+'/stories/'+news.id)).status,404);assert(!(await(await fetch(origin+'/events/events')).text()).includes('/stories/'+news.id+'"'));
 store.save('vehicles',model);store.writeJson('news.json',stories);
});
test('WordPress enquiry fields, consent and managed branch snapshot persist without client-supplied metadata',async()=>{
 const body={formVersion:'wordpress-copy-1',name:'WordPress Visitor',firstName:'WordPress',lastName:'Visitor',email:'visitor@example.test',phone:'0123456789',model:'BYD M6',branch:'cheras',testDrive:'Yes',consentPrivacy:true,consentMarketing:true,id:'forged',branchName:'Forged',createdAt:'forged'};
 for(const override of [{branch:''},{branch:'missing'},{email:'invalid'},{consentPrivacy:false},{consentMarketing:false}])assert.equal((await post('/api/content/enquiries',{...body,...override})).status,400);
 assert.equal((await post('/api/content/enquiries',body)).status,201);const entry=store.readJson('submissions/enquiries.json').at(-1);assert.equal(entry.branchName,'BYD Cheras');assert.equal(entry.testDrive,'Yes');assert.equal(entry.firstName,'WordPress');assert.equal(entry.consentPrivacy,true);assert.notEqual(entry.id,'forged');assert.notEqual(entry.createdAt,'forged');
});
test('WordPress employment fields and résumé remain private; rejected requests clean up uploaded files',async()=>{
 const make=(valid)=>{const data=new FormData();for(const [key,value]of Object.entries({formVersion:'wordpress-copy-1',name:'WordPress Applicant',firstName:'WordPress',lastName:'Applicant',email:'applicant@example.test',phone:'0123456789',position:'SALES ADVISOR / SALES CONSULTANT',branchId:'cheras',consentPrivacy:String(valid),consentMarketing:'true'}))data.set(key,value);data.set('resume',new Blob(['%PDF-1.4 fixture'],{type:'application/pdf'}),'resume.pdf');return data};
 assert.equal((await fetch(origin+'/api/content/careers',{method:'POST',body:make(false)})).status,400);assert.equal(fs.readdirSync(process.env.UPLOAD_DIR).length,0);
 assert.equal((await fetch(origin+'/api/content/careers',{method:'POST',body:make(true)})).status,201);const record=store.readJson('submissions/careers.json').at(-1);assert.equal(record.phone,'0123456789');assert.equal(record.branchName,'BYD Cheras');assert.equal(record.consentPrivacy,true);assert.equal((await fetch(origin+record.resume)).status,404);assert.equal((await fetch(origin+'/api/admin/submissions/careers/'+record.id+'/resume')).status,401);
});
