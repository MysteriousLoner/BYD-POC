// Run after import. WordPress pictures retain origins; no generated or recoloured photography.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../website-with-chatbot/assets/wordpress');
const tool=process.env.IMPECCABLE_EMBED_SCRIPT||'/Users/yanglee/.agents/skills/impeccable/scripts/embed-prompt.mjs';
const sources=JSON.parse(fs.readFileSync(path.join(root,'sources.json'))),grouped=new Map();
for(const item of sources){if(!/\.(png|jpe?g|webp)$/.test(item.local))continue;const local=path.join(root,path.basename(item.local));if(!grouped.has(local))grouped.set(local,new Set());grouped.get(local).add(item.url)}
for(const [name,url]of Object.entries(JSON.parse(fs.readFileSync(path.join(root,'catalogue/sources.json')))))grouped.set(path.join(root,'catalogue',name),new Set([url]));
for(const [file,urls]of grouped)execFileSync(process.execPath,[tool,file,'--prompt','Original WordPress public-site asset. Source: '+[...urls].join(' ; ')+'. Copied with site-owner authorization; resized/optimized only, no digital recolouring.'],{stdio:'pipe'});
console.log('Recorded origins for '+grouped.size+' rasters.');
