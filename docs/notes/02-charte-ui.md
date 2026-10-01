# Charte UI

Langage visuel commun à toutes les applications de Noar (ingesto, presto,
syncto, renamo, archivo, prodtracker, projecto…), arrêté sur ingesto 2.7.0 en
septembre 2026. La référence complète, avec chaque composant rendu pour de vrai,
est la page `charte-ui-noar.html` que Noar conserve de son côté.

## La règle
Le groupement est porté par **le fond**, jamais par un trait.

| Niveau | Jeton | Valeur | Ce que c'est |
|---|---|---|---|
| 1 | `--page` | `#0a0b0e` | le fond de fenêtre |
| 2 | `--card` | `#14161c` | une carte : un groupe d'informations |
| 3 | `--ins` | `#0e1014` | un creux dans une carte : champ, tuile, ligne de liste |
| flottant | `--raise` | `#1b1d24` | menu, infobulle, survol |

**Aucune bordure, aucun filet de séparation.** Le seul contour autorisé est celui
qui dit un état : sélection, focus clavier, alerte.
12 px entre deux cartes. Rayons : carte 14, creux 11, champ 8, badge 4.

## Jetons
```css
:root{
  --page:#0a0b0e; --card:#14161c; --ins:#0e1014; --raise:#1b1d24;
  --text:#e8eaf0; --text2:#aeb3bd; --text3:#8b909b; --text4:#6f757f;
  --green:#35c98b; --red:#f2555a; --blue:#4d90f0; --orange:#f2a03d;
  --accent:#f7d038;   /* propre à projecto : le jaune de son icône */
  --r-card:14px; --r-ins:11px; --r-field:8px; --r-badge:4px;
}
```

**Le sens des couleurs d'état ne change jamais d'une application à l'autre :**
vert ce qui est fait et vérifié, rouge ce qui a échoué ou ce qui est une source,
bleu une information neutre, orange ce qui manque ou demande une décision.
**L'accent ne sert qu'à la marque.** Jamais pour un état.

## Composants
- **Badge** : un seul gabarit. `font-size:9px; font-weight:700;
  letter-spacing:.06em; padding:2px 6px; border-radius:4px;` couleur pleine sur
  la même couleur à 15 % (`{couleur}26`). Seule la couleur change de sens.
- **Étiquette de champ** : capitales, 10/700, interlettrage `.14em`, couleur
  `--text3`, et **hauteur fixe de 12 px** (`height:12px; line-height:12px`) :
  c'est ce qui garde deux colonnes alignées.
- **Champ** : un creux, sans bordure, rayon 8. Au focus, liseré intérieur
  `inset 0 0 0 1px rgba(255,255,255,.18)`.
- **Boutons**, trois formes : discret (fond creux, rayon 9) ; icône seule (carré
  de 28, rayon 8, **toujours `aria-label` + `title`**) ; action principale
  (pleine largeur, rayon 14, fond teinté de sa couleur d'état, texte de cette
  couleur — `#0f2c1d` et `--green` pour une action verte).
- **Listes** : une ligne est un creux, séparée par un écart, jamais par un filet.
  Dans une liste de choix, **l'élément actif est le seul posé sur un fond** ;
  une coche verte peut s'ajouter, rien d'autre.
- **Interrupteur** : 34 × 20, pastille de 14, à gauche du libellé.
- **Menus** : sur `--raise`, rayon 12, ombre `0 18px 44px rgba(0,0,0,.6)`.
- **Débordement** : aucune poignée déplaçable. Deux rangées puis ascenseur, avec
  **une lichette de la rangée suivante qui dépasse** : une coupe nette donne
  l'impression que tout est affiché. La hauteur se mesure, elle ne se devine pas.
- **Typographie** : titre de fenêtre 26/700, titre de carte 18/600, nom d'objet
  16/600, champ 14/400, texte courant 12.5/400, aide 11.5/400, étiquette 10/700.
  Chasse fixe pour les chemins, noms de fichiers, jetons et nombres à comparer.
  Jamais pour de la prose.
- **Fenêtres** : carte sur un voile noir à 70 %, rayon 18. Boutons pleine largeur
  en bas. **Échap ferme toute fenêtre qui ne fait qu'informer** ; une fenêtre qui
  porte une décision garde ses boutons.

## Comment la charte est appliquée dans projecto
Un **bloc unique en fin de feuille de style** de `src/index.html`, qui redéfinit
par-dessus les règles d'origine sans les réécrire : la refonte se lit d'un seul
tenant et se retire d'un bloc. Les anciens jetons (`--bg`, `--bg2`, `--border`…)
y sont rebranchés sur ceux de la charte pour tout ce qui n'est pas repris.

Décisions propres à projecto :
- Exclusions en **orange** et non en rouge : exclure n'est ni un échec ni une
  source, c'est une décision à confirmer.
- Badge destination : vert quand le dossier est choisi, orange quand il vient de
  la session précédente (il sera redemandé).
- Bouton « Get it » de la mise à jour en bleu (information neutre).
- Fenêtre 920 × 800 par défaut : la colonne Setup tient entière.
