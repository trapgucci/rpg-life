import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Check, SkipForward, Pencil, Trash2, X,
  Plus, Minus, Clock, Award, ChevronRight, BarChart3, Gift, Folder, Edit2, Target, Hash, ListChecks, CheckSquare, Flag, Coins, Gem, Zap, Archive, XCircle, AlertTriangle
} from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRpg, TaskDifficulty, TaskRecurrence, AttributeId, SubtaskItem, TaskGroupId, TaskPriority, RecurrenceSettings } from '../types/domain'
import { TASK_XP_BY_DIFFICULTY } from '../types/domain'
import { useRpgStore } from '../store/useRpgStore'
import TaskGroupSelectModal from './TaskGroupSelectModal'
import TaskAttributeSelectModal from './TaskAttributeSelectModal'
import TaskRewardsModal from './TaskRewardsModal'
import SubtaskCreateModal, { type SubtaskEditData, type SubtaskFormData } from './SubtaskCreateModal'
import RecurrenceSelectModal from './RecurrenceSelectModal'
import ConfirmModal from './ConfirmModal'
import RewardBadge from './RewardBadge'
import { TaskCurrentCycleBlock, TaskStatsBlock, TaskHistoryBlock } from './TaskCycleSections'
import { getNextAvailableDate, getRelativeTimeRu, getSubtaskXp, isTodayScheduled } from '../lib/taskCycleUtils'

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
  instant: 'Инстант',
  custom: 'Кастомный',
}

const PRIORITY_COLORS = {
  none: {},
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  high: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
} as const

const PRIORITY_LABELS = {
  none: 'Без приоритета',
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
} as const

const KIND_ICON = {
  checkbox: CheckSquare,
  counter: Hash,
  nested: ListChecks,
} as const

interface TaskDetailPanelProps {
  task: TaskRpg
  onDeselect?: () => void
}

export default function TaskDetailPanel({ task, onDeselect }: TaskDetailPanelProps) {
  const getTaskRewardPreview = useRpgStore((s) => s.getTaskRewardPreview)
  const completeTask = useRpgStore((s) => s.completeTask)
  const canCompleteTask = useRpgStore((s) => s.canCompleteTask)
  const skipTask = useRpgStore((s) => s.skipTask)
  const debugNow = useRpgStore((s) => s.getDebugNow)()

  const archiveTask = useRpgStore((s) => s.archiveTask)
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
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority ?? 'none')
  const [editCustomXp, setEditCustomXp] = useState<number | null>(task.customXp ?? null)
  const [editCoinReward, setEditCoinReward] = useState(task.coinReward)
  const [editGemReward, setEditGemReward] = useState(task.gemReward ?? 0)
  const [editRecurrence, setEditRecurrence] = useState<TaskRecurrence>(task.recurrence)
  const [editRecurrenceSettings, setEditRecurrenceSettings] = useState<RecurrenceSettings>(
    task.recurrenceSettings ?? { type: task.recurrence, endMode: 'never' }
  )
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showAttributeModal, setShowAttributeModal] = useState(false)
  const [showRewardsModal, setShowRewardsModal] = useState(false)
  const [showSubtaskModal, setShowSubtaskModal] = useState(false)
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false)
  const [editingSubtask, setEditingSubtask] = useState<SubtaskItem | null>(null)
  const [rewardFeedback, setRewardFeedback] = useState<{ subtaskId: string; coins: number; xp: number } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)
  const [showDeleteSubtaskConfirm, setShowDeleteSubtaskConfirm] = useState(false)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [subtaskToDelete, setSubtaskToDelete] = useState<string | null>(null)
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

    updateTask(targetId, (t) => {
      const base = {
        ...t,
        title: editTitle.trim(),
        notes: editNotes.trim() || undefined,
        groupId: editGroupId,
        attributeIds: editAttributeIds,
        customXp: editCustomXp,
        difficulty: editDifficulty,
        priority: editPriority,
        coinReward: editCoinReward,
        gemReward: editGemReward,
        recurrence: editRecurrence,
        recurrenceSettings: editRecurrenceSettings,
      }

      // Определяем, нужно ли сбросить isCompleted для recurring задач
      // Если задача выполнена и изменились настройки повтора — сбрасываем
      const shouldResetCompletion = t.isCompleted && t.recurrence !== 'once' && (() => {
        // Сменился тип повтора
        if (editRecurrence !== t.recurrence) return true
        const oldRs = t.recurrenceSettings
        const newRs = editRecurrenceSettings
        // Сменились дни недели
        if (JSON.stringify(oldRs?.weeklyDays) !== JSON.stringify(newRs?.weeklyDays)) return true
        // Сменился режим недели (days ↔ timesPerWeek)
        if (oldRs?.weeklyMode !== newRs?.weeklyMode) return true
        // Увеличилось количество раз в неделю
        if (newRs?.weeklyMode === 'timesPerWeek' &&
            (newRs.weeklyTimesPerWeek ?? 0) > (oldRs?.weeklyTimesPerWeek ?? 0)) return true
        // Сменился кастомный интервал
        if (oldRs?.customIntervalDays !== newRs?.customIntervalDays) return true
        // Counter: target увеличился выше текущего прогресса
        if (t.kind === 'counter' && editCounterEnabled && editTarget > t.current) return true
        return false
      })()

      const resetFields: Record<string, unknown> = shouldResetCompletion ? {
        isCompleted: false,
        completedAt: undefined,
        currentCycleStart: debugNow,
        // Сбрасываем weeklyCompletedThisWeek при изменении расписания
        ...(editRecurrenceSettings?.weeklyMode === 'timesPerWeek' ? {
          recurrenceSettings: {
            ...editRecurrenceSettings,
            weeklyCompletedThisWeek: 0,
          }
        } : {}),
      } : {}

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
          ...resetFields,
          target: editTarget,
          countUnit: editCountUnit,
        } as TaskRpg
      }

      return { ...base, ...resetFields } as TaskRpg
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

  const handleComplete = () => {
    if (!canComplete) return
    completeTask(task.id)
    // Для instant задач НЕ десeлектим — задача сбрасывается и готова к повторному выполнению
    if (task.recurrence !== 'instant') {
      onDeselect?.()
    }
  }

  const handleSkip = () => {
    if (!canComplete) return
    setShowSkipConfirm(true)
  }

  const confirmSkip = () => {
    setShowSkipConfirm(false)
    skipTask(task.id)
    // Для instant задач НЕ десeлектим — задача сбрасывается и готова к повторному выполнению
    if (task.recurrence !== 'instant') {
      onDeselect?.()
    }
  }


  const handleArchive = () => {
    setShowArchiveConfirm(true)
  }

  const confirmArchive = () => {
    setShowArchiveConfirm(false)
    archiveTask(task.id)
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
    setSubtaskToDelete(subtaskId)
    setShowDeleteSubtaskConfirm(true)
  }

  const confirmDeleteSubtask = () => {
    if (!subtaskToDelete || task.kind !== 'nested') return
    updateTask(task.id, (t) => {
      if (t.kind !== 'nested') return t
      const next = t.subtasks.filter((s) => s.id !== subtaskToDelete)
      // Если подзадач не осталось — преобразуем обратно в checkbox
      if (next.length === 0) {
        const { subtasks, kind, ...rest } = t
        return { ...rest, kind: 'checkbox' as const } as TaskRpg
      }
      return { ...t, subtasks: next }
    })
    if (editingSubtask?.id === subtaskToDelete) {
      setEditingSubtask(null)
      setShowSubtaskModal(false)
    }
    setShowDeleteSubtaskConfirm(false)
    setSubtaskToDelete(null)
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
    setEditPriority(t.priority ?? 'none')
    setEditCustomXp(t.customXp ?? null)
    setEditCoinReward(t.coinReward)
    setEditGemReward(t.gemReward ?? 0)
    setEditRecurrence(t.recurrence)
    setEditRecurrenceSettings(t.recurrenceSettings ?? { type: t.recurrence, endMode: 'never' })
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
          editPriority !== (prev.priority ?? 'none') ||
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
  // XP отображается только если выбраны атрибуты
  const editEffectiveXp = editAttributeIds.length > 0
    ? (editCustomXp ?? (settings.taskDifficultyXp?.[editDifficulty] ?? TASK_XP_BY_DIFFICULTY[editDifficulty]))
    : 0
  // Для подзадач XP также зависит от атрибутов родительской задачи
  const getSubtaskEffectiveXp = (s: SubtaskItem) => getSubtaskXp(s, task, settings)

  // Синхронизация типа повтора
  const handleRecurrenceSettingsChange = (newSettings: RecurrenceSettings) => {
    setEditRecurrenceSettings(newSettings)
    setEditRecurrence(newSettings.type)
  }

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
                  className="flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--surface)] px-3 py-2 text-left transition-colors hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]"
                >
                  <Folder className="h-4 w-4 shrink-0 text-[var(--accent)]" />
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
                      ? 'bg-gradient-to-b from-[var(--accent)]/15 to-[var(--accent)]/5 text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/10'
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
                              className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold shadow-sm"
                              style={{
                                background: `linear-gradient(to bottom, ${a!.color}22, ${a!.color}10)`,
                                color: a!.color,
                                boxShadow: `0 1px 3px ${a!.color}12, inset 0 1px 0 ${a!.color}15`,
                                outline: `1px solid ${a!.color}20`,
                                outlineOffset: '-1px',
                              }}
                            >
                              <span className="text-sm">{a!.icon}</span>
                              {a!.name}
                            </span>
                          ))}
                          <span className="w-px h-4 bg-[var(--border)] rounded-full self-center" />
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold shadow-sm',
                              editCustomXp != null
                                ? 'bg-gradient-to-b from-purple-500/20 to-purple-500/10 text-purple-500 ring-1 ring-inset ring-purple-400/25 shadow-purple-500/10'
                                : editDifficulty === 'easy'
                                ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-emerald-500/10'
                                : editDifficulty === 'medium'
                                ? 'bg-gradient-to-b from-blue-500/20 to-blue-500/10 text-blue-500 ring-1 ring-inset ring-blue-400/25 shadow-blue-500/10'
                                : editDifficulty === 'hard'
                                ? 'bg-gradient-to-b from-orange-500/20 to-orange-500/10 text-orange-500 ring-1 ring-inset ring-orange-400/25 shadow-orange-500/10'
                                : 'bg-gradient-to-b from-red-500/20 to-red-500/10 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-red-500/10'
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
                      <RewardBadge coins={editCoinReward} gems={editGemReward} />
                    ) : (
                      <span className="text-sm text-[var(--fg-muted)]">Не назначено</span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
                </button>
              </div>

              {/* Приоритет */}
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Приоритет</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['none', 'low', 'medium', 'high'] as const).map((p) => {
                    const priorityStyle = PRIORITY_COLORS[p]
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditPriority(p)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all',
                          editPriority === p
                            ? cn(
                                'border-2',
                                p === 'none' && 'bg-gray-500/10 text-gray-500 border-gray-500',
                                p === 'low' && 'bg-emerald-500/10 text-emerald-500 border-emerald-500',
                                p === 'medium' && 'bg-yellow-500/10 text-yellow-500 border-yellow-500',
                                p === 'high' && 'bg-red-500/10 text-red-500 border-red-500'
                              )
                            : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:border-[var(--accent)]/30'
                        )}
                      >
                        {p !== 'none' && <Flag className="h-4 w-4" />}
                        {p === 'none' && <X className="h-4 w-4" />}
                        <span className="text-xs">{PRIORITY_LABELS[p]}</span>
                      </button>
                    )
                  })}
                </div>
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
                            {editRecurrence === 'weekly' && editRecurrenceSettings.weeklyMode === 'timesPerWeek' && editRecurrenceSettings.weeklyTimesPerWeek
                              ? ` (${editRecurrenceSettings.weeklyTimesPerWeek} ${editRecurrenceSettings.weeklyTimesPerWeek === 1 ? 'раз' : editRecurrenceSettings.weeklyTimesPerWeek < 5 ? 'раза' : 'раз'}/нед)`
                              : editRecurrence === 'weekly' && editRecurrenceSettings.weeklyDays && editRecurrenceSettings.weeklyDays.length > 0 && editRecurrenceSettings.weeklyDays.length < 7
                              ? ` (${editRecurrenceSettings.weeklyDays.length} ${editRecurrenceSettings.weeklyDays.length === 1 ? 'день' : editRecurrenceSettings.weeklyDays.length < 5 ? 'дня' : 'дней'})`
                              : ''}
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
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--surface-elevated)]"
                    >
                      <span className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-[var(--accent)]" />
                        <div>
                          <p className="font-semibold text-[var(--fg)]">Счётчик</p>
                          <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                            {editCounterEnabled
                              ? `${editTarget} ${editCountUnit}`
                              : 'Выключен'}
                          </p>
                        </div>
                      </span>
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
                        editCounterEnabled ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
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
                              onClick={() => setEditTarget((n) => Math.max(2, n - 1))}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)] transition-all active:scale-90 text-sm font-medium"
                            >
                              −
                            </button>
                            <input
                              type="range"
                              min={2}
                              max={100}
                              value={Math.min(editTarget, 100)}
                              onChange={(e) => setEditTarget(Math.max(2, parseInt(e.target.value, 10)))}
                              className="target-slider flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => setEditTarget((n) => n + 1)}
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
                                onClick={() => setEditTarget(val)}
                                className={cn(
                                  'absolute top-0 text-[8px] leading-none font-medium transition-colors -translate-x-1/2',
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

                        {/* Unit of measurement */}
                        <div>
                          <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Единица</label>
                          <div className="flex gap-1.5">
                            {['раз', 'мин', 'км', 'стр', 'шт'].map((unit) => (
                              <button
                                key={unit}
                                type="button"
                                onClick={() => setEditCountUnit(unit)}
                                className={cn(
                                  'flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all active:scale-95',
                                  editCountUnit === unit
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
                            value={editCountUnit}
                            onChange={(e) => e.target.value.length <= 8 && setEditCountUnit(e.target.value)}
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
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[var(--accent)]/15 to-[var(--accent)]/5 text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/10">
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
                                  <span className={cn(
                                    'inline-flex items-center gap-1.5 rounded-xl px-2 py-0.5 text-xs font-semibold shadow-sm',
                                    (subtask.coinReward ?? 0) > 0 && (subtask.gemReward ?? 0) > 0
                                      ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-cyan-500/15 ring-1 ring-inset ring-amber-400/15 shadow-amber-500/5'
                                      : (subtask.gemReward ?? 0) > 0
                                      ? 'bg-gradient-to-b from-cyan-500/15 to-cyan-500/5 ring-1 ring-inset ring-cyan-400/20 shadow-cyan-500/10'
                                      : 'bg-gradient-to-b from-amber-500/15 to-amber-500/5 ring-1 ring-inset ring-amber-400/20 shadow-amber-500/10'
                                  )}>
                                    {(subtask.coinReward ?? 0) > 0 && (
                                      <>
                                        <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                        <span className="text-amber-600 dark:text-amber-400">{subtask.coinReward}</span>
                                      </>
                                    )}
                                    {(subtask.coinReward ?? 0) > 0 && (subtask.gemReward ?? 0) > 0 && (
                                      <span className="w-px h-3 bg-[var(--border)] rounded-full self-center" />
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
                                    'inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-xs font-semibold shadow-sm',
                                    subtask.customXp != null
                                      ? 'bg-gradient-to-b from-purple-500/20 to-purple-500/8 text-purple-500 ring-1 ring-inset ring-purple-400/25 shadow-purple-500/10'
                                      : subDiff === 'easy'
                                      ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/8 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-emerald-500/10'
                                      : subDiff === 'medium'
                                      ? 'bg-gradient-to-b from-blue-500/20 to-blue-500/8 text-blue-500 ring-1 ring-inset ring-blue-400/25 shadow-blue-500/10'
                                      : subDiff === 'hard'
                                      ? 'bg-gradient-to-b from-orange-500/20 to-orange-500/8 text-orange-500 ring-1 ring-inset ring-orange-400/25 shadow-orange-500/10'
                                      : 'bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-red-500/10'
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
                  onClick={() => resetEditState(task)}
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
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    task.isCompleted
                      ? 'bg-gradient-to-b from-emerald-400/20 to-emerald-600/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/15'
                      : 'bg-gradient-to-b from-[var(--accent)]/15 to-[var(--accent)]/5 text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/10'
                  )}>
                    {(() => { const KindIcon = KIND_ICON[task.kind]; return <KindIcon className="h-5 w-5" /> })()}
                  </div>
                  <h2 className={cn(
                    'text-xl font-bold text-[var(--fg)] break-words min-w-0',
                    task.isCompleted && 'opacity-70'
                  )}>
                    {task.title}
                  </h2>
                </div>
                {task.notes && (
                  <p className="text-[var(--fg-muted)] leading-relaxed break-words overflow-hidden">{task.notes}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {!task.canceledAt && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="icon-btn"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                )}
                {!task.canceledAt && (
                  <button
                    type="button"
                    onClick={handleArchive}
                    className="icon-btn"
                    title="Архивировать"
                  >
                    <Archive className="h-5 w-5" />
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
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {(() => {
                const badges: React.ReactNode[] = []

                // Тег архива
                if (task.canceledAt) {
                  const reason = task.archiveReason ?? 'manual'
                  const dateStr = new Date(task.canceledAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                  if (reason === 'completed') {
                    badges.push(
                      <span key="archive" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-500/20 to-emerald-500/8 px-3.5 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10">
                        <Award className="h-4 w-4" />Завершена — {dateStr}
                      </span>
                    )
                  } else if (reason === 'expired') {
                    badges.push(
                      <span key="archive" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-orange-500/20 to-orange-500/8 px-3.5 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 ring-1 ring-inset ring-orange-400/25 shadow-sm shadow-orange-500/10">
                        <AlertTriangle className="h-4 w-4" />Истёк срок — {dateStr}
                      </span>
                    )
                  } else if (reason === 'failed') {
                    badges.push(
                      <span key="archive" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-red-500/20 to-red-500/8 px-3.5 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10">
                        <XCircle className="h-4 w-4" />Провалена — {dateStr}
                      </span>
                    )
                  } else {
                    badges.push(
                      <span key="archive" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-gray-500/20 to-gray-500/8 px-3.5 py-1.5 text-sm font-medium text-gray-500 ring-1 ring-inset ring-gray-400/25 shadow-sm shadow-gray-500/10">
                        <Archive className="h-4 w-4" />Архив — {dateStr}
                      </span>
                    )
                  }
                }

                // Атрибуты
                taskAttrs.forEach((a) => {
                  if (!a) return
                  badges.push(
                    <span
                      key={a.id}
                      className="rounded-2xl px-3.5 py-1.5 text-sm font-medium shadow-sm"
                      style={{
                        background: `linear-gradient(to bottom, ${a.color}22, ${a.color}10)`,
                        color: a.color,
                        boxShadow: `0 1px 3px ${a.color}15, inset 0 1px 0 ${a.color}15`,
                        outline: `1px solid ${a.color}25`,
                        outlineOffset: '-1px',
                      }}
                    >
                      {a.icon} {a.name}
                    </span>
                  )
                })

                // Сложность (только если есть атрибуты)
                if (taskAttrs.length > 0) {
                  badges.push(
                    <span
                      key="difficulty"
                      className="rounded-2xl px-3.5 py-1.5 text-sm font-medium shadow-sm"
                      style={{
                        background: `linear-gradient(to bottom, ${diffColor}22, ${diffColor}10)`,
                        color: diffColor,
                        boxShadow: `0 1px 3px ${diffColor}15, inset 0 1px 0 ${diffColor}15`,
                        outline: `1px solid ${diffColor}25`,
                        outlineOffset: '-1px',
                      }}
                    >
                      <Zap className="h-3.5 w-3.5 inline mr-1" />
                      {DIFFICULTY_LABELS[task.difficulty]}
                    </span>
                  )
                }

                // Повтор
                if (task.recurrence !== 'once') {
                  badges.push(
                    <span key="recurrence" className="rounded-2xl bg-gradient-to-b from-blue-500/22 to-blue-500/8 px-3.5 py-1.5 text-sm font-medium text-blue-500 ring-1 ring-inset ring-blue-400/25 shadow-sm shadow-blue-500/10">
                      <Clock className="h-3.5 w-3.5 inline mr-1" />
                      {RECURRENCE_LABELS[task.recurrence]}
                      {task.recurrenceSettings && (
                        <>
                          {task.recurrenceSettings.type === 'weekly' && task.recurrenceSettings.weeklyMode === 'timesPerWeek' && task.recurrenceSettings.weeklyTimesPerWeek && (
                            <span className="ml-1 text-xs opacity-80">
                              ({task.recurrenceSettings.weeklyTimesPerWeek} {task.recurrenceSettings.weeklyTimesPerWeek === 1 ? 'раз' : task.recurrenceSettings.weeklyTimesPerWeek < 5 ? 'раза' : 'раз'}/нед)
                            </span>
                          )}
                          {task.recurrenceSettings.type === 'weekly' && (task.recurrenceSettings.weeklyMode ?? 'days') === 'days' && task.recurrenceSettings.weeklyDays && task.recurrenceSettings.weeklyDays.length > 0 && (
                            <span className="ml-1 text-xs opacity-80">
                              ({task.recurrenceSettings.weeklyDays.length} {task.recurrenceSettings.weeklyDays.length === 1 ? 'день' : task.recurrenceSettings.weeklyDays.length < 5 ? 'дня' : 'дней'})
                            </span>
                          )}
                          {task.recurrenceSettings.type === 'custom' && task.recurrenceSettings.customIntervalDays && (
                            <span className="ml-1 text-xs opacity-80">
                              (каждые {task.recurrenceSettings.customIntervalDays} {task.recurrenceSettings.customIntervalDays === 1 ? 'день' : task.recurrenceSettings.customIntervalDays < 5 ? 'дня' : 'дней'})
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  )
                }

                // Приоритет
                if (task.priority && task.priority !== 'none') {
                  badges.push(
                    <span
                      key="priority"
                      className={cn(
                        'rounded-2xl px-3.5 py-1.5 text-sm font-medium shadow-sm',
                        PRIORITY_COLORS[task.priority].text,
                        task.priority === 'low' && 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/8 ring-1 ring-inset ring-emerald-400/25 shadow-emerald-500/10',
                        task.priority === 'medium' && 'bg-gradient-to-b from-yellow-500/20 to-yellow-500/8 ring-1 ring-inset ring-yellow-400/25 shadow-yellow-500/10',
                        task.priority === 'high' && 'bg-gradient-to-b from-red-500/20 to-red-500/8 ring-1 ring-inset ring-red-400/25 shadow-red-500/10',
                      )}
                    >
                      <Flag className="h-3.5 w-3.5 inline mr-1" fill="currentColor" />
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  )
                }

                // Вставляем точки-разделители между группами: архив | атрибуты+сложность | повтор | приоритет
                const archiveCount = task.canceledAt ? 1 : 0
                const attrCount = taskAttrs.filter(Boolean).length + (taskAttrs.length > 0 ? 1 : 0) // attrs + difficulty
                const groups: React.ReactNode[][] = []
                if (archiveCount > 0) groups.push(badges.slice(0, archiveCount))
                if (attrCount > 0) groups.push(badges.slice(archiveCount, archiveCount + attrCount))
                const rest = badges.slice(archiveCount + attrCount)
                rest.forEach(b => groups.push([b]))

                return groups.flatMap((group, i) => (
                  i === 0
                    ? group
                    : [<span key={`dot-${i}`} className="w-px h-5 bg-[var(--border)] rounded-full self-center select-none" />, ...group]
                ))
              })()}
            </div>


            {/* Rewards card */}
            <div className="glass rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Награды</h3>
              <div className="flex flex-row gap-3">
                {/* XP reward - только если есть атрибуты */}
                {taskAttrIds.length > 0 && xp > 0 && (
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-2xl p-3 flex-1 min-w-0 shadow-sm",
                      isCustomXp && 'bg-gradient-to-b from-purple-500/15 to-purple-500/5 ring-1 ring-inset ring-purple-400/20 shadow-purple-500/10',
                      !isCustomXp && task.difficulty === 'easy' && 'bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 ring-1 ring-inset ring-emerald-400/20 shadow-emerald-500/10',
                      !isCustomXp && task.difficulty === 'medium' && 'bg-gradient-to-b from-blue-500/15 to-blue-500/5 ring-1 ring-inset ring-blue-400/20 shadow-blue-500/10',
                      !isCustomXp && task.difficulty === 'hard' && 'bg-gradient-to-b from-orange-500/15 to-orange-500/5 ring-1 ring-inset ring-orange-400/20 shadow-orange-500/10',
                      !isCustomXp && task.difficulty === 'veryHard' && 'bg-gradient-to-b from-red-500/15 to-red-500/5 ring-1 ring-inset ring-red-400/20 shadow-red-500/10'
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        isCustomXp && 'bg-gradient-to-b from-purple-500/25 to-purple-500/10 ring-1 ring-inset ring-purple-400/30',
                        !isCustomXp && task.difficulty === 'easy' && 'bg-gradient-to-b from-emerald-500/25 to-emerald-500/10 ring-1 ring-inset ring-emerald-400/30',
                        !isCustomXp && task.difficulty === 'medium' && 'bg-gradient-to-b from-blue-500/25 to-blue-500/10 ring-1 ring-inset ring-blue-400/30',
                        !isCustomXp && task.difficulty === 'hard' && 'bg-gradient-to-b from-orange-500/25 to-orange-500/10 ring-1 ring-inset ring-orange-400/30',
                        !isCustomXp && task.difficulty === 'veryHard' && 'bg-gradient-to-b from-red-500/25 to-red-500/10 ring-1 ring-inset ring-red-400/30'
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

                {/* Coins reward - только если больше 0 */}
                {coins > 0 && (
                  <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-b from-amber-500/15 to-amber-500/5 p-3 ring-1 ring-inset ring-amber-400/20 shadow-sm shadow-amber-500/10 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-amber-500/25 to-amber-500/10 ring-1 ring-inset ring-amber-400/30">
                      <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400">+{coins}</p>
                      <p className="text-xs text-[var(--fg-muted)]">Монет</p>
                    </div>
                  </div>
                )}

                {/* Gems reward */}
                {gems > 0 && (
                  <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-b from-cyan-500/15 to-cyan-500/5 p-3 ring-1 ring-inset ring-cyan-400/20 shadow-sm shadow-cyan-500/10 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-cyan-500/25 to-cyan-500/10 ring-1 ring-inset ring-cyan-400/30">
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
                        : 'bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10 hover:from-red-500/30 hover:to-red-500/15 hover:scale-110 active:scale-95'
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
                        : 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white ring-1 ring-inset ring-emerald-300/30 shadow-lg shadow-emerald-500/30 hover:scale-110 active:scale-95'
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
                    Подзадачи {!task.isCompleted && `(${task.subtasks.filter((s) => s.isCompleted).length}/${task.subtasks.length})`}
                  </h3>
                </div>

                {/* Progress bar — only for active tasks */}
                {!task.isCompleted && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)] mb-4">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${subtaskProgress * 100}%`,
                        background: 'linear-gradient(90deg, #10b981, #34d399)'
                      }}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
                  {task.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className={cn(
                        'group flex flex-col rounded-xl p-3 transition-all',
                        !task.isCompleted && subtask.isCompleted
                          ? 'bg-gradient-to-b from-emerald-500/12 to-emerald-500/4 ring-1 ring-inset ring-emerald-400/15'
                          : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {!task.isCompleted ? (
                          <button
                            type="button"
                            disabled={!isTodayScheduled(task, debugNow)}
                            onClick={() => {
                              if (!isTodayScheduled(task, debugNow)) return
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
                            className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all',
                              !isTodayScheduled(task, debugNow)
                                ? 'border-2 border-[var(--border)] opacity-40 cursor-not-allowed'
                                : subtask.isCompleted
                                ? 'bg-emerald-500 text-white'
                                : 'border-2 border-[var(--border)] hover:border-emerald-500'
                            )}
                          >
                            {subtask.isCompleted && <Check className="h-4 w-4" />}
                          </button>
                        ) : (
                          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--fg-muted)]" />
                        )}
                        <span className={cn(
                          'flex-1 min-w-0 text-sm',
                          !task.isCompleted && subtask.isCompleted && 'text-[var(--fg-muted)]'
                        )}>
                          {subtask.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {((subtask.coinReward ?? 0) > 0 || (subtask.gemReward ?? 0) > 0) && (
                            <span className={cn(
                              'inline-flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-semibold shadow-sm',
                              (subtask.coinReward ?? 0) > 0 && (subtask.gemReward ?? 0) > 0
                                ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-cyan-500/15 ring-1 ring-inset ring-amber-400/15 shadow-amber-500/5'
                                : (subtask.gemReward ?? 0) > 0
                                ? 'bg-gradient-to-b from-cyan-500/15 to-cyan-500/5 ring-1 ring-inset ring-cyan-400/20 shadow-cyan-500/10'
                                : 'bg-gradient-to-b from-amber-500/15 to-amber-500/5 ring-1 ring-inset ring-amber-400/20 shadow-amber-500/10'
                            )}>
                              {(subtask.coinReward ?? 0) > 0 && (
                                <>
                                  <Coins className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                  <span className="text-amber-600 dark:text-amber-400">{subtask.coinReward}</span>
                                </>
                              )}
                              {(subtask.coinReward ?? 0) > 0 && (subtask.gemReward ?? 0) > 0 && (
                                <span className="w-px h-3 bg-[var(--border)] rounded-full self-center" />
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
                                  'inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold shadow-sm',
                                  subtask.customXp != null
                                    ? 'bg-gradient-to-b from-purple-500/20 to-purple-500/8 text-purple-500 ring-1 ring-inset ring-purple-400/25 shadow-purple-500/10'
                                    : subDiff === 'easy'
                                    ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/8 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-emerald-500/10'
                                    : subDiff === 'medium'
                                    ? 'bg-gradient-to-b from-blue-500/20 to-blue-500/8 text-blue-500 ring-1 ring-inset ring-blue-400/25 shadow-blue-500/10'
                                    : subDiff === 'hard'
                                    ? 'bg-gradient-to-b from-orange-500/20 to-orange-500/8 text-orange-500 ring-1 ring-inset ring-orange-400/25 shadow-orange-500/10'
                                    : 'bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-red-500/10'
                                )}
                              >
                                <Zap className="h-3.5 w-3.5" />{subXpVal} XP
                              </span>
                            )
                          })()}
                        </div>
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

        {/* Cycle, Stats, History blocks */}
        {!isEditing && (
          <div className="mt-2">
            {(task.recurrence !== 'once' || (task.recurrenceSettings?.endMode === 'byDate' && task.recurrenceSettings.endDate)) && (
              <TaskCurrentCycleBlock task={task} nowMs={debugNow} />
            )}
            {task.recurrence !== 'once' && <TaskStatsBlock task={task} />}
            <TaskHistoryBlock task={task} nowMs={debugNow} />
          </div>
        )}
      </div>

      {/* Action buttons - fixed at bottom */}
      {!isEditing && !task.canceledAt && (
        <div className="mt-4 shrink-0">
          {!task.isCompleted && (
            <div className="flex gap-2">
              {/* Main complete button */}
              <button
                type="button"
                onClick={handleComplete}
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

              {/* Skip button (smaller) */}
              <button
                type="button"
                onClick={handleSkip}
                disabled={!canComplete}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-2xl px-3 md:px-4 py-4 font-medium text-sm transition-all duration-200 min-w-[48px]',
                  canComplete
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-[var(--surface)] text-[var(--fg-muted)] cursor-not-allowed opacity-50'
                )}
                title="Пропустить (отметить как выполненное без наград)"
              >
                <SkipForward className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Пропустить</span>
              </button>

            </div>
          )}
          {task.isCompleted && (() => {
            const nextDate = getNextAvailableDate(task, debugNow)
            return (
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-b from-blue-500/18 to-blue-500/6 ring-1 ring-inset ring-blue-400/20 shadow-sm shadow-blue-500/10 py-4 text-blue-500">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  <span className="font-semibold">Выполнено за цикл!</span>
                </div>
                {nextDate != null && (
                  <span className="text-xs text-blue-400">
                    Следующий цикл: {getRelativeTimeRu(nextDate, debugNow).toLowerCase()}
                  </span>
                )}
              </div>
            )
          })()}
          {!canComplete && !task.isCompleted && task.recurrenceSettings?.endMode === 'byDate' && task.recurrenceSettings.endDate && debugNow >= task.recurrenceSettings.endDate && (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-500/18 to-red-500/6 ring-1 ring-inset ring-red-400/20 shadow-sm shadow-red-500/10 py-4 text-red-500">
              <Clock className="h-5 w-5" />
              <span className="font-semibold">Крайний срок истёк</span>
            </div>
          )}
        </div>
      )}

      {/* Status bar for archived tasks */}
      {!isEditing && task.canceledAt && (
        <div className="mt-4 shrink-0">
          {(() => {
            const reason = task.archiveReason ?? 'manual'
            if (reason === 'completed') {
              return (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-500/18 to-emerald-500/6 ring-1 ring-inset ring-emerald-400/20 shadow-sm shadow-emerald-500/10 py-4 text-emerald-500">
                  <Award className="h-5 w-5" />
                  <span className="font-semibold">Задача завершена!</span>
                </div>
              )
            }
            if (reason === 'expired') {
              const done = task.recurrenceSettings?.completedCount ?? 0
              const total = task.recurrenceSettings?.endCount
              return (
                <div className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-b from-orange-500/18 to-orange-500/6 ring-1 ring-inset ring-orange-400/20 shadow-sm shadow-orange-500/10 py-4 text-orange-500">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold">Срок истёк</span>
                  </div>
                  {total && (
                    <span className="text-xs text-orange-400">
                      Выполнено {done} из {total} циклов
                    </span>
                  )}
                </div>
              )
            }
            if (reason === 'failed') {
              return (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-500/18 to-red-500/6 ring-1 ring-inset ring-red-400/20 shadow-sm shadow-red-500/10 py-4 text-red-500">
                  <XCircle className="h-5 w-5" />
                  <span className="font-semibold">Задача провалена</span>
                </div>
              )
            }
            return (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-gray-500/18 to-gray-500/6 ring-1 ring-inset ring-gray-400/20 shadow-sm shadow-gray-500/10 py-4 text-gray-500">
                <Archive className="h-5 w-5" />
                <span className="font-semibold">Задача архивирована</span>
              </div>
            )
          })()}
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
        settings={editRecurrenceSettings}
        onSave={handleRecurrenceSettingsChange}
        onClose={() => setShowRecurrenceModal(false)}
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
      <ConfirmModal
        isOpen={showDeleteSubtaskConfirm}
        onConfirm={confirmDeleteSubtask}
        onCancel={() => {
          setShowDeleteSubtaskConfirm(false)
          setSubtaskToDelete(null)
        }}
        title="Удалить подзадачу?"
        message="Подзадача будет удалена безвозвратно."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
      <ConfirmModal
        isOpen={showSkipConfirm}
        onConfirm={confirmSkip}
        onCancel={() => setShowSkipConfirm(false)}
        title="Пропустить задачу?"
        message="Задача будет отмечена как выполненная, но вы не получите награды."
        confirmText="Пропустить"
        cancelText="Отмена"
        variant="warning"
      />
      <ConfirmModal
        isOpen={showArchiveConfirm}
        onConfirm={confirmArchive}
        onCancel={() => setShowArchiveConfirm(false)}
        title="Архивировать задачу?"
        message="Задача будет перемещена в раздел «Архив»."
        confirmText="Архивировать"
        cancelText="Отмена"
        variant="warning"
      />
    </div>
  )
}
