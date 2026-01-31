import { useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp, Calendar, Repeat } from 'lucide-react'
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
      onCreated?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось создать задачу'
      setError(msg)
      console.error('addTask error:', err)
    }
  }

  return (
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
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
              placeholder="Добавить подзадачу..."
              className="input flex-1 text-sm"
            />
            <button
              type="button"
              onClick={addSubtask}
              className="btn-secondary flex items-center gap-1.5 px-3 text-sm"
            >
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          </div>
        </div>
      </div>

      {/* 4. Правило повтора */}
      <div>
        <button
          type="button"
          onClick={() => setShowRepeat(!showRepeat)}
          className={cn(
            'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all',
            showRepeat
              ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]'
              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:border-[var(--border-strong)]'
          )}
        >
          <span className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Правило повтора
          </span>
          {showRepeat ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showRepeat && (
          <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            {/* а) Повтор */}
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

            {/* б) Время дедлайна */}
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

      <button type="submit" className="btn-primary flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" />
        Добавить задачу
      </button>
    </form>
  )
}
