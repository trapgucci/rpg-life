import { useState, useEffect } from 'react'
import { Plus, Save, Zap } from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import { TASK_XP_BY_DIFFICULTY } from '../types/domain'
import type { TaskDifficulty } from '../types/domain'
import Modal from './Modal'

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
  gemReward?: number
  difficulty: TaskDifficulty
  customXp: number | null
}

export interface SubtaskEditData {
  id: string
  title: string
  description: string
  coinReward: number
  gemReward?: number
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
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coinReward, setCoinReward] = useState(0)
  const [gemReward, setGemReward] = useState(0)
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
      setGemReward(editingSubtask.gemReward ?? 0)
      const { difficulty: d, customXp: x } = getInitialDifficultyAndXp(editingSubtask)
      setDifficulty(d)
      setCustomXp(x)
    } else if (isOpen && !editingSubtask) {
      setTitle('')
      setDescription('')
      setCoinReward(0)
      setGemReward(0)
      setDifficulty('medium')
      setCustomXp(null)
    }
  }, [isOpen, editingSubtask])

  const handleSubmit = () => {
    if (!title.trim()) return
    const data = { title: title.trim(), description, coinReward, gemReward, difficulty, customXp }
    if (editingSubtask && onEdit) {
      onEdit({ id: editingSubtask.id, ...data })
    } else {
      onAdd(data)
    }
    setTitle('')
    setDescription('')
    setCoinReward(0)
    setGemReward(0)
    setDifficulty('medium')
    setCustomXp(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={editingSubtask ? 'Редактировать подзадачу' : 'Новая подзадача'}
      showCloseButton
      closeOnBackdropClick
      closeOnEscape
    >
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
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-[var(--fg-muted)] mb-1.5">
              💎 Кристаллы
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGemReward((v) => Math.max(0, v - 1))}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
              >
                −
              </button>
              <input
                type="number"
                min={0}
                value={gemReward}
                onChange={(e) => setGemReward(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="input flex-1 h-10 text-center"
              />
              <button
                type="button"
                onClick={() => setGemReward((v) => v + 1)}
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
          onClick={onClose}
          className="btn-secondary flex-1"
        >
          Отмена
        </button>
      </div>
    </Modal>
  )
}
