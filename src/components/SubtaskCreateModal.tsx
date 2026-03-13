import { useState, useEffect } from 'react'
import { Plus, Save, Zap, Coins, Gem, Minus } from 'lucide-react'
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

const DIFFICULTY_STYLE: Record<TaskDifficulty, { text: string; bg: string; border: string; shadow: string; glow: string }> = {
  easy: { text: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', shadow: 'shadow-emerald-500/10', glow: 'rgba(16, 185, 129, 0.35)' },
  medium: { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', shadow: 'shadow-blue-500/10', glow: 'rgba(59, 130, 246, 0.35)' },
  hard: { text: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', shadow: 'shadow-orange-500/10', glow: 'rgba(249, 115, 22, 0.35)' },
  veryHard: { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', shadow: 'shadow-red-500/10', glow: 'rgba(239, 68, 68, 0.35)' },
}

const CUSTOM_XP_STYLE = { text: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30', glow: 'rgba(168, 85, 247, 0.35)' }

export interface SubtaskFormData {
  title: string
  description: string
  coinReward: number
  gemReward?: number
  difficulty: TaskDifficulty | null
  customXp: number | null
}

export interface SubtaskEditData {
  id: string
  title: string
  description: string
  coinReward: number
  gemReward?: number
  difficulty?: TaskDifficulty | null
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
  const [difficulty, setDifficulty] = useState<TaskDifficulty | null>(null)
  const [customXp, setCustomXp] = useState<number | null>(null)
  const settings = useRpgStore((s) => s.settings)
  const difficultyXp = difficulty != null ? (settings.taskDifficultyXp?.[difficulty] ?? TASK_XP_BY_DIFFICULTY[difficulty]) : 0
  const effectiveXp = customXp ?? difficultyXp

  const getInitialDifficultyAndXp = (editing: SubtaskEditData | undefined) => {
    if (!editing) return { difficulty: null as TaskDifficulty | null, customXp: null as number | null }
    if (editing.difficulty !== undefined || editing.customXp != null)
      return { difficulty: editing.difficulty ?? null, customXp: editing.customXp ?? null }
    const xp = (editing as { xpReward?: number }).xpReward ?? 0
    if (xp === 0) return { difficulty: null as TaskDifficulty | null, customXp: null as number | null }
    const match = DIFFICULTY_OPTIONS.find((o) => (settings.taskDifficultyXp?.[o.value] ?? o.defaultXp) === xp)
    if (match) return { difficulty: match.value as TaskDifficulty | null, customXp: null as number | null }
    return { difficulty: 'medium' as TaskDifficulty | null, customXp: xp > 0 ? xp : null }
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
      setDifficulty(null)
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
          {/* Монеты — стиль как в TaskRewardsModal */}
          <div className={cn(
            'rounded-xl border p-3.5 transition-all',
            coinReward > 0
              ? 'border-amber-400/40 bg-gradient-to-r from-amber-500/5 to-amber-400/10'
              : 'border-[var(--border)] bg-[var(--surface)]'
          )}>
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                coinReward > 0 ? 'bg-amber-500/20' : 'bg-[var(--surface-elevated)]'
              )}>
                <Coins className={cn(
                  'h-4 w-4 transition-colors',
                  coinReward > 0 ? 'text-amber-500' : 'text-[var(--fg-muted)]'
                )} />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-[var(--fg)]">Монеты</span>
              </div>
              {coinReward > 0 && (
                <span className="text-xs font-bold text-amber-500 bg-amber-500/10 rounded-md px-2 py-0.5">
                  +{coinReward}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCoinReward((v) => Math.max(0, v - 5))}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all active:scale-90',
                  coinReward > 0
                    ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                    : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)] hover:bg-[var(--surface-overlay)]'
                )}
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min={0}
                value={coinReward || ''}
                onChange={(e) => setCoinReward(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="input flex-1 text-center h-10 font-semibold"
              />
              <button
                type="button"
                onClick={() => setCoinReward((v) => v + 5)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 transition-all active:scale-90"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Кристаллы — стиль как в TaskRewardsModal */}
          <div className={cn(
            'rounded-xl border p-3.5 transition-all',
            gemReward > 0
              ? 'border-cyan-400/40 bg-gradient-to-r from-cyan-500/5 to-cyan-400/10'
              : 'border-[var(--border)] bg-[var(--surface)]'
          )}>
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                gemReward > 0 ? 'bg-cyan-500/20' : 'bg-[var(--surface-elevated)]'
              )}>
                <Gem className={cn(
                  'h-4 w-4 transition-colors',
                  gemReward > 0 ? 'text-cyan-500' : 'text-[var(--fg-muted)]'
                )} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-[var(--fg)]">Кристаллы</span>
              </div>
              {gemReward > 0 && (
                <span className="text-xs font-bold text-cyan-500 bg-cyan-500/10 rounded-md px-2 py-0.5">
                  +{gemReward}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGemReward((v) => Math.max(0, v - 1))}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all active:scale-90',
                  gemReward > 0
                    ? 'bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20'
                    : 'bg-[var(--surface-elevated)] text-[var(--fg-muted)] hover:bg-[var(--surface-overlay)]'
                )}
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min={0}
                value={gemReward || ''}
                onChange={(e) => setGemReward(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="input flex-1 text-center h-10 font-semibold"
              />
              <button
                type="button"
                onClick={() => setGemReward((v) => v + 1)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-white shadow-md shadow-cyan-500/25 hover:bg-cyan-600 transition-all active:scale-90"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Сложность */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--fg)] mb-2">Сложность</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const optXp = settings.taskDifficultyXp?.[opt.value] ?? opt.defaultXp
                const style = DIFFICULTY_STYLE[opt.value]
                const isSelected = difficulty === opt.value && customXp == null
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (difficulty === opt.value && customXp == null) {
                        setDifficulty(null)
                      } else {
                        setDifficulty(opt.value)
                      }
                      setCustomXp(null)
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-all',
                      isSelected
                        ? cn(style.border, style.bg)
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                    )}
                  >
                    <span className="text-xs font-semibold text-[var(--fg)]">{opt.label}</span>
                    <div
                      className={cn(
                        'flex items-center gap-0.5 rounded-lg border px-2 py-0.5 text-[10px] font-medium',
                        style.bg, style.text, style.border
                      )}
                      style={{ boxShadow: `0 0 8px ${style.glow}` }}
                    >
                      <Zap className="h-2.5 w-2.5" />
                      {optXp} XP
                    </div>
                  </button>
                )
              })}
            </div>
            {/* Свой XP */}
            <div className={cn(
              'mt-3 rounded-lg border p-3 transition-all',
              customXp != null
                ? 'border-purple-500/30 bg-purple-500/5'
                : 'border-[var(--border)] bg-[var(--surface)]'
            )}>
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
            {/* XP bar — цвет зависит от сложности, фиолетовый только для custom */}
            {(() => {
              if (difficulty == null && customXp == null) {
                return (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 bg-[var(--surface)]">
                    <Zap className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
                    <span className="text-sm font-semibold text-[var(--fg-muted)]">Без XP</span>
                  </div>
                )
              }
              const barStyle = customXp != null ? CUSTOM_XP_STYLE : DIFFICULTY_STYLE[difficulty!]
              return (
                <div
                  className={cn('mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 transition-all', barStyle.bg, barStyle.border)}
                >
                  <Zap className={cn('h-3.5 w-3.5', barStyle.text)} />
                  <span className={cn('text-sm font-semibold', barStyle.text)}>{effectiveXp} XP</span>
                </div>
              )
            })()}
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
