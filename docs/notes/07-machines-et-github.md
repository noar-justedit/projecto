# Machines, GitHub, et où vit quoi

## Les trois copies
| Où | Quoi | Qui la met à jour |
|---|---|---|
| Le dossier sur le Mac | l'atelier : c'est là qu'on travaille | Claude Code, en local |
| Le dépôt GitHub | la référence publiée et la sauvegarde | Noar, quand il dit « envoie » |
| La release GitHub | les installeurs `.dmg` et `.exe` | Noar, après le build |

Le dossier a toujours un peu d'avance sur GitHub. C'est normal : on envoie quand
le travail est bon, pas à chaque essai.

**Les sessions lancées depuis le téléphone ne voient que GitHub**, jamais le
dossier du Mac. Ce qui n'est pas poussé n'existe pas pour elles.

## Règles git pour ce projet
- Commits en local : seulement quand Noar le demande.
- `git push` : **jamais sans son accord explicite**.
- Avant de changer de machine : pousser. En arrivant sur l'autre : récupérer.
  C'est le seul vrai piège de l'organisation à deux Mac.

## Travailler depuis le téléphone
L'onglet **Code** de l'application Claude sur mobile lance une session dans le
nuage : elle clone le dépôt, travaille sur une branche, propose le résultat, et
continue même téléphone rangé. Elle ne peut ni builder l'application signée
(cela demande le Mac et son trousseau), ni atteindre un NAS ou une machine
Windows.

Autre possibilité : **piloter à distance** une session lancée sur le Mac depuis
le téléphone. Le Mac doit rester allumé, l'application ouverte.

## Builder sur une deuxième machine (portable)
Ce qu'il faut y apporter :
1. **Le code** : le récupérer depuis GitHub, pas le copier à la main.
2. **Node.js** (version LTS) et les outils Apple en ligne de commande
   (`xcode-select --install`). Le script de build réclame ce qui manque.
3. **Le certificat de signature.** Il n'est pas téléchargeable depuis Apple : sa
   clé privée n'existe que dans le trousseau du Mac qui l'a créé. Sur ce Mac :
   Trousseau d'accès → « Developer ID Application » → déplier la ligne pour voir
   la clé privée → sélectionner les deux → clic droit → Exporter → fichier `.p12`
   protégé par un mot de passe. Sur le portable : double-cliquer, saisir le mot
   de passe, **puis supprimer le `.p12`**.

Les identifiants de notarisation n'ont pas à être copiés : au premier build, le
script voit qu'ils manquent et les demande (identifiant Apple, Team ID, mot de
passe applicatif).

Portable Intel : le build fonctionne et produit bien un installeur destiné aux
Mac Apple Silicon, mais l'application ne peut pas être testée sur ce portable.
Le build Windows, lui, marche depuis n'importe quel Mac.

## Ordre d'une sortie de version
1. Le travail, validé dans le dossier.
2. Numéro de version confirmé par Noar, dans `package.json` et `version.json`.
3. `docs/release-notes-<version>.md`, en anglais.
4. Build mac, puis build Windows (depuis le Mac).
5. Test du DMG.
6. Envoi sur GitHub.
7. Release GitHub **avec les installeurs**.
8. `version.json` sur `main` en dernier. Jamais avant : l'app annoncerait une
   mise à jour qui n'existe pas encore.
