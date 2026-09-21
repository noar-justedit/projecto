# projecto 1.6.0

**A new look.** projecto adopts the shared visual language of the just edit apps: the same surfaces, colours and components as ingesto. Nothing changes in how restoring works: same steps, same files, same results.

## New interface

- **Grouping by background, not by lines.** Every separator line and box outline is gone. Each group of settings is a card, and fields, lists and tiles sit in a darker area inside their card. The screen reads at a glance, with less visual noise.
- **Colours that mean the same thing everywhere.** Green means done or ready, red means failed or a source, blue means neutral information, orange means something to decide. Two consequences you will notice:
  - **Excluded folders are now orange** instead of red: excluding a folder isn't an error, it's a choice you'll be asked to confirm when you restore.
  - **The destination badge** turns green when a folder is set. When projecto reuses the folder from your last session, the badge is orange, because the folder will be asked for again at restore time.
- **projecto is now yellow.** The app icon keeps its tilted folder and film strip, now in folder yellow, and the logo dot in the window uses the same yellow. The colour identifies the app only: it's never used to show a state.
- **Sharper icon on Retina screens.** The icon was redrawn as a vector at its original shape and tilt, and now ships up to 1024 px on macOS (it stopped at 512 px before).
- **Templates in folder**: the selected template is the only one highlighted, with a green check. Beyond two templates, the list scrolls inside its card instead of pushing everything down.
- **Folders / Files counters** now sit at the bottom of the ZIP contents card.
- **Switches** follow the shared style, placed to the left of their label.
- **The update notice and the "New ZIP name" window** are redrawn in the same style.
- **Taller window by default** (920 × 800): the whole Setup column fits without scrolling, including the output folder name.

## Keyboard and accessibility

- **Esc** closes the right-click menu and the update notice. Closing the notice with Esc does not count as "Later": it will show again at next launch.
- Every icon-only button now has a name that VoiceOver can read.

## Fixed

- In the Setup column, cards could get squeezed instead of the column scrolling, which cut off the output folder name on smaller windows.
- After **Reset**, the template list stayed visible with the previous template still checked, although no source was loaded.

## Install

- **macOS**: `projecto-1.6.0-arm64.dmg`. Signed and notarized: open, drag to Applications, launch.
- **Windows**: `projecto-Setup-1.6.0.exe`. Still unsigned: if SmartScreen objects, click More info, then Run anyway.
