// ─── Electron Vault API ────────────────────────────────────────────────────

export interface ElectronVaultAPI {
  getPath: () => Promise<string | null>
  choosePath: () => Promise<string | null>
  read: <T = unknown>(filename: string) => Promise<T | null>
  write: (filename: string, data: unknown) => Promise<void>
  writeMedia: (filename: string, base64data: string) => Promise<string>
  readMedia: (relativePath: string) => Promise<string | null>
  init: (customPath?: string) => Promise<string>
}

declare global {
  interface Window {
    electronVault?: ElectronVaultAPI
  }
}
