# projecto — instructions pour Claude Code

projecto restaure une arborescence de projet complète à partir d'un ZIP modèle.
Electron + JSZip, macOS et Windows, GPL-3.0. Interface en anglais.
Dépôt : https://github.com/noar-justedit/projecto

Noar n'est pas développeur. Il décide, teste et publie ; le code, c'est toi.
Explique toujours le principe en langage simple, sans jargon, et signale ce qui
aura un impact concret pour lui : ce qui peut casser plus tard, ce qui sera
difficile à modifier, les limites de la solution retenue.

---

## Règles absolues

1. **Rien hors de la demande.** Ne touche pas aux scripts de build, à
   l'outillage, aux dépendances, à l'organisation des fichiers ni aux
   comportements par défaut sans accord explicite. Propose, explique l'impact,
   attends le « oui ». (Règle posée le 28/09/2026 après un `npm test` ajouté
   d'office à un script de build, qui a bloqué deux builds.)
2. **Jamais de changement de version sans confirmation du numéro par Noar.**
   Le numéro vit dans `package.json` ET `version.json` : les deux ensemble.
3. **Jamais de `git push`** sans qu'il le demande explicitement. Les commits
   locaux, seulement s'il les demande.
4. **`scripts/build-win-from-mac.command` : contenu à ne pas toucher.** Il le
   veut tel quel.
5. **Pas d'em-dash dans ce qui lui est montré à l'écran.**

## Structure

```
src/main.js          processus principal : dialogues, lecture/écriture ZIP, restauration
src/preload.js       pont entre la fenêtre et le processus principal
src/folder-icons.js  icônes de dossiers Windows (desktop.ini + marques de fichiers)
src/index.html       TOUTE l'interface : CSS, HTML et JS dans un seul fichier
build-resources/     icônes (icon_source.svg est la source), entitlements, licence
scripts/*.command    build mac, build windows depuis mac, dev, icônes
tools/               vérifications de développement (jamais embarquées dans l'app)
docs/notes/          mémoire du projet : conventions, charte, historique, pièges
AUDIT.md             audit de 1.5.4, avec ce qui reste à traiter
```

## Comment travailler ici

- **Les outils sont déjà là.** `tools/` contient de quoi vérifier sans compiler :
  contrôles des marques de fichiers, restauration réelle d'un ZIP dans un dossier
  temporaire, contrôle de la charte sur la page rendue, captures d'écran. Voir
  `tools/README.md`. Playwright s'installe en une commande la première fois.
- **Tester sans build.** `src/index.html` s'ouvre dans un navigateur si on simule
  le pont Electron. C'est la façon la plus rapide de vérifier l'interface :
  Playwright + un Proxy qui répond à tout appel non prévu. Voir
  `docs/notes/03-tests-sans-build.md` — le harnais y est écrit en entier.
- **Vérifier la syntaxe** avant de conclure : `node --check src/main.js`,
  `node --check src/folder-icons.js`, et pour l'interface, extraire le bloc
  `<script>` de `index.html` et le passer à `new Function(...)`.
- **Mesurer plutôt que supposer.** Les hauteurs, les décalages, les couleurs se
  lisent dans la page rendue. Deux bugs d'interface ont été trouvés comme ça, et
  un correctif « évident » ne marchait pas.
- **Vérifier un test en le cassant.** Quand tu ajoutes un contrôle, casse
  volontairement le code, constate que le contrôle passe au rouge, remets en
  état. Un test ajouté sans ça a déjà laissé passer un trou de couverture.

## Charte UI

Le langage visuel est commun à toutes les apps de Noar (voir
`docs/notes/02-charte-ui.md`). L'essentiel :

- Trois surfaces : page `#0a0b0e`, carte `#14161c`, creux `#0e1014`. Jamais une
  quatrième. Ce qui flotte (menu, survol) : `#1b1d24`.
- **Aucune bordure, aucun filet.** Le groupement est porté par le fond. Seul
  contour autorisé : celui qui dit un état (sélection, focus clavier, alerte).
- Couleurs d'état, sens fixe partout : vert `#35c98b` fait et vérifié, rouge
  `#f2555a` échoué ou source, bleu `#4d90f0` information neutre, orange
  `#f2a03d` ce qui manque ou demande une décision.
- **Accent de projecto : `#f7d038` (jaune).** Pastille du logo uniquement,
  jamais un état. C'est le jaune de l'icône.
- 12 px entre deux cartes. Rayons : carte 14, creux 11, champ 8, badge 4.
- Toute icône seule porte un `aria-label` et un `title`.
- La charte est appliquée par **un bloc unique à la fin de la feuille de style**
  de `index.html`, qui redéfinit par-dessus l'ancien style. Le retirer rend
  l'interface d'avant. Garde ce bloc groupé, n'éparpille pas ses règles.

## Pièges connus, à ne pas réintroduire

- **Fichiers parasites et dossier racine.** Un `.DS_Store` à la racine d'un ZIP
  faisait imbriquer tout le modèle d'un niveau de trop. Les entrées parasites
  sont ignorées dans la détection du dossier racine unique. **`desktop.ini`
  n'est pas un parasite** : il porte l'icône d'un dossier Windows, il est
  restauré, mais il ne compte pas dans cette détection.
- **Icônes de dossiers Windows.** Le fichier ne suffit pas : Windows ne le lit
  que si le fichier est caché + système et son dossier marqué en lecture seule.
  Ces marques voyagent dans le ZIP et sont rejouées après la copie. `updateZip`
  doit les conserver en réécrivant l'archive, sinon le modèle perd ses icônes
  définitivement. Détail dans `docs/notes/04-icones-dossiers.md`.
- **Colonne Setup.** Les cartes doivent garder leur hauteur (`flex-shrink:0`) et
  c'est la colonne qui défile, sinon le nom du dossier produit est coupé.
- **Bandeau d'exclusions.** Visible dès le départ, et le bouton « Clear all » est
  masqué par `visibility` et non `display` : sinon la hauteur change et
  l'arborescence saute. Même piège dans l'en-tête de l'arbre (`flex-wrap:nowrap`).
- **CSP.** `index.html` porte une Content-Security-Policy. Toute image en
  `data:` exige `img-src 'self' data:`.
- **Échap** ferme ce qui informe. La fenêtre de mise à jour se ferme sans
  enregistrer le refus : elle revient au lancement suivant.

## Livrer une version

1. Numéro confirmé par Noar, écrit dans `package.json` et `version.json`.
2. `docs/release-notes-<version>.md`, **en anglais**, dans le style des
   précédentes : ce que l'utilisateur voit, pas ce que le code fait.
3. Build : double-clic sur `scripts/build-mac.command`, puis sur
   `scripts/build-win-from-mac.command`.
4. Publication par Noar : **release GitHub avec les binaires d'abord**, puis
   `version.json` sur `main`. Dans l'autre ordre, l'app annonce une mise à jour
   qui n'existe pas encore.

Le build mac signe et notarise (compte Apple Developer, profil
`projecto-notarization` dans le trousseau). Windows reste non signé.
Détail dans `docs/notes/05-signature-mac.md`, et pour les machines, le dépôt et
l'ordre de publication : `docs/notes/07-machines-et-github.md`.
