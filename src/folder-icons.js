/*
  projecto — icônes de dossiers (desktop.ini)
  Copyright (C) 2026 just edit
  SPDX-License-Identifier: GPL-3.0-or-later

  Sous Windows, l'icône personnalisée d'un dossier est décrite par un fichier
  caché `desktop.ini`. Le fichier ne suffit pas : Windows ne le lit que si

    • le fichier porte les marques « caché » et « système » ;
    • le dossier qui le contient porte la marque « lecture seule »
      (c'est ainsi que Windows repère un dossier personnalisé).

  Une copie ordinaire perd ces marques. Le ZIP, lui, les conserve : chaque
  entrée transporte ses attributs DOS. On les relit et on les repose après la
  restauration, en complétant ce qui manque.

  Aucun module natif : PowerShell fait le travail en un seul appel, `attrib`
  prend le relais s'il n'est pas disponible. Tout échec est silencieux — une
  icône manquante ne doit jamais faire échouer une restauration.
*/
'use strict';
const os = require('os');
const path = require('path');
const fs = require('fs');

const DOS = { READONLY: 0x01, HIDDEN: 0x02, SYSTEM: 0x04 };

// Découpe sur les deux séparateurs : un chemin Windows doit être reconnu même
// quand le code tourne ailleurs (tests, ZIP fabriqué sur un autre système).
function isDesktopIni(p) {
  const parts = String(p).split(/[\\/]/);
  return parts[parts.length - 1].toLowerCase() === 'desktop.ini';
}
function parentOf(p) {
  const i = Math.max(String(p).lastIndexOf('/'), String(p).lastIndexOf('\\'));
  return i > 0 ? String(p).slice(0, i) : path.dirname(String(p));
}

/*
  Construit la liste des marques à reposer.
  entries : [{ fullPath, isDir, dos, relPath }]
  Renvoie : [{ p: chemin, a: 'Hidden,System' | 'ReadOnly' }]
*/
function buildAttrList(entries) {
  const out = [];
  const iconFolders = new Set();
  for (const e of entries) {
    const dos = Number(e.dos) || 0;
    if (e.isDir) {
      if (dos & DOS.READONLY) out.push({ p: e.fullPath, a: 'ReadOnly' });
    } else if (isDesktopIni(e.fullPath)) {
      // Toujours caché + système, même si le ZIP ne portait pas les marques :
      // sans elles le fichier resterait visible au milieu des rushes.
      out.push({ p: e.fullPath, a: 'Hidden,System' });
      iconFolders.add(parentOf(e.fullPath));
    } else {
      const flags = [];
      if (dos & DOS.HIDDEN) flags.push('Hidden');
      if (dos & DOS.SYSTEM) flags.push('System');
      if (flags.length) out.push({ p: e.fullPath, a: flags.join(',') });
    }
  }
  // Un dossier qui reçoit un desktop.ini doit être marqué, même si le ZIP ne
  // le disait pas (dossier racine du projet, ZIP fabriqué par un autre outil).
  const already = new Set(out.filter(o => o.a === 'ReadOnly').map(o => o.p));
  for (const d of iconFolders) if (!already.has(d)) out.push({ p: d, a: 'ReadOnly' });
  return out;
}

// Script PowerShell : lit la liste et ajoute les marques, sans rien retirer.
function psScript(jsonPath) {
  const q = String(jsonPath).replace(/'/g, "''");
  return "$ErrorActionPreference='SilentlyContinue';" +
    `$l=Get-Content -LiteralPath '${q}' -Raw -Encoding UTF8 | ConvertFrom-Json;` +
    '$n=0;foreach($i in $l){try{$it=Get-Item -LiteralPath $i.p -Force;' +
    '$it.Attributes=$it.Attributes -bor [System.IO.FileAttributes]$i.a;$n++}catch{}};' +
    'Write-Output $n';
}

function attribArgs(item) {
  const flags = item.a === 'ReadOnly' ? ['+r'] : item.a.split(',').map(f => (f === 'Hidden' ? '+h' : '+s'));
  return [...flags, item.p];
}

/*
  Repose les marques. `run` a la signature de child_process.execFile promisifié :
  (cmd, args) => Promise. Injectable pour les tests.
*/
async function applyAttributes(list, { platform = process.platform, run, tmpDir = os.tmpdir() } = {}) {
  if (!list || !list.length) return { applied: 0, failed: 0, how: 'rien à faire' };
  if (platform !== 'win32') return { applied: 0, failed: 0, how: 'ignoré (hors Windows)' };

  const jsonPath = path.join(tmpDir, `projecto-attrs-${process.pid}.json`);
  try {
    fs.writeFileSync(jsonPath, JSON.stringify(list), 'utf8');
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript(jsonPath)]);
    return { applied: list.length, failed: 0, how: 'powershell' };
  } catch (e) {
    // Secours : attrib, un appel par chemin. Plus lent, mais toujours présent.
    let failed = 0;
    for (const item of list) {
      try { await run('attrib.exe', attribArgs(item)); } catch (e2) { failed++; }
    }
    return { applied: list.length - failed, failed, how: 'attrib' };
  } finally {
    try { fs.unlinkSync(jsonPath); } catch (e) {}
  }
}

/*
  macOS : le fichier est restauré (utile si le dossier part sur un partage lu
  depuis un PC) mais masqué dans le Finder, où il n'a aucun sens.
  chflags accepte plusieurs chemins — on découpe pour ne pas dépasser la
  longueur de ligne de commande.
*/
async function hideOnMac(paths, { platform = process.platform, run, chunk = 150 } = {}) {
  const files = (paths || []).filter(isDesktopIni);
  if (!files.length || platform !== 'darwin') return { hidden: 0 };
  let hidden = 0;
  for (let i = 0; i < files.length; i += chunk) {
    const part = files.slice(i, i + chunk);
    try { await run('/usr/bin/chflags', ['hidden', ...part]); hidden += part.length; } catch (e) {}
  }
  return { hidden };
}

module.exports = { DOS, isDesktopIni, buildAttrList, psScript, attribArgs, applyAttributes, hideOnMac };
