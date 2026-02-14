import { CheckSquare, Hash, ListChecks, Clock, Repeat, Flag, Archive, CalendarClock, Timer } from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRpg } from '../types/domain'
import RewardBadge from './RewardBadge'
import { getNextAvailableDate, getRelativeTimeRu } from '../lib/taskCycleUtils'

// Glow keyframes moved to index.css (global, not per-card)

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

const PRIORITY_COLORS = {
  none: {},
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  high: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
} as const

const PRIORITY_LABELS = {
  none: '',
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
} as const

interface TaskCardProps {
  task: TaskRpg
  selected?: boolean
  onSelect: () => void
  /** Предвычисленные награды (для оптимизации) */
  rewards?: { xp: number; coins: number; gems: number }
}

export default function TaskCard({ task, selected, onSelect, rewards }: TaskCardProps) {
  const Icon = KIND_ICON[task.kind]
  const priority = task.priority ?? 'none'
  const priorityStyle = PRIORITY_COLORS[priority]

  const progress =
    task.kind === 'counter'
      ? Math.min(1, task.target > 0 ? task.current / task.target : 0)
      : task.isCompleted
        ? 1
        : 0

  // Проверяем наличие крайнего срока (endDate в recurrenceSettings)
  const hasEndDate = task.recurrenceSettings?.endMode === 'byDate' && task.recurrenceSettings.endDate != null

  return (
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
            {task.isCompleted && (() => {
              const isRecurring = task.recurrence !== 'once'
              const rs = task.recurrenceSettings
              const isLimitReached = rs?.endMode === 'byCount' && rs.endCount && (rs.completedCount ?? 0) >= rs.endCount
              const isPermanentlyDone = !isRecurring || isLimitReached

              if (isPermanentlyDone) {
                return (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                    <CheckSquare className="h-3.5 w-3.5" />
                  </div>
                )
              }
              return (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shrink-0" title="Выполнено за цикл">
                  <CheckSquare className="h-3.5 w-3.5" />
                </div>
              )
            })()}
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
            {/* Rewards badge */}
            {rewards && (
              <RewardBadge
                coins={rewards.coins}
                gems={rewards.gems}
                xp={rewards.xp}
                difficulty={task.difficulty}
                customXp={!!task.customXp}
              />
            )}

            {/* Recurrence */}
            {task.recurrence !== 'once' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-500 border border-blue-500/30">
                <Repeat className="h-3.5 w-3.5" />
                {task.recurrence === 'daily' ? 'Ежедневно' : task.recurrence === 'weekly' ? 'Еженедельно' : task.recurrence === 'monthly' ? 'Ежемесячно' : task.recurrence === 'yearly' ? 'Ежегодно' : task.recurrence === 'instant' ? 'Инстант' : 'Повтор'}
              </span>
            )}

            {/* End date (deadline) icon */}
            {hasEndDate && (
              <span
                className="inline-flex items-center justify-center rounded-lg p-1.5 border text-orange-500 bg-orange-500/10 border-orange-500/30"
                title="Есть крайний срок"
              >
                <Timer className="h-3.5 w-3.5" />
              </span>
            )}

            {/* Priority badge - только флаг, в конце */}
            {priority !== 'none' && (
              <span
                className={cn(
                  'inline-flex items-center justify-center rounded-lg p-1.5 border',
                  priorityStyle.text,
                  priorityStyle.bg,
                  priorityStyle.border
                )}
              >
                <Flag className="h-3.5 w-3.5" fill="currentColor" />
              </span>
            )}

            {/* Next cycle badge for completed recurring tasks */}
            {task.isCompleted && task.recurrence !== 'once' && (() => {
              const rs = task.recurrenceSettings
              const isLimitReached = rs?.endMode === 'byCount' && rs.endCount && (rs.completedCount ?? 0) >= rs.endCount
              if (isLimitReached) return null
              const nextDate = getNextAvailableDate(task)
              if (nextDate == null) return null
              return (
                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-1 text-xs font-semibold text-indigo-500 border border-indigo-500/30">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {getRelativeTimeRu(nextDate)}
                </span>
              )
            })()}

            {/* Archive badge */}
            {task.canceledAt && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-gray-500/10 px-2 py-1 text-xs font-semibold text-gray-500 border border-gray-500/30">
                <Archive className="h-3.5 w-3.5" />
                Архив
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
