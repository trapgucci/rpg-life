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

// Функция для получения цветов на основе XP (как на карточках)
const getXpColorClasses = (xp: number, isCustom: boolean = false) => {
  if (isCustom) {
    return {
      bg: 'bg-purple-500/10',
      text: 'text-purple-500',
      border: 'border-purple-500/30',
    }
  }

  if (xp >= 300) {
    return {
      bg: 'bg-red-500/10',
      text: 'text-red-500',
      border: 'border-red-500/30',
    }
  }
  if (xp >= 100) {
    return {
      bg: 'bg-orange-500/10',
      text: 'text-orange-500',
      border: 'border-orange-500/30',
    }
  }
  if (xp >= 30) {
    return {
      bg: 'bg-blue-500/10',
      text: 'text-blue-500',
      border: 'border-blue-500/30',
    }
  }
  return {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    border: 'border-emerald-500/30',
  }
}

// Функция для получения названия сложности
const getDifficultyLabel = (xp: number, isCustom: boolean = false) => {
  if (isCustom) return 'Индивидуальный'
  if (xp >= 300) return 'Импосибл'
  if (xp >= 100) return 'Сложно'
  if (xp >= 30) return 'Средне'
  return 'Легко'
}

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
  const isCustomXp = customXp != null
  const xpColors = getXpColorClasses(effectiveXp, isCustomXp)
  const difficultyLabel = getDifficultyLabel(effectiveXp, isCustomXp)

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
          'fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          animatedOpen ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Выбор атрибута и сложности"
        className={cn(
          'fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none'
        )}
      >
        <div
          className={cn(
            'pointer-events-auto w-full max-w-md rounded-2xl bg-white dark:bg-[var(--surface-overlay)] shadow-2xl transition-all duration-300 ease-out overflow-hidden flex flex-col max-h-[80vh]',
            animatedOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
          )}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-[var(--border)] shrink-0">
            <h2 className="text-base font-semibold text-[var(--fg)]">Атрибуты и сложность</h2>
            <button
              type="button"
              onClick={handleClose}
              className="icon-btn h-8 w-8 shrink-0 rounded-full p-0 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 pb-4 pt-3 overflow-y-auto space-y-4 flex-1">
          {/* Атрибуты - мультивыбор */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--fg)] mb-1">Атрибуты</h3>
            <p className="text-[11px] text-[var(--fg-muted)] mb-2">XP начисляются во все выбранные атрибуты</p>
            <div className="space-y-1.5">
              {attributes.map((attr) => {
                const isSelected = selectedAttributeIds.includes(attr.id)
                return (
                  <button
                    key={attr.id}
                    type="button"
                    onClick={() => toggleAttribute(attr.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                    )}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
                      style={{ backgroundColor: `${attr.color}20` }}
                    >
                      {attr.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[var(--fg)]">{attr.name}</span>
                      <span className="ml-1.5 text-xs text-[var(--fg-muted)]">Ур. {attr.level}</span>
                    </div>
                    {isSelected && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Сложность с настройкой XP */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--fg)] mb-2">Сложность</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const optXp = settings.taskDifficultyXp?.[opt.value] ?? opt.defaultXp
                const optColors = getXpColorClasses(optXp, false)
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
                      'flex flex-col items-center gap-1.5 rounded-lg border p-2.5 transition-all',
                      selectedDifficulty === opt.value && !isCustomXp
                        ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                    )}
                  >
                    <span className="text-xs font-semibold text-[var(--fg)]">{opt.label}</span>
                    <div className={cn(
                      'flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-[10px] font-semibold border',
                      optColors.bg,
                      optColors.text,
                      optColors.border
                    )}>
                      <Zap className="h-2.5 w-2.5" />
                      {optXp} XP
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Custom XP override */}
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <label className="block text-[11px] font-medium text-[var(--fg-muted)] mb-1.5">
                Свой XP (переопределить сложность)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChangeCustomXp?.(Math.max(0, (customXp ?? difficultyXp) - 10))}
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
                    if (val === '') {
                      onChangeCustomXp?.(null)
                    } else {
                      onChangeCustomXp?.(Math.max(0, parseInt(val, 10) || 0))
                    }
                  }}
                  className="input flex-1 text-center h-8 text-sm"
                />
                <button
                  type="button"
                  onClick={() => onChangeCustomXp?.((customXp ?? difficultyXp) + 10)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-sm text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                >
                  +
                </button>
              </div>
              {customXp != null && (
                <button
                  type="button"
                  onClick={() => onChangeCustomXp?.(null)}
                  className="mt-1.5 text-[10px] text-[var(--accent)] hover:underline"
                >
                  Сбросить к значению сложности ({difficultyXp} XP)
                </button>
              )}
            </div>

            {/* Summary */}
            <div className={cn(
              'mt-2 flex items-center gap-2 rounded-lg px-3 py-2 border',
              xpColors.bg,
              xpColors.border
            )}>
              <Zap className={cn('h-3.5 w-3.5', xpColors.text)} />
              <span className={cn('text-sm font-semibold', xpColors.text)}>
                {effectiveXp} XP
              </span>
              <span className={cn('text-[11px]', xpColors.text, 'opacity-70')}>
                • {difficultyLabel}
              </span>
              {selectedAttributeIds.length > 0 && (
                <span className={cn('text-[11px]', xpColors.text, 'opacity-70')}>
                  → {selectedAttributeIds.length} {selectedAttributeIds.length === 1 ? 'атрибут' : selectedAttributeIds.length < 5 ? 'атрибута' : 'атрибутов'}
                </span>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  )
}
