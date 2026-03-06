import { Outlet } from 'react-router-dom'
import WindowTitleBar from './WindowTitleBar'
import Sidebar from './Sidebar'
import MobileBottomNav from './MobileBottomNav'
import { useRpgStore } from '../store/useRpgStore'
import { CURRENCY_IDS, xpForLevelStandard } from '../types/domain'
import { Coins, Gem } from 'lucide-react'

function CurrencyDisplay() {
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  
  const profile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null
  const coins = profile?.currencies[CURRENCY_IDS.COINS] ?? 0
  const gems = profile?.currencies[CURRENCY_IDS.GEMS] ?? 0

  if (!profile) return null

  const xpForNext = xpForLevelStandard(profile.level + 1) - xpForLevelStandard(profile.level)
  const progress = xpForNext > 0 ? (profile.xp / xpForNext) * 100 : 0
  
  return (
    <div className="glass flex items-center justify-between px-3 py-2 md:px-5 md:py-3">
      {/* Profile section */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <div className="relative shrink-0">
          <div className="flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-base md:text-lg shadow-lg shadow-indigo-500/30">
            👤
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-[8px] md:text-[10px] font-bold text-white shadow-md">
            {profile.level}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--fg)] text-sm md:text-base truncate">{profile.name}</span>
            <span className="badge badge-accent hidden sm:inline-flex">Ур. {profile.level}</span>
          </div>
          <div className="mt-1 md:mt-1.5 flex items-center gap-2">
            <div className="h-1.5 w-20 md:w-32 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)'
                }}
              />
            </div>
            <span className="text-[10px] md:text-xs text-[var(--fg-muted)] hidden sm:inline">
              {profile.xp.toLocaleString('ru-RU')} / {xpForNext.toLocaleString('ru-RU')} XP
            </span>
          </div>
        </div>
      </div>

      {/* Currency section */}
      <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
        <div
          data-currency="coins"
          className="flex items-center gap-1.5 md:gap-2 rounded-xl bg-amber-500/10 px-2 py-1.5 md:px-3 md:py-2 transition-all hover:bg-amber-500/15"
        >
          <div className="flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
            <Coins className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
          </div>
          <span className="font-semibold text-amber-600 dark:text-amber-400 text-sm md:text-base">
            {coins.toLocaleString('ru-RU')}
          </span>
        </div>

        <div
          data-currency="gems"
          className="flex items-center gap-1.5 md:gap-2 rounded-xl bg-purple-500/10 px-2 py-1.5 md:px-3 md:py-2 transition-all hover:bg-purple-500/15"
        >
          <div className="flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-400 to-violet-600 shadow-sm">
            <Gem className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
          </div>
          <span className="font-semibold text-purple-600 dark:text-purple-400 text-sm md:text-base">
            {gems.toLocaleString('ru-RU')}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  return (
    <div
      className="flex h-screen min-h-0 flex-col"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        backgroundColor: 'var(--bg-solid)',
        color: 'var(--fg)',
      }}
    >
      <WindowTitleBar title="RPG Life" />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <CurrencyDisplay />
          <main
            className="min-w-0 flex-1 overflow-auto p-2 md:p-4 pb-18 md:pb-4"
            style={{
              background: 'transparent',
              color: 'var(--fg)',
            }}
          >
            <Outlet />
          </main>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}
