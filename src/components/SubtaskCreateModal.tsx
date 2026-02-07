import { useState, useLayoutEffect, useEffect } from 'react'
import { X, Plus, Save, Zap, Coins } from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import { TASK_XP_BY_DIFFICULTY } from '../types/domain'
import type { TaskDifficulty } from '../types/domain'

const DIFFICULTY_OPTIONS: { value: TaskDifficulty; label: string; defaultXp: number }[] = [
  { value: 'easy', label: 'Легко', defaultXp: 10 },
  { value: 'medium', label: 'Средне', defaultXp: 30 },
  { value: 'hard', label: 'Сложно', defaultXp: 100 },
  { value: 'veryHard', label: 'Импосибл', defaultXp: 300 },
]

export interface SubtaskFormData {
  title: string
  description: string
  coinReward: number
  difficulty: TaskDifficulty
  customXp: number | null
}

export interface SubtaskEditData {
  id: string
  title: string
  description: string
  coinReward: number
  difficulty?: TaskDifficulty
  customXp?: number | null
  /** @deprecated Обратная совместимость — используйте difficulty + customXp */
  xpReward?: number
}

interface SubtaskCreateModalProps {
  isOpen: boolean
  editingSubtask?: SubtaskEditData | null
  onAdd: (subtask: SubtaskFormData) => void
  onEdit?: (subtask: SubtaskEditData) => void
  onClose: () => void
}

export default function SubtaskCreateModal({ isOpen, editingSubtask, onAdd, onEdit, onClose }: SubtaskCreateModalProps) {
  const [animatedOpen, setAnimatedOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coinReward, setCoinReward] = useState(0)
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('medium')
  const [customXp, setCustomXp] = useState<number | null>(null)
  const settings = useRpgStore((s) => s.settings)
  const difficultyXp = settings.taskDifficultyXp?.[difficulty] ?? TASK_XP_BY_DIFFICULTY[difficulty]
  const effectiveXp = customXp ?? difficultyXp

  const getInitialDifficultyAndXp = (editing: SubtaskEditData | undefined) => {
    if (!editing) return { difficulty: 'medium' as TaskDifficulty, customXp: null as number | null }
    if (editing.difficulty != null || editing.customXp != null)
      return { difficulty: editing.difficulty ?? 'medium', customXp: editing.customXp ?? null }
    const xp = (editing as { xpReward?: number }).xpReward ?? 0
    const match = DIFFICULTY_OPTIONS.find((o) => (settings.taskDifficultyXp?.[o.value] ?? o.defaultXp) === xp)
    if (match) return { difficulty: match.value, customXp: null }
    return { difficulty: 'medium' as TaskDifficulty, customXp: xp > 0 ? xp : null }
  }

  // Загрузка данных при редактировании
  useEffect(() => {
    if (isOpen && editingSubtask) {
      setTitle(editingSubtask.title)
      setDescription(editingSubtask.description)
      setCoinReward(editingSubtask.coinReward)
      const { difficulty: d, customXp: x } = getInitialDifficultyAndXp(editingSubtask)
      setDifficulty(d)
      setCustomXp(x)
    } else if (isOpen && !editingSubtask) {
      setTitle('')
      setDescription('')
      setCoinReward(0)
      setDifficulty('medium')
      setCustomXp(null)
    }
  }, [isOpen, editingSubtask])

  useLayoutEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => setAnimatedOpen(true))
      return () => cancelAnimationFrame(id)
    }
    setAnimatedOpen(false)
  }, [isOpen])

  useEffect(() => {
    if (!animatedOpen && isOpen) {
      const t = setTimeout(onClose, 300)
      return () => clearTimeout(t)
    }
  }, [animatedOpen, isOpen, onClose])

  const handleClose = () => setAnimatedOpen(false)

  const handleSubmit = () => {
    if (!title.trim()) return
    const data = { title: title.trim(), description, coinReward, difficulty, customXp }
    if (editingSubtask && onEdit) {
      onEdit({ id: editingSubtask.id, ...data })
    } else {
      onAdd(data)
    }
    setTitle('')
    setDescription('')
    setCoinReward(0)
    setDifficulty('medium')
    setCustomXp(null)
    handleClose()
  }

  if (!isOpen) return null

  return (
    <>
      <div
        role="presentation"
        onClick={handleClose}
        className={cn(
          'fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          animatedOpen ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Добавить подзадачу"
        className={cn(
          'fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none'
        )}
      >
        <div
          className={cn(
            'pointer-events-auto w-full max-w-md rounded-2xl bg-white dark:bg-[var(--surface-overlay)] shadow-2xl transition-all duration-300 ease-out',
            animatedOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
          )}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--fg)]">
              {editingSubtask ? 'Редактировать подзадачу' : 'Новая подзадача'}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="icon-btn h-9 w-9 shrink-0 rounded-full p-0 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Название</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Название подзадачи"
                className="input w-full"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание (опционально)"
                rows={2}
                className="input w-full resize-none"
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-[var(--fg-muted)] mb-1.5">
                  🪙 Монеты
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCoinReward((v) => Math.max(0, v - 5))}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={coinReward}
                    onChange={(e) => setCoinReward(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="input flex-1 h-10 text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setCoinReward((v) => v + 5)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
              {/* Сложность — как в «Атрибуты и сложность» */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--fg)] mb-2">Сложность</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {DIFFICULTY_OPTIONS.map((opt) => {
                    const optXp = settings.taskDifficultyXp?.[opt.value] ?? opt.defaultXp
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setDifficulty(opt.value)
                          setCustomXp(null)
                        }}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-all',
                          difficulty === opt.value
                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10'
                            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                        )}
                      >
                        <span className="text-xs font-semibold text-[var(--fg)]">{opt.label}</span>
                        <div className="flex items-center gap-0.5 rounded-lg bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-500">
                          <Zap className="h-2.5 w-2.5" />
                          {optXp} XP
                        </div>
                      </button>
                    )
                  })}
                </div>
                {/* Свой XP */}
                <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                  <label className="block text-[11px] font-medium text-[var(--fg-muted)] mb-1.5">
                    Свой XP (переопределить сложность)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomXp(Math.max(0, (customXp ?? difficultyXp) - 10))}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={customXp ?? ''}
                      placeholder={String(difficultyXp)}
                      onChange={(e) => {
                        const val = e.target.value.trim()
                        if (val === '') setCustomXp(null)
                        else setCustomXp(Math.max(0, parseInt(val, 10) || 0))
                      }}
                      className="input flex-1 text-center h-8 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomXp((customXp ?? difficultyXp) + 10)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-sm text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                    >
                      +
                    </button>
                  </div>
                  {customXp != null && (
                    <button
                      type="button"
                      onClick={() => setCustomXp(null)}
                      className="mt-1.5 text-[10px] text-[var(--accent)] hover:underline"
                    >
                      Сбросить к значению сложности ({difficultyXp} XP)
                    </button>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-2">
                  <Zap className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-sm font-semibold text-purple-500">{effectiveXp} XP</span>
                </div>
              </div>
              <p className="text-[11px] text-[var(--fg-muted)]">
                XP подзадачи начисляются в атрибуты основной задачи
              </p>
            </div>
          </div>
          <div className="px-5 pb-5 flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {editingSubtask ? (
                <>
                  <Save className="h-4 w-4" />
                  Сохранить
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Добавить
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary flex-1"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
