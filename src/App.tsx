import { useEffect, useState } from 'react'
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
import VaultSetup from './components/VaultSetup'
import { useRpgStore } from './store/useRpgStore'
import { ACCENT_COLORS } from './types/domain'
import { vaultStorage } from './lib/vaultStorage'

function App() {
  const settings = useRpgStore((s) => s.settings)
  const [vaultReady, setVaultReady] = useState(!vaultStorage.isElectron())
  const [checkingVault, setCheckingVault] = useState(vaultStorage.isElectron())

  // Check if vault is already configured on mount
  useEffect(() => {
    if (!vaultStorage.isElectron()) return
    vaultStorage.getPath().then((p) => {
      if (p) {
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
  }, [settings.theme, settings.accentColor])

  useEffect(() => {
    // Reset daily habit counters if it's a new day
    useRpgStore.getState().resetDailyHabits()
  }, [])

  // Show nothing while checking vault path
  if (checkingVault) return null

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
      <RewardNotifications />
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
