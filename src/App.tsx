import { useEffect, useState } from 'react'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import TasksPage from './pages/TasksPage'
import ShopPage from './pages/ShopPage'
import InventoryPage from './pages/InventoryPage'
import ReflectionPage from './pages/ReflectionPage'
import StatusPage from './pages/StatusPage'
import AchievementsPage from './pages/AchievementsPage'
import SettingsPage from './pages/SettingsPage'
import RewardNotifications from './components/RewardNotifications'
import NotificationWatcher from './components/NotificationWatcher'
import VaultSetup from './components/VaultSetup'
import LicenseGate from './components/LicenseGate'
import { licenseService } from './lib/licenseService'
import { useRpgStore } from './store/useRpgStore'
import { ACCENT_COLORS, FONT_FAMILIES } from './types/domain'
import { vaultStorage } from './lib/vaultStorage'
import { Toaster } from 'sonner'

function App() {
  useSmoothScroll()

  // Pause CSS animations when the window is hidden (minimized / tray)
  useEffect(() => {
    const handleVisibility = () => {
      document.documentElement.classList.toggle('app-hidden', document.hidden)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const settings = useRpgStore((s) => s.settings)
  const hasHydrated = useRpgStore((s) => s._hasHydrated)
  const [vaultReady, setVaultReady] = useState(!vaultStorage.isElectron())
  const [checkingVault, setCheckingVault] = useState(vaultStorage.isElectron())
  const [licensed, setLicensed] = useState(!vaultStorage.isElectron()) // dev mode = always licensed
  const [checkingLicense, setCheckingLicense] = useState(vaultStorage.isElectron())

  // Check license on mount (Electron only)
  useEffect(() => {
    if (!vaultStorage.isElectron()) return
    licenseService.isLicensed().then((valid) => {
      setLicensed(valid)
      setCheckingLicense(false)
    })
  }, [])

  // Check if vault is already configured on mount, and init it
  useEffect(() => {
    if (!vaultStorage.isElectron()) return
    vaultStorage.getPath().then(async (p) => {
      if (p) {
        // Re-init to ensure vault dir exists and is writable
        await vaultStorage.init(p)
        setVaultReady(true)
      }
      setCheckingVault(false)
    })
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark)
    root.dataset.theme = isDark ? 'dark' : 'light'
    root.classList.toggle('dark', isDark)

    // Apply accent color
    const accent = ACCENT_COLORS[settings.accentColor]
    const accentHex = isDark ? accent.dark : accent.light
    root.style.setProperty('--accent', accentHex)
    root.style.setProperty('--accent-hover', accentHex)

    // Dynamic accent variants (subtle bg + glow for shadows)
    const r = parseInt(accentHex.slice(1, 3), 16)
    const g = parseInt(accentHex.slice(3, 5), 16)
    const b = parseInt(accentHex.slice(5, 7), 16)
    root.style.setProperty('--accent-subtle', `rgba(${r},${g},${b},${isDark ? 0.15 : 0.1})`)
    root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},${isDark ? 0.3 : 0.4})`)

    root.classList.toggle('hide-scrollbars', !(settings.showScrollbars ?? true))

    // Apply font family
    const font = FONT_FAMILIES[settings.fontFamily ?? 'nunito']
    root.style.setProperty('--font-family', font.css)
  }, [settings.theme, settings.accentColor, settings.showScrollbars, settings.fontFamily])

  // Show nothing while checking license
  if (checkingLicense) return null

  // Show license activation screen if not licensed (Electron only)
  if (!licensed) {
    return <LicenseGate onActivated={() => setLicensed(true)} />
  }

  // Show nothing while checking vault configuration
  if (checkingVault) return null

  // Wait for store to finish rehydrating from vault
  if (!hasHydrated) return null

  // Show vault setup on first Electron launch
  if (!vaultReady) {
    return (
      <VaultSetup onComplete={() => {
        setVaultReady(true)
        // Force store rehydration by reloading
        window.location.reload()
      }} />
    )
  }

  return (
    <>
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: { fontSize: '15px', padding: '14px 20px' },
          className: 'dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700',
        }}
      />
      <RewardNotifications />
      <NotificationWatcher />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<TasksPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="reflection" element={<ReflectionPage />} />
          <Route path="status" element={<StatusPage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
