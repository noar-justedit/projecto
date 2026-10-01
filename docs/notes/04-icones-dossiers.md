# Icônes de dossiers Windows (desktop.ini)

Demandé par Erik Diaz (utilisateur, filmmaker) le 24/09/2026, livré en 1.6.1.

## Comment Windows range une icône de dossier
Dans un fichier caché `desktop.ini` posé dans le dossier, du type :
```
[.ShellClassInfo]
IconResource=C:\WINDOWS\System32\SHELL32.dll,80
```
Le fichier ne suffit pas. Windows ne le lit que si **le fichier est marqué caché
+ système** et **son dossier marqué en lecture seule** (c'est ainsi que Windows
repère un dossier personnalisé). Une copie ordinaire perd ces marques.

## Ce qui a été trouvé dans le modèle d'Erik
274 entrées : 143 dossiers, 130 `desktop.ini`, 1 vrai fichier. Les `desktop.ini`
portent l'attribut DOS `0x26` (archive + système + caché), les 130 dossiers
personnalisés portent `0x11` (répertoire + lecture seule), les 13 autres `0x10`.
**Les attributs voyagent donc dans le ZIP** : rien à deviner, il suffit de les
rejouer. JSZip les expose par `entry.dosPermissions`.

## Ce qui a été fait
- `desktop.ini` retiré de la liste des fichiers parasites (il y avait été mis
  par erreur lors de l'audit 1.5.4, ce qui l'empêchait d'être restauré).
- Il reste ignoré dans la **détection du dossier racine unique**, sinon un
  `desktop.ini` à la racine du ZIP réimbrique tout le modèle d'un niveau.
- `src/folder-icons.js` : construit la liste des marques à poser (y compris
  forcées quand le ZIP ne les portait pas), les applique en **un seul appel
  PowerShell** avec une liste JSON, se replie sur `attrib` si PowerShell manque,
  et échoue toujours en silence (une icône manquante ne doit jamais faire
  échouer une restauration). Aucun module natif.
- macOS : le fichier est restauré mais masqué (`chflags hidden`), utile si le
  dossier part sur un partage lu depuis un PC.
- `updateZip` conserve `dosPermissions` et `date` en réécrivant l'archive.
  Sans ça, « Update existing ZIP » détruisait les icônes du modèle lui-même.
- Interface : les `desktop.ini` ne sont jamais listés dans l'arborescence (130
  lignes de bruit sinon) ni comptés dans les fichiers ; un badge bleu « N icons »
  l'annonce, et le message de fin dit combien ont été conservées.

## Limite connue, non résolue
**Sur un NAS, les icônes ne tiennent pas.** Le fichier est bien copié, mais les
marques sont une notion Windows : le NAS (Linux) doit les traduire et, selon sa
configuration Samba, il les stocke, les convertit ou les jette. Le réglage à
chercher côté serveur s'appelle `store dos attributes`.

Attention au piège inverse : sur certaines configurations, la marque « lecture
seule » se traduit en véritable interdiction d'écriture sur le dossier.

Test décisif proposé à l'utilisateur : personnaliser un dossier **à la main**
depuis Windows sur le partage. Si l'icône ne tient pas non plus, c'est le
partage, pas l'application.

Piste pour projecto : aujourd'hui, quand les marques ne passent pas, l'app se
tait. Relire une marque après coup et afficher « icônes non prises en charge par
cette destination » en fin de restauration.

À savoir : une mise à jour Windows d'octobre 2022 (KB5018418) a cassé les icônes
dont le fichier `.ico` est **stocké sur le partage**. Celles qui viennent des
bibliothèques système (`SHELL32.dll`, `imageres.dll`) fonctionnent toujours.
