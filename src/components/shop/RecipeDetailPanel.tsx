import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { resizeImageFile } from '../../lib/resizeImage'
import { cn } from '../../lib/cn'
import { X, Pencil, Trash2, Sparkles, CheckCircle2, Dice5, Crosshair, Search, Package, Folder, CheckSquare, Hash, ListChecks, ChevronDown, ChevronRight, Puzzle, Gift, TrendingUp, Percent, Gamepad2, Clapperboard } from 'lucide-react'

const KIND_ICON_MAP = {
  checkbox: CheckSquare,
  counter: Hash,
  nested: ListChecks,
} as const
import { useRpgStore } from '../../store/useRpgStore'
import type { CraftRecipe, ItemRarity, FragmentSourceType } from '../../types/domain'
import { CURRENCY_IDS } from '../../types/domain'
import { RARITY_LABELS, RARITY_COLORS, RARITY_BADGE_CLASSES, migrateIcon, getItemTypeBadge, getItemTypeColor } from './shopUtils'
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
  const allTasks = useRpgStore((s) => s.tasks)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const tasks = activeProfileId ? allTasks.filter((t) => t.profileId === activeProfileId && !t.archived && !t.isCompleted) : []
  const allShopItems = useRpgStore((s) => s.shopItems)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const allTaskGroups = useRpgStore((s) => s.taskGroups)
  const getCurrency = useRpgStore((s) => s.getCurrency)
  const itemGroups = useMemo(() => activeProfileId ? allItemGroups.filter((g) => g.profileId === activeProfileId).sort((a, b) => a.sortOrder - b.sortOrder) : [], [allItemGroups, activeProfileId])
  const taskGroupsList = useMemo(() => activeProfileId ? allTaskGroups.filter((g) => g.profileId === activeProfileId).sort((a, b) => a.sortOrder - b.sortOrder) : [], [allTaskGroups, activeProfileId])
  const profileItems = useMemo(() => activeProfileId ? allShopItems.filter((i) => !i.deletedFromShop && (i.profileId === activeProfileId || !i.profileId)) : allShopItems.filter((i) => !i.deletedFromShop), [allShopItems, activeProfileId])

  // --- Fragment source ---
  const fragmentSource = recipe.fragmentSource ?? { type: 'random_drop' as const, dropChance: 0 }
  // Migrate old habit_linked to random_drop
  const rawType = fragmentSource?.type ?? 'random_drop'
  const sourceType = (rawType === 'habit_linked' ? 'random_drop' : rawType) as FragmentSourceType

  // --- Result item ---
  const resultItem = useMemo(() => recipe.resultItemId ? allShopItems.find((i) => i.id === recipe.resultItemId) : null, [recipe.resultItemId, allShopItems])
  const craftCost = recipe.craftCost
  const coinCost = craftCost?.coins ?? 0
  const gemCost = craftCost?.gems ?? 0
  const hasCost = coinCost > 0 || gemCost > 0
  const canAfford = getCurrency('coins') >= coinCost && getCurrency('gems') >= gemCost

  // --- Progress ---
  const progress = recipe.fragmentsRequired > 0
    ? Math.min(1, recipe.fragmentsCollected / recipe.fragmentsRequired)
    : 0
  const canCraft = recipe.fragmentsCollected >= recipe.fragmentsRequired && !recipe.crafted
  const themeColor = getItemTypeColor(resultItem)

  // --- UI state ---
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false)
  const [showTaskPicker, setShowTaskPicker] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [taskGroupFilter, setTaskGroupFilter] = useState<string | null>(null)
  const [collapsedTaskGroups, setCollapsedTaskGroups] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [showIconSource, setShowIconSource] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [showItemPicker, setShowItemPicker] = useState(false)
  const [itemGroupFilter, setItemGroupFilter] = useState<string | null>(null)
  const [itemSearch, setItemSearch] = useState('')
  const iconFileInputRef = useRef<HTMLInputElement>(null)

  // --- Edit state ---
  const [editFragmentName, setEditFragmentName] = useState(recipe.fragmentName)
  const [editFragmentIcon, setEditFragmentIcon] = useState(migrateIcon(recipe.fragmentIcon, 'Puzzle'))
  const [editFragmentIconImage, setEditFragmentIconImage] = useState(recipe.fragmentIconImage ?? '')
  const [editFragmentsRequired, setEditFragmentsRequired] = useState(recipe.fragmentsRequired)
  const [editResultRarity, setEditResultRarity] = useState<ItemRarity>(recipe.resultRarity)
  const [editSourceType, setEditSourceType] = useState<FragmentSourceType>(sourceType)
  const [editDropChance, setEditDropChance] = useState(fragmentSource?.dropChance ?? 15)
  const [editAllowSubtaskDrop, setEditAllowSubtaskDrop] = useState<boolean>(fragmentSource?.allowSubtaskDrop ?? false)
  const [editLinkedTaskIds, setEditLinkedTaskIds] = useState<string[]>(fragmentSource?.linkedTaskIds ?? [])
  const [editResultItemId, setEditResultItemId] = useState<string | null>(recipe.resultItemId || null)
  const [editCraftCostCoins, setEditCraftCostCoins] = useState(coinCost)
  const [editCraftCostGems, setEditCraftCostGems] = useState(gemCost)
  const [editMaxCrafts, setEditMaxCrafts] = useState(recipe.maxCrafts ?? 1)

  const editSelectedItem = useMemo(() => editResultItemId ? allShopItems.find((i) => i.id === editResultItemId) : null, [editResultItemId, allShopItems])
  const editThemeColor = getItemTypeColor(editSelectedItem)

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
    const fs = r.fragmentSource ?? { type: 'random_drop' as const, dropChance: 0 }
    const fsType = fs.type ?? 'random_drop'
    const cc = r.craftCost

    setIsEditing(false)
    setEditFragmentName(r.fragmentName)
    setEditFragmentIcon(migrateIcon(r.fragmentIcon, 'Puzzle'))
    setEditFragmentIconImage(r.fragmentIconImage ?? '')
    setEditFragmentsRequired(r.fragmentsRequired)
    setEditResultRarity(r.resultRarity)
    setEditSourceType((fsType === 'habit_linked' ? 'random_drop' : fsType) as FragmentSourceType)
    setEditDropChance(fs?.dropChance ?? 15)
    setEditAllowSubtaskDrop(fs?.allowSubtaskDrop ?? false)
    setEditLinkedTaskIds(fs?.linkedTaskIds ?? [])
    setEditResultItemId(r.resultItemId || null)
    setEditCraftCostCoins(cc?.coins ?? 0)
    setEditCraftCostGems(cc?.gems ?? 0)
    setEditMaxCrafts(r.maxCrafts ?? 1)
    setShowTaskPicker(false)
    setTaskSearch('')
    setCollapsedTaskGroups(new Set())
    setShowIconSource(false)
    setShowIconPicker(false)
    setShowItemPicker(false)
    setItemSearch('')
  }

  useEffect(() => {
    const prev = prevRecipeRef.current
    if (prev.id !== recipe.id) {
      if (isEditing) {
        const prevFs = prev.fragmentSource ?? { type: 'random_drop' as const, dropChance: 0 }
        const prevSourceType = (prevFs?.type ?? 'random_drop') as FragmentSourceType

        const changed =
          editFragmentName !== prev.fragmentName ||
          editFragmentIcon !== prev.fragmentIcon ||
          editFragmentIconImage !== (prev.fragmentIconImage ?? '') ||
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
    const fragmentSourceData =
      editSourceType === 'task_linked'
        ? { type: 'task_linked' as const, linkedTaskIds: editLinkedTaskIds, dropChance: editDropChance, allowSubtaskDrop: editAllowSubtaskDrop }
        : { type: 'random_drop' as const, dropChance: editDropChance, allowSubtaskDrop: editAllowSubtaskDrop }

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
      maxCrafts: editMaxCrafts,
    }
    updateRecipe(id, (r) => ({ ...r, ...data }))
  }

  const handleSave = () => {
    handleSaveForId(recipe.id)
    setIsEditing(false)
  }

  // --- Media item already in inventory? ---
  const inventory = useRpgStore((s) => s.inventory)
  const isResultMediaItem = !!(resultItem?.isVideoGame || resultItem?.isTvSerial)
  const resultAlreadyOwned = isResultMediaItem && !!resultItem && inventory.some((e) => e.itemId === resultItem.id)

  // --- Out of stock check ---
  const isResultOutOfStock = !!(resultItem && resultItem.stock !== undefined && resultItem.stock === 0)

  // Craft compensation state (shown after craft when item was already owned or out of stock)
  const [craftCompensation, setCraftCompensation] = useState<{ coins: number; gems: number; outOfStock?: boolean } | null>(null)

  // --- Craft handler ---
  const handleCraft = () => {
    const result = craftItem(recipe.id)
    if (result && typeof result === 'object' && 'compensated' in result) {
      setCraftCompensation({ coins: result.coins, gems: result.gems, outOfStock: result.outOfStock })
    }
  }

  // --- Source labels ---
  const SOURCE_LABELS: Record<string, { iconName: string; label: string; description: string }> = {
    random_drop: { iconName: 'Dice5', label: 'Случайный дроп', description: 'Шанс при выполнении задач' },
    task_linked: { iconName: 'Crosshair', label: 'Привязка к задачам', description: 'Конкретные задачи' },
  }

  const fragmentIconImage = recipe.fragmentIconImage ?? ''

  return (
    <div className="glass-card relative flex h-full flex-col rounded-2xl overflow-hidden">
      {/* Rarity accent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] z-10"
        style={{ background: `linear-gradient(90deg, ${themeColor}, ${themeColor}40)` }}
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
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                    {/* Outer glow */}
                    <div
                      className="absolute inset-0 rounded-xl blur-[8px] opacity-50"
                      style={{
                        background: `linear-gradient(135deg, ${themeColor}60, ${themeColor}20)`,
                      }}
                    />
                    {/* Crystal shape */}
                    <div
                      className="relative flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden"
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
                          0 2px 8px ${themeColor}40
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
                        <HabitIcon iconName={migrateIcon(recipe.fragmentIcon, 'Puzzle')} size={22} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                      )}
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-[var(--fg)] break-words min-w-0">
                    {recipe.fragmentName}
                  </h2>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Source badge */}
                  <span className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-b from-[var(--accent)]/15 to-[var(--accent)]/5 px-3.5 py-1.5 text-sm font-medium text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20 shadow-sm shadow-[var(--accent)]/10">
                    {sourceType === 'random_drop' && (
                      <><Dice5 className="h-3.5 w-3.5" /> Случайный дроп{typeof fragmentSource?.dropChance === 'number' && fragmentSource.dropChance > 0 && ` ${fragmentSource.dropChance}%`}</>
                    )}
                    {sourceType === 'task_linked' && <><Crosshair className="h-3.5 w-3.5" /> Привязка к задачам{typeof fragmentSource?.dropChance === 'number' && fragmentSource.dropChance > 0 && ` ${fragmentSource.dropChance}%`}</>}
                  </span>

                  {(recipe.maxCrafts ?? 1) > 1 && (
                    <>
                      <span className="w-px h-5 bg-[var(--border)] rounded-full self-center select-none" />
                      <span className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-b from-violet-500/15 to-violet-500/5 px-3.5 py-1.5 text-sm font-medium text-violet-500 ring-1 ring-inset ring-violet-400/20 shadow-sm shadow-violet-500/10">
                        {recipe.craftCount ?? 0}/{recipe.maxCrafts}
                      </span>
                    </>
                  )}

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
                      background: `linear-gradient(to bottom, ${themeColor}35, ${themeColor}15)`,
                      '--tw-ring-color': `${themeColor}40`,
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
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {(() => {
                        const tb = getItemTypeBadge(resultItem)
                        if (!tb) return (
                          <span className="inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-[10px] font-bold bg-gradient-to-b from-slate-400/20 to-slate-400/10 text-slate-500 ring-1 ring-inset ring-slate-400/25">
                            <Package className="h-2.5 w-2.5" />
                            Предмет
                          </span>
                        )
                        const cfg: Record<string, { cls: string; Icon: typeof Gift; label: string }> = {
                          lootbox: { cls: 'from-violet-500/20 to-violet-500/10 text-violet-500 ring-violet-400/25', Icon: Gift, label: 'Лутбокс' },
                          multiplier: { cls: 'from-amber-500/20 to-amber-500/10 text-amber-500 ring-amber-400/25', Icon: TrendingUp, label: 'Множитель' },
                          discount: { cls: 'from-red-500/20 to-red-500/10 text-red-500 ring-red-400/25', Icon: Percent, label: 'Скидочник' },
                          videogame: { cls: 'from-cyan-500/20 to-cyan-500/10 text-cyan-500 ring-cyan-400/25', Icon: Gamepad2, label: 'Видеоигра' },
                          serial: { cls: 'from-pink-500/20 to-pink-500/10 text-pink-500 ring-pink-400/25', Icon: Clapperboard, label: 'Сериал' },
                        }
                        const c = cfg[tb.type]
                        if (!c) return null
                        return (
                          <span className={cn('inline-flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-[10px] font-bold bg-gradient-to-b ring-1 ring-inset', c.cls)}>
                            <c.Icon className="h-2.5 w-2.5" />
                            {c.label}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>
                {/* Out of stock — compensation notice */}
                {isResultOutOfStock && !recipe.crafted && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <div className="flex items-start gap-2 rounded-xl bg-gradient-to-b from-red-500/15 to-red-500/5 ring-1 ring-inset ring-red-400/25 px-3 py-2.5">
                      <span className="text-red-500 shrink-0 mt-0.5">🚫</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400">Предмет закончился в магазине</p>
                        <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                          При крафте вместо предмета вы получите 70% его стоимости
                          {(resultItem?.cost[CURRENCY_IDS.COINS] ?? 0) > 0 && (
                            <span className="font-bold text-red-600 dark:text-red-400"> 🪙 {Math.floor((resultItem.cost[CURRENCY_IDS.COINS] ?? 0) * 0.7)}</span>
                          )}
                          {(resultItem?.cost[CURRENCY_IDS.GEMS] ?? 0) > 0 && (
                            <span className="font-bold text-blue-500"> 💎 {Math.floor((resultItem.cost[CURRENCY_IDS.GEMS] ?? 0) * 0.7)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Already owned media item — compensation notice */}
                {!isResultOutOfStock && isResultMediaItem && resultAlreadyOwned && !recipe.crafted && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <div className="flex items-start gap-2 rounded-xl bg-gradient-to-b from-amber-500/15 to-amber-500/5 ring-1 ring-inset ring-amber-400/25 px-3 py-2.5">
                      <span className="text-amber-500 shrink-0 mt-0.5">⚠️</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Предмет уже есть в инвентаре</p>
                        <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                          При крафте вместо предмета вы получите 80% его стоимости
                          {(resultItem?.cost[CURRENCY_IDS.COINS] ?? 0) > 0 && (
                            <span className="font-bold text-amber-600 dark:text-amber-400"> 🪙 {Math.floor((resultItem.cost[CURRENCY_IDS.COINS] ?? 0) * 0.8)}</span>
                          )}
                          {(resultItem?.cost[CURRENCY_IDS.GEMS] ?? 0) > 0 && (
                            <span className="font-bold text-blue-500"> 💎 {Math.floor((resultItem.cost[CURRENCY_IDS.GEMS] ?? 0) * 0.8)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Craft compensation received */}
                {craftCompensation && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 ring-1 ring-inset ring-emerald-400/25 px-3 py-2.5">
                      <span className="text-emerald-500 shrink-0">✅</span>
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {craftCompensation.outOfStock ? 'Компенсация за отсутствие в магазине:' : 'Компенсация выдана:'}
                        {craftCompensation.coins > 0 && <span className="ml-1">🪙 {craftCompensation.coins}</span>}
                        {craftCompensation.gems > 0 && <span className="ml-1">💎 {craftCompensation.gems}</span>}
                      </p>
                    </div>
                  </div>
                )}

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

            {/* Progress Section */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-[var(--fg)] mb-4">Прогресс сбора</h3>

              {/* Counter display */}
              <div className="text-center mb-4">
                <div className="text-4xl font-bold" style={{ color: canCraft ? '#10b981' : 'var(--fg)' }}>
                  {recipe.fragmentsCollected}
                </div>
                <div className="text-lg text-[var(--fg-muted)]">из {recipe.fragmentsRequired}</div>
              </div>

              {/* Progress bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress * 100}%`,
                    background: canCraft
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : `linear-gradient(90deg, ${themeColor}, ${themeColor}cc)`,
                  }}
                />
              </div>

              {/* Percentage label */}
              <p className="text-center text-xs font-medium text-[var(--fg-muted)] mt-2">
                {Math.round(progress * 100)}%
              </p>
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

            {/* Stats & Source Info */}
            <div className="glass rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Информация</h3>

              {/* Inline stat items — compact rows */}
              <div className="space-y-0 divide-y divide-[var(--border)]">
                {/* Source type */}
                <div className="flex items-center justify-between py-2.5 first:pt-0">
                  <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                    {sourceType === 'random_drop' ? <Dice5 className="h-3.5 w-3.5" /> : <Crosshair className="h-3.5 w-3.5" />}
                    <span>{sourceType === 'random_drop' ? 'Случайный дроп' : 'Привязка к задачам'}</span>
                  </div>
                  {typeof fragmentSource?.dropChance === 'number' && fragmentSource.dropChance > 0 && (
                    <span className="text-xs font-bold" style={{ color: themeColor }}>{fragmentSource.dropChance}%</span>
                  )}
                </div>

                {/* Linked tasks inline */}
                {sourceType === 'task_linked' && fragmentSource?.linkedTaskIds && fragmentSource.linkedTaskIds.length > 0 && (
                  <div className="py-2.5">
                    <p className="text-[10px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-1.5">Привязанные задачи</p>
                    <div className="flex flex-wrap gap-1">
                      {fragmentSource.linkedTaskIds.slice(0, 5).map((taskId: string) => {
                        const task = allTasks.find((t) => t.id === taskId)
                        return task ? (
                          <span key={taskId} className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-elevated)] px-2 py-1 text-[11px] text-[var(--fg)]">
                            <Puzzle className="h-2.5 w-2.5 shrink-0" style={{ color: themeColor }} />
                            <span className="truncate max-w-[120px]">{task.title}</span>
                          </span>
                        ) : null
                      })}
                      {fragmentSource.linkedTaskIds.length > 5 && (
                        <span className="inline-flex items-center rounded-lg bg-[var(--surface-elevated)] px-2 py-1 text-[10px] text-[var(--fg-muted)]">
                          +{fragmentSource.linkedTaskIds.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {sourceType === 'random_drop' && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-[var(--fg-muted)]">Источник</span>
                    <span className="text-xs text-[var(--fg)]">Любая задача</span>
                  </div>
                )}

                {/* Subtask drop flag */}
                {fragmentSource?.allowSubtaskDrop && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-[var(--fg-muted)]">Подзадачи</span>
                    <span className="text-xs font-medium text-emerald-500">Могут дропать</span>
                  </div>
                )}

                {/* Craft cost */}
                {hasCost && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-[var(--fg-muted)]">Стоимость крафта</span>
                    <div className="flex items-center gap-2">
                      {coinCost > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                          🪙 {coinCost}
                        </span>
                      )}
                      {gemCost > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-500">
                          💎 {gemCost}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {!hasCost && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-[var(--fg-muted)]">Стоимость крафта</span>
                    <span className="text-xs font-medium text-emerald-500">Бесплатно</span>
                  </div>
                )}

                {/* Multi-craft counter */}
                {(recipe.maxCrafts ?? 1) > 1 && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-[var(--fg-muted)]">Крафтов выполнено</span>
                    <span className="text-xs font-bold" style={{ color: recipe.crafted ? '#10b981' : 'var(--fg)' }}>
                      {recipe.craftCount ?? 0} / {recipe.maxCrafts}
                    </span>
                  </div>
                )}

                {/* Remaining */}
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs text-[var(--fg-muted)]">Осталось собрать</span>
                  <span className="text-xs font-bold text-[var(--fg)]">
                    {Math.max(0, recipe.fragmentsRequired - recipe.fragmentsCollected)} шт
                  </span>
                </div>

                {/* Created */}
                {recipe.createdAt && (
                  <div className="flex items-center justify-between py-2.5 last:pb-0">
                    <span className="text-xs text-[var(--fg-muted)]">Создано</span>
                    <span className="text-xs text-[var(--fg)]">
                      {new Date(recipe.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
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
                    background: `linear-gradient(to bottom, ${editThemeColor}35, ${editThemeColor}15)`,
                    boxShadow: `0 2px 8px ${editThemeColor}25, inset 0 1px 0 ${editThemeColor}20`,
                    '--tw-ring-color': `${editThemeColor}40`,
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

            {/* Result item (edit) */}
            <div className="glass rounded-2xl p-4">
              <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Результат крафта</label>
              {editSelectedItem ? (
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden ring-1 ring-inset shadow-sm"
                    style={{
                      background: `linear-gradient(to bottom, ${editThemeColor}35, ${editThemeColor}15)`,
                      '--tw-ring-color': `${editThemeColor}40`,
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

            {/* Max crafts (edit) */}
            <div className="glass rounded-2xl p-4">
              <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Количество крафтов</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditMaxCrafts((prev) => Math.max(1, prev - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10 hover:from-red-500/30 hover:to-red-500/15 hover:scale-105 active:scale-95"
                >
                  <span className="text-lg font-bold">−</span>
                </button>
                <input
                  type="number"
                  value={editMaxCrafts}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value) || 1)
                    const stockLimit = editSelectedItem?.stock
                    setEditMaxCrafts(stockLimit !== undefined && stockLimit > 0 ? Math.min(v, stockLimit) : v)
                  }}
                  min={1}
                  max={editSelectedItem?.stock !== undefined && editSelectedItem.stock > 0 ? editSelectedItem.stock : undefined}
                  className="input w-full flex-1 min-w-0 h-11 py-0 text-center text-lg font-bold"
                />
                <button
                  type="button"
                  onClick={() => {
                    const stockLimit = editSelectedItem?.stock
                    setEditMaxCrafts((prev) => {
                      const next = prev + 1
                      return stockLimit !== undefined && stockLimit > 0 ? Math.min(next, stockLimit) : next
                    })
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-emerald-400/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10 hover:from-emerald-400/35 hover:to-emerald-500/20 hover:scale-105 active:scale-95"
                >
                  <span className="text-lg font-bold">+</span>
                </button>
              </div>
              {editSelectedItem?.stock !== undefined && editSelectedItem.stock > 0 && (
                <p className="text-[10px] text-[var(--fg-muted)] mt-2 text-center">Макс. {editSelectedItem.stock} (запас в магазине)</p>
              )}
            </div>

            {/* Craft cost (edit) */}
            <div className="glass rounded-2xl p-4">
              <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Стоимость крафта</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-2 rounded-xl bg-gradient-to-b from-amber-500/12 to-amber-500/4 ring-1 ring-inset ring-amber-400/20 p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-sm">🪙</span>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Монеты</span>
                  </div>
                  <input
                    type="number"
                    value={editCraftCostCoins}
                    onChange={(e) => setEditCraftCostCoins(Math.max(0, Number(e.target.value) || 0))}
                    min={0}
                    className="input w-full h-10 py-0 text-center text-sm font-bold"
                  />
                </div>
                <div className="flex flex-col items-center gap-2 rounded-xl bg-gradient-to-b from-blue-500/12 to-blue-500/4 ring-1 ring-inset ring-blue-400/20 p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-sm">💎</span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Кристаллы</span>
                  </div>
                  <input
                    type="number"
                    value={editCraftCostGems}
                    onChange={(e) => setEditCraftCostGems(Math.max(0, Number(e.target.value) || 0))}
                    min={0}
                    className="input w-full h-10 py-0 text-center text-sm font-bold"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[var(--fg-muted)] mt-2 text-center">Оставьте 0 для бесплатного крафта</p>
            </div>

            {/* Source type */}
            <div className="glass rounded-2xl p-4">
              <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Источник фрагментов</label>
              <div className="grid grid-cols-2 gap-2">
                {(['random_drop', 'task_linked'] as FragmentSourceType[]).map((st) => (
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
                    </div>
                    <div className="font-medium text-xs">{SOURCE_LABELS[st]?.label}</div>
                    <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">{SOURCE_LABELS[st]?.description}</div>
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
                <label className="flex items-center gap-2.5 mt-3 pt-3 border-t border-[var(--border)] cursor-pointer">
                  <input type="checkbox" checked={editAllowSubtaskDrop} onChange={(e) => setEditAllowSubtaskDrop(e.target.checked)} className="h-4 w-4 rounded accent-[var(--accent)] shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-[var(--fg)]">Фрагменты могут выпадать из подзадач</span>
                    <p className="text-[10px] text-[var(--fg-muted)] mt-0.5">Каждая выполненная подзадача также имеет шанс дропа</p>
                  </div>
                </label>
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
                  <label className="flex items-center gap-2.5 mt-3 pt-3 border-t border-[var(--border)] cursor-pointer">
                    <input type="checkbox" checked={editAllowSubtaskDrop} onChange={(e) => setEditAllowSubtaskDrop(e.target.checked)} className="h-4 w-4 rounded accent-[var(--accent)] shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-[var(--fg)]">Фрагменты могут выпадать из подзадач</span>
                      <p className="text-[10px] text-[var(--fg-muted)] mt-0.5">Каждая выполненная подзадача также имеет шанс дропа</p>
                    </div>
                  </label>
                </div>
              </>
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
          {isResultOutOfStock && (
            <p className="text-xs text-red-500 text-center mb-2 font-medium">Предмет закончился — получите компенсацию 70%</p>
          )}
          <button
            type="button"
            onClick={handleCraft}
            disabled={hasCost && !canAfford}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white transition-all duration-200',
              hasCost && !canAfford
                ? 'bg-gray-400 cursor-not-allowed opacity-60'
                : isResultOutOfStock
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]'
            )}
          >
            <Sparkles className="h-5 w-5" />
            {isResultOutOfStock ? 'Получить компенсацию' : 'Крафтить!'}
            {hasCost && !isResultOutOfStock && (
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
                    onClick={() => {
                      setEditResultItemId(item.id)
                      if (item.stock !== undefined && item.stock > 0) {
                        setEditMaxCrafts((prev) => Math.min(prev, item.stock!))
                      }
                      setShowItemPicker(false)
                      setItemSearch('')
                    }}
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

      {showTaskPicker && createPortal((() => {
        const q = taskSearch.trim().toLowerCase()
        const byGroup = taskGroupFilter ? tasks.filter((t) => taskGroupFilter === '__ungrouped' ? (!t.groupId || !taskGroupsList.some((g) => g.id === t.groupId)) : t.groupId === taskGroupFilter) : tasks
        const filtered = q ? byGroup.filter((t) => {
          if (t.title.toLowerCase().includes(q)) return true
          if (t.kind === 'nested') return t.subtasks.some((s) => s.title.toLowerCase().includes(q))
          return false
        }) : byGroup
        const grouped = taskGroupFilter ? [] : taskGroupsList.map((g) => ({
          group: g,
          tasks: filtered.filter((t) => t.groupId === g.id),
        })).filter((g) => g.tasks.length > 0)
        const ungrouped = taskGroupFilter
          ? (taskGroupFilter === '__ungrouped' ? filtered : [])
          : filtered.filter((t) => !t.groupId || !taskGroupsList.some((g) => g.id === t.groupId))
        const flatFiltered = taskGroupFilter && taskGroupFilter !== '__ungrouped' ? filtered : []
        const toggleGroup = (id: string) => setCollapsedTaskGroups((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id); else next.add(id)
          return next
        })
        const toggleTaskExpand = (id: string) => setExpandedTasks((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id); else next.add(id)
          return next
        })

        const renderTaskRow = (task: typeof tasks[number], extraClass?: string) => {
          const KindIcon = KIND_ICON_MAP[task.kind] || CheckSquare
          const isNested = task.kind === 'nested' && task.subtasks.length > 0
          const isExpanded = expandedTasks.has(task.id)
          const subtaskIds = isNested ? task.subtasks.map((s) => s.id) : []
          const selectedSubCount = subtaskIds.filter((id) => editLinkedTaskIds.includes(id)).length

          return (
            <div key={task.id} className={extraClass}>
              <div className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-[var(--surface-elevated)] transition-colors">
                <input
                  type="checkbox"
                  checked={editLinkedTaskIds.includes(task.id)}
                  onChange={(e) => {
                    if (e.target.checked) setEditLinkedTaskIds((prev) => [...prev, task.id])
                    else setEditLinkedTaskIds((prev) => prev.filter((id) => id !== task.id))
                  }}
                  className="h-4 w-4 rounded accent-[var(--accent)] shrink-0 cursor-pointer"
                />
                <KindIcon className="h-3.5 w-3.5 text-[var(--fg-muted)] shrink-0" />
                <span className="text-sm truncate text-[var(--fg)] flex-1 min-w-0 cursor-default">{task.title}</span>
                {isNested && (
                  <>
                    {selectedSubCount > 0 && (
                      <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent-subtle)] rounded-md px-1.5 py-0.5">{selectedSubCount}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleTaskExpand(task.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-[var(--surface)] transition-colors shrink-0"
                    >
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-[var(--fg-muted)]" /> : <ChevronRight className="h-3.5 w-3.5 text-[var(--fg-muted)]" />}
                    </button>
                  </>
                )}
              </div>
              {isNested && isExpanded && (
                <div className="ml-7 border-l-2 border-[var(--accent)]/20 pl-2">
                  {task.subtasks.map((sub) => (
                    <label key={sub.id} className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-[var(--surface-elevated)] cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={editLinkedTaskIds.includes(sub.id)}
                        onChange={(e) => {
                          if (e.target.checked) setEditLinkedTaskIds((prev) => [...prev, sub.id])
                          else setEditLinkedTaskIds((prev) => prev.filter((id) => id !== sub.id))
                        }}
                        className="h-4 w-4 rounded accent-[var(--accent)] shrink-0"
                      />
                      <span className={cn('text-sm truncate', sub.isCompleted ? 'text-[var(--fg-muted)] line-through' : 'text-[var(--fg)]')}>{sub.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        }

        return (
          <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowTaskPicker(false)}>
            <div className="modal-content max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[var(--fg)]">Выбрать задачи</h3>
                <button type="button" onClick={() => { setShowTaskPicker(false); setTaskSearch(''); setTaskGroupFilter(null) }} className="icon-btn"><X className="h-5 w-5" /></button>
              </div>
              <p className="text-sm text-[var(--fg-muted)] mb-3">Отметьте задачи, за выполнение которых будут выдаваться фрагменты.</p>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
                <input
                  type="text"
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Поиск задачи..."
                  className="input w-full pl-9 h-9 text-sm"
                />
              </div>

              {/* Group filter tabs */}
              {taskGroupsList.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <button
                    type="button"
                    onClick={() => setTaskGroupFilter(null)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                      !taskGroupFilter
                        ? 'bg-[var(--accent-subtle)] text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20'
                        : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)]'
                    )}
                  >
                    Все
                  </button>
                  {taskGroupsList.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setTaskGroupFilter(g.id)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                        taskGroupFilter === g.id
                          ? 'bg-[var(--accent-subtle)] text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20'
                          : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)]'
                      )}
                    >
                      <Folder className="h-3 w-3" style={{ color: g.color || undefined }} />
                      {g.name}
                    </button>
                  ))}
                  {tasks.some((t) => !t.groupId || !taskGroupsList.some((g) => g.id === t.groupId)) && (
                    <button
                      type="button"
                      onClick={() => setTaskGroupFilter('__ungrouped')}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                        taskGroupFilter === '__ungrouped'
                          ? 'bg-[var(--accent-subtle)] text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/20'
                          : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)]'
                      )}
                    >
                      <Package className="h-3 w-3" />
                      Без группы
                    </button>
                  )}
                </div>
              )}

              <div className="max-h-72 overflow-y-auto rounded-xl bg-[var(--surface)] p-2 mb-4">
                {flatFiltered.map((task) => renderTaskRow(task))}

                {grouped.map(({ group, tasks: groupTasks }) => {
                  const isCollapsed = collapsedTaskGroups.has(group.id)
                  const selectedInGroup = groupTasks.filter((t) => editLinkedTaskIds.includes(t.id) || (t.kind === 'nested' && t.subtasks.some((s) => editLinkedTaskIds.includes(s.id)))).length
                  return (
                    <div key={group.id} className="mb-1">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 hover:bg-[var(--surface-elevated)] transition-colors"
                      >
                        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-[var(--fg-muted)]" /> : <ChevronDown className="h-3.5 w-3.5 text-[var(--fg-muted)]" />}
                        <Folder className="h-4 w-4 text-[var(--accent)]" />
                        <span className="text-xs font-semibold text-[var(--fg)] flex-1 text-left">{group.name}</span>
                        {selectedInGroup > 0 && (
                          <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent-subtle)] rounded-md px-1.5 py-0.5">{selectedInGroup}</span>
                        )}
                        <span className="text-[10px] text-[var(--fg-muted)]">{groupTasks.length}</span>
                      </button>
                      {!isCollapsed && (
                        <div className="ml-4 border-l-2 border-[var(--border)] pl-2">
                          {groupTasks.map((task) => renderTaskRow(task))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {ungrouped.length > 0 && (
                  <div className={grouped.length > 0 ? 'mt-1 pt-1 border-t border-[var(--border)]' : ''}>
                    {grouped.length > 0 && (
                      <div className="flex items-center gap-2 px-2 py-2">
                        <Package className="h-4 w-4 text-[var(--fg-muted)]" />
                        <span className="text-xs font-semibold text-[var(--fg-muted)]">Без группы</span>
                        <span className="text-[10px] text-[var(--fg-muted)]">{ungrouped.length}</span>
                      </div>
                    )}
                    {ungrouped.map((task) => renderTaskRow(task, grouped.length > 0 ? 'ml-4' : undefined))}
                  </div>
                )}

                {filtered.length === 0 && (
                  <p className="text-sm text-[var(--fg-muted)] text-center py-4">
                    {q ? 'Задачи не найдены' : 'Нет активных задач'}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--fg-muted)]">Выбрано: {editLinkedTaskIds.length}</span>
                <button type="button" onClick={() => { setShowTaskPicker(false); setTaskSearch(''); setTaskGroupFilter(null) }} className="btn-secondary px-6">Готово</button>
              </div>
            </div>
          </div>
        )
      })(), document.body)}

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
