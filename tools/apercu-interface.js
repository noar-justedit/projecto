const { chromium } = require('playwright');
const path = require('path');
const PAGE = path.join(__dirname, '..', 'src', 'index.html');   // l'interface de projecto
const ZIP = process.argv[2];                                   // un ZIP modèle passé en argument
const fs=require('fs');
(async()=>{
  const b64=fs.readFileSync(ZIP).toString('base64');
  const br=await chromium.launch(); const p=await br.newPage({viewport:{width:920,height:800},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(b64=>{
    Object.defineProperty(navigator,'userAgent',{get:()=>'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)'});
    const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    const api={getVersion:async()=>'1.6.0',readFile:async()=>({ok:true,data:bytes}),
      listZipsInFolder:async()=>['/Volumes/NAS/TEMPLATES/Project Template.zip'],
      openFolder:async()=>'/Volumes/SHUTTLE_1/PROJETS',folderExists:async()=>false};
    window.electronAPI=new Proxy(api,{get(t,k){if(k in t)return t[k];if(typeof k==='string'&&k.startsWith('on'))return()=>{};return async()=>null}});
    try{localStorage.clear()}catch(e){}
  },b64);
  await p.goto('file://'+PAGE); await p.waitForTimeout(300);
  await p.evaluate(async()=>{ await selectOtherZip('/Volumes/NAS/TEMPLATES/Project Template.zip'); await browseDest();
    const n=document.getElementById('v-name'); n.value='Spot'; onVar(n,'e-name');
    const c=document.getElementById('v-client'); c.value='ACME'; onVar(c,'e-client'); });
  await p.waitForTimeout(300);
  const m1=await p.evaluate(()=>({top:document.getElementById('tree-box').getBoundingClientRect().top,
    haut:document.querySelector('.tree-row').textContent.trim(),
    badge:document.getElementById('icon-count').textContent,
    lignes:document.querySelectorAll('.tree-row').length,
    ini:[...document.querySelectorAll('.tree-row')].filter(r=>/desktop\.ini/i.test(r.textContent)).length,
    excl:document.getElementById('excl-count-label').textContent,
    hauteurEntete:document.querySelector('.tree-head').getBoundingClientRect().height,
    premiereLigne:document.querySelector('.tree-row').getBoundingClientRect().top}));
  await p.screenshot({path:'erik-1-avant.png'});
  await p.evaluate(()=>{ toggleExclusion('Video Files/',true); });
  await p.waitForTimeout(200);
  const m2=await p.evaluate(()=>({top:document.getElementById('tree-box').getBoundingClientRect().top,
    excl:document.getElementById('excl-count-label').textContent,
    hauteurEntete:document.querySelector('.tree-head').getBoundingClientRect().height,
    premiereLigne:document.querySelector('.tree-row').getBoundingClientRect().top}));
  await p.screenshot({path:'erik-2-apres.png'});
  console.log('avant :',JSON.stringify(m1)); console.log('après :',JSON.stringify(m2));
  console.log('l\'arborescence a bougé de',(m2.top-m1.top),'px'); console.log('erreurs page:',errs);
  await br.close();
})();
