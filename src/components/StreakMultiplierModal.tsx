import { useState, useMemo } from 'react'
import { cn } from '../lib/cn'
import { TrendingUp, Flame, Zap, Check, Search, X } from 'lucide-react'
import Modal from './Modal'
import { useRpgStore } from '../store/useRpgStore'
import type { ShopItem, TaskRpg, TaskRecurrence } from '../types/domain'

/* ─── Recurrence labels ──────────────────────────────────────────────────── */

const RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  once: 'Один раз',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
  instant: 'Инстант',
  custom: 'Кастомный',
}

/* ─── Props ──────────────────────────────────────────────────────────────── */

interface StreakMultiplierModalProps {
  isOpen: boolean
  itemId: string | null
  onClose: () => void
  onApplied: () => void
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function StreakMultiplierModal({
  isOpen,
  itemId,
  onClose,
  onApplied,
}: StreakMultiplierModalProps) {
  const shopItems = useRpgStore((s) => s.shopItems)
  const tasks = useRpgStore((s) => s.tasks)
  const applyStreakMultiplier = useRpgStore((s) => s.applyStreakMultiplier)

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const item = useMemo(
    () => (itemId ? shopItems.find((i) => i.id === itemId) ?? null : null),
    [itemId, shopItems],
  )

  const mode = item?.streakMultiplierMode ?? 'streak'
  const multiplierValue = item?.streakMultiplierValue ?? 1.5
  const interval = item?.streakMultiplierInterval ?? 3

  // Filter tasks by mode
  const eligibleTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return tasks.filter((t) => {
      if (t.archived || t.canceledAt) return false
      if (mode === 'streak' && (t.recurrence === 'once' || t.recurrence === 'instant')) return false
      if (mode === 'instant' && t.recurrence !== 'instant') return false
      if (query && !t.title.toLowerCase().includes(query)) return false
      return true
    })
  }, [tasks, mode, search])

  const handleApply = () => {
    if (!selectedTaskId || !itemId) return
    const success = applyStreakMultiplier(selectedTaskId, itemId)
    if (success) {
      setSelectedTaskId(null)
      setSearch('')
      onApplied()
    }
  }

  const handleClose = () => {
    setSelectedTaskId(null)
    setSearch('')
    onClose()
  }

  if (!item) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" showCloseButton={false} zIndex={10001}>
      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-500/20 to-amber-500/10 ring-1 ring-inset ring-amber-400/25">
              <TrendingUp className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--fg)]">Применить множитель</h2>
              <p className="text-xs text-[var(--fg-muted)]">
                {mode === 'streak'
                  ? `x${multiplierValue} каждые ${interval} выполнений стрика`
                  : `x${multiplierValue} на ${interval} выполнений`}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="icon-btn shrink-0" title="Закрыть">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info banner */}
        <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 p-3 mb-4">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {mode === 'streak'
              ? `Множитель увеличит награду в ${multiplierValue}x каждые ${interval} выполнений подряд. При сбросе стрика множитель будет утерян навсегда.`
              : `Множитель увеличит награду в ${multiplierValue}x на следующие ${interval} выполнений задачи.`}
          </p>
        </div>

        {/* Search */}
        {eligibleTasks.length > 5 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск задачи..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-9 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-md text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Task list */}
        <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {eligibleTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm font-medium text-[var(--fg-muted)]">
                {search.trim()
                  ? 'Задачи не найдены'
                  : mode === 'instant'
                    ? 'Нет доступных инстант задач'
                    : 'Нет доступных циклических задач'}
              </p>
              <p className="text-xs text-[var(--fg-muted)] mt-1">
                {mode === 'instant'
                  ? 'Создайте задачу с повтором «Инстант»'
                  : 'Создайте задачу с любым повтором кроме «Один раз» и «Инстант»'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {eligibleTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskId === task.id}
                  onSelect={() => setSelectedTaskId(task.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary flex-1 py-3"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!selectedTaskId}
            className={cn(
              'flex-1 rounded-xl py-3 font-semibold transition-all duration-200 active:scale-95',
              'flex items-center justify-center gap-2',
              selectedTaskId
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl'
                : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)] cursor-not-allowed',
            )}
          >
            <TrendingUp className="h-4 w-4" />
            Применить
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Task row ───────────────────────────────────────────────────────────── */

function TaskRow({
  task,
  isSelected,
  onSelect,
}: {
  task: TaskRpg
  isSelected: boolean
  onSelect: () => void
}) {
  const hasMultiplier = !!task.streakMultiplier
  const disabled = hasMultiplier

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : isSelected
            ? 'bg-[var(--accent-subtle)]'
            : 'hover:bg-[var(--surface-hover)]',
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
          disabled
            ? 'border-[var(--fg-muted)] bg-[var(--fg-muted)]/10'
            : isSelected
              ? 'border-[var(--accent)] bg-[var(--accent)]'
              : 'border-[var(--border)]',
        )}
      >
        {isSelected && <Check className="h-3 w-3 text-white" />}
        {disabled && <TrendingUp className="h-3 w-3 text-[var(--fg-muted)]" />}
      </div>

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', disabled ? 'text-[var(--fg-muted)]' : 'text-[var(--fg)]')}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[var(--fg-muted)]">
            {RECURRENCE_LABELS[task.recurrence]}
          </span>
          {(task.currentStreak ?? 0) > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-500 font-medium">
              <Flame className="h-3 w-3" />
              {task.currentStreak}
            </span>
          )}
          {hasMultiplier && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500 font-medium">
              <TrendingUp className="h-3 w-3" />
              x{task.streakMultiplier!.value}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
