import { useState } from 'react'
import { Plus, X, ChevronRight, Calendar, Clock, BarChart3, Gift, Hash, Target, Construction, ListPlus, Zap, Coins, Folder, Edit2 } from 'lucide-react'
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
  const [targetQuantity, setTargetQuantity] = useState(1)
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
      setTargetQuantity(1)
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
  const difficultyXp = customXp ?? (settings.taskDifficultyXp?.[difficulty] ?? 0)

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
                  <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                    {selectedAttrs.length > 0
                      ? selectedAttrs.map((a) => `${a!.icon} ${a!.name}`).join(', ')
                      : 'Не выбрано'}
                    {selectedAttrs.length > 0 && ` • ${difficultyXp} XP`}
                  </p>
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
                  <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                    {coinReward > 0 && `🪙 ${coinReward}`}
                    {coinReward > 0 && gemReward > 0 && ' • '}
                    {gemReward > 0 && `💎 ${gemReward}`}
                    {coinReward === 0 && gemReward === 0 && 'Не назначено'}
                  </p>
                </div>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--fg-muted)]" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Настройка счетчика */}
      {subtasks.length === 0 && (
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
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-elevated)] text-lg font-semibold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={targetQuantity}
                          onChange={(e) => setTargetQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="input w-20 text-center h-9"
                        />
                        <button
                          type="button"
                          onClick={() => setTargetQuantity((n) => n + 1)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors text-lg font-semibold"
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
