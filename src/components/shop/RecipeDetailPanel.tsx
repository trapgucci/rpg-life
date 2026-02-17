import { useState, useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { X, Pencil, Trash2, Sparkles, CheckCircle2, Plus, Minus } from 'lucide-react'
import { useRpgStore } from '../../store/useRpgStore'
import type { CraftRecipe, ItemRarity, FragmentSourceType } from '../../types/domain'
import { RARITY_LABELS, RARITY_COLORS, RARITY_BADGE_CLASSES, FRAGMENT_ICONS } from './shopUtils'
import ConfirmModal from '../ConfirmModal'

interface RecipeDetailPanelProps {
  recipe: CraftRecipe
  onDeselect?: () => void
}

export default function RecipeDetailPanel({ recipe, onDeselect }: RecipeDetailPanelProps) {
  const updateRecipe = useRpgStore((s) => s.updateCraftRecipe)
  const deleteRecipe = useRpgStore((s) => s.deleteCraftRecipe)
  const craftItem = useRpgStore((s) => s.craftItem)
  const addFragment = useRpgStore((s) => s.addFragment)
  const allTasks = useRpgStore((s) => s.tasks)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const shopItems = useRpgStore((s) => s.shopItems)
  const tasks = activeProfileId ? allTasks.filter((t) => t.profileId === activeProfileId && !t.archived && !t.isCompleted) : []

  // --- Fragment source (runtime extended field) ---
  const rawSource = (recipe as any).fragmentSource
  const fragmentSource: { type?: string; dropChance?: number; linkedTaskIds?: string[] } =
    rawSource != null && typeof rawSource === 'object'
      ? rawSource
      : { type: 'random_drop', dropChance: 0 }
  const sourceType = (fragmentSource?.type ?? 'random_drop') as FragmentSourceType

  // --- Progress ---
  const progress = recipe.fragmentsRequired > 0
    ? Math.min(1, recipe.fragmentsCollected / recipe.fragmentsRequired)
    : 0
  const canCraft = recipe.fragmentsCollected >= recipe.fragmentsRequired && !recipe.crafted
  const rarityColor = RARITY_COLORS[recipe.resultRarity]

  // --- Result item lookup ---
  const resultItem = recipe.resultItemId ? shopItems.find((i) => i.id === recipe.resultItemId) : null

  // --- UI state ---
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)
  const [showTaskPicker, setShowTaskPicker] = useState(false)

  // --- Edit state ---
  const [editFragmentName, setEditFragmentName] = useState(recipe.fragmentName)
  const [editFragmentIcon, setEditFragmentIcon] = useState(recipe.fragmentIcon)
  const [editFragmentsRequired, setEditFragmentsRequired] = useState(recipe.fragmentsRequired)
  const [editResultRarity, setEditResultRarity] = useState<ItemRarity>(recipe.resultRarity)
  const [editSourceType, setEditSourceType] = useState<FragmentSourceType>(sourceType)
  const [editDropChance, setEditDropChance] = useState(fragmentSource?.dropChance ?? 15)
  const [editLinkedTaskIds, setEditLinkedTaskIds] = useState<string[]>(fragmentSource?.linkedTaskIds ?? [])

  // --- Unsaved changes detection ---
  const prevRecipeRef = useRef(recipe)
  const pendingRecipeRef = useRef<CraftRecipe | null>(null)

  const resetEditState = (r: CraftRecipe) => {
    const src = (r as any).fragmentSource
    const fs: { type?: string; dropChance?: number; linkedTaskIds?: string[] } =
      src != null && typeof src === 'object' ? src : { type: 'random_drop', dropChance: 0 }

    setIsEditing(false)
    setEditFragmentName(r.fragmentName)
    setEditFragmentIcon(r.fragmentIcon)
    setEditFragmentsRequired(r.fragmentsRequired)
    setEditResultRarity(r.resultRarity)
    setEditSourceType((fs?.type ?? 'random_drop') as FragmentSourceType)
    setEditDropChance(fs?.dropChance ?? 15)
    setEditLinkedTaskIds(fs?.linkedTaskIds ?? [])
    setShowTaskPicker(false)
  }

  useEffect(() => {
    const prev = prevRecipeRef.current
    if (prev.id !== recipe.id) {
      if (isEditing) {
        const prevSrc = (prev as any).fragmentSource
        const prevFs: { type?: string; dropChance?: number; linkedTaskIds?: string[] } =
          prevSrc != null && typeof prevSrc === 'object' ? prevSrc : { type: 'random_drop', dropChance: 0 }
        const prevSourceType = (prevFs?.type ?? 'random_drop') as FragmentSourceType

        const changed =
          editFragmentName !== prev.fragmentName ||
          editFragmentIcon !== prev.fragmentIcon ||
          editFragmentsRequired !== prev.fragmentsRequired ||
          editResultRarity !== prev.resultRarity ||
          editSourceType !== prevSourceType ||
          (editSourceType === 'random_drop' && editDropChance !== (prevFs?.dropChance ?? 15)) ||
          (editSourceType === 'task_linked' && JSON.stringify(editLinkedTaskIds) !== JSON.stringify(prevFs?.linkedTaskIds ?? []))

        if (changed) {
          pendingRecipeRef.current = recipe
          setShowUnsavedConfirm(true)
          return
        }
      }
      resetEditState(recipe)
      prevRecipeRef.current = recipe
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe])

  const handleUnsavedSave = () => {
    setShowUnsavedConfirm(false)
    const prevRecipeId = prevRecipeRef.current.id
    handleSaveForId(prevRecipeId)
    const pending = pendingRecipeRef.current
    if (pending) {
      resetEditState(pending)
      prevRecipeRef.current = pending
      pendingRecipeRef.current = null
    }
  }

  const handleUnsavedDiscard = () => {
    setShowUnsavedConfirm(false)
    const pending = pendingRecipeRef.current
    if (pending) {
      resetEditState(pending)
      prevRecipeRef.current = pending
      pendingRecipeRef.current = null
    }
  }

  // --- Save handler ---
  const handleSaveForId = (id: string) => {
    if (!editFragmentName.trim()) return
    const data = {
      fragmentName: editFragmentName.trim(),
      fragmentIcon: editFragmentIcon,
      fragmentsRequired: editFragmentsRequired,
      resultItemName: (recipe as any).resultItemName,
      resultRarity: editResultRarity,
      fragmentSource: editSourceType === 'task_linked'
        ? { type: 'task_linked' as const, linkedTaskIds: editLinkedTaskIds }
        : editSourceType === 'habit_linked'
          ? { type: 'habit_linked' as const }
          : { type: 'random_drop' as const, dropChance: editDropChance },
    }
    updateRecipe(id, (r) => ({ ...r, ...data }))
  }

  const handleSave = () => {
    handleSaveForId(recipe.id)
    setIsEditing(false)
  }

  // --- Craft handler ---
  const handleCraft = () => {
    craftItem(recipe.id)
  }

  // --- Manual fragment add/remove ---
  const handleAddFragment = () => {
    addFragment(recipe.id, 1)
  }

  const handleRemoveFragment = () => {
    if (recipe.fragmentsCollected <= 0) return
    updateRecipe(recipe.id, (r) => ({
      ...r,
      fragmentsCollected: Math.max(0, r.fragmentsCollected - 1),
    }))
  }

  // --- Source labels ---
  const SOURCE_LABELS: Record<FragmentSourceType, { icon: string; label: string; description: string }> = {
    random_drop: { icon: '🎲', label: 'Случайный дроп', description: 'Шанс при выполнении задач' },
    task_linked: { icon: '🎯', label: 'Привязка к задачам', description: 'Конкретные задачи' },
    habit_linked: { icon: '🔁', label: 'Привязка к привычкам', description: 'Награда за выполнение привычек' },
  }

  return (
    <div className="glass-card relative flex h-full flex-col rounded-2xl overflow-hidden">
      {/* Rarity accent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] z-10"
        style={{ background: `linear-gradient(90deg, ${rarityColor}, ${rarityColor}40)` }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-6">

        {/* ═══ VIEW MODE ═══ */}
        {!isEditing && (
          <div className="flex flex-col gap-5">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Large fragment icon + name */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl transition-all',
                      'ring-1 ring-inset shadow-md',
                    )}
                    style={{
                      background: `linear-gradient(to bottom, ${rarityColor}35, ${rarityColor}15)`,
                      color: rarityColor,
                      boxShadow: `0 2px 8px ${rarityColor}25`,
                      '--tw-ring-color': `${rarityColor}40`,
                    } as React.CSSProperties}
                  >
                    {recipe.fragmentIcon}
                  </div>
                  <h2 className="text-xl font-bold text-[var(--fg)] break-words min-w-0">
                    {recipe.fragmentName}
                  </h2>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(
                    'inline-flex items-center rounded-2xl px-3.5 py-1.5 text-sm font-medium',
                    RARITY_BADGE_CLASSES[recipe.resultRarity],
                  )}>
                    {RARITY_LABELS[recipe.resultRarity]}
                  </span>

                  <span className="w-px h-5 bg-[var(--border)] rounded-full self-center select-none" />

                  {/* Source badge */}
                  <span className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-b from-[var(--accent)]/15 to-[var(--accent)]/5 px-3.5 py-1.5 text-sm font-medium text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/10">
                    {sourceType === 'random_drop' && (
                      <>🎲 Случайный дроп{typeof fragmentSource?.dropChance === 'number' && fragmentSource.dropChance > 0 && ` ${fragmentSource.dropChance}%`}</>
                    )}
                    {sourceType === 'task_linked' && '🎯 Привязка к задачам'}
                    {sourceType === 'habit_linked' && '🔁 Привязка к привычкам'}
                  </span>

                  {recipe.crafted && (
                    <>
                      <span className="w-px h-5 bg-[var(--border)] rounded-full self-center select-none" />
                      <span className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-b from-emerald-500/20 to-emerald-500/10 px-3.5 py-1.5 text-sm font-medium text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Скрафчено
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1 shrink-0">
                <button type="button" onClick={() => setIsEditing(true)} className="icon-btn" title="Редактировать">
                  <Pencil className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="icon-btn icon-btn-danger" title="Удалить">
                  <Trash2 className="h-5 w-5" />
                </button>
                {onDeselect && (
                  <button type="button" onClick={onDeselect} className="icon-btn" title="Закрыть">
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress Section with manual controls */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-[var(--fg)] mb-4">Прогресс сбора</h3>

              <div className="flex items-center justify-center gap-6 mb-4">
                {/* Decrement */}
                <button
                  type="button"
                  onClick={handleRemoveFragment}
                  disabled={recipe.fragmentsCollected <= 0 || recipe.crafted}
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200',
                    recipe.fragmentsCollected > 0 && !recipe.crafted
                      ? 'bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10 hover:from-red-500/30 hover:to-red-500/15 hover:scale-110 active:scale-95'
                      : 'bg-[var(--surface)] text-[var(--fg-muted)] opacity-40 cursor-not-allowed'
                  )}
                >
                  <Minus className="h-6 w-6" />
                </button>

                {/* Counter display */}
                <div className="text-center">
                  <div className="text-4xl font-bold" style={{ color: canCraft ? '#10b981' : 'var(--fg)' }}>
                    {recipe.fragmentsCollected}
                  </div>
                  <div className="text-lg text-[var(--fg-muted)]">из {recipe.fragmentsRequired}</div>
                </div>

                {/* Increment */}
                <button
                  type="button"
                  onClick={handleAddFragment}
                  disabled={recipe.fragmentsCollected >= recipe.fragmentsRequired || recipe.crafted}
                  className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200',
                    recipe.fragmentsCollected < recipe.fragmentsRequired && !recipe.crafted
                      ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-white ring-1 ring-inset ring-emerald-300/30 shadow-lg shadow-emerald-500/30 hover:scale-110 active:scale-95'
                      : 'bg-[var(--surface)] text-[var(--fg-muted)] opacity-40 cursor-not-allowed'
                  )}
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress * 100}%`,
                    background: canCraft
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : `linear-gradient(90deg, ${rarityColor}, ${rarityColor}cc)`,
                  }}
                />
              </div>
            </div>

            {/* Result Item Section */}
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Результат крафта</h3>
              <div className="flex items-center gap-3 rounded-2xl p-3 bg-gradient-to-b from-[var(--accent)]/10 to-[var(--accent)]/5 ring-1 ring-inset ring-[var(--accent)]/15">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset shadow-sm text-lg"
                  style={{
                    background: `linear-gradient(to bottom, ${rarityColor}30, ${rarityColor}15)`,
                    '--tw-ring-color': `${rarityColor}35`,
                  } as React.CSSProperties}
                >
                  {resultItem?.icon ?? recipe.resultIcon ?? '🎁'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--fg)] truncate">
                    {resultItem?.name ?? (recipe as any).resultItemName ?? recipe.resultName ?? 'Награда'}
                  </p>
                  <span className={cn(
                    'inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold mt-1',
                    RARITY_BADGE_CLASSES[recipe.resultRarity],
                  )}>
                    {RARITY_LABELS[recipe.resultRarity]}
                  </span>
                </div>
              </div>
            </div>

            {/* Crafted complete state */}
            {recipe.crafted && (
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-b from-emerald-500/18 to-emerald-500/6 ring-1 ring-inset ring-emerald-400/20 shadow-sm shadow-emerald-500/10 py-4 text-emerald-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Скрафчено!</span>
                </div>
                {recipe.craftedAt && (
                  <span className="text-xs opacity-70">
                    {new Date(recipe.craftedAt).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-[var(--fg)] mb-3">Статистика</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--surface-elevated)] p-3 text-center">
                  <div className="text-lg font-bold text-[var(--fg)]">{recipe.fragmentsCollected}</div>
                  <div className="text-xs text-[var(--fg-muted)]">Собрано</div>
                </div>
                <div className="rounded-xl bg-[var(--surface-elevated)] p-3 text-center">
                  <div className="text-lg font-bold text-[var(--fg)]">{recipe.fragmentsRequired}</div>
                  <div className="text-xs text-[var(--fg-muted)]">Нужно</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ EDIT MODE ═══ */}
        {isEditing && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--fg)]">Редактирование</h2>
              <button type="button" onClick={() => { resetEditState(recipe); }} className="icon-btn">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Название фрагмента</label>
              <input type="text" value={editFragmentName} onChange={(e) => setEditFragmentName(e.target.value)} placeholder="Осколок тьмы" className="input w-full" />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Иконка фрагмента</label>
              <div className="flex flex-wrap gap-2">
                {FRAGMENT_ICONS.map((icon) => (
                  <button key={icon} type="button" onClick={() => setEditFragmentIcon(icon)} className={cn('h-10 w-10 rounded-xl text-xl transition-all', editFragmentIcon === icon ? 'bg-[var(--accent)] shadow-lg scale-110' : 'bg-[var(--surface)] hover:bg-[var(--surface-elevated)]')}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Фрагментов для крафта</label>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => setEditFragmentsRequired((prev) => Math.max(1, prev - 1))} className="input-group-btn input-group-btn-minus">−</button>
                <input type="number" value={editFragmentsRequired} onChange={(e) => setEditFragmentsRequired(Math.max(1, Number(e.target.value) || 1))} min={1} className="input w-full flex-1 min-w-0 h-9 py-0" />
                <button type="button" onClick={() => setEditFragmentsRequired((prev) => prev + 1)} className="input-group-btn input-group-btn-plus">+</button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Редкость результата</label>
              <select value={editResultRarity} onChange={(e) => setEditResultRarity(e.target.value as ItemRarity)} className="select w-full">
                {Object.entries(RARITY_LABELS).filter(([value]) => value !== 'uncommon').map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Источник фрагментов</label>
              <div className="grid grid-cols-3 gap-3">
                {(['random_drop', 'task_linked', 'habit_linked'] as FragmentSourceType[]).map((st) => (
                  <button key={st} type="button" onClick={() => setEditSourceType(st)} className={cn('rounded-xl p-4 text-left transition-all', editSourceType === st ? 'bg-[var(--accent-subtle)] border-2 border-[var(--accent)]' : 'bg-[var(--surface)] border-2 border-transparent')}>
                    <div className="text-lg mb-1">{SOURCE_LABELS[st].icon}</div>
                    <div className="font-medium text-sm">{SOURCE_LABELS[st].label}</div>
                    <div className="text-xs text-[var(--fg-muted)]">{SOURCE_LABELS[st].description}</div>
                  </button>
                ))}
              </div>
            </div>

            {editSourceType === 'random_drop' && (
              <div>
                <label className="block text-sm font-medium text-[var(--fg-muted)] mb-2">Шанс выпадения (%)</label>
                <input type="number" value={editDropChance} onChange={(e) => setEditDropChance(Number(e.target.value) || 1)} min={1} max={100} className="input w-full" />
              </div>
            )}

            {editSourceType === 'task_linked' && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--fg)]">Привязанные задачи</p>
                  <p className="text-xs text-[var(--fg-muted)] mt-0.5">Выбрано задач: {editLinkedTaskIds.length || 0}</p>
                </div>
                <button type="button" onClick={() => setShowTaskPicker(true)} className="btn-secondary text-sm px-3 py-1.5">Выбрать задачи</button>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => resetEditState(recipe)} className="btn-secondary flex-1">Отмена</button>
              <button type="button" onClick={handleSave} className="btn-primary flex-1">Сохранить</button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {!isEditing && canCraft && (
        <div className="shrink-0 border-t border-[var(--border)] p-4">
          <button
            type="button"
            onClick={handleCraft}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="h-5 w-5" />
            Крафтить!
          </button>
        </div>
      )}

      {/* ═══ MODALS ═══ */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Удалить рецепт?"
        message="Рецепт будет удалён безвозвратно."
        variant="danger"
        confirmText="Удалить"
        onConfirm={() => { deleteRecipe(recipe.id); setShowDeleteConfirm(false); onDeselect?.() }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        isOpen={showUnsavedConfirm}
        onConfirm={handleUnsavedSave}
        onCancel={handleUnsavedDiscard}
        title="Несохранённые изменения"
        message="Вы изменили рецепт, но не сохранили. Сохранить изменения?"
        confirmText="Сохранить"
        cancelText="Отменить"
        variant="save"
      />

      {showTaskPicker && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowTaskPicker(false)}>
          <div className="modal-content max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--fg)]">Выбрать задачи</h3>
              <button type="button" onClick={() => setShowTaskPicker(false)} className="icon-btn"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-[var(--fg-muted)] mb-3">Отметьте одну или несколько задач, за выполнение которых будут выдаваться фрагменты.</p>
            <div className="max-h-72 overflow-y-auto rounded-xl bg-[var(--surface)] p-2 mb-4">
              {tasks.map((task) => (
                <label key={task.id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-[var(--surface-elevated)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editLinkedTaskIds.includes(task.id)}
                    onChange={(e) => {
                      if (e.target.checked) setEditLinkedTaskIds((prev) => [...prev, task.id])
                      else setEditLinkedTaskIds((prev) => prev.filter((id) => id !== task.id))
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
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowTaskPicker(false)} className="btn-secondary flex-1">Готово</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
