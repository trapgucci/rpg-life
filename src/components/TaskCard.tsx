import { CheckSquare, Hash, ListChecks, Coins, Zap, Clock, Repeat, Gem } from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRpg } from '../types/domain'
import { useRpgStore } from '../store/useRpgStore'

const KIND_ICON = {
  checkbox: CheckSquare,
  counter: Hash,
  nested: ListChecks,
} as const

const DIFFICULTY_COLORS = {
  easy: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  medium: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  hard: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  veryHard: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
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
            {/* XP reward */}
            <span className="inline-flex items-center gap-1 rounded-lg bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-500">
              <Zap className="h-3 w-3" />
              {xp} XP
            </span>

            {/* Coin reward */}
            {coins > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Coins className="h-3 w-3" />
                {coins}
              </span>
            )}

            {/* Gem reward */}
            {gems > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-500">
                <Gem className="h-3 w-3" />
                {gems}
              </span>
            )}

            {/* Difficulty */}
            <span className={cn('rounded-lg px-2 py-1 text-xs font-medium', diffStyle.bg, diffStyle.text)}>
              {DIFFICULTY_LABELS[task.difficulty]}
            </span>

            {/* Recurrence */}
            {task.recurrence !== 'once' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500">
                <Repeat className="h-3 w-3" />
                {task.recurrence === 'daily' ? 'Ежедневно' : task.recurrence === 'weekly' ? 'Еженедельно' : task.recurrence === 'monthly' ? 'Ежемесячно' : task.recurrence === 'yearly' ? 'Ежегодно' : task.recurrence === 'instant' ? 'Инстант' : 'Повтор'}
              </span>
            )}

            {/* Attributes */}
            {taskAttrs.map((attr) => attr && (
              <span
                key={attr.id}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
                style={{ backgroundColor: `${attr.color}15`, color: attr.color }}
              >
                {attr.icon} {attr.key}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}
