import { useState, useLayoutEffect, useEffect } from 'react'
import { Plus, X, ChevronRight, Calendar, BarChart3, Gift, Hash, Target } from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRecurrence, TaskRpg, SubtaskItem } from '../types/domain'
import { useRpgStore } from '../store/useRpgStore'
import type { TaskGroupId } from '../types/domain'

const RECURRENCE_OPTIONS: { value: TaskRecurrence; label: string }[] = [
  { value: 'once', label: 'Один раз' },
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
  { value: 'yearly', label: 'Ежегодно' },
  { value: 'instant', label: 'Инстант (можно выполнять снова после награды)' },
]

const RECURRENCE_STATUS_LABEL: Record<TaskRecurrence, string> = {
  once: 'Без повтора',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
  instant: 'Инстант',
}

interface TaskCreateFormProps {
  defaultGroupId?: TaskGroupId | null
  onCreated?: () => void
  className?: string
}

export default function TaskCreateForm({ defaultGroupId = null, onCreated, className }: TaskCreateFormProps) {
  const addTask = useRpgStore((s) => s.addTask)
  const getActiveProfile = useRpgStore((s) => s.getActiveProfile)

  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [subtasks, setSubtasks] = useState<{ id: string; title: string }[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [showRepeat, setShowRepeat] = useState(false)
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('once')
  const [deadlineAt, setDeadlineAt] = useState<string>('') // '' или ISO datetime-local
  const [showRewardAttributes, setShowRewardAttributes] = useState(false)
  const [showRewardItems, setShowRewardItems] = useState(false)
  const [rewardSheetOpen, setRewardSheetOpen] = useState<null | 'attribute' | 'item'>(null)
  const [sheetAnimatedOpen, setSheetAnimatedOpen] = useState(false)
  // Настройка счетчика (задача со счетчиком)
  const [countingTaskEnabled, setCountingTaskEnabled] = useState(false)
  const [targetQuantity, setTargetQuantity] = useState(1)
  const [countUnit, setCountUnit] = useState('раз')

  useLayoutEffect(() => {
    if (rewardSheetOpen) {
      const id = requestAnimationFrame(() => setSheetAnimatedOpen(true))
      return () => cancelAnimationFrame(id)
    }
    setSheetAnimatedOpen(false)
  }, [rewardSheetOpen])

  useEffect(() => {
    if (!sheetAnimatedOpen && rewardSheetOpen) {
      const t = setTimeout(() => setRewardSheetOpen(null), 300)
      return () => clearTimeout(t)
    }
  }, [sheetAnimatedOpen, rewardSheetOpen])

  const closeRewardSheet = () => setSheetAnimatedOpen(false)

  const addSubtask = () => {
    const text = newSubtaskTitle.trim()
    if (!text) return
    setSubtasks((prev) => [...prev, { id: crypto.randomUUID(), title: text }])
    setNewSubtaskTitle('')
  }

  const removeSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError('Введите название задачи')
      return
    }

    const profile = getActiveProfile()
    if (!profile) {
      setError('Нет активного профиля. Создайте или выберите профиль в настройках.')
      return
    }

    const subtaskItems: SubtaskItem[] = subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      isCompleted: false,
    }))

    let deadlineMs: number | null = null
    if (deadlineAt) {
      const ms = new Date(deadlineAt).getTime()
      if (Number.isNaN(ms)) {
        setError('Некорректная дата дедлайна')
        return
      }
      deadlineMs = ms
    }

    const newTask = {
      groupId: defaultGroupId ?? null,
      title: title.trim(),
      notes: description.trim() || undefined,
      kind: 'nested' as const,
      difficulty: 'medium' as const,
      attributeId: null,
      penaltyFactor: 0.2,
      dueAt: null,
      deadlineAt: deadlineMs,
      archived: false,
      recurrence,
      coinReward: 10,
      subtasks: subtaskItems,
      isCompleted: false,
    }

    try {
      addTask(newTask)
      setTitle('')
      setDescription('')
      setSubtasks([])
      setNewSubtaskTitle('')
      setShowRepeat(false)
      setRecurrence('once')
      setDeadlineAt('')
      setCountingTaskEnabled(false)
      setTargetQuantity(1)
      setCountUnit('раз')
      onCreated?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось создать задачу'
      setError(msg)
      console.error('addTask error:', err)
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-4', className)}>
      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {/* 1. Название задачи */}
      <div>
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Название задачи</label>
        <input
          type="text"
          placeholder="Введите название..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input w-full text-base"
          autoFocus
        />
      </div>

      {/* 2. Описание задачи */}
      <div>
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Описание задачи</label>
        <textarea
          placeholder="Описание (опционально)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="input w-full resize-none"
        />
      </div>

      {/* 3. Подзадачи */}
      <div>
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Подзадачи</label>
        <div className="flex flex-col gap-2 rounded-xl bg-[var(--surface)] p-3">
          {subtasks.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-lg bg-[var(--surface-elevated)] px-3 py-2"
            >
              <span className="flex-1 truncate text-sm text-[var(--fg)]">{s.title}</span>
              <button
                type="button"
                onClick={() => removeSubtask(s.id)}
                className="icon-btn icon-btn-danger h-7 w-7 shrink-0 p-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] pl-4 pr-2 py-1.5 transition-colors hover:border-[var(--border-strong)] focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
              placeholder="Добавить подзадачу"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              onClick={addSubtask}
              disabled={!newSubtaskTitle.trim()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--fg)] transition-colors hover:bg-[var(--surface)] disabled:opacity-40"
              title="Добавить подзадачу"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Правило повтора */}
      <div>
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Правило повтора</label>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-[var(--fg)]">{RECURRENCE_STATUS_LABEL[recurrence]}</p>
          </div>
          <div className="h-px bg-[var(--border)]" />
          <button
            type="button"
            onClick={() => setShowRepeat(!showRepeat)}
            className={cn(
              'flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors',
              showRepeat ? 'text-[var(--accent)]' : 'text-[var(--accent)] hover:bg-[var(--accent-subtle)]'
            )}
          >
            <span>Параметры повтора</span>
            <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', showRepeat && 'rotate-90')} />
          </button>
        </div>

        {showRepeat && (
          <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-4">
              <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">Повтор</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
                className="select w-full"
              >
                {RECURRENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">
                Дедлайн (когда нужно закончить)
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--fg-muted)]" />
                <input
                  type="datetime-local"
                  value={deadlineAt}
                  onChange={(e) => setDeadlineAt(e.target.value)}
                  className="input flex-1 text-sm"
                />
              </div>
              <p className="mt-1 text-[10px] text-[var(--fg-muted)]">
                После дедлайна завершить задачу будет нельзя
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5. Система вознаграждения */}
      <div>
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Система вознаграждения</label>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {/* а) Атрибуты */}
          <div>
            <button
              type="button"
              onClick={() => setShowRewardAttributes((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[var(--fg)] transition-colors hover:bg-[var(--surface-elevated)]"
            >
              <span className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-[var(--accent)]" />
                Атрибуты
              </span>
              <ChevronRight className={cn('h-4 w-4 shrink-0 text-[var(--fg-muted)] transition-transform', showRewardAttributes && 'rotate-90')} />
            </button>
            {showRewardAttributes && (
              <div className="border-t border-[var(--border)] px-4 pb-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRewardSheetOpen('attribute')}
                  className="btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Добавить атрибут
                </button>
              </div>
            )}
          </div>
          <div className="h-px bg-[var(--border)]" />
          {/* б) Предметы */}
          <div>
            <button
              type="button"
              onClick={() => setShowRewardItems((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[var(--fg)] transition-colors hover:bg-[var(--surface-elevated)]"
            >
              <span className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-[var(--accent)]" />
                Предметы
              </span>
              <ChevronRight className={cn('h-4 w-4 shrink-0 text-[var(--fg-muted)] transition-transform', showRewardItems && 'rotate-90')} />
            </button>
            {showRewardItems && (
              <div className="border-t border-[var(--border)] px-4 pb-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRewardSheetOpen('item')}
                  className="btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Добавить предмет
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Настройка счетчика */}
      <div>
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Настройка счетчика</label>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <button
            type="button"
            onClick={() => setCountingTaskEnabled((v) => !v)}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
              'hover:bg-[var(--surface-elevated)]'
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                countingTaskEnabled ? 'bg-[var(--accent-subtle)] text-[var(--accent)]' : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)]'
              )}
            >
              <Hash className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--fg)]">Задача со счетчиком</p>
              <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                Установите целевое количество и единицы измерения
              </p>
            </div>
            {/* Ползунок (toggle) */}
            <button
              type="button"
              role="switch"
              aria-checked={countingTaskEnabled}
              onClick={(e) => {
                e.stopPropagation()
                setCountingTaskEnabled((v) => !v)
              }}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
                countingTaskEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                  countingTaskEnabled ? 'right-1 left-auto' : 'left-1 right-auto'
                )}
              />
            </button>
          </button>

          {countingTaskEnabled && (
            <div className="border-t border-[var(--border)] p-4 space-y-4">
              {/* Целевые показатели */}
              <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--surface-elevated)] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
                    <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--fg)]">Целевые показатели</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-[var(--fg-muted)]">Целевое количество</label>
                      <span className="text-[10px] text-[var(--fg-muted)]">Минимум 1</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetQuantity((n) => Math.max(1, n - 1))}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={targetQuantity}
                        onChange={(e) => setTargetQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="input flex-1 text-center h-9"
                      />
                      <button
                        type="button"
                        onClick={() => setTargetQuantity((n) => n + 1)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1">Единица измерения</label>
                    <input
                      type="text"
                      value={countUnit}
                      onChange={(e) => setCountUnit(e.target.value)}
                      placeholder="раз"
                      className="input w-full h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <button type="submit" className="btn-primary flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" />
        Добавить задачу
      </button>
    </form>

    {/* Bottom sheet: атрибут / предмет — Coming soon */}
    {rewardSheetOpen !== null && (
      <>
        <div
          role="presentation"
          onClick={closeRewardSheet}
          className={cn(
            'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
            sheetAnimatedOpen ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={rewardSheetOpen === 'attribute' ? 'Добавить атрибут' : 'Добавить предмет'}
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white dark:bg-[var(--surface-overlay)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out',
            sheetAnimatedOpen ? 'translate-y-0' : 'translate-y-full'
          )}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="h-1 w-12 shrink-0 rounded-full bg-[var(--border)]" />
            <button
              type="button"
              onClick={closeRewardSheet}
              className="icon-btn h-9 w-9 shrink-0 rounded-full p-0 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-4 pb-8 pt-6 flex flex-col items-center justify-center min-h-[180px]">
            <p className="text-2xl font-semibold tracking-tight text-[var(--fg-muted)]">Coming soon</p>
            <p className="mt-2 text-sm text-[var(--fg-muted)]">
              {rewardSheetOpen === 'attribute' ? 'Настройка вознаграждения атрибутами' : 'Настройка вознаграждения предметами'} будет доступна в следующем обновлении.
            </p>
          </div>
        </div>
      </>
    )}
    </>
  )
}
