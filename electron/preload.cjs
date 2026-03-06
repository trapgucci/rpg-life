const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Notifications
  showNotification: (title, body, options = {}) => {
    return ipcRenderer.invoke('show-notification', { title, body, ...options })
  },

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizeChange: (cb) => {
    ipcRenderer.on('window:maximized', () => cb(true))
    ipcRenderer.on('window:unmaximized', () => cb(false))
  },
})

// License API
contextBridge.exposeInMainWorld('electronLicense', {
  getMachineId: () => ipcRenderer.invoke('license:getMachineId'),
  check: () => ipcRenderer.invoke('license:check'),
  save: (data) => ipcRenderer.invoke('license:save', data),
})

// Vault storage API
contextBridge.exposeInMainWorld('electronVault', {
  getPath: () => ipcRenderer.invoke('vault:getPath'),
  choosePath: () => ipcRenderer.invoke('vault:choosePath'),
  read: (filename) => ipcRenderer.invoke('vault:read', filename),
  write: (filename, data) => ipcRenderer.invoke('vault:write', filename, data),
  writeMedia: (filename, base64data) => ipcRenderer.invoke('vault:writeMedia', filename, base64data),
  readMedia: (relativePath) => ipcRenderer.invoke('vault:readMedia', relativePath),
  deleteMedia: (relativePath) => ipcRenderer.invoke('vault:deleteMedia', relativePath),
  deleteFile: (filename) => ipcRenderer.invoke('vault:deleteFile', filename),
  init: (customPath) => ipcRenderer.invoke('vault:init', customPath),
})
