import { useState } from 'react'
import { cn } from '../../lib/cn'
import { X } from 'lucide-react'
import { useRpgStore } from '../../store/useRpgStore'
import type { CraftRecipe, ItemRarity, FragmentSourceType } from '../../types/domain'
import { RARITY_LABELS, RARITY_BADGE_CLASSES, FRAGMENT_ICON_OPTIONS, migrateIcon } from './shopUtils'
import { HabitIcon } from '../HabitIcon'

interface RecipeFormProps {
  recipe?: CraftRecipe
  onClose: () => void
  onCreated?: (id: string) => void
}

export default function RecipeForm({ recipe, onClose, onCreated }: RecipeFormProps) {
  const addRecipe = useRpgStore((s) => s.addCraftRecipe)
  const updateRecipe = useRpgStore((s) => s.updateCraftRecipe)
  const allTasks = useRpgStore((s) => s.tasks)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const tasks = activeProfileId ? allTasks.filter((t) => t.profileId === activeProfileId && !t.archived && !t.isCompleted) : []

  const [fragmentName, setFragmentName] = useState(recipe?.fragmentName ?? '')
  const [fragmentIcon, setFragmentIcon] = useState(migrateIcon(recipe?.fragmentIcon, 'Puzzle'))
  const [fragmentsRequired, setFragmentsRequired] = useState(recipe?.fragmentsRequired ?? 5)
  const [resultItemName] = useState((recipe as any)?.resultItemName ?? 'Награда')
  const [resultRarity, setResultRarity] = useState<ItemRarity>(recipe?.resultRarity ?? 'common')
  const [sourceType, setSourceType] = useState<FragmentSourceType>(
    (recipe as any)?.fragmentSource?.type ?? 'random_drop'
  )
  const [dropChance, setDropChance] = useState((recipe as any)?.fragmentSource?.dropChance ?? 15)
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>(
    (recipe as any)?.fragmentSource?.linkedTaskIds ?? []
  )
  const [showTaskPicker, setShowTaskPicker] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fragmentName.trim()) return

    const data = {
      fragmentName: fragmentName.trim(),
      fragmentIcon,
      fragmentsRequired,
      resultItemName: resultItemName.trim(),
      resultRarity,
      fragmentSource: sourceType === 'task_linked'
        ? { type: 'task_linked' as const, linkedTaskIds }
        : sourceType === 'habit_linked'
          ? { type: 'habit_linked' as const }
          : { type: 'random_drop' as const, dropChance },
    }

    if (recipe) {
      updateRecipe(recipe.id, (r) => ({ ...r, ...data }))
      onClose()
    } else {
      const created = addRecipe(data)
      onCreated?.(created.id)
      onClose()
    }
  }

  return (
    <div className="glass-card flex h-full flex-col rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6 pb-0">
        <h2 className="text-xl font-bold text-[var(--fg)]">
          {recipe ? 'Редактировать рецепт' : 'Новый рецепт'}
        </h2>
        <button type="button" onClick={onClose} className="icon-btn">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 pt-4 flex flex-col gap-4">
        {/* Fragment name + required count */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Название фрагмента</label>
            <input
              type="text"
              value={fragmentName}
              onChange={(e) => setFragmentName(e.target.value)}
              placeholder="Осколок тьмы"
              className="input w-full"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Фрагментов для крафта</label>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setFragmentsRequired((prev) => Math.max(1, prev - 1))} className="input-group-btn input-group-btn-minus">−</button>
              <input type="number" value={fragmentsRequired} onChange={(e) => setFragmentsRequired(Math.max(1, Number(e.target.value) || 1))} min={1} className="input w-full flex-1 min-w-0 h-9 py-0" />
              <button type="button" onClick={() => setFragmentsRequired((prev) => prev + 1)} className="input-group-btn input-group-btn-plus">+</button>
            </div>
          </div>
        </div>

        {/* Fragment icon picker */}
        <div>
          <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Иконка фрагмента</label>
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

        {/* Rarity */}
        <div>
          <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Редкость результата</label>
          <div className="grid grid-cols-5 gap-1.5">
            {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as ItemRarity[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setResultRarity(r)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold transition-all',
                  resultRarity === r
                    ? cn(RARITY_BADGE_CLASSES[r], 'ring-2 scale-105')
                    : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] border border-[var(--border)]'
                )}
              >
                {RARITY_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Source type */}
        <div>
          <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Источник фрагментов</label>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setSourceType('random_drop')} className={cn('rounded-xl p-3 text-left transition-all', sourceType === 'random_drop' ? 'bg-[var(--accent-subtle)] border-2 border-[var(--accent)]' : 'bg-[var(--surface)] border-2 border-transparent')}>
              <div className="mb-1 text-[var(--fg-muted)]"><HabitIcon iconName="Dice5" size={20} /></div>
              <div className="font-medium text-xs">Случайный дроп</div>
            </button>
            <button type="button" onClick={() => setSourceType('task_linked')} className={cn('rounded-xl p-3 text-left transition-all', sourceType === 'task_linked' ? 'bg-[var(--accent-subtle)] border-2 border-[var(--accent)]' : 'bg-[var(--surface)] border-2 border-transparent')}>
              <div className="mb-1 text-[var(--fg-muted)]"><HabitIcon iconName="Crosshair" size={20} /></div>
              <div className="font-medium text-xs">Привязка к задачам</div>
            </button>
            <button type="button" onClick={() => setSourceType('habit_linked')} className={cn('rounded-xl p-3 text-left transition-all', sourceType === 'habit_linked' ? 'bg-[var(--accent-subtle)] border-2 border-[var(--accent)]' : 'bg-[var(--surface)] border-2 border-transparent')}>
              <div className="mb-1 text-[var(--fg-muted)]"><HabitIcon iconName="Rocket" size={20} /></div>
              <div className="font-medium text-xs">Привычки</div>
            </button>
          </div>
        </div>

        {/* Drop chance */}
        {sourceType === 'random_drop' && (
          <div>
            <label className="block text-xs font-medium text-[var(--fg-muted)] mb-1.5">Шанс выпадения (%)</label>
            <input type="number" value={dropChance} onChange={(e) => setDropChance(Number(e.target.value) || 1)} min={1} max={100} className="input w-full" />
          </div>
        )}

        {/* Task picker */}
        {sourceType === 'task_linked' && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--fg)]">Привязанные задачи</p>
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">Выбрано: {linkedTaskIds.length || 0}</p>
            </div>
            <button type="button" onClick={() => setShowTaskPicker(true)} className="btn-secondary text-sm px-3 py-1.5">Выбрать</button>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button type="submit" className="btn-primary flex-1">{recipe ? 'Сохранить' : 'Создать'}</button>
        </div>
      </form>

      {/* Task picker modal */}
      {showTaskPicker && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowTaskPicker(false)}>
          <div className="modal-content max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--fg)]">Выбрать задачи</h3>
              <button type="button" onClick={() => setShowTaskPicker(false)} className="icon-btn"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-[var(--fg-muted)] mb-3">Отметьте задачи, за выполнение которых будут выдаваться фрагменты.</p>
            <div className="max-h-72 overflow-y-auto rounded-xl bg-[var(--surface)] p-2 mb-4">
              {tasks.map((task) => (
                <label key={task.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-[var(--surface-elevated)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkedTaskIds.includes(task.id)}
                    onChange={(e) => {
                      if (e.target.checked) setLinkedTaskIds((prev) => [...prev, task.id])
                      else setLinkedTaskIds((prev) => prev.filter(id => id !== task.id))
                    }}
                    className="h-4 w-4 rounded accent-[var(--accent)]"
                  />
                  <span className="text-sm truncate">{task.title}</span>
                </label>
              ))}
              {tasks.length === 0 && (
                <p className="text-sm text-[var(--fg-muted)] text-center py-4">Нет активных задач</p>
              )}
            </div>
            <button type="button" onClick={() => setShowTaskPicker(false)} className="btn-secondary w-full">Готово</button>
          </div>
        </div>
      )}
    </div>
  )
}
