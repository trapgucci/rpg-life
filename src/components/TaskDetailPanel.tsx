import { useState } from 'react'
import {
  Check, SkipForward, Pencil, Coins, Zap, Trash2, X,
  Plus, Minus, Clock, Award, ChevronRight, BarChart3, Gift, Folder
} from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRpg, TaskDifficulty, TaskRecurrence, AttributeId, SubtaskItem, TaskGroupId } from '../types/domain'
import { useRpgStore } from '../store/useRpgStore'
import TaskGroupSelectModal from './TaskGroupSelectModal'
import TaskAttributeSelectModal from './TaskAttributeSelectModal'
import TaskRewardsModal from './TaskRewardsModal'
import SubtaskCreateModal from './SubtaskCreateModal'

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
  const [editGemReward, setEditGemReward] = useState(0)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showAttributeModal, setShowAttributeModal] = useState(false)
  const [showRewardsModal, setShowRewardsModal] = useState(false)
  const [showSubtaskModal, setShowSubtaskModal] = useState(false)
  const [rewardFeedback, setRewardFeedback] = useState<{ subtaskId: string; coins: number; xp: number } | null>(null)

  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []
  const taskAttrIds = task.attributeIds?.length ? task.attributeIds : (task.attributeId ? [task.attributeId] : [])
  const taskAttrs = taskAttrIds.map((id) => attributes.find((a) => a.id === id)).filter(Boolean)
  const { xp, coins } = getTaskRewardPreview(task)

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

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return
    updateTask(task.id, (t) => ({
      ...t,
      title: editTitle.trim(),
      notes: editNotes.trim() || undefined,
      groupId: editGroupId,
      attributeIds: editAttributeIds,
      customXp: editCustomXp,
      difficulty: editDifficulty,
      coinReward: editCoinReward,
    }))
    setIsEditing(false)
  }

  const getTaskGroups = useRpgStore((s) => s.getTaskGroups)
  const settings = useRpgStore((s) => s.settings)

  const handleDelete = () => {
    if (confirm('Удалить задачу?')) {
      deleteTask(task.id)
      onDeselect?.()
    }
  }

  const handleAddSubtask = (sub: { title: string; description: string; coinReward: number; xpReward: number }) => {
    if (task.kind !== 'nested') return
    const newSubtask: SubtaskItem = {
      id: crypto.randomUUID(),
      title: sub.title,
      description: sub.description.trim() || undefined,
      isCompleted: false,
      coinReward: sub.coinReward > 0 ? sub.coinReward : undefined,
      xpReward: sub.xpReward > 0 ? sub.xpReward : undefined,
    }
    updateTask(task.id, (t) => {
      if (t.kind !== 'nested') return t
      return { ...t, subtasks: [...t.subtasks, newSubtask] }
    })
  }

  const handleRemoveSubtask = (subtaskId: string) => {
    if (task.kind !== 'nested') return
    updateTask(task.id, (t) => {
      if (t.kind !== 'nested') return t
      return { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) }
    })
  }

  const editAttrNames = editAttributeIds.map((id) => attributes.find((a) => a.id === id)).filter(Boolean)
  const editEffectiveXp = editCustomXp ?? (settings.taskDifficultyXp?.[editDifficulty] ?? 0)

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
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--surface)] px-4 py-2 text-left transition-colors hover:bg-[var(--surface-elevated)]"
                >
                  <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
                  <div className="flex-1">
                    <p className="text-sm">
                      {editAttrNames.length > 0
                        ? editAttrNames.map((a) => `${a!.icon} ${a!.name}`).join(', ')
                        : 'Без атрибута'}
                    </p>
                    <p className="text-xs text-[var(--fg-muted)]">
                      {editEffectiveXp} XP
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
                </button>
              </div>

              {/* Вознаграждения */}
              <div>
                <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Вознаграждения</label>
                <button
                  type="button"
                  onClick={() => setShowRewardsModal(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--surface)] px-4 py-2 text-left transition-colors hover:bg-[var(--surface-elevated)]"
                >
                  <Gift className="h-4 w-4 text-[var(--accent)]" />
                  <span className="flex-1 text-sm">
                    {editCoinReward > 0 && `🪙 ${editCoinReward}`}
                    {editCoinReward > 0 && editGemReward > 0 && ' • '}
                    {editGemReward > 0 && `💎 ${editGemReward}`}
                    {editCoinReward === 0 && editGemReward === 0 && 'Не назначено'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--fg-muted)]" />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
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
                    setEditGemReward(0)
                  }}
                  className="btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {task.isCompleted && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shrink-0">
                      <Check className="h-5 w-5" />
                    </div>
                  )}
                  <h2 className={cn(
                    'text-xl font-bold text-[var(--fg)]',
                    task.isCompleted && 'line-through opacity-60'
                  )}>
                    {task.title}
                  </h2>
                </div>
                {task.notes && (
                  <p className="text-[var(--fg-muted)] leading-relaxed">{task.notes}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="icon-btn"
                >
                  <Pencil className="h-5 w-5" />
                </button>
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
              <span
                className="rounded-xl px-3 py-1.5 text-sm font-medium"
                style={{ backgroundColor: `${diffColor}15`, color: diffColor }}
              >
                {DIFFICULTY_LABELS[task.difficulty]}
              </span>
              <span className="rounded-xl bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--fg-muted)]">
                <Clock className="h-3.5 w-3.5 inline mr-1" />
                {RECURRENCE_LABELS[task.recurrence]}
              </span>
              {taskAttrs.map((a) => a && (
                <span
                  key={a.id}
                  className="rounded-xl px-3 py-1.5 text-sm font-medium"
                  style={{ backgroundColor: `${a.color}15`, color: a.color }}
                >
                  {a.icon} {a.name}
                </span>
              ))}
              {deadlineAt != null && (
                <span className={cn(
                  'rounded-xl px-3 py-1.5 text-sm font-medium',
                  isPastDeadline ? 'bg-red-500/10 text-red-500' : 'bg-[var(--surface)] text-[var(--fg-muted)]'
                )}>
                  <Clock className="h-3.5 w-3.5 inline mr-1" />
                  Дедлайн: {new Date(deadlineAt).toLocaleString('ru-RU')}
                  {isPastDeadline && ' — завершить нельзя'}
                </span>
              )}
            </div>

            {/* Rewards card */}
            <div className="glass rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Награды</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-xl bg-purple-500/10 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                    <Zap className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-purple-500">+{xp}</p>
                    <p className="text-xs text-[var(--fg-muted)]">XP опыта</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                    <Coins className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">+{coins}</p>
                    <p className="text-xs text-[var(--fg-muted)]">Монет</p>
                  </div>
                </div>
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
                    className="flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:scale-110 active:scale-95"
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
                            if (!subtask.isCompleted) {
                              const cr = subtask.coinReward ?? 0
                              const xr = subtask.xpReward ?? 0
                              if (cr > 0 || xr > 0) {
                                setRewardFeedback({ subtaskId: subtask.id, coins: cr, xp: xr })
                                setTimeout(() => setRewardFeedback(null), 1500)
                              }
                            }
                            toggleSubtask(task.id, subtask.id)
                          }}
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all',
                            subtask.isCompleted
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
                          {(subtask.xpReward ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-500">
                              <Zap className="h-2.5 w-2.5" />{subtask.xpReward}
                            </span>
                          )}
                          {(subtask.coinReward ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              <Coins className="h-2.5 w-2.5" />{subtask.coinReward}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(subtask.id)}
                          className="icon-btn icon-btn-danger opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
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
                <button
                  type="button"
                  onClick={() => setShowSubtaskModal(true)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent-subtle)] hover:border-[var(--accent)]"
                >
                  <Plus className="h-4 w-4" />
                  Добавить подзадачу
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons - fixed at bottom */}
      {!isEditing && (
        <div className="mt-4 flex gap-3 shrink-0">
          {canComplete && (
            <button
              type="button"
              onClick={() => completeTask(task.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white transition-all duration-200',
                'bg-gradient-to-r from-emerald-500 to-green-600',
                'shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40',
                'hover:scale-[1.02] active:scale-[0.98]'
              )}
            >
              <Check className="h-5 w-5" />
              Выполнить
            </button>
          )}
          {canComplete && (
            <button
              type="button"
              onClick={() => skipTask(task.id)}
              className="btn-secondary flex items-center gap-2"
            >
              <SkipForward className="h-4 w-4" />
              Пропустить
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
        onAdd={handleAddSubtask}
        onClose={() => setShowSubtaskModal(false)}
      />
    </div>
  )
}
