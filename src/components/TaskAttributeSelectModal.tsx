import { useState, useLayoutEffect, useEffect } from 'react'
import { X, BarChart3, Check, Zap } from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import type { AttributeId, TaskDifficulty } from '../types/domain'

const DIFFICULTY_OPTIONS: { value: TaskDifficulty; label: string; defaultXp: number }[] = [
  { value: 'easy', label: 'Легко', defaultXp: 10 },
  { value: 'medium', label: 'Средне', defaultXp: 30 },
  { value: 'hard', label: 'Сложно', defaultXp: 100 },
  { value: 'veryHard', label: 'Импосибл', defaultXp: 300 },
]

interface TaskAttributeSelectModalProps {
  isOpen: boolean
  selectedAttributeIds: AttributeId[]
  selectedDifficulty: TaskDifficulty
  customXp?: number | null
  onSelectAttributes: (attributeIds: AttributeId[]) => void
  onSelectDifficulty: (difficulty: TaskDifficulty) => void
  onChangeCustomXp?: (xp: number | null) => void
  onClose: () => void
}

export default function TaskAttributeSelectModal({
  isOpen,
  selectedAttributeIds,
  selectedDifficulty,
  customXp,
  onSelectAttributes,
  onSelectDifficulty,
  onChangeCustomXp,
  onClose,
}: TaskAttributeSelectModalProps) {
  const [animatedOpen, setAnimatedOpen] = useState(false)
  const getAttributes = useRpgStore((s) => s.getAttributes)
  const settings = useRpgStore((s) => s.settings)
  const attributes = getAttributes()

  const difficultyXp = settings.taskDifficultyXp?.[selectedDifficulty] ?? 0
  const effectiveXp = customXp ?? difficultyXp

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

  const toggleAttribute = (attrId: AttributeId) => {
    if (selectedAttributeIds.includes(attrId)) {
      onSelectAttributes(selectedAttributeIds.filter((id) => id !== attrId))
    } else {
      onSelectAttributes([...selectedAttributeIds, attrId])
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        role="presentation"
        onClick={handleClose}
        className={cn(
          'fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300',
          animatedOpen ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Выбор атрибута и сложности"
        className={cn(
          'fixed inset-x-0 bottom-0 z-[70] rounded-t-2xl bg-white dark:bg-[var(--surface-overlay)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out flex flex-col',
          'max-h-[85vh]',
          animatedOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-[var(--border)] shrink-0">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Атрибуты и сложность</h2>
          <button
            type="button"
            onClick={handleClose}
            className="icon-btn h-9 w-9 shrink-0 rounded-full p-0 text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 pb-6 pt-4 overflow-y-auto space-y-6 flex-1">
          {/* Атрибуты - мультивыбор */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--fg)] mb-1">Атрибуты</h3>
            <p className="text-xs text-[var(--fg-muted)] mb-3">XP начисляются во все выбранные атрибуты</p>
            <div className="space-y-2">
              {attributes.map((attr) => {
                const isSelected = selectedAttributeIds.includes(attr.id)
                return (
                  <button
                    key={attr.id}
                    type="button"
                    onClick={() => toggleAttribute(attr.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                    )}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
                      style={{ backgroundColor: `${attr.color}20` }}
                    >
                      {attr.icon}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-[var(--fg)]">{attr.name}</span>
                      <span className="ml-2 text-sm text-[var(--fg-muted)]">Ур. {attr.level}</span>
                    </div>
                    {isSelected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Сложность с настройкой XP */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Сложность</h3>
            <div className="grid grid-cols-2 gap-2">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const optXp = settings.taskDifficultyXp?.[opt.value] ?? opt.defaultXp
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onSelectDifficulty(opt.value)
                      // Reset custom XP when changing difficulty
                      onChangeCustomXp?.(null)
                    }}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
                      selectedDifficulty === opt.value
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                    )}
                  >
                    <span className="text-sm font-semibold text-[var(--fg)]">{opt.label}</span>
                    <div className="flex items-center gap-1 rounded-lg bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-500">
                      <Zap className="h-3 w-3" />
                      {optXp} XP
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Custom XP override */}
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <label className="block text-xs font-medium text-[var(--fg-muted)] mb-2">
                Свой XP (переопределить сложность)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChangeCustomXp?.(Math.max(0, (customXp ?? difficultyXp) - 10))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
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
                    if (val === '') {
                      onChangeCustomXp?.(null)
                    } else {
                      onChangeCustomXp?.(Math.max(0, parseInt(val, 10) || 0))
                    }
                  }}
                  className="input flex-1 text-center h-9"
                />
                <button
                  type="button"
                  onClick={() => onChangeCustomXp?.((customXp ?? difficultyXp) + 10)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                >
                  +
                </button>
              </div>
              {customXp != null && (
                <button
                  type="button"
                  onClick={() => onChangeCustomXp?.(null)}
                  className="mt-2 text-xs text-[var(--accent)] hover:underline"
                >
                  Сбросить к значению сложности ({difficultyXp} XP)
                </button>
              )}
            </div>

            {/* Summary */}
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-purple-500/10 px-4 py-3">
              <Zap className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-semibold text-purple-500">
                {effectiveXp} XP
              </span>
              {selectedAttributeIds.length > 0 && (
                <span className="text-xs text-purple-400">
                  → {selectedAttributeIds.length} {selectedAttributeIds.length === 1 ? 'атрибут' : selectedAttributeIds.length < 5 ? 'атрибута' : 'атрибутов'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
