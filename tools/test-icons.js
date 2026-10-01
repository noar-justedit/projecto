// Vérifie la logique des marques de fichiers avec un exécuteur bouchonné,
// puis chaque contrôle par mutation (on casse, on constate le rouge, on remet).
const fi = require('../src/folder-icons.js');
const assert = require('assert');
let ok=0, ko=0;
const t=(nom,f)=>{try{f();console.log('  ✓',nom);ok++}catch(e){console.log('  ✗',nom,'—',e.message);ko++}};

console.log('buildAttrList');
const E=[
 {fullPath:'C:\\P\\Video Files', isDir:true,  dos:0x11},
 {fullPath:'C:\\P\\Video Files\\desktop.ini', isDir:false, dos:0x26},
 {fullPath:'C:\\P\\Render', isDir:true, dos:0x10},
 {fullPath:'C:\\P\\Notas.txt', isDir:false, dos:0x20},
 {fullPath:'C:\\P\\Audio\\desktop.ini', isDir:false, dos:0x00},  // ZIP sans attributs
 {fullPath:'C:\\P\\Marque', isDir:true, dos:0x11},                 // marqué dans le ZIP, sans desktop.ini
];
const L=fi.buildAttrList(E);
const get=p=>L.filter(x=>x.p===p).map(x=>x.a);
t('desktop.ini devient caché + système', ()=>assert.deepStrictEqual(get('C:\\P\\Video Files\\desktop.ini'),['Hidden,System']));
t('son dossier passe en lecture seule',  ()=>assert.deepStrictEqual(get('C:\\P\\Video Files'),['ReadOnly']));
t('un dossier sans icône n\'est pas marqué', ()=>assert.deepStrictEqual(get('C:\\P\\Render'),[]));
t('la marque du ZIP est rejouée telle quelle', ()=>assert.deepStrictEqual(get('C:\\P\\Marque'),['ReadOnly']));
t('un fichier ordinaire n\'est pas marqué',  ()=>assert.deepStrictEqual(get('C:\\P\\Notas.txt'),[]));
t('marques forcées même si le ZIP ne les portait pas', ()=>{
  assert.deepStrictEqual(get('C:\\P\\Audio\\desktop.ini'),['Hidden,System']);
  assert.deepStrictEqual(get('C:\\P\\Audio'),['ReadOnly']);
});

console.log('applyAttributes');
(async()=>{
  let calls=[];
  const run=async(c,a)=>{calls.push([c,a]); return ''};
  let r=await fi.applyAttributes(L,{platform:'win32',run,tmpDir:'/tmp'});
  t('un seul appel PowerShell', ()=>{assert.strictEqual(calls.length,1);assert.match(calls[0][0],/powershell/);});
  t('le script lit la liste et ajoute les marques', ()=>{
    const sc=calls[0][1][3];
    assert.match(sc,/ConvertFrom-Json/); assert.match(sc,/-bor \[System\.IO\.FileAttributes\]/);
  });
  t('compte rendu', ()=>assert.deepStrictEqual({a:r.applied,f:r.failed,h:r.how},{a:L.length,f:0,h:'powershell'}));

  calls=[];
  const runKo=async(c,a)=>{calls.push([c,a]); if(/powershell/.test(c)) throw new Error('introuvable'); return ''};
  r=await fi.applyAttributes(L,{platform:'win32',run:runKo,tmpDir:'/tmp'});
  t('repli sur attrib si PowerShell manque', ()=>{
    assert.strictEqual(r.how,'attrib'); assert.strictEqual(r.failed,0);
    const args=calls.slice(1).map(c=>c[1].join(' '));
    assert.ok(args.includes('+h +s C:\\P\\Video Files\\desktop.ini'), 'marques du fichier');
    assert.ok(args.includes('+r C:\\P\\Video Files'), 'marque du dossier');
  });
  calls=[];
  r=await fi.applyAttributes(L,{platform:'darwin',run,tmpDir:'/tmp'});
  t('rien n\'est tenté hors Windows', ()=>{assert.strictEqual(calls.length,0);assert.strictEqual(r.applied,0)});

  console.log('hideOnMac');
  calls=[];
  const paths=E.map(e=>e.fullPath).concat(['/P/A/desktop.ini','/P/B/desktop.ini']);
  let h=await fi.hideOnMac(paths,{platform:'darwin',run,chunk:2});
  t('seuls les desktop.ini sont masqués, par paquets', ()=>{
    assert.strictEqual(h.hidden,4);
    assert.ok(calls.every(c=>c[1].slice(1).every(p=>/desktop\.ini$/.test(p))));
    assert.strictEqual(calls.length,2);
  });
  calls=[];
  h=await fi.hideOnMac(paths,{platform:'win32',run});
  t('rien n\'est masqué hors macOS', ()=>assert.strictEqual(calls.length,0));
  console.log(`\n${ok} contrôles OK, ${ko} en échec`);
  process.exit(ko?1:0);
})();
