# projecto 1.5.5

**The macOS app is now signed and notarized by Apple.** No more "projecto is damaged and can't be opened", no more Terminal workaround — download, drag to Applications, launch.

## macOS

- **Signed with a Developer ID certificate and notarized by Apple.** The app and the DMG are both signed, and both carry a stapled notarization ticket, so Gatekeeper stays quiet even on a machine that is offline.
- The `READ ME FIRST.txt` first-launch note is gone from the DMG — it no longer applies. If you previously ran `xattr -cr /Applications/projecto.app`, nothing to undo: just replace the app.
- **Clearer permission prompts.** When projecto needs access to your Desktop, Documents, Downloads, an external drive or a network volume, macOS now explains what it's for instead of showing a bare prompt.
- Hardened runtime entitlements corrected: the previous file was missing the entitlements Electron requires (JIT, library validation) and carried sandbox-only keys that had no effect outside the App Store.

## Windows

Unchanged, and still unsigned — SmartScreen will show "Unknown publisher": More info → Run anyway.

## Install

- **macOS** — `projecto-1.5.5-arm64.dmg`. Open, drag to Applications, launch. That's it.
- **Windows** — `projecto-Setup-1.5.5.exe`.

## For maintainers

`./scripts/build-mac.command` now does everything in one command: checks, app signing, notarization, DMG signing, DMG notarization, stapling and final verification. On its first run it walks you through storing your Apple credentials in the keychain; every build after that is silent. `--no-notarize` and `--unsigned` are there for quick local tests. See the README.
