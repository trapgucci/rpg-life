import { useState, useRef } from 'react'
import { Plus, X, ChevronRight, Calendar, BarChart3, Gift, Target, Construction, ListPlus, Flag, Folder, Edit2, Coins, Gem, Zap } from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRecurrence, SubtaskItem, TaskDifficulty, AttributeId, TaskPriority, RecurrenceSettings } from '../types/domain'
import { TASK_XP_BY_DIFFICULTY } from '../types/domain'
import { useRpgStore } from '../store/useRpgStore'
import type { TaskGroupId } from '../types/domain'
import RewardBadge from './RewardBadge'
import TaskGroupSelectModal from './TaskGroupSelectModal'
import TaskAttributeSelectModal from './TaskAttributeSelectModal'
import TaskRewardsModal from './TaskRewardsModal'
import SubtaskCreateModal, { type SubtaskEditData, type SubtaskFormData } from './SubtaskCreateModal'
import RecurrenceSelectModal from './RecurrenceSelectModal'

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
  const [recurrenceSettings, setRecurrenceSettings] = useState<RecurrenceSettings>({
    type: 'once',
    endMode: 'never',
  })
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false)

  // Атрибуты и сложность
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<AttributeId[]>([])
  const [difficulty, setDifficulty] = useState<TaskDifficulty | null>(null)
  const [priority, setPriority] = useState<TaskPriority>('none')
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

  const counterSectionRef = useRef<HTMLDivElement>(null)
  const scrollToCounterSection = () => {
    setTimeout(() => {
      counterSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 150)
  }

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

    // Если атрибуты не выбраны, сложность все равно нужна (для базовой структуры задачи), но XP начисляться не будет
    const finalDifficulty = difficulty ?? 'medium'

    let newTask: any

    if (countingTaskEnabled) {
      newTask = {
        groupId: selectedGroupId,
        title: title.trim(),
        notes: description.trim() || undefined,
        kind: 'counter' as const,
        difficulty: finalDifficulty,
        priority,
        attributeIds: selectedAttributeIds,
        customXp: selectedAttributeIds.length > 0 ? customXp : null,
        dueAt: null,
        deadlineAt: null,
        archived: false,
        recurrence,
        recurrenceSettings,
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
        difficulty: finalDifficulty,
        priority,
        attributeIds: selectedAttributeIds,
        customXp: selectedAttributeIds.length > 0 ? customXp : null,
        dueAt: null,
        deadlineAt: null,
        archived: false,
        recurrence,
        recurrenceSettings,
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
        difficulty: finalDifficulty,
        priority,
        attributeIds: selectedAttributeIds,
        customXp: selectedAttributeIds.length > 0 ? customXp : null,
        dueAt: null,
        deadlineAt: null,
        archived: false,
        recurrence,
        recurrenceSettings,
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
      setDifficulty(null)
      setPriority('none')
      setCustomXp(null)
      setCoinReward(10)
      setGemReward(0)
      setSubtasks([])
      setRecurrence('once')
      setRecurrenceSettings({ type: 'once', endMode: 'never' })
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
  const effectiveDifficulty = difficulty ?? 'medium'
  const difficultyXp = selectedAttributeIds.length > 0 ? (customXp ?? (settings.taskDifficultyXp?.[effectiveDifficulty] ?? TASK_XP_BY_DIFFICULTY[effectiveDifficulty])) : 0

  // Синхронизация типа повтора
  const handleRecurrenceSettingsChange = (newSettings: RecurrenceSettings) => {
    setRecurrenceSettings(newSettings)
    setRecurrence(newSettings.type)
  }

  return (
    <>
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-5', className)}>
      {error && (
        <div className="glass rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-500/5 px-4 py-3 text-sm text-red-600 dark:text-red-400 shadow-sm shadow-red-500/10">
          {error}
        </div>
      )}
      {/* 1. Название и описание */}
      <div className="glass rounded-2xl p-4">
        <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Задача</label>
        <input
          type="text"
          placeholder="Введите название..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input w-full text-base mb-3"
          autoFocus
        />
        <textarea
          placeholder="Описание (опционально)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="input w-full resize-none"
        />
      </div>

      {/* 2.5. Группа задачи */}
      <div className="glass rounded-2xl p-4">
        <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Группа</label>
        <button
          type="button"
          onClick={() => setShowGroupModal(true)}
          className="flex w-full items-center gap-2 rounded-xl bg-[var(--surface)] px-3 py-2.5 text-left transition-all hover:bg-[var(--surface-elevated)] ring-1 ring-inset ring-[var(--border)] hover:ring-[var(--accent)]/30 hover:scale-[1.01] active:scale-[0.99]"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-[var(--accent)]/15 to-[var(--accent)]/5 text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/10">
            <Folder className="h-4 w-4" />
          </div>
          <span className="flex-1 text-sm font-medium text-[var(--fg)]">
            {selectedGroupId ? getTaskGroups().find((g) => g.id === selectedGroupId)?.name ?? 'Без группы' : 'Без группы'}
          </span>
          <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
        </button>
      </div>

      {/* 3. Подзадачи */}
      {!countingTaskEnabled && (
        <div className="glass rounded-2xl p-4">
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Подзадачи ({subtasks.length})</label>
          {subtasks.length > 0 && (
            <div className="mb-2 flex flex-col gap-2">
              {subtasks.map((s) => {
                const diff = s.difficulty ?? 'medium'
                const subtaskXp = s.customXp ?? settings.taskDifficultyXp?.[diff] ?? TASK_XP_BY_DIFFICULTY[diff]
                const hasCurrency = s.coinReward > 0 || (s.gemReward ?? 0) > 0
                return (
                  <div
                    key={s.id}
                    className="group relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition-all hover:border-[var(--border-strong)] hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
                        <ListPlus className="h-4 w-4" />
                      </div>
                      <span className="flex-1 truncate text-sm font-medium text-[var(--fg)]">{s.title}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditSubtask(s)}
                          className="icon-btn h-7 w-7 shrink-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Редактировать"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSubtask(s.id)}
                          className="icon-btn icon-btn-danger h-7 w-7 shrink-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Удалить"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {(subtaskXp > 0 || hasCurrency) && (
                      <div className="mt-2 ml-11 flex flex-wrap items-center gap-1.5">
                        {hasCurrency && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-cyan-50 dark:from-amber-950/30 dark:to-cyan-950/30 px-2 py-0.5 text-xs font-semibold border border-amber-200 dark:border-amber-800">
                            {s.coinReward > 0 && (
                              <>
                                <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                <span className="text-amber-600 dark:text-amber-400">{s.coinReward}</span>
                              </>
                            )}
                            {s.coinReward > 0 && (s.gemReward ?? 0) > 0 && (
                              <span className="text-[var(--fg-muted)]">•</span>
                            )}
                            {(s.gemReward ?? 0) > 0 && (
                              <>
                                <Gem className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" strokeWidth={2.5} />
                                <span className="text-cyan-600 dark:text-cyan-400">{s.gemReward}</span>
                              </>
                            )}
                          </span>
                        )}
                        {subtaskXp > 0 && (
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold border',
                            s.customXp != null
                              ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                              : diff === 'easy'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                              : diff === 'medium'
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                              : diff === 'hard'
                              ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                              : 'bg-red-500/10 text-red-500 border-red-500/30'
                          )}>
                            <Zap className="h-3 w-3" />
                            {subtaskXp} XP
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowSubtaskModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--accent)] transition-all hover:bg-gradient-to-b hover:from-[var(--accent)]/10 hover:to-[var(--accent)]/5 hover:border-[var(--accent)]/40 hover:shadow-sm hover:shadow-[var(--accent)]/10 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Добавить подзадачу
          </button>
        </div>
      )}

      {/* 4. Приоритет */}
      <div className="glass rounded-2xl p-4">
        <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Приоритет</label>
        <div className="grid grid-cols-4 gap-2">
          {(['none', 'low', 'medium', 'high'] as const).map((p) => {
            const labels = { none: 'Без приоритета', low: 'Низкий', medium: 'Средний', high: 'Высокий' }
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all',
                  priority === p
                    ? cn(
                        'border-2 shadow-md scale-105',
                        p === 'none' && 'bg-gradient-to-b from-gray-500/20 to-gray-500/8 text-gray-500 border-gray-500 shadow-gray-500/15',
                        p === 'low' && 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/8 text-emerald-500 border-emerald-500 shadow-emerald-500/15',
                        p === 'medium' && 'bg-gradient-to-b from-yellow-500/20 to-yellow-500/8 text-yellow-500 border-yellow-500 shadow-yellow-500/15',
                        p === 'high' && 'bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 border-red-500 shadow-red-500/15'
                      )
                    : 'border-2 border-transparent bg-[var(--surface)] text-[var(--fg-muted)] hover:border-[var(--border)] hover:bg-[var(--surface-elevated)]'
                )}
              >
                {p !== 'none' && <Flag className="h-4 w-4" />}
                {p === 'none' && <X className="h-4 w-4" />}
                <span className="text-xs">{labels[p]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 5. Правило повтора */}
      <div className="glass rounded-2xl p-4">
        <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Правило повтора</label>
        <button
          type="button"
          onClick={() => setShowRecurrenceModal(true)}
          className="flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--surface)] px-4 py-3 text-left text-sm transition-all hover:bg-[var(--surface-elevated)] ring-1 ring-inset ring-[var(--border)] hover:ring-[var(--accent)]/30 hover:scale-[1.01] active:scale-[0.99]"
        >
          <span className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[var(--accent)]/15 to-[var(--accent)]/5 text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/10">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="font-semibold text-[var(--fg)]">Повтор</p>
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                {RECURRENCE_STATUS_LABEL[recurrence]}
                {recurrence === 'weekly' && recurrenceSettings.weeklyMode === 'timesPerWeek' && recurrenceSettings.weeklyTimesPerWeek
                  ? ` (${recurrenceSettings.weeklyTimesPerWeek} ${recurrenceSettings.weeklyTimesPerWeek === 1 ? 'раз' : recurrenceSettings.weeklyTimesPerWeek < 5 ? 'раза' : 'раз'}/нед)`
                  : recurrence === 'weekly' && recurrenceSettings.weeklyDays && recurrenceSettings.weeklyDays.length > 0 && recurrenceSettings.weeklyDays.length < 7
                  ? ` (${recurrenceSettings.weeklyDays.length} ${recurrenceSettings.weeklyDays.length === 1 ? 'день' : recurrenceSettings.weeklyDays.length < 5 ? 'дня' : 'дней'})`
                  : ''}
              </p>
            </div>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--fg-muted)]" />
        </button>
      </div>

      {/* 6. Система вознаграждения */}
      <div className="glass rounded-2xl p-4">
        <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Система вознаграждения</label>
        <div className="flex flex-col gap-2">
          {/* а) Атрибуты и сложность */}
          <button
            type="button"
            onClick={() => setShowAttributeModal(true)}
            className="group/attr flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--surface)] px-4 py-3 text-left text-sm transition-all hover:bg-[var(--surface-elevated)] ring-1 ring-inset ring-[var(--border)] hover:ring-[var(--accent)]/30 hover:scale-[1.01] active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[var(--accent)]/15 to-[var(--accent)]/5 text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/10">
                <BarChart3 className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="font-semibold text-[var(--fg)]">Атрибуты и сложность</p>
                {selectedAttrs.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {selectedAttrs.map((a) => (
                      <span key={a!.id} className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                        {a!.icon} {a!.name}
                      </span>
                    ))}
                    {difficultyXp > 0 && (
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold',
                        customXp != null
                          ? 'bg-gradient-to-b from-purple-500/20 to-purple-500/10 text-purple-500 ring-1 ring-inset ring-purple-400/25 shadow-sm shadow-purple-500/10'
                          : effectiveDifficulty === 'easy'
                          ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10'
                          : effectiveDifficulty === 'medium'
                          ? 'bg-gradient-to-b from-blue-500/20 to-blue-500/10 text-blue-500 ring-1 ring-inset ring-blue-400/25 shadow-sm shadow-blue-500/10'
                          : effectiveDifficulty === 'hard'
                          ? 'bg-gradient-to-b from-orange-500/20 to-orange-500/10 text-orange-500 ring-1 ring-inset ring-orange-400/25 shadow-sm shadow-orange-500/10'
                          : 'bg-gradient-to-b from-red-500/20 to-red-500/10 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10'
                      )}>
                        <Zap className="h-3 w-3" />
                        {difficultyXp} XP
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--fg-muted)] mt-0.5">Не выбрано</p>
                )}
              </div>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--fg-muted)] transition-transform duration-200 group-hover/attr:translate-x-0.5" />
          </button>
          {/* б) Предметы */}
          <button
            type="button"
            onClick={() => setShowRewardsModal(true)}
            className="group/reward flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--surface)] px-4 py-3 text-left text-sm transition-all hover:bg-[var(--surface-elevated)] ring-1 ring-inset ring-[var(--border)] hover:ring-[var(--accent)]/30 hover:scale-[1.01] active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-amber-500/15 to-amber-500/5 text-amber-500 ring-1 ring-inset ring-amber-400/20 shadow-sm shadow-amber-500/10">
                <Gift className="h-4.5 w-4.5" />
              </div>
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
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--fg-muted)] transition-transform duration-200 group-hover/reward:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* 7. Целевые показатели */}
      {subtasks.length === 0 && (
        <div className="glass rounded-2xl p-4">
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Целевые показатели</label>
          <div className="rounded-xl bg-[var(--surface)] overflow-hidden ring-1 ring-inset ring-[var(--border)]">
            {/* Toggle header */}
            <button
              type="button"
              onClick={() => {
                setCountingTaskEnabled((v) => {
                  if (!v) scrollToCounterSection()
                  return !v
                })
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--surface-elevated)]"
            >
              <span className="flex items-center gap-3">
                <Target className="h-5 w-5 text-[var(--accent)]" />
                <div>
                  <p className="font-semibold text-[var(--fg)]">Счётчик</p>
                  <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                    {countingTaskEnabled
                      ? `${targetQuantity} ${countUnit}`
                      : 'Выключен'}
                  </p>
                </div>
              </span>
              <div
                role="switch"
                aria-checked={countingTaskEnabled}
                onClick={(e) => {
                  e.stopPropagation()
                  setCountingTaskEnabled((v) => {
                    if (!v) scrollToCounterSection()
                    return !v
                  })
                }}
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 cursor-pointer',
                  countingTaskEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300',
                    countingTaskEnabled ? 'right-0.5 left-auto' : 'left-0.5 right-auto'
                  )}
                />
              </div>
            </button>

            {/* Counter settings panel */}
            <div
              ref={counterSectionRef}
              className={cn(
                'overflow-hidden transition-all duration-400 ease-out',
                countingTaskEnabled ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <div className="border-t border-[var(--border)] px-4 py-3 space-y-3">
                {/* Target quantity */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[var(--fg-muted)]">Количество</label>
                  </div>
                  {/* Slider row — кнопки и полоска на одной линии */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetQuantity((n) => Math.max(2, n - 1))}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)] transition-all active:scale-90 text-sm font-medium"
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min={2}
                      max={100}
                      value={Math.min(targetQuantity, 100)}
                      onChange={(e) => setTargetQuantity(Math.max(2, parseInt(e.target.value, 10)))}
                      className="target-slider flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setTargetQuantity((n) => n + 1)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all active:scale-90 text-sm font-medium"
                    >
                      +
                    </button>
                  </div>
                  {/* Marks — цифры под слайдером */}
                  <div className="relative h-4 mt-1" style={{ marginLeft: 40, marginRight: 40 }}>
                    {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTargetQuantity(val)}
                        className={cn(
                          'absolute top-0 text-[8px] leading-none font-medium transition-colors -translate-x-1/2',
                          targetQuantity === val
                            ? 'text-[var(--accent)] font-bold'
                            : 'text-[var(--fg-muted)] hover:text-[var(--fg-secondary)]'
                        )}
                        style={{ left: `${((val - 2) / (100 - 2)) * 100}%` }}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Unit of measurement */}
                <div>
                  <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Единица</label>
                  <div className="flex gap-1.5">
                    {['раз', 'мин', 'км', 'стр', 'шт'].map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setCountUnit(unit)}
                        className={cn(
                          'flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all active:scale-95',
                          countUnit === unit
                            ? 'bg-[var(--accent)] text-white shadow-sm'
                            : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)] hover:text-[var(--fg-secondary)] border border-[var(--border)]'
                        )}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={countUnit}
                    onChange={(e) => e.target.value.length <= 8 && setCountUnit(e.target.value)}
                    maxLength={8}
                    placeholder="своя единица…"
                    className="input w-full h-8 text-xs mt-1.5"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Настройки завершения */}
      <div className="glass rounded-2xl p-4">
        <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Настройки завершения</label>
        <div className="rounded-xl bg-[var(--surface)] overflow-hidden ring-1 ring-inset ring-[var(--border)]">
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

      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:shadow-[var(--accent)]/35 hover:scale-[1.02] active:scale-[0.98]"
      >
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
      selectedDifficulty={difficulty ?? 'medium'}
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
      settings={recurrenceSettings}
      onSave={handleRecurrenceSettingsChange}
      onClose={() => setShowRecurrenceModal(false)}
    />
    </>
  )
}
