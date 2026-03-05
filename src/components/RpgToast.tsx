import { toast } from 'sonner'
import { Coins, Gem, Zap, Check, ShoppingBag, Package, Trophy, Swords, Star } from 'lucide-react'

type RpgToastType = 'success' | 'error' | 'info' | 'reward' | 'purchase' | 'loot' | 'achievement' | 'achievement_complete'

interface RpgToastRewardItem {
  name: string
  emoji?: string
  quantity: number
}

interface RpgToastOptions {
  title: string
  description?: string
  coins?: number
  xp?: number
  gems?: number
  items?: RpgToastRewardItem[]
  duration?: number
  type?: RpgToastType
}

const TYPE_CONFIG: Record<RpgToastType, {
  icon: typeof Check
  gradient: string
  border: string
  glow: string
  iconBg: string
}> = {
  success: {
    icon: Check,
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
    iconBg: 'from-emerald-400 to-emerald-600',
  },
  reward: {
    icon: Zap,
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    iconBg: 'from-amber-400 to-orange-500',
  },
  purchase: {
    icon: ShoppingBag,
    gradient: 'from-blue-500/20 via-blue-500/5 to-transparent',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20',
    iconBg: 'from-blue-400 to-blue-600',
  },
  loot: {
    icon: Package,
    gradient: 'from-purple-500/20 via-purple-500/5 to-transparent',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/20',
    iconBg: 'from-purple-400 to-violet-600',
  },
  achievement: {
    icon: Trophy,
    gradient: 'from-yellow-500/20 via-yellow-500/5 to-transparent',
    border: 'border-yellow-500/30',
    glow: 'shadow-yellow-500/20',
    iconBg: 'from-yellow-400 to-amber-500',
  },
  error: {
    icon: Swords,
    gradient: 'from-red-500/20 via-red-500/5 to-transparent',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20',
    iconBg: 'from-red-400 to-red-600',
  },
  info: {
    icon: Zap,
    gradient: 'from-sky-500/20 via-sky-500/5 to-transparent',
    border: 'border-sky-500/30',
    glow: 'shadow-sky-500/20',
    iconBg: 'from-sky-400 to-sky-600',
  },
  achievement_complete: {
    icon: Star,
    gradient: 'from-yellow-500/30 via-amber-500/10 to-transparent',
    border: 'border-yellow-400/50',
    glow: 'shadow-yellow-500/30',
    iconBg: 'from-yellow-300 to-amber-500',
  },
}

function RpgToastContent({ options, toastId }: { options: RpgToastOptions; toastId: string | number }) {
  const type = options.type ?? 'success'
  const config = TYPE_CONFIG[type]
  const Icon = config.icon
  const hasRewards = (options.coins && options.coins > 0) || (options.xp && options.xp > 0) || (options.gems && options.gems > 0)
  const hasItems = options.items && options.items.length > 0

  return (
    <div
      onClick={() => toast.dismiss(toastId)}
      className={`
        relative overflow-hidden cursor-pointer
        min-w-[280px] max-w-[360px]
        rounded-xl border ${config.border}
        bg-white dark:bg-zinc-900
        shadow-lg ${config.glow} shadow-md
        transition-all
      `}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} pointer-events-none`} />

      {/* Shimmer effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" style={{ animation: 'rpg-toast-shimmer 1.5s ease-in-out 0.2s 1 forwards' }} />
      </div>

      <div className="relative flex items-center gap-3 px-4 py-3">
        {/* Icon badge */}
        <div className={`
          flex-shrink-0 flex items-center justify-center
          h-9 w-9 rounded-lg
          bg-gradient-to-br ${config.iconBg}
          shadow-sm
        `}>
          <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-zinc-900 dark:text-zinc-100 leading-tight">
            {options.title}
          </p>
          {options.description && (
            <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {options.description}
            </p>
          )}
          {hasRewards && (
            <div className="flex items-center gap-1.5 mt-1.5">
              {options.xp! > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/15 px-2 py-0.5 text-[12px] font-semibold text-blue-500 dark:text-blue-400 ring-1 ring-inset ring-blue-500/20">
                  <Zap className="h-3 w-3" /> +{options.xp} XP
                </span>
              )}
              {options.coins! > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-0.5 text-[12px] font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-400/20">
                  <Coins className="h-3 w-3" /> +{options.coins}
                </span>
              )}
              {options.gems! > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-purple-500/15 px-2 py-0.5 text-[12px] font-semibold text-purple-500 dark:text-purple-400 ring-1 ring-inset ring-purple-500/20">
                  <Gem className="h-3 w-3" /> +{options.gems}
                </span>
              )}
            </div>
          )}
          {hasItems && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {options.items!.map((item, i) => (
                <span key={i} className="flex items-center gap-1 text-[12px] font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md px-1.5 py-0.5">
                  {item.emoji && <span className="text-[13px]">{item.emoji}</span>}
                  {item.name}{item.quantity > 1 && ` x${item.quantity}`}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AchievementCompleteToastContent({ options, toastId }: { options: RpgToastOptions; toastId: string | number }) {
  return (
    <div
      onClick={() => toast.dismiss(toastId)}
      className="
        relative overflow-hidden cursor-pointer
        min-w-[300px] max-w-[380px]
        rounded-xl border-2 border-yellow-400/60
        bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800
        shadow-[0_0_24px_rgba(234,179,8,0.25),0_0_48px_rgba(234,179,8,0.1)]
      "
    >
      {/* Animated gold particles background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-yellow-400/40" style={{ animation: 'rpg-achievement-particle 2s ease-in-out infinite' }} />
        <div className="absolute top-2 right-4 w-2 h-2 rounded-full bg-amber-300/50" style={{ animation: 'rpg-achievement-particle 2.3s ease-in-out 0.3s infinite' }} />
        <div className="absolute bottom-3 left-8 w-2.5 h-2.5 rounded-full bg-yellow-300/30" style={{ animation: 'rpg-achievement-particle 1.8s ease-in-out 0.7s infinite' }} />
        <div className="absolute bottom-1 right-12 w-1.5 h-1.5 rounded-full bg-amber-400/40" style={{ animation: 'rpg-achievement-particle 2.1s ease-in-out 1s infinite' }} />
      </div>

      {/* Gold gradient sweep */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-amber-400/5 to-transparent pointer-events-none" />

      {/* Shimmer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-yellow-300/20 to-transparent" style={{ animation: 'rpg-toast-shimmer 2s ease-in-out 0.3s 1 forwards' }} />
      </div>

      <div className="relative px-4 py-3.5">
        {/* Top row: icon + title */}
        <div className="flex items-center gap-3">
          {/* Trophy with glow ring */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-xl bg-yellow-400/20 blur-md" style={{ animation: 'rpg-achievement-glow 2s ease-in-out infinite' }} />
            <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 shadow-lg shadow-yellow-500/30">
              <Trophy className="h-5.5 w-5.5 text-white drop-shadow-sm" strokeWidth={2.5} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-yellow-400/80">
              Достижение выполнено!
            </p>
            <p className="font-bold text-[15px] text-white leading-tight mt-0.5 truncate">
              {options.title}
            </p>
          </div>
        </div>

        {/* Reward strip */}
        {((options.coins && options.coins > 0) || (options.xp && options.xp > 0) || (options.gems && options.gems > 0) || (options.items && options.items.length > 0)) && (
          <div className="mt-2.5 pt-2 border-t border-yellow-500/20">
            <div className="flex items-center gap-1.5 flex-wrap">
              {options.xp! > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/15 px-2 py-0.5 text-[12px] font-semibold text-blue-400 ring-1 ring-inset ring-blue-500/20">
                  <Zap className="h-3 w-3" /> +{options.xp} XP
                </span>
              )}
              {options.coins! > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-0.5 text-[12px] font-semibold text-amber-400 ring-1 ring-inset ring-amber-400/20">
                  <Coins className="h-3 w-3" /> +{options.coins}
                </span>
              )}
              {options.gems! > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-purple-500/15 px-2 py-0.5 text-[12px] font-semibold text-purple-400 ring-1 ring-inset ring-purple-500/20">
                  <Gem className="h-3 w-3" /> +{options.gems}
                </span>
              )}
              {options.items?.map((item, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-300 bg-zinc-800 rounded-lg px-2 py-0.5 ring-1 ring-inset ring-zinc-700/50">
                  {item.emoji && <span className="text-[13px]">{item.emoji}</span>}
                  {item.name}{item.quantity > 1 && ` x${item.quantity}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function rpgToast(options: RpgToastOptions) {
  if (options.type === 'achievement_complete') {
    return toast.custom(
      (id) => <AchievementCompleteToastContent options={options} toastId={id} />,
      { duration: options.duration ?? 5000, position: 'bottom-right', unstyled: true },
    )
  }
  return toast.custom(
    (id) => <RpgToastContent options={options} toastId={id} />,
    { duration: options.duration ?? 3000, unstyled: true },
  )
}
