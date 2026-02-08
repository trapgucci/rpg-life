import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Check, SkipForward, Pencil, Coins, Zap, Trash2, X,
  Plus, Minus, Clock, Award, ChevronRight, BarChart3, Gift, Folder, Edit2, Gem, Target, Hash, ListChecks
} from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRpg, TaskDifficulty, TaskRecurrence, AttributeId, SubtaskItem, TaskGroupId } from '../types/domain'
import { TASK_XP_BY_DIFFICULTY } from '../types/domain'
import { useRpgStore } from '../store/useRpgStore'
import TaskGroupSelectModal from './TaskGroupSelectModal'
import TaskAttributeSelectModal from './TaskAttributeSelectModal'
import TaskRewardsModal from './TaskRewardsModal'
import SubtaskCreateModal, { type SubtaskEditData, type SubtaskFormData } from './SubtaskCreateModal'
import RecurrenceSelectModal from './RecurrenceSelectModal'
import DateTimePickerModal from './DateTimePickerModal'
import ConfirmModal from './ConfirmModal'

const DIFFICULTY_LABELS: Record<TaskDifficulty, string> = {
  easy: 'Лёгкая',
  medium: 'Средняя',
  hard: 'Сложная',
  veryHard: 'Очень сложная',
}

const DIFFICULTY_COLORS: Record<TaskDifficulty, string> = {
  easy: '#10b981',
  medium: '#3b82f6',
  hard: '#f59e0b',
  veryHard: '#ef4444',
}

const RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  once: 'Один раз',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
  instant: 'Инстант (можно выполнять снова)',
  custom: 'Кастомный',
}

interface TaskDetailPanelProps {
  task: TaskRpg
  onDeselect?: () => void
}

export default function TaskDetailPanel({ task, onDeselect }: TaskDetailPanelProps) {
  const getTaskRewardPreview = useRpgStore((s) => s.getTaskRewardPreview)
  const completeTask = useRpgStore((s) => s.completeTask)
  const canCompleteTask = useRpgStore((s) => s.canCompleteTask)
  const skipTask = useRpgStore((s) => s.skipTask)
  const deleteTask = useRpgStore((s) => s.deleteTask)
  const updateTask = useRpgStore((s) => s.updateTask)
  const incrementCounter = useRpgStore((s) => s.incrementCounter)
  const decrementCounter = useRpgStore((s) => s.decrementCounter)
  const toggleSubtask = useRpgStore((s) => s.toggleSubtask)
  const profiles = useRpgStore((s) => s.profiles)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editNotes, setEditNotes] = useState(task.notes ?? '')
  const [editGroupId, setEditGroupId] = useState<TaskGroupId | null>(task.groupId ?? null)
  const [editAttributeIds, setEditAttributeIds] = useState<AttributeId[]>(
    task.attributeIds?.length ? task.attributeIds : (task.attributeId ? [task.attributeId] : [])
  )
  const [editDifficulty, setEditDifficulty] = useState<TaskDifficulty>(task.difficulty)
  const [editCustomXp, setEditCustomXp] = useState<number | null>(task.customXp ?? null)
  const [editCoinReward, setEditCoinReward] = useState(task.coinReward)
  const [editGemReward, setEditGemReward] = useState(task.gemReward ?? 0)
  const [editRecurrence, setEditRecurrence] = useState<TaskRecurrence>(task.recurrence)
  const [editDeadlineAt, setEditDeadlineAt] = useState<string>(
    task.deadlineAt ? new Date(task.deadlineAt).toISOString().slice(0, 16) : ''
  )
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showAttributeModal, setShowAttributeModal] = useState(false)
  const [showRewardsModal, setShowRewardsModal] = useState(false)
  const [showSubtaskModal, setShowSubtaskModal] = useState(false)
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false)
  const [showDeadlineModal, setShowDeadlineModal] = useState(false)
  const [editingSubtask, setEditingSubtask] = useState<SubtaskItem | null>(null)
  const [rewardFeedback, setRewardFeedback] = useState<{ subtaskId: string; coins: number; xp: number } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)
  // Stores the new task that triggered the unsaved changes prompt
  const pendingTaskRef = useRef<TaskRpg | null>(null)

  // Counter editing state
  const [editCounterEnabled, setEditCounterEnabled] = useState(task.kind === 'counter')
  const [editTarget, setEditTarget] = useState(task.kind === 'counter' ? task.target : 2)
  const [editCountUnit, setEditCountUnit] = useState(task.kind === 'counter' ? (task.countUnit ?? 'раз') : 'раз')

  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []
  const taskAttrIds = task.attributeIds?.length ? task.attributeIds : (task.attributeId ? [task.attributeId] : [])
  const taskAttrs = taskAttrIds.map((id) => attributes.find((a) => a.id === id)).filter(Boolean)
  const { xp, coins, gems } = getTaskRewardPreview(task)
  const isCustomXp = task.customXp != null

  const canComplete = canCompleteTask(task)
  const deadlineAt = task.deadlineAt ?? null
  const isPastDeadline = deadlineAt != null && Date.now() > deadlineAt
  const diffColor = DIFFICULTY_COLORS[task.difficulty]

  const progress =
    task.kind === 'counter'
      ? Math.min(1, task.target > 0 ? task.current / task.target : 0)
      : task.isCompleted ? 1 : 0

  const subtaskProgress = task.kind === 'nested' && task.subtasks.length
    ? task.subtasks.filter((s) => s.isCompleted).length / task.subtasks.length
    : 0

  const handleSaveEdit = (overrideTaskId?: string) => {
    if (!editTitle.trim()) return

    const targetId = overrideTaskId ?? task.id

    let deadlineMs: number | null = null
    if (editDeadlineAt) {
      const ms = new Date(editDeadlineAt).getTime()
      if (!Number.isNaN(ms)) {
        deadlineMs = ms
      }
    }

    updateTask(targetId, (t) => {
      const base = {
        ...t,
        title: editTitle.trim(),
        notes: editNotes.trim() || undefined,
        groupId: editGroupId,
        attributeIds: editAttributeIds,
        customXp: editCustomXp,
        difficulty: editDifficulty,
        coinReward: editCoinReward,
        gemReward: editGemReward,
        recurrence: editRecurrence,
        deadlineAt: deadlineMs,
      }

      // Handle counter conversion
      if (editCounterEnabled && t.kind !== 'counter') {
        // Convert checkbox to counter
        const { kind, ...rest } = base as any
        return {
          ...rest,
          kind: 'counter' as const,
          current: 0,
          target: editTarget,
          countUnit: editCountUnit,
          isCompleted: false,
        } as TaskRpg
      }

      if (!editCounterEnabled && t.kind === 'counter') {
        // Convert counter back to checkbox
        const { kind, current, target, countUnit, ...rest } = base as any
        return {
          ...rest,
          kind: 'checkbox' as const,
          isCompleted: false,
        } as TaskRpg
      }

      if (editCounterEnabled && t.kind === 'counter') {
        // Update counter settings
        return {
          ...base,
          target: editTarget,
          countUnit: editCountUnit,
        } as TaskRpg
      }

      return base as TaskRpg
    })
    setIsEditing(false)
  }

  const getTaskGroups = useRpgStore((s) => s.getTaskGroups)
  const settings = useRpgStore((s) => s.settings)

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    setShowDeleteConfirm(false)
    deleteTask(task.id)
    onDeselect?.()
  }

  const handleAddSubtask = (sub: SubtaskFormData) => {
    const newSubtask: SubtaskItem = {
      id: crypto.randomUUID(),
      title: sub.title,
      description: sub.description.trim() || undefined,
      isCompleted: false,
      coinReward: sub.coinReward > 0 ? sub.coinReward : undefined,
      gemReward: sub.gemReward && sub.gemReward > 0 ? sub.gemReward : undefined,
      difficulty: sub.difficulty,
      customXp: sub.customXp,
    }
    updateTask(task.id, (t) => {
      if (t.kind === 'nested') return { ...t, subtasks: [...t.subtasks, newSubtask] }
      // Преобразуем checkbox в nested при добавлении первой подзадачи
      if (t.kind === 'checkbox') {
        const { kind, ...rest } = t
        return { ...rest, kind: 'nested' as const, subtasks: [newSubtask] } as TaskRpg
      }
      return t
    })
  }

  const handleRemoveSubtask = (subtaskId: string) => {
    if (task.kind !== 'nested') return
    updateTask(task.id, (t) => {
      if (t.kind !== 'nested') return t
      const next = t.subtasks.filter((s) => s.id !== subtaskId)
      // Если подзадач не осталось — преобразуем обратно в checkbox
      if (next.length === 0) {
        const { subtasks, kind, ...rest } = t
        return { ...rest, kind: 'checkbox' as const } as TaskRpg
      }
      return { ...t, subtasks: next }
    })
    if (editingSubtask?.id === subtaskId) {
      setEditingSubtask(null)
      setShowSubtaskModal(false)
    }
  }

  const handleEditSubtask = (sub: SubtaskEditData) => {
    if (task.kind !== 'nested') return
    updateTask(task.id, (t) => {
      if (t.kind !== 'nested') return t
      return {
        ...t,
        subtasks: t.subtasks.map((s) =>
          s.id === sub.id
            ? {
                ...s,
                title: sub.title,
                description: sub.description.trim() || undefined,
                coinReward: sub.coinReward > 0 ? sub.coinReward : undefined,
                gemReward: sub.gemReward && sub.gemReward > 0 ? sub.gemReward : undefined,
                difficulty: sub.difficulty,
                customXp: sub.customXp,
              }
            : s
        ),
      }
    })
  }

  const openEditSubtask = (subtask: SubtaskItem) => {
    setEditingSubtask(subtask)
    setShowSubtaskModal(true)
  }

  const closeSubtaskModal = () => {
    setShowSubtaskModal(false)
    setEditingSubtask(null)
  }

  // Keep a ref to the previous task so we can detect unsaved edits on switch
  const prevTaskRef = useRef(task)

  // Reset edit state helper
  const resetEditState = useCallback((t: TaskRpg) => {
    setIsEditing(false)
    setEditTitle(t.title)
    setEditNotes(t.notes ?? '')
    setEditGroupId(t.groupId ?? null)
    setEditAttributeIds(t.attributeIds?.length ? t.attributeIds : (t.attributeId ? [t.attributeId] : []))
    setEditDifficulty(t.difficulty)
    setEditCustomXp(t.customXp ?? null)
    setEditCoinReward(t.coinReward)
    setEditGemReward(t.gemReward ?? 0)
    setEditRecurrence(t.recurrence)
    setEditDeadlineAt(t.deadlineAt ? new Date(t.deadlineAt).toISOString().slice(0, 16) : '')
    setEditCounterEnabled(t.kind === 'counter')
    setEditTarget(t.kind === 'counter' ? t.target : 2)
    setEditCountUnit(t.kind === 'counter' ? (t.countUnit ?? 'раз') : 'раз')
  }, [])

  // Handle task switch: detect when task.id changes
  useEffect(() => {
    const prev = prevTaskRef.current
    if (prev.id !== task.id) {
      if (isEditing) {
        // Check if edit state differs from the PREVIOUS task (unsaved changes)
        const prevAttrIds = prev.attributeIds?.length ? prev.attributeIds : (prev.attributeId ? [prev.attributeId] : [])
        const changed =
          editTitle !== prev.title ||
          editNotes !== (prev.notes ?? '') ||
          editGroupId !== (prev.groupId ?? null) ||
          JSON.stringify(editAttributeIds) !== JSON.stringify(prevAttrIds) ||
          editDifficulty !== prev.difficulty ||
          editCustomXp !== (prev.customXp ?? null) ||
          editCoinReward !== prev.coinReward ||
          editGemReward !== (prev.gemReward ?? 0) ||
          editRecurrence !== prev.recurrence ||
          editCounterEnabled !== (prev.kind === 'counter') ||
          (editCounterEnabled && prev.kind === 'counter' && (editTarget !== prev.target || editCountUnit !== (prev.countUnit ?? 'раз')))

        if (changed) {
          // Show unsaved changes modal, defer reset until user responds
          pendingTaskRef.current = task
          setShowUnsavedConfirm(true)
          return
        }
      }

      // No unsaved changes — reset to view mode with new task data
      resetEditState(task)
      prevTaskRef.current = task
    }
  }, [task.id])

  const handleUnsavedSave = () => {
    setShowUnsavedConfirm(false)
    // Save edits to the PREVIOUS task (not the current prop which is already the new task)
    const prevTaskId = prevTaskRef.current.id
    handleSaveEdit(prevTaskId)
    const pending = pendingTaskRef.current
    if (pending) {
      resetEditState(pending)
      prevTaskRef.current = pending
      pendingTaskRef.current = null
    }
  }

  const handleUnsavedDiscard = () => {
    setShowUnsavedConfirm(false)
    const pending = pendingTaskRef.current
    if (pending) {
      resetEditState(pending)
      prevTaskRef.current = pending
      pendingTaskRef.current = null
    }
  }

  const editAttrNames = editAttributeIds.map((id) => attributes.find((a) => a.id === id)).filter(Boolean)
  const editEffectiveXp = editCustomXp ?? (settings.taskDifficultyXp?.[editDifficulty] ?? TASK_XP_BY_DIFFICULTY[editDifficulty])
  const getSubtaskEffectiveXp = (s: SubtaskItem) =>
    s.customXp ?? settings.taskDifficultyXp?.[s.difficulty ?? 'medium'] ?? TASK_XP_BY_DIFFICULTY[s.difficulty ?? 'medium'] ?? s.xpReward ?? 0

  return (
    <div className="glass-card flex h-full flex-col rounded-2xl p-6 overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          {isEditing ? (
            <div className="flex-1 flex flex-col gap-3">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="input text-xl font-semibold"
                autoFocus
              />
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Заметки..."
                rows={3}
                className="input resize-none"
              />

              {/* Группа */}
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Группа</label>
                <button
                  type="button"
                  onClick={() => setShowGroupModal(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--surface)] px-4 py-2 text-left transition-colors hover:bg-[var(--surface-elevated)]"
                >
                  <Folder className="h-4 w-4 text-[var(--accent)]" />
                  <span className="flex-1 text-sm">
                    {editGroupId ? getTaskGroups().find((g) => g.id === editGroupId)?.name : 'Без группы'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
                </button>
              </div>

              {/* Атрибуты и сложность */}
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Атрибуты и сложность</label>
                <button
                  type="button"
                  onClick={() => setShowAttributeModal(true)}
                  className="group/attr flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition-all hover:border-[var(--accent)]/40 hover:shadow-sm"
                >
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
                    editAttrNames.length > 0
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                      : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)]'
                  )}>
                    <BarChart3 className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {editAttrNames.length > 0 ? (
                        <>
                          {editAttrNames.map((a) => (
                            <span
                              key={a!.id}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border shadow-sm"
                              style={{
                                backgroundColor: `${a!.color}12`,
                                color: a!.color,
                                borderColor: `${a!.color}30`,
                                boxShadow: `0 1px 3px ${a!.color}10`,
                              }}
                            >
                              <span className="text-sm">{a!.icon}</span>
                              {a!.name}
                            </span>
                          ))}
                          <span className="text-[var(--fg-muted)] text-xs">·</span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold border',
                              editCustomXp != null
                                ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                                : editDifficulty === 'easy'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                : editDifficulty === 'medium'
                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                                : editDifficulty === 'hard'
                                ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                                : 'bg-red-500/10 text-red-500 border-red-500/30'
                            )}
                          >
                            <Zap className="h-3 w-3" />
                            {editEffectiveXp} XP
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-[var(--fg-muted)]">Не выбрано</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--fg-muted)] transition-transform duration-200 group-hover/attr:translate-x-0.5" />
                </button>
              </div>

              {/* Вознаграждения */}
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Вознаграждения</label>
                <button
                  type="button"
                  onClick={() => setShowRewardsModal(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--surface)] px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-elevated)]"
                >
                  <Gift className="h-4 w-4 text-[var(--accent)]" />
                  <div className="flex-1">
                    {(editCoinReward > 0 || editGemReward > 0) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-cyan-50 dark:from-amber-950/30 dark:to-cyan-950/30 px-2.5 py-1 text-xs font-semibold border border-amber-200 dark:border-amber-800">
                        {editCoinReward > 0 && (
                          <>
                            <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            <span className="text-amber-600 dark:text-amber-400">{editCoinReward}</span>
                          </>
                        )}
                        {editCoinReward > 0 && editGemReward > 0 && (
                          <span className="text-[var(--fg-muted)]">•</span>
                        )}
                        {editGemReward > 0 && (
                          <>
                            <Gem className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" strokeWidth={2.5} />
                            <span className="text-cyan-600 dark:text-cyan-400">{editGemReward}</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-sm text-[var(--fg-muted)]">Не назначено</span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
                </button>
              </div>

              {/* Правило повтора */}
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
                        <Clock className="h-5 w-5 text-[var(--accent)]" />
                        <div>
                          <p className="font-semibold text-[var(--fg)]">Повтор</p>
                          <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                            {RECURRENCE_LABELS[editRecurrence]}
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
                            {editDeadlineAt ? new Date(editDeadlineAt).toLocaleDateString('ru-RU', {
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

              {/* Целевые показатели — для counter, checkbox (можно конвертировать) */}
              {task.kind !== 'nested' && (
                <div>
                  <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Целевые показатели</label>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    {/* Toggle header */}
                    <button
                      type="button"
                      onClick={() => setEditCounterEnabled((v) => !v)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                        'hover:bg-[var(--surface-elevated)]'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300',
                          editCounterEnabled
                            ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                            : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)]'
                        )}
                      >
                        <Target className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--fg)]">Задача со счетчиком</p>
                        <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
                          Установите целевое количество и единицы измерения
                        </p>
                      </div>
                      <div
                        role="switch"
                        aria-checked={editCounterEnabled}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditCounterEnabled((v) => !v)
                        }}
                        className={cn(
                          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 cursor-pointer',
                          editCounterEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300',
                            editCounterEnabled ? 'right-0.5 left-auto' : 'left-0.5 right-auto'
                          )}
                        />
                      </div>
                    </button>

                    {/* Counter settings panel */}
                    <div
                      className={cn(
                        'overflow-hidden transition-all duration-400 ease-out',
                        editCounterEnabled ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                      )}
                    >
                      <div className="border-t border-[var(--border)] p-4 space-y-5">
                        {/* Circular progress preview */}
                        <div className="flex justify-center">
                          <div className="relative">
                            <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
                              <circle
                                cx="50" cy="50" r="42"
                                fill="none"
                                stroke="var(--border)"
                                strokeWidth="7"
                                strokeLinecap="round"
                              />
                              <circle
                                cx="50" cy="50" r="42"
                                fill="none"
                                stroke="url(#counterGradientEdit)"
                                strokeWidth="7"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 42}`}
                                strokeDashoffset="0"
                                className="transition-all duration-500 ease-out"
                              />
                              <defs>
                                <linearGradient id="counterGradientEdit" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" style={{ stopColor: 'var(--accent)' }} />
                                  <stop offset="100%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.7 }} />
                                </linearGradient>
                              </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-xl font-bold text-[var(--fg)]">{editTarget}</span>
                              <span className="text-[10px] text-[var(--fg-muted)]">{editCountUnit}</span>
                            </div>
                          </div>
                        </div>

                        {/* Target quantity with slider */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-[var(--fg-secondary)]">Целевое количество</label>
                            <span className="text-[10px] text-[var(--fg-muted)]">Мин. 2</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditTarget((n) => Math.max(2, n - 1))}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)] transition-all duration-200 active:scale-90 text-base font-medium"
                            >
                              −
                            </button>
                            <div className="flex-1 relative">
                              <input
                                type="range"
                                min={2}
                                max={100}
                                value={Math.min(editTarget, 100)}
                                onChange={(e) => setEditTarget(Math.max(2, parseInt(e.target.value, 10)))}
                                className="target-slider w-full"
                              />
                              <div className="relative mt-0.5 h-4" style={{ padding: '0 11px' }}>
                                {[5, 10, 25, 50, 100].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => setEditTarget(val)}
                                    className={cn(
                                      'absolute text-[9px] font-medium transition-all duration-200 -translate-x-1/2',
                                      editTarget === val
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
                            <button
                              type="button"
                              onClick={() => setEditTarget((n) => n + 1)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-md hover:brightness-110 transition-all duration-200 active:scale-90 text-base font-medium"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Unit of measurement */}
                        <div>
                          <label className="block text-xs font-semibold text-[var(--fg-secondary)] mb-1.5">Единица измерения</label>
                          <input
                            type="text"
                            value={editCountUnit}
                            onChange={(e) => e.target.value.length <= 8 && setEditCountUnit(e.target.value)}
                            maxLength={8}
                            placeholder="раз"
                            className="input w-full h-9 text-sm mb-2"
                          />
                          <div className="flex gap-1.5">
                            {[
                              { label: 'раз' },
                              { label: 'мин' },
                              { label: 'км' },
                              { label: 'стр' },
                              { label: 'шт' },
                            ].map((unit) => (
                              <button
                                key={unit.label}
                                type="button"
                                onClick={() => setEditCountUnit(unit.label)}
                                className={cn(
                                  'flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all duration-200 active:scale-95',
                                  editCountUnit === unit.label
                                    ? 'bg-[var(--accent)] text-white shadow-sm'
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

              {/* Подзадачи — для nested и checkbox (можно добавить подзадачи и преобразовать в nested) */}
              {(task.kind === 'nested' || (task.kind === 'checkbox' && !editCounterEnabled)) && (
                <div>
                  <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">
                    Подзадачи ({task.kind === 'nested' ? task.subtasks.length : 0})
                  </label>
                  {task.kind === 'nested' && task.subtasks.length > 0 && (
                    <div className="flex flex-col gap-2 mb-2">
                      {task.subtasks.map((subtask) => {
                        const subDiff = subtask.difficulty ?? 'medium'
                        const subXp = getSubtaskEffectiveXp(subtask)
                        const subHasCurrency = (subtask.coinReward ?? 0) > 0 || (subtask.gemReward ?? 0) > 0
                        return (
                          <div
                            key={subtask.id}
                            className="group relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition-all hover:border-[var(--border-strong)] hover:shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
                                <ListChecks className="h-4 w-4" />
                              </div>
                              <span className="flex-1 truncate text-sm font-medium text-[var(--fg)]">{subtask.title}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditSubtask(subtask)}
                                  className="icon-btn h-7 w-7 shrink-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Редактировать"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSubtask(subtask.id)}
                                  className="icon-btn icon-btn-danger h-7 w-7 shrink-0 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Удалить"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            {(subXp > 0 || subHasCurrency) && (
                              <div className="mt-2 ml-11 flex flex-wrap items-center gap-1.5">
                                {subHasCurrency && (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-cyan-50 dark:from-amber-950/30 dark:to-cyan-950/30 px-2 py-0.5 text-xs font-semibold border border-amber-200 dark:border-amber-800">
                                    {(subtask.coinReward ?? 0) > 0 && (
                                      <>
                                        <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                        <span className="text-amber-600 dark:text-amber-400">{subtask.coinReward}</span>
                                      </>
                                    )}
                                    {(subtask.coinReward ?? 0) > 0 && (subtask.gemReward ?? 0) > 0 && (
                                      <span className="text-[var(--fg-muted)]">•</span>
                                    )}
                                    {(subtask.gemReward ?? 0) > 0 && (
                                      <>
                                        <Gem className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" strokeWidth={2.5} />
                                        <span className="text-cyan-600 dark:text-cyan-400">{subtask.gemReward}</span>
                                      </>
                                    )}
                                  </span>
                                )}
                                {subXp > 0 && (
                                  <span className={cn(
                                    'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold border',
                                    subtask.customXp != null
                                      ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                                      : subDiff === 'easy'
                                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                      : subDiff === 'medium'
                                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                                      : subDiff === 'hard'
                                      ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                                      : 'bg-red-500/10 text-red-500 border-red-500/30'
                                  )}>
                                    <Zap className="h-3 w-3" />
                                    {subXp} XP
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
                    onClick={() => { setEditingSubtask(null); setShowSubtaskModal(true) }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]"
                  >
                    <Plus className="h-4 w-4" />
                    Добавить подзадачу
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveEdit()}
                  className="btn-primary flex-1"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setEditTitle(task.title)
                    setEditNotes(task.notes ?? '')
                    setEditGroupId(task.groupId ?? null)
                    setEditAttributeIds(task.attributeIds?.length ? task.attributeIds : (task.attributeId ? [task.attributeId] : []))
                    setEditDifficulty(task.difficulty)
                    setEditCustomXp(task.customXp ?? null)
                    setEditCoinReward(task.coinReward)
                    setEditGemReward(task.gemReward ?? 0)
                    setEditCounterEnabled(task.kind === 'counter')
                    setEditTarget(task.kind === 'counter' ? task.target : 2)
                    setEditCountUnit(task.kind === 'counter' ? (task.countUnit ?? 'раз') : 'раз')
                  }}
                  className="btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-3 mb-2 min-w-0">
                  {task.isCompleted && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shrink-0">
                      <Check className="h-5 w-5" />
                    </div>
                  )}
                  <h2 className={cn(
                    'text-xl font-bold text-[var(--fg)] break-words min-w-0',
                    task.isCompleted && 'line-through opacity-60'
                  )}>
                    {task.title}
                  </h2>
                </div>
                {task.notes && (
                  <p className="text-[var(--fg-muted)] leading-relaxed break-words overflow-hidden">{task.notes}</p>
                )}
                {/* Время выполнения */}
                {task.isCompleted && task.completedAt && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500/30">
                    <Award className="h-4 w-4" />
                    <span>
                      Выполнено {new Date(task.completedAt).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {!task.isCompleted && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="icon-btn"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDelete}
                  className="icon-btn icon-btn-danger"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onDeselect}
                  className="icon-btn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {!isEditing && (
          <>
            {/* Task badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {taskAttrs.map((a) => a && (
                <span
                  key={a.id}
                  className="rounded-xl px-3 py-1.5 text-sm font-medium border-2"
                  style={{ backgroundColor: `${a.color}15`, color: a.color, borderColor: `${a.color}50` }}
                >
                  {a.icon} {a.name}
                </span>
              ))}
              <span
                className="rounded-xl px-3 py-1.5 text-sm font-medium border-2"
                style={{
                  backgroundColor: `${diffColor}15`,
                  color: diffColor,
                  borderColor: `${diffColor}50`,
                }}
              >
                <Zap className="h-3.5 w-3.5 inline mr-1" />
                {DIFFICULTY_LABELS[task.difficulty]}
              </span>
              <span className="rounded-xl bg-blue-500/15 px-3 py-1.5 text-sm font-medium text-blue-500 border-2 border-blue-500/50">
                <Clock className="h-3.5 w-3.5 inline mr-1" />
                {RECURRENCE_LABELS[task.recurrence]}
              </span>
            </div>

            {/* Deadline card (expanded info block) */}
            {deadlineAt != null && (() => {
              const now = new Date()
              const deadline = new Date(deadlineAt)
              const diffTime = deadline.getTime() - now.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              const diffHours = Math.ceil(diffTime / (1000 * 60 * 60))

              let color = 'green'
              let bgColor = 'bg-green-500/15'
              let borderColor = 'border-green-400/50'
              let textColor = 'text-green-400'
              let timeText = ''
              let urgencyLabel = 'В пределах графика'

              if (diffDays < 0) {
                color = 'gray'
                bgColor = 'bg-gray-500/15'
                borderColor = 'border-gray-400/50'
                textColor = 'text-gray-400'
                timeText = 'Просрочено'
                urgencyLabel = 'Дедлайн истек'
              } else if (diffDays < 1) {
                color = 'red'
                bgColor = 'bg-red-500/15'
                borderColor = 'border-red-400/50'
                textColor = 'text-red-400'
                timeText = diffHours > 1 ? `Осталось ${diffHours} ч` : 'Меньше часа'
                urgencyLabel = 'Срочно'
              } else if (diffDays <= 3) {
                color = 'orange'
                bgColor = 'bg-orange-500/15'
                borderColor = 'border-orange-400/50'
                textColor = 'text-orange-400'
                timeText = `Осталось ${diffDays} ${diffDays === 1 ? 'день' : 'дня'}`
                urgencyLabel = 'Скоро'
              } else if (diffDays <= 7) {
                color = 'yellow'
                bgColor = 'bg-yellow-500/15'
                borderColor = 'border-yellow-400/50'
                textColor = 'text-yellow-400'
                timeText = `Осталось ${diffDays} ${diffDays > 4 ? 'дней' : 'дня'}`
                urgencyLabel = 'Умеренно'
              } else {
                timeText = `Осталось ${diffDays} дней`
              }

              return (
                <div
                  className={cn(
                    "glass rounded-2xl p-4 mb-6 border-2",
                    bgColor,
                    borderColor
                  )}
                  style={{
                    boxShadow: color === 'red'
                      ? '0 0 12px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.1)'
                      : color === 'orange'
                      ? '0 0 12px rgba(251, 146, 60, 0.3), 0 0 20px rgba(251, 146, 60, 0.1)'
                      : color === 'yellow'
                      ? '0 0 12px rgba(234, 179, 8, 0.3), 0 0 20px rgba(234, 179, 8, 0.1)'
                      : color === 'green'
                      ? '0 0 12px rgba(16, 185, 129, 0.3), 0 0 20px rgba(16, 185, 129, 0.1)'
                      : '0 0 8px rgba(107, 114, 128, 0.2)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      color === 'red' && 'bg-red-500/25',
                      color === 'orange' && 'bg-orange-500/25',
                      color === 'yellow' && 'bg-yellow-500/25',
                      color === 'green' && 'bg-green-500/25',
                      color === 'gray' && 'bg-gray-500/25'
                    )}>
                      <Clock className={cn("h-6 w-6", textColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-[var(--fg)]">Дедлайн</h3>
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          bgColor,
                          textColor,
                          borderColor,
                          "border"
                        )}>
                          {urgencyLabel}
                        </span>
                      </div>
                      <p className={cn("text-lg font-bold mb-0.5", textColor)}>
                        {timeText}
                      </p>
                      <p className="text-sm text-[var(--fg-muted)]">
                        {deadline.toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {isPastDeadline && (
                        <p className="mt-2 text-xs text-red-400 font-medium">
                          ⚠️ Завершить задачу больше нельзя
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Rewards card */}
            <div className="glass rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Награды</h3>
              <div className="flex flex-col gap-3">
                {/* XP reward - только если есть атрибуты */}
                {taskAttrIds.length > 0 && xp > 0 && (
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-xl p-3 border",
                      isCustomXp && 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
                      !isCustomXp && task.difficulty === 'easy' && 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
                      !isCustomXp && task.difficulty === 'medium' && 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
                      !isCustomXp && task.difficulty === 'hard' && 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
                      !isCustomXp && task.difficulty === 'veryHard' && 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        isCustomXp && 'bg-purple-100 dark:bg-purple-900/50',
                        !isCustomXp && task.difficulty === 'easy' && 'bg-emerald-100 dark:bg-emerald-900/50',
                        !isCustomXp && task.difficulty === 'medium' && 'bg-blue-100 dark:bg-blue-900/50',
                        !isCustomXp && task.difficulty === 'hard' && 'bg-orange-100 dark:bg-orange-900/50',
                        !isCustomXp && task.difficulty === 'veryHard' && 'bg-red-100 dark:bg-red-900/50'
                      )}
                    >
                      <Zap
                        className={cn(
                          "h-5 w-5",
                          isCustomXp && 'text-purple-600 dark:text-purple-400',
                          !isCustomXp && task.difficulty === 'easy' && 'text-emerald-600 dark:text-emerald-400',
                          !isCustomXp && task.difficulty === 'medium' && 'text-blue-600 dark:text-blue-400',
                          !isCustomXp && task.difficulty === 'hard' && 'text-orange-600 dark:text-orange-400',
                          !isCustomXp && task.difficulty === 'veryHard' && 'text-red-600 dark:text-red-400'
                        )}
                      />
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-xl font-bold",
                          isCustomXp && 'text-purple-600 dark:text-purple-400',
                          !isCustomXp && task.difficulty === 'easy' && 'text-emerald-600 dark:text-emerald-400',
                          !isCustomXp && task.difficulty === 'medium' && 'text-blue-600 dark:text-blue-400',
                          !isCustomXp && task.difficulty === 'hard' && 'text-orange-600 dark:text-orange-400',
                          !isCustomXp && task.difficulty === 'veryHard' && 'text-red-600 dark:text-red-400'
                        )}
                      >
                        +{xp}
                      </p>
                      <p className="text-xs text-[var(--fg-muted)]">XP опыта</p>
                    </div>
                  </div>
                )}

                {/* Coins reward */}
                <div className="flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-800">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                    <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">+{coins}</p>
                    <p className="text-xs text-[var(--fg-muted)]">Монет</p>
                  </div>
                </div>

                {/* Gems reward */}
                {gems > 0 && (
                  <div className="flex items-center gap-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 p-3 border border-cyan-200 dark:border-cyan-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/50">
                      <Gem className="h-6 w-6 text-cyan-600 dark:text-cyan-400" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">+{gems}</p>
                      <p className="text-xs text-[var(--fg-muted)]">Кристаллов</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Counter controls - only show when not completed */}
            {task.kind === 'counter' && !task.isCompleted && (
              <div className="glass rounded-2xl p-5 mb-6">
                <h3 className="text-sm font-semibold text-[var(--fg)] mb-4">Прогресс счётчика</h3>
                <div className="flex items-center justify-center gap-6">
                  <button
                    type="button"
                    onClick={() => decrementCounter(task.id)}
                    disabled={task.current === 0}
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200',
                      task.current === 0
                        ? 'bg-[var(--surface)] text-[var(--fg-muted)]'
                        : 'bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:scale-110 active:scale-95'
                    )}
                  >
                    <Minus className="h-6 w-6" />
                  </button>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[var(--fg)]">{task.current}</div>
                    <div className="text-lg text-[var(--fg-muted)]">из {task.target}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => incrementCounter(task.id)}
                    disabled={task.current >= task.target}
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200',
                      task.current >= task.target
                        ? 'bg-[var(--surface)] text-[var(--fg-muted)]'
                        : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:scale-110 active:scale-95'
                    )}
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${progress * 100}%`,
                      background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)'
                    }}
                  />
                </div>
                <p className="text-center text-sm text-[var(--fg-muted)] mt-2">
                  {Math.round(progress * 100)}% выполнено
                </p>
              </div>
            )}

            {/* Counter completed - show readonly */}
            {task.kind === 'counter' && task.isCompleted && (
              <div className="glass rounded-2xl p-5 mb-6">
                <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Счётчик</h3>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-500">{task.current}/{task.target} {task.countUnit || 'раз'}</div>
                </div>
                <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, #10b981, #34d399)'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Subtasks */}
            {task.kind === 'nested' && (
              <div className="glass rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--fg)]">
                    Подзадачи ({task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length})
                  </h3>
                  {task.isCompleted && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Задача выполнена
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)] mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${subtaskProgress * 100}%`,
                      background: 'linear-gradient(90deg, #10b981, #34d399)'
                    }}
                  />
                </div>

                <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
                  {task.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className={cn(
                        'group flex flex-col rounded-xl p-3 transition-all',
                        subtask.isCompleted
                          ? 'bg-emerald-500/10'
                          : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (task.isCompleted) return
                            if (!subtask.isCompleted) {
                              const cr = subtask.coinReward ?? 0
                              const xr = getSubtaskEffectiveXp(subtask)
                              if (cr > 0 || xr > 0) {
                                setRewardFeedback({ subtaskId: subtask.id, coins: cr, xp: xr })
                                setTimeout(() => setRewardFeedback(null), 1500)
                              }
                            }
                            toggleSubtask(task.id, subtask.id)
                          }}
                          disabled={task.isCompleted}
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all',
                            task.isCompleted
                              ? 'opacity-50 cursor-not-allowed'
                              : subtask.isCompleted
                              ? 'bg-emerald-500 text-white'
                              : 'border-2 border-[var(--border)] hover:border-emerald-500'
                          )}
                        >
                          {subtask.isCompleted && <Check className="h-4 w-4" />}
                        </button>
                        <span className={cn(
                          'flex-1 min-w-0 text-sm',
                          subtask.isCompleted && 'line-through text-[var(--fg-muted)]'
                        )}>
                          {subtask.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {((subtask.coinReward ?? 0) > 0 || (subtask.gemReward ?? 0) > 0) && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-cyan-50 dark:from-amber-950/30 dark:to-cyan-950/30 px-2 py-1 text-xs font-semibold border border-amber-200 dark:border-amber-800">
                              {(subtask.coinReward ?? 0) > 0 && (
                                <>
                                  <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                  <span className="text-amber-600 dark:text-amber-400">{subtask.coinReward}</span>
                                </>
                              )}
                              {(subtask.coinReward ?? 0) > 0 && (subtask.gemReward ?? 0) > 0 && (
                                <span className="text-[var(--fg-muted)]">•</span>
                              )}
                              {(subtask.gemReward ?? 0) > 0 && (
                                <>
                                  <Gem className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" strokeWidth={2.5} />
                                  <span className="text-cyan-600 dark:text-cyan-400">{subtask.gemReward}</span>
                                </>
                              )}
                            </span>
                          )}
                          {(() => {
                            const subXpVal = getSubtaskEffectiveXp(subtask)
                            const subDiff = subtask.difficulty ?? 'medium'
                            if (subXpVal <= 0) return null
                            return (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold border',
                                  subtask.customXp != null
                                    ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                                    : subDiff === 'easy'
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                    : subDiff === 'medium'
                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                                    : subDiff === 'hard'
                                    ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                                    : 'bg-red-500/10 text-red-500 border-red-500/30'
                                )}
                                style={{
                                  boxShadow: subtask.customXp != null
                                    ? '0 0 8px rgba(168, 85, 247, 0.2)'
                                    : subDiff === 'easy'
                                    ? '0 0 8px rgba(16, 185, 129, 0.2)'
                                    : subDiff === 'medium'
                                    ? '0 0 8px rgba(59, 130, 246, 0.2)'
                                    : subDiff === 'hard'
                                    ? '0 0 8px rgba(249, 115, 22, 0.2)'
                                    : '0 0 8px rgba(239, 68, 68, 0.2)'
                                }}
                              >
                                <Zap className="h-3.5 w-3.5" />{subXpVal} XP
                              </span>
                            )
                          })()}
                        </div>
                        {!task.isCompleted && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditSubtask(subtask)}
                              className="icon-btn opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                              title="Редактировать"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubtask(subtask.id)}
                              className="icon-btn icon-btn-danger opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                              title="Удалить"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                      {subtask.description && (
                        <p className="ml-9 mt-1 text-xs text-[var(--fg-muted)] leading-relaxed">
                          {subtask.description}
                        </p>
                      )}
                      {rewardFeedback?.subtaskId === subtask.id && (
                        <div className="ml-9 mt-1 flex items-center gap-2 animate-reward-fade text-xs font-semibold">
                          {rewardFeedback.xp > 0 && (
                            <span className="text-purple-500">+{rewardFeedback.xp} XP</span>
                          )}
                          {rewardFeedback.coins > 0 && (
                            <span className="text-amber-500">+{rewardFeedback.coins} 🪙</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add subtask button */}
                {!task.isCompleted && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubtask(null)
                      setShowSubtaskModal(true)
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]"
                  >
                    <Plus className="h-4 w-4" />
                    Добавить подзадачу
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons - fixed at bottom */}
      {!isEditing && (
        <div className="mt-4 flex gap-3 shrink-0">
          {!task.isCompleted && (
            <button
              type="button"
              onClick={() => completeTask(task.id)}
              disabled={!canComplete}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold transition-all duration-200',
                canComplete
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-[var(--surface)] text-[var(--fg-muted)] cursor-not-allowed opacity-50'
              )}
            >
              <Check className="h-5 w-5" />
              Выполнить
            </button>
          )}
          {task.isCompleted && (
            <div className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 py-4 text-emerald-500">
              <Award className="h-5 w-5" />
              <span className="font-semibold">Задача выполнена!</span>
            </div>
          )}
          {!canComplete && !task.isCompleted && isPastDeadline && (
            <div className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 py-4 text-red-500">
              <Clock className="h-5 w-5" />
              <span className="font-semibold">Дедлайн истёк</span>
            </div>
          )}
        </div>
      )}

      {/* Модальные окна */}
      <TaskGroupSelectModal
        isOpen={showGroupModal}
        selectedGroupId={editGroupId}
        onSelect={setEditGroupId}
        onClose={() => setShowGroupModal(false)}
      />
      <TaskAttributeSelectModal
        isOpen={showAttributeModal}
        selectedAttributeIds={editAttributeIds}
        selectedDifficulty={editDifficulty}
        customXp={editCustomXp}
        onSelectAttributes={setEditAttributeIds}
        onSelectDifficulty={setEditDifficulty}
        onChangeCustomXp={setEditCustomXp}
        onClose={() => setShowAttributeModal(false)}
      />
      <TaskRewardsModal
        isOpen={showRewardsModal}
        coinReward={editCoinReward}
        gemReward={editGemReward}
        onUpdateCoins={setEditCoinReward}
        onUpdateGems={setEditGemReward}
        onClose={() => setShowRewardsModal(false)}
      />
      <SubtaskCreateModal
        isOpen={showSubtaskModal}
        editingSubtask={editingSubtask ? {
          id: editingSubtask.id,
          title: editingSubtask.title,
          description: editingSubtask.description ?? '',
          coinReward: editingSubtask.coinReward ?? 0,
          gemReward: editingSubtask.gemReward ?? 0,
          difficulty: editingSubtask.difficulty,
          customXp: editingSubtask.customXp,
          xpReward: editingSubtask.xpReward,
        } : null}
        onAdd={handleAddSubtask}
        onEdit={handleEditSubtask}
        onClose={closeSubtaskModal}
      />
      <RecurrenceSelectModal
        isOpen={showRecurrenceModal}
        selected={editRecurrence}
        onSelect={setEditRecurrence}
        onClose={() => setShowRecurrenceModal(false)}
      />
      <DateTimePickerModal
        isOpen={showDeadlineModal}
        value={editDeadlineAt}
        onChange={setEditDeadlineAt}
        onClose={() => setShowDeadlineModal(false)}
      />
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Удалить задачу?"
        message="Задача будет удалена безвозвратно."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
      <ConfirmModal
        isOpen={showUnsavedConfirm}
        onConfirm={handleUnsavedSave}
        onCancel={handleUnsavedDiscard}
        title="Несохранённые изменения"
        message="Вы изменили задачу, но не сохранили. Сохранить изменения?"
        confirmText="Сохранить"
        cancelText="Не сохранять"
        variant="save"
      />
    </div>
  )
}
