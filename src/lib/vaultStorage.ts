// ─── Vault Storage Service ──────────────────────────────────────────────────
// Abstraction over Electron IPC vault API with localStorage fallback for dev.

const isElectron = () => typeof window !== 'undefined' && !!window.electronVault

export const vaultStorage = {
  async getPath(): Promise<string | null> {
    if (isElectron()) {
      return window.electronVault!.getPath()
    }
    return null
  },

  async choosePath(): Promise<string | null> {
    if (isElectron()) {
      return window.electronVault!.choosePath()
    }
    return null
  },

  async init(customPath?: string): Promise<string> {
    if (isElectron()) {
      return window.electronVault!.init(customPath)
    }
    return 'localStorage'
  },

  async read<T = unknown>(filename: string): Promise<T | null> {
    if (isElectron()) {
      return window.electronVault!.read<T>(filename)
    }
    // Fallback: localStorage (for browser dev mode)
    const raw = localStorage.getItem(`vault:${filename}`)
    return raw ? JSON.parse(raw) : null
  },

  async write(filename: string, data: unknown): Promise<void> {
    if (isElectron()) {
      return window.electronVault!.write(filename, data)
    }
    localStorage.setItem(`vault:${filename}`, JSON.stringify(data))
  },

  async saveMedia(base64data: string, ext: string): Promise<string> {
    const filename = `${crypto.randomUUID()}.${ext}`
    if (isElectron()) {
      return window.electronVault!.writeMedia(filename, base64data)
    }
    // In browser — keep as data URL (old behavior)
    return base64data
  },

  async readMedia(relativePath: string): Promise<string | null> {
    if (isElectron()) {
      return window.electronVault!.readMedia(relativePath)
    }
    // In browser — the path IS the data URL
    return relativePath
  },

  async deleteMedia(relativePath: string): Promise<boolean> {
    if (isElectron()) {
      return window.electronVault!.deleteMedia(relativePath)
    }
    // In browser — nothing to delete
    return true
  },

  /** Read note content from a separate file */
  async readNoteContent(noteId: string): Promise<string> {
    const filename = `notes/note-${noteId}.json`
    const data = await this.read(filename)
    if (typeof data === 'string') return data
    return ''
  },

  /** Write note content to a separate file */
  async writeNoteContent(noteId: string, content: string): Promise<void> {
    const filename = `notes/note-${noteId}.json`
    await this.write(filename, content)
  },

  /** Delete note content file */
  async deleteNoteContent(noteId: string): Promise<void> {
    const filename = `notes/note-${noteId}.json`
    if (isElectron()) {
      try {
        await window.electronVault!.deleteFile(filename)
      } catch { /* ignore */ }
    } else {
      localStorage.removeItem(`vault:${filename}`)
    }
  },

  isElectron,
}

// ─── File Mapping ───────────────────────────────────────────────────────────
// Maps state slice keys to their vault filenames.

export const VAULT_FILES = {
  profiles: 'profile.json',
  activeProfileId: 'profile.json', // stored together with profiles
  taskGroups: 'task-groups.json',
  itemGroups: 'item-groups.json',
  achievementGroups: 'achievement-groups.json',
  tasks: 'tasks.json',
  achievements: 'achievements.json',
  craftRecipes: 'craft-recipes.json',
  shopItems: 'shop-items.json',
  inventory: 'inventory.json',
  purchaseHistory: 'purchase-history.json',
  usageHistory: 'usage-history.json',
  activeShopDiscountPercent: 'settings.json', // stored together with settings
  settings: 'settings.json',
  stats: 'stats.json',
  noteFolders: 'note-folders.json',
  notes: 'notes.json',
  dailyReports: 'daily-reports.json',
  dailyConditions: 'daily-conditions.json',
  dailyConditionEntries: 'daily-condition-entries.json',
  taskPresets: 'task-presets.json',
  deletionHistory: 'deletion-history.json',
} as const

// Files that need to be read (deduplicated since profile.json and settings.json
// each store multiple slices)
export const VAULT_READ_FILES = [
  'profile.json',
  'settings.json',
  'tasks.json',
  'task-groups.json',
  'shop-items.json',
  'item-groups.json',
  'achievement-groups.json',
  'inventory.json',
  'achievements.json',
  'craft-recipes.json',
  'purchase-history.json',
  'usage-history.json',
  'stats.json',
  'note-folders.json',
  'notes.json',
  'daily-reports.json',
  'daily-conditions.json',
  'daily-condition-entries.json',
  'task-presets.json',
  'deletion-history.json',
] as const
