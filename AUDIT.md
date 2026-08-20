# projecto — audit de code (v1.5.3)

Portée : `src/main.js`, `src/index.html`, `src/preload*.js`, `electron-builder.yml`, scripts de build.
Méthode : lecture complète + tests d'exécution des handlers réels (JSZip + stub Electron) pour
confirmer ou infirmer chaque hypothèse. Rien n'est listé ici sans avoir été vérifié.

---

## 1. Bugs confirmés et corrigés

### 1.1 Un `.DS_Store` à la racine du ZIP casse la détection du dossier racine — **impact élevé**

La détection « ce ZIP a un seul dossier racine, je le retire » comptait *toutes* les entrées de
premier niveau. Un `.DS_Store` (ou `Thumbs.db`) posé à la racine de l'archive faisait passer le
compte de 1 à 2, donc plus de strip.

Résultat testé, avant correction :

```
260819_Doc_ARTE/TEMPLATE/01_RUSHES     ← un niveau parasite
260819_Doc_ARTE/TEMPLATE/02_SON
260819_Doc_ARTE/.DS_Store
```

Après correction :

```
260819_Doc_ARTE/01_RUSHES
260819_Doc_ARTE/02_SON
```

Le commentaire du code annonçait déjà « ignoring hidden dot-files » — le code ne le faisait pas.
Filtre unifié (`isJunkEntry`) appliqué aux 3 endroits qui divergeaient : restauration, mise à jour
du ZIP, et affichage de l'arbre.

**À valider par toi** : `desktop.ini` est dans la liste des fichiers ignorés. Si tu t'en sers pour
imposer une icône de dossier sous Windows dans tes templates, dis-le, je le sors de la liste.

### 1.2 « Re-include folder » ne faisait rien sur un sous-dossier — **impact moyen**

Tu exclus `01_RUSHES`, puis clic droit sur `01_RUSHES/B_CAM` → « Re-include folder » : l'entrée du
menu s'affichait, le clic ne changeait rien (l'exclusion stockée était le parent, pas l'enfant).

Corrigé : ré-inclure un enfant libère le parent et ré-exclut automatiquement les autres branches.
Vérifié : après re-include de `B_CAM`, il reste exclu `01_RUSHES/A_CAM` seulement, `B_CAM` et son
sous-arbre reviennent. Les fichiers en vrac directement dans le parent reviennent aussi (l'exclusion
ne porte que sur les dossiers).

### 1.3 Réécriture du ZIP template non atomique — **impact élevé si ça arrive**

En mode « Update existing ZIP », `fs.writeFileSync` écrasait directement ton template. Coupure,
disque plein, crash pendant l'écriture = template perdu, sans copie.
Corrigé : écriture dans un `.tmp-<pid>` puis `rename` atomique, avec nettoyage du temporaire en cas
d'échec.

### 1.4 Après « Update existing ZIP », l'interface mentait — **impact moyen**

Le ZIP était réécrit mais l'arbre affiché et la liste d'exclusions restaient ceux d'avant : tu voyais
encore des dossiers supprimés, marqués EXCL. Corrigé : rechargement du ZIP réécrit, exclusions
remises à zéro, liste des ZIP du dossier rafraîchie.

### 1.5 Nom de fichier mal découpé sous Windows — **impact faible**

`r.path.split('/').pop()` sur un chemin renvoyé par `path.join` sous Windows (`C:\...\x.zip`) ne
découpait rien : le nom affiché et mémorisé devenait le chemin complet. Corrigé des deux côtés
(main renvoie toujours des slashes, le renderer découpe sur les deux séparateurs).

### 1.6 Une seule erreur d'écriture annulait toute la restauration — **impact moyen**

Un fichier impossible à écrire (permissions, nom trop long, volume plein) faisait remonter une
exception globale : « Restore failed », alors que 90 % de l'arborescence était déjà créée. Le
renderer avait déjà le code d'affichage `⚠ N error(s)` — mais il était mort, aucune erreur par
entrée n'était jamais renvoyée. Corrigé : chaque entrée est isolée, les échecs sont comptés et
affichés, le reste passe.

### 1.7 Nom réservé Windows — **impact faible**

`CON`, `PRN`, `NUL`, `COM1`… passaient la validation (le filtre n'interdit que les caractères
spéciaux) et échouaient à la création sous Windows avec un message système opaque. Message clair
renvoyé en amont.

### 1.8 `result.data.buffer` — **latent, corrigé par précaution**

Un `Buffer` Node traversant l'IPC arrive côté renderer avec un `byteOffset` non nul (vérifié : 6
octets d'avance sur un ZIP de 463 octets). Prendre `.buffer` transmettait donc quelques octets
parasites avant l'archive. JSZip tolère aujourd'hui ce préfixe (il corrige les offsets, comme pour
les archives auto-extractibles) — donc **aucun bug visible aujourd'hui**, mais la ligne était fausse.
On passe désormais la vue exacte.

### 1.9 Sécurité — deux durcissements

- `open-external` ouvrait n'importe quelle URL, y compris celle venant du `version.json` distant.
  Un `version.json` altéré (ou un dépôt compromis) pouvait faire ouvrir un `file://` ou un protocole
  applicatif au clic sur « Get it ». Restreint à http/https.
- Le nom saisi pour « Save as new ZIP… » n'était pas nettoyé : `../../evil` écrivait hors du dossier
  du template. Réduit au nom de fichier seul. Testé.

### 1.10 Divers

- Verrou d'instance unique (deux fenêtres écrivant au même endroit n'a pas de sens ; la seconde
  instance ramène la fenêtre existante au premier plan).
- Barre de menu Windows masquée (`autoHideMenuBar`) — raccourcis copier/coller conservés.
- Arbre : plafond d'affichage passé de 300 à 1000 lignes. Au-delà de 300, les dossiers n'étaient
  pas affichés donc **impossibles à exclure** au clic droit.

**Le reste tient la route** : `contextIsolation` + `nodeIntegration:false`, CSP présente, garde
Zip-Slip à deux niveaux (chemin d'entrée + résolution finale), échappement HTML systématique,
`webUtils.getPathForFile` avec repli, échec silencieux du check de mise à jour. Les dépendances sont
à jour (electron 43.4.1, electron-builder 26.15.3, jszip 3.10.1 = dernières versions publiées).

---

## 2. Non corrigé — à arbitrer

### 2.1 La barre de progression est décorative

`setProgress(5)` → `(30)` → `(100)`. La restauration entière (lecture du ZIP, décompression,
écriture) se fait en une seule passe **synchrone dans le process principal** : pendant ce temps la
fenêtre est figée. Invisible sur un template de dossiers vides, très visible dès que le template
embarque des fichiers lourds (LUTs, presets AE, banques son).

Correction propre : boucle asynchrone par entrée + envoi d'événements de progression au renderer via
`webContents.send`. ~40 lignes. À faire si tu mets du contenu lourd dans tes templates.

### 2.2 Pas de « Révéler dans le Finder » après restauration

L'app sait le faire (`shell:showInFinder` existe pour le ZIP source). Un bouton dans le message de
succès coûte 5 lignes.

### 2.3 Les exclusions ne sont pas mémorisées

Elles sont réinitialisées à chaque chargement de ZIP. Voulu ? Si tu exclus toujours les mêmes
dossiers pour un template donné, elles pourraient être persistées par chemin de ZIP.

### 2.4 `index.html` = 1040 lignes (CSS + HTML + JS + une police en base64)

Ça reste lisible aujourd'hui, mais chaque évolution se fait dans un seul fichier monolithique, et
la police Poppins en base64 (~30 ko de texte) est au milieu du CSS. Découpage possible :
`styles.css` + `app.js` + `fonts.css`. Aucun impact fonctionnel, purement du confort de maintenance.

### 2.5 Le nom de dossier peut n'être que la date

Si « Project » et « Client » sont vides et que la date est active, le bouton reste actif et crée un
dossier nommé `260819`. Volontaire ?

### 2.6 Signature / notarisation

Le `READ ME FIRST.txt` (`xattr -cr`) est la conséquence directe de l'absence de signature Apple.
Coût réel : 99 €/an (Apple Developer) pour supprimer le message « endommagée », et ~200-400 €/an pour
un certificat Windows qui calme SmartScreen. Tant que tu diffuses en interne / à quelques personnes,
la note explicative suffit.

---

## 3. Vérifications faites

| Test | Résultat |
|---|---|
| Restauration d'un template avec dossier racine unique | OK, racine retirée |
| Idem + `.DS_Store` racine + `__MACOSX/` | OK après correctif (KO avant) |
| Exclusion d'un dossier → restauration | OK, sous-arbre absent, reste intact |
| Re-include d'un enfant d'un parent exclu | OK après correctif (sans effet avant) |
| Toggle exclusion parent puis enfant, dans les deux ordres | OK, pas de doublon |
| Nom de dossier `CON` | Refusé avec message clair |
| « Save as new ZIP » nommé `../../../evil` | Confiné au dossier du ZIP source |
| Fichier temporaire résiduel après écriture ZIP | Aucun |
| Syntaxe `main.js` et bloc script de `index.html` | `node --check` OK |

Non testé faute d'environnement graphique : le rendu réel de la fenêtre Electron et le
drag & drop. À vérifier au premier lancement sur ton Mac.
