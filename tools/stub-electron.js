/*
  Fait croire à src/main.js qu'il tourne dans Electron, pour pouvoir appeler ses
  fonctions depuis Node et vérifier une restauration sans lancer l'application.
  À charger AVANT src/main.js : il détourne le chargement du module « electron ».
*/
const Module = require('module');

const handlers = {};   // rempli par les ipcMain.handle de main.js
const electron = {
  app: { getVersion: () => '0.0.0-test', whenReady: () => Promise.resolve(), on() {},
         requestSingleInstanceLock: () => true, quit() {} },
  BrowserWindow: function () {
    return { loadFile() {}, webContents: { once() {}, send() {} }, on() {}, isDestroyed: () => false };
  },
  ipcMain: { handle: (nom, fn) => { handlers[nom] = fn; }, once() {}, removeListener() {} },
  dialog: {}, shell: {},
};

const chargerOrigine = Module._load;
Module._load = function (demande, ...reste) {
  return demande === 'electron' ? electron : chargerOrigine.call(this, demande, ...reste);
};

module.exports = { electron, handlers };
