/*
  projecto — Restore a full project folder structure from a ZIP template.
  Copyright (C) 2026 just edit

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.

  SPDX-License-Identifier: GPL-3.0-or-later
*/
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

// ── Vérification de mise à jour — lit un version.json dédié, hébergé sur GitHub ──
// Fichier propre à projecto (raw du dépôt). Ne bloque jamais le lancement,
// échoue en silence sur tout problème réseau.
const GITHUB_REPO = 'noar-justedit/projecto';
const UPDATE_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/version.json`;
function semverGt(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}
// GET une URL en suivant jusqu'à 3 redirections (https.get ne les suit pas seul).
// Échoue en silence sur tout problème réseau/TLS — ne bloque jamais le lancement.
function fetchFollow(url, hops, cb) {
  if (hops > 3) return cb(null);
  try {
    const req = https.get(url, { timeout: 4000 }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        let next; try { next = new URL(res.headers.location, url).toString(); } catch (e) { return cb(null); }
        return fetchFollow(next, hops + 1, cb);
      }
      if (res.statusCode !== 200) { res.resume(); return cb(null); }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => cb(body));
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => cb(null));
  } catch (e) { cb(null); }
}
function checkForUpdate() {
  fetchFollow(UPDATE_URL, 0, (body) => {
    if (!body) return;
    let info; try { info = JSON.parse(body); } catch (e) { return; }
    if (!info || !info.version) return;
    if (semverGt(info.version, app.getVersion()) && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', { version: info.version, url: info.url || 'https://www.just-edit.fr' });
    }
  });
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 920,
    height: 700,
    minWidth: 800,
    minHeight: 620,
    backgroundColor: '#0f0f10',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 12 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'build-resources', 'icon.icns')
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.once('did-finish-load', () => { setTimeout(checkForUpdate, 1500); });
}

// ── IPC: ouvrir un lien externe + exposer la version de l'app ──────────
ipcMain.handle('open-external', async (event, url) => { try { await shell.openExternal(url); } catch (e) {} });
ipcMain.handle('get-version', () => app.getVersion());

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── IPC: Open folder dialog (Browse button) ──────────────────────────
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Choose destination'
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// ── IPC: Check if folder exists ──────────────────────────────────────
ipcMain.handle('fs:folderExists', async (event, folderPath) => {
  return fs.existsSync(path.normalize(folderPath));
});

// ── IPC: Restore ZIP structure ────────────────────────────────────────
ipcMain.handle('fs:restoreZip', async (event, { zipPath, destPath, folderName, excludedPaths = [] }) => {
  const targetRoot = path.join(destPath, folderName);

  if (fs.existsSync(targetRoot)) {
    return { success: false, error: 'FOLDER_EXISTS', path: targetRoot };
  }

  try {
    const JSZip = require('jszip');
    const zipData = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(zipData);

    // ── Collect all paths, ignoring __MACOSX, hidden dot-files and traversal ──
    const allPaths = [];
    zip.forEach((relPath) => {
      const parts = relPath.split('/');
      // Ignore __MACOSX anywhere in path, and ._ prefixed files (macOS metadata)
      const isMacOS = parts.some(p => p === '__MACOSX' || p.startsWith('._'));
      // Zip Slip guard: reject any entry containing traversal or absolute segments
      const isUnsafe = parts.some(p => p === '..') || relPath.startsWith('/') || /^[a-zA-Z]:/.test(relPath);
      if (!isMacOS && !isUnsafe) allPaths.push(relPath);
    });

    // ── Detect single root folder to strip ──────────────────────────────
    // A ZIP has a single root if ALL non-empty paths share the same first segment
    let stripPrefix = '';
    const topLevelItems = new Set(
      allPaths
        .filter(p => p.trim() !== '')
        .map(p => p.split('/')[0])
        .filter(Boolean)
    );

    if (topLevelItems.size === 1) {
      // Every entry lives under a single root folder → strip it
      stripPrefix = [...topLevelItems][0] + '/';
    }
    // If topLevelItems.size > 1 → multiple root items, restore as-is

    // ── Create target root ───────────────────────────────────────────────
    fs.mkdirSync(targetRoot, { recursive: true });

    const results = [];

    for (const relPath of allPaths) {
      const entry = zip.files[relPath];
      if (!entry) continue;

      // Strip single root prefix if applicable
      let destRel = relPath;
      if (stripPrefix && destRel.startsWith(stripPrefix)) {
        destRel = destRel.slice(stripPrefix.length);
      }
      if (!destRel || destRel === '/') continue; // skip root itself

      // Check if this path or any parent is excluded (compare against stripped path)
      const isExcluded = excludedPaths.length > 0 && excludedPaths.some(excl => {
        const exclNorm = excl.endsWith('/') ? excl : excl + '/';
        return destRel === excl || destRel.startsWith(exclNorm);
      });
      if (isExcluded) continue;

      const fullDest = path.join(targetRoot, destRel);

      // Zip Slip guard (defense in depth): the resolved path MUST stay under targetRoot
      const rootResolved = path.resolve(targetRoot);
      const destResolved = path.resolve(fullDest);
      if (destResolved !== rootResolved && !destResolved.startsWith(rootResolved + path.sep)) continue;

      if (entry.dir) {
        fs.mkdirSync(fullDest, { recursive: true });
        results.push({ type: 'dir', path: destRel });
      } else {
        fs.mkdirSync(path.dirname(fullDest), { recursive: true });
        const content = await entry.async('nodebuffer');
        fs.writeFileSync(fullDest, content);
        results.push({ type: 'file', path: destRel });
      }
    }

    return { success: true, path: targetRoot, results };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Read file as buffer (for ZIP reload on startup) ─────────────────
ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    // Normalize path: on Windows, paths may use mixed slashes
    const p = require('path').normalize(filePath);
    const data = fs.readFileSync(p);
    // Buffer crosses IPC via structured clone (arrives as Uint8Array) — no per-byte Array copy
    return { ok: true, data };
  } catch (err) {
    // Return error details so the renderer can show a meaningful message
    return { error: err.message, code: err.code };
  }
});

// ── IPC: Update or create new ZIP with exclusions ────────────────────────
ipcMain.handle('fs:updateZip', async (event, { zipPath, excludedPaths, mode, customName }) => {
  try {
    const JSZip = require('jszip');
    const zipData = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(zipData);

    // Build new zip excluding the specified paths
    const newZip = new JSZip();

    // Detect strip prefix (single root folder)
    const allPaths = [];
    zip.forEach((relPath) => { if (!relPath.includes('__MACOSX') && !relPath.split('/').some(s => s.startsWith('._'))) allPaths.push(relPath); });
    const topLevel = new Set(allPaths.filter(p=>p.trim()).map(p=>p.split('/')[0]).filter(Boolean));
    const stripPrefix = topLevel.size === 1 ? [...topLevel][0] + '/' : '';

    const excluded = new Set(excludedPaths); // set of stripped paths to exclude

    for (const [relPath, entry] of Object.entries(zip.files)) {
      // Skip macOS metadata
      if (relPath.includes('__MACOSX') || relPath.split('/').some(s => s.startsWith('._'))) continue;

      // Compute stripped path for exclusion check
      let strippedPath = relPath;
      if (stripPrefix && strippedPath.startsWith(stripPrefix)) strippedPath = strippedPath.slice(stripPrefix.length);
      if (!strippedPath) continue;

      // Check if this path or any parent is excluded
      const isExcluded = excludedPaths.some(excl => {
        const exclNorm = excl.endsWith('/') ? excl : excl + '/';
        return strippedPath === excl || strippedPath.startsWith(exclNorm);
      });
      if (isExcluded) continue;

      if (entry.dir) {
        newZip.folder(relPath.replace(/\/$/, ''));
      } else {
        const content = await entry.async('nodebuffer');
        newZip.file(relPath, content);
      }
    }

    const newZipBuffer = await newZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });

    let outputPath = zipPath;
    if (mode === 'new') {
      const dir = path.dirname(zipPath);
      if (customName) {
        // Use the user-supplied name
        outputPath = path.join(dir, customName.endsWith('.zip') ? customName : customName + '.zip');
      } else {
        const ext = path.extname(zipPath);
        const base = zipPath.slice(0, -ext.length);
        outputPath = base + '_filtered' + ext;
      }
      // Ensure unique by appending number if file exists
      if (fs.existsSync(outputPath)) {
        const ext2 = path.extname(outputPath);
        const base2 = outputPath.slice(0, -ext2.length);
        let i = 1;
        while (fs.existsSync(base2 + '_' + i + ext2)) i++;
        outputPath = base2 + '_' + i + ext2;
      }
    }

    fs.writeFileSync(outputPath, newZipBuffer);
    return { success: true, path: outputPath, mode };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC: Show message box ─────────────────────────────────────────────────
ipcMain.handle('dialog:showMessageBox', async (event, opts) => {
  const { dialog } = require('electron');
  const result = await dialog.showMessageBox(mainWindow, opts);
  return result;
});

// ── IPC: List ZIPs in same folder ─────────────────────────────────────────
ipcMain.handle('fs:listZipsInFolder', async (event, filePath) => {
  try {
    const dir = path.dirname(filePath);
    const entries = fs.readdirSync(dir);
    const zips = entries
      .filter(f => f.toLowerCase().endsWith('.zip'))
      // Use forward slashes always — avoids escaping issues in renderer
      .map(f => path.join(dir, f).replace(/\\/g, '/'));
    return zips;
  } catch (err) {
    return [];
  }
});

// ── IPC: Show input box (custom text prompt) ──────────────────────────────
// HTML-escape all interpolated values (title/message can derive from file names)
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
ipcMain.handle('dialog:showInputBox', async (event, { title, message, defaultValue, placeholder }) => {
  // Electron doesn't have a native input dialog, so we use a custom BrowserWindow
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      width: 420,
      height: 180,
      resizable: false,
      minimizable: false,
      maximizable: false,
      modal: true,
      parent: mainWindow,
      backgroundColor: '#141416',
      titleBarStyle: 'hiddenInset',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload-input.js')
      }
    });

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #141416; color: #f2f2f5; padding: 22px 16px 16px; -webkit-font-smoothing: antialiased; }
.title { font-size: 14px; font-weight: 600; letter-spacing: 0.04em; margin-bottom: 5px; }
.msg { font-size: 12px; color: #78788e; margin-bottom: 12px; }
input { width: 100%; background: #1c1c20; border: 1px solid rgba(0,230,118,0.35); border-radius: 5px; color: #f2f2f5; font-family: 'SF Mono','Fira Code',monospace; font-size: 12px; padding: 8px 10px; outline: none; }
.btns { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
button { font-family: inherit; font-size: 12px; padding: 7px 16px; border-radius: 5px; cursor: pointer; border: 1px solid; letter-spacing: 0.03em; }
.ok { background: #00e676; color: #000; border-color: #00e676; font-weight: 600; }
.cancel { background: transparent; color: #78788e; border-color: rgba(255,255,255,0.12); }
</style></head>
<body>
<div class="title">${escHtml(title)}</div>
<div class="msg">${escHtml(message)}</div>
<input id="inp" type="text" value="${escHtml(defaultValue)}" placeholder="${escHtml(placeholder)}">
<div class="btns">
  <button class="cancel" onclick="window.inputAPI.submit(null)">Cancel</button>
  <button class="ok" onclick="window.inputAPI.submit(document.getElementById('inp').value)">Save</button>
</div>
<script>
  const inp = document.getElementById('inp');
  inp.focus(); inp.select();
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.inputAPI.submit(inp.value);
    if (e.key === 'Escape') window.inputAPI.submit(null);
  });
</script>
</body></html>`;

    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const { ipcMain: ipc } = require('electron');
    const handler = (ev, value) => { resolve(value); win.destroy(); };
    ipc.once('input-result', handler);
    win.on('closed', () => { ipc.removeListener('input-result', handler); resolve(null); });
  });
});

// ── IPC: Show file in Finder ──────────────────────────────────────────────
ipcMain.handle('shell:showInFinder', async (event, filePath) => {
  const { shell } = require('electron');
  shell.showItemInFolder(filePath);
  return true;
});

