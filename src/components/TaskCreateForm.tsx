import { useState } from 'react'
import { Plus, X, ChevronRight, Calendar, Clock, BarChart3, Gift, Target, Construction, ListPlus, Zap, Coins, Gem, Folder, Edit2 } from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRecurrence, SubtaskItem, TaskDifficulty, AttributeId } from '../types/domain'
import { TASK_XP_BY_DIFFICULTY } from '../types/domain'
import { useRpgStore } from '../store/useRpgStore'
import type { TaskGroupId } from '../types/domain'
import TaskGroupSelectModal from './TaskGroupSelectModal'
import TaskAttributeSelectModal from './TaskAttributeSelectModal'
import TaskRewardsModal from './TaskRewardsModal'
import SubtaskCreateModal, { type SubtaskEditData, type SubtaskFormData } from './SubtaskCreateModal'
import RecurrenceSelectModal from './RecurrenceSelectModal'
import DateTimePickerModal from './DateTimePickerModal'

const RECURRENCE_STATUS_LABEL: Record<TaskRecurrence, string> = {
  once: 'Без повтора',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
  instant: 'Инстант',
  custom: 'Кастомный',
}

interface TaskCreateFormProps {
  defaultGroupId?: TaskGroupId | null
  onCreated?: () => void
  className?: string
}

export default function TaskCreateForm({ defaultGroupId = null, onCreated, className }: TaskCreateFormProps) {
  const addTask = useRpgStore((s) => s.addTask)
  const getActiveProfile = useRpgStore((s) => s.getActiveProfile)
  const getTaskGroups = useRpgStore((s) => s.getTaskGroups)
  const getAttributes = useRpgStore((s) => s.getAttributes)
  const settings = useRpgStore((s) => s.settings)

  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<TaskGroupId | null>(defaultGroupId)
  const [subtasks, setSubtasks] = useState<(SubtaskFormData & { id: string })[]>([])
  const [showSubtaskModal, setShowSubtaskModal] = useState(false)
  const [editingSubtask, setEditingSubtask] = useState<SubtaskEditData | null>(null)
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('once')
  const [deadlineAt, setDeadlineAt] = useState<string>('')
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false)
  const [showDeadlineModal, setShowDeadlineModal] = useState(false)

  // Атрибуты и сложность
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<AttributeId[]>([])
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('medium')
  const [customXp, setCustomXp] = useState<number | null>(null)
  const [showAttributeModal, setShowAttributeModal] = useState(false)

  // Вознаграждения
  const [coinReward, setCoinReward] = useState(10)
  const [gemReward, setGemReward] = useState(0)
  const [showRewardsModal, setShowRewardsModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)

  // Настройка счетчика
  const [countingTaskEnabled, setCountingTaskEnabled] = useState(false)
  const [targetQuantity, setTargetQuantity] = useState(2)
  const [countUnit, setCountUnit] = useState('раз')
  const [reflectionOnCompletion, setReflectionOnCompletion] = useState(false)

  const addSubtask = (sub: SubtaskFormData) => {
    setSubtasks((prev) => [...prev, { id: crypto.randomUUID(), ...sub }])
  }

  const editSubtask = (sub: SubtaskEditData) => {
    setSubtasks((prev) => prev.map((s) => s.id === sub.id ? { id: s.id, title: sub.title, description: sub.description, coinReward: sub.coinReward, gemReward: sub.gemReward ?? 0, difficulty: sub.difficulty ?? 'medium', customXp: sub.customXp ?? null } : s))
  }

  const removeSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
  }

  const openEditSubtask = (subtask: SubtaskFormData & { id: string }) => {
    setEditingSubtask({ id: subtask.id, title: subtask.title, description: subtask.description, coinReward: subtask.coinReward, gemReward: subtask.gemReward ?? 0, difficulty: subtask.difficulty, customXp: subtask.customXp })
    setShowSubtaskModal(true)
  }

  const closeSubtaskModal = () => {
    setShowSubtaskModal(false)
    setEditingSubtask(null)
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

    let deadlineMs: number | null = null
    if (deadlineAt) {
      const ms = new Date(deadlineAt).getTime()
      if (Number.isNaN(ms)) {
        setError('Некорректная дата дедлайна')
        return
      }
      deadlineMs = ms
    }

    let newTask: any

    if (countingTaskEnabled) {
      newTask = {
        groupId: selectedGroupId,
        title: title.trim(),
        notes: description.trim() || undefined,
        kind: 'counter' as const,
        difficulty,
        attributeIds: selectedAttributeIds,
        customXp,
        dueAt: null,
        deadlineAt: deadlineMs,
        archived: false,
        recurrence,
        coinReward,
        gemReward,
        current: 0,
        target: targetQuantity,
        countUnit,
        isCompleted: false,
      }
    } else if (subtasks.length > 0) {
      const subtaskItems: SubtaskItem[] = subtasks.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description.trim() || undefined,
        isCompleted: false,
        coinReward: s.coinReward > 0 ? s.coinReward : undefined,
        gemReward: s.gemReward && s.gemReward > 0 ? s.gemReward : undefined,
        difficulty: s.difficulty ?? 'medium',
        customXp: s.customXp,
      }))

      newTask = {
        groupId: selectedGroupId,
        title: title.trim(),
        notes: description.trim() || undefined,
        kind: 'nested' as const,
        difficulty,
        attributeIds: selectedAttributeIds,
        customXp,
        dueAt: null,
        deadlineAt: deadlineMs,
        archived: false,
        recurrence,
        coinReward,
        gemReward,
        subtasks: subtaskItems,
        isCompleted: false,
      }
    } else {
      newTask = {
        groupId: selectedGroupId,
        title: title.trim(),
        notes: description.trim() || undefined,
        kind: 'checkbox' as const,
        difficulty,
        attributeIds: selectedAttributeIds,
        customXp,
        dueAt: null,
        deadlineAt: deadlineMs,
        archived: false,
        recurrence,
        coinReward,
        gemReward,
        isCompleted: false,
      }
    }

    try {
      addTask(newTask)
      setTitle('')
      setDescription('')
      setSelectedGroupId(defaultGroupId)
      setSelectedAttributeIds([])
      setDifficulty('medium')
      setCustomXp(null)
      setCoinReward(10)
      setGemReward(0)
      setSubtasks([])
      setRecurrence('once')
      setDeadlineAt('')
      setCountingTaskEnabled(false)
      setTargetQuantity(2)
      setCountUnit('раз')
      setReflectionOnCompletion(false)
      onCreated?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось создать задачу'
      setError(msg)
      console.error('addTask error:', err)
    }
  }

  const attributes = getAttributes()
  const selectedAttrs = selectedAttributeIds.map((id) => attributes.find((a) => a.id === id)).filter(Boolean)
  const difficultyXp = customXp ?? (settings.taskDifficultyXp?.[difficulty] ?? TASK_XP_BY_DIFFICULTY[difficulty])

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

      {/* 2.5. Группа задачи */}
      <div>
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Группа</label>
        <button
          type="button"
          onClick={() => setShowGroupModal(true)}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--surface)] px-4 py-3 text-left transition-colors',
            'hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]'
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-subtle)]">
            <Folder className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <span className="flex-1 text-sm font-semibold text-[var(--fg)]">
            {selectedGroupId ? getTaskGroups().find((g) => g.id === selectedGroupId)?.name : 'Без группы'}
          </span>
          <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
        </button>
      </div>

      {/* 3. Подзадачи */}
      {!countingTaskEnabled && (
        <div>
          <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Подзадачи ({subtasks.length})</label>
          {subtasks.length > 0 && (
            <div className="mb-2 flex flex-col gap-1.5">
              {subtasks.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                >
                  <span className="flex-1 truncate text-sm text-[var(--fg)]">{s.title}</span>
                  {(() => {
                    const diff = s.difficulty ?? 'medium'
                    const xp = s.customXp ?? settings.taskDifficultyXp?.[diff] ?? TASK_XP_BY_DIFFICULTY[diff]
                    return xp > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-500">
                        <Zap className="h-2.5 w-2.5" />{xp}
                      </span>
                    ) : null
                  })()}
                  {s.coinReward > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      <Coins className="h-2.5 w-2.5" />{s.coinReward}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditSubtask(s)}
                    className="icon-btn h-6 w-6 shrink-0 p-0"
                    title="Редактировать"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSubtask(s.id)}
                    className="icon-btn icon-btn-danger h-6 w-6 shrink-0 p-0"
                    title="Удалить"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowSubtaskModal(true)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--surface)] px-4 py-3 text-left transition-colors',
              'hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]'
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]">
              <ListPlus className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-[var(--accent)]">Добавить подзадачу</span>
          </button>
        </div>
      )}

      {/* 4. Правило повтора */}
      <div>
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Правило повтора</label>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {/* Повтор */}
          <div>
            <button
              type="button"
              onClick={() => setShowRecurrenceModal(true)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--surface-elevated)]"
            >
              <span className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <p className="font-semibold text-[var(--fg)]">Повтор</p>
                  <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                    {RECURRENCE_STATUS_LABEL[recurrence]}
                  </p>
                </div>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--fg-muted)]" />
            </button>
          </div>
          <div className="h-px bg-[var(--border)]" />
          {/* Дедлайн */}
          <div>
            <button
              type="button"
              onClick={() => setShowDeadlineModal(true)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--surface-elevated)]"
            >
              <span className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <p className="font-semibold text-[var(--fg)]">Дедлайн</p>
                  <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                    {deadlineAt ? new Date(deadlineAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Не установлен'}
                  </p>
                </div>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--fg-muted)]" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Система вознаграждения */}
      <div>
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Система вознаграждения</label>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {/* а) Атрибуты и сложность */}
          <div>
            <button
              type="button"
              onClick={() => setShowAttributeModal(true)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--surface-elevated)]"
            >
              <span className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <p className="font-semibold text-[var(--fg)]">Атрибуты и сложность</p>
                  {selectedAttrs.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {selectedAttrs.map((a) => (
                        <span key={a!.id} className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                          {a!.icon} {a!.name}
                        </span>
                      ))}
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold border',
                        customXp != null
                          ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                          : difficulty === 'easy'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                          : difficulty === 'medium'
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                          : difficulty === 'hard'
                          ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                          : 'bg-red-500/10 text-red-500 border-red-500/30'
                      )}>
                        <Zap className="h-3 w-3" />
                        {difficultyXp} XP
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--fg-muted)] mt-0.5">Не выбрано</p>
                  )}
                </div>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--fg-muted)]" />
            </button>
          </div>
          <div className="h-px bg-[var(--border)]" />
          {/* б) Предметы */}
          <div>
            <button
              type="button"
              onClick={() => setShowRewardsModal(true)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--surface-elevated)]"
            >
              <span className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <p className="font-semibold text-[var(--fg)]">Предметы</p>
                  {coinReward > 0 || gemReward > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-cyan-50 dark:from-amber-950/30 dark:to-cyan-950/30 px-2.5 py-0.5 text-xs font-semibold border border-amber-200 dark:border-amber-800 mt-0.5">
                      {coinReward > 0 && (
                        <>
                          <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="text-amber-600 dark:text-amber-400">{coinReward}</span>
                        </>
                      )}
                      {coinReward > 0 && gemReward > 0 && (
                        <span className="text-[var(--fg-muted)]">•</span>
                      )}
                      {gemReward > 0 && (
                        <>
                          <Gem className="h-4 w-4 text-cyan-600 dark:text-cyan-400" strokeWidth={2.5} />
                          <span className="text-cyan-600 dark:text-cyan-400">{gemReward}</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <p className="text-xs text-[var(--fg-muted)] mt-0.5">Не назначено</p>
                  )}
                </div>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--fg-muted)]" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Целевые показатели */}
      {subtasks.length === 0 && (
        <div>
          <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Целевые показатели</label>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            {/* Toggle header */}
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
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300',
                  countingTaskEnabled
                    ? 'bg-orange-500/15 text-orange-500'
                    : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)]'
                )}
              >
                <Target className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--fg)]">Задача со счетчиком</p>
                <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                  Установите целевое количество и единицы измерения
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={countingTaskEnabled}
                onClick={(e) => {
                  e.stopPropagation()
                  setCountingTaskEnabled((v) => !v)
                }}
                className={cn(
                  'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300',
                  countingTaskEnabled ? 'bg-orange-500' : 'bg-[var(--border)]'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300',
                    countingTaskEnabled ? 'right-1 left-auto' : 'left-1 right-auto'
                  )}
                />
              </button>
            </button>

            {/* Counter settings panel */}
            <div
              className={cn(
                'overflow-hidden transition-all duration-400 ease-out',
                countingTaskEnabled ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <div className="border-t border-[var(--border)] p-5 space-y-6">
                {/* Circular progress preview */}
                <div className="flex justify-center">
                  <div className="relative">
                    <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                      <circle
                        cx="60" cy="60" r="52"
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="60" cy="60" r="52"
                        fill="none"
                        stroke="url(#counterGradientCreate)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 52}`}
                        strokeDashoffset="0"
                      />
                      <defs>
                        <linearGradient id="counterGradientCreate" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#fb923c" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-[var(--fg)]">{targetQuantity}</span>
                      <span className="text-[11px] text-[var(--fg-muted)]">{countUnit}</span>
                    </div>
                  </div>
                </div>

                {/* Target quantity with slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[var(--fg-secondary)]">Целевое количество</label>
                    <span className="text-[10px] text-[var(--fg-muted)]">Мин. 2</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTargetQuantity((n) => Math.max(2, n - 1))}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)] hover:border-[var(--border-strong)] transition-all duration-200 active:scale-90 text-lg font-medium"
                    >
                      −
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="range"
                        min={2}
                        max={100}
                        value={Math.min(targetQuantity, 100)}
                        onChange={(e) => setTargetQuantity(Math.max(2, parseInt(e.target.value, 10)))}
                        className="target-slider w-full"
                      />
                      <div className="relative mt-1 h-4">
                        {[5, 10, 25, 50, 100].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setTargetQuantity(val)}
                            className={cn(
                              'absolute text-[10px] font-medium transition-all duration-200 -translate-x-1/2',
                              targetQuantity === val
                                ? 'text-orange-500 font-bold'
                                : 'text-[var(--fg-muted)] hover:text-[var(--fg-secondary)]'
                            )}
                            style={{ left: `${((val - 2) / (100 - 2)) * 100}%` }}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTargetQuantity((n) => n + 1)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 hover:shadow-orange-500/40 transition-all duration-200 active:scale-90 text-lg font-medium"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Unit of measurement */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--fg-secondary)] mb-2">Единица измерения</label>
                  <input
                    type="text"
                    value={countUnit}
                    onChange={(e) => e.target.value.length <= 8 && setCountUnit(e.target.value)}
                    maxLength={8}
                    placeholder="раз"
                    className="input w-full h-10 text-sm mb-2"
                  />
                  <div className="flex gap-1.5">
                    {[
                      { label: 'раз', color: 'orange' },
                      { label: 'мин', color: 'blue' },
                      { label: 'км', color: 'green' },
                      { label: 'стр', color: 'purple' },
                      { label: 'шт', color: 'amber' },
                    ].map((unit) => (
                      <button
                        key={unit.label}
                        type="button"
                        onClick={() => setCountUnit(unit.label)}
                        className={cn(
                          'flex-1 rounded-lg py-1.5 text-xs font-medium transition-all duration-200 active:scale-95',
                          countUnit === unit.label
                            ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                            : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)] hover:bg-[var(--surface-overlay)] hover:text-[var(--fg-secondary)] border border-[var(--border)]'
                        )}
                      >
                        {unit.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Настройки завершения */}
      <div>
        <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Настройки завершения</label>
        <div className="rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--surface)] overflow-hidden">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setReflectionOnCompletion((v) => !v)}
            onKeyDown={(e) => e.key === 'Enter' && setReflectionOnCompletion((v) => !v)}
            className={cn(
              'flex w-full items-center justify-between px-4 py-3 text-left transition-colors cursor-pointer',
              'hover:bg-[var(--surface-elevated)]'
            )}
          >
            <span className="text-sm font-medium text-[var(--fg)]">Отзыв после выполнения</span>
            <button
              type="button"
              role="switch"
              aria-checked={reflectionOnCompletion}
              onClick={(e) => {
                e.stopPropagation()
                setReflectionOnCompletion((v) => !v)
              }}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
                reflectionOnCompletion ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                  reflectionOnCompletion ? 'right-1 left-auto' : 'left-1 right-auto'
                )}
              />
            </button>
          </div>
          {reflectionOnCompletion && (
            <div className="border-t border-[var(--border)] px-4 pb-3 pt-2">
              <p className="text-xs text-[var(--fg-muted)]">
                После выполнения каждой задачи вам будет предложено записать свои мысли и впечатления.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                <Construction className="h-3.5 w-3.5 shrink-0" />
                Функция в разработке
              </span>
            </div>
          )}
        </div>
      </div>

      <button type="submit" className="btn-primary flex items-center justify-center gap-2">
        <Plus className="h-4 w-4" />
        Добавить задачу
      </button>
    </form>

    {/* Модальные окна */}
    <TaskGroupSelectModal
      isOpen={showGroupModal}
      selectedGroupId={selectedGroupId}
      onSelect={setSelectedGroupId}
      onClose={() => setShowGroupModal(false)}
    />
    <TaskAttributeSelectModal
      isOpen={showAttributeModal}
      selectedAttributeIds={selectedAttributeIds}
      selectedDifficulty={difficulty}
      customXp={customXp}
      onSelectAttributes={setSelectedAttributeIds}
      onSelectDifficulty={setDifficulty}
      onChangeCustomXp={setCustomXp}
      onClose={() => setShowAttributeModal(false)}
    />
    <TaskRewardsModal
      isOpen={showRewardsModal}
      coinReward={coinReward}
      gemReward={gemReward}
      onUpdateCoins={setCoinReward}
      onUpdateGems={setGemReward}
      onClose={() => setShowRewardsModal(false)}
    />
    <SubtaskCreateModal
      isOpen={showSubtaskModal}
      editingSubtask={editingSubtask}
      onAdd={addSubtask}
      onEdit={editSubtask}
      onClose={closeSubtaskModal}
    />
    <RecurrenceSelectModal
      isOpen={showRecurrenceModal}
      selected={recurrence}
      onSelect={setRecurrence}
      onClose={() => setShowRecurrenceModal(false)}
    />
    <DateTimePickerModal
      isOpen={showDeadlineModal}
      value={deadlineAt}
      onChange={setDeadlineAt}
      onClose={() => setShowDeadlineModal(false)}
    />
    </>
  )
}
