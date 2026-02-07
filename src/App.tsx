import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import TasksPage from './pages/TasksPage'
import HabitsPage from './pages/HabitsPage'
import ShopPage from './pages/ShopPage'
import CraftingPage from './pages/CraftingPage'
import StatusPage from './pages/StatusPage'
import AchievementsPage from './pages/AchievementsPage'
import SettingsPage from './pages/SettingsPage'
import RewardNotifications from './components/RewardNotifications'
import { useRpgStore } from './store/useRpgStore'
import { ACCENT_COLORS } from './types/domain'

function App() {
  const settings = useRpgStore((s) => s.settings)
  
  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark)
    root.dataset.theme = isDark ? 'dark' : 'light'
    root.classList.toggle('dark', isDark)
    
    // Apply accent color
    const accent = ACCENT_COLORS[settings.accentColor]
    root.style.setProperty('--accent', isDark ? accent.dark : accent.light)
    root.style.setProperty('--accent-hover', isDark ? accent.dark : accent.light)
  }, [settings.theme, settings.accentColor])

  useEffect(() => {
    // Reset daily habit counters if it's a new day
    useRpgStore.getState().resetDailyHabits()
  }, [])

  return (
    <>
      <RewardNotifications />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<TasksPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="crafting" element={<CraftingPage />} />
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
