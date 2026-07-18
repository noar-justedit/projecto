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
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFolder:       ()     => ipcRenderer.invoke('dialog:openFolder'),
  folderExists:     (p)    => ipcRenderer.invoke('fs:folderExists', p),
  restoreZip:       (args) => ipcRenderer.invoke('fs:restoreZip', args),
  readFile:         (p)    => ipcRenderer.invoke('fs:readFile', p),
  updateZip:        (args) => ipcRenderer.invoke('fs:updateZip', args),
  showMessageBox:   (opts) => ipcRenderer.invoke('dialog:showMessageBox', opts),
  listZipsInFolder: (p)    => ipcRenderer.invoke('fs:listZipsInFolder', p),
  showInputBox:     (opts) => ipcRenderer.invoke('dialog:showInputBox', opts),
  showInFinder:     (p)    => ipcRenderer.invoke('shell:showInFinder', p),
  playSound:        (name) => ipcRenderer.invoke('sound:play', name),
  openExternal:     (url)  => ipcRenderer.invoke('open-external', url),
  getVersion:       ()     => ipcRenderer.invoke('get-version'),
  onUpdateAvailable:(cb)   => { ipcRenderer.on('update-available', (_, d) => cb(d)); },
});
