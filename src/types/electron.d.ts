// ─── Electron Vault API ────────────────────────────────────────────────────

export interface ElectronVaultAPI {
  getPath: () => Promise<string | null>
  choosePath: () => Promise<string | null>
  read: <T = unknown>(filename: string) => Promise<T | null>
  write: (filename: string, data: unknown) => Promise<void>
  writeMedia: (filename: string, base64data: string) => Promise<string>
  readMedia: (relativePath: string) => Promise<string | null>
  deleteMedia: (relativePath: string) => Promise<boolean>
  deleteFile: (filename: string) => Promise<boolean>
  init: (customPath?: string) => Promise<string>
  listBackups: () => Promise<{ name: string; timestamp: string }[]>
  restoreBackup: (backupName: string) => Promise<{ restoredFiles: number; preRestoreBackup: string }>
}

declare global {
  interface Window {
    electronVault?: ElectronVaultAPI
  }
}
