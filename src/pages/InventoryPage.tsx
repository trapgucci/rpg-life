import { useState, useMemo } from 'react'
import { cn } from '../lib/cn'
import { Package, Grid3x3, List, Trash2 } from 'lucide-react'
import { useRpgStore } from '../store/useRpgStore'
import type { ShopItem, ItemGroup } from '../types/domain'

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

const RARITY_LABELS: Record<string, string> = {
  common: 'Обычный',
  uncommon: 'Необычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
}

export default function InventoryPage() {
  const shopItems = useRpgStore((s) => s.shopItems)
  const inventory = useRpgStore((s) => s.inventory)
  const allItemGroups = useRpgStore((s) => s.itemGroups)
  const activeProfileId = useRpgStore((s) => s.activeProfileId)
  const removeInventoryItem = useRpgStore((s) => s.removeInventoryItem)
  const [groupFilter, setGroupFilter] = useState<'all' | string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const itemGroups = activeProfileId
    ? allItemGroups
        .filter((g) => g.profileId === activeProfileId)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  const filteredInventory = useMemo(() => {
    const withItem = inventory
      .map((entry) => ({ entry, item: shopItems.find((i) => i.id === entry.itemId) as ShopItem | undefined }))
      .filter((x): x is { entry: typeof inventory[0]; item: ShopItem } => x.item != null)
    if (groupFilter === 'all') return withItem
    return withItem.filter((x) => x.item.groupId === groupFilter)
  }, [inventory, shopItems, groupFilter])

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30">
            <Package className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-[var(--fg)]">Инвентарь</h1>
            <p className="text-xs md:text-sm text-[var(--fg-muted)]">
              {inventory.length} {inventory.length === 1 ? 'предмет' : 'предметов'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="icon-btn"
            title={viewMode === 'grid' ? 'Список' : 'Сетка'}
          >
            {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid3x3 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Filter by groups */}
      {itemGroups.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setGroupFilter('all')}
              className={cn(
                'shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                groupFilter === 'all'
                  ? 'bg-[var(--accent)] text-white shadow-md'
                  : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)]'
              )}
            >
              Все
            </button>
            {itemGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setGroupFilter(group.id)}
                className={cn(
                  'shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                  groupFilter === group.id
                    ? 'bg-[var(--accent)] text-white shadow-md'
                    : 'bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-elevated)]'
                )}
              >
                {group.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inventory items */}
      {filteredInventory.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center rounded-2xl py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
            <Package className="h-8 w-8 text-purple-500" />
          </div>
          <p className="text-sm font-semibold text-[var(--fg)]">Инвентарь пуст</p>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Покупайте предметы в магазине
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredInventory.map(({ entry, item }) => {
            const group = itemGroups.find((g) => g.id === item.groupId)
            return (
              <div
                key={entry.id}
                className="glass-card group relative flex flex-col rounded-2xl border border-[var(--border)] p-4 transition-all hover:shadow-lg"
              >
                {/* Icon */}
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-sm"
                    style={{ backgroundColor: group?.color ?? '#22c55e' }}
                  >
                    {item.icon}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInventoryItem(entry.id)}
                    className="opacity-0 group-hover:opacity-100 icon-btn icon-btn-danger transition-opacity"
                    title="Удалить из инвентаря"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Name & Description */}
                <h3 className="text-sm font-semibold text-[var(--fg)] line-clamp-1">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="mt-1 text-xs text-[var(--fg-muted)] line-clamp-2">
                    {item.description}
                  </p>
                )}

                {/* Rarity */}
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className="text-xs font-medium"
                    style={{ color: RARITY_COLORS[item.rarity] }}
                  >
                    {RARITY_LABELS[item.rarity]}
                  </span>
                  <span className="text-xs text-[var(--fg-muted)]">
                    x{entry.quantity}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredInventory.map(({ entry, item }) => {
            const group = itemGroups.find((g) => g.id === item.groupId)
            return (
              <div
                key={entry.id}
                className="glass-card group flex items-center gap-4 rounded-2xl border border-[var(--border)] p-4 transition-all hover:shadow-lg"
              >
                {/* Icon */}
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-sm"
                  style={{ backgroundColor: group?.color ?? '#22c55e' }}
                >
                  {item.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--fg)]">
                      {item.name}
                    </h3>
                    <span
                      className="text-xs font-medium"
                      style={{ color: RARITY_COLORS[item.rarity] }}
                    >
                      {RARITY_LABELS[item.rarity]}
                    </span>
                  </div>
                  {item.description && (
                    <p className="mt-1 text-xs text-[var(--fg-muted)] line-clamp-1">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Quantity & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-[var(--fg-muted)]">
                    x{entry.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeInventoryItem(entry.id)}
                    className="opacity-0 group-hover:opacity-100 icon-btn icon-btn-danger transition-opacity"
                    title="Удалить из инвентаря"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
