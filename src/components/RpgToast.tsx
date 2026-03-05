import { toast } from 'sonner'
import { Coins, Gem, Zap, Check, ShoppingBag, Package, Trophy, Swords } from 'lucide-react'

type RpgToastType = 'success' | 'error' | 'info' | 'reward' | 'purchase' | 'loot' | 'achievement'

interface RpgToastOptions {
  title: string
  description?: string
  coins?: number
  xp?: number
  gems?: number
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
}

function RpgToastContent({ options, toastId }: { options: RpgToastOptions; toastId: string | number }) {
  const type = options.type ?? 'success'
  const config = TYPE_CONFIG[type]
  const Icon = config.icon
  const hasRewards = (options.coins && options.coins > 0) || (options.xp && options.xp > 0) || (options.gems && options.gems > 0)

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
            <div className="flex items-center gap-2.5 mt-1.5">
              {options.coins! > 0 && (
                <span className="flex items-center gap-1 text-[13px] font-semibold text-amber-600 dark:text-amber-400">
                  <Coins className="h-3.5 w-3.5" /> +{options.coins}
                </span>
              )}
              {options.xp! > 0 && (
                <span className="flex items-center gap-1 text-[13px] font-semibold text-blue-500 dark:text-blue-400">
                  <Zap className="h-3.5 w-3.5" /> +{options.xp}
                </span>
              )}
              {options.gems! > 0 && (
                <span className="flex items-center gap-1 text-[13px] font-semibold text-purple-500 dark:text-purple-400">
                  <Gem className="h-3.5 w-3.5" /> +{options.gems}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function rpgToast(options: RpgToastOptions) {
  return toast.custom(
    (id) => <RpgToastContent options={options} toastId={id} />,
    { duration: options.duration ?? 3000 },
  )
}
