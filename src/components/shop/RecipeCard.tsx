import { useState } from 'react'
import { cn } from '../../lib/cn'
import { Trash2, CheckCircle2, Sparkles, Dice5, Crosshair, Flame } from 'lucide-react'
import { useRpgStore } from '../../store/useRpgStore'
import ConfirmModal from '../ConfirmModal'
import type { CraftRecipe } from '../../types/domain'
import { RARITY_COLORS, RARITY_LABELS, RARITY_BADGE_CLASSES, migrateIcon } from './shopUtils'
import { HabitIcon } from '../HabitIcon'

interface RecipeCardProps {
  recipe: CraftRecipe
  selected?: boolean
  onSelect: () => void
}

export default function RecipeCard({ recipe, selected, onSelect }: RecipeCardProps) {
  const deleteRecipe = useRpgStore((s) => s.deleteCraftRecipe)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!recipe) return null

  const rawSource = (recipe as any).fragmentSource
  const fragmentSource: { type?: string; dropChance?: number; linkedTaskIds?: string[]; streakRequired?: number } =
    rawSource != null && typeof rawSource === 'object'
      ? rawSource
      : { type: 'random_drop', dropChance: 0 }
  const rawType = fragmentSource?.type ?? 'random_drop'
  const sourceType = rawType === 'habit_linked' ? 'random_drop' : rawType

  const progress = recipe.fragmentsRequired > 0
    ? Math.min(1, recipe.fragmentsCollected / recipe.fragmentsRequired)
    : 0

  const canCraft = recipe.fragmentsCollected >= recipe.fragmentsRequired && !recipe.crafted
  const rarityColor = RARITY_COLORS[recipe.resultRarity]
  const fragmentIconImage = (recipe as any).fragmentIconImage ?? ''

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative w-full rounded-2xl p-4 text-left transition-all duration-200',
        'bg-[var(--surface-card)] backdrop-blur-lg',
        'border border-[var(--border)]',
        'hover:border-[var(--border-accent)] hover:shadow-lg hover:-translate-y-0.5',
        selected && 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-lg shadow-[var(--accent)]/10',
        recipe.crafted && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Neumorphic icon */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl transition-all overflow-hidden',
            'ring-1 ring-inset shadow-sm',
          )}
          style={{
            background: `linear-gradient(to bottom, ${rarityColor}30, ${rarityColor}15)`,
            color: rarityColor,
            boxShadow: `0 1px 2px ${rarityColor}20`,
            '--tw-ring-color': `${rarityColor}40`,
          } as React.CSSProperties}
        >
          {fragmentIconImage ? (
            <img src={fragmentIconImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <HabitIcon iconName={migrateIcon(recipe.fragmentIcon, 'Puzzle')} size={22} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-[var(--fg)] line-clamp-1 flex-1">{recipe.fragmentName}</h3>
            {recipe.crafted && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-500">
                <CheckCircle2 className="h-3 w-3" />
                Готово
              </span>
            )}
          </div>

          {/* Badges */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={cn('inline-flex items-center rounded-xl px-2 py-0.5 text-xs font-semibold', RARITY_BADGE_CLASSES[recipe.resultRarity])}>
              {RARITY_LABELS[recipe.resultRarity]}
            </span>
            <span className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-b from-[var(--accent)]/15 to-[var(--accent)]/5 px-2 py-0.5 text-xs font-semibold text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/10">
              {sourceType === 'task_linked' && <><Crosshair className="h-3 w-3" /> Задачи{typeof fragmentSource?.dropChance === 'number' && fragmentSource.dropChance > 0 && ` ${fragmentSource.dropChance}%`}</>}
              {sourceType === 'streak_reward' && <><Flame className="h-3 w-3" /> Стрик</>}
              {sourceType === 'random_drop' && <><Dice5 className="h-3 w-3" /> Дроп{typeof fragmentSource?.dropChance === 'number' && fragmentSource.dropChance > 0 && ` ${fragmentSource.dropChance}%`}</>}
            </span>
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--fg-muted)]">Прогресс</span>
              <span className="font-semibold" style={{ color: canCraft ? '#10b981' : 'var(--fg)' }}>
                {recipe.fragmentsCollected} / {recipe.fragmentsRequired}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress * 100}%`,
                  background: canCraft
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : `linear-gradient(90deg, ${rarityColor}, ${rarityColor}cc)`
                }}
              />
            </div>
          </div>
        </div>

        {/* Quick craft indicator */}
        {canCraft && (
          <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-b from-emerald-500/20 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25">
            <Sparkles className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }}
          className="icon-btn icon-btn-danger icon-btn-compact"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Удалить фрагмент?"
        message="Фрагмент будет удалён безвозвратно."
        variant="danger"
        confirmText="Удалить"
        onConfirm={() => {
          deleteRecipe(recipe.id)
          setShowDeleteConfirm(false)
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </button>
  )
}
