import { memo, useMemo } from 'react'
import { cn } from '../../lib/cn'
import { CheckCircle2, Sparkles, Dice5, Crosshair } from 'lucide-react'
import { useRpgStore } from '../../store/useRpgStore'
import type { CraftRecipe } from '../../types/domain'
import { migrateIcon, getItemTypeColor } from './shopUtils'
import { HabitIcon } from '../HabitIcon'

interface RecipeCardProps {
  recipe: CraftRecipe
  selected?: boolean
  onSelect: () => void
}

export default memo(function RecipeCard({ recipe, selected, onSelect }: RecipeCardProps) {
  const allShopItems = useRpgStore((s) => s.shopItems)

  const resultItem = useMemo(() => recipe?.resultItemId ? allShopItems.find((i) => i.id === recipe.resultItemId) : null, [recipe?.resultItemId, allShopItems])

  if (!recipe) return null

  const fragmentSource = recipe.fragmentSource ?? { type: 'random_drop' as const, dropChance: 0 }
  const rawType = fragmentSource?.type ?? 'random_drop'
  const sourceType = rawType === 'habit_linked' ? 'random_drop' : rawType

  const progress = recipe.fragmentsRequired > 0
    ? Math.min(1, recipe.fragmentsCollected / recipe.fragmentsRequired)
    : 0

  const canCraft = recipe.fragmentsCollected >= recipe.fragmentsRequired && !recipe.crafted
  const themeColor = getItemTypeColor(resultItem)
  const fragmentIconImage = recipe.fragmentIconImage ?? ''

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
        {/* Prismatic crystal icon */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          {/* Outer glow */}
          <div
            className="absolute inset-0 rounded-xl blur-[6px] opacity-50"
            style={{
              background: `linear-gradient(135deg, ${themeColor}60, ${themeColor}20)`,
            }}
          />
          {/* Crystal shape */}
          <div
            className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden"
            style={{
              background: `
                linear-gradient(135deg,
                  ${themeColor}dd 0%,
                  ${themeColor}90 30%,
                  ${themeColor}bb 50%,
                  ${themeColor}70 70%,
                  ${themeColor}dd 100%
                )
              `,
              boxShadow: `
                inset 2px 2px 4px rgba(255,255,255,0.35),
                inset -1px -1px 3px rgba(0,0,0,0.15),
                0 2px 6px ${themeColor}40
              `,
            }}
          >
            {/* Glass refraction highlight */}
            <div
              className="absolute top-0 left-0 w-[60%] h-[60%] rounded-bl-full opacity-30"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.8), transparent)' }}
            />
            {fragmentIconImage ? (
              <img src={fragmentIconImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <HabitIcon iconName={migrateIcon(recipe.fragmentIcon, 'Puzzle')} size={18} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
            )}
          </div>
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
            <span className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-b from-[var(--accent)]/15 to-[var(--accent)]/5 px-2 py-0.5 text-xs font-semibold text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/10">
              {sourceType === 'task_linked' && <><Crosshair className="h-3 w-3" /> Задачи{typeof fragmentSource?.dropChance === 'number' && fragmentSource.dropChance > 0 && ` ${fragmentSource.dropChance}%`}</>}
              {sourceType === 'random_drop' && <><Dice5 className="h-3 w-3" /> Дроп{typeof fragmentSource?.dropChance === 'number' && fragmentSource.dropChance > 0 && ` ${fragmentSource.dropChance}%`}</>}
            </span>
            {(recipe.maxCrafts ?? 1) > 1 && (
              <span className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-b from-violet-500/15 to-violet-500/5 px-2 py-0.5 text-xs font-semibold text-violet-500 ring-1 ring-inset ring-violet-400/20 shadow-sm shadow-violet-500/10">
                {recipe.craftCount ?? 0}/{recipe.maxCrafts}
              </span>
            )}
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
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${progress * 100}%`,
                  background: canCraft
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : `linear-gradient(90deg, ${themeColor}, ${themeColor}cc)`
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

    </button>
  )
})
