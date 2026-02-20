import { useState, useEffect, useRef, useMemo } from 'react'
import { resizeImageFile } from '../../lib/resizeImage'
import { cn } from '../../lib/cn'
import { X, Pencil, Trash2, Sparkles, CheckCircle2, Plus, Minus, Dice5, Crosshair, Flame, Search, Package, Folder } from 'lucide-react'
import { useRpgStore } from '../../store/useRpgStore'
import type { CraftRecipe, ItemRarity, FragmentSourceType } from '../../types/domain'
import { RARITY_LABELS, RARITY_COLORS, RARITY_BADGE_CLASSES, migrateIcon } from './shopUtils'
import ConfirmModal from '../ConfirmModal'
import { HabitIcon } from '../HabitIcon'
import IconSourcePicker from './IconSourcePicker'
import EmojiPickerModal from './EmojiPickerModal'

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
  const tasks = activeProfileId ? allTasks.filter((t) => t.profileId === activeProfileId && !t.archived && !t.isCompleted) : []
  const allShopItems = useRpgStore((s) => s.shopItems)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const getCurrency = useRpgStore((s) => s.getCurrency)
  const itemGroups = useMemo(() => activeProfileId ? allItemGroups.filter((g) => g.profileId === activeProfileId).sort((a, b) => a.sortOrder - b.sortOrder) : [], [allItemGroups, activeProfileId])
  const profileItems = useMemo(() => activeProfileId ? allShopItems.filter((i) => (i as any).profileId === activeProfileId || !(i as any).profileId) : allShopItems, [allShopItems, activeProfileId])

  // --- Fragment source (runtime extended field) ---
  const rawSource = (recipe as any).fragmentSource
  const fragmentSource: { type?: string; dropChance?: number; linkedTaskIds?: string[]; streakRequired?: number } =
    rawSource != null && typeof rawSource === 'object'
      ? rawSource
      : { type: 'random_drop', dropChance: 0 }
  // Migrate old habit_linked to random_drop
  const rawType = fragmentSource?.type ?? 'random_drop'
  const sourceType = (rawType === 'habit_linked' ? 'random_drop' : rawType) as FragmentSourceType

  // --- Result item ---
  const resultItem = useMemo(() => recipe.resultItemId ? allShopItems.find((i) => i.id === recipe.resultItemId) : null, [recipe.resultItemId, allShopItems])
  const craftCost = (recipe as any).craftCost as Record<string, number> | undefined
  const coinCost = craftCost?.coins ?? 0
  const gemCost = craftCost?.gems ?? 0
  const hasCost = coinCost > 0 || gemCost > 0
  const canAfford = getCurrency('coins') >= coinCost && getCurrency('gems') >= gemCost

  // --- Progress ---
  const progress = recipe.fragmentsRequired > 0
    ? Math.min(1, recipe.fragmentsCollected / recipe.fragmentsRequired)
    : 0
  const canCraft = recipe.fragmentsCollected >= recipe.fragmentsRequired && !recipe.crafted
  const rarityColor = RARITY_COLORS[recipe.resultRarity]

  // --- UI state ---
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)
  const [showTaskPicker, setShowTaskPicker] = useState(false)
  const [showIconSource, setShowIconSource] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showItemPicker, setShowItemPicker] = useState(false)
  const [itemGroupFilter, setItemGroupFilter] = useState<string | null>(null)
  const [itemSearch, setItemSearch] = useState('')
  const iconFileInputRef = useRef<HTMLInputElement>(null)

  // --- Edit state ---
  const [editFragmentName, setEditFragmentName] = useState(recipe.fragmentName)
  const [editFragmentIcon, setEditFragmentIcon] = useState(migrateIcon(recipe.fragmentIcon, 'Puzzle'))
  const [editFragmentIconImage, setEditFragmentIconImage] = useState((recipe as any).fragmentIconImage ?? '')
  const [editFragmentsRequired, setEditFragmentsRequired] = useState(recipe.fragmentsRequired)
  const [editResultRarity, setEditResultRarity] = useState<ItemRarity>(recipe.resultRarity)
  const [editSourceType, setEditSourceType] = useState<FragmentSourceType>(sourceType)
  const [editDropChance, setEditDropChance] = useState(fragmentSource?.dropChance ?? 15)
  const [editLinkedTaskIds, setEditLinkedTaskIds] = useState<string[]>(fragmentSource?.linkedTaskIds ?? [])
  const [editStreakRequired, setEditStreakRequired] = useState(fragmentSource?.streakRequired ?? 7)
  const [editResultItemId, setEditResultItemId] = useState<string | null>(recipe.resultItemId || null)
  const [editCraftCostCoins, setEditCraftCostCoins] = useState(coinCost)
  const [editCraftCostGems, setEditCraftCostGems] = useState(gemCost)

  const editSelectedItem = useMemo(() => editResultItemId ? allShopItems.find((i) => i.id === editResultItemId) : null, [editResultItemId, allShopItems])

  const filteredPickerItems = useMemo(() => {
    let items = profileItems
    if (itemGroupFilter) items = items.filter((i) => i.groupId === itemGroupFilter)
    if (itemSearch.trim()) {
      const q = itemSearch.trim().toLowerCase()
      items = items.filter((i) => i.name.toLowerCase().includes(q))
    }
    return items
  }, [profileItems, itemGroupFilter, itemSearch])

  // --- Unsaved changes detection ---
  const prevRecipeRef = useRef(recipe)
  const pendingRecipeRef = useRef<CraftRecipe | null>(null)

  const resetEditState = (r: CraftRecipe) => {
    const src = (r as any).fragmentSource
    const fs: { type?: string; dropChance?: number; linkedTaskIds?: string[]; streakRequired?: number } =
      src != null && typeof src === 'object' ? src : { type: 'random_drop', dropChance: 0 }
    const fsType = fs?.type ?? 'random_drop'
    const cc = (r as any).craftCost as Record<string, number> | undefined

    setIsEditing(false)
    setEditFragmentName(r.fragmentName)
    setEditFragmentIcon(migrateIcon(r.fragmentIcon, 'Puzzle'))
    setEditFragmentIconImage((r as any).fragmentIconImage ?? '')
    setEditFragmentsRequired(r.fragmentsRequired)
    setEditResultRarity(r.resultRarity)
    setEditSourceType((fsType === 'habit_linked' ? 'random_drop' : fsType) as FragmentSourceType)
    setEditDropChance(fs?.dropChance ?? 15)
    setEditLinkedTaskIds(fs?.linkedTaskIds ?? [])
    setEditStreakRequired(fs?.streakRequired ?? 7)
    setEditResultItemId(r.resultItemId || null)
    setEditCraftCostCoins(cc?.coins ?? 0)
    setEditCraftCostGems(cc?.gems ?? 0)
    setShowTaskPicker(false)
    setShowIconSource(false)
    setShowIconPicker(false)
    setShowItemPicker(false)
    setItemSearch('')
  }

  useEffect(() => {
    const prev = prevRecipeRef.current
    if (prev.id !== recipe.id) {
      if (isEditing) {
        const prevSrc = (prev as any).fragmentSource
        const prevFs: { type?: string; dropChance?: number; linkedTaskIds?: string[]; streakRequired?: number } =
          prevSrc != null && typeof prevSrc === 'object' ? prevSrc : { type: 'random_drop', dropChance: 0 }
        const prevSourceType = (prevFs?.type ?? 'random_drop') as FragmentSourceType

        const changed =
          editFragmentName !== prev.fragmentName ||
          editFragmentIcon !== prev.fragmentIcon ||
          editFragmentIconImage !== ((prev as any).fragmentIconImage ?? '') ||
          editFragmentsRequired !== prev.fragmentsRequired ||
          editResultRarity !== prev.resultRarity ||
          editSourceType !== prevSourceType ||
          (editSourceType === 'random_drop' && editDropChance !== (prevFs?.dropChance ?? 15)) ||
          (editSourceType === 'task_linked' && JSON.stringify(editLinkedTaskIds) !== JSON.stringify(prevFs?.linkedTaskIds ?? [])) ||
          (editSourceType === 'streak_reward' && editStreakRequired !== (prevFs?.streakRequired ?? 7))

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
    const fragmentSourceData =
      editSourceType === 'task_linked'
        ? { type: 'task_linked' as const, linkedTaskIds: editLinkedTaskIds, dropChance: editDropChance }
        : editSourceType === 'streak_reward'
          ? { type: 'streak_reward' as const, streakRequired: editStreakRequired }
          : { type: 'random_drop' as const, dropChance: editDropChance }

    const selItem = editResultItemId ? allShopItems.find((i) => i.id === editResultItemId) : null

    const data = {
      fragmentName: editFragmentName.trim(),
      fragmentIcon: editFragmentIcon,
      fragmentIconImage: editFragmentIconImage || undefined,
      fragmentsRequired: editFragmentsRequired,
      resultRarity: editResultRarity,
      fragmentSource: fragmentSourceData,
      resultItemId: editResultItemId ?? '',
      resultName: selItem?.name ?? '',
      resultIcon: selItem?.icon ?? '',
      craftCost: { coins: editCraftCostCoins, gems: editCraftCostGems },
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
  const SOURCE_LABELS: Record<string, { iconName: string; label: string; description: string }> = {
    random_drop: { iconName: 'Dice5', label: 'Случайный дроп', description: 'Шанс при выполнении задач' },
    task_linked: { iconName: 'Crosshair', label: 'Привязка к задачам', description: 'Конкретные задачи' },
    streak_reward: { iconName: 'Flame', label: 'За стрик', description: 'Награда за серию выполнений' },
  }

  const fragmentIconImage = (recipe as any).fragmentIconImage ?? ''

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
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl transition-all overflow-hidden',
                      'ring-1 ring-inset shadow-md',
                    )}
                    style={{
                      background: `linear-gradient(to bottom, ${rarityColor}35, ${rarityColor}15)`,
                      color: rarityColor,
                      boxShadow: `0 2px 8px ${rarityColor}25`,
                      '--tw-ring-color': `${rarityColor}40`,
                    } as React.CSSProperties}
                  >
                    {fragmentIconImage ? (
                      <img src={fragmentIconImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <HabitIcon iconName={migrateIcon(recipe.fragmentIcon, 'Puzzle')} size={24} />
                    )}
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
                      <><Dice5 className="h-3.5 w-3.5" /> Случайный дроп{typeof fragmentSource?.dropChance === 'number' && fragmentSource.dropChance > 0 && ` ${fragmentSource.dropChance}%`}</>
                    )}
                    {sourceType === 'task_linked' && <><Crosshair className="h-3.5 w-3.5" /> Привязка к задачам{typeof fragmentSource?.dropChance === 'number' && fragmentSource.dropChance > 0 && ` ${fragmentSource.dropChance}%`}</>}
                    {sourceType === 'streak_reward' && <><Flame className="h-3.5 w-3.5" /> За стрик{typeof fragmentSource?.streakRequired === 'number' && ` ${fragmentSource.streakRequired}д`}</>}
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

            {/* Result item (view) */}
            {resultItem && (
              <div className="glass rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Результат крафта</h3>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden ring-1 ring-inset shadow-sm"
                    style={{
                      background: `linear-gradient(to bottom, ${RARITY_COLORS[resultItem.rarity]}35, ${RARITY_COLORS[resultItem.rarity]}15)`,
                      '--tw-ring-color': `${RARITY_COLORS[resultItem.rarity]}40`,
                    } as React.CSSProperties}
                  >
                    {resultItem.iconImage ? (
                      <img src={resultItem.iconImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <HabitIcon iconName={migrateIcon(resultItem.icon, 'Package')} size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--fg)] truncate">{resultItem.name}</p>
                    <span className={cn('inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold mt-0.5', RARITY_BADGE_CLASSES[resultItem.rarity])}>
                      {RARITY_LABELS[resultItem.rarity]}
                    </span>
                  </div>
                </div>
                {hasCost && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                    {coinCost > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 ring-1 ring-inset ring-amber-400/20">
                        🪙 {coinCost}
                      </span>
                    )}
                    {gemCost > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-500 ring-1 ring-inset ring-blue-400/20">
                        💎 {gemCost}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

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

            {/* Name + icon */}
            <div className="glass rounded-2xl p-4">
              <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Фрагмент</label>
              <div className="flex gap-3 items-stretch">
                <button
                  type="button"
                  onClick={() => setShowIconSource(true)}
                  className="relative shrink-0 group/preview flex items-center justify-center w-[48px] h-[48px] rounded-xl overflow-hidden transition-all cursor-pointer ring-1 ring-inset shadow-md hover:ring-[var(--accent)] hover:scale-105 active:scale-95"
                  style={{
                    background: `linear-gradient(to bottom, ${rarityColor}35, ${rarityColor}15)`,
                    boxShadow: `0 2px 8px ${rarityColor}25, inset 0 1px 0 ${rarityColor}20`,
                    '--tw-ring-color': `${rarityColor}40`,
                  } as React.CSSProperties}
                  title="Изменить иконку"
                >
                  {editFragmentIconImage ? (
                    <img src={editFragmentIconImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <HabitIcon iconName={editFragmentIcon || 'Puzzle'} size={24} />
                  )}
                  {editFragmentIconImage && (
                    <span
                      onClick={(e) => { e.stopPropagation(); setEditFragmentIconImage('') }}
                      className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover/preview:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
                <input type="text" value={editFragmentName} onChange={(e) => setEditFragmentName(e.target.value)} placeholder="Осколок тьмы" className="input flex-1 min-w-0 text-base" />
                <input
                  ref={iconFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || !file.type.startsWith('image/')) return
                    const dataUrl = await resizeImageFile(file)
                    setEditFragmentIconImage(dataUrl)
                    e.target.value = ''
                  }}
                />
              </div>
            </div>

            {/* Fragments required */}
            <div className="glass rounded-2xl p-4">
              <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Фрагментов для крафта</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setEditFragmentsRequired((prev) => Math.max(1, prev - 1))} className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm hover:scale-105 active:scale-95">
                  <span className="text-lg font-bold">−</span>
                </button>
                <input type="number" value={editFragmentsRequired} onChange={(e) => setEditFragmentsRequired(Math.max(1, Number(e.target.value) || 1))} min={1} className="input w-full flex-1 min-w-0 h-11 py-0 text-center text-lg font-bold" />
                <button type="button" onClick={() => setEditFragmentsRequired((prev) => prev + 1)} className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-emerald-400/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm hover:scale-105 active:scale-95">
                  <span className="text-lg font-bold">+</span>
                </button>
              </div>
            </div>

            {/* Rarity */}
            <div className="glass rounded-2xl p-4">
              <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Редкость</label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as ItemRarity[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEditResultRarity(r)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[10px] font-bold transition-all',
                      editResultRarity === r
                        ? cn(RARITY_BADGE_CLASSES[r], 'ring-2 scale-105 shadow-md')
                        : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] border border-[var(--border)]'
                    )}
                  >
                    {RARITY_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            {/* Result item (edit) */}
            <div className="glass rounded-2xl p-4">
              <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Результат крафта</label>
              {editSelectedItem ? (
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden ring-1 ring-inset shadow-sm"
                    style={{
                      background: `linear-gradient(to bottom, ${RARITY_COLORS[editSelectedItem.rarity]}35, ${RARITY_COLORS[editSelectedItem.rarity]}15)`,
                      '--tw-ring-color': `${RARITY_COLORS[editSelectedItem.rarity]}40`,
                    } as React.CSSProperties}
                  >
                    {editSelectedItem.iconImage ? (
                      <img src={editSelectedItem.iconImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <HabitIcon iconName={migrateIcon(editSelectedItem.icon, 'Package')} size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--fg)] truncate">{editSelectedItem.name}</p>
                    <span className={cn('inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold mt-0.5', RARITY_BADGE_CLASSES[editSelectedItem.rarity])}>
                      {RARITY_LABELS[editSelectedItem.rarity]}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowItemPicker(true)}
                    className="text-xs font-medium text-[var(--accent)] hover:underline shrink-0"
                  >
                    Изменить
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowItemPicker(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] py-3 text-sm font-medium text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                  <Package className="h-4 w-4" />
                  Выбрать предмет
                </button>
              )}
            </div>

            {/* Craft cost (edit) */}
            <div className="glass rounded-2xl p-4">
              <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Стоимость крафта</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-wider mb-1.5">🪙 Монеты</label>
                  <input
                    type="number"
                    value={editCraftCostCoins}
                    onChange={(e) => setEditCraftCostCoins(Math.max(0, Number(e.target.value) || 0))}
                    min={0}
                    className="input w-full h-10 py-0 text-center text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-wider mb-1.5">💎 Кристаллы</label>
                  <input
                    type="number"
                    value={editCraftCostGems}
                    onChange={(e) => setEditCraftCostGems(Math.max(0, Number(e.target.value) || 0))}
                    min={0}
                    className="input w-full h-10 py-0 text-center text-sm font-bold"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[var(--fg-muted)] mt-2">Оставьте 0 для бесплатного крафта</p>
            </div>

            {/* Source type */}
            <div className="glass rounded-2xl p-4">
              <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Источник фрагментов</label>
              <div className="grid grid-cols-3 gap-2">
                {(['random_drop', 'task_linked', 'streak_reward'] as FragmentSourceType[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setEditSourceType(st)}
                    className={cn(
                      'rounded-xl p-3 text-left transition-all',
                      editSourceType === st
                        ? 'bg-gradient-to-b from-[var(--accent)]/20 to-[var(--accent)]/8 border-2 border-[var(--accent)] shadow-md shadow-[var(--accent)]/15'
                        : 'bg-[var(--surface)] border-2 border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-elevated)]'
                    )}
                  >
                    <div className={cn('mb-1.5', editSourceType === st ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]')}>
                      {st === 'random_drop' && <Dice5 className="h-5 w-5" />}
                      {st === 'task_linked' && <Crosshair className="h-5 w-5" />}
                      {st === 'streak_reward' && <Flame className="h-5 w-5" />}
                    </div>
                    <div className="font-medium text-xs">{SOURCE_LABELS[st].label}</div>
                    <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">{SOURCE_LABELS[st].description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Source-specific settings */}
            {editSourceType === 'random_drop' && (
              <div className="glass rounded-2xl p-4">
                <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Шанс выпадения</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={100} value={editDropChance} onChange={(e) => setEditDropChance(Number(e.target.value))} className="flex-1 accent-[var(--accent)]" />
                  <div className="flex items-center gap-1">
                    <input type="number" value={editDropChance} onChange={(e) => setEditDropChance(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} min={1} max={100} className="input w-16 text-center h-9 py-0 text-sm font-bold" />
                    <span className="text-sm font-bold text-[var(--fg-muted)]">%</span>
                  </div>
                </div>
              </div>
            )}

            {editSourceType === 'task_linked' && (
              <>
                <div className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--fg)]">Привязанные задачи</p>
                      <p className="text-xs text-[var(--fg-muted)] mt-0.5">Выбрано: {editLinkedTaskIds.length || 0}</p>
                    </div>
                    <button type="button" onClick={() => setShowTaskPicker(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent)]/90 px-4 py-2 text-sm font-medium text-white shadow-md shadow-[var(--accent)]/25 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                      Выбрать
                    </button>
                  </div>
                </div>
                <div className="glass rounded-2xl p-4">
                  <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Шанс выпадения</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={100} value={editDropChance} onChange={(e) => setEditDropChance(Number(e.target.value))} className="flex-1 accent-[var(--accent)]" />
                    <div className="flex items-center gap-1">
                      <input type="number" value={editDropChance} onChange={(e) => setEditDropChance(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} min={1} max={100} className="input w-16 text-center h-9 py-0 text-sm font-bold" />
                      <span className="text-sm font-bold text-[var(--fg-muted)]">%</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--fg-muted)] mt-2">
                    При выполнении каждой привязанной задачи с вероятностью {editDropChance}% выпадет фрагмент
                  </p>
                </div>
              </>
            )}

            {editSourceType === 'streak_reward' && (
              <div className="glass rounded-2xl p-4">
                <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Стрик для получения</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={90} value={editStreakRequired} onChange={(e) => setEditStreakRequired(Number(e.target.value))} className="flex-1 accent-[var(--accent)]" />
                  <div className="flex items-center gap-1">
                    <input type="number" value={editStreakRequired} onChange={(e) => setEditStreakRequired(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} min={1} max={365} className="input w-16 text-center h-9 py-0 text-sm font-bold" />
                    <span className="text-xs text-[var(--fg-muted)]">дн.</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--fg-muted)] mt-2">
                  Фрагмент выдаётся при достижении стрика {editStreakRequired} дней
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => resetEditState(recipe)} className="btn-secondary flex-1">Отмена</button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:shadow-[var(--accent)]/35 hover:scale-[1.02] active:scale-[0.98]"
              >
                Сохранить
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar — Craft button */}
      {!isEditing && canCraft && (
        <div className="shrink-0 border-t border-[var(--border)] p-4">
          {hasCost && !canAfford && (
            <p className="text-xs text-red-500 text-center mb-2 font-medium">Недостаточно средств для крафта</p>
          )}
          <button
            type="button"
            onClick={handleCraft}
            disabled={hasCost && !canAfford}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white transition-all duration-200',
              hasCost && !canAfford
                ? 'bg-gray-400 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]'
            )}
          >
            <Sparkles className="h-5 w-5" />
            Крафтить!
            {hasCost && (
              <span className="ml-1 flex items-center gap-2 text-sm opacity-90">
                {coinCost > 0 && <span>🪙 {coinCost}</span>}
                {gemCost > 0 && <span>💎 {gemCost}</span>}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ═══ MODALS ═══ */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Удалить фрагмент?"
        message="Фрагмент будет удалён безвозвратно."
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
        message="Вы изменили фрагмент, но не сохранили. Сохранить изменения?"
        confirmText="Сохранить"
        cancelText="Отменить"
        variant="save"
      />

      {/* Item picker modal (for edit mode) */}
      {showItemPicker && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowItemPicker(false)}>
          <div className="modal-content max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--fg)]">Выбрать предмет</h3>
              <button type="button" onClick={() => setShowItemPicker(false)} className="icon-btn"><X className="h-5 w-5" /></button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Поиск предмета..."
                className="input w-full pl-9 h-9 text-sm"
              />
            </div>

            {/* Group filter tabs */}
            {itemGroups.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                <button
                  type="button"
                  onClick={() => setItemGroupFilter(null)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                    !itemGroupFilter
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20'
                      : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)]'
                  )}
                >
                  Все
                </button>
                {itemGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setItemGroupFilter(g.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                      itemGroupFilter === g.id
                        ? 'bg-[var(--accent-subtle)] text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20'
                        : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)]'
                    )}
                  >
                    <Folder className="h-3 w-3" style={{ color: g.color || undefined }} />
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            {/* Item list */}
            <div className="max-h-72 overflow-y-auto rounded-xl bg-[var(--surface)] p-2 mb-4">
              {filteredPickerItems.map((item) => {
                const group = itemGroups.find((g) => g.id === item.groupId)
                const iconBg = group?.color ?? RARITY_COLORS[item.rarity]
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setEditResultItemId(item.id); setShowItemPicker(false); setItemSearch('') }}
                    className={cn(
                      'flex items-center gap-3 w-full rounded-lg p-2 text-left hover:bg-[var(--surface-elevated)] transition-colors',
                      editResultItemId === item.id && 'bg-[var(--accent-subtle)]'
                    )}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg overflow-hidden ring-1 ring-inset"
                      style={{
                        background: `linear-gradient(to bottom, ${iconBg}35, ${iconBg}15)`,
                        '--tw-ring-color': `${iconBg}40`,
                      } as React.CSSProperties}
                    >
                      {item.iconImage ? (
                        <img src={item.iconImage} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <HabitIcon iconName={migrateIcon(item.icon, 'Package')} size={16} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--fg)] truncate">{item.name}</p>
                    </div>
                    <span className={cn('inline-flex items-center rounded-lg px-2 py-0.5 text-[9px] font-bold shrink-0', RARITY_BADGE_CLASSES[item.rarity])}>
                      {RARITY_LABELS[item.rarity]}
                    </span>
                  </button>
                )
              })}
              {filteredPickerItems.length === 0 && (
                <p className="text-sm text-[var(--fg-muted)] text-center py-4">Нет предметов</p>
              )}
            </div>

            <button type="button" onClick={() => setShowItemPicker(false)} className="btn-secondary w-full">Закрыть</button>
          </div>
        </div>
      )}

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

      {/* Icon source picker (same as shop) */}
      {showIconSource && (
        <IconSourcePicker
          onSelectIcon={() => { setShowIconSource(false); setShowIconPicker(true) }}
          onSelectPhoto={() => { setShowIconSource(false); iconFileInputRef.current?.click() }}
          onClose={() => setShowIconSource(false)}
        />
      )}

      {/* Full Lucide icon picker */}
      {showIconPicker && (
        <EmojiPickerModal
          currentIcon={editFragmentIcon}
          onSelect={(name) => { setEditFragmentIcon(name); setEditFragmentIconImage('') }}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </div>
  )
}
