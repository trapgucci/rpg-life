const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Notifications
  showNotification: (title, body, options = {}) => {
    return ipcRenderer.invoke('show-notification', { title, body, ...options })
  },

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
})

// Vault storage API
contextBridge.exposeInMainWorld('electronVault', {
  getPath: () => ipcRenderer.invoke('vault:getPath'),
  choosePath: () => ipcRenderer.invoke('vault:choosePath'),
  read: (filename) => ipcRenderer.invoke('vault:read', filename),
  write: (filename, data) => ipcRenderer.invoke('vault:write', filename, data),
  writeMedia: (filename, base64data) => ipcRenderer.invoke('vault:writeMedia', filename, base64data),
  readMedia: (relativePath) => ipcRenderer.invoke('vault:readMedia', relativePath),
  init: (customPath) => ipcRenderer.invoke('vault:init', customPath),
})
