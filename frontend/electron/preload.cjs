'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  platform:   process.platform,

  setAutoLaunch: (enabled) =>
    ipcRenderer.invoke('set-auto-launch', enabled),

  getAutoLaunch: () =>
    ipcRenderer.invoke('get-auto-launch'),

  showNotification: (title, body) =>
    ipcRenderer.invoke('show-notification', { title, body }),

  showWindow: () =>
    ipcRenderer.invoke('show-window'),

  minimizeToTray: () =>
    ipcRenderer.invoke('minimize-to-tray'),

  quitApp: () =>
    ipcRenderer.invoke('quit-app'),

  onAppCloseRequested: (callback) => {
    const handler = (event, ...args) => callback(...args)
    ipcRenderer.on('app-close-requested', handler)
    return () => ipcRenderer.removeListener('app-close-requested', handler)
  },

  reportPostureStatus: (status) =>
    ipcRenderer.send('posture-status', status),

  openExternal: (url) =>
    ipcRenderer.invoke('open-external', url),
})
