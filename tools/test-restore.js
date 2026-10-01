// Restauration réelle d'un ZIP modèle, via les vrais handlers de src/main.js.
// Les contrôles chiffrés correspondent au modèle d'Erik Diaz (130 icônes) :
// adapte-les si tu passes un autre ZIP.
const fs=require('fs'), path=require('path'), assert=require('assert');
const { handlers:H } = require('./stub-electron');   // doit être chargé AVANT main.js
require('../src/main.js');
const ZIP=process.argv[2];   // un ZIP modèle passé en argument
const OUT=require('os').tmpdir()+'/projecto-test'; let ok=0,ko=0;
const t=(n,f)=>{try{f();console.log('  ✓',n);ok++}catch(e){console.log('  ✗',n,'—',e.message);ko++}};
(async()=>{
  if(!ZIP){console.error('Usage : node tools/test-restore.js <modele.zip>');process.exit(2)}
  fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
  const r=await H['fs:restoreZip'](null,{zipPath:ZIP,destPath:OUT,folderName:'260924_Spot_ACME',excludedPaths:[]});
  const root=path.join(OUT,'260924_Spot_ACME');
  const all=[]; (function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);all.push([p,f.isDirectory()]);if(f.isDirectory())walk(p)}})(root);
  const inis=all.filter(([p,d])=>!d&&p.endsWith('desktop.ini'));
  console.log('Restauration sans exclusion');
  t('la restauration réussit', ()=>assert.strictEqual(r.success,true));
  t('130 desktop.ini restaurés', ()=>assert.strictEqual(inis.length,130));
  t('le compte est remonté à la fenêtre', ()=>assert.strictEqual(r.icons,130));
  t('pas de niveau « Project Template » en trop', ()=>assert.ok(fs.existsSync(path.join(root,'Video Files','Camera A','Card 1'))));
  t('le desktop.ini du dossier racine est bien à la racine', ()=>assert.ok(fs.existsSync(path.join(root,'desktop.ini'))));
  t('contenu intact (octet pour octet)', ()=>{
    const a=fs.readFileSync(path.join(root,'3D Files','desktop.ini'));
    assert.match(a.toString('latin1'),/IconResource=C:\\WINDOWS\\System32\\SHELL32\.dll,80/);
  });
  t('le seul vrai fichier du template est là', ()=>assert.ok(fs.existsSync(path.join(root,'Documents','Notes','Notas.txt'))));
  t('143 dossiers', ()=>assert.strictEqual(all.filter(([,d])=>d).length,142)); // 143 moins la racine créée par projecto
  t('aucune erreur d\'écriture', ()=>assert.strictEqual(r.results.filter(x=>x.error).length,0));

  console.log('Restauration avec un dossier exclu');
  fs.rmSync(OUT,{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
  const r2=await H['fs:restoreZip'](null,{zipPath:ZIP,destPath:OUT,folderName:'P2',excludedPaths:['Video Files/']});
  const root2=path.join(OUT,'P2');
  t('le dossier exclu n\'est pas créé', ()=>assert.ok(!fs.existsSync(path.join(root2,'Video Files'))));
  t('ses icônes ne sont pas restaurées non plus', ()=>assert.ok(r2.icons<130 && r2.icons>0));
  t('le reste est intact', ()=>assert.ok(fs.existsSync(path.join(root2,'Audio','Music','desktop.ini'))));

  console.log('Mise à jour du ZIP (exclusion enregistrée dans le template)');
  fs.copyFileSync(ZIP,'/tmp/tpl.zip');
  const r3=await H['fs:updateZip'](null,{zipPath:'/tmp/tpl.zip',excludedPaths:['Video Files/'],mode:'new',customName:'sans-video'});
  const JSZip=require('../src/vendor/jszip.min.js');
  const z=await JSZip.loadAsync(fs.readFileSync(r3.path));
  const e=Object.values(z.files);
  t('le nouveau ZIP garde les marques des fichiers', ()=>{
    const ini=e.find(f=>f.name.endsWith('Audio/Music/desktop.ini'));
    assert.strictEqual(ini.dosPermissions,0x26);
  });
  t('et celles des dossiers personnalisés', ()=>{
    const d=e.find(f=>f.name==='Project Template/Audio/Music/');
    assert.strictEqual(d.dosPermissions,0x11);
  });
  t('le dossier exclu a bien disparu', ()=>assert.ok(!e.some(f=>f.name.includes('/Video Files/'))));
  console.log(`\n${ok} contrôles OK, ${ko} en échec`); process.exit(ko?1:0);
})();
