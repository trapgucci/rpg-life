import { useState, useMemo, useCallback, useRef } from 'react'
import { cn } from '../../lib/cn'
import { X, Plus, Trash2, Sparkles, Box, Lightbulb, Check, Search, Percent, Hash, Gift, Minus, Scale, Coins, Gem, Folder, TrendingUp, Gamepad2, Clapperboard } from 'lucide-react'
import { CURRENCY_IDS } from '../../types/domain'
import type { ShopItem, ItemGroup } from '../../types/domain'
import { getItemIcon, getItemTypeColor, getItemTypeBadge, RARITY_COLORS } from './shopUtils'
import type { LootTableEntry } from './shopUtils'
import { HabitIcon } from '../HabitIcon'
import { ItemIconBadge as SharedItemIconBadge } from '../ItemIconBadge'
import { useRpgStore } from '../../store/useRpgStore'

// ─── Constants ───────────────────────────────────────────────────────────────

const BATCH_SIZE = 30
const CURRENCY_COLORS: Record<string, string> = {
  [CURRENCY_IDS.COINS]: '#f59e0b',
  [CURRENCY_IDS.GEMS]: '#a855f7',
}

// ─── Shared icon renderer ────────────────────────────────────────────────────

function ItemIconBadge({ iconName, iconImage, color }: { iconName: string; iconImage?: string; color: string }) {
  if (iconImage) {
    return <img src={iconImage} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0 shadow-sm" />
  }
  return (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
      style={{
        background: `linear-gradient(135deg, ${color}22, ${color}11)`,
        boxShadow: `0 2px 6px ${color}30, inset 0 1px 0 ${color}15`,
        color,
      }}
    >
      <HabitIcon iconName={iconName} size={20} />
    </span>
  )
}

// ─── Helper: get color for a given item/currency id ──────────────────────────

function getColorForId(id: string, shopItems: ShopItem[]): string {
  if (CURRENCY_COLORS[id]) return CURRENCY_COLORS[id]
  const item = shopItems.find((i) => i.id === id)
  return item ? getItemTypeColor(item) : '#9ca3af'
}

// ─── Reward Picker Modal (multi-select) ──────────────────────────────────────

interface RewardPickerModalProps {
  shopItems: ShopItem[]
  excludeIds?: string[]
  onSelect: (ids: string[]) => void
  onClose: () => void
}

type PickerOption = { id: string; name: string; iconName: string; iconImage?: string; groupId?: string | null; color: string }

function RewardPickerModal({ shopItems, excludeIds = [], onSelect, onClose }: RewardPickerModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const scrollRef = useRef<HTMLDivElement>(null)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const itemGroups = useMemo(() => allItemGroups.filter((g) => g.profileId === activeProfileId), [allItemGroups, activeProfileId])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    onSelect(Array.from(selected))
    onClose()
  }

  const currencyOptions: PickerOption[] = [
    { id: CURRENCY_IDS.COINS, name: 'Монеты', iconName: 'Coins', color: CURRENCY_COLORS[CURRENCY_IDS.COINS] },
    { id: CURRENCY_IDS.GEMS, name: 'Кристаллы', iconName: 'Gem', color: CURRENCY_COLORS[CURRENCY_IDS.GEMS] },
  ]

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const itemOptions: PickerOption[] = shopItems
      .filter((i) => !excludeIds.includes(i.id))
      .map((i) => ({
        id: i.id,
        name: i.name,
        iconName: getItemIcon(i),
        iconImage: i.iconImage,
        groupId: i.groupId,
        color: getItemTypeColor(i),
      }))

    const filteredItems = itemOptions.filter((o) => {
      if (q && !o.name.toLowerCase().includes(q)) return false
      if (groupFilter && o.groupId !== groupFilter) return false
      return true
    })
    const filteredCurrencies = q
      ? currencyOptions.filter((o) => o.name.toLowerCase().includes(q))
      : groupFilter ? [] : currencyOptions
    return [...filteredCurrencies, ...filteredItems]
  }, [search, groupFilter, shopItems, excludeIds])

  // Reset visible count when filter changes
  const prevFilterKey = useRef('')
  const filterKey = `${search}|${groupFilter}`
  if (filterKey !== prevFilterKey.current) {
    prevFilterKey.current = filterKey
    if (visibleCount !== BATCH_SIZE) setVisibleCount(BATCH_SIZE)
  }

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const hasMore = visibleCount < filtered.length

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filtered.length))
    }
  }, [hasMore, filtered.length])

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Выберите награды</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск награды..."
            className="rounded-xl border border-[var(--border)] pl-9 pr-3 py-2.5 text-sm w-full text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] bg-[var(--surface)]"
            autoFocus
          />
        </div>

        {/* Group filter — pill buttons */}
        {itemGroups.length > 0 && (
          <div className="overflow-x-auto mb-3 shrink-0" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-1.5 py-1 px-0.5">
            <button
              type="button"
              onClick={() => setGroupFilter(null)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border whitespace-nowrap h-[30px]',
                groupFilter === null
                  ? 'bg-[var(--accent)] text-white shadow-md border-transparent'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] border-[var(--border)]'
              )}
            >
              Все
            </button>
            {itemGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setGroupFilter(groupFilter === group.id ? null : group.id)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border whitespace-nowrap h-[30px]',
                  groupFilter === group.id
                    ? 'bg-[var(--accent)] text-white shadow-md border-transparent'
                    : 'text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] border-[var(--border)]'
                )}
              >
                <Folder className="h-3.5 w-3.5 shrink-0" style={group.color && groupFilter !== group.id ? { color: group.color } : undefined} />
                {group.name}
              </button>
            ))}
            </div>
          </div>
        )}

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto space-y-1 mb-4">
          {filtered.length === 0 && (
            <p className="text-sm text-[var(--fg-muted)] text-center py-8">Ничего не найдено</p>
          )}
          {visibleItems.map((opt) => {
            const isSelected = selected.has(opt.id)
            const shopItem = shopItems.find((i) => i.id === opt.id)
            const badge = shopItem ? getItemTypeBadge(shopItem) : null
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 w-full text-left transition-all',
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md shadow-[var(--accent)]/10'
                    : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                )}
              >
                {shopItem ? (
                  <div className="relative shrink-0">
                    <SharedItemIconBadge item={shopItem} size="sm" />
                    {badge && (
                      <div className={cn(
                        'absolute -top-1 -right-1 z-20 flex h-4 w-4 items-center justify-center rounded-md',
                        'shadow-[0_2px_6px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]',
                        'ring-1 ring-[var(--surface-card)]',
                        badge.type === 'lootbox' && 'bg-gradient-to-br from-violet-400 to-violet-600',
                        badge.type === 'multiplier' && 'bg-gradient-to-br from-amber-400 to-orange-500',
                        badge.type === 'discount' && 'bg-gradient-to-br from-red-400 to-rose-600',
                        badge.type === 'videogame' && 'bg-gradient-to-br from-cyan-400 to-cyan-600',
                        badge.type === 'serial' && 'bg-gradient-to-br from-pink-400 to-rose-600',
                      )}>
                        {badge.type === 'lootbox' && <Gift className="h-2.5 w-2.5 text-white drop-shadow" />}
                        {badge.type === 'multiplier' && <TrendingUp className="h-2.5 w-2.5 text-white drop-shadow" />}
                        {badge.type === 'discount' && <Percent className="h-2.5 w-2.5 text-white drop-shadow" />}
                        {badge.type === 'videogame' && <Gamepad2 className="h-2.5 w-2.5 text-white drop-shadow" />}
                        {badge.type === 'serial' && <Clapperboard className="h-2.5 w-2.5 text-white drop-shadow" />}
                      </div>
                    )}
                  </div>
                ) : (
                  <ItemIconBadge iconName={opt.iconName} iconImage={opt.iconImage} color={opt.color} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--fg)] truncate">{opt.name}</p>
                  {shopItem && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {badge && (
                        <span className="text-[10px] text-[var(--fg-muted)]">{badge.label}</span>
                      )}
                      <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                        <Coins className="h-2.5 w-2.5" />
                        {shopItem.cost?.coins ?? 0}
                      </span>
                      {(shopItem.cost?.gems ?? 0) > 0 && (
                        <span className="text-[10px] text-cyan-500 flex items-center gap-0.5">
                          <Gem className="h-2.5 w-2.5" />
                          {shopItem.cost.gems}
                        </span>
                      )}
                      {shopItem.stock !== undefined && (
                        <span className="text-[10px] text-[var(--fg-muted)]">Запас: {shopItem.stock}</span>
                      )}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-[var(--accent)] shrink-0" />
                )}
              </button>
            )
          })}
          {hasMore && (
            <p className="text-xs text-[var(--fg-muted)] text-center py-2">
              Показано {visibleCount} из {filtered.length}…
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button type="button" onClick={handleConfirm} disabled={selected.size === 0} className="btn-primary flex-1">
            Добавить{selected.size > 0 && ` (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reward Picker Modal (single-select for replace) ─────────────────────────

function RewardPickerModalSingle({
  shopItems,
  currentId,
  onSelect,
  onClose,
}: {
  shopItems: ShopItem[]
  currentId: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState<string | null>(currentId)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const scrollRef = useRef<HTMLDivElement>(null)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const itemGroups = useMemo(() => allItemGroups.filter((g) => g.profileId === activeProfileId), [allItemGroups, activeProfileId])

  const currencyOptions: PickerOption[] = [
    { id: CURRENCY_IDS.COINS, name: 'Монеты', iconName: 'Coins', color: CURRENCY_COLORS[CURRENCY_IDS.COINS] },
    { id: CURRENCY_IDS.GEMS, name: 'Кристаллы', iconName: 'Gem', color: CURRENCY_COLORS[CURRENCY_IDS.GEMS] },
  ]

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const itemOptions: PickerOption[] = shopItems.map((i) => ({
      id: i.id,
      name: i.name,
      iconName: getItemIcon(i),
      iconImage: i.iconImage,
      groupId: i.groupId,
      color: getItemTypeColor(i),
    }))

    const filteredItems = itemOptions.filter((o) => {
      if (q && !o.name.toLowerCase().includes(q)) return false
      if (groupFilter && o.groupId !== groupFilter) return false
      return true
    })
    const filteredCurrencies = q
      ? currencyOptions.filter((o) => o.name.toLowerCase().includes(q))
      : groupFilter ? [] : currencyOptions
    return [...filteredCurrencies, ...filteredItems]
  }, [search, groupFilter, shopItems])

  // Reset visible count when filter changes
  const prevFilterKey = useRef('')
  const filterKey = `${search}|${groupFilter}`
  if (filterKey !== prevFilterKey.current) {
    prevFilterKey.current = filterKey
    if (visibleCount !== BATCH_SIZE) setVisibleCount(BATCH_SIZE)
  }

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const hasMore = visibleCount < filtered.length

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filtered.length))
    }
  }, [hasMore, filtered.length])

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--fg)]">Изменить награду</h3>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск награды..."
            className="rounded-xl border border-[var(--border)] pl-9 pr-3 py-2.5 text-sm w-full text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] bg-[var(--surface)]"
            autoFocus
          />
        </div>

        {/* Group filter — pill buttons */}
        {itemGroups.length > 0 && (
          <div className="overflow-x-auto mb-3 shrink-0" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-1.5 py-1 px-0.5">
            <button
              type="button"
              onClick={() => setGroupFilter(null)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border whitespace-nowrap h-[30px]',
                groupFilter === null
                  ? 'bg-[var(--accent)] text-white shadow-md border-transparent'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] border-[var(--border)]'
              )}
            >
              Все
            </button>
            {itemGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setGroupFilter(groupFilter === group.id ? null : group.id)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border whitespace-nowrap h-[30px]',
                  groupFilter === group.id
                    ? 'bg-[var(--accent)] text-white shadow-md border-transparent'
                    : 'text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] border-[var(--border)]'
                )}
              >
                <Folder className="h-3.5 w-3.5 shrink-0" style={group.color && groupFilter !== group.id ? { color: group.color } : undefined} />
                {group.name}
              </button>
            ))}
            </div>
          </div>
        )}

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto space-y-1 mb-4">
          {filtered.length === 0 && (
            <p className="text-sm text-[var(--fg-muted)] text-center py-8">Ничего не найдено</p>
          )}
          {visibleItems.map((opt) => {
            const isSelected = selected === opt.id
            const shopItem = shopItems.find((i) => i.id === opt.id)
            const badge = shopItem ? getItemTypeBadge(shopItem) : null
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelected(opt.id)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 w-full text-left transition-all',
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-subtle)] shadow-md shadow-[var(--accent)]/10'
                    : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]'
                )}
              >
                {shopItem ? (
                  <div className="relative shrink-0">
                    <SharedItemIconBadge item={shopItem} size="sm" />
                    {badge && (
                      <div className={cn(
                        'absolute -top-1 -right-1 z-20 flex h-4 w-4 items-center justify-center rounded-md',
                        'shadow-[0_2px_6px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]',
                        'ring-1 ring-[var(--surface-card)]',
                        badge.type === 'lootbox' && 'bg-gradient-to-br from-violet-400 to-violet-600',
                        badge.type === 'multiplier' && 'bg-gradient-to-br from-amber-400 to-orange-500',
                        badge.type === 'discount' && 'bg-gradient-to-br from-red-400 to-rose-600',
                        badge.type === 'videogame' && 'bg-gradient-to-br from-cyan-400 to-cyan-600',
                        badge.type === 'serial' && 'bg-gradient-to-br from-pink-400 to-rose-600',
                      )}>
                        {badge.type === 'lootbox' && <Gift className="h-2.5 w-2.5 text-white drop-shadow" />}
                        {badge.type === 'multiplier' && <TrendingUp className="h-2.5 w-2.5 text-white drop-shadow" />}
                        {badge.type === 'discount' && <Percent className="h-2.5 w-2.5 text-white drop-shadow" />}
                        {badge.type === 'videogame' && <Gamepad2 className="h-2.5 w-2.5 text-white drop-shadow" />}
                        {badge.type === 'serial' && <Clapperboard className="h-2.5 w-2.5 text-white drop-shadow" />}
                      </div>
                    )}
                  </div>
                ) : (
                  <ItemIconBadge iconName={opt.iconName} iconImage={opt.iconImage} color={opt.color} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--fg)] truncate">{opt.name}</p>
                  {shopItem && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {badge && (
                        <span className="text-[10px] text-[var(--fg-muted)]">{badge.label}</span>
                      )}
                      <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                        <Coins className="h-2.5 w-2.5" />
                        {shopItem.cost?.coins ?? 0}
                      </span>
                      {(shopItem.cost?.gems ?? 0) > 0 && (
                        <span className="text-[10px] text-cyan-500 flex items-center gap-0.5">
                          <Gem className="h-2.5 w-2.5" />
                          {shopItem.cost.gems}
                        </span>
                      )}
                      {shopItem.stock !== undefined && (
                        <span className="text-[10px] text-[var(--fg-muted)]">Запас: {shopItem.stock}</span>
                      )}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-[var(--accent)] shrink-0" />
                )}
              </button>
            )
          })}
          {hasMore && (
            <p className="text-xs text-[var(--fg-muted)] text-center py-2">
              Показано {visibleCount} из {filtered.length}…
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button
            type="button"
            onClick={() => selected && (onSelect(selected), onClose())}
            className="btn-primary flex-1"
          >
            Выбрать
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Lootbox Effect Modal ────────────────────────────────────────────────────

interface LootboxEffectModalProps {
  lootTable: LootTableEntry[]
  shopItems: ShopItem[]
  onSave: (table: LootTableEntry[]) => void
  onClose: () => void
}

export default function LootboxEffectModal({ lootTable: initial, shopItems, onSave, onClose }: LootboxEffectModalProps) {
  const safeInitial = Array.isArray(initial)
    ? initial.filter((e): e is LootTableEntry => e != null && typeof e.id === 'string' && typeof e.weight === 'number')
    : []
  const [entries, setEntries] = useState<LootTableEntry[]>(safeInitial.length ? safeInitial : [])
  const [showPicker, setShowPicker] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const totalPercentCorrect = entries.reduce((s, e) => s + e.weight, 0)

  const addRewards = (ids: string[]) => {
    setEntries((prev) => {
      const existingSum = prev.reduce((s, e) => s + e.weight, 0)
      const remaining = Math.max(0, 100 - existingSum)
      const count = ids.length
      if (count === 0) return prev
      const weightPer = remaining > 0 ? Math.floor((remaining / count) * 100) / 100 : 0
      const newEntries = ids.map((id, i) => ({
        id,
        weight: i === count - 1 && remaining > 0
          ? Math.round((remaining - weightPer * (count - 1)) * 100) / 100
          : weightPer,
        quantity: 1,
      }))
      return [...prev, ...newEntries]
    })
    setShowPicker(false)
  }

  const replaceReward = (id: string) => {
    if (editingIndex === null) return
    setEntries((prev) => prev.map((e, i) => (i === editingIndex ? { ...e, id, quantity: e.quantity ?? 1 } : e)))
    setEditingIndex(null)
    setShowPicker(false)
  }

  const updateEntry = (index: number, updater: (e: LootTableEntry) => LootTableEntry) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? updater(e) : e)))
  }

  const equalizeChances = () => {
    setEntries((prev) => {
      const n = prev.length
      if (n === 0) return prev
      const w = 100 / n
      return prev.map((e, i) => ({
        ...e,
        weight: i === prev.length - 1 ? Math.round((100 - (n - 1) * w) * 100) / 100 : Math.round(w * 100) / 100,
      }))
    })
  }

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const getEntryName = (id: string) => {
    if (id === CURRENCY_IDS.COINS) return 'Монеты'
    if (id === CURRENCY_IDS.GEMS) return 'Кристаллы'
    return shopItems.find((i) => i.id === id)?.name ?? id
  }

  const getEntryIconName = (id: string) => {
    if (id === CURRENCY_IDS.COINS) return 'Coins'
    if (id === CURRENCY_IDS.GEMS) return 'Gem'
    const it = shopItems.find((i) => i.id === id)
    return it ? getItemIcon(it) : 'Sword'
  }

  const getEntryIconImage = (id: string): string | undefined => {
    if (id === CURRENCY_IDS.COINS || id === CURRENCY_IDS.GEMS) return undefined
    return shopItems.find((i) => i.id === id)?.iconImage
  }

  const getEntryColor = (id: string): string => getColorForId(id, shopItems)

  const sectionStyle = {
    background: 'linear-gradient(135deg, var(--surface-card) 0%, var(--surface) 100%)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    boxShadow: `
      inset 0 1px 0 rgba(255,255,255,0.08),
      inset 0 -1px 0 rgba(0,0,0,0.05),
      0 4px 16px rgba(0,0,0,0.08),
      0 1px 4px rgba(0,0,0,0.04)
    `,
  } as const

  const neuInputStyle = {
    background: 'var(--surface)',
    boxShadow: `
      inset 2px 2px 4px rgba(0,0,0,0.06),
      inset -2px -2px 4px rgba(255,255,255,0.04)
    `,
  } as const

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && !showPicker && editingIndex === null && onClose()}
    >
      <div className="modal-content max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-[var(--fg)]">Эффект лутбокса</h2>
          <button type="button" onClick={onClose} className="icon-btn">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-[var(--fg-muted)] mb-4">
          Каждое открытие — независимое событие и случайным образом выдаёт одну из наград.
        </p>

        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {/* ─── Rewards section ──────────────────────────────────────── */}
          <div
            className="rounded-2xl border border-[var(--border)] p-4 space-y-3"
            style={sectionStyle}
          >
            <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider flex items-center gap-2">
              <Gift className="h-3.5 w-3.5" />
              Награды
            </h3>

            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl mb-3"
                  style={{ backgroundColor: 'var(--surface-elevated)', ...neuInputStyle }}
                >
                  <Box className="h-7 w-7 text-[var(--fg-muted)]" />
                </div>
                <p className="text-xs text-[var(--fg-muted)]">Наград пока нет</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry, index) => {
                  const color = getEntryColor(entry.id)
                  return (
                    <div
                      key={`${entry.id}-${index}`}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"
                      style={neuInputStyle}
                    >
                      <ItemIconBadge
                        iconName={getEntryIconName(entry.id)}
                        iconImage={getEntryIconImage(entry.id)}
                        color={color}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--fg)] truncate">{getEntryName(entry.id)}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {/* Quantity inline */}
                          <div className="flex items-center gap-1">
                            <Hash className="h-2.5 w-2.5 text-[var(--fg-muted)]" />
                            <button
                              type="button"
                              onClick={() => updateEntry(index, (e) => ({ ...e, quantity: Math.max(1, (e.quantity ?? 1) - 1) }))}
                              className="flex h-5 w-5 items-center justify-center rounded-md border border-[var(--border)] text-[10px] text-[var(--fg)] hover:bg-[var(--surface-elevated)]"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={(entry.quantity ?? 1) === 1 ? '' : entry.quantity}
                              onChange={(ev) => {
                                const raw = ev.target.value.trim()
                                updateEntry(index, (e) => ({ ...e, quantity: raw === '' ? 1 : Math.max(1, parseInt(raw, 10) || 1) }))
                              }}
                              placeholder="1"
                              className="w-14 text-center text-xs font-bold bg-transparent focus:outline-none text-[var(--fg)] no-spin"
                            />
                            <button
                              type="button"
                              onClick={() => updateEntry(index, (e) => ({ ...e, quantity: (e.quantity ?? 1) + 1 }))}
                              className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--accent-subtle)] text-[10px] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          {/* Weight inline */}
                          <div className="flex items-center gap-1">
                            <Percent className="h-2.5 w-2.5 text-[var(--fg-muted)]" />
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={entry.weight || ''}
                              onChange={(ev) => {
                                const raw = ev.target.value.trim()
                                const newWeight = raw === '' ? 0 : Math.max(0, Number(raw) || 0)
                                const otherSum = entries.reduce((sum, e, i) => (i === index ? sum : sum + e.weight), 0)
                                const maxWeight = Math.max(0, 100 - otherSum)
                                updateEntry(index, (e) => ({ ...e, weight: Math.min(maxWeight, newWeight) }))
                              }}
                              placeholder="0"
                              className="w-12 text-center text-xs bg-transparent focus:outline-none text-[var(--fg)] no-spin"
                            />
                          </div>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(index)}
                          className="text-[10px] font-medium text-[var(--accent)] hover:underline"
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEntry(index)}
                          className="icon-btn icon-btn-compact"
                          title="Удалить награду"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add reward button — dashed style like achievement */}
            <button
              type="button"
              onClick={() => (editingIndex !== null ? setEditingIndex(null) : setShowPicker(true))}
              className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-3 w-full text-sm text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
            >
              <Plus className="h-4 w-4" />
              Добавить награду
            </button>
          </div>

          {/* ─── Probability summary section ─────────────────────────── */}
          {entries.length > 0 && (
            <div
              className="rounded-2xl border border-[var(--border)] p-4 space-y-3"
              style={sectionStyle}
            >
              <h3 className="text-xs font-semibold text-[var(--fg-muted)] uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Вероятности
              </h3>

              {/* Total percentage bar */}
              <div
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5"
                style={neuInputStyle}
              >
                <Percent className="h-4 w-4 text-[var(--accent)] shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--fg-muted)]">Общий шанс</span>
                    <span className={cn(
                      'text-xs font-bold',
                      totalPercentCorrect >= 99.5 ? 'text-emerald-500' : 'text-amber-500'
                    )}>
                      {totalPercentCorrect}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        totalPercentCorrect >= 99.5 ? 'bg-emerald-500' : 'bg-amber-500'
                      )}
                      style={{ width: `${Math.min(100, totalPercentCorrect)}%` }}
                    />
                  </div>
                </div>
              </div>

              {totalPercentCorrect < 99.5 && (
                <button
                  type="button"
                  onClick={equalizeChances}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] px-4 py-2.5 w-full text-sm text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)] transition-all"
                >
                  <Scale className="h-4 w-4" />
                  Уравнять шансы
                </button>
              )}

              {totalPercentCorrect < 100 && (
                <div className="flex items-start gap-2 rounded-xl border border-[var(--warning)] bg-[var(--warning-subtle)] px-3 py-2.5 text-xs text-[var(--fg-muted)]">
                  <Lightbulb className="h-4 w-4 shrink-0 text-[var(--warning)] mt-0.5" />
                  <span>
                    Оставшиеся {Math.round((100 - totalPercentCorrect) * 100) / 100}% — шанс, что не выпадет ничего.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
          <button
            type="button"
            onClick={() => { onSave(entries); onClose() }}
            className="btn-primary flex-1"
          >
            Сохранить
          </button>
        </div>
      </div>

      {showPicker && editingIndex === null && (
        <RewardPickerModal
          shopItems={shopItems}
          onSelect={addRewards}
          onClose={() => setShowPicker(false)}
        />
      )}
      {editingIndex !== null && entries[editingIndex] && (
        <RewardPickerModalSingle
          shopItems={shopItems}
          currentId={entries[editingIndex].id}
          onSelect={(id) => replaceReward(id)}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </div>
  )
}
