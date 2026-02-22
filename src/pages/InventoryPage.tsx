import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { cn } from '../lib/cn'
import { Package, Search, X } from 'lucide-react'
import { useRpgStore } from '../store/useRpgStore'
import InventoryItemCard from '../components/InventoryItemCard'
import InventoryDetailPanel from '../components/InventoryDetailPanel'
import ConfirmModal from '../components/ConfirmModal'
import type { ShopItem, InventoryEntry, ItemGroup } from '../types/domain'

export default function InventoryPage() {
  // ── Store ──────────────────────────────────────────────────────────────────
  const shopItems = useRpgStore((s) => s.shopItems)
  const inventory = useRpgStore((s) => s.inventory)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const removeFromInventory = useRpgStore((s) => s.removeFromInventory)
  const useItem = useRpgStore((s) => s.useItem)

  // ── Local state ────────────────────────────────────────────────────────────
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)

  // ── Refs ────────────────────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // ── Derived data ───────────────────────────────────────────────────────────
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

  const enrichedInventory = useMemo(() => {
    return inventory
      .map((entry) => ({
        entry,
        item: shopItems.find((i) => i.id === entry.itemId) as ShopItem | undefined,
      }))
      .filter((x): x is { entry: InventoryEntry; item: ShopItem } => x.item != null)
      .filter((x) => {
        if (!searchQuery.trim()) return true
        return x.item.name.toLowerCase().includes(searchQuery.toLowerCase())
      })
  }, [inventory, shopItems, searchQuery])

  const orderedGroupIds = useMemo(() => {
    const ids = itemGroups.map((g) => g.id)
    ids.push('__no_group__')
    return ids
  }, [itemGroups])

  const groupedInventory = useMemo(() => {
    const groups = new Map<string, { group: ItemGroup | null; items: typeof enrichedInventory }>()

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

  const totalUniqueItems = enrichedInventory.length
  const totalQuantity = enrichedInventory.reduce((sum, x) => sum + x.entry.quantity, 0)

  // Selected entry lookup (across all inventory, not just filtered)
  const selectedEntry = useMemo(() => {
    if (!selectedItemId) return null
    const entry = inventory.find((e) => e.itemId === selectedItemId)
    if (!entry) return null
    const item = shopItems.find((i) => i.id === entry.itemId)
    if (!item) return null
    return { entry, item }
  }, [selectedItemId, inventory, shopItems])

  // ── Section refs ───────────────────────────────────────────────────────────
  const setSectionRef = useCallback((groupId: string, el: HTMLDivElement | null) => {
    if (el) sectionRefs.current.set(groupId, el)
    else sectionRefs.current.delete(groupId)
  }, [])

  // ── IntersectionObserver ───────────────────────────────────────────────────
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
  }, [orderedGroupIds, enrichedInventory])

  // ── Scroll to group ────────────────────────────────────────────────────────
  const scrollToGroup = useCallback((groupId: string) => {
    setActiveGroupId(groupId)
    const el = sectionRefs.current.get(groupId)
    const container = scrollContainerRef.current
    if (el && container) {
      const stickyNavHeight = 52
      const elTop = el.offsetTop - stickyNavHeight
      container.scrollTo({ top: elTop, behavior: 'smooth' })
    }
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleUse = useCallback(() => {
    if (!selectedItemId) return
    useItem(selectedItemId)
  }, [selectedItemId, useItem])

  const handleConfirmDelete = useCallback(() => {
    if (!deletingItemId) return
    const entry = inventory.find((e) => e.itemId === deletingItemId)
    removeFromInventory(deletingItemId, 1)
    if (selectedItemId === deletingItemId && entry && entry.quantity <= 1) {
      setSelectedItemId(null)
    }
    setDeletingItemId(null)
  }, [deletingItemId, selectedItemId, inventory, removeFromInventory])

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── RENDER ────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  const nonEmptyGroupIds = useMemo(
    () => orderedGroupIds.filter((id) => (groupedInventory.get(id)?.items.length ?? 0) > 0),
    [orderedGroupIds, groupedInventory],
  )

  const hasGroups = nonEmptyGroupIds.length > 1

  return (
    <div className="flex h-full min-h-0 gap-4">
      {/* ─── LEFT PANEL ─────────────────────────────────────────────────── */}
      <div className="flex w-full md:basis-[42%] md:max-w-[560px] md:min-w-[420px] md:shrink-0 flex-col gap-4">
        {/* Header */}
        <div className="glass-card rounded-2xl p-3 md:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30">
                <Package className="h-4.5 w-4.5 md:h-5 md:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-bold text-[var(--fg)]">Инвентарь</h1>
                <p className="text-[10px] md:text-xs text-[var(--fg-muted)]">
                  {totalUniqueItems} предметов, {totalQuantity} шт.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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

        {/* ─── Scrollable content ────────────────────────────────────────── */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto thin-scrollbar pr-3">
          {/* Sticky group navigation */}
          {hasGroups && (
            <div className="sticky top-0 z-10 pb-2 pt-1 px-1" style={{ background: 'linear-gradient(to bottom, var(--bg-solid) 60%, transparent)' }}>
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
                          : itemCount === 0
                            ? 'bg-[var(--surface)] text-[var(--fg-muted)] opacity-50'
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

          {/* Empty state (no items at all) */}
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
                if (!groupData) return null
                const { group, items } = groupData
                if (items.length === 0) return null
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
                    {/* Section header */}
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div
                        className="h-1 w-6 rounded-full"
                        style={{ backgroundColor: groupColor }}
                      />
                      <h3 className="text-sm font-bold text-[var(--fg)]">{groupName}</h3>
                      <span className="text-xs text-[var(--fg-muted)]">({items.length})</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {items.map(({ entry, item }) => (
                        <InventoryItemCard
                          key={entry.itemId}
                          item={item}
                          quantity={entry.quantity}
                          selected={entry.itemId === selectedItemId}
                          onSelect={() => setSelectedItemId(entry.itemId)}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL (desktop) ──────────────────────────────────────── */}
      <div className="hidden md:block min-w-0 flex-1">
        {selectedEntry ? (
          <InventoryDetailPanel
            item={selectedEntry.item}
            quantity={selectedEntry.entry.quantity}
            acquiredAt={selectedEntry.entry.acquiredAt}
            onDeselect={() => setSelectedItemId(null)}
            onUse={handleUse}
            onDelete={() => setDeletingItemId(selectedEntry.item.id)}
          />
        ) : (
          <div className="glass-card flex h-full flex-col items-center justify-center rounded-2xl">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--surface)] mb-4">
              <Package className="h-10 w-10 text-[var(--fg-muted)]" />
            </div>
            <p className="font-medium text-[var(--fg)]">Выберите предмет</p>
            <p className="mt-1 text-sm text-[var(--fg-muted)]">из инвентаря слева</p>
          </div>
        )}
      </div>

      {/* ─── MOBILE OVERLAY ─────────────────────────────────────────────── */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-40 md:hidden overflow-y-auto p-4 animate-habit-slide-up"
          style={{ background: 'var(--bg)', backgroundColor: 'var(--bg-solid)' }}
        >
          <InventoryDetailPanel
            item={selectedEntry.item}
            quantity={selectedEntry.entry.quantity}
            acquiredAt={selectedEntry.entry.acquiredAt}
            onDeselect={() => setSelectedItemId(null)}
            onUse={handleUse}
            onDelete={() => setDeletingItemId(selectedEntry.item.id)}
          />
        </div>
      )}

      {/* ─── MODALS ─────────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={deletingItemId !== null}
        title="Удалить предмет?"
        message="Предмет будет удалён из инвентаря."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingItemId(null)}
      />
    </div>
  )
}
