import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { cn } from '../lib/cn'
import { Package, Search, X, Clock, Gift, Frown, Minus, Plus, Trash2, Coins, Gem } from 'lucide-react'
import { useRpgStore } from '../store/useRpgStore'
import InventoryItemCard from '../components/InventoryItemCard'
import InventoryItemModal from '../components/InventoryItemModal'
import InventoryHistorySidebar from '../components/InventoryHistorySidebar'
import StreakMultiplierModal from '../components/StreakMultiplierModal'
import Modal from '../components/Modal'
import type { ShopItem, InventoryEntry, ItemGroup } from '../types/domain'
import { CURRENCY_IDS } from '../types/domain'
import { rpgToast } from '../components/RpgToast'

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface EnrichedEntry {
  entry: InventoryEntry
  item: ShopItem
  group: ItemGroup | null
}

interface GroupBucket {
  group: ItemGroup | null
  items: EnrichedEntry[]
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function InventoryPage() {
  // ── Store ──────────────────────────────────────────────────────────────────
  const shopItems = useRpgStore((s) => s.shopItems)
  const inventory = useRpgStore((s) => s.inventory)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const removeFromInventory = useRpgStore((s) => s.removeFromInventory)
  const useItem = useRpgStore((s) => s.useItem)

  // ── Local state ────────────────────────────────────────────────────────────
  const [detailModalItemId, setDetailModalItemId] = useState<string | null>(null)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [deleteQuantity, setDeleteQuantity] = useState(1)
  const [showMobileHistory, setShowMobileHistory] = useState(false)
  const [lootResult, setLootResult] = useState<{ itemId: string; itemName: string; compensated?: boolean; compensationLabel?: string; compensationReason?: 'duplicate' | 'out_of_stock' } | 'empty' | null>(null)
  const [batchLootResults, setBatchLootResults] = useState<Array<{ itemId: string; itemName: string; compensated?: boolean; compensationLabel?: string; compensationReason?: 'duplicate' | 'out_of_stock' } | 'empty'> | null>(null)
  const [multiplierItemId, setMultiplierItemId] = useState<string | null>(null)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // ── Derived data ─────────────────────────────────────────────────────────
  const itemGroups = useMemo(
    () =>
      activeProfileId
        ? allItemGroups
            .filter((g) => g.profileId === activeProfileId)
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [allItemGroups, activeProfileId],
  )

  const groupMap = useMemo(() => {
    const map = new Map<string, ItemGroup>()
    for (const g of itemGroups) map.set(g.id, g)
    return map
  }, [itemGroups])

  const shopItemMap = useMemo(() => {
    const map = new Map<string, ShopItem>()
    for (const item of shopItems) map.set(item.id, item)
    return map
  }, [shopItems])

  const enrichedInventory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const result: EnrichedEntry[] = []

    for (const entry of inventory) {
      const item = shopItemMap.get(entry.itemId)
      if (!item) continue
      if (query && !item.name.toLowerCase().includes(query)) continue
      result.push({
        entry,
        item,
        group: item.groupId ? groupMap.get(item.groupId) ?? null : null,
      })
    }

    return result
  }, [inventory, shopItemMap, groupMap, searchQuery])

  const orderedGroupIds = useMemo(() => {
    const ids = itemGroups.map((g) => g.id)
    ids.push('__no_group__')
    return ids
  }, [itemGroups])

  const groupedInventory = useMemo(() => {
    const groups = new Map<string, GroupBucket>()

    for (const g of itemGroups) {
      groups.set(g.id, { group: g, items: [] })
    }
    groups.set('__no_group__', { group: null, items: [] })

    for (const entry of enrichedInventory) {
      const gId = entry.item.groupId ?? '__no_group__'
      const bucket = groups.get(gId)
      if (bucket) {
        bucket.items.push(entry)
      } else {
        groups.get('__no_group__')!.items.push(entry)
      }
    }

    return groups
  }, [enrichedInventory, itemGroups])

  const nonEmptyGroupIds = useMemo(
    () => orderedGroupIds.filter((id) => (groupedInventory.get(id)?.items.length ?? 0) > 0),
    [orderedGroupIds, groupedInventory],
  )

  const { totalUniqueItems, totalQuantity } = useMemo(() => {
    let unique = 0
    let qty = 0
    for (const e of enrichedInventory) {
      unique++
      qty += e.entry.quantity
    }
    return { totalUniqueItems: unique, totalQuantity: qty }
  }, [enrichedInventory])

  const hasGroups = nonEmptyGroupIds.length > 1

  // ── Section refs ─────────────────────────────────────────────────────────
  const setSectionRef = useCallback((groupId: string, el: HTMLDivElement | null) => {
    if (el) sectionRefs.current.set(groupId, el)
    else sectionRefs.current.delete(groupId)
  }, [])

  // ── IntersectionObserver ─────────────────────────────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        let topMostId: string | null = null
        let topMostTop = Infinity

        for (const entry of entries) {
          if (entry.isIntersecting) {
            const groupId = entry.target.getAttribute('data-group-id')
            if (groupId && entry.boundingClientRect.top < topMostTop) {
              topMostTop = entry.boundingClientRect.top
              topMostId = groupId
            }
          }
        }

        if (topMostId) {
          setActiveGroupId(topMostId)
        }
      },
      {
        root: container,
        rootMargin: '-52px 0px -70% 0px',
        threshold: [0, 0.1],
      },
    )

    for (const [, el] of sectionRefs.current) {
      observer.observe(el)
    }

    return () => observer.disconnect()
  }, [orderedGroupIds])

  // ── Scroll to group ──────────────────────────────────────────────────────
  const scrollToGroup = useCallback((groupId: string) => {
    setActiveGroupId(groupId)
    const el = sectionRefs.current.get(groupId)
    const container = scrollContainerRef.current
    if (el && container) {
      const stickyNavHeight = 52
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const scrollTop = container.scrollTop + (elRect.top - containerRect.top) - stickyNavHeight
      container.scrollTo({ top: scrollTop, behavior: 'smooth' })
    }
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleUse = useCallback((itemId: string, quantity?: number) => {
    const result = useItem(itemId, quantity)
    // Handle lootbox result
    if (result && typeof result === 'object' && 'loot' in result) {
      setDetailModalItemId(null)
      if (result.loot) {
        setLootResult({ itemId: result.loot.itemId, itemName: result.loot.name, compensated: result.loot.compensated, compensationLabel: result.loot.compensationLabel, compensationReason: result.loot.compensationReason })
      } else {
        setLootResult('empty')
      }
      return
    }
    // Handle streak multiplier — open task selection modal
    if (result && typeof result === 'object' && 'multiplier' in result) {
      setDetailModalItemId(null)
      setMultiplierItemId(result.itemId)
      return
    }
    // Handle serial — modal stays open, episodes are used inline
    if (result && typeof result === 'object' && 'serial' in result) {
      return
    }
    // Handle video game — modal stays open, game time is used inline
    if (result && typeof result === 'object' && 'videogame' in result) {
      return
    }
    // Plain item used
    const usedItem = shopItems.find((i) => i.id === itemId)
    if (usedItem) {
      rpgToast({ title: `Использовано: ${usedItem.name}`, type: 'success' })
    }
    // Close modal if item is fully consumed
    const entry = inventory.find((e) => e.itemId === itemId)
    if (entry && entry.quantity <= (quantity ?? 1)) {
      setDetailModalItemId(null)
    }
  }, [useItem, inventory])

  const handleOpenAll = useCallback((itemId: string, quantity: number) => {
    setDetailModalItemId(null)
    const results: Array<{ itemId: string; itemName: string } | 'empty'> = []
    for (let i = 0; i < quantity; i++) {
      const result = useItem(itemId)
      if (result && typeof result === 'object' && 'loot' in result) {
        if (result.loot) {
          results.push({ itemId: result.loot.itemId, itemName: result.loot.name, compensated: result.loot.compensated, compensationLabel: result.loot.compensationLabel, compensationReason: result.loot.compensationReason })
        } else {
          results.push('empty')
        }
      } else {
        break // item no longer available
      }
    }
    if (results.length > 0) {
      setBatchLootResults(results)
    }
  }, [useItem])

  const handleDelete = useCallback((itemId: string) => {
    setDeleteQuantity(1)
    setDeletingItemId(itemId)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (!deletingItemId) return
    // Log deletion to usage history
    const item = shopItems.find((i) => i.id === deletingItemId)
    if (item && activeProfileId) {
      useRpgStore.setState((s) => ({
        usageHistory: [
          ...s.usageHistory,
          {
            profileId: activeProfileId,
            itemId: deletingItemId,
            itemName: item.name,
            timestamp: Date.now(),
            action: 'deleted' as const,
            deletedQuantity: deleteQuantity,
          },
        ].slice(-500),
      }))
    }
    removeFromInventory(deletingItemId, deleteQuantity)
    rpgToast({ title: `${item?.name ?? 'Предмет'} удалён из инвентаря`, type: 'info' })
    // Close modal if removing last units
    if (detailModalItemId === deletingItemId) {
      const entry = inventory.find((e) => e.itemId === deletingItemId)
      if (entry && entry.quantity <= deleteQuantity) {
        setDetailModalItemId(null)
      }
    }
    setDeletingItemId(null)
  }, [deletingItemId, deleteQuantity, detailModalItemId, inventory, removeFromInventory, shopItems, activeProfileId])

  const handleCancelDelete = useCallback(() => setDeletingItemId(null), [])
  const handleCloseModal = useCallback(() => setDetailModalItemId(null), [])
  const handleSelectItem = useCallback((itemId: string) => setDetailModalItemId(itemId), [])

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── RENDER ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-3 md:p-4 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30">
              <Package className="h-4.5 w-4.5 md:h-5 md:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold text-[var(--fg)]">Инвентарь</h1>
              <p className="text-[10px] md:text-xs text-[var(--fg-muted)]">
                {totalQuantity} предметов
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile history button */}
            <button
              type="button"
              onClick={() => setShowMobileHistory(true)}
              className={cn(
                'md:hidden flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                'border border-[var(--border)] text-[var(--fg-muted)]',
                'hover:border-[var(--border-accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]',
              )}
              title="История"
            >
              <Clock className="h-4 w-4" />
            </button>

            {/* Search button */}
            <button
              type="button"
              onClick={() => setShowSearch(!showSearch)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200',
                'border border-[var(--border)] text-[var(--fg-muted)]',
                'hover:border-[var(--border-accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]',
                showSearch && 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-subtle)]',
              )}
              title="Поиск"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search input */}
        {showSearch && (
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--fg-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('')
                  setShowSearch(false)
                }
              }}
              placeholder="Поиск по предметам..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-9 py-2.5 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-md text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── MAIN CONTENT: CARDS + HISTORY SIDEBAR ──────────────────────── */}
      <div className="flex flex-1 min-h-0 gap-2 md:gap-3">
        {/* Cards area */}
        <div ref={scrollContainerRef} className="flex-1 min-w-0 overflow-y-auto no-scrollbar">
          {/* Sticky group navigation */}
          {hasGroups && (
            <div className="sticky top-0 z-10 pb-2 pt-1 px-1 bg-[var(--bg)]/95 backdrop-blur-md">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {nonEmptyGroupIds.map((groupId) => {
                  const groupData = groupedInventory.get(groupId)
                  const groupName = groupId === '__no_group__'
                    ? 'Без группы'
                    : groupData?.group?.name ?? 'Группа'
                  const itemCount = groupData?.items.length ?? 0
                  const isActive = activeGroupId === groupId

                  return (
                    <button
                      key={groupId}
                      type="button"
                      onClick={() => scrollToGroup(groupId)}
                      className={cn(
                        'shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all',
                        'flex items-center gap-1.5',
                        isActive
                          ? 'bg-[var(--accent)] text-white shadow-md'
                          : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)]',
                      )}
                    >
                      {groupName}
                      <span
                        className={cn(
                          'rounded-md px-1 py-0.5 text-[10px] font-semibold tabular-nums',
                          isActive ? 'bg-white/20' : 'bg-[var(--surface-elevated)]',
                        )}
                      >
                        {itemCount}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {enrichedInventory.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center rounded-2xl py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
                <Package className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-sm font-semibold text-[var(--fg)]">
                {searchQuery.trim() ? 'Ничего не найдено' : 'Инвентарь пуст'}
              </p>
              <p className="mt-1 text-sm text-[var(--fg-muted)]">
                {searchQuery.trim() ? 'Попробуйте изменить запрос' : 'Покупайте предметы в магазине'}
              </p>
            </div>
          ) : (
            /* Grouped sections */
            <div className="space-y-6 pb-4">
              {nonEmptyGroupIds.map((groupId) => {
                const groupData = groupedInventory.get(groupId)
                if (!groupData || groupData.items.length === 0) return null
                const { group, items } = groupData
                const groupName = groupId === '__no_group__'
                  ? 'Без группы'
                  : group?.name ?? 'Группа'
                const groupColor = group?.color ?? '#9ca3af'

                return (
                  <div
                    key={groupId}
                    ref={(el) => setSectionRef(groupId, el)}
                    data-group-id={groupId}
                  >
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div
                        className="h-1 w-6 rounded-full"
                        style={{ backgroundColor: groupColor }}
                      />
                      <h3 className="text-sm font-bold text-[var(--fg)]">{groupName}</h3>
                      <span className="text-xs text-[var(--fg-muted)]">({items.length})</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                      {items.map(({ entry, item, group: itemGroup }) => (
                        <InventoryItemCard
                          key={entry.itemId}
                          item={item}
                          quantity={entry.quantity}
                          group={itemGroup}
                          onClick={() => handleSelectItem(entry.itemId)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ─── HISTORY SIDEBAR (desktop) ──────────────────────────────── */}
        <div className="hidden md:flex md:w-[300px] shrink-0 min-h-0">
          <InventoryHistorySidebar />
        </div>
      </div>

      {/* ─── MODALS ─────────────────────────────────────────────────────── */}

      {/* Item detail modal */}
      <InventoryItemModal
        isOpen={detailModalItemId !== null}
        itemId={detailModalItemId}
        onClose={handleCloseModal}
        onUse={handleUse}
        onDelete={handleDelete}
        onOpenAll={handleOpenAll}
      />

      {/* Streak multiplier task selection */}
      <StreakMultiplierModal
        isOpen={multiplierItemId !== null}
        itemId={multiplierItemId}
        onClose={() => setMultiplierItemId(null)}
        onApplied={() => setMultiplierItemId(null)}
      />

      {/* Delete confirmation with quantity picker */}
      {deletingItemId !== null && (() => {
        const entry = inventory.find((e) => e.itemId === deletingItemId)
        const delItem = shopItems.find((i) => i.id === deletingItemId)
        const maxQty = entry?.quantity ?? 1
        return (
          <Modal isOpen onClose={handleCancelDelete} size="sm" showCloseButton={false} closeOnBackdropClick={false} zIndex={10001}>
            <div className="p-6 flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 mb-4">
                <Trash2 className="h-7 w-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-[var(--fg)] mb-1">Удалить предмет?</h3>
              <p className="text-sm text-[var(--fg-muted)] mb-5 max-w-[280px]">
                {delItem?.name ?? 'Предмет'} будет удалён из инвентаря
              </p>

              {maxQty > 1 && (
                <div className="flex items-center gap-3 mb-5">
                  <button
                    type="button"
                    onClick={() => setDeleteQuantity((q) => Math.max(1, q - 1))}
                    disabled={deleteQuantity <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] disabled:opacity-30 transition-all active:scale-90"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-2xl font-bold text-[var(--fg)] min-w-[3ch] tabular-nums">{deleteQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setDeleteQuantity((q) => Math.min(maxQty, q + 1))}
                    disabled={deleteQuantity >= maxQty}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--surface-elevated)] disabled:opacity-30 transition-all active:scale-90"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteQuantity(maxQty)}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                      deleteQuantity === maxQty
                        ? 'bg-red-500/15 text-red-500 ring-1 ring-inset ring-red-400/25'
                        : 'bg-[var(--surface)] text-[var(--fg-muted)] border border-[var(--border)] hover:bg-[var(--surface-elevated)]',
                    )}
                  >
                    Все ({maxQty})
                  </button>
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button type="button" onClick={handleCancelDelete} className="btn-secondary flex-1 py-2.5">
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 rounded-xl py-2.5 font-semibold transition-all duration-200 active:scale-95 bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25"
                >
                  Удалить{maxQty > 1 ? ` (${deleteQuantity})` : ''}
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}

      {/* Lootbox result modal */}
      {lootResult !== null && (
        <Modal
          isOpen
          onClose={() => setLootResult(null)}
          size="sm"
          showCloseButton={false}
        >
          <div className="p-6 flex flex-col items-center text-center">
            <div className={cn(
              'flex h-14 w-14 items-center justify-center rounded-2xl mb-4',
              lootResult === 'empty' ? 'bg-gray-500/15' : lootResult.compensated ? 'bg-amber-500/15' : 'bg-violet-500/15',
            )}>
              {lootResult === 'empty'
                ? <Frown className="h-7 w-7 text-gray-500" />
                : lootResult.compensated
                  ? <Coins className="h-7 w-7 text-amber-500" />
                  : <Gift className="h-7 w-7 text-violet-500" />
              }
            </div>
            <h3 className="text-lg font-bold text-[var(--fg)] mb-1">
              {lootResult === 'empty'
                ? 'Ничего не выпало'
                : lootResult.compensated
                  ? 'Компенсация!'
                  : 'Вы получили!'}
            </h3>
            {lootResult !== 'empty' && lootResult.compensated && (
              <p className="text-xs text-amber-500 font-medium mb-1">
                {lootResult.compensationReason === 'out_of_stock'
                  ? `«${lootResult.itemName}» — запас исчерпан`
                  : `«${lootResult.itemName}» уже есть`}
              </p>
            )}
            {lootResult !== 'empty' && lootResult.compensated && lootResult.compensationLabel && (
              <div className="flex items-center justify-center gap-2 mb-4 mt-1 rounded-xl bg-amber-500/10 px-4 py-2.5">
                {lootResult.compensationLabel.split(' + ').map((part, i) => {
                  const coinMatch = part.match(/🪙\s*(\d+)/)
                  const gemMatch = part.match(/💎\s*(\d+)/)
                  if (coinMatch) return (
                    <span key={i} className="flex items-center gap-1.5 text-sm font-bold text-amber-500">
                      <Coins className="h-4 w-4" /> +{coinMatch[1]}
                    </span>
                  )
                  if (gemMatch) return (
                    <span key={i} className="flex items-center gap-1.5 text-sm font-bold text-purple-500">
                      <Gem className="h-4 w-4" /> +{gemMatch[1]}
                    </span>
                  )
                  return <span key={i} className="text-sm font-medium text-[var(--fg)]">{part}</span>
                })}
              </div>
            )}
            <p className="text-sm text-[var(--fg-muted)] mb-6 max-w-[280px]">
              {lootResult === 'empty'
                ? 'В этот раз не повезло, попробуйте ещё раз!'
                : lootResult.compensated
                  ? 'Вы получили 80% от стоимости предмета'
                  : lootResult.itemId === CURRENCY_IDS.COINS || lootResult.itemId === CURRENCY_IDS.GEMS
                    ? `${lootResult.itemName} добавлены к балансу`
                    : `${lootResult.itemName} добавлен в инвентарь`
              }
            </p>
            <button
              type="button"
              onClick={() => setLootResult(null)}
              className="btn-primary w-full py-2.5"
            >
              Понятно
            </button>
          </div>
        </Modal>
      )}

      {/* Batch lootbox results modal */}
      {batchLootResults !== null && (
        <Modal
          isOpen
          onClose={() => setBatchLootResults(null)}
          size="md"
          showCloseButton={false}
        >
          <div className="p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 mb-4">
                <Gift className="h-7 w-7 text-violet-500" />
              </div>
              <h3 className="text-lg font-bold text-[var(--fg)] mb-1">
                Открыто {batchLootResults.length} лутбоксов
              </h3>
            </div>

            <div className="max-h-[40vh] overflow-y-auto no-scrollbar space-y-1.5 mb-5">
              {batchLootResults.map((r, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5',
                    r === 'empty' ? 'bg-zinc-500/5' : r.compensated ? 'bg-amber-500/5' : 'bg-violet-500/5',
                  )}
                >
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm',
                    r === 'empty' ? 'bg-zinc-500/10 text-zinc-400' : r.compensated ? 'bg-amber-500/10 text-amber-400' : 'bg-violet-500/10 text-violet-400',
                  )}>
                    {r === 'empty' ? <Frown className="h-4 w-4" /> : r.compensated ? <Coins className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className={cn(
                      'text-sm font-medium truncate block',
                      r === 'empty' ? 'text-[var(--fg-muted)]' : 'text-[var(--fg)]',
                    )}>
                      {r === 'empty' ? 'Ничего не выпало' : r.itemName}
                    </span>
                    {r !== 'empty' && r.compensated && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-amber-500/70">
                          {r.compensationReason === 'out_of_stock' ? 'Запас исчерпан' : 'Уже есть'}
                        </span>
                        <span className="text-[10px] text-[var(--fg-muted)]">·</span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                          {r.compensationLabel?.split(' + ').map((part, j) => {
                            const coinMatch = part.match(/🪙\s*(\d+)/)
                            const gemMatch = part.match(/💎\s*(\d+)/)
                            if (coinMatch) return <span key={j} className="flex items-center gap-0.5"><Coins className="h-3 w-3" />+{coinMatch[1]}</span>
                            if (gemMatch) return <span key={j} className="flex items-center gap-0.5 text-purple-400"><Gem className="h-3 w-3" />+{gemMatch[1]}</span>
                            return <span key={j}>{part}</span>
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {(() => {
              const won = batchLootResults.filter((r) => r !== 'empty')
              const empty = batchLootResults.length - won.length
              return (
                <p className="text-xs text-[var(--fg-muted)] text-center mb-4">
                  Получено: <span className="text-violet-400 font-medium">{won.length}</span>
                  {empty > 0 && <> · Пусто: <span className="text-zinc-400 font-medium">{empty}</span></>}
                </p>
              )
            })()}

            <button
              type="button"
              onClick={() => setBatchLootResults(null)}
              className="btn-primary w-full py-2.5"
            >
              Понятно
            </button>
          </div>
        </Modal>
      )}

      {/* Mobile history modal */}
      <Modal
        isOpen={showMobileHistory}
        onClose={() => setShowMobileHistory(false)}
        size="md"
        title="История"
      >
        <div className="h-[60vh]">
          <InventoryHistorySidebar />
        </div>
      </Modal>
    </div>
  )
}
