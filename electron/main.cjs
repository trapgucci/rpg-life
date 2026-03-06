const { app, BrowserWindow, ipcMain, Notification, dialog, safeStorage, Tray, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')

const isDev = !app.isPackaged

// Performance: enable GPU rasterization and disable throttling
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('disable-renderer-backgrounding')

let mainWindow = null
let tray = null

function createTray() {
  const iconPath = isDev
    ? path.join(__dirname, '../build/icon.png')
    : path.join(process.resourcesPath, 'icon.png')
  tray = new Tray(iconPath)
  tray.setToolTip('RPG Life')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Открыть RPG Life',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hidden' }
      : { frame: false }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      scrollBounce: true,
      backgroundThrottling: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximized'))
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:unmaximized'))

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
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

// Window controls
ipcMain.handle('window:minimize', () => { mainWindow?.minimize() })
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.handle('window:close', () => { mainWindow?.close() })
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

// ─── License System ─────────────────────────────────────────────────────────

const LICENSE_FILE = 'license.json'

function getLicenseFilePath() {
  return path.join(app.getPath('userData'), LICENSE_FILE)
}

function generateMachineId() {
  const data = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || '',
    os.homedir(),
  ].join('|')
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32)
}

function readLicense() {
  const filePath = getLicenseFilePath()
  try {
    const buffer = fs.readFileSync(filePath)
    // Try encrypted format first (safeStorage)
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const decrypted = safeStorage.decryptString(buffer)
        return JSON.parse(decrypted)
      } catch {
        // Not encrypted — try plain JSON (legacy migration)
      }
    }
    // Fallback: plain JSON (legacy format)
    const plain = buffer.toString('utf-8')
    const data = JSON.parse(plain)
    // Auto-migrate: re-save as encrypted
    saveLicense(data)
    return data
  } catch {
    return null
  }
}

function saveLicense(data) {
  const json = JSON.stringify(data)
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(json)
    fs.writeFileSync(getLicenseFilePath(), encrypted)
  } else {
    // Fallback if OS keychain unavailable (rare)
    fs.writeFileSync(getLicenseFilePath(), json, 'utf-8')
  }
}

ipcMain.handle('license:getMachineId', () => {
  return generateMachineId()
})

ipcMain.handle('license:check', () => {
  const license = readLicense()
  if (!license || !license.token || !license.machineId) return false
  return license.machineId === generateMachineId()
})

ipcMain.handle('license:save', (_, { token, machineId, code }) => {
  saveLicense({ token, machineId, code, activatedAt: new Date().toISOString() })
  return true
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

// Sanitize filename — prevent path traversal
function safePath(vaultPath, filename) {
  const resolved = path.resolve(vaultPath, filename)
  if (!resolved.startsWith(vaultPath + path.sep) && resolved !== vaultPath) {
    return null // path traversal detected
  }
  return resolved
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
  const filePath = safePath(vaultPath, filename)
  if (!filePath) return null
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
  const filePath = safePath(vaultPath, filename)
  if (!filePath) return null
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
  const filePath = safePath(vaultPath, filename)
  if (!filePath) return false
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
  const filePath = safePath(mediaDir, filename)
  if (!filePath) return null
  // Strip data URL prefix if present
  const base64 = base64data.replace(/^data:[^;]+;base64,/, '')
  const buffer = Buffer.from(base64, 'base64')
  fs.writeFileSync(filePath, buffer)
  return 'media/' + filename
})

// Read a media file → base64 data URL
ipcMain.handle('vault:readMedia', async (_, relativePath) => {
  const vaultPath = getSavedVaultPath()
  if (!vaultPath) return null
  const filePath = safePath(vaultPath, relativePath)
  if (!filePath) return null
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
  // Safety: only delete files inside media/ directory
  if (!relativePath.startsWith('media/')) return false
  const filePath = safePath(vaultPath, relativePath)
  if (!filePath) return false
  try {
    fs.unlinkSync(filePath)
    return true
  } catch {
    return false
  }
})

// ─── App Lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()
  createTray()

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Don't quit — app lives in tray
})

app.on('before-quit', () => {
  app.isQuitting = true
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})
