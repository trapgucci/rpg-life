import { useState } from 'react'
import { 
  Check, SkipForward, XCircle, Pencil, Coins, Zap, Trash2, X,
  Plus, Minus, Square, CheckSquare2, AlertTriangle, Clock, Award
} from 'lucide-react'
import { cn } from '../lib/cn'
import type { TaskRpg, TaskDifficulty, TaskRecurrence, AttributeId, SubtaskItem } from '../types/domain'
import { useRpgStore } from '../store/useRpgStore'

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
  const getTaskPenaltyPreview = useRpgStore((s) => s.getTaskPenaltyPreview)
  const completeTask = useRpgStore((s) => s.completeTask)
  const canCompleteTask = useRpgStore((s) => s.canCompleteTask)
  const skipTask = useRpgStore((s) => s.skipTask)
  const abandonTask = useRpgStore((s) => s.abandonTask)
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
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  const profile = profiles.find((p) => p.id === activeProfileId)
  const attributes = profile?.attributes ?? []
  const attr = task.attributeId
    ? attributes.find((a) => a.id === task.attributeId)
    : null
  const { xp, coins } = getTaskRewardPreview(task)
  const penalty = getTaskPenaltyPreview(task)

  const canComplete = canCompleteTask(task)
  const deadlineAt = task.deadlineAt ?? null
  const isPastDeadline = deadlineAt != null && Date.now() > deadlineAt
  const diffColor = DIFFICULTY_COLORS[task.difficulty]

  const progress =
    task.kind === 'counter'
      ? Math.min(1, task.target > 0 ? task.current / task.target : 0)
      : task.kind === 'nested'
        ? task.subtasks.length
          ? task.subtasks.filter((s) => s.isCompleted).length / task.subtasks.length
          : 0
        : task.isCompleted ? 1 : 0

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return
    updateTask(task.id, (t) => ({
      ...t,
      title: editTitle.trim(),
      notes: editNotes.trim() || undefined,
    }))
    setIsEditing(false)
  }

  const handleDelete = () => {
    if (confirm('Удалить задачу?')) {
      deleteTask(task.id)
      onDeselect?.()
    }
  }

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim() || task.kind !== 'nested') return
    const newSubtask: SubtaskItem = {
      id: crypto.randomUUID(),
      title: newSubtaskTitle.trim(),
      isCompleted: false,
    }
    updateTask(task.id, (t) => {
      if (t.kind !== 'nested') return t
      return { ...t, subtasks: [...t.subtasks, newSubtask] }
    })
    setNewSubtaskTitle('')
  }

  const handleRemoveSubtask = (subtaskId: string) => {
    if (task.kind !== 'nested') return
    updateTask(task.id, (t) => {
      if (t.kind !== 'nested') return t
      return { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) }
    })
  }

  return (
    <div className="glass-card flex h-full flex-col rounded-2xl p-6">
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="btn-primary"
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={() => { setIsEditing(false); setEditTitle(task.title); setEditNotes(task.notes ?? '') }}
                className="btn-secondary"
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
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
            <div className="flex gap-1">
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
        {attr && (
          <span
            className="rounded-xl px-3 py-1.5 text-sm font-medium"
            style={{ backgroundColor: `${attr.color}15`, color: attr.color }}
          >
            {attr.icon} {attr.name}
          </span>
        )}
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
        {penalty.xp > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 p-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-500">
              Штраф за пропуск/отказ: −{penalty.xp} XP
            </span>
          </div>
        )}
      </div>

      {/* Counter controls */}
      {task.kind === 'counter' && (
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
              disabled={task.isCompleted}
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200',
                task.isCompleted
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
                width: `${progress * 100}%`,
                background: 'linear-gradient(90deg, #10b981, #34d399)'
              }}
            />
          </div>

          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
            {task.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl p-3 transition-all',
                  subtask.isCompleted 
                    ? 'bg-emerald-500/10' 
                    : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]'
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleSubtask(task.id, subtask.id)}
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
                  'flex-1 text-sm',
                  subtask.isCompleted && 'line-through text-[var(--fg-muted)]'
                )}>
                  {subtask.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSubtask(subtask.id)}
                  className="icon-btn icon-btn-danger opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add subtask */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
              placeholder="Новая подзадача..."
              className="input flex-1 text-sm"
            />
            <button
              type="button"
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
              className="btn-primary px-3"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-auto flex gap-3">
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
          <>
            <button
              type="button"
              onClick={() => skipTask(task.id)}
              className="btn-secondary flex items-center gap-2"
            >
              <SkipForward className="h-4 w-4" />
              Пропустить
            </button>
            <button
              type="button"
              onClick={() => abandonTask(task.id)}
              className="btn-secondary flex items-center gap-2 text-red-500 hover:bg-red-500/10"
            >
              <XCircle className="h-4 w-4" />
              Отказаться
            </button>
          </>
        )}
        {task.isCompleted && (
          <div className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 py-4 text-emerald-500">
            <Award className="h-5 w-5" />
            <span className="font-semibold">Задача выполнена!</span>
          </div>
        )}
        {!canComplete && !task.isCompleted && isPastDeadline && (
          <div className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 py-4 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Дедлайн истёк — завершить задачу нельзя</span>
          </div>
        )}
      </div>
    </div>
  )
}
