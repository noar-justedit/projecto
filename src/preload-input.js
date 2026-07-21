/*
  projecto — Restore a full project folder structure from a ZIP template.
  Copyright (C) 2026 just edit
  SPDX-License-Identifier: GPL-3.0-or-later

  Preload for the small input dialog window: exposes a single, safe channel.
*/
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('inputAPI', {
  submit: (value) => ipcRenderer.send('input-result', value),
});
