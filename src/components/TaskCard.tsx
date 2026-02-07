import { CheckSquare, Hash, ListChecks, Coins, Zap, Clock, Repeat, Gem } from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRpg } from '../types/domain'
import { useRpgStore } from '../store/useRpgStore'

// CSS для анимаций
const glowStyles = `
@keyframes glow-pulse-coin {
  0%, 100% {
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.15);
  }
  50% {
    box-shadow: 0 0 16px rgba(245, 158, 11, 0.35), 0 0 24px rgba(245, 158, 11, 0.15);
  }
}

@keyframes glow-pulse-xp-easy {
  0%, 100% {
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
  }
  50% {
    box-shadow: 0 0 18px rgba(16, 185, 129, 0.4), 0 0 26px rgba(16, 185, 129, 0.2);
  }
}

@keyframes glow-pulse-xp-medium {
  0%, 100% {
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
  }
  50% {
    box-shadow: 0 0 18px rgba(59, 130, 246, 0.4), 0 0 26px rgba(59, 130, 246, 0.2);
  }
}

@keyframes glow-pulse-xp-hard {
  0%, 100% {
    box-shadow: 0 0 10px rgba(249, 115, 22, 0.2);
  }
  50% {
    box-shadow: 0 0 18px rgba(249, 115, 22, 0.4), 0 0 26px rgba(249, 115, 22, 0.2);
  }
}

@keyframes glow-pulse-xp-veryhard {
  0%, 100% {
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.2);
  }
  50% {
    box-shadow: 0 0 18px rgba(239, 68, 68, 0.4), 0 0 26px rgba(239, 68, 68, 0.2);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@keyframes gem-glow {
  0%, 100% {
    box-shadow: 0 0 10px rgba(6, 182, 212, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1);
  }
  50% {
    box-shadow: 0 0 16px rgba(6, 182, 212, 0.35), 0 0 24px rgba(34, 211, 238, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.15);
  }
}
`

const KIND_ICON = {
  checkbox: CheckSquare,
  counter: Hash,
  nested: ListChecks,
} as const

const DIFFICULTY_COLORS = {
  easy: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', xp: 'text-emerald-500' },
  medium: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', xp: 'text-blue-500' },
  hard: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20', xp: 'text-orange-500' },
  veryHard: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20', xp: 'text-red-500' },
}

const DIFFICULTY_LABELS = {
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Сложная',
  veryHard: 'Сложная+',
}

interface TaskCardProps {
  task: TaskRpg
  selected?: boolean
  onSelect: () => void
}

export default function TaskCard({ task, selected, onSelect }: TaskCardProps) {
  const getTaskRewardPreview = useRpgStore((s) => s.getTaskRewardPreview)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  
  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []
  const { xp, coins, gems } = getTaskRewardPreview(task)
  const taskAttrIds = task.attributeIds?.length ? task.attributeIds : (task.attributeId ? [task.attributeId] : [])
  const taskAttrs = taskAttrIds.map((id) => attributes.find((a) => a.id === id)).filter(Boolean)
  const Icon = KIND_ICON[task.kind]
  const diffStyle = DIFFICULTY_COLORS[task.difficulty]
  
  const progress =
    task.kind === 'counter'
      ? Math.min(1, task.target > 0 ? task.current / task.target : 0)
      : task.isCompleted
        ? 1
        : 0

  return (
    <>
      <style>{glowStyles}</style>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'group relative w-full rounded-2xl p-4 text-left transition-all duration-200',
          'bg-[var(--surface-card)] backdrop-blur-lg',
          'border border-[var(--border)]',
          'hover:border-[var(--border-accent)] hover:shadow-lg hover:-translate-y-0.5',
          selected && 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10',
          task.isCompleted && 'opacity-60'
        )}
      >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
            task.isCompleted
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-[var(--accent-subtle)] text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                'font-medium text-[var(--fg)] line-clamp-1 flex-1',
                task.isCompleted && 'line-through'
              )}
            >
              {task.title}
            </h3>
            {/* Индикатор подзадач */}
            {task.kind === 'nested' && task.subtasks.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500 shrink-0">
                <ListChecks className="h-3 w-3" />
                {task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length}
              </span>
            )}
            {/* Completed indicator */}
            {task.isCompleted && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                <CheckSquare className="h-3.5 w-3.5" />
              </div>
            )}
          </div>

          {/* Counter display */}
          {task.kind === 'counter' && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-[var(--fg-muted)] mb-1">
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Счетчик
                </span>
                <span className="font-semibold">{task.current}/{task.target} {task.countUnit || 'раз'}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress * 100}%`,
                    background: task.isCompleted
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)'
                  }}
                />
              </div>
            </div>
          )}


          {/* Tags & rewards */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {/* Coin reward */}
            {coins > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-500 border border-amber-500/40"
                style={{
                  boxShadow: '0 0 10px rgba(245, 158, 11, 0.25)',
                }}
              >
                <Coins className="h-3.5 w-3.5" />
                {coins}
              </span>
            )}

            {/* Gem reward */}
            {gems > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-cyan-400 border border-cyan-400/50"
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(34, 211, 238, 0.25) 100%)',
                  boxShadow: '0 0 14px rgba(6, 182, 212, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
                }}
              >
                <Gem className="h-3.5 w-3.5" />
                {gems}
              </span>
            )}

            {/* XP reward - цвет зависит от сложности */}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border',
                diffStyle.xp,
                task.difficulty === 'easy' && 'bg-emerald-500/10 border-emerald-500/30',
                task.difficulty === 'medium' && 'bg-blue-500/10 border-blue-500/30',
                task.difficulty === 'hard' && 'bg-orange-500/10 border-orange-500/30',
                task.difficulty === 'veryHard' && 'bg-red-500/10 border-red-500/30'
              )}
              style={{
                boxShadow: task.difficulty === 'easy'
                  ? '0 0 10px rgba(16, 185, 129, 0.2)'
                  : task.difficulty === 'medium'
                  ? '0 0 10px rgba(59, 130, 246, 0.2)'
                  : task.difficulty === 'hard'
                  ? '0 0 10px rgba(249, 115, 22, 0.2)'
                  : '0 0 10px rgba(239, 68, 68, 0.2)'
              }}
            >
              <Zap className="h-3.5 w-3.5" />
              {xp} XP
            </span>

            {/* Recurrence */}
            {task.recurrence !== 'once' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-500 border border-blue-500/30">
                <Repeat className="h-3.5 w-3.5" />
                {task.recurrence === 'daily' ? 'Ежедневно' : task.recurrence === 'weekly' ? 'Еженедельно' : task.recurrence === 'monthly' ? 'Ежемесячно' : task.recurrence === 'yearly' ? 'Ежегодно' : task.recurrence === 'instant' ? 'Инстант' : 'Повтор'}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
    </>
  )
}
