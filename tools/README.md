# Outils de vérification

Ces scripts ne font pas partie de l'application : ils servent à la vérifier
pendant le développement. Ils ne sont pas embarqués dans les installeurs
(`electron-builder.yml` n'emporte que `src/` et `package.json`).

Avant la première utilisation, deux installations, une fois pour toutes :

```bash
npm install                                               # dépendances du projet
npm install --save-dev playwright && npx playwright install chromium
```

La première sert à `test-restore.js`, qui appelle le vrai code de restauration
et a donc besoin de jszip. La seconde sert à `verify.js` et
`apercu-interface.js`, qui ouvrent l'interface dans un vrai navigateur.
`test-icons.js`, lui, tourne avec Node seul, sans rien installer.

| Script | À quoi il sert |
|---|---|
| `test-icons.js` | Contrôle la logique des marques de fichiers Windows (icônes de dossiers), avec un exécuteur simulé. Ne touche à rien sur la machine. |
| `test-restore.js <modele.zip>` | Restaure vraiment un ZIP dans un dossier temporaire et vérifie le résultat fichier par fichier. Les nombres attendus (130 icônes, 143 dossiers) sont ceux du modèle d'Erik Diaz : avec un autre ZIP, demande à Claude de les réajuster. |
| `verify.js` | Ouvre l'interface et vérifie les promesses de la charte : nom lisible sur chaque bouton à icône, aucune bordure de structure, jetons de couleur, Échap qui ferme, etc. |
| `apercu-interface.js <modele.zip>` | Ouvre l'interface avec un ZIP chargé et enregistre des captures d'écran, sans compiler l'application. |

```bash
node tools/test-icons.js
node tools/test-restore.js ~/Templates/mon-modele.zip
node tools/verify.js
node tools/apercu-interface.js ~/Templates/mon-modele.zip
```

`stub-electron.js` fait croire à `src/main.js` qu'il tourne dans Electron : c'est
ce qui permet d'appeler ses fonctions depuis Node. À charger avant lui.

**Une règle qui a fait ses preuves** : quand tu ajoutes un contrôle, casse
volontairement le code, vérifie que le contrôle passe au rouge, puis remets en
état. Un contrôle ajouté sans cette vérification a déjà laissé passer un défaut.
