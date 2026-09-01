# projecto

Restore a full project folder structure from a ZIP template in seconds. Define your tree once, reuse it forever.

![projecto](docs/screenshot.png)

**Project Structure Restorer.** Folder naming: `YYMMDD_Project_Client`

---

## Build — macOS (signed & notarized)

**Double-click `scripts/build-mac.command` in the Finder.** Or, from a terminal:

```bash
./scripts/build-mac.command
```

First time after downloading the project, macOS may refuse to run the script
("cannot verify the developer"): right-click it → **Open** → Open. Once per file.

That's the whole build, for every release. The script checks the toolchain and
your Developer ID certificate, signs the app, sends it to Apple for notarization,
staples the ticket, builds the DMG, then **signs the DMG**, notarizes and staples
it in turn — the order Apple requires — and verifies everything before declaring
success. App and disk image are both signed and both carry a ticket, so Gatekeeper
stays quiet even offline.

On the **first run only**, it asks for your Apple ID, an app-specific password and
your Team ID, and stores them in the macOS keychain under the profile
`projecto-notarization`. Every later build reuses them silently.

Notarization adds 2–10 minutes to the build. For a quick local test:

```bash
./scripts/build-mac.command --no-notarize   # signed only
./scripts/build-mac.command --unsigned      # no signing at all
```

Requirements: an active Apple Developer account, a **Developer ID Application**
certificate in the keychain (the script tells you how to create one if it's
missing), and Xcode Command Line Tools (`xcode-select --install`).

Raw electron-builder targets, without signing/notarization plumbing:

```bash
npm run build              # Apple Silicon (arm64) DMG
npm run build:universal    # Universal (arm64 + x86_64)
npm run dev                # Dev preview, no build
```

---

## Build — Windows installer FROM macOS

```bash
./scripts/build-win-from-mac.command
```

electron-builder cross-compiles a 64-bit NSIS installer natively — no Docker, no Wine.
On first run it downloads the Windows Electron binary (~100 MB). Or: `npm run build:win`.

---

## Windows installer features

- Custom install directory (no admin required)
- Desktop shortcut
- Start Menu entry under **just edit -> projecto**
- GPL license shown in the installer
- Clean uninstaller
- Bilingual (English / French)

---

## Project structure

```
projecto/
├── electron-builder.yml      <- build configuration
├── package.json
├── scripts/
│   ├── build-mac.command          <- macOS DMG: sign, notarize, staple, verify
│   ├── build-win-from-mac.command <- Windows installer from macOS (native)
│   ├── dev.command                <- dev preview
│   ├── make-icon.command          <- regenerate icon.icns
│   ├── make-icon-win.command      <- regenerate icon.ico
├── build-resources/
│   ├── icon.icns
│   ├── icon.ico
│   ├── entitlements.mac.plist <- hardened runtime entitlements
│   └── license.txt           <- GPL, shown in installer
├── version.json              <- update feed
└── src/
    ├── main.js
    ├── preload.js
    ├── index.html
    └── vendor/jszip.min.js   <- bundled locally (runs offline)
```

---

© 2026 just edit

---

## Publishing to GitHub

From the project folder:

```bash
git init && git add . && git commit -m "projecto 1.5.1"
git remote add origin https://github.com/noar-justedit/projecto.git
git push -u origin main
git tag v1.5.1 && git push --tags
```

Tags (e.g. `v1.5.1`) are used to mark releases; builds are produced manually with the
scripts above, then attached to the corresponding GitHub release.

---

## Releasing an update

The app checks `version.json` (raw GitHub, `main` branch) at launch and shows an
in-app notice when a newer version is available. To publish an update:

1. Bump `"version"` in `package.json` and build the new binaries.
2. Create a GitHub release with the matching tag (e.g. `v1.5.2`) and attach the binaries.
3. Edit `version.json` so `"version"` matches the new release, then commit to `main`.

Order matters: publish the release **before** committing `version.json`, otherwise
the app announces an update whose download link doesn't exist yet.

Note: raw GitHub is CDN-cached (~5 min), so the notice may lag slightly after the commit.

---

## License

projecto is free software, released under the **GNU General Public License v3.0**.
See the [LICENSE](LICENSE) file for the full text.

Copyright (C) 2026 just edit

The logo uses the **Poppins** typeface (SIL Open Font License 1.1), see `src/assets/fonts/Poppins-OFL.txt`.
