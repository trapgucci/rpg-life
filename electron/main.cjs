const { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV !== 'production'

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
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
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      scrollBounce: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Flush pending vault writes before closing
  let isClosing = false
  mainWindow.on('close', (e) => {
    if (isClosing) return
    isClosing = true
    e.preventDefault()
    mainWindow.webContents.executeJavaScript('window.__flushAndClose && window.__flushAndClose()').catch(() => {})
    // Fallback: если рендерер не отвечает за 3 секунды — закрыть принудительно
    setTimeout(() => {
      mainWindow.destroy()
    }, 3000)
  })
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

// ─── Vault Storage ──────────────────────────────────────────────────────────

const VAULT_PATH_FILE = 'vault-path.txt'

function getVaultPathFile() {
  return path.join(app.getPath('userData'), VAULT_PATH_FILE)
}

function getSavedVaultPath() {
  try {
    const p = fs.readFileSync(getVaultPathFile(), 'utf-8').trim()
    if (p && fs.existsSync(p)) return p
  } catch {}
  return null
}

function saveVaultPath(vaultPath) {
  fs.writeFileSync(getVaultPathFile(), vaultPath, 'utf-8')
}

function getDefaultVaultPath() {
  return path.join(app.getPath('documents'), 'RPGLife')
}

// Atomic write: write to .tmp then rename
function atomicWriteFileSync(filePath, data) {
  const tmpPath = filePath + '.tmp'
  fs.writeFileSync(tmpPath, data, 'utf-8')
  fs.renameSync(tmpPath, filePath)
}

// Get current vault path
ipcMain.handle('vault:getPath', () => {
  return getSavedVaultPath()
})

// Choose vault folder via native dialog
ipcMain.handle('vault:choosePath', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выберите папку для хранилища RPG Life',
    defaultPath: getDefaultVaultPath(),
    properties: ['openDirectory', 'createDirectory'],
  })
  if (result.canceled || !result.filePaths.length) return null
  const chosen = result.filePaths[0]
  saveVaultPath(chosen)
  return chosen
})

// Initialize vault directory structure
ipcMain.handle('vault:init', async (_, customPath) => {
  const vaultPath = customPath || getSavedVaultPath() || getDefaultVaultPath()
  fs.mkdirSync(vaultPath, { recursive: true })
  fs.mkdirSync(path.join(vaultPath, 'media'), { recursive: true })
  fs.mkdirSync(path.join(vaultPath, 'notes'), { recursive: true })
  saveVaultPath(vaultPath)
  return vaultPath
})

// Read a JSON file from vault
ipcMain.handle('vault:read', async (_, filename) => {
  const vaultPath = getSavedVaultPath()
  if (!vaultPath) return null
  const filePath = path.join(vaultPath, filename)
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
})

// Write a JSON file to vault (atomic)
ipcMain.handle('vault:write', async (_, filename, data) => {
  const vaultPath = getSavedVaultPath()
  if (!vaultPath) return null
  const filePath = path.join(vaultPath, filename)
  // Ensure parent directory exists (for subdirectory writes like notes/note-xxx.json)
  const dir = path.dirname(filePath)
  if (dir !== vaultPath) {
    fs.mkdirSync(dir, { recursive: true })
  }
  atomicWriteFileSync(filePath, JSON.stringify(data, null, 2))
})

// Delete a file from vault
ipcMain.handle('vault:deleteFile', async (_, filename) => {
  const vaultPath = getSavedVaultPath()
  if (!vaultPath) return false
  // Safety: only allow notes/ subdirectory
  if (!filename.startsWith('notes/')) return false
  const filePath = path.join(vaultPath, filename)
  try {
    fs.unlinkSync(filePath)
    return true
  } catch {
    return false
  }
})

// Save a media file (base64 → binary)
ipcMain.handle('vault:writeMedia', async (_, filename, base64data) => {
  const vaultPath = getSavedVaultPath()
  if (!vaultPath) return null
  const mediaDir = path.join(vaultPath, 'media')
  fs.mkdirSync(mediaDir, { recursive: true })
  // Strip data URL prefix if present
  const base64 = base64data.replace(/^data:[^;]+;base64,/, '')
  const buffer = Buffer.from(base64, 'base64')
  const filePath = path.join(mediaDir, filename)
  fs.writeFileSync(filePath, buffer)
  return 'media/' + filename
})

// Read a media file → base64 data URL
ipcMain.handle('vault:readMedia', async (_, relativePath) => {
  const vaultPath = getSavedVaultPath()
  if (!vaultPath) return null
  const filePath = path.join(vaultPath, relativePath)
  try {
    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(filePath).slice(1).toLowerCase()
    const mime = ext === 'webp' ? 'image/webp'
      : ext === 'png' ? 'image/png'
      : ext === 'gif' ? 'image/gif'
      : 'image/jpeg'
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
})

ipcMain.handle('vault:deleteMedia', async (_, relativePath) => {
  const vaultPath = getSavedVaultPath()
  if (!vaultPath) return false
  const filePath = path.join(vaultPath, relativePath)
  try {
    // Safety: only delete files inside media/ directory
    if (!relativePath.startsWith('media/')) return false
    fs.unlinkSync(filePath)
    return true
  } catch {
    return false
  }
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
