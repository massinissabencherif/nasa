import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','build');fs.mkdirSync(ROOT,{recursive:true});
const mode=process.argv[2]||'keys';const FPS=30,N=894;
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const p=await b.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());else console.log('page:',m.text());});
await p.goto('file://'+path.join(path.dirname(fileURLToPath(import.meta.url)),'film.html'));await p.evaluate(()=>window.ready);await p.waitForTimeout(300);
if(mode==='keys'){const ts=(process.argv[3]||'0,2.2,6,7.9,8.7,11,15.5,17.95,20.5,22.9,25,26.9,28.5').split(',').map(Number);
  fs.mkdirSync(ROOT+'/keys',{recursive:true});
  for(const t of ts){await p.evaluate(t=>render(t),t);await p.screenshot({path:`${ROOT}/keys/k-${t.toFixed(2).padStart(5,'0')}.png`});}
}else{fs.mkdirSync(ROOT+'/frames',{recursive:true});
  for(let f=0;f<N;f++){await p.evaluate(t=>render(t),f/FPS);await p.screenshot({path:`${ROOT}/frames/f${String(f).padStart(4,'0')}.png`});}}
console.log('errors',errs);await b.close();
