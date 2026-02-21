const { app, BrowserWindow, ipcMain, Notification } = require('electron')
const path = require('path')

const isDev = process.env.NODE_ENV !== 'production'

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#202020',
      symbolColor: '#e8e8e8',
      height: 32,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ─── IPC Handlers ───────────────────────────────────────────────────────────

// Show notification
ipcMain.handle('show-notification', async (_, { title, body, icon, silent }) => {
  if (!Notification.isSupported()) {
    console.warn('Notifications not supported on this platform')
    return false
  }

  const notification = new Notification({
    title: title || 'RPG Life',
    body: body || '',
    icon: icon || path.join(__dirname, '../public/vite.svg'),
    silent: silent ?? false,
  })

  notification.show()
  return true
})

// Get app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

// ─── App Lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})
