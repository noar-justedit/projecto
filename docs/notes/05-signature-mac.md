# Signature et notarisation macOS

En place depuis la 1.5.5. Noar a un compte Apple Developer payant.

## Principe
Signer l'application avec son certificat Developer ID, l'envoyer à Apple qui la
vérifie et renvoie un « ticket », puis agrafer ce ticket au fichier. Au
lancement, macOS lit le ticket et laisse passer sans avertissement.

Le ticket est agrafé **deux fois** : sur l'application et sur le DMG. Si on ne le
fait que sur le DMG, l'application affiche un avertissement quand l'utilisateur
est hors ligne.

## Ordre imposé par Apple
signer → notariser → agrafer. Jamais dans un autre ordre.

Chaîne complète dans `scripts/build-mac.command` :
electron-builder signe le `.app` → notarise (déclenché par la variable
`APPLE_KEYCHAIN_PROFILE`) → agrafe le `.app` → construit le DMG → **le script
signe le DMG** (`codesign --sign "$SIGN_ID" --timestamp --force`) → notarise le
DMG → agrafe → contrôles.

## Détails à ne pas perdre
- Profil notarytool dans le trousseau : **`projecto-notarization`**. Détecté
  localement par `security find-generic-password -a "$PROFILE"` ; s'il manque,
  le script lance `xcrun notarytool store-credentials` et guide Noar.
- `dmg.sign` reste à `false` dans `electron-builder.yml` : la documentation
  d'electron-builder déconseille l'option en présence de notarisation, la
  signature du DMG est faite explicitement par le script. Identité lue depuis
  `security find-identity`, surchargeable par `CSC_NAME`.
- **Entitlements** : garder `allow-jit`, `allow-unsigned-executable-memory` et
  `disable-library-validation` (ce sont les défauts d'electron-builder ; les
  omettre fait planter l'app signée au lancement). Les clés
  `com.apple.security.files.*` et les temporary-exception ne servent qu'en
  sandbox : retirées.
- Contrôles finaux du script : app signée / notarisée / acceptée, DMG signé /
  notarisé / accepté. Le `codesign --verify` du DMG est fait **après** l'agrafage,
  ce qui prouve que le ticket n'a pas cassé la signature. Un contrôle rouge fait
  sortir le script en erreur.
- Comptez 2 à 10 minutes de plus par build.
- Windows reste non signé : SmartScreen affiche « Éditeur inconnu ». Un
  certificat OV coûte 200 à 400 €/an et impose un support matériel.
