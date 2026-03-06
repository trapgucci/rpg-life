import { useState } from 'react'
import {
  Hammer, Plus, Pencil, Trash2, X, Sparkles,
  CheckCircle2, Package
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useRpgStore } from '../store/useRpgStore'
import type { CraftRecipe, ItemRarity, FragmentSourceType } from '../types/domain'
import ConfirmModal from '../components/ConfirmModal'
import { HabitIcon } from '../components/HabitIcon'
import { FRAGMENT_ICON_OPTIONS, migrateIcon } from '../components/shop/shopUtils'

const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

const RARITY_LABELS: Record<ItemRarity, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
}

const RARITY_GRADIENTS: Record<ItemRarity, string> = {
  common: 'from-gray-400 to-gray-500',
  uncommon: 'from-green-400 to-emerald-500',
  rare: 'from-blue-400 to-indigo-500',
  epic: 'from-purple-400 to-violet-500',
  legendary: 'from-amber-400 to-orange-500',
}

// ─── Recipe Card ────────────────────────────────────────────────────────────

interface RecipeCardProps {
  recipe: CraftRecipe
  onEdit: () => void
}

function RecipeCard({ recipe, onEdit }: RecipeCardProps) {
  const deleteRecipe = useRpgStore((s) => s.deleteCraftRecipe)
  const craftItem = useRpgStore((s) => s.craftItem)
  const allShopItems = useRpgStore((s) => s.shopItems)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Старые сохранённые данные могут не содержать fragmentSource
  const fragmentSource = recipe.fragmentSource ?? { type: 'random_drop' as const, dropChance: 0 }

  const resultItem = recipe.resultItemId ? allShopItems.find((i) => i.id === recipe.resultItemId) : undefined
  const isOutOfStock = !!(resultItem && resultItem.stock !== undefined && resultItem.stock === 0)

  const progress = recipe.fragmentsRequired > 0
    ? Math.min(1, recipe.fragmentsCollected / recipe.fragmentsRequired)
    : 0

  const canCraft = recipe.fragmentsCollected >= recipe.fragmentsRequired && !recipe.crafted
  const rarityColor = RARITY_COLORS[recipe.resultRarity]

  const handleCraft = () => {
    craftItem(recipe.id)
  }

  return (
    <div
      className={cn(
        'glass-card group relative rounded-2xl p-5 transition-all duration-300',
        recipe.crafted && 'opacity-60',
        recipe.resultRarity === 'legendary' && !recipe.crafted && 'animate-pulse-glow'
      )}
      style={{ 
        borderColor: `${rarityColor}30`,
        boxShadow: recipe.resultRarity === 'legendary' && !recipe.crafted ? `0 0 20px ${rarityColor}30` : undefined
      }}
    >
      {/* Edit/Delete buttons */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onEdit} className="icon-btn">
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="icon-btn icon-btn-danger"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Crafted badge */}
      {recipe.crafted && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-500">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Скрафчено
        </div>
      )}

      <div className="flex flex-col items-center text-center pt-4">
        {/* Fragment icon */}
        <div
          className={cn(
            'flex h-20 w-20 items-center justify-center rounded-2xl mb-4 shadow-lg text-white',
            `bg-gradient-to-br ${RARITY_GRADIENTS[recipe.resultRarity]}`
          )}
          style={{ boxShadow: `0 8px 20px ${rarityColor}40` }}
        >
          <HabitIcon iconName={migrateIcon(recipe.fragmentIcon, 'Puzzle')} size={36} />
        </div>

        {/* Fragment name */}
        <h3 className="font-semibold text-[var(--fg)]">{recipe.fragmentName}</h3>

        {/* Result info */}
        <div className="mt-2 flex items-center gap-2">
          <span
            className="rounded-lg px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${rarityColor}20`, color: rarityColor }}
          >
            {RARITY_LABELS[recipe.resultRarity]}
          </span>
          <span className="text-xs text-[var(--fg-muted)]">→</span>
          <span className="text-sm text-[var(--fg)]">{recipe.resultName}</span>
        </div>

        {/* Source info */}
        <p className="mt-3 text-xs text-[var(--fg-muted)] flex items-center gap-1">
          {fragmentSource.type === 'task_linked'
            ? <><HabitIcon iconName="Crosshair" size={12} className="inline" /> Привязано к задачам</>
            : <><HabitIcon iconName="Dice5" size={12} className="inline" /> Случайный дроп</>}
          {fragmentSource.type === 'random_drop' && typeof fragmentSource.dropChance === 'number' && fragmentSource.dropChance > 0 && (
            <span className="ml-1">
              ({fragmentSource.dropChance}% шанс)
            </span>
          )}
          {!fragmentSource.type && 'Источник фрагментов не задан'}
        </p>

        {/* Progress */}
        <div className="mt-4 w-full">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-[var(--fg-muted)]">Фрагменты</span>
            <span className="font-semibold" style={{ color: canCraft ? '#10b981' : 'var(--fg)' }}>
              {recipe.fragmentsCollected} / {recipe.fragmentsRequired}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--border)]">
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

        {/* Craft button */}
        {!recipe.crafted && (
          <>
            {isOutOfStock && canCraft && (
              <p className="mt-3 text-[11px] text-red-500 text-center font-medium">
                Предмет закончился — получите 70% стоимости
              </p>
            )}
            <button
              type="button"
              onClick={handleCraft}
              disabled={!canCraft}
              className={cn(
                'mt-2 w-full rounded-xl py-3 font-semibold transition-all duration-200',
                canCraft
                  ? isOutOfStock
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40'
                    : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40'
                  : 'bg-[var(--surface)] text-[var(--fg-muted)] cursor-not-allowed'
              )}
            >
              {canCraft ? (
                <>
                  <Sparkles className="h-4 w-4 inline mr-2" />
                  {isOutOfStock ? 'Получить компенсацию' : 'Скрафтить!'}
                </>
              ) : (
                `Нужно ещё ${recipe.fragmentsRequired - recipe.fragmentsCollected} фрагментов`
              )}
            </button>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={() => { setShowDeleteConfirm(false); deleteRecipe(recipe.id) }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Удалить рецепт?"
        message="Рецепт будет удалён безвозвратно."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
    </div>
  )
}

// ─── Recipe Form ────────────────────────────────────────────────────────────

interface RecipeFormProps {
  recipe?: CraftRecipe
  onClose: () => void
}

// Using FRAGMENT_ICON_OPTIONS from shopUtils

function RecipeForm({ recipe, onClose }: RecipeFormProps) {
  const addRecipe = useRpgStore((s) => s.addCraftRecipe)
  const updateRecipe = useRpgStore((s) => s.updateCraftRecipe)
  const allTasks = useRpgStore((s) => s.tasks)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const tasks = activeProfileId ? allTasks.filter((t) => t.profileId === activeProfileId) : []

  const [fragmentName, setFragmentName] = useState(recipe?.fragmentName ?? '')
  const [fragmentIcon, setFragmentIcon] = useState(migrateIcon(recipe?.fragmentIcon, 'Puzzle'))
  const [fragmentsRequired, setFragmentsRequired] = useState(recipe?.fragmentsRequired ?? 10)
  const [resultName, setResultName] = useState(recipe?.resultName ?? '')
  const [resultRarity, setResultRarity] = useState<ItemRarity>(recipe?.resultRarity ?? 'rare')
  const [sourceType, setSourceType] = useState<FragmentSourceType>(
    recipe?.fragmentSource?.type ?? 'random_drop'
  )
  const [dropChance, setDropChance] = useState(recipe?.fragmentSource?.dropChance ?? 15)
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>(
    recipe?.fragmentSource?.linkedTaskIds ?? []
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fragmentName.trim() || !resultName.trim()) return

    const data = {
      fragmentName: fragmentName.trim(),
      fragmentIcon,
      fragmentsRequired,
      resultName: resultName.trim(),
      resultRarity,
      fragmentSource: sourceType === 'task_linked'
        ? { type: 'task_linked' as const, linkedTaskIds }
        : { type: 'random_drop' as const, dropChance },
    }

    if (recipe) {
      updateRecipe(recipe.id, (r) => ({ ...r, ...data }))
    } else {
      addRecipe(data)
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--fg)]">
            {recipe ? 'Редактировать рецепт' : 'Новый рецепт'}
          </h2>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Fragment info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Название фрагмента</label>
              <input
                type="text"
                value={fragmentName}
                onChange={(e) => setFragmentName(e.target.value)}
                placeholder="Осколок тьмы"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Нужно фрагментов</label>
              <input
                type="number"
                value={fragmentsRequired || ''}
                onChange={(e) => setFragmentsRequired(Number(e.target.value) || 1)}
                min={1}
                className="input w-full"
              />
            </div>
          </div>

          {/* Fragment icon */}
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Иконка фрагмента</label>
            <div className="flex flex-wrap gap-2">
              {FRAGMENT_ICON_OPTIONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setFragmentIcon(iconName)}
                  className={cn(
                    'h-10 w-10 rounded-xl transition-all flex items-center justify-center',
                    fragmentIcon === iconName
                      ? 'bg-[var(--accent)] text-white shadow-lg scale-110'
                      : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)]'
                  )}
                >
                  <HabitIcon iconName={iconName} size={20} />
                </button>
              ))}
            </div>
          </div>

          {/* Result info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Результат крафта</label>
              <input
                type="text"
                value={resultName}
                onChange={(e) => setResultName(e.target.value)}
                placeholder="Меч тьмы"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Редкость</label>
              <select
                value={resultRarity}
                onChange={(e) => setResultRarity(e.target.value as ItemRarity)}
                className="select w-full"
              >
                {Object.entries(RARITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Source type */}
          <div>
            <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Источник фрагментов</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSourceType('random_drop')}
                className={cn(
                  'rounded-xl p-4 text-left transition-all',
                  sourceType === 'random_drop' 
                    ? 'bg-[var(--accent-subtle)] border-2 border-[var(--accent)]' 
                    : 'bg-[var(--surface)] border-2 border-transparent'
                )}
              >
                <div className="mb-1 text-[var(--fg-muted)]"><HabitIcon iconName="Dice5" size={20} /></div>
                <div className="font-medium text-sm">Случайный дроп</div>
                <div className="text-xs text-[var(--fg-muted)]">Шанс при выполнении задач</div>
              </button>
              <button
                type="button"
                onClick={() => setSourceType('task_linked')}
                className={cn(
                  'rounded-xl p-4 text-left transition-all',
                  sourceType === 'task_linked'
                    ? 'bg-[var(--accent-subtle)] border-2 border-[var(--accent)]'
                    : 'bg-[var(--surface)] border-2 border-transparent'
                )}
              >
                <div className="mb-1 text-[var(--fg-muted)]"><HabitIcon iconName="Crosshair" size={20} /></div>
                <div className="font-medium text-sm">Привязка к задачам</div>
                <div className="text-xs text-[var(--fg-muted)]">Конкретные задачи</div>
              </button>
            </div>
          </div>

          {/* Source options */}
          {sourceType === 'random_drop' && (
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">
                Шанс выпадения (%)
              </label>
              <input
                type="number"
                value={dropChance || ''}
                onChange={(e) => setDropChance(Number(e.target.value) || 1)}
                min={1}
                max={100}
                className="input w-full"
              />
            </div>
          )}

          {sourceType === 'task_linked' && (
            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">
                Привязанные задачи
              </label>
              <div className="max-h-40 overflow-y-auto rounded-xl bg-[var(--surface)] p-2">
                {tasks.filter(t => !t.archived && !t.isCompleted).map((task) => (
                  <label
                    key={task.id}
                    className="flex items-center gap-2 rounded-lg p-2 hover:bg-[var(--surface-elevated)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={linkedTaskIds.includes(task.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLinkedTaskIds([...linkedTaskIds, task.id])
                        } else {
                          setLinkedTaskIds(linkedTaskIds.filter(id => id !== task.id))
                        }
                      }}
                      className="h-4 w-4 rounded accent-[var(--accent)]"
                    />
                    <span className="text-sm truncate">{task.title}</span>
                  </label>
                ))}
                {tasks.filter(t => !t.archived && !t.isCompleted).length === 0 && (
                  <p className="text-sm text-[var(--fg-muted)] text-center py-4">Нет активных задач</p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" className="btn-primary flex-1">
              {recipe ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Crafting Page ─────────────────────────────────────────────────────

export default function CraftingPage() {
  const allRecipes = useRpgStore((s) => s.craftRecipes)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const recipes = activeProfileId ? allRecipes.filter((r) => r.profileId === activeProfileId) : []
  const [showForm, setShowForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<CraftRecipe | undefined>()

  const handleEdit = (recipe: CraftRecipe) => {
    setEditingRecipe(recipe)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingRecipe(undefined)
  }

  const activeRecipes = recipes.filter((r) => !r.crafted)
  const craftedRecipes = recipes.filter((r) => r.crafted)

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30">
            <Hammer className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--fg)]">Крафт</h1>
            <p className="text-sm text-[var(--fg-muted)]">
              {activeRecipes.length} активных рецептов
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Новый рецепт
        </button>
      </div>

      {/* Active recipes */}
      {recipes.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center rounded-2xl py-16">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-500/10 mb-4">
            <Package className="h-10 w-10 text-purple-500" />
          </div>
          <p className="font-medium text-[var(--fg)]">Нет рецептов</p>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">Создайте свой первый рецепт крафта</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary mt-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            Создать рецепт
          </button>
        </div>
      ) : (
        <>
          {/* Active recipes */}
          {activeRecipes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--fg)] mb-4">В процессе</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeRecipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} onEdit={() => handleEdit(recipe)} />
                ))}
              </div>
            </div>
          )}

          {/* Crafted recipes */}
          {craftedRecipes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--fg)] mb-4">Скрафченные</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {craftedRecipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} onEdit={() => handleEdit(recipe)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Form modal */}
      {showForm && <RecipeForm recipe={editingRecipe} onClose={handleCloseForm} />}
    </div>
  )
}
