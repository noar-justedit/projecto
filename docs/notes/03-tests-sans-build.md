# Vérifier l'interface sans compiler l'application

L'interface de projecto tient dans un seul fichier, `src/index.html`, et parle au
processus principal par un pont nommé `window.electronAPI`. Il suffit de simuler
ce pont pour ouvrir l'interface dans un vrai navigateur : pas de build, pas
d'installation, quelques secondes par essai.

Le cœur de l'astuce est un `Proxy` : toute méthode non prévue répond
automatiquement, tout abonnement `onX` ne fait rien. On ne bouchonne que ce dont
le scénario a besoin.

```js
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const zip = fs.readFileSync('/chemin/vers/un-modele.zip').toString('base64');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 920, height: 800 }, deviceScaleFactor: 2 });
  page.on('pageerror', e => console.log('ERREUR PAGE :', e.message));

  await page.addInitScript((zip) => {
    // Faire croire à la page qu'elle tourne sur un Mac (barre de titre)
    Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (Macintosh)' });
    const bytes = Uint8Array.from(atob(zip), c => c.charCodeAt(0));
    const api = {
      getVersion: async () => '1.6.1',
      readFile: async () => ({ ok: true, data: bytes }),
      listZipsInFolder: async () => ['/Volumes/NAS/TEMPLATES/modele.zip'],
      openFolder: async () => '/Volumes/SHUTTLE_1/PROJETS',
      folderExists: async () => false,
    };
    window.electronAPI = new Proxy(api, {
      get(t, k) {
        if (k in t) return t[k];
        if (typeof k === 'string' && k.startsWith('on')) return () => {};
        return async () => null;
      }
    });
  }, zip);

  await page.goto('file:///chemin/vers/projecto/src/index.html');

  // On peuple l'état en appelant les fonctions de l'application elle-même
  await page.evaluate(async () => {
    await selectOtherZip('/Volumes/NAS/TEMPLATES/modele.zip');
    await browseDest();
    const n = document.getElementById('v-name'); n.value = 'Portrait'; onVar(n, 'e-name');
    toggleExclusion('03_GRAPHISME/', true);
  });

  await page.screenshot({ path: 'apercu.png', fullPage: false });
  await browser.close();
})();
```

**Mesurer plutôt que regarder.** `page.evaluate` sert aussi à lire la page :
hauteur d'une carte, position d'une ligne, couleur calculée. C'est comme ça
qu'on a vu qu'un correctif « évident » laissait encore l'arborescence sauter de
13 pixels.

**Tester le processus principal**, lui, se fait en simulant le module `electron` :
créer un faux module qui enregistre les `ipcMain.handle`, charger `src/main.js`,
puis appeler les fonctions ainsi collectées avec un vrai ZIP et un dossier
temporaire. Les restaurations sont alors vérifiables fichier par fichier.
