import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import WindowTitleBar from './WindowTitleBar'
import Sidebar from './Sidebar'
import MobileBottomNav from './MobileBottomNav'
import { useRpgStore } from '../store/useRpgStore'
import { CURRENCY_IDS, xpForLevelStandard } from '../types/domain'
import { Coins, Gem } from 'lucide-react'
import { vaultStorage } from '../lib/vaultStorage'

function CurrencyDisplay() {
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const settings = useRpgStore((s) => s.settings)
  const [avatarImageUrl, setAvatarImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (settings.avatarImage) {
      vaultStorage.readMedia(settings.avatarImage).then((url) => {
        if (url) setAvatarImageUrl(url)
      })
    } else {
      setAvatarImageUrl(null)
    }
  }, [settings.avatarImage])

  const profile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null
  const coins = profile?.currencies[CURRENCY_IDS.COINS] ?? 0
  const gems = profile?.currencies[CURRENCY_IDS.GEMS] ?? 0

  if (!profile) return null

  const xpForNext = xpForLevelStandard(profile.level + 1) - xpForLevelStandard(profile.level)
  const progress = xpForNext > 0 ? (profile.xp / xpForNext) * 100 : 0
  
  return (
    <div className="glass-neu flex items-center justify-between px-3 py-2 md:px-5 md:py-3">
      {/* Profile section */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <div className="relative shrink-0">
          <div className="glass-neu-avatar flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 text-base md:text-lg">
            {avatarImageUrl ? (
              <img src={avatarImageUrl} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              settings.avatar || '👤'
            )}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--fg)] text-sm md:text-base truncate">{profile.name}</span>
            <span className="glass-neu-level hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold">Ур. {profile.level}</span>
          </div>
          <div className="mt-1 md:mt-1.5 flex items-center gap-2">
            <div className="h-1.5 w-20 md:w-32 overflow-hidden rounded-full" style={{
              background: 'var(--surface)',
              boxShadow: 'inset 1px 1px 3px var(--neu-item-dark), inset -1px -1px 2px var(--neu-item-light)'
            }}>
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, rgba(var(--accent-rgb),0.85) 0%, rgba(var(--accent-rgb),0.6) 50%, rgba(var(--accent-rgb),0.85) 100%)`,
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3), 0 0 6px rgba(var(--accent-rgb),0.3)'
                }}
              />
            </div>
            <span className="glass-neu-xp-label hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] md:text-xs font-medium">
              {profile.xp.toLocaleString('ru-RU')} / {xpForNext.toLocaleString('ru-RU')} XP
            </span>
          </div>
        </div>
      </div>

      {/* Currency section — glassmorphic neumorphism */}
      <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
        <div
          data-currency="coins"
          className="glass-neu-coin flex items-center gap-1.5 md:gap-2 rounded-2xl px-2.5 py-1.5 md:px-3.5 md:py-2 transition-all"
        >
          <div className="flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/30">
            <Coins className="h-3.5 w-3.5 md:h-4 md:w-4 text-white drop-shadow-sm" />
          </div>
          <span className="font-bold text-amber-600 dark:text-amber-400 text-sm md:text-base">
            {coins.toLocaleString('ru-RU')}
          </span>
        </div>

        <div
          data-currency="gems"
          className="glass-neu-gem flex items-center gap-1.5 md:gap-2 rounded-2xl px-2.5 py-1.5 md:px-3.5 md:py-2 transition-all"
        >
          <div className="flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 shadow-md shadow-sky-500/30">
            <Gem className="h-3.5 w-3.5 md:h-4 md:w-4 text-white drop-shadow-sm" />
          </div>
          <span className="font-bold text-sky-600 dark:text-sky-400 text-sm md:text-base">
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
      <WindowTitleBar />
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
