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

const DIFFICULTY_COLORS: Record<TaskDifficulty, { bg: string; text: string; border: string }> = {
  easy: {
    bg: 'bg-gradient-to-r from-emerald-500/10 to-green-500/10',
    text: 'text-emerald-500',
    border: 'border-emerald-500/30',
  },
  medium: {
    bg: 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10',
    text: 'text-blue-500',
    border: 'border-blue-500/30',
  },
  hard: {
    bg: 'bg-gradient-to-r from-orange-500/10 to-amber-500/10',
    text: 'text-orange-500',
    border: 'border-orange-500/30',
  },
  veryHard: {
    bg: 'bg-gradient-to-r from-red-500/10 to-rose-500/10',
    text: 'text-red-500',
    border: 'border-red-500/30',
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
            'inline-flex items-center gap-1.5 rounded-lg',
            'bg-gradient-to-r from-amber-50 to-cyan-50 dark:from-amber-950/30 dark:to-cyan-950/30',
            'border border-amber-200 dark:border-amber-800',
            compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold'
          )}
        >
          {coins > 0 && (
            <>
              <Coins className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5', 'text-amber-600 dark:text-amber-400')} />
              <span className="text-amber-600 dark:text-amber-400">{coins}</span>
            </>
          )}
          {coins > 0 && gems > 0 && <span className="text-[var(--fg-muted)]">•</span>}
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
            'inline-flex items-center gap-1 rounded-lg border',
            compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold',
            customXp
              ? 'bg-gradient-to-r from-purple-500/10 to-violet-500/10 text-purple-500 border-purple-500/30'
              : cn(diffStyle.bg, diffStyle.text, diffStyle.border)
          )}
        >
          <Zap className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          {xp} XP
        </span>
      )}
    </div>
  )
}
