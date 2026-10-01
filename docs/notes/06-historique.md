# Historique et points ouverts

## Versions
- **1.5.3** — état au début du travail avec Claude.
- **1.5.4** — corrections d'audit (voir `AUDIT.md` à la racine). Les plus
  importantes : un `.DS_Store` à la racine d'un ZIP imbriquait tout le modèle
  d'un niveau ; « Re-include folder » ne faisait rien sur un sous-dossier ; la
  réécriture du ZIP n'était pas atomique (une coupure détruisait le modèle) ;
  une seule erreur d'écriture annulait toute la restauration.
- **1.5.5** — signature et notarisation macOS, scripts passés en `.command`
  double-cliquables, `READ ME FIRST.txt` supprimé (devenu inutile).
- **1.6.0** — charte UI appliquée, icône jaune, fenêtre 920 × 800. Deux défauts
  corrigés au passage : les cartes de la colonne Setup s'écrasaient au lieu de
  laisser la colonne défiler, et Reset laissait la liste des modèles affichée.
- **1.6.1** — icônes de dossiers Windows (voir `04-icones-dossiers.md`) et
  bandeau d'exclusions visible dès le départ, pour que l'arborescence ne saute
  plus quand on exclut le premier dossier.

## Points ouverts, classés par intérêt
1. **La barre de progression est décorative.** La restauration se fait en une
   passe synchrone dans le processus principal : la fenêtre est figée pendant ce
   temps. Invisible sur des dossiers vides, pénible dès qu'un modèle embarque des
   fichiers lourds (LUTs, presets, banques son). Correction propre : boucle
   asynchrone par entrée et événements de progression vers la fenêtre.
2. **Icônes de dossiers sur un NAS** : voir `04-icones-dossiers.md`. Au minimum,
   dire à l'utilisateur que les marques n'ont pas pris au lieu de se taire.
3. **Pas de bouton « Révéler dans le Finder »** après une restauration, alors que
   l'application sait déjà le faire pour le ZIP source.
4. **Les exclusions ne sont pas mémorisées** d'un chargement à l'autre. À voir si
   c'est voulu.
5. **`src/index.html` fait plus de 1000 lignes** : CSS, HTML et JS ensemble, plus
   une police en base64. Lisible aujourd'hui, mais tout passe par ce fichier.
6. **Le message de fin de restauration** garde ses emojis et sa forme de bandeau ;
   la charte propose plutôt une fenêtre à tuiles de bilan.
7. **Pas de suite de tests dans le dépôt.** Les vérifications ont été faites au
   coup par coup dans l'environnement de travail. Un `npm test` serait utile,
   mais **à ne pas ajouter aux scripts de build sans accord** (voir
   `01-conventions.md`).
