# Changelog

All notable changes to projecto. Newest first.

## 1.7.0

- New, simpler interface in line with the other just edit apps (syncto, filo): compact title bar, one "Template" card listing the ZIPs of the folder, drop a ZIP anywhere in the window, destination chosen by clicking the field, folder name options on one line with the full output path.
- A checkbox on every folder of the structure; Space and right-click still exclude. Counters and "Include all" move to the header.
- The Restore button names the folder it creates.
- Summary window after a restore: tiles for folders, files, folder icons, excluded folders and errors; "Show in Finder"; "Update ZIP" / "Save as new ZIP…" offered in the same window.
- The template list refreshes when the window comes back to the front.
- Electron 44: macOS 13 (Ventura) or later is now required.
- Fixed: right-click on a template in the list did nothing.

## 1.6.1

- Windows folder icons (`desktop.ini`) are restored with their hidden/system marks, and kept when the template ZIP is rewritten.
- The excluded-folders panel is visible from the start, so the tree no longer jumps on the first exclusion.

## 1.6.0

- New look based on the shared visual language of the just edit apps; yellow app icon, sharper on Retina screens.
- Excluded folders shown in orange; Esc closes the right-click menu and the update notice.
- Fixed: Setup cards squeezed on small windows; the template list stayed visible after Reset.

## 1.5.5

- macOS app signed and notarized by Apple (app and DMG); clearer permission prompts.

## 1.5.4

- A `.DS_Store` at the root of a ZIP no longer nests the whole structure one level too deep.
- "Re-include folder" works on a subfolder of an excluded folder.
- Rewriting the template ZIP is atomic: an interruption can no longer destroy it.
- One file that cannot be written no longer cancels the whole restore; errors are counted.
- Windows reserved names (CON, NUL…) refused with a clear message; "Save as new ZIP" name confined to the template folder; external links limited to http/https.
