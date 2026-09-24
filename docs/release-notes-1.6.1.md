# projecto 1.6.1

Two improvements suggested by Erik Diaz, who restores Windows templates whose folders carry custom icons. Thanks for the detailed report and for sharing your template.

## Windows folder icons are now restored

Windows stores a folder's custom icon in a hidden `desktop.ini` file. Until now projecto skipped those files, and the restored project lost every icon.

- **`desktop.ini` files are restored**, with their contents untouched.
- **Their file marks are restored too.** A copied `desktop.ini` is ignored by Windows unless it is marked hidden and system, and unless its folder is marked as customized. projecto now replays those marks from the ZIP, and sets them itself when the ZIP doesn't carry them.
- **The template is protected.** "Update existing ZIP" used to strip those marks while rewriting the archive, which would have cost you the icons in the template itself, permanently.
- **They stay out of your way.** Icon files are never listed in the ZIP contents — a template with 130 of them stays readable. A badge in the header tells you how many were found, and the completion message says how many were kept.
- On macOS the files are restored but hidden in the Finder, so a project folder shared with Windows machines over a server keeps its icons.

## A steadier window

The panel that counts excluded folders used to appear only after the first exclusion, pushing the folder list down and costing you your place in the tree. It is now visible from the start, reading "No folder excluded", and the list no longer moves — verified down to the pixel, including inside the header.

## Install

- **macOS**: `projecto-1.6.1-arm64.dmg`. Signed and notarized: open, drag to Applications, launch.
- **Windows**: `projecto-Setup-1.6.1.exe`. Still unsigned: if SmartScreen objects, click More info, then Run anyway.
