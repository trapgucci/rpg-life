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
