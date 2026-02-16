import { Coins, Gem, Zap } from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskDifficulty } from '../types/domain'

interface RewardBadgeProps {
  /** Количество монет (если > 0, показывается) */
  coins?: number
  /** Количество кристаллов (если > 0, показывается) */
  gems?: number
  /** Количество XP (если > 0, показывается) */
  xp?: number
  /** Сложность задачи (определяет цвет XP badge) */
  difficulty?: TaskDifficulty
  /** Кастомный XP (если true, XP badge будет фиолетовым) */
  customXp?: boolean
  /** Компактный режим (меньший размер) */
  compact?: boolean
  /** Дополнительные классы */
  className?: string
}

const DIFFICULTY_COLORS: Record<TaskDifficulty, { bg: string; text: string; ring: string; shadow: string }> = {
  easy: {
    bg: 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/8',
    text: 'text-emerald-500',
    ring: 'ring-1 ring-inset ring-emerald-400/25',
    shadow: 'shadow-sm shadow-emerald-500/10',
  },
  medium: {
    bg: 'bg-gradient-to-b from-blue-500/20 to-blue-500/8',
    text: 'text-blue-500',
    ring: 'ring-1 ring-inset ring-blue-400/25',
    shadow: 'shadow-sm shadow-blue-500/10',
  },
  hard: {
    bg: 'bg-gradient-to-b from-orange-500/20 to-orange-500/8',
    text: 'text-orange-500',
    ring: 'ring-1 ring-inset ring-orange-400/25',
    shadow: 'shadow-sm shadow-orange-500/10',
  },
  veryHard: {
    bg: 'bg-gradient-to-b from-red-500/20 to-red-500/8',
    text: 'text-red-500',
    ring: 'ring-1 ring-inset ring-red-400/25',
    shadow: 'shadow-sm shadow-red-500/10',
  },
}

/**
 * Переиспользуемый компонент для отображения наград задачи
 * Показывает монеты, кристаллы и XP в виде badge'ей
 */
export default function RewardBadge({
  coins = 0,
  gems = 0,
  xp = 0,
  difficulty = 'easy',
  customXp = false,
  compact = false,
  className,
}: RewardBadgeProps) {
  const hasCurrency = coins > 0 || gems > 0
  const hasXp = xp > 0
  const diffStyle = DIFFICULTY_COLORS[difficulty]

  if (!hasCurrency && !hasXp) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Currency rewards (Coins + Gems combined) */}
      {hasCurrency && (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-xl shadow-sm',
            coins > 0 && gems > 0
              ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-cyan-500/15 ring-1 ring-inset ring-amber-400/15 shadow-amber-500/5'
              : gems > 0
              ? 'bg-gradient-to-b from-cyan-500/15 to-cyan-500/5 dark:from-cyan-400/15 dark:to-cyan-500/5 ring-1 ring-inset ring-cyan-400/20 dark:ring-cyan-500/20 shadow-cyan-500/10'
              : 'bg-gradient-to-b from-amber-500/15 to-amber-500/5 dark:from-amber-400/15 dark:to-amber-500/5 ring-1 ring-inset ring-amber-400/20 dark:ring-amber-500/20 shadow-amber-500/10',
            compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold'
          )}
        >
          {coins > 0 && (
            <>
              <Coins className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5', 'text-amber-600 dark:text-amber-400')} />
              <span className="text-amber-600 dark:text-amber-400">{coins}</span>
            </>
          )}
          {coins > 0 && gems > 0 && <span className="w-px h-3 bg-[var(--border)] rounded-full self-center" />}
          {gems > 0 && (
            <>
              <Gem
                className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4', 'text-cyan-600 dark:text-cyan-400')}
                strokeWidth={2.5}
              />
              <span className="text-cyan-600 dark:text-cyan-400">{gems}</span>
            </>
          )}
        </span>
      )}

      {/* XP reward */}
      {hasXp && (
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-xl',
            compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold',
            customXp
              ? 'bg-gradient-to-b from-purple-500/20 to-purple-500/8 text-purple-500 ring-1 ring-inset ring-purple-400/25 shadow-sm shadow-purple-500/10'
              : cn(diffStyle.bg, diffStyle.text, diffStyle.ring, diffStyle.shadow)
          )}
        >
          <Zap className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          {xp} XP
        </span>
      )}
    </div>
  )
}
