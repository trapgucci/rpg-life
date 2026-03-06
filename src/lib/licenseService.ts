// ─── License Service ────────────────────────────────────────────────────────
// Handles license activation via Cloudflare Worker.
// In browser dev mode (npm run dev), license is always valid.

// TODO: Replace with your actual Cloudflare Worker URL after deployment
const LICENSE_SERVER_URL = 'https://rpg-life-license.YOUR_NAME.workers.dev'

const isElectron = () => typeof window !== 'undefined' && !!window.electronLicense

export const licenseService = {
  /** Check if the app is licensed (local check only, no network) */
  async isLicensed(): Promise<boolean> {
    if (!isElectron()) return true // dev mode — always licensed
    return window.electronLicense!.check()
  },

  /** Get this machine's unique ID */
  async getMachineId(): Promise<string> {
    if (!isElectron()) return 'dev-machine'
    return window.electronLicense!.getMachineId()
  },

  /** Activate a license code via the server */
  async activate(code: string): Promise<{ ok: boolean; error?: string }> {
    const machineId = await this.getMachineId()

    try {
      const res = await fetch(`${LICENSE_SERVER_URL}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), machineId }),
      })

      const data = await res.json()

      if (data.ok && data.token) {
        // Save license locally
        await window.electronLicense!.save({ token: data.token, machineId, code })
        return { ok: true }
      }

      return { ok: false, error: data.error || 'unknown_error' }
    } catch {
      return { ok: false, error: 'network_error' }
    }
  },
}
