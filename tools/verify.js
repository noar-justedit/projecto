// Vérifie les promesses de la charte sur la page réelle (§4.4)
const { chromium } = require('playwright');
const path = require('path');
const PAGE = path.join(__dirname, '..', 'src', 'index.html');   // l'interface de projecto
const ZIP = process.argv[2];                                   // un ZIP modèle passé en argument
const JSZip = require('../src/vendor/jszip.min.js');
(async () => {
  const z = new JSZip(); ['T/A/B','T/C'].forEach(p=>z.folder(p)); const b64 = (await z.generateAsync({ type: 'nodebuffer' })).toString('base64');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 920, height: 800 } });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript((b64) => {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const api = { getVersion: async () => '1.5.5', readFile: async () => ({ ok: true, data: bytes }), listZipsInFolder: async () => ['/a/X.zip','/a/Y.zip'], openFolder: async () => '/V' };
    window.electronAPI = new Proxy(api, { get(t, k) { if (k in t) return t[k]; if (typeof k === 'string' && k.startsWith('on')) return () => {}; return async () => null; } });
  }, b64);
  await p.goto('file://'+PAGE);
  await p.evaluate(async () => { await selectOtherZip('/a/X.zip'); await browseDest(); });
  const r = {};
  // 1. Toute icône seule porte un aria-label
  r.iconeSansLabel = await p.evaluate(() => [...document.querySelectorAll('button')].filter(x => !x.textContent.trim().replace(/[×]/g,'') || x.textContent.trim()==='×').filter(x => !x.getAttribute('aria-label')).map(x => x.className));
  // 2. Aucune bordure de structure sur cartes, champs, creux
  r.bordures = await p.evaluate(() => ['.card','.tree-box','.field-inp','.drop-zip','.dest-path-box','.crumb','.browse-btn','.btn-mini','.chip','.btn-reset','.ctx-menu'].filter(s => { const e=document.querySelector(s); if(!e) return false; const c=getComputedStyle(e); return parseFloat(c.borderTopWidth)>0 && c.borderTopStyle!=='none' && c.borderTopColor!=='rgba(0, 0, 0, 0)'; }));
  // 3. Couleurs d'état de la charte
  r.jetons = await p.evaluate(() => { const c=getComputedStyle(document.documentElement); return ['--page','--card','--ins','--green','--red','--blue','--orange','--accent'].map(k=>k+'='+c.getPropertyValue(k).trim()).join(' '); });
  // 4. Échap ferme le menu contextuel
  await p.locator('.tree-row[data-isdir="1"]').first().click({ button: 'right' });
  const menuAvant = await p.evaluate(() => document.getElementById('ctx-menu').style.display);
  await p.keyboard.press('Escape');
  r.menuEchap = menuAvant + ' → ' + await p.evaluate(() => document.getElementById('ctx-menu').style.display);
  // 5. Échap ferme la mise à jour SANS enregistrer le refus
  await p.evaluate(() => showUpdateNotice({ version: '9.9.9', url: 'https://x' }));
  await p.keyboard.press('Escape');
  r.majEchap = await p.evaluate(() => ({ fermee: !document.getElementById('update-ov'), refusEnregistre: localStorage.getItem('projecto_upd_dismissed') }));
  // 6. Badge destination vert, pas rouge
  r.badgeDest = await p.evaluate(() => document.getElementById('dest-badge').className);
  // 7. Reset masque la liste des templates
  await p.evaluate(() => doReset());
  r.resetListe = await p.evaluate(() => document.getElementById('other-zips-wrap').classList.contains('visible') ? 'VISIBLE (KO)' : 'masquée');
  r.erreursPage = errs;
  console.log(JSON.stringify(r, null, 1)); await b.close();
})();
