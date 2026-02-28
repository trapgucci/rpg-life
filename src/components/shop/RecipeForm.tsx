import { useState, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { resizeImageFile } from '../../lib/resizeImage'
import { cn } from '../../lib/cn'
import { X, Dice5, Crosshair, Search, Package, Folder, CheckSquare, Hash, ListChecks, ChevronDown, ChevronRight } from 'lucide-react'
import { useRpgStore } from '../../store/useRpgStore'
import type { CraftRecipe, ItemRarity, FragmentSourceType } from '../../types/domain'
import { migrateIcon, getItemTypeColor } from './shopUtils'
import { HabitIcon } from '../HabitIcon'
import IconSourcePicker from './IconSourcePicker'
import EmojiPickerModal from './EmojiPickerModal'

const KIND_ICON_MAP = {
  checkbox: CheckSquare,
  counter: Hash,
  nested: ListChecks,
} as const

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
  const allShopItems = useRpgStore((s) => s.shopItems)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const allTaskGroups = useRpgStore((s) => s.taskGroups)
  const itemGroups = useMemo(() => activeProfileId ? allItemGroups.filter((g) => g.profileId === activeProfileId).sort((a, b) => a.sortOrder - b.sortOrder) : [], [allItemGroups, activeProfileId])
  const taskGroups = useMemo(() => activeProfileId ? allTaskGroups.filter((g) => g.profileId === activeProfileId).sort((a, b) => a.sortOrder - b.sortOrder) : [], [allTaskGroups, activeProfileId])
  const profileItems = useMemo(() => activeProfileId ? allShopItems.filter((i) => !i.deletedFromShop && ((i as any).profileId === activeProfileId || !(i as any).profileId)) : allShopItems.filter((i) => !i.deletedFromShop), [allShopItems, activeProfileId])

  const [fragmentName, setFragmentName] = useState(recipe?.fragmentName ?? '')
  const [fragmentIcon, setFragmentIcon] = useState(migrateIcon(recipe?.fragmentIcon, 'Puzzle'))
  const [fragmentIconImage, setFragmentIconImage] = useState((recipe as any)?.fragmentIconImage ?? '')
  const [fragmentsRequired, setFragmentsRequired] = useState(recipe?.fragmentsRequired ?? 5)
  const [resultRarity, setResultRarity] = useState<ItemRarity>(recipe?.resultRarity ?? 'common')

  // Result item
  const [resultItemId, setResultItemId] = useState<string | null>(recipe?.resultItemId ?? null)
  const [showItemPicker, setShowItemPicker] = useState(false)
  const [itemGroupFilter, setItemGroupFilter] = useState<string | null>(null)
  const [itemSearch, setItemSearch] = useState('')

  // Max crafts
  const [maxCrafts, setMaxCrafts] = useState(recipe?.maxCrafts ?? 1)

  // Craft cost
  const existingCraftCost = (recipe as any)?.craftCost as Record<string, number> | undefined
  const [craftCostCoins, setCraftCostCoins] = useState(existingCraftCost?.coins ?? 0)
  const [craftCostGems, setCraftCostGems] = useState(existingCraftCost?.gems ?? 0)

  // Migrate old habit_linked to random_drop
  const rawSourceType = (recipe as any)?.fragmentSource?.type ?? 'random_drop'
  const migratedSourceType = rawSourceType === 'habit_linked' ? 'random_drop' : rawSourceType
  const [sourceType, setSourceType] = useState<FragmentSourceType>(migratedSourceType)
  const [dropChance, setDropChance] = useState((recipe as any)?.fragmentSource?.dropChance ?? 15)
  const [allowSubtaskDrop, setAllowSubtaskDrop] = useState<boolean>((recipe as any)?.fragmentSource?.allowSubtaskDrop ?? false)
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>(
    (recipe as any)?.fragmentSource?.linkedTaskIds ?? []
  )
  const [showTaskPicker, setShowTaskPicker] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [taskGroupFilter, setTaskGroupFilter] = useState<string | null>(null)
  const [collapsedTaskGroups, setCollapsedTaskGroups] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  // Icon picker state (same as shop)
  const [showIconSource, setShowIconSource] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const iconFileInputRef = useRef<HTMLInputElement>(null)

  const selectedItem = useMemo(() => resultItemId ? allShopItems.find((i) => i.id === resultItemId) : null, [resultItemId, allShopItems])

  const filteredPickerItems = useMemo(() => {
    let items = profileItems
    if (itemGroupFilter) items = items.filter((i) => i.groupId === itemGroupFilter)
    if (itemSearch.trim()) {
      const q = itemSearch.trim().toLowerCase()
      items = items.filter((i) => i.name.toLowerCase().includes(q))
    }
    return items
  }, [profileItems, itemGroupFilter, itemSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fragmentName.trim()) return

    const fragmentSource =
      sourceType === 'task_linked'
        ? { type: 'task_linked' as const, linkedTaskIds, dropChance, allowSubtaskDrop }
        : { type: 'random_drop' as const, dropChance, allowSubtaskDrop }

    const data: any = {
      fragmentName: fragmentName.trim(),
      fragmentIcon,
      fragmentIconImage: fragmentIconImage || undefined,
      fragmentsRequired,
      resultRarity,
      fragmentSource,
      resultItemId: resultItemId ?? '',
      resultName: selectedItem?.name ?? '',
      resultIcon: selectedItem?.icon ?? '',
      craftCost: { coins: craftCostCoins, gems: craftCostGems },
      maxCrafts,
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

  const themeColor = getItemTypeColor(selectedItem)

  return (
    <div className="glass-card relative flex h-full flex-col rounded-2xl overflow-hidden">
      {/* Rarity accent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] z-10"
        style={{ background: `linear-gradient(90deg, ${themeColor}, ${themeColor}40)` }}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-5 md:p-6 pb-0">
        <h2 className="text-xl font-bold text-[var(--fg)]">
          {recipe ? 'Редактировать фрагмент' : 'Новый фрагмент'}
        </h2>
        <button type="button" onClick={onClose} className="icon-btn">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 md:p-6 pt-5 flex flex-col gap-5">

        {/* ─── Fragment name + icon ─── */}
        <div className="glass rounded-2xl p-4">
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Фрагмент</label>
          <div className="flex gap-3 items-stretch">
            <button
              type="button"
              onClick={() => setShowIconSource(true)}
              className="relative shrink-0 group/preview flex items-center justify-center w-[48px] h-[48px] rounded-xl overflow-hidden transition-all cursor-pointer ring-1 ring-inset shadow-md hover:ring-[var(--accent)] hover:scale-105 active:scale-95"
              style={{
                background: `linear-gradient(to bottom, ${themeColor}35, ${themeColor}15)`,
                boxShadow: `0 2px 8px ${themeColor}25, inset 0 1px 0 ${themeColor}20`,
                '--tw-ring-color': `${themeColor}40`,
              } as React.CSSProperties}
              title="Изменить иконку"
            >
              {fragmentIconImage ? (
                <img src={fragmentIconImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <HabitIcon iconName={fragmentIcon || 'Puzzle'} size={24} />
              )}
              {fragmentIconImage && (
                <span
                  onClick={(e) => { e.stopPropagation(); setFragmentIconImage('') }}
                  className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover/preview:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
            <input
              type="text"
              value={fragmentName}
              onChange={(e) => setFragmentName(e.target.value)}
              placeholder="Осколок тьмы"
              className="input flex-1 min-w-0 text-base"
              autoFocus
            />
            <input
              ref={iconFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file || !file.type.startsWith('image/')) return
                const dataUrl = await resizeImageFile(file)
                setFragmentIconImage(dataUrl)
                e.target.value = ''
              }}
            />
          </div>
        </div>

        {/* ─── Fragments required ─── */}
        <div className="glass rounded-2xl p-4">
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Фрагментов для крафта</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFragmentsRequired((prev) => Math.max(1, prev - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10 hover:from-red-500/30 hover:to-red-500/15 hover:scale-105 active:scale-95"
            >
              <span className="text-lg font-bold">−</span>
            </button>
            <input
              type="number"
              value={fragmentsRequired}
              onChange={(e) => setFragmentsRequired(Math.max(1, Number(e.target.value) || 1))}
              min={1}
              className="input w-full flex-1 min-w-0 h-11 py-0 text-center text-lg font-bold"
            />
            <button
              type="button"
              onClick={() => setFragmentsRequired((prev) => prev + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-emerald-400/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10 hover:from-emerald-400/35 hover:to-emerald-500/20 hover:scale-105 active:scale-95"
            >
              <span className="text-lg font-bold">+</span>
            </button>
          </div>
        </div>

        {/* ─── Result item (Результат крафта) ─── */}
        <div className="glass rounded-2xl p-4">
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Результат крафта</label>
          {selectedItem ? (
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden ring-1 ring-inset shadow-sm"
                style={{
                  background: `linear-gradient(to bottom, ${themeColor}35, ${themeColor}15)`,
                  '--tw-ring-color': `${themeColor}40`,
                } as React.CSSProperties}
              >
                {selectedItem.iconImage ? (
                  <img src={selectedItem.iconImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <HabitIcon iconName={migrateIcon(selectedItem.icon, 'Package')} size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--fg)] truncate">{selectedItem.name}</p>
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

        {/* ─── Max crafts ─── */}
        <div className="glass rounded-2xl p-4">
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Количество крафтов</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMaxCrafts((prev) => Math.max(1, prev - 1))}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-red-500/20 to-red-500/8 text-red-500 ring-1 ring-inset ring-red-400/25 shadow-sm shadow-red-500/10 hover:from-red-500/30 hover:to-red-500/15 hover:scale-105 active:scale-95"
            >
              <span className="text-lg font-bold">−</span>
            </button>
            <input
              type="number"
              value={maxCrafts}
              onChange={(e) => {
                const v = Math.max(1, Number(e.target.value) || 1)
                const stockLimit = selectedItem?.stock
                setMaxCrafts(stockLimit !== undefined && stockLimit > 0 ? Math.min(v, stockLimit) : v)
              }}
              min={1}
              max={selectedItem?.stock !== undefined && selectedItem.stock > 0 ? selectedItem.stock : undefined}
              className="input w-full flex-1 min-w-0 h-11 py-0 text-center text-lg font-bold"
            />
            <button
              type="button"
              onClick={() => {
                const stockLimit = selectedItem?.stock
                setMaxCrafts((prev) => {
                  const next = prev + 1
                  return stockLimit !== undefined && stockLimit > 0 ? Math.min(next, stockLimit) : next
                })
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition-all bg-gradient-to-b from-emerald-400/25 to-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-400/25 shadow-sm shadow-emerald-500/10 hover:from-emerald-400/35 hover:to-emerald-500/20 hover:scale-105 active:scale-95"
            >
              <span className="text-lg font-bold">+</span>
            </button>
          </div>
          {selectedItem?.stock !== undefined && selectedItem.stock > 0 && (
            <p className="text-[10px] text-[var(--fg-muted)] mt-2 text-center">Макс. {selectedItem.stock} (запас в магазине)</p>
          )}
          {maxCrafts === 1 && (
            <p className="text-[10px] text-[var(--fg-muted)] mt-2 text-center">Одноразовый крафт</p>
          )}
        </div>

        {/* ─── Craft cost ─── */}
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
                value={craftCostCoins}
                onChange={(e) => setCraftCostCoins(Math.max(0, Number(e.target.value) || 0))}
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
                value={craftCostGems}
                onChange={(e) => setCraftCostGems(Math.max(0, Number(e.target.value) || 0))}
                min={0}
                className="input w-full h-10 py-0 text-center text-sm font-bold"
              />
            </div>
          </div>
          <p className="text-[10px] text-[var(--fg-muted)] mt-2 text-center">Оставьте 0 для бесплатного крафта</p>
        </div>

        {/* ─── Source type ─── */}
        <div className="glass rounded-2xl p-4">
          <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Источник фрагментов</label>
          <div className="grid grid-cols-2 gap-2">
            {/* Random drop */}
            <button
              type="button"
              onClick={() => setSourceType('random_drop')}
              className={cn(
                'rounded-xl p-3 text-left transition-all',
                sourceType === 'random_drop'
                  ? 'bg-gradient-to-b from-[var(--accent)]/20 to-[var(--accent)]/8 border-2 border-[var(--accent)] shadow-md shadow-[var(--accent)]/15'
                  : 'bg-[var(--surface)] border-2 border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-elevated)]'
              )}
            >
              <div className={cn('mb-1.5', sourceType === 'random_drop' ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]')}>
                <Dice5 className="h-5 w-5" />
              </div>
              <div className="font-medium text-xs">Случайный дроп</div>
              <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">При выполнении задач</div>
            </button>

            {/* Task linked */}
            <button
              type="button"
              onClick={() => setSourceType('task_linked')}
              className={cn(
                'rounded-xl p-3 text-left transition-all',
                sourceType === 'task_linked'
                  ? 'bg-gradient-to-b from-[var(--accent)]/20 to-[var(--accent)]/8 border-2 border-[var(--accent)] shadow-md shadow-[var(--accent)]/15'
                  : 'bg-[var(--surface)] border-2 border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-elevated)]'
              )}
            >
              <div className={cn('mb-1.5', sourceType === 'task_linked' ? 'text-[var(--accent)]' : 'text-[var(--fg-muted)]')}>
                <Crosshair className="h-5 w-5" />
              </div>
              <div className="font-medium text-xs">Привязка к задачам</div>
              <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">Конкретные задачи</div>
            </button>
          </div>
        </div>

        {/* ─── Source-specific settings ─── */}
        {sourceType === 'random_drop' && (
          <div className="glass rounded-2xl p-4">
            <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Шанс выпадения</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={100}
                value={dropChance}
                onChange={(e) => setDropChance(Number(e.target.value))}
                className="flex-1 accent-[var(--accent)]"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={dropChance}
                  onChange={(e) => setDropChance(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  min={1}
                  max={100}
                  className="input w-16 text-center h-9 py-0 text-sm font-bold"
                />
                <span className="text-sm font-bold text-[var(--fg-muted)]">%</span>
              </div>
            </div>
            <label className="flex items-center gap-2.5 mt-3 pt-3 border-t border-[var(--border)] cursor-pointer">
              <input
                type="checkbox"
                checked={allowSubtaskDrop}
                onChange={(e) => setAllowSubtaskDrop(e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--accent)] shrink-0"
              />
              <div>
                <span className="text-sm font-medium text-[var(--fg)]">Фрагменты могут выпадать из подзадач</span>
                <p className="text-[10px] text-[var(--fg-muted)] mt-0.5">Каждая выполненная подзадача также имеет шанс дропа</p>
              </div>
            </label>
          </div>
        )}

        {sourceType === 'task_linked' && (
          <>
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--fg)]">Привязанные задачи</p>
                  <p className="text-xs text-[var(--fg-muted)] mt-0.5">Выбрано: {linkedTaskIds.length || 0}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTaskPicker(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent)]/90 px-4 py-2 text-sm font-medium text-white shadow-md shadow-[var(--accent)]/25 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Выбрать
                </button>
              </div>
            </div>
            <div className="glass rounded-2xl p-4">
              <label className="block text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider mb-3">Шанс выпадения</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={dropChance}
                  onChange={(e) => setDropChance(Number(e.target.value))}
                  className="flex-1 accent-[var(--accent)]"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={dropChance}
                    onChange={(e) => setDropChance(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    min={1}
                    max={100}
                    className="input w-16 text-center h-9 py-0 text-sm font-bold"
                  />
                  <span className="text-sm font-bold text-[var(--fg-muted)]">%</span>
                </div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] mt-2">
                При выполнении каждой привязанной задачи с вероятностью {dropChance}% выпадет фрагмент
              </p>
              <label className="flex items-center gap-2.5 mt-3 pt-3 border-t border-[var(--border)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowSubtaskDrop}
                  onChange={(e) => setAllowSubtaskDrop(e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--accent)] shrink-0"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--fg)]">Фрагменты могут выпадать из подзадач</span>
                  <p className="text-[10px] text-[var(--fg-muted)] mt-0.5">Каждая выполненная подзадача также имеет шанс дропа</p>
                </div>
              </label>
            </div>
          </>
        )}

        {/* ─── Buttons ─── */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 shadow-lg shadow-[var(--accent)]/25 hover:shadow-xl hover:shadow-[var(--accent)]/35 hover:scale-[1.02] active:scale-[0.98]"
          >
            {recipe ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>

      {/* ─── Item picker modal ─── */}
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
                const iconBg = group?.color ?? getItemTypeColor(item)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setResultItemId(item.id)
                      // Clamp maxCrafts to new item's stock
                      if (item.stock !== undefined && item.stock > 0) {
                        setMaxCrafts((prev) => Math.min(prev, item.stock!))
                      }
                      setShowItemPicker(false)
                      setItemSearch('')
                    }}
                    className={cn(
                      'flex items-center gap-3 w-full rounded-lg p-2 text-left hover:bg-[var(--surface-elevated)] transition-colors',
                      resultItemId === item.id && 'bg-[var(--accent-subtle)]'
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

      {/* ─── Task picker modal ─── */}
      {showTaskPicker && createPortal((() => {
        const q = taskSearch.trim().toLowerCase()
        const byGroup = taskGroupFilter ? tasks.filter((t) => taskGroupFilter === '__ungrouped' ? (!t.groupId || !taskGroups.some((g) => g.id === t.groupId)) : t.groupId === taskGroupFilter) : tasks
        const filtered = q ? byGroup.filter((t) => {
          if (t.title.toLowerCase().includes(q)) return true
          if (t.kind === 'nested') return t.subtasks.some((s) => s.title.toLowerCase().includes(q))
          return false
        }) : byGroup
        const grouped = taskGroupFilter ? [] : taskGroups.map((g) => ({
          group: g,
          tasks: filtered.filter((t) => t.groupId === g.id),
        })).filter((g) => g.tasks.length > 0)
        const ungrouped = taskGroupFilter
          ? (taskGroupFilter === '__ungrouped' ? filtered : [])
          : filtered.filter((t) => !t.groupId || !taskGroups.some((g) => g.id === t.groupId))
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
          const selectedSubCount = subtaskIds.filter((id) => linkedTaskIds.includes(id)).length

          return (
            <div key={task.id} className={extraClass}>
              <div className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-[var(--surface-elevated)] transition-colors">
                <input
                  type="checkbox"
                  checked={linkedTaskIds.includes(task.id)}
                  onChange={(e) => {
                    if (e.target.checked) setLinkedTaskIds((prev) => [...prev, task.id])
                    else setLinkedTaskIds((prev) => prev.filter((id) => id !== task.id))
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
                        checked={linkedTaskIds.includes(sub.id)}
                        onChange={(e) => {
                          if (e.target.checked) setLinkedTaskIds((prev) => [...prev, sub.id])
                          else setLinkedTaskIds((prev) => prev.filter((id) => id !== sub.id))
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
              {taskGroups.length > 0 && (
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
                  {taskGroups.map((g) => (
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
                  {tasks.some((t) => !t.groupId || !taskGroups.some((g) => g.id === t.groupId)) && (
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
                  const selectedInGroup = groupTasks.filter((t) => linkedTaskIds.includes(t.id) || (t.kind === 'nested' && t.subtasks.some((s) => linkedTaskIds.includes(s.id)))).length
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
                <span className="text-xs text-[var(--fg-muted)]">Выбрано: {linkedTaskIds.length}</span>
                <button type="button" onClick={() => { setShowTaskPicker(false); setTaskSearch(''); setTaskGroupFilter(null) }} className="btn-secondary px-6">Готово</button>
              </div>
            </div>
          </div>
        )
      })(), document.body)}

      {/* ─── Icon source picker (same as shop) ─── */}
      {showIconSource && (
        <IconSourcePicker
          onSelectIcon={() => { setShowIconSource(false); setShowIconPicker(true) }}
          onSelectPhoto={() => { setShowIconSource(false); iconFileInputRef.current?.click() }}
          onClose={() => setShowIconSource(false)}
        />
      )}

      {/* ─── Emoji picker (full Lucide grid) ─── */}
      {showIconPicker && (
        <EmojiPickerModal
          currentIcon={fragmentIcon}
          onSelect={(name) => { setFragmentIcon(name); setFragmentIconImage('') }}
          onClose={() => setShowIconPicker(false)}
        />
      )}
    </div>
  )
}
