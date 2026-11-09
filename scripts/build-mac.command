#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║   projecto — Build macOS : signé, notarisé, prêt à envoyer   ║
# ╚══════════════════════════════════════════════════════════════╝
#
#   Double-clique ce fichier dans le Finder. C'est tout.
#   (ou, dans un terminal : ./scripts/build-mac.command)
#
# Le script s'occupe du reste : vérifications, configuration Apple au
# premier lancement, signature, notarisation, agrafage, contrôles.
#
# Options (en ligne de commande seulement, rarement utiles) :
#   --no-notarize   build signé mais non notarisé — test local rapide
#   --unsigned      build sans signature — test local uniquement

set -e

# Lancé par double-clic, le Terminal referme la fenêtre dès la fin du script
# selon ses réglages : on la retient pour que le résultat — ou l'erreur —
# reste lisible.
trap 'ST=$?; echo ""; read -p "Appuie sur Entrée pour fermer cette fenêtre… " _ </dev/tty 2>/dev/null || true; exit $ST' EXIT

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$SCRIPT_DIR/.."
PROFILE="projecto-notarization"
LOG_FILE="/tmp/projecto-build-mac.log"

MODE="release"
for arg in "$@"; do
  case "$arg" in
    --no-notarize) MODE="no-notarize" ;;
    --unsigned)    MODE="unsigned" ;;
    -h|--help)     sed -n '2,14p' "$0"; exit 0 ;;
    *) echo -e "${RED}Option inconnue : $arg${NC}"; exit 1 ;;
  esac
done

cd "$PROJECT_DIR"
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "?")

echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}        projecto $VERSION — Build macOS${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
case "$MODE" in
  release)     echo -e "        ${GREEN}signé + notarisé — prêt à distribuer${NC}" ;;
  no-notarize) echo -e "        ${YELLOW}signé, NON notarisé — test local${NC}" ;;
  unsigned)    echo -e "        ${YELLOW}NON signé — test local${NC}" ;;
esac
echo ""

# ── 1. Outils ─────────────────────────────────────────────────
echo -e "${BLUE}[1/6]${NC} Outils…"
command -v node &>/dev/null || { echo -e "${RED}✗ Node.js introuvable → https://nodejs.org (version LTS)${NC}"; exit 1; }
command -v npm  &>/dev/null || { echo -e "${RED}✗ npm introuvable${NC}"; exit 1; }
echo -e "${GREEN}✓ Node $(node --version) · npm $(npm --version)${NC}"

MISSING=0
[ ! -f "build-resources/icon.icns" ] && echo -e "${RED}✗ build-resources/icon.icns manquant${NC}" && MISSING=1
[ ! -f "electron-builder.yml" ]      && echo -e "${RED}✗ electron-builder.yml manquant${NC}"      && MISSING=1
[ ! -f "build-resources/entitlements.mac.plist" ] && echo -e "${RED}✗ entitlements.mac.plist manquant${NC}" && MISSING=1
[ $MISSING -eq 1 ] && exit 1

if [ "$MODE" != "unsigned" ]; then
  if ! xcrun --find notarytool &>/dev/null; then
    echo -e "${RED}✗ Outils Apple manquants.${NC}"
    echo -e "  Lance ${CYAN}xcode-select --install${NC} puis relance ce script."
    exit 1
  fi
  echo -e "${GREEN}✓ Outils Apple présents${NC}"
fi

# ── 2. Certificat de signature ────────────────────────────────
echo -e "${BLUE}[2/6]${NC} Certificat de signature…"
if [ "$MODE" = "unsigned" ]; then
  export CSC_IDENTITY_AUTO_DISCOVERY=false
  echo -e "${YELLOW}⚠ Signature désactivée${NC}"
else
  IDENTITIES=$(security find-identity -v -p codesigning 2>/dev/null | grep "Developer ID Application" || true)
  if [ -z "$IDENTITIES" ]; then
    echo -e "${RED}✗ Pas de certificat « Developer ID Application » dans ton trousseau.${NC}"
    echo ""
    echo -e "  ${BOLD}Comment l'obtenir (5 minutes, une seule fois) :${NC}"
    echo -e "  Le plus simple, avec Xcode installé :"
    echo -e "    Xcode → Settings → Accounts → ton compte → Manage Certificates"
    echo -e "    → bouton ${BOLD}+${NC} → ${BOLD}Developer ID Application${NC}"
    echo ""
    echo -e "  Sans Xcode :"
    echo -e "    ${CYAN}https://developer.apple.com/account/resources/certificates${NC}"
    echo -e "    → créer un certificat ${BOLD}Developer ID Application${NC}, télécharger"
    echo -e "    le .cer, double-cliquer dessus pour l'installer."
    echo ""
    echo -e "  Puis relance ce script."
    exit 1
  fi
  echo -e "${GREEN}✓ Certificat trouvé${NC}"
  echo "$IDENTITIES" | sed 's/^/    /'
  if [ "$(echo "$IDENTITIES" | wc -l | tr -d ' ')" -gt 1 ]; then
    echo -e "${YELLOW}  ⚠ Plusieurs certificats : le premier est utilisé.${NC}"
    echo -e "${YELLOW}    Pour en choisir un autre : export CSC_NAME=\"Developer ID Application: …\"${NC}"
  fi
  # Identité retenue pour signer le DMG (electron-builder signe l'app tout seul)
  if [ -n "${CSC_NAME:-}" ]; then
    SIGN_ID="$CSC_NAME"
  else
    SIGN_ID=$(echo "$IDENTITIES" | head -1 | sed -n 's/.*"\(.*\)".*/\1/p')
  fi
  if [ -z "$SIGN_ID" ]; then
    echo -e "${RED}✗ Impossible de lire le nom du certificat.${NC}"
    exit 1
  fi
fi

# ── 3. Compte Apple pour la notarisation ──────────────────────
# Au premier build, les identifiants sont demandés puis rangés dans le
# trousseau macOS sous le nom "projecto-notarization". Les fois suivantes,
# cette étape est instantanée et silencieuse.
echo -e "${BLUE}[3/6]${NC} Compte Apple…"
if [ "$MODE" = "release" ]; then
  if ! security find-generic-password -a "$PROFILE" &>/dev/null; then
    echo ""
    echo -e "${BOLD}${YELLOW}  Première utilisation : configuration du compte Apple${NC}"
    echo ""
    echo -e "  Trois informations vont t'être demandées. Elles seront rangées"
    echo -e "  dans ton trousseau macOS — tu ne les redonneras plus jamais."
    echo ""
    echo -e "  ${BOLD}Developer Apple ID${NC}     l'e-mail de ton compte développeur"
    echo ""
    echo -e "  ${BOLD}App-specific password${NC}  PAS ton mot de passe Apple habituel."
    echo -e "                         À créer ici, ça prend 30 secondes :"
    echo -e "                         ${CYAN}https://account.apple.com${NC}"
    echo -e "                         → Connexion et sécurité"
    echo -e "                         → Mots de passe pour les apps → +"
    echo ""
    echo -e "  ${BOLD}Developer Team ID${NC}      10 caractères, visible ici :"
    echo -e "                         ${CYAN}https://developer.apple.com/account${NC}"
    echo -e "                         (section Membership details)"
    echo ""
    read -p "  Prêt ? (Entrée pour continuer, Ctrl+C pour abandonner) "
    echo ""
    if ! xcrun notarytool store-credentials "$PROFILE"; then
      echo -e "${RED}✗ Configuration abandonnée ou échouée.${NC}"
      echo -e "  Relance le script quand tu auras tes identifiants sous la main."
      exit 1
    fi
    echo ""
    echo -e "${GREEN}✓ Compte Apple enregistré — c'était la seule fois${NC}"
  else
    echo -n "  Vérification des identifiants… "
    if xcrun notarytool history --keychain-profile "$PROFILE" &>/dev/null; then
      echo -e "${GREEN}OK${NC}"
    else
      echo -e "${YELLOW}pas de réponse${NC}"
      echo -e "${YELLOW}  Soit le réseau est coupé, soit le mot de passe applicatif a été${NC}"
      echo -e "${YELLOW}  révoqué côté Apple. Le build continue : si la notarisation échoue,${NC}"
      echo -e "${YELLOW}  supprime l'entrée « $PROFILE » du Trousseau d'accès et relance.${NC}"
    fi
  fi
  # C'est cette variable qui déclenche la notarisation par electron-builder,
  # puis l'agrafage du ticket sur l'app avant fabrication du DMG.
  export APPLE_KEYCHAIN_PROFILE="$PROFILE"
else
  echo -e "${YELLOW}⚠ Notarisation ignorée dans ce mode${NC}"
fi

# ── 4. Dépendances ────────────────────────────────────────────
echo -e "${BLUE}[4/6]${NC} Dépendances…"
npm install --silent 2>&1 | grep -v "^npm warn" || true
echo -e "${GREEN}✓ Installées${NC}"

# ── 5. Build ──────────────────────────────────────────────────
echo -e "${BLUE}[5/6]${NC} Construction du DMG (arm64)…"
if [ "$MODE" = "release" ]; then
  echo -e "${YELLOW}  L'app part chez Apple pour vérification : compte 2 à 10 minutes${NC}"
  echo -e "${YELLOW}  de plus. C'est normal, ne coupe pas. Va faire un café.${NC}"
fi
echo ""
set +e
npm run build 2>&1 | tee "$LOG_FILE"
BUILD_STATUS=${PIPESTATUS[0]}
set -e
if [ $BUILD_STATUS -ne 0 ]; then
  echo ""
  echo -e "${RED}✗ Build échoué. Journal complet : $LOG_FILE${NC}"
  grep -iE "error|invalid|failed" "$LOG_FILE" | tail -10 | sed 's/^/  /' || true
  exit 1
fi

DMG=$(find dist -maxdepth 1 -name "*.dmg" -print 2>/dev/null | head -1)
if [ -z "$DMG" ]; then
  echo -e "${RED}✗ Aucun DMG dans dist/ — le build a échoué silencieusement.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ DMG produit${NC}"

# ── 6. Signature + notarisation du DMG, puis contrôles ────────
echo -e "${BLUE}[6/6]${NC} Finalisation…"

# L'app à l'intérieur est signée par electron-builder. Le DMG lui-même, non :
# on le signe ici, dans l'ordre imposé par Apple — signer, puis notariser,
# puis agrafer. (On ne délègue pas ça à electron-builder : son option dmg.sign
# est désactivée par défaut et sa doc déconseille de l'activer avec la
# notarisation. Le faire nous-mêmes est plus prévisible.)
if [ "$MODE" != "unsigned" ]; then
  echo -n "  Signature du DMG… "
  if codesign --sign "$SIGN_ID" --timestamp --force "$DMG" 2>/tmp/projecto-dmg-sign.log; then
    echo -e "${GREEN}OK${NC}"
  else
    echo -e "${RED}échec${NC}"
    sed 's/^/    /' /tmp/projecto-dmg-sign.log
    exit 1
  fi
fi

if [ "$MODE" = "release" ]; then
  # L'app a déjà son ticket. On notarise maintenant l'image disque elle-même :
  # sans ça, macOS peut râler à l'ouverture du DMG, même si l'app est saine.
  echo -e "  Envoi du DMG à Apple…"
  if xcrun notarytool submit "$DMG" --keychain-profile "$PROFILE" --wait; then
    xcrun stapler staple "$DMG"
    echo -e "${GREEN}✓ DMG notarisé et agrafé${NC}"
  else
    echo -e "${RED}✗ Notarisation du DMG refusée par Apple.${NC}"
    echo -e "  Pour connaître la raison exacte, repère l'identifiant affiché"
    echo -e "  ci-dessus puis lance :"
    echo -e "  ${CYAN}xcrun notarytool log <identifiant> --keychain-profile $PROFILE${NC}"
    exit 1
  fi

  echo ""
  echo -e "  ${BOLD}Contrôles${NC}"
  OK_ALL=1
  APP=$(find dist -maxdepth 3 -name "*.app" -print 2>/dev/null | head -1)
  if [ -n "$APP" ]; then
    echo -n "    App signée         : "
    if codesign --verify --deep --strict "$APP" &>/dev/null; then echo -e "${GREEN}oui${NC}"; else echo -e "${RED}NON${NC}"; OK_ALL=0; fi
    echo -n "    App notarisée      : "
    if xcrun stapler validate "$APP" &>/dev/null; then echo -e "${GREEN}oui${NC}"; else echo -e "${RED}NON${NC}"; OK_ALL=0; fi
    echo -n "    App acceptée       : "
    if spctl -a -vvv -t install "$APP" &>/dev/null; then echo -e "${GREEN}oui${NC}"; else echo -e "${RED}NON${NC}"; OK_ALL=0; fi
  fi
  # Vérifié APRÈS l'agrafage : c'est la preuve que le ticket n'a pas cassé
  # la signature de l'image disque.
  echo -n "    DMG signé          : "
  if codesign --verify --strict "$DMG" &>/dev/null; then echo -e "${GREEN}oui${NC}"; else echo -e "${RED}NON${NC}"; OK_ALL=0; fi
  echo -n "    DMG notarisé       : "
  if xcrun stapler validate "$DMG" &>/dev/null; then echo -e "${GREEN}oui${NC}"; else echo -e "${RED}NON${NC}"; OK_ALL=0; fi
  echo -n "    DMG accepté        : "
  if spctl -a -t open --context context:primary-signature "$DMG" &>/dev/null; then echo -e "${GREEN}oui${NC}"; else echo -e "${RED}NON${NC}"; OK_ALL=0; fi
  if [ $OK_ALL -eq 0 ]; then
    echo ""
    echo -e "${RED}⚠ Un contrôle a échoué : ne distribue pas ce DMG tel quel.${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⚠ Non notarisé : macOS bloquera ce build sur une autre machine.${NC}"
fi

# ── Terminé ───────────────────────────────────────────────────
SIZE=$(du -sh "$DMG" 2>/dev/null | cut -f1)
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}              BUILD TERMINÉ 🎉${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}→${NC} $DMG  (${SIZE})"
echo ""
if [ "$MODE" = "release" ]; then
  echo -e "${CYAN}Vérifié par Apple. Tes utilisateurs double-cliquent, glissent l'app${NC}"
  echo -e "${CYAN}dans Applications et la lancent. Aucun avertissement, aucun Terminal.${NC}"
  echo ""
fi
# Le Finder s'ouvre sur le DMG : plus qu'à le glisser où tu veux.
open dist/ 2>/dev/null || true
