// Re-run on the final main: node capture.mjs  (server 8020 + station 1423, disposable DB)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','captures');fs.mkdirSync(OUT,{recursive:true});
const API='http://127.0.0.1:8020', ST='http://localhost:1423', CREW=API+'/crew/';
const post=(p)=>fetch(API+p,{method:'POST'}).then(r=>r.json());
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const errs=[];
const stCtx=async()=>{const c=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:2});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));return [c,p];};
async function station(shots){const [c,p]=await stCtx();for(const [n,r] of shots){await p.goto(ST+'/#'+r);await p.waitForTimeout(2000);await p.screenshot({path:`${OUT}/${n}.png`});}await c.close();}
async function phone(id,shots){
  const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
  await p.goto(CREW);await p.evaluate((i)=>localStorage.setItem('hestia-crew-id',String(i)),id);
  for(const [n,r] of shots){await p.goto(CREW+'#'+r);await p.waitForTimeout(2200);await p.screenshot({path:`${OUT}/${n}.png`});}
  await c.close();
}
async function simulatorReport(){
  const [c,p]=await stCtx();await p.goto(ST+'/#/forecasts');await p.waitForTimeout(1500);
  await p.getByRole('button',{name:/Example: the cargo is 90 days late/}).click();await p.waitForTimeout(800);
  for(let i=0;i<8;i++){
    const w=p.getByRole('button',{name:/Confirm and write the report/});
    if(await w.count()){await w.first().click();break;}
    const n=p.getByRole('button',{name:/Confirm and continue/});
    if(!(await n.count()))break;await n.first().click();await p.waitForTimeout(500);
  }
  await p.waitForTimeout(2500);await p.screenshot({path:OUT+'/st-sim-report.png'});
  console.log('sim:',(await p.innerText('main')).replace(/\s+/g,' ').slice(0,900));await c.close();
}
async function earthDelivered(){
  const [c,p]=await stCtx();await p.goto(ST+'/#/earth');await p.waitForTimeout(1500);
  await p.getByRole('button',{name:/\+20 min/}).first().click();await p.waitForTimeout(2500);
  await p.screenshot({path:OUT+'/st-earth-delivered.png'});
  console.log('earth:',(await p.innerText('main')).replace(/\s+/g,' ').slice(0,700));await c.close();
}
await post('/api/demo/scenario/demo-mars');
await station([['st-crew','/crew'],['st-pantry','/pantry'],['st-sim','/forecasts']]);
await simulatorReport();
await phone(1,[['ph-home-ok','/home'],['ph-checkin','/checkin']]);
await post('/api/demo/scenario/red-alert');
await station([['st-crew-red','/crew'],['st-profile-red','/crew/4'],['st-alerts','/alerts'],['st-earth','/earth']]);
await phone(4,[['ph-home-red','/home']]);
await earthDelivered();
console.log('errors',errs);await browser.close();
