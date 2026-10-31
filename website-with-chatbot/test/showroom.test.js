const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'byd-showroom-'));
Object.assign(process.env,{ DB_PATH:path.join(dir,'test.sqlite'), UPLOAD_DIR:path.join(dir,'uploads'), ADMIN_USERNAME:'editor', ADMIN_PASSWORD:'local-test-password-123', PUBLIC_ORIGIN:'http://localhost' });
process.env.SEED_DIR = path.join(__dirname, 'fixtures', 'legacy-seed');
const store = require('../server/database');
const { createApp } = require('../server/index');
const { normalize, comparison } = require('../js/catalogue-data');
let server, origin, cookie, csrf;
before(async () => {
  server = createApp().listen(0,'127.0.0.1'); await new Promise(resolve => server.once('listening',resolve)); origin = 'http://127.0.0.1:'+server.address().port;
  const response = await fetch(origin+'/api/admin/login',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify({username:'editor',password:'local-test-password-123'})});
  assert.equal(response.status,200); cookie = response.headers.get('set-cookie').split(';')[0]; csrf = (await response.json()).csrf;
});
after(async () => { await new Promise(resolve => server.close(resolve)); store.db.close(); fs.rmSync(dir,{recursive:true,force:true}); });
const headers = () => ({Cookie:cookie,Origin:'http://localhost','X-CSRF-Token':csrf});
function vehicleForm(extra = {}) {
  const form = new FormData();
  for (const [key,value] of Object.entries({name:'Test catalogue',type:'Electric',price:'RM test',description:'Fixture, not a commercial vehicle.',...extra})) form.set(key,String(value));
  return form;
}
async function image(width=800,height=450,orientation) {
  let pipeline = sharp({create:{width,height,channels:3,background:'#688a9c'}});
  if (orientation) pipeline = pipeline.withMetadata({orientation});
  return pipeline.jpeg().toBuffer();
}
async function upload(url,form,method='POST',authenticated=true) {
  const response = await fetch(origin+url,{method,headers:authenticated?headers():{},body:form});
  return {status:response.status,data:await response.json()};
}
test('legacy normalization preserves specs and comparison aligns stable keys and missing values', () => {
  const one = normalize({range:'480 km',power:'150 kW'}), two = normalize({specifications:[{key:'range',label:'Range renamed',value:'400',unit:'km'},{key:'seats',label:'Seats',value:'5'}]});
  assert.equal(one.specifications[0].value,'480 km');
  const rows = comparison([one,two]); assert.deepEqual(rows.find(row => row.key==='range').values,['480 km','400 km']);
  assert.deepEqual(rows.find(row => row.key==='seats').values,['Not specified','5']);
  assert.equal(normalize({specifications:[],range:'legacy'}).specifications.length,0);
});
test('public detail routes serve direct URLs, hidden and missing vehicles return 404', async () => {
  for (const route of ['/','/models','/contact','/careers','/models/atto3','/compare?models=atto3,dolphin','/events']) assert.equal((await fetch(origin+route)).status,200,route);
  for (const route of ['/models/seal','/models/missing','/api/content/models/seal','/api/content/models/missing']) assert.equal((await fetch(origin+route)).status,404,route);
  const model = await (await fetch(origin+'/api/content/models/atto3')).json(); assert(model.specifications.some(spec => spec.key==='battery'));
  assert.equal((await fetch(origin+'/assets/atto3-blue.webp')).status,200);
  assert.equal((await fetch(origin+'/assets/sources.json')).status,200);
});
test('vehicle colours, dynamic specs and uploaded colour mappings survive updates and reopening', async () => {
  const form = vehicleForm({coloursJson:JSON.stringify([{id:'blue',name:'Blue',swatch:'#668cae',images:[]}]),specificationsJson:JSON.stringify([{key:'range',label:'Driving range',value:'480',unit:'km',group:'Performance'},{key:'seats',label:'Seats',value:'5',group:'Comfort'}])});
  form.append('colourImage_blue',new Blob([await image()],{type:'image/jpeg'}),'blue.jpg');
  const created = await upload('/api/admin/content/models',form); assert.equal(created.status,201,JSON.stringify(created.data));
  assert.match(created.data.colours[0].images[0],/^\/uploads\//); assert.equal(created.data.range,'480 km');
  const update = vehicleForm({specificationsJson:JSON.stringify([{key:'range',label:'Updated label',value:'490',unit:'km',group:'Performance'}])});
  const changed = await upload('/api/admin/content/models/'+created.data.id,update,'PUT'); assert.equal(changed.status,200); assert.equal(changed.data.colours.length,1); assert.equal(changed.data.specifications.length,1);
  const publicModel = await (await fetch(origin+'/api/content/models/'+created.data.id)).json(); assert.equal(publicModel.specifications[0].label,'Updated label');
  const stored = store.list('vehicles').find(v => v.id === created.data.id); assert.equal(stored.range,'490 km');
  const restart = spawnSync(process.execPath,['-e',`const s=require('./server/database'); console.log(JSON.stringify(s.list('vehicles').find(v=>v.id===${JSON.stringify(created.data.id)})));s.db.close()`],{cwd:path.join(__dirname,'..'),env:process.env,encoding:'utf8'});
  assert.equal(restart.status,0); assert.equal(JSON.parse(restart.stdout).colours[0].name,'Blue');
});
test('structured vehicle data rejects unsafe media, duplicate keys, malformed JSON and invalid colours', async () => {
  for (const extra of [
    {coloursJson:'not json'},
    {coloursJson:JSON.stringify([{id:'red',name:'Red',swatch:'red',images:['https://example.com/car.jpg']}])},
    {coloursJson:JSON.stringify([{id:'red',name:'Red',swatch:'#ff0000',images:['javascript:alert(1)']}])},
    {imagesJson:JSON.stringify(['https://example.com/car.jpg','/assets/../server/database.js'])},
    {specificationsJson:JSON.stringify([{key:'range',label:'Range'},{key:'range',label:'Duplicate'}])}
  ]) assert.equal((await upload('/api/admin/content/models',vehicleForm(extra))).status,400);
  assert.equal((await upload('/api/content/models',vehicleForm())).status,405);
  assert.equal((await upload('/api/admin/content/models',vehicleForm(),'POST',false)).status,401);
});
test('events persist advisory orientation dimensions, account for EXIF and filter hidden stories', async () => {
  for (const [width,height,orientation,expected] of [[450,800,undefined,[450,800]],[500,500,undefined,[500,500]],[800,450,undefined,[800,450]],[800,450,6,[450,800]]]) {
    const form = new FormData(); for (const [key,value] of Object.entries({title:'Orientation fixture',summary:'Test image',date:'2026-10-24',category:'Event',published:'true'})) form.set(key,value);
    form.set('imageFile',new Blob([await image(width,height,orientation)],{type:'image/jpeg'}),'event.jpg');
    const result = await upload('/api/admin/content/news',form); assert.equal(result.status,201,JSON.stringify(result.data)); assert.deepEqual([result.data.imageDimensions.width,result.data.imageDimensions.height],expected);
    const edit = new FormData(); for (const [key,value] of Object.entries({...result.data,title:'Updated story',published:'false'})) edit.set(key,String(value));
    assert.equal((await upload('/api/admin/content/news/'+result.data.id,edit,'PUT')).status,200);
    const items = await (await fetch(origin+'/api/content/news')).json(); assert(!items.some(item => item.id===result.data.id));
    const adminItems = await (await fetch(origin+'/api/admin/content/news',{headers:headers()})).json(); assert(adminItems.some(item => item.id===result.data.id));
    assert.equal((await fetch(origin+'/api/admin/content/news/'+result.data.id,{method:'DELETE',headers:headers()})).status,204);
  }
  const anonymous = new FormData(); assert.equal((await upload('/api/content/news',anonymous)).status,405);
});
test('career branch validation retains accepted branch snapshot and keeps résumés private', async () => {
  const branches = await (await fetch(origin+'/api/content/branches')).json(); assert(branches.some(branch => branch.id==='cheras'));
  store.save('branches',{id:'hidden',name:'Hidden',address:'Test',published:false});
  const submit = async branchId => {
    const form = new FormData(); for (const [key,value] of Object.entries({name:'Applicant',email:'applicant@example.test',position:'Sales',branchId})) form.set(key,value);
    form.set('resume',new Blob(['%PDF-1.4 Test only'],{type:'application/pdf'}),'resume.pdf');
    return upload('/api/content/careers',form,'POST',false);
  };
  for (const id of ['', 'missing','hidden']) assert.equal((await submit(id)).status,400);
  assert.equal(store.readJson('submissions/careers.json').length,0);
  assert.equal(fs.readdirSync(process.env.UPLOAD_DIR).filter(file => file.endsWith('.pdf')).length,0);
  assert.equal((await submit('cheras')).status,201);
  const record = store.readJson('submissions/careers.json')[0]; assert.equal(record.branchId,'cheras'); assert.equal(record.branchName,'BYD Cheras');
  store.save('branches',{id:'cheras',name:'Renamed branch',address:'Test',published:true}); assert.equal(record.branchName,'BYD Cheras');
  assert.equal((await fetch(origin+record.resume)).status,404);
  store.remove('branches','cheras'); assert.equal((await submit('cheras')).status,400);
});
test('branch migration does not reseed deletions or overwrite existing records', () => {
  store.remove('branches','kl-north');
  const restart = spawnSync(process.execPath,['-e',"const s=require('./server/database'); console.log(JSON.stringify(s.list('branches')));s.db.close()"],{cwd:path.join(__dirname,'..'),env:process.env,encoding:'utf8'});
  assert.equal(restart.status,0); const branches = JSON.parse(restart.stdout); assert(!branches.some(b => ['cheras','kl-north'].includes(b.id)));
});
