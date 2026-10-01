# Conventions de travail avec Noar

## Décisions
- **Rien hors de la demande.** Aucune modification des scripts de build, de
  l'outillage, des dépendances, de l'organisation des fichiers ou des
  comportements par défaut sans accord explicite. Proposer, expliquer l'impact,
  attendre le « oui ». Règle posée le 28/09/2026 : un `npm test` ajouté d'office
  à un script de build a bloqué deux builds, à cause de tests qui dépendaient de
  l'environnement (NAS non monté, disque APFS).
- **Jamais de changement de numéro de version sans confirmation explicite.**
- **Jamais de `git push`** sans demande explicite. Historiquement, Noar poussait
  tout à la main par l'interface web de GitHub.

## Scripts
- Extension `.command`, jamais `.sh` : Noar les lance en double-cliquant dans le
  Finder.
- **Un seul script par plateforme, qui fait tout, sans étape préalable.** Pas de
  script de configuration séparé : si une information manque (identifiants
  Apple), le script la demande à la volée puis continue.
- Sortie terminal en français, claire, sans jargon.
- Prévoir le double-clic : le dossier courant est le home, donc calculer les
  chemins depuis `BASH_SOURCE` ; et retenir la fenêtre en fin de script avec un
  `trap ... EXIT` qui fait un `read`, tout en conservant le code de sortie
  (`ST=$?` … `exit $ST`). Sans ça, les erreurs disparaissent à la fermeture.
- Après un téléchargement, macOS bloque le premier lancement d'un `.command`
  (quarantaine) : clic droit → Ouvrir, une fois par fichier.
- `scripts/build-win-from-mac.command` : **contenu à ne pas toucher.**

## Publication
- Ordre impératif : release GitHub avec les binaires d'abord, `version.json` sur
  `main` ensuite. L'app lit `version.json` au lancement pour annoncer les mises à
  jour ; publié dans l'autre ordre, elle annonce une version non téléchargeable.
- Le numéro vit dans `package.json` et `version.json` : les deux ensemble.
- Note de version en anglais, orientée utilisateur.

## Historique de l'ancien mode de travail (jusqu'au 30/09/2026)
Le travail se faisait dans une session Claude en ligne : livraison d'un zip
`projecto_<version>.zip` complet + la note de version, Noar décompressait,
buildait et publiait. Le passage à Claude Code en local supprime le zip : les
fichiers sont modifiés directement dans son dossier.

⚠️ L'envoi par l'interface web de GitHub **ajoute sans supprimer** et **perd le
bit exécutable** des scripts. Le dépôt a donc traîné des fichiers morts
(anciens `.sh`, `READ ME FIRST.txt`) et des scripts en 644. À vérifier une fois
pour toutes maintenant que git est utilisé normalement.
